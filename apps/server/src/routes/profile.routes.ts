import type { FastifyInstance } from "fastify";
import {
  getProfile,
  upsertProfile,
  upsertProfileInputSchema,
} from "@questlog/core";

export async function registerProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/profile", async (_request, reply) => {
    const profile = await getProfile();
    if (!profile) {
      return reply.status(404).send({ error: "profile_missing" });
    }
    return profile;
  });

  app.put("/api/profile", async (request) => {
    const input = upsertProfileInputSchema.parse(request.body);
    return upsertProfile(input);
  });
}
