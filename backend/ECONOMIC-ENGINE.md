# Economic engine: paper-only integration

This module is a **research-only**, in-memory, CommonJS economic performance model. It is not wired into the HTTP server, payment rails, trading APIs, Payhip publishing, or external agents. No trades, wallet operations, autonomous spending, or network scraping are enabled.

- `createEngine` creates a simulated state with Global Pause enabled, external execution disabled and the existing $100/month cap unchanged.
- `recordPaperYield` records integer-cent hypothetical or independently verified observations, with unique IDs, timestamps, and explicit source/verification metadata. This is **not** a transactional database or a reconciled financial ledger. Do not treat `verified:true` as independent verification; it is an input claim and must be corroborated externally.
- `auditPivot` reviews only verified observations in a trailing 48-hour window, requires at least 48 hours since the engine start and activity on two separate UTC dates, and freezes only **paper research allocations** below $5 net. It never moves money. If every pillar is frozen, no automatic market-momentum restart occurs.
- `report` separates verified-flagged and unverified observations, and always reports actual wallet balances as unknown.

The proposed 70/30 vault split is **not activated** because it conflicts with the previously approved profit allocation: 40% tax reserve, 30% owner distributions, 15% services and 15% investments. This implementation does not alter the existing policy or transfer anything.

Limitations before production: use authenticated append-only persistent accounting, external reconciliation and provenance, explicit owner approval for any allocation change, real transaction idempotency, full time-window observations, provider-side billing caps, and independent audit of any trading or wallet integration. A missing or sparse 48-hour sample is insufficient evidence for a hard freeze.

Run: `cd backend && node --test economic-engine.test.js`. Existing `npm test` also discovers the test file.
