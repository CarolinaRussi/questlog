import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "../db/init-db.js";
import { upsertProfile } from "./profile.js";
import { createQuest, getQuest, pauseQuest } from "./quest.js";
import {
  applyTicketSnapshots,
  listLinkedTicketKeys,
} from "./ticket-snapshot.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-ticket-snap-"));
const databasePath = join(tempDir, "questlog.db");

try {
  const dataSource = await initDb({ databasePath });

  await upsertProfile({
    repos: [{ nome: "demo", path: "/tmp/demo" }],
    ticketPattern: "DEMO-\\d+",
  });

  const openQuest = await createQuest({
    titulo: "Antes",
    ticketIds: ["DEMO-1"],
  });
  await pauseQuest(openQuest.id, { falta: "não apagar isto" });

  const otherQuest = await createQuest({
    titulo: "Outra",
    ticketIds: ["DEMO-2"],
  });

  const keys = await listLinkedTicketKeys();
  assert.deepEqual(keys, ["DEMO-1", "DEMO-2"]);

  const result = await applyTicketSnapshots({
    issues: [
      {
        key: "demo-1",
        summary: "Login ok",
        status: "Em andamento",
        epicId: "DEMO-100",
      },
      { key: "DEMO-99", summary: "Orfã", status: "To Do" },
      { key: "DEMO-2", summary: "Fechou", status: "Done" },
    ],
  });

  assert.equal(result.updated, 2);
  assert.equal(result.markedFeita, 1);
  assert.equal(result.epicLinked, 1);
  assert.equal(result.unmatched, 1);

  const refreshed = await getQuest(openQuest.id);
  assert.equal(refreshed?.titulo, "[DEMO-1] Login ok");
  assert.equal(refreshed?.ticketStatus, "Em andamento");
  assert.equal(refreshed?.epicId, "DEMO-100");
  assert.ok(refreshed?.ticketSyncedAt);
  assert.equal(refreshed?.falta, "não apagar isto");
  assert.equal(refreshed?.status, "ativa");

  const doneQuest = await getQuest(otherQuest.id);
  assert.equal(doneQuest?.status, "feita");
  assert.equal(doneQuest?.ticketStatus, "Done");

  const scheduledQuest = await createQuest({
    titulo: "Vai pra prod",
    ticketIds: ["DEMO-3"],
  });
  const scheduled = await applyTicketSnapshots({
    issues: [
      {
        key: "DEMO-3",
        summary: "Deploy",
        status: "Scheduled",
        statusReason: "Irá para produção no dia 28/09",
      },
    ],
  });
  assert.equal(scheduled.updated, 1);
  const waiting = await getQuest(scheduledQuest.id);
  assert.equal(waiting?.status, "pausada");
  assert.equal(waiting?.falta, "Irá para produção no dia 28/09");
  assert.equal(waiting?.faltaSource, "import");

  const userPaused = await createQuest({
    titulo: "Minha pausa",
    ticketIds: ["DEMO-4"],
  });
  await pauseQuest(userPaused.id, { falta: "esperando o time" });
  await applyTicketSnapshots({
    issues: [
      {
        key: "DEMO-4",
        summary: "Minha pausa",
        status: "Blocked",
        statusReason: "motivo do Jira",
      },
    ],
  });
  const stillMine = await getQuest(userPaused.id);
  assert.equal(stillMine?.status, "pausada");
  assert.equal(stillMine?.falta, "esperando o time");
  assert.equal(stillMine?.faltaSource, "user");

  await dataSource.destroy();
  console.log(
    "check:ticket-snapshot ok — in progress resumes + epic + falta preserved + done",
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
