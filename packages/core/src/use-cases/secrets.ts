import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { getDataDir } from "../paths/get-data-dir.js";

const secretsFileSchema = z.object({
  geminiApiKey: z.string().optional(),
  jiraBaseUrl: z.string().optional(),
  jiraEmail: z.string().optional(),
  jiraApiToken: z.string().optional(),
});

export type LocalSecrets = {
  geminiApiKey: string | null;
  jiraBaseUrl: string | null;
  jiraEmail: string | null;
  jiraApiToken: string | null;
};

export type LocalSecretsPublic = {
  geminiConfigured: boolean;
  jiraConfigured: boolean;
  jiraBaseUrl: string | null;
  jiraEmail: string | null;
};

export type JiraCredentials = {
  baseUrl: string;
  email: string;
  apiToken: string;
};

export function getSecretsPath(): string {
  return join(getDataDir(), "secrets.json");
}

function readSecretsFile(): z.infer<typeof secretsFileSchema> {
  const path = getSecretsPath();
  if (!existsSync(path)) {
    return {};
  }

  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return secretsFileSchema.parse(raw);
  } catch {
    return {};
  }
}

function writeSecretsFile(data: z.infer<typeof secretsFileSchema>): void {
  const path = getSecretsPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function getLocalSecrets(): LocalSecrets {
  const file = readSecretsFile();
  return {
    geminiApiKey: file.geminiApiKey?.trim() || null,
    jiraBaseUrl: file.jiraBaseUrl?.trim() || null,
    jiraEmail: file.jiraEmail?.trim() || null,
    jiraApiToken: file.jiraApiToken?.trim() || null,
  };
}

/** Safe for HTTP — never returns the raw token. */
export function getLocalSecretsPublic(): LocalSecretsPublic {
  const secrets = getLocalSecrets();
  return {
    geminiConfigured: Boolean(secrets.geminiApiKey),
    jiraConfigured: Boolean(
      secrets.jiraBaseUrl && secrets.jiraEmail && secrets.jiraApiToken,
    ),
    jiraBaseUrl: secrets.jiraBaseUrl,
    jiraEmail: secrets.jiraEmail,
  };
}

export function upsertLocalSecrets(input: {
  geminiApiKey?: string | null;
  jiraBaseUrl?: string | null;
  jiraEmail?: string | null;
  jiraApiToken?: string | null;
}): LocalSecretsPublic {
  const file = readSecretsFile();

  if (input.geminiApiKey !== undefined) {
    const trimmed = input.geminiApiKey?.trim() ?? "";
    if (trimmed.length === 0) {
      delete file.geminiApiKey;
    } else {
      file.geminiApiKey = trimmed;
    }
  }

  if (input.jiraBaseUrl !== undefined) {
    const trimmed = input.jiraBaseUrl?.trim() ?? "";
    if (trimmed.length === 0) {
      delete file.jiraBaseUrl;
    } else {
      file.jiraBaseUrl = trimmed;
    }
  }

  if (input.jiraEmail !== undefined) {
    const trimmed = input.jiraEmail?.trim() ?? "";
    if (trimmed.length === 0) {
      delete file.jiraEmail;
    } else {
      file.jiraEmail = trimmed;
    }
  }

  if (input.jiraApiToken !== undefined) {
    const trimmed = input.jiraApiToken?.trim() ?? "";
    if (trimmed.length === 0) {
      delete file.jiraApiToken;
    } else {
      file.jiraApiToken = trimmed;
    }
  }

  writeSecretsFile(file);
  return getLocalSecretsPublic();
}

export function resolveJiraCredentials(): JiraCredentials | null {
  const secrets = getLocalSecrets();
  const baseUrl =
    secrets.jiraBaseUrl || process.env.JIRA_BASE_URL?.trim() || "";
  const email = secrets.jiraEmail || process.env.JIRA_EMAIL?.trim() || "";
  const apiToken =
    secrets.jiraApiToken || process.env.JIRA_API_TOKEN?.trim() || "";
  if (!baseUrl || !email || !apiToken) {
    return null;
  }
  return { baseUrl, email, apiToken };
}

/** Persist env Jira into the data dir so the desktop app sees it without the repo `.env`. */
export function hydrateJiraSecretsFromEnv(): void {
  if (getLocalSecretsPublic().jiraConfigured) {
    return;
  }
  const baseUrl = process.env.JIRA_BASE_URL?.trim();
  const email = process.env.JIRA_EMAIL?.trim();
  const apiToken = process.env.JIRA_API_TOKEN?.trim();
  if (!baseUrl || !email || !apiToken) {
    return;
  }
  upsertLocalSecrets({
    jiraBaseUrl: baseUrl,
    jiraEmail: email,
    jiraApiToken: apiToken,
  });
}
