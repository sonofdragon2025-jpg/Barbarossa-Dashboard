# Phase 2.1: Durable storage and billing safety

Status: PARTIAL. No external database or paid API is connected. Global Pause remains locked ON.

## Implemented
- Server-side lock rejects unpausing while either provider billing safeguards or durable transactional ledger remain unverified.
- Authenticated GET `/api/export` downloads a JSON backup of tasks, audit events, and planning totals. Treat this as sensitive private data; do not commit backups to public GitHub.
- `/api/status` includes `durableLedgerVerified:false` and `paidOperationsAllowed:false`.

## Remaining prerequisites
1. Choose and configure an external transactional database with persistence across Render free-tier restarts. Never store database secrets in GitHub.
2. Migrate tasks, audit log, and owner approvals to durable transactional tables, with authenticated migration and backup/restore tests.
3. Create atomic, per-month ledger reservations with idempotency keys, per-provider cost limits, and conservative max-charge reservations before calls.
4. Verify provider-side hard caps or prepaid balances, including fixed subscription costs, delayed usage charges, and failure behavior. Soft alerts are not hard caps.
5. Test concurrent requests, restarts, quota exhaustion, provider failures, and billing reconciliation. Keep Global Pause ON until all gates pass and owner approves enabling paid services.

The $100/month ceiling is currently a planning value only. No guaranteed cross-provider billing cap exists yet.
