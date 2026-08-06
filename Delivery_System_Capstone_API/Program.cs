using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SPXDeliveryAPI.Data;
using SPXDeliveryAPI.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ─── Configuration: keep the JWT signing key out of source control ──────────────
// User secrets are auto-loaded only in Development; add them explicitly so the key
// resolves in every environment. Environment variables are re-added last so they
// take highest precedence (set Jwt__Key in production deployments).
builder.Configuration.AddUserSecrets(System.Reflection.Assembly.GetExecutingAssembly(), optional: true);
builder.Configuration.AddEnvironmentVariables();

// ─── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// ─── JWT Authentication ────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException(
        "Jwt:Key is not configured. Set it via user-secrets (dev: dotnet user-secrets set \"Jwt:Key\" ...) " +
        "or the Jwt__Key environment variable (production).");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew                = TimeSpan.Zero
        };
    });

// ─── RBAC Authorization Policies ──────────────────────────────────────────────
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SuperAdminOnly",
        p => p.RequireRole("SUPER ADMIN"));

    options.AddPolicy("AdminAndAbove",
        p => p.RequireRole("SUPER ADMIN", "ADMIN"));

    options.AddPolicy("OpTeamAndAbove",
        p => p.RequireRole("SUPER ADMIN", "ADMIN", "OP. TEAM"));

    options.AddPolicy("ClientOrOpTeamAndAbove",
        p => p.RequireRole("SUPER ADMIN", "ADMIN", "OP. TEAM", "CLIENT"));

    options.AddPolicy("AnyRole",
        p => p.RequireRole("SUPER ADMIN", "ADMIN", "OP. TEAM", "DRIVER", "CLIENT"));
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
        policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
    );
});

// ─── Services ─────────────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDeliveryOrderService, DeliveryOrderService>();
builder.Services.AddScoped<ISlaService, SlaService>();
builder.Services.AddSingleton<IPredictionCache, PredictionCache>();
builder.Services.AddScoped<IExternalConditionsService, LocalHistoryConditionsService>();
builder.Services.AddScoped<IMlRiskModelService, MlRiskModelService>();
builder.Services.AddScoped<IPredictionService, PredictionService>();
builder.Services.AddScoped<IPredictionOutcomeService, PredictionOutcomeService>();
builder.Services.AddHostedService<DataRetentionService>();
builder.Services.AddHostedService<PredictionSchedulerService>();

// ─── Swagger ──────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title   = "SPX Delivery Tracker API",
        Version = "v1"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Enter your JWT token. Example: Bearer eyJhbGci..."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new SPXDeliveryAPI.Utils.SafeDateTimeConverter());
        options.JsonSerializerOptions.Converters.Add(new SPXDeliveryAPI.Utils.SafeNullableDateTimeConverter());
    });

// ─── Build ─────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ─── Production hardening: JWT secret check ─────────────────────────────────────
// Non-fatal warning only (does not change the key or invalidate sessions). In production,
// override with a strong secret via the 'Jwt__Key' environment variable.
if (jwtKey.Length < 32 || jwtKey.Contains("CHANGE_THIS"))
{
    app.Logger.LogWarning(
        "Jwt:Key appears to be a placeholder or shorter than 32 characters. " +
        "Set a strong secret via the 'Jwt__Key' environment variable before deploying to production.");
}

// ─── Seed Database ─────────────────────────────────────────────────────────────
await DbSeeder.SeedAsync(app);

// ─── Middleware Pipeline ───────────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "SPX Delivery API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("FrontendDev");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
