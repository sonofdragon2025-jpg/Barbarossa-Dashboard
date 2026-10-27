# Barbarossa backend

Private Node.js service for owner task management, product seeds, revenue records and specialist coordination. The code is not proof of a live deployment or autonomous revenue. External paid execution, publishing and trading remain disabled.

## Run and validate

Install dependencies in backend, run npm run check and npm test, then npm start. Node.js 22 is used for CI. Required owner setting: BARBAROSSA_OWNER_PASSWORD (16+ characters). PORT is supplied by the host.

DATABASE_URL enables PostgreSQL persistence and transactional coordination. Without it, legacy owner tasks use DATA_FILE or an ephemeral local file; agent runs and worker assignments require PostgreSQL. PAYHIP_API_KEY is optional for the existing sale webhook and does not provide product-upload capability.

BARBAROSSA_WORKERS_JSON optionally configures separate role credentials. Leave it absent until worker provisioning is ready. See WORKER-ACCESS.md for scope, token format, assignment expiry and deployment prerequisites. Never place environment secrets in browser code or the repository.

## Access and routes

The owner uses /login with an HttpOnly session cookie and CSRF protection for mutations. Generic owner tasks retain their legacy review UI; approving a task does not execute it.

- /health is public and reports service readiness, worker API version and deployment build identifier when provided by the host.
- /api/status, /api/tasks, /api/audit and /api/export support owner task management.
- /api/products exposes product seeds and downloads; generate-today seeds a linked coordination run, not a finished saleable product.
- /api/agents/status and /api/agents/runs expose coordination state.
- /api/workers/status reports role configuration to the owner without exposing credentials.
- /api/worker/next and /api/worker/runs/:id/tasks/:step/complete use scoped worker bearer tokens, never the owner password.
- /api/autonomy/policy and /api/budget/policy distinguish standing authorization from technical execution.
- /api/budget, /api/ledger and /api/revenue provide recorded accounting information; records are not independently reconciled profit.

Global Pause blocks worker assignments and completions. Recording owner tasks and preparing internal coordination records does not invoke AI or external services. Existing provider-billing and ledger verification locks remain in force.

## Current boundaries

Routine pricing, publication and reversible deployment have standing owner authorization under ../AUTONOMOUS-MANDATE.md; recurring daily approval is not required. The Payhip uploader, model adapters, independent artifact verification, restricted funding and provider billing controls still need implementation/configuration. External execution is not switched on by creating worker identities.

Use ../BUDGET-POLICY.md as the authoritative spending policy. The current startup enforcement cap is $100/month; growth candidates require verified profits and restricted funding. Children's cartoons remain deferred until verified residual income reaches $1,000/month. This milestone does not increase the budget.

CI runs backend syntax and tests for backend changes. Unit and local HTTP checks do not establish live database concurrency, deployed credential configuration, actual model execution or successful storefront publication.
