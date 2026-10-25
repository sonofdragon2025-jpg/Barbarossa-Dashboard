# Phase 2 secure task management implementation plan

## Verified state
The static dashboard performs only a public read-only /health check against the API. No admin credential is embedded in frontend code. The API's existing task endpoints require BARBAROSSA_ADMIN_TOKEN and should not be exposed by adding that token to public HTML or JavaScript.

## Required before enabling dashboard task controls
1. Add server-side owner authentication with an HTTPS-only, HttpOnly, Secure, SameSite cookie session and CSRF protection. Never send the Render environment token to the public static frontend.
2. Add login throttling and explicit logout/session expiry. Keep sensitive secrets server-side. Prefer an identity provider if one is available at zero upfront cost.
3. Use durable storage with migration/backup and atomic updates; Render's ephemeral filesystem is insufficient.
4. Add server-side per-task authorization and audit events. Keep the global pause on by default. Approval must not itself execute any external action.
5. Implement an actual provider-cost ledger and enforce $100/month across all services before enabling paid API calls; the existing estimated-cost counter is not a real spending cap.
6. Add integration tests for unauthenticated access, CSRF, unauthorized origins, task lifecycle, pause, concurrency, and spending constraints.
7. Only then add mobile-first task list, create-task form, approval queue, and audit history. Display an explicit disabled state for publishing, trading, payments, and messages until separately connected and tested.

## Deployment constraints
- Dashboard: https://barbarossa-dashboard.onrender.com
- Backend URL reported by user: https://barbarossa-dashboard-2026.onrender.com
- Do not overwrite or expose BARBAROSSA_ADMIN_TOKEN.
- Avoid new paid infrastructure without explicit owner approval.
- No live integrations or external actions are enabled by this plan.
