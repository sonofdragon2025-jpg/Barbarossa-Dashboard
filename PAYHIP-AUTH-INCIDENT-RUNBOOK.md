# Payhip Cloudflare challenge — supported integration and incident runbook

## Verified findings (2026-11-02)
- Official Payhip API reference: https://payhip.com/api-reference — currently documents coupons and license keys, **not** digital-product creation/file upload.
- Official Payhip Zapier help: https://help.payhip.com/article/116-zapier — sale, refund, subscription and product triggers, **no Payhip write actions**.
- Official product workflow: https://help.payhip.com/article/59-adding-a-digital-product — browser UI supports uploaded files, title, price, and **Invisible** visibility.
- TinyFish saved profile `Barbarossa Payhip Seller US` can open payhip.com/products but repeated runs stop at Cloudflare human verification. Manual setup can access dashboard after challenge. **Seller account and file delivery not independently verified by automation.**

## Non-negotiable rules
- No CAPTCHA solving, fingerprint spoofing, proxy rotation to evade challenge, direct private endpoints, cookie extraction or bypass.
- Stop on challenge and mark `needs-human-verification`. Never auto-retry or consume further paid browser runs on the same challenge.
- No public publication based only on quality review; require explicit owner release authorization and existing billing/Global Pause controls.
- Never create a duplicate storefront, repeat an uncertain product creation, or claim delivery without a verified customer download.

## Resolution options in order
1. **Provider-supported integration:** Contact Payhip support to request official create-product + file-upload API or approved partner flow, including seller auth and file-delivery testing. Existing public API/Zapier do not provide it. Do not use undocumented APIs.
2. **Assisted browser:** Generate/QA/price/pack products offline. Provide seller with approved product files and metadata; owner completes Cloudflare and uploads as Invisible. Verify customer download through Payhip's documented test-purchase flow only after explicit approval, recording file hashes and any fees.
3. **Alternate storefront evaluation:** If Payhip declines official automation, evaluate a platform with documented seller-side product/file-upload APIs, pricing, digital delivery, and payout compatibility. Migration and publication require separate owner approval.

## Acceptance criteria
- Supported documented interface and authorized credentials, OR repeatably accessible authorized seller session without security challenge.
- Product created as Invisible, unique product ID persisted, no duplicate retries.
- Correct title, price, description and SHA-256 matching downloaded files.
- Customer download verified in a sanctioned test flow, with owner approval for any order/transaction.
- At least three separate clean, budget-controlled runs before claiming unattended upload reliability.

## Support question
Does Payhip offer a documented seller API or authorized partner integration for programmatically creating **digital products**, uploading downloadable files, and setting visibility to **Invisible**? We already use Payhip's public API/Zapier but neither documents product-creation actions. Cloudflare challenges block our consented cloud browser. Is there an approved workflow or allowlisting procedure for our store, without disabling security? Please share documentation, requirements and pricing.

Do not include login cookies, passwords, API keys or private account identifiers in support messages.
