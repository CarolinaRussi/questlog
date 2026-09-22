import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "../db/init-db.js";
import { getProfile } from "./profile.js";
import { seedProfile } from "./seed.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-seed-"));
const databasePath = join(tempDir, "questlog.db");

try {
  const dataSource = await initDb({ databasePath });

  const profile = await seedProfile({
    name: "minimal",
    repos: [{ nome: "my-app", path: "~/projetos/my-app" }],
    ticketPattern: "[A-Z]+-\\d+",
    ticketHasEpic: false,
  });
  assert.equal(profile.name, "minimal");

  const fetched = await getProfile();
  assert.equal(fetched?.id, profile.id);

  await dataSource.destroy();
  console.log("check:seed ok");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
