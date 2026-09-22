import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "./init-db.js";
import { Profile } from "./entities/profile.entity.js";
import { Quest } from "./entities/quest.entity.js";
import { Commit } from "./entities/commit.entity.js";

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

  const tableRows = (await dataSource.query(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('profiles', 'quests', 'commits') ORDER BY name`,
  )) as Array<{ name: string }>;
  assert.deepEqual(
    tableRows.map((row) => row.name),
    ["commits", "profiles", "quests"],
  );

  const profile = Profile.create({
    name: "smoke",
    repos: [{ nome: "demo", path: "/tmp/demo" }],
    ticketPattern: "DEMO-\\d+",
    ticketPrefixLabel: "Ticket",
    ticketBaseUrl: "",
    ticketHasEpic: false,
    branchPattern: null,
    commitHint: null,
    locale: "pt-BR",
    activeQuestId: null,
  });
  await profile.save();

  const quest = Quest.create({
    profileId: profile.id,
    titulo: "Smoke quest",
    status: "ativa",
    ticketIds: ["DEMO-1"],
    epicId: null,
    epicScope: "partial",
    repos: [{ nome: "demo", path: "/tmp/demo", branch: "main" }],
    falta: "",
    atualizadoEm: new Date(),
  });
  await quest.save();

  const commit = Commit.create({
    profileId: profile.id,
    questId: quest.id,
    hash: "abc123",
    repo: "demo",
    quando: new Date(),
    assunto: "feat: smoke",
    resumo: "1 file",
  });
  await commit.save();

  assert.equal(await Profile.count(), 1);
  assert.equal(await Quest.count(), 1);
  assert.equal(await Commit.count(), 1);

  await dataSource.destroy();
  console.log("check:db ok — WAL + schema + Active Record smoke");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
