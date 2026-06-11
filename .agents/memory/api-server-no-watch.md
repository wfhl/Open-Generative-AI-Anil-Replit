---
name: api-server dev has no file watch
description: Why source edits to artifacts/api-server don't take effect until the workflow restarts
---

The `artifacts/api-server` dev workflow runs `build && start` (esbuild bundle, then `node dist/index.mjs`) with **no watcher**. Editing or adding server source (new routes, gateway entries, etc.) has no effect on the running process.

**Why:** unlike the Vite studio (HMR), the api-server is a one-shot build+run. New `/api/...` routes will 404 against the live server even though the code is correct and typechecks.

**How to apply:** after any change under `artifacts/api-server/src`, restart the `artifacts/api-server: API Server` workflow before testing endpoints. Verify directly on its port (`http://localhost:8080/api/...`) — `$REPLIT_DEV_DOMAIN` from the shell may refuse the connection (curl exit 7); the studio reaches it through the Vite dev proxy.
