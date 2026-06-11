---
name: Studio provider-aware gating & job resume
description: How generation gating and pending-job resume must stay provider-aware in the multi-provider studio
---

In the BYOK multi-provider studio, generation gating and pending-job resume must
key off the **selected model's provider**, never MuAPI specifically.

**Gating:** before a remote generation, resolve the provider with
`getProviderForModelId(modelId)` and gate on `isProviderUsable(provider)`
(= user key OR host env fallback). MuAPI keeps its dedicated paste-key
`AuthModal`; other providers send the user to Settings (`openSettings()`).
Checking `localStorage.getItem('muapi_key')` is the bug — it blocks users who
only hold a fal/replicate/etc. key.

**Why:** a user with only a non-MuAPI key could otherwise never generate, and a
non-MuAPI job would be polled against MuAPI's endpoint and fail.

**Resume:** persist `provider` (and the provider's poll URLs) on each pending
job. Adapters self-poll inline during generation, so standalone resume needs
the poll URL captured at submit time — the `onRequestId(rid, resume)` callback
carries `{ pollUrl, responseUrl }` (fal) / `{ pollUrl }` (replicate); MuAPI
resumes by request id. Resume dispatches via `ai.reconcilePending(job)` →
`getAdapter(job.provider).reconcilePending(job)`, which returns a normalized
`{ url }`. Filter the resume list to `isProviderUsable(job.provider)` so jobs
for currently-unavailable providers stay queued instead of failing.

**How to apply:** affects Image/Video/LipSync studios. Cinema is MuAPI-only
(light-touch, no grouped picker) and uploads are MuAPI-backed, so those gates
legitimately stay on MuAPI.
