import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  complementEpicNotes,
  getEpicNote,
  listEpicNotes,
} from "@questlog/core";

const epicIdParamsSchema = z.object({
  epicId: z.string().trim().min(1),
});

function readJiraCredentialsFromEnv(): {
  baseUrl: string;
  email: string;
  apiToken: string;
} | null {
  const baseUrl = process.env.JIRA_BASE_URL?.trim();
  const email = process.env.JIRA_EMAIL?.trim();
  const apiToken = process.env.JIRA_API_TOKEN?.trim();
  if (!baseUrl || !email || !apiToken) {
    return null;
  }
  return { baseUrl, email, apiToken };
}

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
      jiraCredentials: readJiraCredentialsFromEnv(),
    });
  });
}
