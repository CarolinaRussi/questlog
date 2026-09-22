import type { FastifyInstance } from "fastify";
import { QUESTLOG_CORE_VERSION } from "@questlog/core";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => ({
    ok: true,
    core: QUESTLOG_CORE_VERSION,
  }));
}
