import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "../db/init-db.js";
import { Quest } from "../db/entities/quest.entity.js";
import { getProfile, upsertProfile } from "./profile.js";
import { createQuest, pauseQuest } from "./quest.js";
import {
  isAccompaniedQuest,
  isImportFaltaStub,
  listAccompaniedQuests,
  pickNextFaltaForEpic,
  promoteQuest,
} from "./accompanied.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-accompanied-"));
const databasePath = join(tempDir, "questlog.db");

try {
  assert.equal(isImportFaltaStub("Status no Jira: To Do"), true);
  assert.equal(isImportFaltaStub("terminar login"), false);

  const dataSource = await initDb({ databasePath });
  await upsertProfile({
    repos: [{ nome: "demo", path: "/tmp/demo" }],
    ticketPattern: "DEMO-\\d+",
    ticketHasEpic: true,
  });
  const profile = await getProfile();
  assert.ok(profile);

  const stub = Quest.create({
    profileId: profile.id,
    titulo: "Stub",
    status: "pausada",
    ticketIds: ["DEMO-9"],
    epicId: "DEMO-100",
    epicScope: "partial",
    repos: [],
    falta: "Status no Jira: To Do",
    faltaSource: "import",
    watching: false,
    atualizadoEm: new Date(),
  });
  await stub.save();
  assert.equal(isAccompaniedQuest(stub), false);

  const active = await createQuest({
    titulo: "Ativa",
    ticketIds: ["DEMO-1"],
    epicId: "DEMO-100",
    setActive: true,
  });
  assert.equal(active.watching, true);

  const paused = await createQuest({
    titulo: "Pausei",
    ticketIds: ["DEMO-2"],
    epicId: "DEMO-100",
  });
  await pauseQuest(paused.id, { falta: "terminar o endpoint" });

  const accompanied = await listAccompaniedQuests();
  assert.ok(accompanied.some((quest) => quest.id === active.id));
  assert.ok(accompanied.some((quest) => quest.id === paused.id));
  assert.ok(!accompanied.some((quest) => quest.id === stub.id));

  const next = pickNextFaltaForEpic(accompanied, active.id);
  assert.equal(next?.questId, active.id);

  const promoted = await promoteQuest(stub.id, { mode: "watch" });
  assert.equal(promoted.watching, true);

  const done = Quest.create({
    profileId: profile.id,
    titulo: "Done",
    status: "feita",
    ticketIds: ["DEMO-8"],
    epicId: "DEMO-200",
    epicScope: "partial",
    repos: [],
    falta: "",
    faltaSource: null,
    watching: false,
    atualizadoEm: new Date(),
  });
  await done.save();
  const reopened = await promoteQuest(done.id, { mode: "watch" });
  assert.equal(reopened.status, "pausada");
  assert.equal(reopened.watching, true);
  const accompaniedAfter = await listAccompaniedQuests();
  assert.ok(accompaniedAfter.some((quest) => quest.id === reopened.id));

  await dataSource.destroy();
  console.log("check:accompanied ok");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
