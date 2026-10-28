# Barbarossa execution and publication runtime

This change installs code, not a claim of live autonomous operation. Standing authorization for routine publication remains in force. Existing financial locks remain in force too.

## Implemented

- `backend/commerce-runtime.js`: daily idempotent job creation, specialist handoffs through the existing coordinator, persistent source excerpts, immutable artifact manifests, separate builder/evaluator identities, bounded revisions, durable checkpoints and explicit blocked states.
- `backend/model-adapter.js`: OpenAI Responses API, pinned economical model snapshot, strict role schemas, bounded requests, no arbitrary tools and no automatic retries of billable calls. A free model-access request confirmed this project's access; no paid inference was used to activate production.
- `backend/execution-ledger.js`: reservations share the existing active $100 monthly counter and owner-entered expenses. PostgreSQL transaction and advisory locks prevent concurrent reservations from exceeding the counter. Restricted cash, liabilities and 30-day compute reserves constrain it further. Unknown/expired funding evidence blocks execution. Full reservations are retained conservatively, including uncertain outcomes. They are commitments, not reconciled final provider charges. Actual-cost reconciliation is still required.
- `backend/product-artifacts.js`: original guide content is rendered completely into a branded DOCX, with a native Word workflow diagram and CSV worksheet. Rejects placeholders, inconsistent columns and spreadsheet injection. LibreOffice/PDF text extraction checks require a real installed renderer; absence blocks quality approval.
- `backend/payhip-uploader.js`: a guarded Playwright file-buffer uploader candidate for the correct seller account. Exact artifact bytes and independent quality are checked before browser writes. It persists an invisible draft before download-hash verification and only then attempts public visibility. Wrong accounts, ambiguous controls and human verification stop it. Browser credentials and CDP URLs are never returned by status APIs.
- Authenticated `GET /api/runtime/status` and `GET /api/runtime/jobs` expose readiness and job blockers. The owner dashboard distinguishes installed code from active execution. This change does not introduce daily publication approvals.

## Production blockers

1. The latest authorized Payhip form inspection was stopped by Cloudflare. The candidate UI mapping has **not** been validated against the current seller form and no controlled file-upload/download test has passed. The uploader requires an explicit verified adapter capability before any write; it is not automatically enabled by possessing a session or key.
2. The TinyFish ChatGPT connector does not provision a credential to the Render process. `TINYFISH_API_KEY` must be entered securely in Render Environment, with `PAYHIP_PROFILE_ID` pointing to the same account's verified seller profile. The existing profile that actually accessed HiottHoldingLLC is `prof_5eaf5894b6a5462f`. The separate US profile `prof_9772f7ca49654c78` is empty and must not be treated as authenticated.
3. The existing native Node Render service has no installed LibreOffice/PDF renderer. `backend/Dockerfile` prepares those packages for a supported Docker deployment. No additional service, paid compute or runtime migration is created by this change. Do not enable model calls just to fail later on missing rendering dependencies.
4. Provider billing enforcement, restricted funding, accounting reconciliation, actual compute burn and protected cash have not been independently verified. `server.js` retains its existing hard locks. The runtime cannot grant itself funding permission. No financial flag is exposed to model output or public endpoints.
5. The in-process scheduler runs only while the service is running; a free web service is not verified as an always-on worker. Choose an allowed scheduling/hosting arrangement only after costs and aggregate budget controls are established. The existing ChatGPT Daily Maintenance Product task remains separate and enabled. Reconcile the two schedules before enabling a second daily production loop.

## Verification and recovery

Run `cd backend && npm install && npm run check && npm test`. Tests use injected model/source/render responses for orchestration and do not claim that real inference, a real spending account, Payhip file delivery or unattended publication passed.

Deploy normally through the existing linked main branch; verify `/health` reports `runtimeApiVersion: 1`, then sign in to inspect `/api/runtime/status`. Never print environment secrets or expose browser endpoints.

Before production activation, install the renderer, configure the credential securely, establish and test financial proofs, and pass a supervised invisible-draft upload plus actual seller-file download/hash verification on the exact account. Confirm the public listing's title, price and delivered files. Record product ID and file hashes durably before reporting publication. Do not use a filename or a successful HTTP request as delivery proof.

An `in-flight` or `uncertain` execution receipt must be reconciled before retrying. Do not delete it or choose another operation key to force a replay. Browser timeout after a product-creation click can mean the product already exists; reconcile by recorded product URL and title before creating anything else. A customer-facing product must never contain test fixtures or placeholders.

No trades, purchases, transfers, partnerships, additional subscriptions, automatic top-ups or changes to budget tiers are enabled by this implementation.
