import type { FastifyInstance } from "fastify";
import {
  applyTicketSnapshots,
  fetchJiraTicketSnapshots,
  listLinkedEpicKeys,
  listLinkedTicketKeys,
  ticketSnapshotsInputSchema,
  upsertEpicTitles,
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

    let issues;
    if (hasBodyIssues) {
      issues = ticketSnapshotsInputSchema.parse(body).issues;
    } else {
      const keys = await listLinkedTicketKeys();
      if (keys.length === 0) {
        return {
          updated: 0,
          markedFeita: 0,
          unmatched: 0,
          fetched: 0,
          epicTitlesUpdated: 0,
        };
      }
      const credentials = readJiraCredentialsFromEnv();
      issues = await fetchJiraTicketSnapshots(credentials, keys);
    }

    if (issues.length === 0) {
      return {
        updated: 0,
        markedFeita: 0,
        unmatched: 0,
        fetched: 0,
        epicTitlesUpdated: 0,
      };
    }

    const result = await applyTicketSnapshots({ issues });

    let epicTitlesUpdated = 0;
    if (!hasBodyIssues) {
      const credentials = readJiraCredentialsFromEnv();
      const epicKeys = await listLinkedEpicKeys();
      if (epicKeys.length > 0) {
        const epicIssues = await fetchJiraTicketSnapshots(
          credentials,
          epicKeys,
        );
        epicTitlesUpdated = await upsertEpicTitles(
          epicIssues.map((issue) => ({
            epicId: issue.key,
            title: issue.summary,
          })),
        );
      }
    }

    return { ...result, fetched: issues.length, epicTitlesUpdated };
  });
}
