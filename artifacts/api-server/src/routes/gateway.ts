import { Router, type IRouter } from "express";
import {
  GATEWAY_PROVIDERS,
  resolveGatewayKey,
  formatAuthValue,
  allowedPollHosts,
} from "../gateway";

const router: IRouter = Router();

// Client-driven short poll: one upstream poll per call (avoids long-held
// connections / proxy timeouts). Provider-agnostic via the gateway registry;
// mounted under `/api`, so the full path is `/api/gateway/:provider/poll`.
//
// Two modes:
//  - { pollUrl }    — GET an absolute status/result URL the provider returned
//                     (fal queue, replicate prediction, veo operation, …). The
//                     URL's host must be in the provider's allow-list so this
//                     never becomes an open proxy.
//  - { requestId }  — legacy MuAPI mode using cfg.pollPath(requestId).
router.post("/gateway/:provider/poll", async (req, res) => {
  const provider = req.params.provider;
  const cfg = GATEWAY_PROVIDERS[provider];

  if (!cfg) {
    res.status(404).json({ error: `Unknown provider: ${provider}` });
    return;
  }

  const key = resolveGatewayKey(cfg, req.headers["x-provider-api-key"]);
  const authHeaders: Record<string, string> = key
    ? { [cfg.authHeader]: formatAuthValue(cfg, key) }
    : {};

  // Resolve the absolute URL to poll.
  let target: string | null = null;
  const pollUrl = req.body?.pollUrl;
  const requestId = req.body?.requestId;

  if (typeof pollUrl === "string" && pollUrl) {
    let host: string;
    try {
      host = new URL(pollUrl).host;
    } catch {
      res.status(400).json({ error: "Invalid pollUrl" });
      return;
    }
    if (!allowedPollHosts(cfg).includes(host)) {
      res.status(403).json({ error: `Host not allowed for ${provider}: ${host}` });
      return;
    }
    target = pollUrl;
  } else if (typeof requestId === "string" && requestId && cfg.pollPath) {
    target = `${cfg.target}${cfg.pollPath(requestId)}`;
  }

  if (!target) {
    res.status(400).json({ error: "pollUrl or requestId is required" });
    return;
  }

  try {
    const upstream = await fetch(target, { method: "GET", headers: authHeaders });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

export default router;
