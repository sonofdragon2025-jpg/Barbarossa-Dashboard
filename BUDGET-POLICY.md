# Barbarossa operating budget policy

Owner-authorized replacement policy, 2026-10-27. This supersedes the earlier three-month sales trigger, 10% tier above $10,000 profit, and per-payment approval requirement within the permitted growth allowance. Authorization does not mean execution is connected or enabled.

## Budget

- Startup: maximum $100 USD per calendar month across all operating costs, including hosting, AI, subscriptions, automation and agent collaboration. This is a ceiling, not a spending target, and does not authorize access to personal money accounts.
- Trigger: one verified, completed calendar month with net profit of at least $500. No three-month waiting period.
- From the following month, the total monthly operating cap is 25% of the previous completed month's positive net profit, rounded down to whole cents. There is no additional $100 allowance and no later 10% tier.
- Net profit means collected business revenue less refunds, chargebacks, platform/payment fees, and ALL business operating expenses, including AI, hosting and other services. Count each expense once. Exclude sales tax collected for remittance and transfers from the owner. Record all expenses in other_costs_cents once, even if they also appear in the expense ledger; reconciliation must prevent duplicate subtraction.
- Once qualified, recalculate monthly. If prior-month profit falls to $300, the cap is $75; at zero or negative profit, no new growth allowance is available. Missing or unreconciled data cannot unlock spending or preserve a higher cap.
- Spend no more than the calculated allowance, the available restricted balance after reserves, or the remaining monthly cap, whichever is lowest. Outstanding commitments and delayed charges consume the allowance. Protect cash needed for tax obligations, refunds and existing liabilities before funding growth. No borrowing against future sales.

## Account permissions and autonomy

- Existing PayPal is intended for customer receipts. Agent withdrawals, transfers, purchases, and access to linked personal funding sources are forbidden. This repository does not verify PayPal receipt setup or provide payment credentials.
- Establish a separate restricted business spending account/card after revenue begins. It must have no overdraft, credit, or fallback access to personal balances. Fund it only with an eligible allowance through an independently controlled transfer process.
- Owner grants standing authorization for routine business growth purchases within this allowance, once enforcement is verified. Repeated approval for each permitted purchase is not required. All operating costs count toward the aggregate cap.
- Agents cannot change their own budget or permissions. Financial trading, lending, personal transfers, and commitments exceeding present funded capacity are outside this authorization.
- An audit trail, atomic idempotent spending reservations, refund handling, provider-side limits, restricted funding and a working emergency pause must be tested before unattended spending is enabled.

## Implementation status

The server exposes this authorized policy at authenticated GET /api/budget/policy. GET /api/revenue calculates informational candidates using owner-entered figures; it does not verify profits or change the active cap. Its record of historical $500 thresholds is informational until accounting reconciliation is implemented.

Active database enforcement remains $100/month. Global Pause remains locked ON and external paid operations remain disabled. There is no payment executor, PayPal withdrawal integration, verified profit importer, or restricted spending account configured by this change. Automatic activation and autonomous purchases require those missing integrations; editing policy must not bypass the existing safety locks.
