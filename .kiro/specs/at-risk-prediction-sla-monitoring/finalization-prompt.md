# Finalization Prompt — At-Risk Delivery Prediction & SLA Monitoring

Paste the section below into a fresh agent session. It is self-contained: it states the
verified starting state, the exact remaining work, the decisions that need a human, and the
commands that prove the work is done.

> **Status at time of writing:** the feature is functionally complete and green. Backend builds
> with 0 errors, 66/66 xUnit tests pass, `tsc --noEmit` exits 0. There are **no** `TODO`,
> `FIXME`, or `NotImplementedException` markers anywhere in the project. What remains is
> calibration, consistency, and delivery infrastructure — not construction.

---

## THE PROMPT

You are finalizing the **At-Risk Delivery Prediction & SLA Monitoring** feature in
`c:\Users\gab\Documents\CODE\PM- CAPSTONE`.

### Ground rules

Treat this as highly sensitive, production-adjacent work demanding extreme precision.

- **Do not guess.** Before changing anything, read the file and trace its dependents. For any
  error or anomaly, find the root cause with 100% certainty before proposing a fix. Document
  what is failing, why, and any pattern in the behavior.
- **Preserve core functionality.** Delivery order CRUD, auth/RBAC, notifications, activity
  logging, and the existing dashboard contract must not regress.
- **Published figures are load-bearing.** Several numbers this feature emits are already cited
  in Week 5 capstone documentation. Do not silently change any of them. Where behavior is
  known-imperfect but frozen, the codebase documents it inline rather than correcting it —
  follow that convention.
- **Flag out-of-scope changes** for review instead of making them.
- **Pause and ask** if uncertain. Use the Context7 MCP server to verify EF Core, ASP.NET Core,
  and React API usage before writing code that depends on framework behavior.
- **Do not commit, push, or run destructive git commands** unless explicitly told to.

### Architecture you are working in

Rule-based weighted scoring. **There is no ML** — no ML.NET, ONNX, or Python. "Accuracy" is
post-hoc measurement of the heuristic against recorded outcomes, not model training. Do not
introduce an ML dependency.

| Layer | Location |
| --- | --- |
| Endpoints (6) | `Delivery_System_Capstone_API/Controllers/PredictionsController.cs`, route `api/predictions`, class-level `[Authorize(Policy = "OpTeamAndAbove")]` |
| Scoring engine | `services/PredictionService.cs` — 8 weighted factors summing to 1.00; bands Critical ≥ 0.80, High ≥ 0.60, Medium ≥ 0.35 |
| Scheduler | `services/PredictionSchedulerService.cs` — `BackgroundService`, overlap-guarded, kill switch `Predictions:SchedulerEnabled` |
| Aggregate cache | `services/PredictionCache.cs` — singleton `IMemoryCache`, evicted from `PredictionService`, not the controller |
| Honest accuracy | `services/PredictionOutcomeService.cs` + `models/PredictionOutcome.cs` — snapshots the prediction that existed *before* the result was known |
| Conditions factor | `services/LocalHistoryConditionsService.cs` — two-stage snapshot so per-order lookups do no I/O |
| SLA math | `services/SlaService.cs` |
| DTOs | `models/SlaMonitoringDto.cs` |
| DI + RBAC policies | `Program.cs` |
| Schema | `data/AppDbContext.cs` + migrations `20260731184308_AddDeliveryPredictions`, `20260731235525_AddPredictionOutcomes` |
| Dashboard | `src/pages/SlaMonitoring/SlaMonitoring.tsx` (+ `.css`), routed at `/sla-monitoring` |
| API client | `src/api/predictionApi.ts` |
| Tests | `Delivery_System_Capstone_API.Tests/` — 5 files, 66 tests |

Config keys live under `SlaThresholds` and `Predictions:*` in `appsettings.json`.

### Conventions you must match

- `return Ok(...)`; DTOs for reads, anonymous objects for command responses. No response
  envelope. Frontend error path reads `response.data.message`.
- `AsNoTracking()` plus a narrow `.Select()` on every read path — deliberately, to avoid
  materializing the `PotImage`/`PodImage` `nvarchar(max)` base64 columns.
- `ILogger<T>` with structured message templates and named placeholders. `LogWarning` for
  reporting anomalies; never throw from a reporting path.
- `DateTime.UtcNow` server-side; local time only via `Predictions:LocalUtcOffsetHours`.
- Namespaces `SPXDeliveryAPI.{Controllers,Models,Services,Data,Utils}` over lowercase folders.
  `Sla` (not `SLA`) in C# identifiers; `sla` camelCase in TypeScript.
- Heavy XML docs and `───` box-drawing section separators. Batch pre-fetch into dictionaries to
  avoid N+1.
- Activity logs: human runs use `Reference = "Run-{yyyyMMddHHmmss}"` with employee-derived
  initials/color; system runs use `"AutoRun-…"`, `UserName = "System Scheduler"`,
  `UserRole = "SYSTEM"`.

### Part 1 — Do these now (low risk, no published figure changes)

1. **Kill the magic literal.** In `PredictionService.ComputePredictionInternal`,
   `bool isAtRisk = riskScore >= 0.35 || remainingHours <= 0;` hardcodes `0.35` while
   `public const double MediumThreshold = 0.35` exists on the same class. Use the constant.
   Pure refactor — assert zero behavior change.

2. **Wire the dead server parameter.** `GET api/predictions/at-risk` accepts
   `atRiskOnly` (default `false`), but `predictionApi.getAtRiskOrders()` never sends it, so no
   caller can reach it. Add an optional argument that defaults to preserving today's behavior.
   Do **not** change the endpoint default: the dashboard derives its risk-distribution pie
   chart and all nine client-side filters from the full active set, so narrowing it would
   under-report Low-risk orders and break those charts.

3. **Replace the hardcoded analytics value.** `ReportsController.GetAnalytics` returns
   `averageDeliveryTimeHours = 3.5` — a literal. Compute it the way the SLA layer already does
   (mean of `(DateCompleted - OrderDate).TotalHours` over completed orders that have a
   `DateCompleted`), guard the empty set to `0`, and round to 1 decimal. While there, replace
   the unprojected `_context.DeliveryOrders.ToListAsync()` with a narrow projection of the six
   fields the method actually reads: `Status`, `TaskType`, `PotStatus`, `OrderDate`,
   `DateCompleted`, `LastUpdated`. This field is typed in `src/api/deliveryApi.ts` but is not
   rendered by any component — confirm that yourself before changing it.

4. **Add a single build entry point.** There is no `.sln` in the repo, and `.gitignore`
   contains `*.sln` (inherited from the Vite template), so adding one silently does nothing
   until that line is narrowed. Create a solution containing the API and test projects, and
   un-ignore solution files.

### Part 2 — Ask before doing (each one changes published output or model semantics)

Present these as multiple-choice questions and wait for answers. Do not pick for the user.

1. **`SlaBreachesCount` scope.** Its predicate spans every order including archived ones *and*
   counts still-active overdue orders, while `ActiveDeliveriesCount` in the same DTO excludes
   archived. The mixed scope is documented in-code as "almost certainly unintended" but is
   reproduced verbatim because the figures are already published. Options: (a) leave frozen and
   document; (b) fix the scope and restate the Week 5 numbers; (c) add a second, correctly
   scoped field alongside it and migrate the UI.

2. **`PredictedArrival` calibration.** The four offsets (+18.5 h Critical, +10.0 h High,
   +3.5 h Medium, −4.0 h Low) are hand-picked constants, not fitted from data, yet the UI
   renders them as a predicted arrival. `PredictionOutcomes` now holds the history needed to
   derive per-band delay distributions. Options: (a) leave as-is; (b) fit from outcomes;
   (c) keep the constants but relabel the UI so it does not read as a calibrated ETA.

3. **Weights and bands as configuration.** The 8 factor weights and the 0.35/0.60/0.80 bands
   are compile-time `const`s, while everything else in the feature is config-driven. Options:
   (a) leave as consts (tests assert the weight table); (b) move to `Predictions:Scoring:*`
   with validation that the weights still sum to 1.00; (c) hybrid — consts as defaults,
   optional config override.

4. **Untracking build artifacts.** 207 `bin/`/`obj/` files are tracked, so every build dirties
   the working tree. Fixing it means `git rm -r --cached` across those paths — a large,
   history-visible change. Ask first.

5. **CI.** `.github/` exists but is empty, so nothing runs the 66 tests. Ask whether to add a
   workflow and on which triggers.

### Part 3 — Known-and-accepted, leave alone unless told

- `GET /predictions/completed` is circular by construction (it derives prediction fields from
  the outcome). It must never feed accuracy metrics — that is what `PredictionOutcomes` is for.
- The `riskScore` upper clamp of `1.0` is unreachable; the real ceiling is `0.991` because the
  ClientType factor maxes at `0.7`. Nothing may assume exactly `1.0` is attainable.
- Aggregations in `BuildSlaSummaryAsync` are deliberately evaluated in memory (SQL `DATEDIFF`
  truncation, collation-sensitive `GROUP BY`, .NET comparer ordering). Moving them into SQL
  would change published numbers.
- `20260619173221_AddStructuredAddressFields.cs` is modified on purpose: eight unconditional
  `DropColumn` calls broke clean-database replay and are now guarded. This is a fix, not drift.

### Part 4 — Gaps worth raising, no decision pre-made

- `SlaMonitoring.tsx` seeds its route/area filter lists with seven hardcoded Metro Manila
  cities and its client-type list with `Corporate`/`VIP`/`Standard`. If real data diverges,
  the filters mislead silently.
- Test coverage is unit-level only. No controller or integration tests exist for the six
  endpoints, and there are no frontend tests for the dashboard.
- `dotnet restore` reports two high-severity advisories: `SQLitePCLRaw.lib.e_sqlite3` 2.1.6
  (GHSA-2m69-gcr7-jv3q) and `Microsoft.Extensions.Caching.Memory` 8.0.0 (GHSA-qj66-m88j-hmgj).
- `DMS_Requirements_Updated.md` contains **no** SLA or prediction requirements — only the
  tangential NFR-015 (data integrity) and NFR-018 (tracking accuracy). There is no `.kiro` spec
  or steering file for this feature. If formal acceptance criteria are expected for the
  capstone, they do not exist yet and need to be written.

### Verification — required before claiming completion

Run all three and paste real output. A clean exit code alone is not evidence.

```powershell
dotnet build "Delivery_System_Capstone_API\SPXDeliveryAPI.csproj" -v q --nologo
dotnet test "Delivery_System_Capstone_API.Tests\SPXDeliveryAPI.Tests.csproj" --nologo
node ".\node_modules\typescript\bin\tsc" -p tsconfig.app.json --noEmit
```

Baseline that must be preserved or improved: **0 build errors**, **66/66 tests passing**,
**tsc exit 0**. The two `NU1903` advisories are pre-existing.

Note: `npx tsc` produces garbled output in this PowerShell environment — use the direct
`node` path shown above.

For any behavior you change, add or extend a test that fails before your change and passes
after. Test helpers live in `Delivery_System_Capstone_API.Tests/TestSupport.cs`
(`TestSupport.NewPredictionService(context, conditionsRisk:)`, `TestSupport.NewCache()`), and
the suite uses xUnit with the EF Core in-memory provider.

Finally, state plainly what you verified and what you could not.
