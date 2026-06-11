import { Router, type IRouter } from "express";
import { GATEWAY_PROVIDERS, resolveGatewayKey } from "../gateway";

const router: IRouter = Router();

// Client-driven short poll: one upstream poll per call (avoids long-held
// connections / proxy timeouts). Provider-agnostic via the gateway registry;
// mounted under `/api`, so the full path is `/api/gateway/:provider/poll`.
router.post("/gateway/:provider/poll", async (req, res) => {
  const provider = req.params.provider;
  const cfg = GATEWAY_PROVIDERS[provider];

  if (!cfg || !cfg.pollPath) {
    res
      .status(404)
      .json({ error: `Unknown or non-pollable provider: ${provider}` });
    return;
  }

  const requestId = req.body?.requestId;
  if (!requestId || typeof requestId !== "string") {
    res.status(400).json({ error: "requestId is required" });
    return;
  }

  const key = resolveGatewayKey(cfg, req.headers["x-provider-api-key"]);

  try {
    const upstream = await fetch(`${cfg.target}${cfg.pollPath(requestId)}`, {
      method: "GET",
      headers: key ? { [cfg.authHeader]: key } : {},
    });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

export default router;
