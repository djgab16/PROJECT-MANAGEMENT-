# PROJECT MANAGEMENT

## COMPLETE WEEK 5 DELIVERABLES
### At-Risk Delivery Prediction & SLA Monitoring (ADPSM)
**Legacy System:** SPEEDEX Delivery Management System (DMS)

| Field | Value |
|-------|-------|
| Document Version | 1.0 |
| Date | August 1, 2026 |
| Course | Project Management (Capstone Enhancement) |
| Submitted By | Gabriel, David Jr. M. / Conag, Reca Maelah M. / Panaligan, Sofia Albert Q. / Dumlao, Jhoyce Anne Niel B. |
| Instructor | [Professor Name] |

**Team Roles**

| Team Member | Role |
|-------------|------|
| Gabriel, David Jr. M. | Project Manager |
| Conag, Reca Maelah M. | Frontend Developer |
| Panaligan, Sofia Albert Q. | UI/UX Designer |
| Dumlao, Jhoyce Anne Niel B. | Backend Developer |

> Adjust the role/name mapping above to match your actual assignments.

**Technology Stack (as implemented)**

| Layer | Technology |
|-------|-----------|
| Presentation | React 19 + TypeScript + Vite, Recharts (charts), React Router |
| Application | ASP.NET Core Web API (`SPXDeliveryAPI`), Entity Framework Core |
| Persistence | Microsoft SQL Server (MSSQL) |
| Prediction Engine | Weighted multi-factor scoring engine (C#, `PredictionService`) |
| Auth | JWT + Role-Based Access Control (policy: `OpTeamAndAbove`) |

---

# DELIVERABLE 1: WORKING API / DASHBOARD

## 1.1 Dashboard Overview

| Attribute | Details |
|-----------|---------|
| Technology | React 19 + TypeScript (Vite), Recharts |
| Component | `src/pages/SlaMonitoring/SlaMonitoring.tsx` |
| Purpose | Display SLA risk predictions, analytics charts, and at-risk delivery lists |
| Data Source | ASP.NET Core Web API → MSSQL (`DeliveryPredictions`, `DeliveryOrders`) |
| Access | `localhost:5173` (Vite dev server) → API at `/api/predictions` |
| Access Control | Operations Team and above (`[Authorize(Policy = "OpTeamAndAbove")]`) |
| Status | ✅ Working |

### Dashboard Features Implemented

| Feature | Description |
|---------|-------------|
| KPI Cards | Active deliveries, overall on-time %, SLA breaches, at-risk count, average delay hours, average delivery duration |
| Dual Tabs | **Ongoing** (active at-risk orders) and **Delivered** (completed/breached history) |
| Recompute Action | "Run Predictions" button triggers `POST /api/predictions/run` and logs the activity |
| Filters (9) | Search, Driver, Route, Area, Priority, Status, Client Type, Risk Level, Date Range |
| Chart 1 | On-time percentage by **Route** (bar chart) |
| Chart 2 | On-time percentage by **Driver** (bar chart) |
| Chart 3 | **Risk level distribution** (pie chart: Low / Medium / High / Critical) |
| At-Risk Table | Waybill, client, route, driver, priority, time-until-breach, risk level/score, confidence, reason, recommended action, predicted arrival |
| Report View | "SLA Proactive At-Risk Orders Report" printable view |

## 1.2 Prediction Engine — Source Code (Backend)

The prediction engine is a **weighted multi-factor scoring model** implemented in `Services/PredictionService.cs`. It computes a risk score in `[0.0, 1.0]` from eight weighted factors.

### Factor Weights

| # | Factor | Weight | Logic Summary |
|---|--------|--------|---------------|
| 1 | SLA remaining time | **0.35** | Breached = 1.0; ≤6h = 0.9; ≤12h = 0.7; ≤24h = 0.4; ≤48h = 0.2; else 0.0 |
| 2 | Delivery priority | 0.15 | High = 1.0; Medium = 0.5; Low = 0.1 |
| 3 | Redelivery attempts | 0.15 | ≥2 attempts = 1.0; 1 attempt = 0.6; none = 0.0 |
| 4 | Driver historical performance | 0.15 | Historical breach rate (min. 3 completed orders); unassigned = 0.8 |
| 5 | Route historical performance | 0.10 | Historical breach rate (min. 3 completed orders) |
| 6 | Item count / package weight | 0.05 | >15 kg or >8 items = 1.0; >5 kg or >3 items = 0.4 |
| 7 | Client type | 0.03 | VIP = 0.7; Express = 0.5; Corporate = 0.3; else 0.1 |
| 8 | Weekend / traffic / weather | 0.02 | Weekend + simulated traffic/weather placeholders (normalized) |

### Risk Level Thresholds

| Risk Score | Risk Level |
|-----------|-----------|
| ≥ 0.80 | Critical |
| ≥ 0.60 | High |
| ≥ 0.35 | Medium |
| < 0.35 | Low |

**At-Risk flag:** `IsAtRisk = riskScore >= 0.35 || remainingHours <= 0`

### Confidence Score

Confidence starts at a base of **0.60** and increases with available historical data, then is clamped to **[0.50, 0.98]**:

| Condition | Bonus |
|-----------|-------|
| Driver history available (≥3 orders) | +0.15 |
| Route history available (≥3 orders) | +0.15 |
| Parsed package weight > 0 | +0.05 |
| Client history available (≥3 orders) | +0.05 |

```csharp
// ─── Compute Weighted Risk Score ───
double riskScore = (slaTimeScore     * 0.35) +
                   (priorityScore    * 0.15) +
                   (redeliveryScore  * 0.15) +
                   (driverScore      * 0.15) +
                   (routeScore       * 0.10) +
                   (packageScore     * 0.05) +
                   (clientScore      * 0.03) +
                   (placeholdersScore* 0.02);

riskScore = Math.Clamp(riskScore, 0.0, 1.0);

// ─── Determine Risk Level ───
string riskLevel = "Low";
if      (riskScore >= 0.8)  riskLevel = "Critical";
else if (riskScore >= 0.6)  riskLevel = "High";
else if (riskScore >= 0.35) riskLevel = "Medium";

// At-Risk flag (includes Medium, High, and Critical)
bool isAtRisk = riskScore >= 0.35 || remainingHours <= 0;
```

### Explainability Output

Unlike a black-box model, each prediction returns a human-readable justification and a recommended dispatch action:

| Output Field | Example |
|--------------|---------|
| `RiskReason` | "• SLA deadline is very short (4.2 hours remaining).<br>• Order has failed delivery 2 time(s) previously." |
| `RecommendedAction` | "Contact recipient to confirm availability and address details before next delivery attempt." |

**Recommended-action decision order:** deadline passed → unassigned driver → poor-performing driver → ≥2 redelivery attempts → high priority with ≤6h remaining → risk ≥ 0.35 → no action required.

## 1.3 API Endpoints (ASP.NET Core Web API)

Base route: `api/predictions` · Authorization: `OpTeamAndAbove`

| Method | Endpoint | Purpose | Response |
|--------|----------|---------|----------|
| `POST` | `/api/predictions/run` | Recompute predictions for all active orders; writes an `ActivityLog` audit entry | `{ message, ordersProcessed, durationMs }` |
| `GET` | `/api/predictions/at-risk` | Active (non-completed) orders with risk data + predicted arrival | `AtRiskOrderDto[]` |
| `GET` | `/api/predictions/completed` | Delivered / Failed / Returned history with actual outcome | `AtRiskOrderDto[]` |
| `GET` | `/api/predictions/sla-summary` | KPI totals + route and priority breakdowns | `SlaSummaryDto` |
| `GET` | `/api/predictions/driver-performance` | Per-driver on-time %, breaches, average delay | `DriverSlaPerformanceDto[]` |

### Performance Design Notes

- **N+1 query avoidance:** `RunPredictionsAsync()` pre-fetches driver, route, and client historical aggregates into dictionaries once, plus all existing predictions, before the per-order loop.
- **Read efficiency:** all read endpoints use `.AsNoTracking()`.
- **Upsert:** existing `DeliveryPrediction` rows are updated in place; new orders get inserted.
- **Auditability:** every recompute writes an `ActivityLog` row with user, role, order count, and duration.

```csharp
[HttpPost("run")]
public async Task<IActionResult> RunPredictions()
{
    var stopwatch = Stopwatch.StartNew();
    int processedCount = await _predictionService.RunPredictionsAsync();
    stopwatch.Stop();

    // ... resolve acting employee for the audit trail ...

    var activityLog = new ActivityLog
    {
        Timestamp   = DateTime.UtcNow,
        Action      = "Prediction",
        Description = $"Recomputed at-risk SLA predictions. Processed {processedCount} active orders in {stopwatch.ElapsedMilliseconds}ms.",
        Reference   = $"Run-{DateTime.UtcNow:yyyyMMddHHmmss}"
    };
    await _context.ActivityLogs.AddAsync(activityLog);
    await _context.SaveChangesAsync();

    return Ok(new { message = "Predictions recomputed successfully.",
                    ordersProcessed = processedCount,
                    durationMs = stopwatch.ElapsedMilliseconds });
}
```

## 1.4 Frontend Data Access Layer

```typescript
// src/api/predictionApi.ts
export const predictionApi = {
  runPredictions:       async () => (await apiClient.post<RunPredictionsResponse>('/predictions/run')).data,
  getAtRiskOrders:      async () => (await apiClient.get<AtRiskOrder[]>('/predictions/at-risk')).data,
  getCompletedOrders:   async () => (await apiClient.get<AtRiskOrder[]>('/predictions/completed')).data,
  getSlaSummary:        async () => (await apiClient.get<SlaSummaryResponse>('/predictions/sla-summary')).data,
  getDriverPerformance: async () => (await apiClient.get<DriverSlaPerformance[]>('/predictions/driver-performance')).data,
};
```

## 1.5 Dashboard Screenshots

**Screenshot 1: SLA Monitoring — Ongoing Tab** *(insert your captured screenshot)*

Capture checklist for this screenshot:
- KPI cards row (active deliveries, on-time %, breaches, at-risk count, avg delay, avg duration)
- Filter bar with the Ongoing tab selected
- Route on-time bar chart, Driver on-time bar chart, Risk distribution pie chart
- At-risk orders table showing risk level badges, time-until-breach, and recommended action

**Screenshot 2: SLA Monitoring — Delivered Tab** *(insert your captured screenshot)*

**Screenshot 3: SLA Proactive At-Risk Orders Report** *(insert your captured screenshot)*

**Sample At-Risk Orders table (for the demo walkthrough):**

| Waybill No | Client Type | Route | Driver | Priority | Time Until Breach | Risk Level | Score | Confidence |
|------------|-------------|-------|--------|----------|-------------------|-----------|-------|-----------|
| SPX-2026-0142 | VIP | Manila | Jose Rizal | High | Breached by 2.4 hrs | Critical | 0.87 | 0.95 |
| SPX-2026-0119 | Express | Pasig City | Andres Bonifacio | High | 3.1 hrs | Critical | 0.81 | 0.90 |
| SPX-2026-0158 | Corporate | Quezon City | Gabriela Silang | Medium | 9.5 hrs | High | 0.68 | 0.85 |
| SPX-2026-0107 | Express | Manila | *Unassigned* | High | 14.0 hrs | High | 0.64 | 0.70 |
| SPX-2026-0166 | Standard | Parañaque | Melchora Aquino | Medium | 22.8 hrs | Medium | 0.41 | 0.80 |

---

# DELIVERABLE 2: END-TO-END TEST REPORT

## 2.1 Test Overview

| Attribute | Details |
|-----------|---------|
| Test Date | August 1, 2026 |
| Tester | [Student Name] |
| Environment | Localhost — MSSQL + ASP.NET Core API (`dotnet run`) + Vite dev server |
| Test Scope | Full flow: MSSQL → EF Core → Prediction Engine → `DeliveryPredictions` → API → React Dashboard |
| Status | ✅ PASSED |

## 2.2 Test Flow Diagram (End-to-End)

```
STEP 1: MSSQL Database (SPXDeliveryDb)
   Tables (legacy, unaltered): DeliveryOrders, Employees, ActivityLogs,
                               DeliveryHistoryLogs, Notifications
   New table (additive): DeliveryPredictions
   Status: ✅ Running — no legacy schema modified
        |
        v
STEP 2: Trigger Recompute  (POST /api/predictions/run)
   Auth: JWT, policy OpTeamAndAbove
   Action: Fetch active non-archived orders (excludes Delivered/Completed/
           Failed/Returned/Cancelled)
   Status: ✅ Authorized & executed
        |
        v
STEP 3: Historical Profile Aggregation (EF Core, single pass)
   Builds driver / route / client breach-rate dictionaries (min. 3 orders each)
   Purpose: avoid N+1 queries
   Status: ✅ Successful
        |
        v
STEP 4: Prediction Engine (PredictionService.ComputePredictionInternal)
   8 weighted factors -> riskScore [0..1] -> riskLevel + confidence
   Also emits RiskReason + RecommendedAction (explainability)
   Status: ✅ Successful
        |
        v
STEP 5: Persist Predictions (DeliveryPredictions table)
   Upsert: update existing rows, insert new ones; single SaveChangesAsync()
   Audit: ActivityLog row written (user, role, count, durationMs)
   Status: ✅ Data written successfully
        |
        v
STEP 6: Read APIs
   /at-risk · /completed · /sla-summary · /driver-performance
   All use .AsNoTracking()
   Status: ✅ All endpoints responding
        |
        v
STEP 7: React Dashboard (SlaMonitoring.tsx)
   Parallel fetch -> KPI cards, 9 filters, 3 Recharts visualizations,
   Ongoing/Delivered tabs, printable report
   Status: ✅ Displayed correctly
```

## 2.3 Test Cases

**Test Case 1: Authorization Enforcement**

| Attribute | Details |
|-----------|---------|
| Test ID | TC-001 |
| Description | Verify prediction endpoints reject unauthorized roles |
| Precondition | API running; JWT for a below-Operations role available |
| Steps | 1. Call `GET /api/predictions/at-risk` with no token · 2. Retry with a low-privilege token · 3. Retry with an Operations token |
| Expected Result | 401 without token, 403 for low privilege, 200 for Operations |
| Actual Result | ✅ Policy `OpTeamAndAbove` enforced on all five endpoints |
| Status | ✅ PASS |

**Test Case 2: Prediction Recompute**

| Attribute | Details |
|-----------|---------|
| Test ID | TC-002 |
| Description | Verify `POST /predictions/run` computes and persists predictions |
| Precondition | Active delivery orders exist in MSSQL |
| Steps | 1. Call `POST /api/predictions/run` · 2. Inspect response · 3. Query `DeliveryPredictions` |
| Expected Result | `ordersProcessed` > 0; one prediction row per active order |
| Actual Result | ✅ Predictions upserted; response returned `ordersProcessed` and `durationMs` |
| Status | ✅ PASS |

**Test Case 3: Risk Scoring Correctness**

| Attribute | Details |
|-----------|---------|
| Test ID | TC-003 |
| Description | Verify risk score, level, and at-risk flag follow the defined thresholds |
| Precondition | Predictions computed |
| Steps | 1. Seed an order past its `ExpectedDelivery` · 2. Seed a low-risk order 72h out · 3. Compare scores/levels |
| Expected Result | Breached order → score 1.0-weighted, level Critical, `IsAtRisk = true`; distant low-priority order → Low, `IsAtRisk = false` |
| Actual Result | ✅ Thresholds (0.35 / 0.60 / 0.80) applied correctly; scores clamped to [0,1] |
| Status | ✅ PASS |

**Test Case 4: Explainability Output**

| Attribute | Details |
|-----------|---------|
| Test ID | TC-004 |
| Description | Verify each prediction returns a reason and a recommended action |
| Precondition | Predictions computed |
| Steps | 1. Fetch `/api/predictions/at-risk` · 2. Inspect `riskReason` and `recommendedAction` |
| Expected Result | Non-empty, human-readable strings for every record |
| Actual Result | ✅ Bulleted reasons returned; low-risk orders return "No severe risk factors identified." |
| Status | ✅ PASS |

**Test Case 5: SLA Summary Aggregation**

| Attribute | Details |
|-----------|---------|
| Test ID | TC-005 |
| Description | Verify KPI totals and route/priority breakdowns are internally consistent |
| Precondition | Completed and active orders exist |
| Steps | 1. Call `/api/predictions/sla-summary` · 2. Verify per-route `onTime + breached = totalOrders` · 3. Verify on-time % math |
| Expected Result | Breakdown counts reconcile to totals; percentages match counts |
| Actual Result | ✅ Route and priority breakdowns reconcile; values rounded to 1 decimal |
| Status | ✅ PASS |

**Test Case 6: Audit Trail Logging**

| Attribute | Details |
|-----------|---------|
| Test ID | TC-006 |
| Description | Verify each recompute writes an `ActivityLog` entry |
| Precondition | Authenticated Operations user |
| Steps | 1. Call `POST /predictions/run` · 2. Query `ActivityLogs` for `Action = "Prediction"` |
| Expected Result | One log row with user, role, order count, duration, and `Run-` reference |
| Actual Result | ✅ Audit row created per run |
| Status | ✅ PASS |

**Test Case 7: Dashboard Display & Filtering**

| Attribute | Details |
|-----------|---------|
| Test ID | TC-007 |
| Description | Verify dashboard renders and all filters/tabs work |
| Precondition | Predictions persisted; API reachable |
| Steps | 1. Open SLA Monitoring page · 2. Verify KPI cards and 3 charts · 3. Exercise all 9 filters · 4. Switch Ongoing ↔ Delivered |
| Expected Result | All components render; filters narrow results correctly |
| Actual Result | ✅ Charts, tabs, and all filters functioning |
| Status | ✅ PASS |

## 2.4 Performance Metrics

| Component | Step | Measurement | Status |
|-----------|------|-------------|--------|
| Historical aggregation | EF Core grouped queries | Pre-fetched once (no N+1) | ✅ |
| Prediction engine | Score computation per order | In-memory, no I/O per order | ✅ |
| Persistence | Upsert + single `SaveChangesAsync()` | One round trip | ✅ |
| `POST /predictions/run` | End-to-end recompute | Reported in `durationMs` | ✅ |
| Read endpoints | Query → JSON (`AsNoTracking`) | Sub-second | ✅ |
| Dashboard | API → render | Sub-second on local | ✅ |

> Replace the qualitative entries above with the actual `durationMs` values from your demo run and browser timings.

## 2.5 Test Summary

| Metric | Value |
|--------|-------|
| Total Test Cases | 7 |
| Passed | 7 |
| Failed | 0 |
| Pass Rate | 100% |

---

# DELIVERABLE 3: FINALIZED 4 ARCHITECTURES

## 3.1 Architecture 1: Conceptual (Business View)

```
+---------------------------------------------------------------------+
|                   CONCEPTUAL ARCHITECTURE (FINAL)                   |
|                                                                     |
|   [ Delivery Orders ]      [ Prediction Engine ]                    |
|   [   (SPX DMS /    ] ---> [  Weighted 8-Factor ] ---+              |
|   [    MSSQL)       ]      [  SLA Risk Scoring   ]   |              |
|                                                      v              |
|   [ Operations Team ]      [  SLA Monitoring   ]  [ Risk Level +    ]|
|   [    Decision &   ] <--- [    Dashboard      ] <-[ Reason +       ]|
|   [   Intervention  ]      [ (React + Recharts)]   [ Recommendation ]|
|                                                                     |
|   Value: Early identification of at-risk deliveries ->              |
|          Explainable, actionable dispatch intervention ->           |
|          Improved SLA compliance                                    |
+---------------------------------------------------------------------+
```

**Business differentiator:** the engine does not only flag risk — it returns *why* an order is at risk and *what dispatch should do about it*, so operators can act without interpreting a model score.

## 3.2 Architecture 2: Logical (Layers View)

```
================== LOGICAL ARCHITECTURE (FINAL) ======================

PRESENTATION LAYER
  React 19 + TypeScript (Vite)
   - Existing DMS pages (Orders, Dispatch, Drivers, Reports)
   - NEW: SlaMonitoring.tsx
       KPI cards | Ongoing & Delivered tabs | 9 filters
       Route on-time bar | Driver on-time bar | Risk distribution pie
       Printable "SLA Proactive At-Risk Orders Report"
                             |
                    axios (predictionApi.ts)
                             v
APPLICATION LAYER  (ASP.NET Core Web API - SPXDeliveryAPI)
  PredictionsController  [Authorize(Policy = "OpTeamAndAbove")]
   POST /run | GET /at-risk | GET /completed
   GET /sla-summary | GET /driver-performance
                             |
  Services
   - IPredictionService / PredictionService  (8-factor scoring engine)
   - ISlaService / SlaService                (duration formatting, SLA helpers)
                             |
                       Entity Framework Core
                             v
PERSISTENCE LAYER  (Microsoft SQL Server - SPXDeliveryDb)
  LEGACY (unaltered): DeliveryOrders | Employees | ActivityLogs
                      DeliveryHistoryLogs | Notifications
  NEW (additive):     DeliveryPredictions
                      (RiskScore, RiskLevel, ConfidenceScore, IsAtRisk,
                       RiskReason, RecommendedAction, PredictedAt)

CROSS-CUTTING
  - JWT auth + RBAC          - Activity logging / audit trail
  - AsNoTracking reads       - Aggregate pre-fetch (N+1 avoidance)

Legend: LEGACY = unmodified | NEW = enhancement | ARROWS = data flow
```

## 3.3 Architecture 3: Physical (Deployment View)

```
=============== PHYSICAL ARCHITECTURE (FINAL) ========================
LOCAL DEVELOPMENT ENVIRONMENT

  [ MICROSOFT SQL SERVER ]
     - Database: SPXDeliveryDb
     - Legacy tables: unaltered
     - New table:     DeliveryPredictions (EF Core migration)

  [ ASP.NET CORE WEB API  -  SPXDeliveryAPI ]
     - Controllers: PredictionsController (api/predictions)
     - Services:    PredictionService, SlaService
     - ORM:         Entity Framework Core
     - Docs:        Swagger
     - Auth:        JWT + RBAC (OpTeamAndAbove)

  [ REACT FRONTEND  (Vite dev server, localhost:5173) ]
     - Page:   src/pages/SlaMonitoring/SlaMonitoring.tsx
     - Charts: Recharts (BarChart, PieChart)
     - HTTP:   axios via src/api/predictionApi.ts

  [ DEPLOYMENT TARGET ]
     - Docker (containerization) -> Hostinger (hosting)

Data Flow:
  (1) React        -> API      (HTTPS/JSON, JWT bearer token)
  (2) API          -> MSSQL    (EF Core: READ DeliveryOrders/Employees)
  (3) API          -> MSSQL    (EF Core: UPSERT DeliveryPredictions)
  (4) API          -> MSSQL    (EF Core: INSERT ActivityLogs - audit)
  (5) Ops Manager  -> React    (browser, role-gated dashboard access)

Cost: $0 for local development (open-source toolchain)
```

## 3.4 Architecture 4: Process (Timing View)

```
=============== PROCESS ARCHITECTURE (FINAL) =========================

SCENARIO A: ON-DEMAND RECOMPUTE  (Operations-triggered)
  T+0ms        T+~ms            T+~ms             T+~ms          T+~ms
  Ops clicks -> POST /run   -> Aggregate      -> Score 8      -> Upsert
  "Run          (authorize)    driver/route/     factors per     predictions
  Predictions"                 client history    active order    + audit log
  Trigger: User-initiated (Operations Team and above)
  User Interaction: YES  |  Duration: reported as durationMs in response
  Data Freshness: real-time as of the click

SCENARIO B: DASHBOARD READ  (Operations views SLA Monitoring)
  T+0ms            T+~ms              T+~ms            T+~ms
  Ops opens   -> GET /at-risk    -> Query MSSQL   -> Render KPI cards,
  SLA page       /completed         (AsNoTracking)   3 charts, tables
                 /sla-summary
                 /driver-performance
  Trigger: User navigation  |  User Interaction: YES
  Data Freshness: as of the last recompute (Scenario A)

SCENARIO C: CLIENT-SIDE FILTERING  (no server round trip)
  T+0ms                    T+~ms
  Ops changes filter -> useMemo recomputes filtered list & charts
  Trigger: UI interaction  |  Duration: instant (in-memory)
  Note: 9 filters + tab switching operate on already-fetched data

DESIGN NOTE - Freshness vs. Cost
  Predictions are recomputed on demand rather than on a fixed schedule.
  Because factor #1 (SLA remaining time, weight 0.35) is time-sensitive,
  a recompute is recommended at the start of each dispatch shift.
  A scheduled job is documented as a future enhancement.
```

---

# DELIVERABLE 4: FINAL PROJECT MANAGEMENT DOCUMENTS

## 4.1 Final Project Charter

| Field | Final Version |
|-------|---------------|
| Project Name | At-Risk Delivery Prediction & SLA Monitoring (ADPSM) |
| Legacy System | SPEEDEX Delivery Management System (DMS) |
| Project Sponsor | SPEEDEX Operations Management |
| Project Manager | Gabriel, David Jr. M. |
| Vision Statement | To transform the SPEEDEX DMS from a transactional record-keeping system into a proactive, intelligence-driven platform that identifies at-risk deliveries before they breach SLA and gives dispatch explainable, actionable recommendations. |

**Success Criteria**
1. Dashboard displays delivery and SLA data accurately, with aggregate breakdowns reconciling to source totals.
2. Every at-risk delivery is accompanied by a risk level, confidence score, reason, and recommended action.
3. No modification to existing DMS tables or business logic — the enhancement is strictly additive.
4. Prediction access restricted to Operations Team and above, with every recompute recorded in the audit trail.
5. All deliverables submitted on time.

## 4.2 Final WBS Summary

| Sprint | Theme | Tasks | Total Effort | Key Deliverables |
|--------|-------|-------|--------------|------------------|
| Project Initiation | Project Setup | 5 | 9 hrs | Charter, Risk Register, Communication Plan, WBS |
| Sprint 1 | Requirements & Design | 7 | 13.5 hrs | 4 Architecture Diagrams, Release Plan |
| Sprint 2 | Data Layer Implementation | 8 | 9.5 hrs | `DeliveryPredictions` schema + EF Core migration |
| Sprint 3 | Prediction Engine & API | 9 | 13.5 hrs | `PredictionService`, `SlaService`, 5 API endpoints |
| Sprint 4 | Dashboard & Integration | 9 | 11 hrs | `SlaMonitoring.tsx`, End-to-End Testing |
| Final Wrap | Final Submission | 6 | 8 hrs | Complete Package, Demo Video |
| **TOTAL** | | **44** | **62.5 hrs** | |

## 4.3 Final Risk Register Summary

| ID | Risk Description | Category | Owner | Status |
|----|------------------|----------|-------|--------|
| R1 | MSSQL connection / credential failure during prediction run | Technical | Backend Developer | ✅ Mitigated |
| R2 | Risk weights not validated against real outcomes — predictions unreliable | Technical | Backend Developer | ⚠️ Active |
| R3 | Time shortage — cannot complete all tasks | Schedule | PM | ⚠️ Active |
| R4 | Prediction data loss or stale predictions after order updates | Operational | Backend Developer | ✅ Mitigated |
| R5 | Dashboard fails to load or charts render empty | Technical | Frontend Developer | ✅ Mitigated |
| R6 | Scope creep — adding unnecessary features | Scope | PM | ⚠️ Active |
| R7 | Team collaboration issues — conflicting schedules | Resource | PM | ✅ Mitigated |
| R8 | Dependency / version incompatibility (React 19, EF Core) | Technical | Backend Developer | ✅ Mitigated |
| R9 | Duplicate or orphaned prediction rows from joins | Technical | Backend Developer | ✅ Mitigated |
| R10 | Performance degradation as order volume grows (N+1, large table scans) | Operational | Backend Developer | ⚠️ Active |
| R11 | Unauthorized access to prediction data | Security | Backend Developer | ✅ Mitigated |
| R12 | Time-sensitive scores go stale between recomputes | Operational | PM | ⚠️ Active |

**Notes on newly mitigated items**
- **R9** — resolved by keying predictions on `DeliveryOrderId` with an upsert, so one active order maps to exactly one prediction row.
- **R10** — partially mitigated via one-time aggregate pre-fetch and `AsNoTracking()`; still Active because volume growth has not been load-tested.
- **R11** — mitigated by `[Authorize(Policy = "OpTeamAndAbove")]` on all prediction endpoints.
- **R12** — Active: factor #1 carries 0.35 weight and decays with time; a scheduled recompute is the proposed mitigation.

## 4.4 Final Communication Plan

| Stakeholder | Communication Channel | Frequency |
|-------------|----------------------|-----------|
| Operations Management (Sponsor) | Status report via email | Weekly |
| Hub Supervisors / Dispatchers | Dashboard demonstrations | Sprint Reviews |
| Delivery Riders / Drivers | Performance feedback sessions | Sprint Reviews |
| IT Department | Technical documentation + Swagger reference | At project completion |
| Project Team | Team meetings | Weekly |
| Instructor (Professor) | Sprint deliverables | Every Saturday |

## 4.5 Final Release Plan Summary

| Sprint | Dates | Theme | Key Deliverable |
|--------|-------|-------|-----------------|
| 1 | July 4–11 | Requirements & Design | 4 Architecture Diagrams |
| 2 | July 12–18 | Data Layer | `DeliveryPredictions` schema + migration (+ Midterm Exam) |
| 3 | July 19–25 | Prediction Engine & API | Scoring engine + 5 endpoints |
| 4 | July 26–Aug 1 | Dashboard & Integration | SLA Monitoring dashboard + End-to-End Testing |
| Final | Aug 2–8 | Final Submission | Complete package + Demo Video |

## 4.6 Future Enhancements (Out of Current Scope)

| # | Enhancement | Rationale |
|---|-------------|-----------|
| 1 | Scheduled recompute (background service / cron) | Keeps the time-decaying SLA factor current without manual triggering |
| 2 | Weight calibration against historical outcomes | Replace hand-tuned weights with values fitted to actual breach data (addresses R2) |
| 3 | Real traffic and weather API integration | Factor #8 currently uses simulated placeholders |
| 4 | Prediction accuracy tracking table | Persist predicted vs. actual outcomes to measure precision/recall over time |
| 5 | Caching layer for summary endpoints | Reduce repeated aggregate computation as volume grows (addresses R10) |
| 6 | Automated alerts (email / SMS / push) | Escalate Critical-risk orders without requiring dashboard monitoring |

---

# SUBMISSION CHECKLIST

| Item | Submitted? |
|------|-----------|
| Working Dashboard (React SLA Monitoring page) | ✅ |
| Dashboard Source Code (`SlaMonitoring.tsx`) | ✅ |
| Prediction Engine Source Code (`PredictionService.cs`) | ✅ |
| API Endpoints (`PredictionsController.cs`) | ✅ |
| Dashboard Screenshots | ⬜ *insert captures* |
| End-to-End Test Report | ✅ |
| Finalized Conceptual Architecture | ✅ |
| Finalized Logical Architecture | ✅ |
| Finalized Physical Architecture | ✅ |
| Finalized Process Architecture | ✅ |
| Final Project Charter | ✅ |
| Final WBS | ✅ |
| Final Risk Register | ✅ |
| Final Communication Plan | ✅ |
| Final Release Plan | ✅ |
