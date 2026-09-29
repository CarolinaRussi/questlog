import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "../db/init-db.js";
import { upsertProfile } from "./profile.js";
import { completeQuest, createQuest } from "./quest.js";
import {
  appendIncludedQuestsToCurrentSprint,
  isConcluidaEmInWindow,
  listCompletedQuestsInWindow,
  listPendingQuestsForClosedSprint,
  listPendingQuestsForCurrentSprint,
  sprintWindowUtcBounds,
} from "./sprint-summary.js";
import {
  archiveCurrentSprintWindow,
  upsertCurrentSprintWindow,
} from "./sprint-window.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-sprint-summary-"));
const databasePath = join(tempDir, "questlog.db");

let dataSource: Awaited<ReturnType<typeof initDb>> | undefined;

try {
  dataSource = await initDb({ databasePath });

  await upsertProfile({
    repos: [{ nome: "demo", path: "/tmp/demo" }],
    ticketPattern: "DEMO-\\d+",
  });

  await upsertCurrentSprintWindow({
    inicio: "2026-09-01",
    fim: "2026-09-30",
  });

  const inWindow = await createQuest({
    titulo: "Dentro",
    ticketIds: ["DEMO-1"],
  });
  const outWindow = await createQuest({
    titulo: "Fora",
    ticketIds: ["DEMO-2"],
  });

  const doneInWindow = await completeQuest(inWindow.id);
  doneInWindow.concluidaEm = new Date("2026-09-10T15:00:00.000Z");
  await doneInWindow.save();

  const doneOutWindow = await completeQuest(outWindow.id);
  doneOutWindow.concluidaEm = new Date("2026-08-20T15:00:00.000Z");
  await doneOutWindow.save();

  const profile = await upsertProfile({
    repos: [{ nome: "demo", path: "/tmp/demo" }],
    ticketPattern: "DEMO-\\d+",
  });
  const bounds = sprintWindowUtcBounds(
    profile.sprintInicio!,
    profile.sprintFim!,
  );
  assert.equal(
    isConcluidaEmInWindow(
      new Date("2026-09-10T15:00:00.000Z"),
      profile.sprintInicio!,
      profile.sprintFim!,
    ),
    true,
  );
  assert.equal(
    isConcluidaEmInWindow(
      new Date("2026-08-20T15:00:00.000Z"),
      profile.sprintInicio!,
      profile.sprintFim!,
    ),
    false,
  );
  assert.ok(bounds.start < bounds.end);

  const completed = await listCompletedQuestsInWindow(
    profile.sprintInicio!,
    profile.sprintFim!,
  );
  assert.equal(completed.length, 1);
  assert.equal(completed[0]?.id, doneInWindow.id);

  let pending = await listPendingQuestsForCurrentSprint();
  assert.equal(pending.length, 1);

  await appendIncludedQuestsToCurrentSprint([doneInWindow.id]);
  pending = await listPendingQuestsForCurrentSprint();
  assert.equal(pending.length, 0);

  const archived = await archiveCurrentSprintWindow();
  assert.deepEqual(archived.includedQuestIds, [doneInWindow.id]);

  const pendingClosed = await listPendingQuestsForClosedSprint(archived.id);
  assert.equal(pendingClosed.length, 0);

  console.log("check:sprint-summary ok — window filter + pending + included");
} finally {
  await dataSource?.destroy().catch(() => undefined);
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ponytail: Windows may keep the WAL handle briefly after destroy
  }
}
