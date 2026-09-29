import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "../db/init-db.js";
import { upsertProfile } from "./profile.js";
import {
  archiveCurrentSprintWindow,
  clearCurrentSprintWindow,
  getCurrentSprintWindow,
  listClosedSprintPeriods,
  SprintWindowNotConfiguredError,
  upsertCurrentSprintWindow,
} from "./sprint-window.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-sprint-window-"));
const databasePath = join(tempDir, "questlog.db");

try {
  const dataSource = await initDb({ databasePath });

  await upsertProfile({
    repos: [{ nome: "demo", path: "/tmp/demo" }],
    ticketPattern: "DEMO-\\d+",
  });

  assert.equal(await getCurrentSprintWindow(), null);

  const window = await upsertCurrentSprintWindow({
    rotulo: "Sprint 42",
    inicio: "2026-09-01",
    fim: "2026-09-14",
  });
  assert.equal(window.rotulo, "Sprint 42");
  assert.equal(window.inicio, "2026-09-01");
  assert.equal(window.fim, "2026-09-14");

  const again = await getCurrentSprintWindow();
  assert.deepEqual(again, window);

  let invalidRange = false;
  try {
    await upsertCurrentSprintWindow({
      inicio: "2026-09-20",
      fim: "2026-09-01",
    });
  } catch {
    invalidRange = true;
  }
  assert.equal(invalidRange, true);

  const archived = await archiveCurrentSprintWindow();
  assert.equal(archived.rotulo, "Sprint 42");
  assert.equal(archived.inicio.toISOString().slice(0, 10), "2026-09-01");
  assert.equal(await getCurrentSprintWindow(), null);

  const history = await listClosedSprintPeriods();
  assert.equal(history.length, 1);
  assert.equal(history[0]?.id, archived.id);

  await upsertCurrentSprintWindow({
    inicio: "2026-09-15",
    fim: "2026-09-28",
  });
  await clearCurrentSprintWindow();
  assert.equal(await getCurrentSprintWindow(), null);

  let notConfigured = false;
  try {
    await archiveCurrentSprintWindow();
  } catch (error) {
    notConfigured = error instanceof SprintWindowNotConfiguredError;
  }
  assert.equal(notConfigured, true);

  await dataSource.destroy();
  console.log("check:sprint-window ok — current window + archive history");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
