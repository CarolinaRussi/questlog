import type { FastifyInstance } from "fastify";
import {
  applyTicketSnapshots,
  refreshJiraFromApi,
  ticketSnapshotsInputSchema,
} from "@questlog/core";
import { tryReadJiraCredentials } from "../lib/epic-titles.js";

export class JiraCredentialsMissingError extends Error {
  constructor() {
    super(
      "Jira credentials missing. Configure Jira in Settings or set JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN.",
    );
    this.name = "JiraCredentialsMissingError";
  }
}

function readJiraCredentialsFromEnv(): {
  baseUrl: string;
  email: string;
  apiToken: string;
} {
  const credentials = tryReadJiraCredentials();
  if (!credentials) {
    throw new JiraCredentialsMissingError();
  }
  return credentials;
}

export async function registerTicketRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post("/api/tickets/refresh", async (request) => {
    const body = request.body;
    const hasBodyIssues =
      body !== null &&
      typeof body === "object" &&
      "issues" in body &&
      Array.isArray((body as { issues?: unknown }).issues) &&
      (body as { issues: unknown[] }).issues.length > 0;

    if (hasBodyIssues) {
      const issues = ticketSnapshotsInputSchema.parse(body).issues;
      const result = await applyTicketSnapshots({ issues });
      return {
        ...result,
        fetched: issues.length,
        created: 0,
        epicTitlesUpdated: 0,
      };
    }

    return refreshJiraFromApi(readJiraCredentialsFromEnv());
  });
}
