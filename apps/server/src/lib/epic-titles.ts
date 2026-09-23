import {
  ensureEpicTitles,
  fetchJiraIssueContext,
  fetchJiraTicketSnapshots,
  resolveEpicTitles,
  resolveJiraCredentials,
} from "@questlog/core";

export function tryReadJiraCredentials() {
  return resolveJiraCredentials();
}

/**
 * Prefer stored / quest-derived titles; fill gaps from Jira **summary** (title).
 * Never uses description / Gemini overview.
 * Fail-open: if Jira is down, return whatever we already have.
 */
export async function epicTitlesForBoard(
  epicIds: string[],
): Promise<Record<string, string>> {
  if (epicIds.length === 0) {
    return {};
  }

  const credentials = tryReadJiraCredentials();
  if (!credentials) {
    return resolveEpicTitles(epicIds);
  }

  try {
    return await ensureEpicTitles(epicIds, async (keys) => {
      const snapshots = await fetchJiraTicketSnapshots(credentials, keys);
      const found = new Map(
        snapshots.map((issue) => [
          issue.key.trim().toUpperCase(),
          { key: issue.key, summary: issue.summary },
        ]),
      );

      for (const key of keys) {
        const normalized = key.trim().toUpperCase();
        if (found.has(normalized)) continue;
        try {
          const issue = await fetchJiraIssueContext(credentials, key);
          if (issue.summary.trim()) {
            found.set(normalized, {
              key: issue.key,
              summary: issue.summary,
            });
          }
        } catch {
          // skip keys the account cannot read
        }
      }

      return [...found.values()];
    });
  } catch {
    return resolveEpicTitles(epicIds);
  }
}
