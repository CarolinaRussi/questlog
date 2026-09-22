import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getLocalSecretsPublic,
  upsertLocalSecrets,
} from "@questlog/core";

const upsertSecretsBodySchema = z.object({
  geminiApiKey: z.string().nullable().optional(),
});

export async function registerSecretsRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/api/secrets", async () => getLocalSecretsPublic());

  app.put("/api/secrets", async (request) => {
    const body = upsertSecretsBodySchema.parse(request.body ?? {});
    return upsertLocalSecrets(body);
  });
}
