import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getLocalSecrets,
  getLocalSecretsPublic,
  hydrateJiraSecretsFromEnv,
  resolveJiraCredentials,
  upsertLocalSecrets,
} from "./secrets.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-secrets-"));
process.env.QUESTLOG_DATA_DIR = tempDir;

try {
  assert.equal(getLocalSecretsPublic().geminiConfigured, false);
  assert.equal(getLocalSecrets().geminiApiKey, null);

  upsertLocalSecrets({ geminiApiKey: "  test-key-123  " });
  assert.equal(getLocalSecrets().geminiApiKey, "test-key-123");
  assert.equal(getLocalSecretsPublic().geminiConfigured, true);

  upsertLocalSecrets({ geminiApiKey: "" });
  assert.equal(getLocalSecretsPublic().geminiConfigured, false);

  assert.equal(getLocalSecretsPublic().jiraConfigured, false);
  process.env.JIRA_BASE_URL = "https://example.atlassian.net";
  process.env.JIRA_EMAIL = "dev@example.com";
  process.env.JIRA_API_TOKEN = "demo-token";
  hydrateJiraSecretsFromEnv();
  assert.equal(getLocalSecretsPublic().jiraConfigured, true);
  assert.equal(resolveJiraCredentials()?.email, "dev@example.com");

  console.log("check:secrets ok");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.QUESTLOG_DATA_DIR;
  delete process.env.JIRA_BASE_URL;
  delete process.env.JIRA_EMAIL;
  delete process.env.JIRA_API_TOKEN;
}
