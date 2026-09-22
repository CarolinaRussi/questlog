import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ingestCommit,
  ingestCommitInputSchema,
  listCommits,
} from "@questlog/core";

const listQuerySchema = z.object({
  questId: z.string().uuid().optional(),
  inbox: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional(),
});

export async function registerCommitRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/commits", async (request) => {
    const query = listQuerySchema.parse(request.query);
    const inboxOnly = query.inbox === "1" || query.inbox === "true";
    return listCommits({
      questId: query.questId,
      inboxOnly,
    });
  });

  app.post("/api/commits", async (request) => {
    const input = ingestCommitInputSchema.parse(request.body);
    return ingestCommit(input);
  });
}
