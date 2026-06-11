import {
  createProxyMiddleware,
  type RequestHandler,
} from "http-proxy-middleware";

// Provider-agnostic gateway scaffolding.
//
// Adds a `/api/gateway/<provider>/**` path that proxies to each provider's
// upstream, injecting the caller's key (`X-Provider-API-Key`) — or a host-level
// env fallback — as that provider's auth header. This sits ALONGSIDE the
// existing MuAPI proxy so nothing currently using `/api/v1/**` regresses;
// adding a new provider later is just another registry entry.

export interface GatewayProvider {
  /** Upstream origin, e.g. https://api.muapi.ai */
  target: string;
  /** Path prefix on the upstream that replaces `/api/gateway/<id>`. */
  upstreamPrefix: string;
  /** Header name the upstream expects the API key in. */
  authHeader: string;
  /** Optional scheme prefix for the auth header value (e.g. "Bearer", "Key"). */
  authScheme?: string;
  /** Optional env var holding a host-level fallback key. */
  envKey?: string;
  /** Builds the single-poll URL path for a request id (legacy short-poll). */
  pollPath?: (requestId: string) => string;
  /**
   * Hosts (besides `target`'s host) that the client may ask the short-poll to
   * GET. Lets adapters pass back the absolute status/result URL a provider
   * returns (fal queue, replicate prediction url, veo operation, etc.) while
   * keeping the poll endpoint from being an open proxy.
   */
  pollHosts?: string[];
}

export const GATEWAY_BASE = "/api/gateway";

export const GATEWAY_PROVIDERS: Record<string, GatewayProvider> = {
  muapi: {
    target: "https://api.muapi.ai",
    upstreamPrefix: "/api",
    authHeader: "x-api-key",
    envKey: "MUAPI_API_KEY",
    pollPath: (requestId) => `/api/v1/predictions/${requestId}/result`,
  },
  // fal.ai queue API. Submit + status + result all live on queue.fal.run.
  fal: {
    target: "https://queue.fal.run",
    upstreamPrefix: "",
    authHeader: "authorization",
    authScheme: "Key",
    envKey: "FAL_KEY",
    pollHosts: ["queue.fal.run", "fal.run"],
  },
  // Replicate predictions API.
  replicate: {
    target: "https://api.replicate.com",
    upstreamPrefix: "/v1",
    authHeader: "authorization",
    authScheme: "Bearer",
    envKey: "REPLICATE_API_TOKEN",
    pollHosts: ["api.replicate.com"],
  },
  // Kie.ai unified Jobs API.
  kie: {
    target: "https://api.kie.ai",
    upstreamPrefix: "/api",
    authHeader: "authorization",
    authScheme: "Bearer",
    envKey: "KIE_API_KEY",
    pollHosts: ["api.kie.ai"],
  },
  // WaveSpeed AI.
  wavespeed: {
    target: "https://api.wavespeed.ai",
    upstreamPrefix: "/api",
    authHeader: "authorization",
    authScheme: "Bearer",
    envKey: "WAVESPEED_API_KEY",
    pollHosts: ["api.wavespeed.ai"],
  },
  // Google Generative Language API (Gemini image, Imagen, Veo).
  google: {
    target: "https://generativelanguage.googleapis.com",
    upstreamPrefix: "/v1beta",
    authHeader: "x-goog-api-key",
    envKey: "GEMINI_API_KEY",
    pollHosts: ["generativelanguage.googleapis.com"],
  },
  // OpenAI images (gpt-image-1). Synchronous — no poll.
  openai: {
    target: "https://api.openai.com",
    upstreamPrefix: "/v1",
    authHeader: "authorization",
    authScheme: "Bearer",
    envKey: "OPENAI_API_KEY",
  },
};

/** Reads the per-request key (header) or the provider's host env fallback. */
export function resolveGatewayKey(
  cfg: GatewayProvider,
  headerValue: string | string[] | undefined,
): string | undefined {
  const fromHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return fromHeader || (cfg.envKey ? process.env[cfg.envKey] : undefined);
}

/** Formats the auth header value, applying the provider's scheme if any. */
export function formatAuthValue(cfg: GatewayProvider, key: string): string {
  return cfg.authScheme ? `${cfg.authScheme} ${key}` : key;
}

/** Hosts the short-poll route may GET on behalf of a provider. */
export function allowedPollHosts(cfg: GatewayProvider): string[] {
  const hosts = new Set<string>(cfg.pollHosts ?? []);
  try {
    hosts.add(new URL(cfg.target).host);
  } catch {
    /* ignore malformed target */
  }
  return [...hosts];
}

/** True when a provider has a host-level env fallback key configured. */
export function hasEnvFallback(cfg: GatewayProvider): boolean {
  return !!(cfg.envKey && process.env[cfg.envKey]);
}

/**
 * Builds one pass-through proxy per provider. Must be mounted BEFORE
 * express.json() so request bodies stream through untouched (mirrors the
 * existing MuAPI proxy). The dedicated `/poll` JSON route is excluded here so
 * the short-poll handler can own it.
 */
export function createGatewayMiddlewares(): RequestHandler[] {
  return Object.entries(GATEWAY_PROVIDERS).map(([name, cfg]) =>
    createProxyMiddleware({
      target: cfg.target,
      changeOrigin: true,
      pathFilter: (pathname) =>
        pathname.startsWith(`${GATEWAY_BASE}/${name}/`) &&
        !pathname.endsWith("/poll"),
      pathRewrite: (path) =>
        path.replace(`${GATEWAY_BASE}/${name}`, cfg.upstreamPrefix),
      on: {
        proxyReq: (proxyReq, req) => {
          const key = resolveGatewayKey(cfg, req.headers["x-provider-api-key"]);
          if (key) proxyReq.setHeader(cfg.authHeader, formatAuthValue(cfg, key));
          // Strip our transport header so it never reaches the upstream.
          proxyReq.removeHeader("x-provider-api-key");
        },
      },
    }),
  );
}
