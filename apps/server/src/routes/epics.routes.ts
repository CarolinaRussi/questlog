import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  complementEpicNotes,
  getEpicNote,
  listEpicNotes,
  resolveJiraCredentials,
} from "@questlog/core";

const epicIdParamsSchema = z.object({
  epicId: z.string().trim().min(1),
});

export async function registerEpicRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/epics/notes", async () => listEpicNotes());

  app.get("/api/epics/:epicId/notes", async (request, reply) => {
    const { epicId } = epicIdParamsSchema.parse(request.params);
    const note = await getEpicNote(epicId);
    if (!note) {
      return reply.status(404).send({ error: "not_found" });
    }
    return note;
  });

  app.post("/api/epics/:epicId/summarize", async (request) => {
    const { epicId } = epicIdParamsSchema.parse(request.params);
    return complementEpicNotes(epicId, {
      jiraCredentials: resolveJiraCredentials(),
    });
  });
}
