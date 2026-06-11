import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { createGatewayMiddlewares } from "./gateway";
import { logger } from "./lib/logger";

const app: Express = express();

// Proxy MuAPI requests to api.muapi.ai. The browser never calls muapi directly
// (avoids CORS and keeps the x-api-key header client-side). The full path,
// including the /api/v1 prefix, is preserved on the upstream request via
// pathFilter (mounting at root avoids Express stripping the prefix from req.url).
// Mounted BEFORE express.json() so request bodies stream through untouched.
const muapiProxy = createProxyMiddleware({
  target: "https://api.muapi.ai",
  changeOrigin: true,
  pathFilter: ["/api/v1/**", "/api/workflow/**", "/api/app/**"],
});
app.use(muapiProxy);

// Provider-agnostic gateway proxies, mounted alongside the MuAPI proxy and
// BEFORE express.json() so bodies stream through. /api/gateway/<provider>/**
// forwards to each provider's upstream with the per-request key injected.
createGatewayMiddlewares().forEach((mw) => app.use(mw));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
