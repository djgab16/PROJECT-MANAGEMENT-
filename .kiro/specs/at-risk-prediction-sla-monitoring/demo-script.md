# At-Risk SLA Prediction — Recorded Demo Script

**Course:** Project Management (Capstone Enhancement)
**Feature:** At-Risk Delivery Prediction & SLA Monitoring
**Duration target:** 9:45 – 10:00 (hard ceiling 10:00)
**Format:** Screen recording + voice-over
**Approach:** Role-Based Simulation

Every figure, route, threshold and label quoted below was read out of this repository. Nothing
in this script describes behaviour the system does not have.

---

## 1. Role mapping

The PUP guide's example roles are for a student-analytics system. Here are the equivalent roles
that actually exist in this codebase (`Program.cs` policies + `src/App.tsx` route gating).

| Role in video | Seeded account | Real system role | The question they care about |
| --- | --- | --- | --- |
| Operations Coordinator | `EMP-002` Maria Santos | `OP. TEAM` | "Which deliveries are about to breach, and what do I do about it?" |
| Operations Manager | `EMP-001` Carlos Mendoza | `ADMIN` | "Is the prediction actually right? Which routes and drivers are dragging us down?" |
| IT Administrator | `EMP-001` Carlos Mendoza | `ADMIN` | "Is it stable, audited, and did it break anything that already worked?" |

Seeded password for all demo accounts: `Password123!`
Dashboard route: `/sla-monitoring`, gated to `ADMIN` and `OP. TEAM` only.

---

## 2. Pre-recording setup (do this first)

Run in order. Steps 4 and 5 are what make the AI section recordable — **skip them and the
Model Performance panel will show its empty state and the `/model` endpoint will return
`hasActiveModel: false`.**

1. **Enable the learned model.** In `Delivery_System_Capstone_API/appsettings.json`, set
   `Predictions:Ml:Enabled` to `true`. It ships as `false` by design so installing the build
   changes nothing on its own.
2. **Shorten the scheduler warm-up** so you can film an automatic run without waiting:
   set `Predictions:SchedulerStartupDelaySeconds` to `10`.
3. **Start the API and the frontend.** Confirm the seeder has run (employees `EMP-001`
   through `EMP-005`, delivery orders, and seeded prediction outcomes).
4. **Train a model** so the coefficient table and the comparison endpoint have something to
   show. Use the synthetic path first — it exists precisely so the pipeline can be
   demonstrated before enough real outcomes accumulate:
   ```
   POST /api/predictions/model/train?source=synthetic&sampleCount=600&seed=20260805
   ```
   The seed is fixed, so your recorded numbers are reproducible if you re-record.
5. **Trigger one recompute** so every active order carries a shadow score:
   ```
   POST /api/predictions/run
   ```
6. **Capture the proof shots** you will cut to during the AI section:
   `GET /api/predictions/model`, `GET /api/predictions/accuracy`,
   `GET /api/predictions/accuracy/comparison`.
7. **Run the test suite on camera** for the IT Administrator segment:
   ```powershell
   dotnet test "Delivery_System_Capstone_API.Tests\SPXDeliveryAPI.Tests.csproj" --nologo
   ```
8. **Revert step 1 and 2 after recording** if you want the repo back at its shipped defaults.

> **Consistency warning.** Your Week 5 documentation and
> `.kiro/specs/at-risk-prediction-sla-monitoring/finalization-prompt.md` both state *"There is
> no ML."* That was true then. The learned-model layer (`MlRiskModelService`,
> `LogisticRegressionTrainer`, migration `AddLearnedRiskModel`) has since been added. Either
> update those documents or narrate the AI section exactly as written below — the script is
> phrased so the heuristic remains the system of record and the learned model is presented as
> what it is: a shadow challenger. Do not claim the learned model drives operations. It does
> not.

---

## 3. Timed outline with voice-over

### 3.1 Introduction — 0:00 to 0:45

| Time | On screen | Voice-over |
| --- | --- | --- |
| 0:00 – 0:12 | Title slide | "Hello, and welcome to our Capstone Enhancement demonstration. We are **[Team Name]**, and this is At-Risk SLA Prediction for our delivery management system." |
| 0:12 – 0:30 | Slide: the problem | "Our original system could tell you a delivery was late. It could not tell you a delivery was *about to be* late. By the time the dashboard turned red, the SLA was already gone." |
| 0:30 – 0:45 | Slide: three roles | "Our enhancement scores every active delivery for breach risk before the deadline passes. We'll show it through three roles: an Operations Coordinator, an Operations Manager, and an IT Administrator." |

**Screen capture:** title card, one simple before/after slide, one role-map slide.

---

### 3.2 Data foundation — 0:45 to 1:40

| Time | On screen | Voice-over |
| --- | --- | --- |
| 0:45 – 1:00 | SQL Server database, `DeliveryOrders` row count | "The prediction engine reads the same operational tables the original system already writes: delivery orders, employees, and delivery history." |
| 1:00 – 1:20 | `DeliveryPredictions` and `PredictionOutcomes` tables | "It adds three tables of its own. `DeliveryPredictions` holds the current risk score per active order. `PredictionOutcomes` records what actually happened. `PredictionModels` stores fitted model coefficients." |
| 1:20 – 1:40 | Migration files in the Migrations folder | "Every one of those was added by an additive EF Core migration. Nothing was dropped, nothing was renamed, and no existing column changed meaning." |

**Screen capture:** SSMS or the VS Code SQL extension showing `SELECT COUNT(*)` per table; the
`Migrations` folder with `AddDeliveryPredictions`, `AddPredictionOutcomes`,
`AddLearnedRiskModel` visible.

---

### 3.3 Role 1 — Operations Coordinator — 1:40 to 4:00

This is the heart of the demo. Slow the cursor down here.

| Time | On screen | Voice-over |
| --- | --- | --- |
| 1:40 – 1:52 | Login as `EMP-002` / Maria Santos | "First, the Operations Coordinator. Maria runs the dispatch floor. She logs in with her OP. TEAM account." |
| 1:52 – 2:10 | `/sla-monitoring`, top KPI row | "This is the SLA Proactive Monitoring dashboard. Six live indicators: active deliveries, at-risk deliveries, SLA breaches, overall on-time percentage, average delay, and average delivery duration." |
| 2:10 – 2:25 | Point at **AT-RISK DELIVERIES** card | "This is the number that did not exist before. These are deliveries that have not breached yet, but the engine expects them to." |
| 2:25 – 2:45 | Risk Distribution pie chart | "The Risk Distribution chart splits the active pipeline into four bands — Low, Medium, High, and Critical — so Maria can see the shape of her day at a glance." |
| 2:45 – 3:05 | Click **Recompute SLA Risk**, wait for the toast | "She can force a recompute at any time. The response reports how many active orders were processed and how long it took — here, **[read the real toast]**." |
| 3:05 – 3:20 | Risk Profiling Pipeline table, sort to a Critical row | "Below is every active order with its risk level, predicted arrival, and a confidence percentage." |
| 3:20 – 3:45 | Hover the info icon on a Critical row so the Risk Reason tooltip opens | "And this is the part that makes it usable. Every score is explained. **[read 2–3 real bullets, e.g.]** SLA deadline is very short. The assigned driver has a high historical breach rate. The order has failed delivery once already." |
| 3:45 – 4:00 | Read the Recommended Action cell, then open the Notifications page | "Next to the reason is a concrete instruction. And when an order crosses *into* Critical, the engine raises an alert in the notification feed, sourced to the SLA Prediction Engine — one alert per escalation, not one per refresh." |

**Screen capture:** login screen, KPI row, pie chart, the recompute toast, one Critical table
row with the tooltip expanded, the Notifications page showing a `Critical SLA risk: [waybill]`
entry.

> Narration accuracy notes:
> - Confidence is a *data-coverage* figure, not a probability of being right. If asked, say:
>   "confidence rises when we have real history for that driver, route and client."
> - The **Predicted Arrival** column uses hand-picked per-band offsets, not a fitted ETA. Do
>   not call it a calibrated arrival time. "Directional" is the honest word.

---

### 3.4 Role 2 — Operations Manager — 4:00 to 5:40

| Time | On screen | Voice-over |
| --- | --- | --- |
| 4:00 – 4:12 | Log in as `EMP-001` / Carlos Mendoza | "Now the Operations Manager. Carlos does not dispatch anything. He asks a harder question: is this prediction actually any good?" |
| 4:12 – 4:35 | Scroll to the **Model Performance** panel | "So we measure it. Accuracy, precision, recall, and F1 — and the number of completed deliveries those were measured over. **[read the four real values]**" |
| 4:35 – 4:55 | Confusion matrix tiles | "Broken out honestly: correctly flagged at risk, false alarms, correctly cleared, and missed breaches. Missed breaches are the expensive ones, and we show them rather than hide them." |
| 4:55 – 5:10 | Route SLA Performance chart | "Route SLA Performance ranks routing hubs by on-time percentage, worst first, with the three weakest highlighted in red." |
| 5:10 – 5:25 | Driver SLA Scores chart | "Driver SLA Scores does the same per driver, from completed deliveries only — which is also exactly what feeds the driver-history factor back into the risk score." |
| 5:25 – 5:40 | Apply two filters, then click CSV / Excel / Print PDF | "Nine filters narrow the view — risk level, driver, route, area, priority, status, client type, date, plus free-text search — and any filtered view exports to CSV, Excel, or PDF for a management report." |

**Screen capture:** Model Performance panel with real numbers, confusion matrix tiles, both bar
charts, the filter grid mid-selection, one export firing.

> If your Model Performance panel shows *"Not enough completed deliveries yet"*, say so on
> camera and explain why: metrics only appear once deliveries finish and their outcomes are
> recorded against the prediction that preceded them. That empty state is deliberate — a
> not-yet-validated model must not be shown as scoring zero. That is a stronger point in a
> defence than a fabricated number.

---

### 3.5 Role 3 — IT Administrator — 5:40 to 7:00

| Time | On screen | Voice-over |
| --- | --- | --- |
| 5:40 – 5:52 | `Program.cs` authorization policies | "Third role: IT. Access is policy-based. The whole prediction controller sits behind OpTeamAndAbove — Super Admin, Admin, and Op. Team. Drivers and clients cannot reach it, at the API and at the route." |
| 5:52 – 6:10 | Try `/sla-monitoring` as a DRIVER account, get blocked | "Here is a driver account being refused the dashboard by the protected route." |
| 6:10 – 6:30 | API console log showing the scheduled recompute | "Scoring does not depend on anyone pressing a button. A background service recomputes every 30 minutes, because the largest factor in the score decays with wall-clock time. It's overlap-guarded — a tick that lands while a run is still going is skipped, never queued." |
| 6:30 – 6:48 | Activity Logs page, filter to Prediction actions | "Every run is audited. Operator runs are logged under the operator's name with a `Run-` reference. Scheduled runs are logged as System Scheduler with an `AutoRun-` prefix, so you can always tell who or what triggered a score." |
| 6:48 – 7:00 | `dotnet test` output | "And the whole thing is regression-tested. **[read the real pass count]** tests, green. Order CRUD, authentication, notifications and activity logging all behave exactly as they did before." |

**Screen capture:** the three `AddPolicy` lines in `Program.cs`, a blocked driver navigation,
API log lines from `PredictionSchedulerService`, the Activity Logs page filtered to
`Prediction`, and the `dotnet test` summary line.

> Read the pass count off your own `dotnet test` run. The **66** figure in
> `finalization-prompt.md` predates `LearnedRiskModelTests.cs`, so the current total is higher.
> Six test files now cover scoring, accuracy and outcome capture, critical alerts and caching,
> the conditions factor, the scheduler, and the learned model.

---

### 3.6 AI deep dive — 7:00 to 9:05

Two minutes, three claims: **explainable scoring**, **honest measurement**, **a learned model
that has to earn its way in**. This is the section examiners will push on, so it is scripted
tightly.

| Time | On screen | Voice-over |
| --- | --- | --- |
| 7:00 – 7:12 | Slide: the 8 factors | "So what is the AI doing? At its core, the engine turns each delivery into eight normalised signals, each scored between zero and one." |
| 7:12 – 7:35 | Slide: weight table | "Time remaining against the SLA carries the most weight at 0.35. Priority, redelivery attempts, and driver history are 0.15 each. Route history is 0.10. Package size 0.05, client type 0.03, and local operating conditions 0.02. The eight weights sum to exactly one, and a unit test asserts that — if anyone breaks the sum, every risk band silently de-calibrates." |
| 7:35 – 7:52 | Slide: risk bands | "The weighted sum is the risk score. At or above 0.80 it's Critical. 0.60, High. 0.35, Medium. Below that, Low. And because the score is a weighted sum of named factors, we can always say *why* — which is exactly the tooltip Maria was reading." |
| 7:52 – 8:12 | `PredictionOutcomes` table, `PredictedAtRisk` next to `ActuallyBreached` | "Measuring it is where most projects cheat. When a delivery reaches a terminal status we snapshot the prediction *as it stood before the result was known* — copied, never recomputed. Accuracy comes only from those rows. If we scored ourselves against the completed-orders view instead, we'd get 100% by construction, because that view derives its prediction from the outcome." |
| 8:12 – 8:35 | `GET /api/predictions/model` response, coefficient table | "On top of that we fit an actual model. Logistic regression, trained by batch gradient descent with L2 regularisation, over the *same* eight features — so it and the rule-based scorer see identical inputs and differ only in how they combine them. This endpoint reports every fitted coefficient beside the hand-set weight for the same factor." |
| 8:35 – 8:52 | `GET /api/predictions/accuracy/comparison` response | "But it does not touch operations. It runs in shadow mode: its probability lands in separate nullable columns, and the score the dashboard, the alerts and the SLA summary all read stays the rule-based one. This endpoint grades the two against each other on the identical set of completed deliveries — so a model only gets promoted on evidence, not on the fact that it's a model." |
| 8:52 – 9:05 | Slide: guard rails | "Training refuses to run when it shouldn't: too few rows to identify eight coefficients, or a dataset that's all breaches or all successes, where a model would just learn to say one word forever. It reports the reason to the operator instead of quietly fitting garbage." |

**Screen capture:** three clean slides (factors, weight table, bands); the `PredictionOutcomes`
table with `PredictedAtRisk`, `ActuallyBreached`, `PredictionMadeAt`, `OutcomeRecordedAt`
side by side; the raw `/model` JSON showing `factors[]` with `heuristicWeight` vs
`learnedCoefficient`; the raw `/accuracy/comparison` JSON showing both matrices and `f1Delta`.

---

### 3.7 Conclusion — 9:05 to 9:50

| Time | On screen | Voice-over |
| --- | --- | --- |
| 9:05 – 9:20 | Summary slide | "In summary: eight explainable factors, four risk bands, a background scorer that runs every 30 minutes, alerts on escalation into Critical, and accuracy measured against real outcomes." |
| 9:20 – 9:35 | Split view: original pages still working, beside `/sla-monitoring` | "All of it additive. New tables, new endpoints, one new page. The delivery workflow the original system shipped with is untouched and still green under test." |
| 9:35 – 9:50 | Closing slide | "The result is that operations acts on a delivery while there's still time to save it, instead of explaining it afterwards. Thank you for watching. We are **[Team Name]**." |

---

## 4. Numbers you may state on camera

Verified against source. Safe to say out loud.

| Claim | Value | Source |
| --- | --- | --- |
| Number of risk factors | 8 | `PredictionFeatureVector.Length` |
| Factor weights | 0.35 / 0.15 / 0.15 / 0.15 / 0.10 / 0.05 / 0.03 / 0.02 | `PredictionService.ScoringWeights` |
| Weights sum | exactly 1.00 | asserted by `PredictionScoringTests.ScoringWeights_SumToOne` |
| Risk bands | Critical ≥ 0.80, High ≥ 0.60, Medium ≥ 0.35 | `PredictionService` constants |
| At-risk rule | score ≥ 0.35 **or** deadline already passed | `ComputePredictionInternal` |
| Confidence range | 0.50 to 0.98, never 100% | clamped in code |
| Recompute interval | every 30 minutes | `Predictions:RecomputeIntervalMinutes` |
| Minimum history for a driver/route profile | 3 completed deliveries | `dp.Total >= 3` |
| Unassigned active order risk contribution | 0.8 on the driver factor | `ComputePredictionInternal` |
| Breach definition | completed after expected delivery, or Failed, or Returned | shared across scorer, summary and outcome capture |
| Learned model type | logistic regression, batch gradient descent, L2 = 0.01 | `LogisticRegressionTrainer` |
| Learned model decision threshold | 0.5 | `Predictions:Ml:DecisionThreshold` |
| Prediction endpoints | 9 under `api/predictions` | `PredictionsController` |

## 5. Claims to avoid

| Do not say | Say instead |
| --- | --- |
| "The AI decides which orders are at risk." | "A weighted, explainable scoring model decides; a logistic-regression model runs alongside it in shadow and is compared on recorded outcomes." |
| "Predicted Arrival is the estimated delivery time." | "A directional indicator, from per-band offsets that are not yet fitted from data." |
| "Confidence is how likely the prediction is correct." | "Confidence reflects how much real history backs that order's profile." |
| "The model is 95% accurate." | Read whatever `GET /predictions/accuracy` actually returns, with `totalEvaluated` alongside it. |
| "We used machine learning to score deliveries." | "Scoring is rule-based and explainable. Machine learning is fitted on the same features and evaluated against it before it would ever be trusted." |
| "A score can reach 1.0." | "The practical ceiling is about 0.99, because the client-type factor tops out at 0.7." |

---

## 6. Pre-recording checklist

- [ ] `Predictions:Ml:Enabled` set to `true`
- [ ] `Predictions:SchedulerStartupDelaySeconds` shortened
- [ ] API running, database seeded, frontend running
- [ ] `POST /predictions/model/train?source=synthetic&sampleCount=600&seed=20260805` returned a model
- [ ] `POST /predictions/run` executed at least once
- [ ] At least one order visibly sits in **Critical** on the dashboard
- [ ] A `Critical SLA risk:` notification is visible in the notification feed
- [ ] Model Performance panel state confirmed — real metrics, or the honest empty state
- [ ] `/model` and `/accuracy/comparison` JSON responses captured
- [ ] `dotnet test` run and pass count noted
- [ ] Driver account ready to demonstrate the RBAC block
- [ ] Timing rehearsed end to end, under 10:00
- [ ] 1080p, quiet room, cursor movement slowed
