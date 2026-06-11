---
name: Multi-provider BYOK reference
description: If we add own-key multi-provider support to the studio, this is the reference architecture (node-banana) and the patterns/caveats to follow.
---

# Multi-provider BYOK for the studio

The studio currently talks to ONE aggregator (MuAPI) via the api-server pass-through proxy. The user is exploring (not yet building) letting users plug in their OWN keys for other aggregators (fal.ai, Replicate, kie.ai, WaveSpeed) and direct vendors (OpenAI, Google, Kling, Minimax, Seedream).

## Chosen reference: shrimbly/node-banana (GitHub, MIT)
An open visual workflow editor for AI media gen. Next.js 16 + React 19 + @xyflow/react (React Flow) + zustand + Vercel AI SDK. BYOK, local/private. Supports Gemini, Replicate, fal.ai, Kie.ai, WaveSpeed; OpenAI/Anthropic text-only.

**The pattern worth copying (server side is reusable; their React/node-graph UI is not):**
- **One normalized gateway endpoint** (`POST /api/generate`) takes a provider-agnostic request `{ selectedModel:{provider,modelId}, prompt, images, parameters, dynamicInputs, aspectRatio }`, dispatches on `selectedModel.provider`, and normalizes every response through one `buildMediaResponse()` → `{success, image|video|audio|model3dUrl, contentType}`.
- **One adapter module per provider** (`api/generate/providers/{gemini,replicate,fal,kie,wavespeed}.ts`, barrel `index.ts`). Each owns auth, model-id mapping, param translation, async pattern, response shape, uploads (e.g. fal uploads images to its CDN first).
- **BYOK via per-request headers + env fallback**: client keeps keys in a settings store/localStorage; a `buildApiHeaders` helper attaches `X-<Provider>-API-Key` per provider; server reads `request.headers.get("X-Kie-Key") || process.env.KIE_API_KEY`. User key wins, host key is the fallback.
- **Capability-typed models** ("text-to-image"/"text-to-video"/"text-to-audio"/"text-to-3d") instead of endpoint-coupled — lets one UI target many providers.
- **Client-driven short-poll** for slow jobs: tiny `POST /api/generate/poll` called repeatedly with a `taskId`, instead of holding one long connection (timeout-proof).
- **Dynamic model discovery + cache** for fal/Replicate (`api/providers/{fal,replicate}/models`) rather than a giant static catalog.

## Map onto our app
- `artifacts/studio/src/lib/muapi.js` ≈ ONE adapter → refactor into normalized client + per-provider adapters.
- `artifacts/api-server` proxy is a dumb pass-through today → becomes a real gateway (per-provider auth/translation/poll/normalize), one Express module per provider.
- SettingsModal single "Muapi API Key" → provider picker + per-provider key fields (still localStorage).
- Static ~10k-line `models.js` ≈ capability catalog + dynamic discovery for aggregators.

## Caveats
- **The per-provider model mapping is the real cost**, not the plumbing. No shared model namespace; coverage varies by provider (node-banana's OpenAI is text-only). Vercel AI SDK helps the LLM/prompt side, NOT image/video gen — those are hand-written adapters.

## Other references
- Vercel AI SDK (`ai` + `@ai-sdk/*`) — cleanest normalized provider interface, mostly LLM/text (`experimental_generateImage` for some image providers).
- LiteLLM (OSS) — normalize 100+ providers to one schema + unified key mgmt + proxy (LLM-focused).
- OpenRouter — hosted unified API (what MuAPI is, for LLMs); service not library.
- Official SDKs `@fal-ai/client`, `replicate` — use INSIDE adapters to avoid hand-rolling queue/poll.
- Portkey AI Gateway (OSS) — gateway concerns: routing, retries, fallback, key vault, observability.
- ComfyUI — only if the node-graph direction appeals (local-model focused).
