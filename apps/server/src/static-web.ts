import { existsSync } from "node:fs";
import { join } from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";

/**
 * Serve the Vite web build from the same origin as `/api/*` (desktop shell).
 * No-op when QUESTLOG_WEB_DIST is unset or the folder is missing (dev with Vite).
 */
export async function registerStaticWeb(app: FastifyInstance): Promise<void> {
  const webDist = process.env.QUESTLOG_WEB_DIST?.trim();
  if (!webDist || !existsSync(webDist)) {
    return;
  }

  const indexHtml = join(webDist, "index.html");
  if (!existsSync(indexHtml)) {
    app.log.warn(`QUESTLOG_WEB_DIST set but index.html missing: ${webDist}`);
    return;
  }

  await app.register(fastifyStatic, {
    root: webDist,
    wildcard: false,
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api")) {
      return reply.status(404).send({ error: "not_found" });
    }
    return reply.sendFile("index.html");
  });

  app.log.info(`Serving web UI from ${webDist}`);
}
