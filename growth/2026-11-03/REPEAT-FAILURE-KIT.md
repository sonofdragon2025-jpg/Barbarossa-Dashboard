# Repeat Failure Evidence-to-Action Kit
**Hiott Holding LLC | Version 1.0 | 2026-11-03 | Suggested price: $19**
**Buyer deliverable:** editable Markdown/CSV-ready toolkit for maintenance managers, reliability leads and supervisors. This is a downloadable text-based template package; it is **not** an Excel workbook or automated CMMS integration.

## Start here
Use this kit when an asset has repeated breakdowns, but closeout notes only describe restoration. It helps separate repeat-failure signals from *proven* root causes. The user is responsible for validating data, reviewing risks, and obtaining engineering/safety approvals. Never bypass LOTO, permit-to-work, OEM guidance, safety interlocks or regulated change control.

**Implementation (30–60 minutes):**
1. Export the last 90 days of corrective work orders; preserve original records.
2. Standardize asset IDs and component/failure codes without inventing missing fields.
3. Copy records into the Failure History CSV schema below. One row per failure event, not per task.
4. Filter by same asset + failure mode; review events chronologically. Treat three repeats in 90 days as an **illustrative review trigger**, not an industry standard.
5. For high-consequence or repeated failures, open an Evidence Review and assign an owner.
6. Separate immediate containment from a permanent countermeasure. Require test evidence before calling an action effective.
7. Review at 30 and 60 days; close only after defined verification criteria are met.

## 1. Failure History — CSV template
Save the following as `failure_history.csv`. Use ISO dates, integer downtime minutes, nonnegative actual parts/labor cost, and no commas inside unquoted fields. Blank means unknown, never zero.

```csv
event_id,work_order_id,asset_id,component,failure_mode,event_date,downtime_minutes,labor_cost_usd,parts_cost_usd,restoration_action,observed_evidence,source_reference
EVT-001,WO-4101,CONV-07,Drive belt,Slip,2026-10-01,75,90,45,Retensioned belt,Black dust observed,WO-4101
EVT-002,WO-4172,CONV-07,Drive belt,Slip,2026-10-12,90,110,45,Retensioned belt,Tracking not measured,WO-4172
EVT-003,WO-4255,CONV-07,Drive belt,Slip,2026-10-27,120,150,70,Replaced belt,Sheave alignment unverified,WO-4255
```
**All sample records above are fictional.** Example: total downtime 75+90+120 = **285 minutes**; direct recorded labor+parts = **$510**. This excludes production loss, burden, inventory carrying cost and other unrecorded costs.

## 2. Repeat-Failure Triage — fillable form
- Case ID / review date / reviewer:
- Asset / component / standardized failure mode:
- Observation window and source export date:
- Matching events (IDs and work orders):
- Count of distinct events / summed downtime minutes:
- Known direct costs / missing cost categories:
- Safety, environmental, quality, production impact (describe facts):
- Prior fixes and whether recurrence followed each:
- Trigger met? (local site policy, or illustrative 3/90-day screen):
- Decision: monitor / evidence review / formal RCA / urgent engineering escalation
- Decision rationale, owner, due date, reviewer approval:

**Data hygiene checks:** deduplicate by source event ID; do not count one work order twice; verify asset aliases; flag missing timestamps; avoid comparing different failure modes solely because they share an asset; confirm downtime overlap before adding minutes.

## 3. Evidence Review — cause hypothesis worksheet
| Question | Response |
|---|---|
| Problem statement: observable effect, time and impact | |
| What is known, with source reference? | |
| What is unknown? | |
| What was the immediate restoration? | |
| What is the candidate cause? (label HYPOTHESIS) | |
| What evidence would disprove it? | |
| What measurement/test would confirm it? | |
| Who approves the test and safety controls? | |
| Test result and date | |
| Cause status: unverified / supported / rejected | |

**Five-Whys prompts (do not force exactly five):** Why did the component fail? Why did the physical condition exist? Why did the control/inspection fail to detect it? Why was the process or design susceptible? What evidence supports each link? Branch when multiple mechanisms are plausible. Do not use operator blame as a substitute for system evidence.

## 4. Corrective Action & Verification — CSV template
Save as `corrective_actions.csv`:
```csv
action_id,case_id,action_type,description,owner_role,due_date,approval_required,verification_metric,baseline,target,review_date,status,evidence_reference
ACT-001,RFA-001,Containment,Inspect belt tracking on each shift,Shift lead,2026-11-06,Yes,Completed inspections,Unknown,100 percent documented,2026-11-13,Proposed,
ACT-002,RFA-001,Investigation,Measure sheave alignment and load under approved safe conditions,Reliability engineer,2026-11-10,Yes,Alignment and load readings,Unknown,OEM acceptance criteria,2026-11-17,Proposed,
ACT-003,RFA-001,Prevention,Revise PM only if investigation supports it,Maintenance manager,2026-11-20,Yes,Recurrence count per 30 days,3 in 27 days,Site-approved target,2026-12-20,Proposed,
```
All actions are fictional examples, not instructions to adjust operating equipment without approved procedures.

## 5. Manager's Weekly Review — repeatable agenda
**10-minute agenda:** (1) new repeat-failure clusters, (2) safety/production escalation, (3) evidence missing, (4) overdue actions, (5) effectiveness checks due, (6) closure decisions.

**KPI definitions:**
- Repeat clusters reviewed = count of unique asset+failure-mode combinations reviewed this week.
- Evidence completeness = reviews with documented event IDs, source, hypothesis and validation plan / all reviews opened (report numerator and denominator).
- Verified action closure = actions with evidence-backed verification / actions due for verification; *not* just tasks marked complete.
- Recurrence after action = qualifying events during a predeclared observation window after intervention; report exposure and window.

## 6. Acceptance and QA checklist
- [ ] Dates parse as ISO 8601 and asset identifiers match source records.
- [ ] Repeated failures are distinct events, not duplicate work orders.
- [ ] Direct costs are not represented as full financial impact.
- [ ] Hypotheses are labeled and linked to tests and evidence.
- [ ] Safety-critical findings are escalated without waiting for repeat thresholds.
- [ ] Each corrective action has an owner, due date, approval and verification criterion.
- [ ] Review window and success criteria are established before measuring effectiveness.
- [ ] No site-specific safety instructions are inferred from generic templates.

**License:** Single purchasing organization may adapt internally. No redistribution or resale of the unmodified kit. Provided as management documentation templates without warranty of regulatory or engineering compliance.
