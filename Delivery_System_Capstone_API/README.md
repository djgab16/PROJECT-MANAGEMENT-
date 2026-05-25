# SPX Delivery Tracker — Backend API

ASP.NET Core 8 Web API powering the SPX Delivery Tracker frontend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | ASP.NET Core 8 |
| ORM | Entity Framework Core 8 |
| Database | SQL Server (or PostgreSQL with minor config change) |
| Auth | JWT Bearer + Refresh Tokens |
| Password Hashing | BCrypt.Net |
| Excel Export | ClosedXML |
| PDF Export | QuestPDF |
| API Docs | Swagger / Swashbuckle |

---

## Project Structure

```
SPXDeliveryAPI/
├── Models/                    # EF Core entity classes (DB tables)
│   ├── Employee.cs
│   ├── DeliveryOrder.cs
│   ├── DeliveryHistoryLog.cs
│   ├── Notification.cs
│   ├── ActivityLog.cs
│   ├── RefreshToken.cs
│   └── AppTask.cs
├── Data/
│   ├── AppDbContext.cs        # EF Core DbContext + Fluent API
│   └── DbSeeder.cs            # Seeds mock data on first run
├── DTOs/                      # Request/Response shapes (no Model exposure)
│   ├── Auth/
│   ├── DeliveryOrders/
│   ├── Employees/
│   ├── Notifications/
│   ├── ActivityLogs/
│   └── Reports/
├── Controllers/               # (Built in Option B, C, D...)
├── Services/                  # Business logic layer
├── Repositories/              # Data access layer
├── Middleware/                # Auth, error handling
├── Program.cs                 # App entry point + DI
├── appsettings.json
└── SPXDeliveryAPI.csproj
```

---

## Database Tables

| Table | Description |
|---|---|
| `Employees` | All users — SUPER ADMIN, ADMIN, OP. TEAM, DRIVER |
| `DeliveryOrders` | Core delivery records with full parcel/recipient details |
| `DeliveryHistoryLogs` | Audit trail of every status change per order |
| `Notifications` | System alerts linked to orders or employees |
| `ActivityLogs` | All user actions (Create, Update, POD Upload, Login, etc.) |
| `RefreshTokens` | JWT refresh token store with revocation support |
| `Tasks` | Internal task management with assignment |

---

## Getting Started

### 1. Prerequisites
- .NET 8 SDK
- SQL Server (LocalDB works for dev)

### 2. Update connection string
Edit `appsettings.json`:
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=SPXDeliveryDB;Trusted_Connection=True;TrustServerCertificate=True;"
}
```

### 3. Update JWT secret
```json
"Jwt": {
  "Key": "your-super-long-random-secret-here-min-32-chars"
}
```

### 4. Install packages
```bash
dotnet restore
```

### 5. Run migrations
```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### 6. Run the API
```bash
dotnet run
```

Swagger UI available at: `https://localhost:5001/`

The database will be **auto-seeded** on first run in Development mode with:
- 5 employees (EMP-001 to EMP-005) + 3 drivers
- 7 delivery orders matching the frontend mock data
- Sample notifications and activity logs
- Default password for all seeded accounts: `Password123!`

---

## RBAC Roles

| Role | Access |
|---|---|
| `SUPER ADMIN` | All routes including `/role-access` |
| `ADMIN` | All routes except `/role-access` |
| `OP. TEAM` | Delivery operations, no admin/analytics |
| `DRIVER` | View own orders, upload POD |

---

## Auth Flow

1. `POST /api/auth/login` — Employee ID + Password → Access Token (1hr) + Refresh Token (7d)
2. All protected routes require `Authorization: Bearer <token>` header
3. `POST /api/auth/refresh` — Swap refresh token for new access token
4. After 5 failed logins, account is **Locked** → redirected to `/account-locked`
5. `POST /api/auth/logout` — Revokes refresh token

---

## Next Steps (follow-up options)

- **Option B** — Auth: `AuthController` + `AuthService` + JWT generation
- **Option C** — Delivery Orders: full CRUD controller + service + waybill generation
- **Option D** — Full project scaffold (all controllers/services stubbed)
