import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getLocalSecrets,
  getLocalSecretsPublic,
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

  console.log("check:secrets ok");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.QUESTLOG_DATA_DIR;
}
