import { Router, type IRouter } from "express";
import { GATEWAY_PROVIDERS, hasEnvFallback } from "../gateway";

const router: IRouter = Router();

// Provider status + runtime model discovery.
//
// `GET /api/providers/env` tells the client which providers have a host-level
// env-fallback key configured, so the UI can keep those providers unlocked even
// when the user hasn't pasted their own key.
//
// `GET /api/providers/:provider/models?capability=...` performs live, cached
// model discovery for the aggregators that expose a catalog (Replicate today;
// fal.ai best-effort). The client always merges these on top of its curated
// catalog, so discovery failing degrades gracefully to the curated list.

router.get("/providers/env", (_req, res) => {
  const out: Record<string, boolean> = {};
  for (const [name, cfg] of Object.entries(GATEWAY_PROVIDERS)) {
    out[name] = hasEnvFallback(cfg);
  }
  res.json(out);
});

interface DiscoveredModel {
  id: string;
  name: string;
  provider: string;
  capability: string;
  description?: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const cache = new Map<string, { at: number; data: DiscoveredModel[] }>();

const getCached = (key: string): DiscoveredModel[] | null => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  return null;
};
const setCached = (key: string, data: DiscoveredModel[]) =>
  cache.set(key, { at: Date.now(), data });

// Replicate publishes curated collections per capability.
const REPLICATE_COLLECTIONS: Record<string, string> = {
  "text-to-image": "text-to-image",
  "image-to-image": "image-editing",
  "text-to-video": "text-to-video",
  "image-to-video": "image-to-video",
};

async function discoverReplicate(
  capability: string,
  token: string | undefined,
): Promise<DiscoveredModel[]> {
  const slug = REPLICATE_COLLECTIONS[capability];
  if (!slug || !token) return [];
  const resp = await fetch(
    `https://api.replicate.com/v1/collections/${slug}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!resp.ok) return [];
  const json = (await resp.json().catch(() => ({}))) as {
    models?: Array<{ owner: string; name: string; description?: string }>;
  };
  return (json.models ?? [])
    .filter((m) => m.owner && m.name)
    .map((m) => ({
      id: `${m.owner}/${m.name}`,
      name: m.name,
      provider: "replicate",
      capability,
      description: m.description,
    }));
}

// fal.ai has no stable authenticated list endpoint; best-effort only. Returns
// [] on any failure so the client falls back to its curated fal catalog.
async function discoverFal(capability: string): Promise<DiscoveredModel[]> {
  try {
    const resp = await fetch(
      `https://fal.ai/api/models?categories=${encodeURIComponent(capability)}`,
      { headers: { accept: "application/json" } },
    );
    if (!resp.ok) return [];
    const json = (await resp.json().catch(() => ({}))) as {
      items?: Array<{ id?: string; title?: string; shortDescription?: string }>;
    };
    return (json.items ?? [])
      .filter((m) => m.id)
      .map((m) => ({
        id: m.id as string,
        name: m.title || (m.id as string),
        provider: "fal",
        capability,
        description: m.shortDescription,
      }));
  } catch {
    return [];
  }
}

router.get("/providers/:provider/models", async (req, res) => {
  const provider = req.params.provider;
  const capability = String(req.query.capability || "text-to-image");

  if (provider !== "replicate" && provider !== "fal") {
    res.status(404).json({ error: `No discovery for provider: ${provider}` });
    return;
  }

  const cacheKey = `${provider}:${capability}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.json({ models: cached, cached: true });
    return;
  }

  const header = req.headers["x-provider-api-key"];
  const token = Array.isArray(header) ? header[0] : header;

  try {
    const models =
      provider === "replicate"
        ? await discoverReplicate(capability, token)
        : await discoverFal(capability);
    if (models.length) setCached(cacheKey, models);
    res.json({ models, cached: false });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message, models: [] });
  }
});

export default router;
