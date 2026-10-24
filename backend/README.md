# Barbarossa Phase 2 — backend starter

This is source code only. **Not deployed or production-ready.** The Phase 1 static dashboard continues to run independently.

## What is implemented
- Node.js standard-library HTTP API; no npm packages or AI subscription required to run the starter.
- Bearer-token authentication, fixed HTTPS CORS origin, basic per-IP rate limiting, task queue, audit trail.
- Owner approve/reject endpoints; global pause defaults ON.
- Hard-coded $100 task cost reservation cap for demonstration.
- No external actions: approving a task does NOT publish, send messages, charge money, execute trades, or invoke AI.

## Required environment variables
- `BARBAROSSA_ADMIN_TOKEN`: generate a unique random secret of at least 32 characters; never put it in GitHub or client-side HTML.
- `DASHBOARD_ORIGIN`: `https://barbarossa-dashboard.onrender.com` (exact origin, no trailing slash).
- `PORT`: assigned by Render automatically.
- `DATA_FILE`: location on a persistent disk, if one is provisioned.

## Endpoints
- `GET /health` public (no secrets)
- `GET /api/status`, `GET /api/tasks`, `GET /api/audit` authenticated
- `POST /api/tasks` JSON: `{"title":"Draft a PM checklist","type":"maintenance-draft","estimatedCost":0}`
- `POST /api/tasks/:id/approve` and `/reject`
- `POST /api/pause` JSON: `{"paused":false}` (approval requires unpaused state)

All /api routes require `Authorization: Bearer <secret>`. Never put this secret into the static dashboard, browser JavaScript, or a public URL.

## Before a real deployment
1. Select an appropriate Render **Web Service** (not Static Site) and review actual pricing. Do not activate a paid service without owner approval. Set root directory `backend`, start command `node server.js`.
2. Replace the bearer-token prototype with real owner authentication, secure server-managed sessions, and CSRF protections.
3. Replace the local JSON file with durable managed storage or a persistent disk and tested backups. Render's ephemeral filesystem is NOT durable.
4. Add authenticated dashboard integration via secure sessions; do not expose admin credentials in public assets.
5. Implement actual billing usage reconciliation and month rollover. Current `committedMonthlyCost` is a simple reservation tally, not real provider spending, and does not reset automatically.
6. Add a durable job queue, retry safety, authorization policy per action, and tests before enabling external integrations.
7. Confirm that monthly totals across hosting, AI, storage, and other providers remain <= $100, with a separate provider-side spending limit where possible.

## Safety
Approval is not execution. No external publishing, payment, trading, email, or AI calls are implemented. Keep global pause ON until security review and testing are complete.
