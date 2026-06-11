// Live model discovery. On startup the client first merges any previously
// cached discovered models (instant), then asks the api-server to discover
// fresh models for the aggregators that expose a catalog (Replicate via its
// collections; fal.ai best-effort). Results are merged into the catalogs and
// re-cached. Discovery is best-effort: any failure leaves the curated catalog
// untouched.

import { getProviderKey } from './keyStore.js';
import { mergeDiscoveredModels, cacheDiscoveredModels, loadCachedDiscoveredModels } from './models.js';

const DISCOVERY_PROVIDERS = ['replicate', 'fal'];
const CAPABILITIES = ['text-to-image', 'image-to-image', 'text-to-video', 'image-to-video'];

async function discoverOne(provider, capability) {
  const headers = {};
  const key = getProviderKey(provider);
  if (key) headers['X-Provider-API-Key'] = key;
  try {
    const resp = await fetch(
      `/api/providers/${provider}/models?capability=${encodeURIComponent(capability)}`,
      { headers });
    if (!resp.ok) return [];
    const json = await resp.json();
    return Array.isArray(json.models) ? json.models : [];
  } catch {
    return [];
  }
}

/**
 * Runs discovery across providers + capabilities, merges new models into the
 * catalogs, and persists them. Returns the number merged. Safe to call on init.
 */
export async function runDiscovery() {
  // Show cached results immediately.
  loadCachedDiscoveredModels();

  const tasks = [];
  for (const provider of DISCOVERY_PROVIDERS) {
    for (const capability of CAPABILITIES) {
      tasks.push(discoverOne(provider, capability));
    }
  }
  const results = await Promise.all(tasks);
  const all = results.flat();
  if (all.length === 0) return 0;

  const merged = mergeDiscoveredModels(all);
  // Cache the union (cached + freshly discovered) keyed by id.
  cacheDiscoveredModels(all);
  return merged;
}
