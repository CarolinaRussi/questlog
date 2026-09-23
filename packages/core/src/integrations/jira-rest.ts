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
    parent?: { key?: string };
  };
};

type JiraSearchResponse = {
  issues?: JiraSearchIssue[];
  nextPageToken?: string;
  isLast?: boolean;
  errorMessages?: string[];
  message?: string;
};

/**
 * Fetch title + status (+ parent epic when present) for ticket keys via Jira Cloud REST.
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

  const snapshots: TicketSnapshot[] = [];
  for (let offset = 0; offset < uniqueKeys.length; offset += CHUNK_SIZE) {
    const chunk = uniqueKeys.slice(offset, offset + CHUNK_SIZE);
    snapshots.push(
      ...(await searchJiraIssues(credentials, `key in (${chunk.join(",")})`)),
    );
  }
  return snapshots;
}

function jiraAuthHeader(credentials: JiraRestCredentials): string {
  return `Basic ${Buffer.from(
    `${credentials.email}:${credentials.apiToken}`,
    "utf8",
  ).toString("base64")}`;
}

async function searchJiraIssues(
  credentials: JiraRestCredentials,
  jql: string,
): Promise<TicketSnapshot[]> {
  const baseUrl = credentials.baseUrl.replace(/\/+$/, "");
  const snapshots: TicketSnapshot[] = [];
  let nextPageToken: string | undefined;

  do {
    const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: jiraAuthHeader(credentials),
      },
      body: JSON.stringify({
        jql,
        fields: ["summary", "status", "parent"],
        maxResults: CHUNK_SIZE,
        ...(nextPageToken ? { nextPageToken } : {}),
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
      const parentKey = issue.fields?.parent?.key?.trim();
      snapshots.push({
        key,
        summary,
        status,
        epicId: parentKey || null,
      });
    }

    nextPageToken =
      payload?.isLast === false ? payload.nextPageToken : undefined;
  } while (nextPageToken);

  return snapshots;
}

/**
 * Open issues assigned to the Jira account behind the token (`currentUser()`).
 * Skips Done-category and Epics — those are not “new tasks I started”.
 */
export async function fetchJiraIssuesAssignedToMe(
  credentials: JiraRestCredentials,
): Promise<TicketSnapshot[]> {
  return searchJiraIssues(
    credentials,
    "assignee = currentUser() AND statusCategory != Done AND issuetype != Epic",
  );
}

/** Which of these keys are assigned to the token account (any status, incl. Done). */
export async function fetchJiraIssueKeysAssignedToMe(
  credentials: JiraRestCredentials,
  keys: string[],
): Promise<string[]> {
  const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  if (uniqueKeys.length === 0) {
    return [];
  }

  const mine: string[] = [];
  for (let offset = 0; offset < uniqueKeys.length; offset += CHUNK_SIZE) {
    const chunk = uniqueKeys.slice(offset, offset + CHUNK_SIZE);
    const found = await searchJiraIssues(
      credentials,
      `key in (${chunk.join(",")}) AND assignee = currentUser()`,
    );
    for (const issue of found) {
      mine.push(issue.key);
    }
  }
  return mine;
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
