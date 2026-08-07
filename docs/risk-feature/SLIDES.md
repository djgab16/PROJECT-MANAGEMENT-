# Risk Management & At-Risk Delivery Prediction
## Feature walkthrough — 10 slides

Plain-text version of `index.html`, for pasting into PowerPoint or Google Slides.
Every threshold and weight below was read from the project source.

---

## Slide 1 — The problem

**Risk Management for Delivery SLAs**

| Before | After |
|---|---|
| A coordinator opened the dashboard and saw which deliveries **had already breached**. The information arrived *after* the deadline — when the only remaining action was writing an apology. | Every active delivery carries a **risk score, a band, a plain-English reason and a recommended action** — recomputed automatically, hours before the deadline. |

> The system moved from **reporting failure** to **preventing it**.

- Weighted factors: **8**
- Risk bands: **4**
- Auto-recompute: **every 30 min**
- External APIs: **0**

**Notes:** Lead with the before/after, not the algorithm. The sentence that has to land is *"we moved from reporting failure to preventing it."* Flag the zero-external-APIs figure early — it pre-empts "so you just called a weather service?"

---

## Slide 2 — What the feature does

**It does**
- Score every **active** delivery, 0.00 → 1.00
- Sort each into Low / Medium / High / Critical
- Explain *why* — a bulleted risk reason per order
- Recommend *one* next action
- Alert the floor when an order escalates into Critical
- Record what actually happened, then grade itself
- Break performance down by route, priority and driver

**It deliberately does not**
- **Reassign or reschedule anything itself.** It advises; a human decides.
- Call any paid traffic or weather API
- Promise a calibrated arrival time
- Let the machine-learned model drive operations

**One scored delivery, end to end**
```
SPX-0000-4471 · Priority: High · Route: Manila
        ↓ 8 factors, weighted
riskScore  0.84  CRITICAL      confidence 0.90
        ↓
riskReason
  • Less than 12 hours to deadline
  • No driver assigned
  • Route breach rate above 30%
recommendedAction
  Escalate to dispatch immediately
```

**Notes:** Walk the example top to bottom — it is the whole feature in one screen. A bare 0.84 is useless to a coordinator at 2am; *"no driver assigned, 12 hours left, escalate"* is actionable. That gap is the design argument for the feature.

---

## Slide 3 — How risk is computed (the core)

Eight signals, each normalised to `[0,1]`, combined by a fixed weight table. **The weights sum to exactly 1.00** — enforced by a unit test.

| Factor | Weight | How it scores | Why it earns that weight |
|---|---|---|---|
| **Time to deadline** | **0.35** | ≤0h→1.0 · ≤6h→0.9 · ≤12h→0.7 · ≤24h→0.4 · ≤48h→0.2 · else 0 | The only factor that *always* gets worse on its own. Nothing predicts a breach better than being nearly out of time. |
| **Priority** | **0.15** | high 1.0 · medium 0.5 · low 0.1 · unknown 0.3 | A tighter promise is easier to break. Unknown scores mid-range, not safe — bad data must not read as low risk. |
| **Failed attempts** | **0.15** | ≥2→1.0 · 1→0.6 · 0→0.0 | A redelivery already failed once. The second attempt is not a fresh start. |
| **Driver history** | **0.15** | no driver→**0.8** · ≥3 past jobs→breach rate · else 0.2 | An **unassigned** order is treated as high risk on purpose — nobody is currently carrying it. |
| **Route history** | **0.10** | ≥3 past jobs→breach rate · else 0.2 | Some routes simply fail more. Requires 3 samples before we trust a rate. |
| **Package size** | **0.05** | >15kg or >8 items→1.0 · >5kg or >3 items→0.4 | Bulky loads are slower to handle, but it is a second-order effect. |
| **Client type** | **0.03** | vip 0.7 · express 0.5 · corporate 0.3 · else 0.1 | Consequence weighting, not delay prediction. Kept small so it never dominates. |
| **Operating conditions** | **0.02** | blended history + traffic + calendar → slide 5 | Real, but honestly small. We weighted it by how much we trust it. |
| **Total** | **1.00** | | Unit-tested with rounding — 0.35 and 0.03 are not exactly representable in binary floating point. |

**Notes:** This is the slide you will be questioned on. Don't read all eight — say *"time to deadline carries a third of the weight, because it is the only signal that always gets worse on its own,"* then defend the two real decisions: an unassigned order scores **0.8**, and unknown priority scores **0.3, not 0**. If asked where the weights came from: expert-assigned, not fitted — which is exactly why we built the shadow model.

---

## Slide 4 — From score to decision

| Band | Threshold | Meaning |
|---|---|---|
| **Critical** | ≥ 0.80 | Escalate now. **Fires an alert** on entry to this band. |
| **High** | ≥ 0.60 | Intervene today — assign, reassign or contact. |
| **Medium** | ≥ 0.35 | Monitor closely. **Still counts as at-risk.** |
| **Low** | < 0.35 | No action required. |

**What "at risk" means, precisely**
```
isAtRisk = score ≥ 0.35  OR  deadline already passed
```
Two things worth noting. The flag reads the **same constant** as the Medium band rather than a copied literal, so retuning the band can never silently decouple the flag from the label. And a breached order is flagged **regardless of score** — there is no arithmetic route to missing an order that is already late.

**Confidence:** starts at 0.60 and rises as real history backs the score (driver record, route record, parsed weight, client record). Capped at **0.98** — it is a prediction; it never claims certainty.

**Known quirk, stated up front:** because the client-type factor tops out at 0.7, the maximum reachable score is about **0.99, not 1.00**.

**Notes:** The four bands are self-explanatory — don't narrate them. Spend time on the `isAtRisk` line, especially **OR deadline passed**. Then volunteer the 0.99 ceiling: a small, precise, self-caught flaw, and disclosing it buys more credibility than it costs.

---

## Slide 5 — The factor we had to rebuild

**What we found.** The operating-conditions factor had **hardcoded traffic and weather values**. It resolved to one of two numbers — 0.2 on a weekday, 0.533 on a weekend.

```
weighted spread = (0.533 − 0.2) × 0.02 = 0.0067
```

The narrowest band gap is 0.25. This factor was **mathematically incapable** of moving a single order between bands. It was decoration.

**What we replaced it with.** Our own delivery history — no paid API, no new dependency. Three blended signals, weights also summing to 1.00:

| Weight | Signal |
|---|---|
| **0.55** | Historical breach rate for this route, area and time of day |
| **0.25** | Congestion — Metro Manila rush windows, 7–9am and 5–7pm |
| **0.20** | Calendar — weekend versus weekday |

**The fallback chain.** Each level needs at least **3 past deliveries** before we trust it:

`route + time → area + time → route overall → area overall → global → 0.2 default`

Conditions are evaluated against the **delivery slot**, not the moment we happen to run — what matters is the traffic at 6pm Friday, not at 10am when the scorer fired.

**Notes:** Your strongest technical slide — you audited your own model and proved a component was inert. Deliver the arithmetic slowly, then the payoff: *"it looked like it was working, and it could not possibly have been."*

---

## Slide 6 — Running it unattended

A score that only updates when somebody clicks a button is **wrong by design** — the heaviest factor decays with the clock.

**Every 30 minutes, guarded**
- **Hard 5-minute floor** — a bad config value cannot make it hot-spin
- **Overlapping runs are skipped, not queued** — no pile-up under load
- **Errors caught inside the loop** — one bad record cannot kill the service
- **60-second startup delay** — lets the app finish booting first

**One pass, zero N+1.** All driver, route and client history plus the conditions snapshot are fetched **once per run**. Inside the scoring loop there is **no database access at all** — scoring 500 orders costs the same handful of queries as scoring 5.

**Separable audit trail.** Scheduled runs log under `AutoRun-`, operator runs under `Run-`.

**Alerting without alert fatigue.** The naive version re-alerts on every Critical order, every run — **48 pages a day for one delivery**, and a floor that learns to ignore the system.

The fix: read the *previous* band before overwriting it, and alert only on the **transition into** Critical.
```
High → Critical      = alert
Critical → Critical  = silence
```
Alerts land in the **existing** notification feed, tagged *SLA Prediction Engine*, carrying the recommended action as the body.

**Notes:** The "48 pages a day" number makes this slide memorable. Transition detection is a genuinely non-obvious insight and shows you thought about the human receiving the alert. If asked about scale, the N+1 panel is your answer.

---

## Slide 7 — But is it actually right?

**The trap we avoided.** Our completed-deliveries view derives its risk fields *from the outcome* — a breached order is labelled High after the fact. Measuring accuracy against that view returns **100%, truthfully computed, and completely worthless.**

**What we do instead.** When a delivery reaches a terminal status, we snapshot the prediction **as it stood before the result was known**, alongside what actually happened.
- Features copied **verbatim, never recomputed** — recomputing time-based factors after delivery would leak the answer into its own inputs
- Written in the **same transaction** as the status change
- **Idempotent** — three layers of guard, including a unique index
- If no prediction existed, the order is **skipped, not invented**

**The confusion matrix, in operator language**

| | Meaning |
|---|---|
| TP | Correctly flagged at risk |
| FP | False alarms |
| TN | Correctly cleared |
| FN | Missed breaches |

Reported as accuracy, precision, recall and F1 — and rendered with those plain-English labels, because *"false negative"* means nothing to a coordinator but *"missed breaches"* does. With no outcomes yet, the endpoint returns an explicit **"not yet validated"** state, never a measured zero.

**Notes:** **The most important slide in the deck.** Any team can show a risk score; almost none can show they refused a flattering metric. Say it and then stop for a beat: *"we could have reported 100% accuracy, computed correctly, and it would have meant nothing."* Have live figures ready but do not lead with them.

---

## Slide 8 — Testing the weights with a real model

Our eight weights are **expert-assigned, not fitted**. The honest question is "would a model trained on our own outcomes choose differently?" So we built one — and gave it **no authority whatsoever**.

**What it is.** **Logistic regression**, written directly in C# — no ML framework. The eight factors are already normalised, so no scaling was needed. **Fully deterministic** — same data in, identical coefficients out, which is what lets us unit-test a trained model.

**What "shadow" means.** It writes to **three separate nullable columns**. The score, the band and the at-risk flag — the fields the dashboard, alerts and summary read — **are never touched by it**. It ships **switched off**.

**Refusing to train.** Four guards; it declines rather than fitting nonsense:
- **All-breach or all-safe data** — would learn to say one word forever
- **Too few rows** to identify 8 coefficients
- **Out-of-range rows dropped, not clamped** — clamping trains on a value that never existed
- **Non-finite input** rejected before it can poison every coefficient

**A fair head-to-head.** Both scorers are graded on **exactly the same deliveries**, through the **same metric code**, in one pass. The headline is **F1 delta** — F1 rather than raw accuracy, because accuracy rewards predicting the majority class.

**How to talk about it (near-verbatim):**
> "Our live risk scores are **100% rule-based**. We additionally trained a logistic-regression challenger that runs alongside in shadow, so we can prove whether a fitted model would do better before we would ever trust one."

Do **not** call the rule-based engine AI. Do **not** claim the model drives decisions.

**Notes:** Frame the model as a *test of the weights*, not a headline feature — accurate and much harder to attack. Expect "why not just use the ML model?" — it has not been validated on enough real outcomes, and shipping an unvalidated model into an operational alerting path would be indefensible.

---

## Slide 9 — What the coordinator sees

**Six KPI cards:** Active Deliveries · At-Risk Count · SLA Breaches · Overall On-Time % · Average Delay · Avg Delivery Duration

- **Two tabs.** *Ongoing* — what to act on now, with band, time to breach and recommended action. *Delivered* — what happened, for review.
- **Nine filters.** Search, driver, route, area, priority, status, client type, risk band, date range — so a coordinator can narrow to *"High-risk VIP orders on Manila routes today."*
- **Refreshes itself** every 30 seconds, by polling rather than sockets — a deliberate reliability choice after our socket layer kept dropping connections.
- **Degrades gracefully.** If the accuracy panel fails, **only that panel** shows an error; the operational dashboard stays up.
- **Role-gated.** Operations team and above; drivers and clients blocked at both route and API, reusing the existing policy.

**Notes:** If demoing live, **skip this slide** and show the real screen. Keep it as a fallback only.

---

## Slide 10 — What it can't do yet

Every one of these is documented in our source code rather than discovered by a reviewer, because **a disclosed limitation costs a fraction of a discovered one**.

**Predicted arrival is directional, not calibrated.** The arrival estimate adds a **hand-picked offset per risk band**. Those four numbers were *not* fitted from historical delay data. Useful for sorting a worklist; **must not be quoted to a customer as an ETA**. Fitting it from the observed delay distribution is the clearest next step.

**The breach counter mixes scope.** It spans archived and active orders while the active count excludes archived. Almost certainly unintended — but the figure was already published in Week 5 documentation, so we **reproduced it verbatim and documented the flaw** rather than silently changing a number under review.

**The weights are judgement, not evidence.** Expert-assigned and defensible, but not derived from our data. The shadow model exists to answer this, and needs **more recorded outcomes** first.

**Smaller known gaps**
- The at-risk KPI label reads *"High / Critical"*, but the flag also includes Medium — a copy fix, not a logic one
- Maximum reachable score is about 0.99, not 1.00
- The learned model has **no user interface** — API only
- Backend is well covered by tests; the **frontend has no test runner wired up**

**Notes:** Counter-intuitively a **strong** slide — don't rush it apologetically. Say the framing line out loud: *"documented in our source, not discovered by a reviewer."* The arrival-offset admission matters most; volunteering it converts a potential ambush into evidence of rigour.
