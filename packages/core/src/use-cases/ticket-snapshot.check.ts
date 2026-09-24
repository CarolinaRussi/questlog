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

  await dataSource.destroy();
  console.log(
    "check:ticket-snapshot ok — in progress resumes + epic + falta preserved + done",
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
