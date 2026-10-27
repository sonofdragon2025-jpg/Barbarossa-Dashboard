# Scoped specialist workers

The coordinator can now assign work to separately authenticated workers without sharing the owner password. This adds assignment and result transport; it does not add a model adapter, actual independent artifact verification, a storefront publisher or paid execution. Global Pause blocks all assignments and completions. Existing billing and pause locks are unchanged.

## Configure identities when execution prerequisites are met

Set BARBAROSSA_WORKERS_JSON in the backend's private environment to a JSON array of objects with id, tokenSha256 and steps. Default is an empty array: no workers authorized. Credentials are separate per worker; rotating or removing an entry revokes that credential on restart. Never commit tokens or paste them into task outputs.

Each bearer credential must be a cryptographically random 32-byte token encoded as 64 lowercase hexadecimal characters. Store only its SHA-256 digest in the registry, and store the original token solely in the corresponding worker's private secret store. Provision credentials in the deployment platform's secret manager; no credentials are generated or uploaded by this source update.

Allowed step names: research, design, build, quality, listing, promotion, support, performance. The registry rejects duplicate identities, duplicate credential hashes and a worker assigned both build and quality. At assignment time an evaluator is also prevented from reviewing a build attributed to that same identity. Identity separation does not by itself verify artifact contents or create independent judgment.

Do not give these role tokens owner account access. Their APIs cannot change policy, unpause, approve spending, publish products, send messages or place orders. Any future model calls or worker tools need their own verified budget enforcement; backend role scoping does not control costs incurred outside this API.

## Protocol

- POST /api/worker/next with Authorization: Bearer TOKEN returns one assignment or null. Requires an authenticated worker, configured transactional PostgreSQL and Global Pause OFF. Current pause cannot be disabled until the existing billing/storage safeguards pass; do not edit those locks to test in production.
- Assignments contain run ID, step, role, goal, shared context, direct dependency outputs, relevant revision feedback and an opaque assignment token. They do not contain other worker credentials, owner password or complete unrelated run context.
- Assignment tokens expire after five minutes. A task can be assigned at most three times; further claims are refused and the task needs intervention. Expired tokens are rejected even if the original worker returns later. A missing response must not be treated as permission to repeat paid model calls. Lease renewal and automated exhaustion recovery are not implemented.
- POST /api/worker/runs/:id/tasks/:step/complete with the role bearer token and JSON {"leaseToken":"ASSIGNMENT_TOKEN","output":{...}} validates the role, assigned worker, expiry, dependency digest and existing role output schema. The client does not supply its own identity or permission claims.
- Completion is attributed to the authenticated worker in the run event history and task metadata. A complete output cannot be replayed using the old assignment token. The owner completion API rejects tasks with worker assignments.
- PostgreSQL row locks serialize assignment and completion. Independent parallel roles bind their own dependency outputs, so unrelated successful handoffs do not invalidate each other. Changes to required dependencies invalidate stale submissions. Rejected quality clears downstream artifact identities and assignments.
- Limits: 60 worker requests/minute per configured identity per server process, existing 16 KB result-body limit, no arbitrary executable tool instructions. Rate limits are not a provider billing cap. The next-assignment scan currently considers the oldest 100 eligible runs; larger backlogs need indexed queue selection before scaling.
- GET /api/workers/status uses the owner session and reports configured role coverage and current technical readiness without credentials. The secure console shows the count and configured roles.

## Verification and deployment

Run npm run check and npm test in backend. Domain tests cover invalid/duplicate credentials, role boundaries, pause enforcement, assignment conflicts/expiry, retry limits, replay prevention, owner-path bypass prevention, stale dependency rejection, parallel handoffs, evaluator separation and transaction rollback. Local HTTP tests check the owner-versus-worker boundary and missing-storage behavior. Live PostgreSQL concurrency, worker credentials and model execution still need deployment verification.

Public /health includes workerApiVersion: 1 and build (RENDER_GIT_COMMIT when available) to distinguish reachable old deployments from this version. An HTTP 200 health result alone does not prove configured workers, paid-model execution, publishing or revenue.
