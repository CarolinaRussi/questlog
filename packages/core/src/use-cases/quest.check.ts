import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "../db/init-db.js";
import { upsertProfile } from "./profile.js";
import {
  completeQuest,
  createQuest,
  getQuest,
  listQuests,
  pauseQuest,
  resumeQuest,
  setActiveQuest,
  updateQuest,
} from "./quest.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-quest-"));
const databasePath = join(tempDir, "questlog.db");

try {
  const dataSource = await initDb({ databasePath });

  await upsertProfile({
    repos: [{ nome: "demo", path: "/tmp/demo" }],
    ticketPattern: "DEMO-\\d+",
  });

  const quest = await createQuest({
    titulo: "Primeira quest",
    ticketIds: ["DEMO-1"],
    setActive: true,
  });
  assert.equal(quest.status, "ativa");

  const listed = await listQuests({ status: "ativa" });
  assert.equal(listed.length, 1);

  await updateQuest(quest.id, { titulo: "Quest atualizada" });
  const updated = await getQuest(quest.id);
  assert.equal(updated?.titulo, "Quest atualizada");

  let pauseRejected = false;
  try {
    await pauseQuest(quest.id, { falta: "   " });
  } catch {
    pauseRejected = true;
  }
  assert.equal(pauseRejected, true);

  const paused = await pauseQuest(quest.id, {
    falta: "terminar o endpoint de login",
  });
  assert.equal(paused.status, "pausada");
  assert.equal(paused.falta, "terminar o endpoint de login");

  const resumed = await resumeQuest(quest.id);
  assert.equal(resumed.status, "ativa");

  await setActiveQuest(quest.id);
  const completed = await completeQuest(quest.id);
  assert.equal(completed.status, "feita");

  await dataSource.destroy();
  console.log("check:quest ok — crud + pause/resume/complete");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
