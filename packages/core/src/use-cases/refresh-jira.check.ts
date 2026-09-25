import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "../db/init-db.js";
import { upsertProfile } from "./profile.js";
import { createQuest, listQuests } from "./quest.js";
import {
  importEpicChildren,
  keysNotInAssigned,
  removeQuestsNotAssignedToMe,
  unknownTicketKeys,
} from "./refresh-jira.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-refresh-jira-"));
const databasePath = join(tempDir, "questlog.db");

try {
  const dataSource = await initDb({ databasePath });

  await upsertProfile({
    repos: [{ nome: "demo", path: "/tmp/demo" }],
    ticketPattern: "DEMO-\\d+",
  });

  await createQuest({
    titulo: "Já no quadro",
    ticketIds: ["DEMO-1"],
    epicId: "DEMO-100",
  });

  const created = await importEpicChildren([
    {
      key: "DEMO-1",
      summary: "Já existia",
      status: "In Progress",
      epicId: "DEMO-100",
    },
    {
      key: "DEMO-3",
      summary: "Tarefa nova",
      status: "In Progress",
      epicId: "DEMO-100",
    },
    {
      key: "DEMO-4",
      summary: "Backlog",
      status: "To Do",
      epicId: "DEMO-100",
    },
  ]);

  assert.equal(created, 2);

  const quests = await listQuests();
  const byTicket = new Map(
    quests.flatMap((quest) =>
      quest.ticketIds.map((ticketId) => [ticketId.toUpperCase(), quest]),
    ),
  );

  const inProgress = byTicket.get("DEMO-3");
  assert.ok(inProgress);
  assert.equal(inProgress.status, "ativa");
  assert.equal(inProgress.epicId, "DEMO-100");
  assert.equal(inProgress.titulo, "[DEMO-3] Tarefa nova");

  const backlog = byTicket.get("DEMO-4");
  assert.ok(backlog);
  assert.equal(backlog.status, "pausada");
  assert.equal(backlog.epicId, "DEMO-100");

  const scheduledImport = await importEpicChildren([
    {
      key: "DEMO-11",
      summary: "Vai pra prod",
      status: "Scheduled",
      epicId: "DEMO-100",
      statusReason: "Irá para produção no dia 28/09",
    },
  ]);
  assert.equal(scheduledImport, 1);
  const scheduledQuest = (await listQuests()).find((quest) =>
    quest.ticketIds.includes("DEMO-11"),
  );
  assert.equal(scheduledQuest?.status, "pausada");
  assert.equal(scheduledQuest?.falta, "Irá para produção no dia 28/09");
  assert.equal(scheduledQuest?.faltaSource, "import");

  assert.equal(byTicket.get("DEMO-1")?.titulo, "Já no quadro");

  const skippedAgain = await importEpicChildren([
    {
      key: "DEMO-3",
      summary: "Tarefa nova",
      status: "In Progress",
      epicId: "DEMO-100",
    },
  ]);
  assert.equal(skippedAgain, 0);

  const createdAssigned = await importEpicChildren([
    {
      key: "DEMO-9",
      summary: "Épico novo, atribuída a mim",
      status: "In Progress",
      epicId: "DEMO-200",
    },
  ]);
  assert.equal(createdAssigned, 1);
  const assignedQuest = (await listQuests()).find((quest) =>
    quest.ticketIds.includes("DEMO-9"),
  );
  assert.ok(assignedQuest);
  assert.equal(assignedQuest.status, "ativa");
  assert.equal(assignedQuest.epicId, "DEMO-200");

  const importedTeammate = await importEpicChildren([
    {
      key: "DEMO-8",
      summary: "De outra pessoa",
      status: "To Do",
      epicId: "DEMO-200",
    },
    {
      key: "DEMO-7",
      summary: "Feita de outra pessoa",
      status: "Done",
      epicId: "DEMO-5",
    },
  ]);
  assert.equal(importedTeammate, 2);
  const archiveTeammate = (await listQuests()).find((quest) =>
    quest.ticketIds.includes("DEMO-7"),
  );
  assert.equal(archiveTeammate?.status, "feita");

  const removed = await removeQuestsNotAssignedToMe(["DEMO-8", "DEMO-7"]);
  assert.equal(removed, 2);
  const afterPrune = await listQuests();
  assert.equal(
    afterPrune.some((quest) => quest.ticketIds.includes("DEMO-8")),
    false,
  );
  assert.equal(
    afterPrune.some((quest) => quest.ticketIds.includes("DEMO-7")),
    false,
  );
  assert.ok(afterPrune.some((quest) => quest.ticketIds.includes("DEMO-9")));

  assert.deepEqual(
    keysNotInAssigned(["DEMO-9", "DEMO-6667", "demo-8"], ["DEMO-9"]),
    ["DEMO-6667", "DEMO-8"],
  );
  assert.deepEqual(unknownTicketKeys(["DEMO-9", "DEMO-6821"], ["DEMO-9"]), [
    "DEMO-6821",
  ]);
  assert.deepEqual(unknownTicketKeys(["demo-9"], ["DEMO-9"]), []);

  await dataSource.destroy();
  console.log(
    "check:refresh-jira ok — assigned import + teammate prune, existing skipped",
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
