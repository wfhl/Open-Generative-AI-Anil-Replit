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
  /** Optional env var holding a host-level fallback key. */
  envKey?: string;
  /** Builds the single-poll URL path for a request id (enables short-poll). */
  pollPath?: (requestId: string) => string;
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
};

/** Reads the per-request key (header) or the provider's host env fallback. */
export function resolveGatewayKey(
  cfg: GatewayProvider,
  headerValue: string | string[] | undefined,
): string | undefined {
  const fromHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return fromHeader || (cfg.envKey ? process.env[cfg.envKey] : undefined);
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
          if (key) proxyReq.setHeader(cfg.authHeader, key);
        },
      },
    }),
  );
}
