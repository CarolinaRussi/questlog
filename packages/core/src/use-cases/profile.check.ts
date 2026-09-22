import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "../db/init-db.js";
import { getProfile, upsertProfile } from "./profile.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-profile-"));
const databasePath = join(tempDir, "questlog.db");

try {
  const dataSource = await initDb({ databasePath });

  assert.equal(await getProfile(), null);

  const created = await upsertProfile({
    name: "gran",
    repos: [{ nome: "es-api", path: "/tmp/es-api" }],
    ticketPattern: "HESEC-\\d+",
    ticketPrefixLabel: "Jira",
    ticketBaseUrl: "https://example.test/browse/",
    ticketHasEpic: true,
    branchPattern: "HESEC-\\d+",
    commitHint: "use #HESEC-XXXX",
    locale: "pt-BR",
  });
  assert.equal(created.name, "gran");
  assert.equal(created.ticketHasEpic, true);

  const fetched = await getProfile();
  assert.ok(fetched);
  assert.equal(fetched.id, created.id);

  const updated = await upsertProfile({
    repos: [
      { nome: "es-api", path: "/tmp/es-api" },
      { nome: "es-campus", path: "/tmp/es-campus" },
    ],
    ticketPattern: "HESEC-\\d+",
    ticketHasEpic: false,
  });
  assert.equal(updated.id, created.id);
  assert.equal(updated.repos.length, 2);
  assert.equal(updated.ticketHasEpic, false);
  assert.equal(updated.name, "gran");

  let rejected = false;
  try {
    await upsertProfile({
      repos: [],
      ticketPattern: "[",
    });
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true);

  await dataSource.destroy();
  console.log("check:profile ok — get + upsert");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
