// Provider availability: a provider is "usable" if the user has pasted a key
// for it, OR the host has an env-fallback key configured (reported by the
// api-server). The model pickers gate (lock) models whose provider isn't usable.

import { hasProviderKey } from './keyStore.js';

let envFallback = {};
let loaded = false;
let inflight = null;

/** Fetches which providers have a host env-fallback key. Cached after first call. */
export async function loadProviderEnv() {
  if (loaded) return envFallback;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const resp = await fetch('/api/providers/env');
      if (resp.ok) envFallback = await resp.json();
    } catch { /* network/offline — treat as no fallback */ }
    loaded = true;
    inflight = null;
    return envFallback;
  })();
  return inflight;
}

/** True when the host advertises an env-fallback key for the provider. */
export function hasEnvFallback(provider) {
  return !!envFallback[provider];
}

/** A provider is usable when the user holds a key or the host provides one. */
export function isProviderUsable(provider) {
  return hasProviderKey(provider) || hasEnvFallback(provider);
}
