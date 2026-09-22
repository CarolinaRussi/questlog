import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "./init-db.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-db-"));
const databasePath = join(tempDir, "questlog.db");

try {
  const dataSource = await initDb({ databasePath });

  const journalRows = (await dataSource.query(
    "PRAGMA journal_mode",
  )) as Array<{ journal_mode: string }>;
  const journalMode = journalRows[0]?.journal_mode?.toLowerCase();
  assert.equal(journalMode, "wal", `expected WAL, got ${journalMode}`);

  const metaRows = (await dataSource.query(
    `SELECT value FROM questlog_meta WHERE key = ?`,
    ["schema_bootstrap"],
  )) as Array<{ value: string }>;
  assert.equal(metaRows[0]?.value, "1");

  await dataSource.destroy();
  console.log("check:db ok — WAL + bootstrap migration");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
