# Barbarossa — Deployment Plan
## Project owner: Hiott Holding LLC

**Status:** Starter plan — not yet deployed  
**Repository:** `sonofdragon2025-jpg/Barbarossa-Dashboard`  
**Initial operating budget:** Hard cap of **$100/month total** across hosting, AI usage, storage, automation, and other services.

## Mission

Build a phone-friendly, cloud-hosted AI assistant that can coordinate specialist workflows for:
- Research and continuous improvement
- Maintenance and reliability content/products
- Publishing and self-help book development
- Short-form video planning and production
- Business development
- Personal task assistance
- Finance and stock/ETF analysis

The dashboard and agent system are separate from the customer-facing brand. Maintenance products and documents for customers must use **Hiott Holding LLC** and must not display the internal agent name.

## Operating rules

1. **Budget gate:** Do not start or renew services if doing so would push total monthly operating spend above $100. Track actual spend and forecast spend before enabling new services.
2. **Approval required:** Ask the owner before executing trades, moving or withdrawing money, making purchases or subscriptions, publishing externally, sending messages, sharing sensitive information, changing permissions, or taking irreversible actions.
3. **Least privilege:** Use the minimum permissions needed for each integration. Keep API keys and tokens in a hosting provider's secret manager; never commit secrets to GitHub.
4. **Auditability:** Record task requests, agent actions, approvals, failures, and estimated/actual costs. Do not store unnecessary sensitive data.
5. **Truthful status:** Drafting, testing, and simulation must be clearly distinguished from live actions. No workflow may claim a task is published, a trade is executed, or a service is deployed unless the result is confirmed.
6. **Human oversight:** Start with draft-only and read-only workflows. Expand autonomy only after testing and explicit approval.

## Deployment phases

### Phase 0 — Repository and scope
- Confirm repository access and branch.
- Add starter documentation and a simple mobile-first dashboard.
- Keep the repository free of credentials and private account data.
- Define an owner-approved list of integrations and actions.

**Exit criteria:** Starter files are committed and visible in GitHub.

### Phase 1 — Static dashboard
- Build a responsive dashboard usable from an Android phone.
- Include sections for Tasks, Research, Publishing, Video, Business, Finance, Approvals, and Budget.
- Make clear that dashboard buttons are placeholders until a backend is connected.
- Deploy the static site only after choosing a host and reviewing its pricing.

**Exit criteria:** The page loads over HTTPS on the phone; no fake agent actions or exposed secrets.

### Phase 2 — Secure backend
- Add authentication and server-side task handling.
- Store task status, approvals, audit events, and budget totals in a managed database or equivalent.
- Add rate limits, error handling, backups, and a way to disable all automated jobs.
- Keep credentials in server-side environment secrets.

**Exit criteria:** An authenticated user can create a task, see its status, and approve or reject a gated action.

### Phase 3 — Specialist workflows
Roll out one workflow at a time:
1. Research and source-backed summaries
2. Maintenance product drafts branded **Hiott Holding LLC**
3. Book and publishing drafts
4. Video scripts and clip plans
5. Business-development drafts
6. Personal task organization
7. Finance analysis using read-only data or simulation first

External publication, messages, financial transactions, and purchases remain approval-gated.

**Exit criteria:** Each workflow passes test cases, records actions, and respects permissions and the budget gate.

### Phase 4 — Scheduling and reliability
- Add scheduled jobs only when their provider costs are known.
- Provide visible last-run time, next-run time, failure status, and retry controls.
- Add alerts for repeated failures, unusual spend, and budget-limit approaches.
- Keep a global pause/kill switch.

**Exit criteria:** Scheduled tasks can fail safely and be paused by the owner from the dashboard.

### Phase 5 — Controlled production
- Test on mobile and review security settings.
- Verify recovery and backup procedures.
- Enable only explicitly approved integrations.
- Review costs weekly during the initial rollout.
- Do not promise continuous 24/7 operation until monitoring, hosting, and provider limits have been validated.

## Initial cost allocation

This is a planning limit, not a quote or a claim that services are already active.

| Cost category | Monthly limit |
| --- | ---: |
| Hosting and domain | $20 |
| AI/API usage | $45 |
| Database, storage, and automation | $20 |
| Contingency | $15 |
| **Total hard cap** | **$100** |

If a provider's actual pricing makes this allocation impractical, revise the allocation before activating the service. The total must remain at or below $100/month.

## Financial workflow safeguards

- Start with education, analysis, watchlists, and paper/simulated trades.
- Never store brokerage passwords in the repository or client-side dashboard.
- Use official, permission-scoped integrations only.
- Require explicit owner approval for each live trade and any transfer or withdrawal.
- Log the rationale, data timestamp, proposed action, approval, and confirmed outcome.
- Do not imply returns are guaranteed.

## Launch checklist

- [ ] Confirm this plan is committed to GitHub.
- [ ] Add README and project structure.
- [ ] Create mobile-first static dashboard.
- [ ] Select hosting only after checking free-tier limits and paid upgrade triggers.
- [ ] Set up authentication before adding private data.
- [ ] Set up server-side secrets and audit logging.
- [ ] Implement the $100 monthly spend gate.
- [ ] Test approval-required actions with simulated workflows.
- [ ] Verify Android access and global pause controls.
- [ ] Enable production integrations one at a time.

## Current status

No deployment, background agent, live trading, external publishing, or connected automation is implied by this plan. Those capabilities must be implemented, tested, and authorized separately.
