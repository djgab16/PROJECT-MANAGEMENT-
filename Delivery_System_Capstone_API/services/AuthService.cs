using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.DTOs.Auth;
using SPXDeliveryAPI.Models;

namespace SPXDeliveryAPI.Services;

public class AuthService(
    AppDbContext db,
    IConfiguration config,
    ILogger<AuthService> logger) : IAuthService
{
    private readonly int _maxFailedAttempts =
        config.GetValue<int>("AccountLockout:MaxFailedAttempts", 5);

    // ─── Login ─────────────────────────────────────────────────────────────────
    public async Task<LoginResponse> LoginAsync(LoginRequest request, string ipAddress)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.EmployeeId == request.EmployeeId);

        // Employee not found — return generic message (don't reveal which field is wrong)
        if (employee is null)
            throw new UnauthorizedAccessException("Invalid Employee ID or password.");

        // Account locked
        if (employee.Status == "Locked")
            throw new InvalidOperationException("ACCOUNT_LOCKED");

        // Account pending activation
        if (employee.Status == "Pending")
            throw new InvalidOperationException("Your account is pending activation. Contact your administrator.");

        // Wrong password
        if (!BCrypt.Net.BCrypt.Verify(request.Password, employee.PasswordHash))
        {
            employee.FailedLoginAttempts++;

            if (employee.FailedLoginAttempts >= _maxFailedAttempts)
            {
                employee.Status = "Locked";
                employee.LockedAt = DateTime.UtcNow;
                logger.LogWarning("Account {EmployeeId} locked after {Attempts} failed attempts.",
                    employee.EmployeeId, employee.FailedLoginAttempts);
            }

            await db.SaveChangesAsync();

            int remaining = _maxFailedAttempts - employee.FailedLoginAttempts;
            if (remaining > 0)
                throw new UnauthorizedAccessException(
                    $"Invalid Employee ID or password. {remaining} attempt(s) remaining before lockout.");

            throw new InvalidOperationException("ACCOUNT_LOCKED");
        }

        // ✅ Successful login — reset failed attempts
        employee.FailedLoginAttempts = 0;
        employee.LastLoginAt = DateTime.UtcNow;

        // Generate tokens
        var accessToken  = GenerateAccessToken(employee);
        var refreshToken = await GenerateRefreshTokenAsync(employee, ipAddress);

        // Log the login action
        db.ActivityLogs.Add(new ActivityLog
        {
            EmployeeId       = employee.Id,
            Action           = "Login",
            Description      = $"User {employee.Name} logged in to the Delivery Tracker System",
            UserRoleSnapshot = employee.Role,
            Timestamp        = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        logger.LogInformation("Employee {EmployeeId} logged in successfully.", employee.EmployeeId);

        var expiryMinutes = config.GetValue<int>("Jwt:AccessTokenExpiryMinutes", 60);

        return new LoginResponse
        {
            AccessToken  = accessToken,
            RefreshToken = refreshToken.Token,
            ExpiresAt    = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Employee     = MapToEmployeeInfo(employee)
        };
    }

    // ─── Refresh Token ─────────────────────────────────────────────────────────
    public async Task<LoginResponse> RefreshTokenAsync(string refreshToken, string ipAddress)
    {
        var tokenHash = HashToken(refreshToken);

        var stored = await db.RefreshTokens
            .Include(t => t.Employee)
            .FirstOrDefaultAsync(t => t.Token == tokenHash);

        if (stored is null || stored.IsRevoked || stored.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        if (stored.Employee.Status == "Locked")
            throw new InvalidOperationException("ACCOUNT_LOCKED");

        // Revoke old token and issue new one
        stored.IsRevoked = true;

        var newAccessToken  = GenerateAccessToken(stored.Employee);
        var newRefreshToken = await GenerateRefreshTokenAsync(stored.Employee, ipAddress);

        await db.SaveChangesAsync();

        var expiryMinutes = config.GetValue<int>("Jwt:AccessTokenExpiryMinutes", 60);

        return new LoginResponse
        {
            AccessToken  = newAccessToken,
            RefreshToken = newRefreshToken.Token,
            ExpiresAt    = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Employee     = MapToEmployeeInfo(stored.Employee)
        };
    }

    // ─── Logout ────────────────────────────────────────────────────────────────
    public async Task LogoutAsync(string refreshToken)
    {
        var tokenHash = HashToken(refreshToken);

        var stored = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == tokenHash);

        if (stored is not null && !stored.IsRevoked)
        {
            stored.IsRevoked = true;
            await db.SaveChangesAsync();
        }
    }

    // ─── Private Helpers ───────────────────────────────────────────────────────

    private string GenerateAccessToken(Employee employee)
    {
        var key     = config["Jwt:Key"]!;
        var issuer  = config["Jwt:Issuer"]!;
        var audience = config["Jwt:Audience"]!;
        var expiry  = config.GetValue<int>("Jwt:AccessTokenExpiryMinutes", 60);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   employee.EmployeeId),
            new Claim(JwtRegisteredClaimNames.Name,  employee.Name),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role,               employee.Role),
            new Claim("employeeDbId",                employee.Id.ToString()),
            new Claim("status",                      employee.Status)
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:             issuer,
            audience:           audience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddMinutes(expiry),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<RefreshToken> GenerateRefreshTokenAsync(Employee employee, string ipAddress)
    {
        // Generate a cryptographically secure random token
        var rawToken  = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var tokenHash = HashToken(rawToken);
        var expiryDays = config.GetValue<int>("Jwt:RefreshTokenExpiryDays", 7);

        var refreshToken = new RefreshToken
        {
            EmployeeId    = employee.Id,
            Token         = tokenHash,         // Store only the hash
            ExpiresAt     = DateTime.UtcNow.AddDays(expiryDays),
            CreatedByIp   = ipAddress
        };

        db.RefreshTokens.Add(refreshToken);

        // Store the raw token temporarily so we can return it to the caller
        // (the raw token is only ever sent to the client once)
        refreshToken.Token = rawToken;
        await Task.CompletedTask;

        // Re-set to hash before save
        var rawCopy = refreshToken.Token;
        refreshToken.Token = tokenHash;

        // Return an object with the raw token for the response body
        return new RefreshToken
        {
            Token     = rawCopy,
            ExpiresAt = refreshToken.ExpiresAt
        };
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    private static EmployeeInfoResponse MapToEmployeeInfo(Employee e) => new()
    {
        EmployeeId   = e.EmployeeId,
        Name         = e.Name,
        Role         = e.Role,
        SystemAccess = e.SystemAccess,
        Status       = e.Status
    };
}
