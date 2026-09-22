import type { FastifyInstance } from "fastify";
import { getBoardRevision } from "@questlog/core";

export async function registerBoardRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/board-revision", async () => getBoardRevision());
}
