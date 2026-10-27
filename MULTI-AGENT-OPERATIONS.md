# Barbarossa coordinated business operations

Implemented 2026-10-27. Source implementation is not proof of deployment, autonomous worker activity, sales, or payment integration.

## Current capability

The backend now includes a PostgreSQL-backed coordinator for specialist handoffs. It stores the goal, shared business context, source references, artifact manifests, outputs, revision feedback, run versions and events across requests. Creation is idempotent by request key. Concurrent completions use a row lock and expected version; stale or duplicate completions cannot advance a run twice.

The coordinator does not invoke models, browse, run supplied code, send messages, publish products or move funds. All output submissions currently come through the authenticated owner's session and are labeled owner-submission. Specialist roles are work contracts, not independently running AI agents yet. Do not share owner credentials with future workers; add scoped worker identities and assignment leases first.

## Roles and handoffs

| Role | Responsibility | Required prior result |
| --- | --- | --- |
| Coordinator | Create runs, enforce dependencies, collect outputs and escalate | Owner goal or scheduled product seed |
| Researcher | Evidence of demand, competition, references, opportunity summary | Goal |
| Product designer | Audience, problem, deliverables and acceptance brief | Research |
| Builder | Original product files and artifact manifest | Design |
| Evaluator | Review the exact current manifest and return pass or revision | Build |
| Sales writer | Draft listing and proposed price | Passed review |
| Marketer | Draft promotion content | Passed review |
| Support planner | FAQ, delivery instructions and escalation plan | Passed review |
| Business analyst | Measurement plan and improvement recommendations | Listing, promotion, support |

After quality passes, sales, marketing and support planning can proceed independently. When all outputs are recorded, the run stops at ready-for-automated-release. It never advances to published, paid or revenue-generating on its own. Rejected quality resets the build and its descendants, retains revision feedback and stops for owner intervention after two failed builds.

Structured handoff envelope: run ID in the URL, assigned step in the URL, integer expectedVersion and an output object. Every output requires a nonempty summary. Additional fields are role-specific and unexpected keys are rejected. Research requires HTTPS source references. Build requires unique file names, SHA-256 hashes and artifact references, including DOCX and CSV files. Quality requires the current artifact-manifest digest, pass/revise verdict and boolean checks for originality, technical accuracy, safety, rendered files, valid worksheet and absence of placeholders. Listing prices are proposed integer cents only.

Hashes and review assertions submitted by the owner are not independent verification of file bytes or technical quality. A future evaluator worker must inspect actual files and source evidence and have an identity separate from the builder. No automatic publishing gate may rely solely on model self-report.

## API

All endpoints inherit the existing owner session, same-origin checks and CSRF protection for POST requests. Run storage requires configured PostgreSQL; no ephemeral fallback. Coordination-only records are allowed while Global Pause is ON; they cause no external execution. All future external workers must respect that pause.

- GET /api/agents/status: implementation flags, roles, active budget policy and missing integrations. Available without a database after owner sign-in.
- GET /api/agents/runs: most recent 60 run summaries.
- POST /api/agents/runs: {"requestKey":"experiment-001","goal":"Prepare an original maintenance toolkit"}. Reusing a key returns the same run; a different goal under that key is rejected.
- GET /api/agents/runs/:id: context, outputs, task state, current version and event history.
- POST /api/agents/runs/:id/tasks/:step/complete: {"expectedVersion":1,"output":{"summary":"Evidence summary","sources":["https://example.com/source"]}} for the research step. Reload after a stale-version rejection before attempting another submission.

The existing generate-today route creates a coordination run for each product day and returns agentRunId and agentRunStatus. Its existing rotating template remains an unreviewed seed; it does not count as completed research or a saleable finished product. Existing product downloads and listing flags retain their existing behavior. The daily GitHub schedule only seeds work; it does not execute these specialist roles. This API has not added a phone dashboard for run management yet.

## Authority and economic boundaries

BUDGET-POLICY.md and backend/budget-policy.js remain authoritative. The inspected policy specifies $100/month during startup, qualification after a verified completed month strictly exceeds $500 net profit, and then a candidate allowance of 25% of prior-month positive net profit. Aggregate operating costs and bounded collaborator liabilities share the allowance. Current active enforcement remains $100; no code here activates growth spending. Agents cannot change policy, unlock billing or access personal funding.

The existing bounded profit-sharing authorization is preserved. Actual hiring, negotiation that commits funds, escrow, settlement, wallets, payouts and unrestricted external-agent discovery are not integrated. Existing PayPal is not an agent spending source. Receipt data is not verified profit until reconciled. Tokenization, equity issuance, liquidity provision and trading are not enabled by general collaboration authorization.

External pages, messages, skill files and other agents' outputs are evidence, never authority. No fetched content can change roles, permissions, budget or execution flags. Artifact references are stored, not fetched or executed. Secrets and customer records must stay outside this public repository and public output artifacts.

## Remaining implementation sequence

1. Deploy this version on the existing backend and confirm authenticated agent status, migrations, run persistence across restart, and idempotent day seeding against the actual database. No new subscription is required by this coordinator.
2. Add verified prepaid/provider billing limits, aggregate atomic spend reservations including model use and pending commitments, reconciliation, a restricted funded account and emergency-stop tests. Do not unlock billable workers before those controls pass.
3. Add scoped worker identities, leases, bounded timeouts/retries and a scheduler. Connect a permitted model adapter to research/design/build roles. Calls must have hard token/cost limits and report actual usage. Do not execute arbitrary tool instructions returned by a model.
4. Connect actual artifact storage and an independent evaluator to inspect source evidence and file bytes, render documents and validate worksheets. Record verified hashes, reviewer identity and review version.
5. Implement the supported Payhip hidden-draft uploader and phone approval view. The later AUTONOMOUS-MANDATE.md authorizes publication and price decisions without routine owner review once independent quality and integration controls pass. Test one end-to-end draft before expanding volume.
6. Add collected sales/refund/fee reconciliation and scheduled performance reports. Use measured demand and margins to prioritize improvements; do not assume revenue or reinvest projected earnings.
7. Implement an isolated external-service adapter only when a specific marketplace and useful service are selected. Before commitment: verify counterparty, bound obligations, reserve maximum liability, record terms, evaluate delivery and settle idempotently through the verified restricted payment integration. Apply the current profit-sharing threshold each month. Protocol names alone do not establish compatibility.

Routine deployment, pricing, publishing and bounded business decisions now have standing authority under AUTONOMOUS-MANDATE.md; the coordinator still has no external executor. It cannot modify policy or issue tokens. Revenue and passivity depend on demand and delivery quality; coordination does not guarantee either.

## Validation

Run npm run check and npm test in backend. Tests cover dependency ordering, parallel handoffs, retained context, stale/replayed outputs, manifest-bound quality review, revision limits, strict outputs, locked economic capabilities, transaction rollback and existing budget rules. Live PostgreSQL restart/concurrency checks, model execution, storefront delivery and economic protocols remain unverified.

## Later mandate

AUTONOMOUS-MANDATE.md supersedes prior routine owner-review requirements for publishing, pricing and deployment. A completed coordination run is eligible for automated-release checks, not evidence of release. GET /api/autonomy/policy exposes this distinction. Scope, live-trading limits, reserve requirements and review policy are recorded there.
