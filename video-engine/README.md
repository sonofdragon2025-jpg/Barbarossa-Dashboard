# Barbarossa Video Clipping & Monetization Engine

Status: **design and starter implementation only**. No live clipping, publishing, connected accounts, or scheduled production is claimed.

## Scope
- Authorized long-form video/podcast clipping, with source rights recorded.
- Original scripted short-form educational videos.
- 9:16 vertical exports (target 1080x1920), 15–60 seconds, burned-in captions.
- Draft title, description, hashtags, and Hiott Holding LLC branding when appropriate.
- Output drafts for owner review before publication.
- Platform adapters (YouTube, TikTok, Instagram, Facebook) are **not connected**.
- Monetization reporting distinguishes actual confirmed revenue from projections.

## Safety gates
- Keep the existing **$100/month total hard cap**, including video tooling, AI, hosting and storage.
- Global pause defaults to ON for all new external actions; external paid actions remain OFF.
- Never purchase, subscribe, publish, upload, message, or change permissions without owner approval.
- Do not clip third-party content unless permission, license, or another valid legal basis is documented; do not assume public accessibility grants reuse rights.
- Never bypass DRM, remove watermarks, or use unlicensed music.
- Store tokens server-side, not in source control or client-side code.
- Every job records status, source rights, estimated cost, confirmed cost, and approval decisions.
- Unknown price, unavailable rights evidence, or insufficient remaining budget => fail closed.

## Suggested pipeline
1. Intake source file or owner-supplied URL and rights evidence.
2. Validate source and budget; queue research/transcription.
3. Detect candidate highlights and score relevance; require human verification.
4. Produce draft clip, caption file, thumbnail and metadata using local FFmpeg where feasible.
5. Check audio/video quality, copyright and technical safety.
6. Present preview and exact cost for owner approval.
7. Only after approval and platform connection: publish and verify remote post ID.
8. Report verified views, conversions and revenue, without invented earnings.

## Proposed mobile dashboard panel
Video > New Clip | Drafts | Approvals | Publishing | Performance.
Each job shows source, rights, stage, estimated/actual cost, preview, and last error.
No buttons should claim operational functionality until backed by authenticated services.

## Rollout
- Milestone A: local file-to-clip prototype, unit tests, no network or paid APIs.
- Milestone B: authenticated draft job API, private storage, audit trail and budget gate.
- Milestone C: captions, quality gates, preview and owner approval.
- Milestone D: platform-specific official API connections, separately approved.
- Milestone E: opt-in scheduling and analytics, only after cost and reliability verification.
