import { readFile } from "node:fs/promises";
import {
  applyTicketSnapshots,
  initDb,
  refreshJiraFromApi,
  resolveJiraCredentials,
  ticketSnapshotsInputSchema,
} from "@questlog/core";

export type RefreshJiraCliOptions = {
  filePath?: string;
};

function readJiraCredentials() {
  const credentials = resolveJiraCredentials();
  if (!credentials) {
    throw new Error(
      "Configure Jira in Settings or set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN",
    );
  }
  return credentials;
}

export async function runRefreshJiraCommand(
  options: RefreshJiraCliOptions = {},
): Promise<void> {
  await initDb();

  if (options.filePath) {
    const raw = await readFile(options.filePath, "utf8");
    const issues = ticketSnapshotsInputSchema.parse(JSON.parse(raw)).issues;
    if (issues.length === 0) {
      console.log("refresh-jira: nothing to apply");
      return;
    }
    const result = await applyTicketSnapshots({ issues });
    console.log(
      `refresh-jira: updated=${result.updated} epicLinked=${result.epicLinked} markedFeita=${result.markedFeita} unmatched=${result.unmatched}`,
    );
    return;
  }

  const result = await refreshJiraFromApi(readJiraCredentials());
  console.log(
    `refresh-jira: fetched=${result.fetched} updated=${result.updated} created=${result.created} removed=${result.removed} epicLinked=${result.epicLinked} markedFeita=${result.markedFeita} unmatched=${result.unmatched} epicTitlesUpdated=${result.epicTitlesUpdated}`,
  );
}
