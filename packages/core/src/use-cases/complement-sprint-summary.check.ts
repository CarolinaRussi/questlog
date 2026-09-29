import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "../db/init-db.js";
import { upsertProfile } from "./profile.js";
import { completeQuest, createQuest } from "./quest.js";
import {
  complementSprintSummary,
  formatQuestsAsSprintList,
} from "./complement-sprint-summary.js";
import { listPendingQuestsForCurrentSprint } from "./sprint-summary.js";
import { upsertCurrentSprintWindow } from "./sprint-window.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-complement-sprint-"));
const databasePath = join(tempDir, "questlog.db");

let dataSource: Awaited<ReturnType<typeof initDb>> | undefined;

try {
  dataSource = await initDb({ databasePath });

  await upsertProfile({
    repos: [{ nome: "demo", path: "/tmp/demo" }],
    ticketPattern: "DEMO-\\d+",
  });

  await upsertCurrentSprintWindow({
    rotulo: "Sprint A",
    inicio: "2026-09-01",
    fim: "2026-09-30",
  });

  const quest = await createQuest({
    titulo: "Entregar API",
    ticketIds: ["DEMO-10"],
    epicId: "DEMO-100",
  });
  const done = await completeQuest(quest.id);
  done.concluidaEm = new Date("2026-09-12T10:00:00.000Z");
  await done.save();

  assert.match(formatQuestsAsSprintList([done]), /DEMO-10/);

  const first = await complementSprintSummary({
    generate: async () => "Fechei a API do demo.",
  });
  assert.equal(first.addedQuestCount, 1);
  assert.equal(first.usedGemini, true);
  assert.match(first.resumo, /API/);
  assert.equal((await listPendingQuestsForCurrentSprint()).length, 0);

  const questTwo = await createQuest({
    titulo: "Ajuste de UI",
    ticketIds: ["DEMO-11"],
  });
  const doneTwo = await completeQuest(questTwo.id);
  doneTwo.concluidaEm = new Date("2026-09-18T10:00:00.000Z");
  await doneTwo.save();

  const second = await complementSprintSummary({
    generate: async (prompt) => {
      assert.match(prompt, /Fechei a API/);
      assert.match(prompt, /Ajuste de UI/);
      return "Fechei a API do demo. Depois poli a UI.";
    },
  });
  assert.equal(second.addedQuestCount, 1);
  assert.match(second.resumo, /UI/);

  const noop = await complementSprintSummary({
    generate: async () => "não deveria chamar",
  });
  assert.equal(noop.addedQuestCount, 0);

  console.log("check:complement-sprint-summary ok");
} finally {
  await dataSource?.destroy().catch(() => undefined);
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Windows WAL lock
  }
}
