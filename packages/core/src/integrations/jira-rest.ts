import type { TicketSnapshot } from "../use-cases/ticket-snapshot.schemas.js";

export type JiraRestCredentials = {
  baseUrl: string;
  email: string;
  apiToken: string;
};

const CHUNK_SIZE = 50;

type JiraSearchIssue = {
  key?: string;
  fields?: {
    summary?: string;
    status?: { name?: string };
  };
};

type JiraSearchResponse = {
  issues?: JiraSearchIssue[];
  errorMessages?: string[];
  message?: string;
};

/**
 * Fetch title + status for ticket keys via Jira Cloud REST.
 * Credentials are passed in (callers read env); never stored by core.
 */
export async function fetchJiraTicketSnapshots(
  credentials: JiraRestCredentials,
  keys: string[],
): Promise<TicketSnapshot[]> {
  const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  if (uniqueKeys.length === 0) {
    return [];
  }

  const baseUrl = credentials.baseUrl.replace(/\/+$/, "");
  const auth = Buffer.from(
    `${credentials.email}:${credentials.apiToken}`,
    "utf8",
  ).toString("base64");

  const snapshots: TicketSnapshot[] = [];

  for (let offset = 0; offset < uniqueKeys.length; offset += CHUNK_SIZE) {
    const chunk = uniqueKeys.slice(offset, offset + CHUNK_SIZE);
    const jql = `key in (${chunk.join(",")})`;
    const response = await fetch(`${baseUrl}/rest/api/3/search`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        jql,
        fields: ["summary", "status"],
        maxResults: CHUNK_SIZE,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | JiraSearchResponse
      | null;

    if (!response.ok) {
      const detail =
        payload?.errorMessages?.join("; ") ||
        payload?.message ||
        `HTTP ${response.status}`;
      throw new Error(`Jira search failed: ${detail}`);
    }

    for (const issue of payload?.issues ?? []) {
      const key = issue.key?.trim();
      const summary = issue.fields?.summary?.trim();
      const status = issue.fields?.status?.name?.trim();
      if (!key || !summary || !status) {
        continue;
      }
      snapshots.push({ key, summary, status });
    }
  }

  return snapshots;
}
