# Open Generative AI

A free, open-source AI image, video, cinema, and lip-sync studio. The frontend is a self-contained vanilla-JS Vite app that calls api.muapi.ai through a server-side proxy.

## Run & Operate

- `pnpm --filter @workspace/studio run dev` — run the studio web app (port from `PORT` env)
- `pnpm --filter @workspace/api-server run dev` — run the API server (proxies MuAPI)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Apps run via Replit **workflows**, not root-level `pnpm dev`.
- MuAPI key is entered by the user in the app's Settings (stored in `localStorage` under `muapi_key`); no server secret is required.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend (`artifacts/studio`): **vanilla JS + Vite**, **Tailwind v3** (config-based theme), custom event-based router. No React.
- API (`artifacts/api-server`): Express 5, with an `http-proxy-middleware` proxy to api.muapi.ai
- DB: PostgreSQL + Drizzle ORM (scaffold present; not used by the studio)

## Where things live

- `artifacts/studio/src/main.js` — app entry; mounts to `#app`, custom `navigate()` router via `window` 'navigate' events
- `artifacts/studio/src/components/*.js` — the studios: Image, Video, Cinema, LipSync, Workflows, Agents, MCP/CLI
- `artifacts/studio/src/lib/muapi.js` — MuAPI client (relative `/api/v1/*` paths → proxy)
- `artifacts/studio/src/lib/models.js` — source-of-truth model catalog (data only)
- `artifacts/studio/src/lib/i18n.js` — en/zh translations
- `artifacts/studio/src/styles/global.css` — Tailwind directives + theme (`@apply` of custom utilities)
- `artifacts/studio/tailwind.config.js` — custom colors (`app-bg`, `panel-bg`, `card-bg`, `primary`, `secondary`), fonts, shadows
- `artifacts/api-server/src/app.ts` — MuAPI proxy mounted before `express.json()`

## Architecture decisions

- The product is the **vanilla-JS Vite app** from the original import — not Next.js and not the alternate React impl in the old `packages/studio`. The Next.js `app/`, `middleware.js`, and submodule packages from the import were empty/incomplete and were ignored.
- All MuAPI calls go through the **api-server proxy** (`/api/v1`, `/api/workflow`, `/api/app` → https://api.muapi.ai) so the browser never hits MuAPI directly — avoids CORS and keeps the `x-api-key` header client-side. The proxy preserves the full path (including `/api/v1`) and is mounted before `express.json()` so request bodies stream through untouched.
- Tailwind is pinned to **v3** (config-based) to faithfully reproduce the original's custom classes and `@apply` usage; the v4 `@tailwindcss/vite` plugin from the scaffold was removed.

## Product

A creative studio for generating AI images and video. Studios: Image, Video, Lip Sync, Cinema (with camera/lens controls), Workflows, Agents, and MCP & CLI. Supports 20+ models (Flux, SDXL, Ideogram, etc.) and English/Chinese UI.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The router is event-based; switching studios does **not** change the URL path. Don't test sub-studios by navigating to a path — click the nav links.
- `src/lib/models.js` is the real data file (~10k lines). It was a re-export stub in the import; if it ever regresses to a stub, model lookups across all studios break.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
