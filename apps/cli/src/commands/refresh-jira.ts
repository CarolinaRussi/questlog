import { readFile } from "node:fs/promises";
import {
  applyTicketSnapshots,
  fetchJiraTicketSnapshots,
  initDb,
  listLinkedTicketKeys,
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

  let issues: unknown;

  if (options.filePath) {
    const raw = await readFile(options.filePath, "utf8");
    issues = ticketSnapshotsInputSchema.parse(JSON.parse(raw)).issues;
  } else {
    const keys = await listLinkedTicketKeys();
    if (keys.length === 0) {
      console.log("refresh-jira: no ticket keys on quests");
      return;
    }

    const credentials = readJiraCredentials();
    const fetched = await fetchJiraTicketSnapshots(credentials, keys);
    console.log(`refresh-jira: fetched ${fetched.length} issues from Jira`);
    issues = fetched;
  }

  if (!Array.isArray(issues) || issues.length === 0) {
    console.log("refresh-jira: nothing to apply");
    return;
  }

  const result = await applyTicketSnapshots({ issues });
  console.log(
    `refresh-jira: updated=${result.updated} epicLinked=${result.epicLinked} markedFeita=${result.markedFeita} unmatched=${result.unmatched}`,
  );
}
