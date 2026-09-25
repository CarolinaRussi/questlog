import { refreshJiraFromApi, resolveJiraCredentials } from "@questlog/core";
import type { FastifyBaseLogger } from "fastify";

/** Same live refresh as the board button. Fail-open; never blocks listen. */
export function startJiraStartupSync(log: FastifyBaseLogger): void {
  void runJiraStartupSync(log);
}

async function runJiraStartupSync(log: FastifyBaseLogger): Promise<void> {
  const credentials = resolveJiraCredentials();
  if (!credentials) {
    log.info("Jira startup sync skipped (no credentials)");
    return;
  }

  try {
    const result = await refreshJiraFromApi(credentials);
    log.info(
      {
        fetched: result.fetched,
        created: result.created,
        removed: result.removed,
        updated: result.updated,
      },
      "Jira startup sync done",
    );
  } catch (error) {
    log.warn({ err: error }, "Jira startup sync failed");
  }
}
