# November 4 deployment reconciliation

Source: main plus the previously deployed Docker diagnostic/session branch.

- Consolidate owner-protected renderer diagnostics and existing encrypted session support with current safety gates.
- Keep the startup cap at $100 and Global Pause locked on; no new provider keys, paid browser retries, orders, publishing, or subscriptions.
- Product/content publishing requires owner approval across authority, coordinator, upload policy, runtime, and draft listings.
- Preserve the approved $6.99 handoff price in draft metadata.
- Treat an Invisible draft as draft-awaiting-owner-approval, never published.
- Pin dependency resolution with package-lock.json and npm ci. Run all unit tests and the separate real Chromium smoke test in the Docker build; also run both gates in CI.

## Rollout

Merge the tested release to main. Fast-forward the existing Docker branch to the same main commit, preserving both histories and service configuration. Allow the existing services to auto-deploy; confirm live commit and HTTPS health for each. Keep the current dashboard API selection until authenticated persistence, task inventory, and billing configuration can be compared. No database copy or deletion is authorized by this release.

## Remaining launch gates

Authenticated renderer and persistence/restart verification; provider billing and funding reconciliation; supported Payhip seller connection; Invisible draft and sanctioned customer checkout/download hash verification; image and finished workbook completeness; owner release approval.

## Rollback

Before this release, Node API deployed 3bccf24f460cd1adae28731f9821bcb0dd199335; Docker deployed fdb13590e02eeebbea4c1b5274b74111671638b1. Render rollback restores application builds, not database state. This release adds no destructive schema changes. Preserve both services and existing records.
