import { getProviderKey } from '../keyStore.js';

// Shared plumbing for the BYOK provider adapters. Every provider request goes
// through the api-server gateway (`/api/gateway/<provider>/...`) so the browser
// never calls the upstream directly (avoids CORS and keeps the key out of the
// page-origin requests). The user's key travels in `X-Provider-API-Key`; the
// server injects it as that provider's real auth header, or falls back to a
// host env key when the header is absent.

/** Builds a gateway URL for a provider sub-path (path must start with '/'). */
export const gatewayUrl = (provider, path) => `/api/gateway/${provider}${path}`;

export class BaseAdapter {
  constructor(provider) {
    this.provider = provider;
  }

  /** The user's key, or '' (server may still satisfy the request via env). */
  getKey() {
    return getProviderKey(this.provider) || '';
  }

  /** Headers for a JSON request, attaching the key only when the user set one. */
  headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    const key = this.getKey();
    if (key) h['X-Provider-API-Key'] = key;
    return h;
  }

  /** POSTs JSON to a gateway sub-path and returns the parsed response. */
  async post(path, body, { headers } = {}) {
    const resp = await fetch(gatewayUrl(this.provider, path), {
      method: 'POST',
      headers: this.headers(headers),
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`${this.provider} request failed: ${resp.status} ${errText.slice(0, 160)}`);
    }
    return resp.json();
  }

  /** GETs a gateway sub-path and returns the parsed response. */
  async get(path) {
    const resp = await fetch(gatewayUrl(this.provider, path), { headers: this.headers() });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`${this.provider} request failed: ${resp.status} ${errText.slice(0, 160)}`);
    }
    return resp.json();
  }

  /** One short-poll GET of an absolute (allow-listed) URL via the gateway. */
  async pollOnce(pollUrl) {
    const resp = await fetch(gatewayUrl(this.provider, '/poll'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ pollUrl }),
    });
    return resp.json().catch(() => ({}));
  }

  /**
   * Drives a provider's async job to completion via the gateway short-poll.
   * One upstream GET per call avoids long-held connections / proxy timeouts.
   *
   * @param {string} pollUrl - absolute status/result URL the provider returned
   * @param {Object} opts
   * @param {(data:any)=>('done'|'pending'|'error')} opts.classify - reads job state
   * @param {(data:any)=>string|undefined} opts.extractError
   * @param {number} [opts.maxAttempts]
   * @param {number} [opts.interval]
   */
  async pollUntilDone(pollUrl, { classify, extractError, maxAttempts = 900, interval = 2000 }) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, interval));
      let data;
      try {
        const resp = await fetch(gatewayUrl(this.provider, '/poll'), {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ pollUrl }),
        });
        data = await resp.json().catch(() => ({}));
        if (!resp.ok && resp.status >= 500) continue;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        continue;
      }
      const state = classify(data);
      if (state === 'done') return data;
      if (state === 'error') {
        throw new Error(`${this.provider} generation failed: ${extractError?.(data) || 'unknown error'}`);
      }
    }
    throw new Error(`${this.provider} generation timed out after polling.`);
  }

  // Capabilities a provider doesn't implement throw a clear, localized-ish error.
  // The pickers gate models by provider+capability so these shouldn't be hit in
  // normal use, but they guard against mis-tagged models.
  unsupported(op) {
    throw new Error(`${this.provider} does not support ${op}.`);
  }

  generateImage() { return this.unsupported('image generation'); }
  generateI2I() { return this.unsupported('image-to-image'); }
  generateVideo() { return this.unsupported('video generation'); }
  generateI2V() { return this.unsupported('image-to-video'); }
  processV2V() { return this.unsupported('video-to-video'); }
  processLipSync() { return this.unsupported('lip sync'); }

  async uploadFile() { return this.unsupported('file upload'); }

  // Most adapters self-poll inside their generate methods, so the normalized
  // client's standalone pollForResult is a no-op fallback here.
  async pollForResult() { return this.unsupported('standalone polling'); }

  /**
   * Remaining poll attempts for a persisted job, accounting for time already
   * elapsed since it was submitted (so a refreshed page doesn't poll forever).
   */
  attemptsLeft(job) {
    const interval = job.interval || 2000;
    const elapsed = Math.floor((Date.now() - (job.submittedAt || Date.now())) / interval);
    return Math.max(1, (job.maxAttempts || 900) - elapsed);
  }

  // Reconciles a pending job persisted from a previous session. Providers that
  // can resume override this; by default a job can't be resumed (returns null
  // so the studio simply drops it rather than mis-polling another provider).
  async reconcilePending() { return null; }

  getDimensionsFromAR(ar) {
    switch (ar) {
      case '1:1': return [1024, 1024];
      case '16:9': return [1280, 720];
      case '9:16': return [720, 1280];
      case '4:3': return [1152, 864];
      case '3:4': return [864, 1152];
      case '3:2': return [1216, 832];
      case '2:3': return [832, 1216];
      case '21:9': return [1536, 640];
      default: return [1024, 1024];
    }
  }
}

// ── Small shared input helpers ────────────────────────────────────────────────

/** Maps an aspect ratio to fal's `image_size` enum (flux-family). */
export const falImageSize = (ar) => ({
  '1:1': 'square_hd',
  '16:9': 'landscape_16_9',
  '9:16': 'portrait_16_9',
  '4:3': 'landscape_4_3',
  '3:4': 'portrait_4_3',
}[ar] || 'square_hd');

/** Maps an aspect ratio to an OpenAI gpt-image size. */
export const openaiSize = (ar) => ({
  '1:1': '1024x1024',
  '3:2': '1536x1024',
  '2:3': '1024x1536',
}[ar] || '1024x1024');

/** Fetches a URL and returns a bare base64 string (no data: prefix). */
export async function urlToBase64(url) {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
