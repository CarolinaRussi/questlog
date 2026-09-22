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

type AdfNode = {
  type?: string;
  text?: string;
  content?: AdfNode[];
};

/** Flatten Atlassian Document Format (or plain string) to readable text. */
export function jiraDocToPlain(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object") return "";

  const parts: string[] = [];

  function walk(node: AdfNode): void {
    if (node.type === "text" && node.text) {
      parts.push(node.text);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
      if (
        node.type === "paragraph" ||
        node.type === "heading" ||
        node.type === "bulletList" ||
        node.type === "orderedList" ||
        node.type === "listItem"
      ) {
        parts.push("\n");
      }
    }
  }

  walk(value as AdfNode);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

export type JiraIssueContext = {
  key: string;
  summary: string;
  status: string;
  description: string;
  /** Recent comment bodies (newest first), truncated. */
  comments: string[];
};

type JiraIssueResponse = {
  key?: string;
  fields?: {
    summary?: string;
    status?: { name?: string };
    description?: unknown;
    comment?: {
      comments?: Array<{ body?: unknown }>;
    };
  };
  errorMessages?: string[];
  message?: string;
};

/**
 * Fetch description + recent comments for one issue (on-demand for AI).
 * Does not persist into QuestLog — caller decides what to keep (notes only).
 */
export async function fetchJiraIssueContext(
  credentials: JiraRestCredentials,
  issueKey: string,
): Promise<JiraIssueContext> {
  const baseUrl = credentials.baseUrl.replace(/\/+$/, "");
  const auth = Buffer.from(
    `${credentials.email}:${credentials.apiToken}`,
    "utf8",
  ).toString("base64");
  const key = issueKey.trim();

  const response = await fetch(
    `${baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,status,description,comment`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | JiraIssueResponse
    | null;

  if (!response.ok) {
    const detail =
      payload?.errorMessages?.join("; ") ||
      payload?.message ||
      `HTTP ${response.status}`;
    throw new Error(`Jira issue ${key} failed: ${detail}`);
  }

  const comments = (payload?.fields?.comment?.comments ?? [])
    .map((comment) => jiraDocToPlain(comment.body))
    .filter(Boolean)
    .reverse()
    .slice(0, 5);

  return {
    key: payload?.key ?? key,
    summary: payload?.fields?.summary?.trim() ?? "",
    status: payload?.fields?.status?.name?.trim() ?? "",
    description: jiraDocToPlain(payload?.fields?.description),
    comments,
  };
}

export async function fetchJiraIssueContexts(
  credentials: JiraRestCredentials,
  keys: string[],
): Promise<JiraIssueContext[]> {
  const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  const contexts: JiraIssueContext[] = [];
  for (const key of uniqueKeys) {
    contexts.push(await fetchJiraIssueContext(credentials, key));
  }
  return contexts;
}
