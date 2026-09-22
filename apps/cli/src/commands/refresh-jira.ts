import { readFile } from "node:fs/promises";
import {
  applyTicketSnapshots,
  fetchJiraTicketSnapshots,
  initDb,
  listLinkedTicketKeys,
  ticketSnapshotsInputSchema,
} from "@questlog/core";

export type RefreshJiraCliOptions = {
  filePath?: string;
};

function readJiraCredentialsFromEnv(): {
  baseUrl: string;
  email: string;
  apiToken: string;
} {
  const baseUrl = process.env.JIRA_BASE_URL?.trim();
  const email = process.env.JIRA_EMAIL?.trim();
  const apiToken = process.env.JIRA_API_TOKEN?.trim();

  if (!baseUrl || !email || !apiToken) {
    throw new Error(
      "Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN (see .env.example / README)",
    );
  }

  return { baseUrl, email, apiToken };
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

    const credentials = readJiraCredentialsFromEnv();
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
