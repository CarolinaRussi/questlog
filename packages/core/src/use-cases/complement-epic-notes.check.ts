import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "../db/init-db.js";
import { jiraDocToPlain } from "../integrations/jira-rest.js";
import { createQuest } from "./quest.js";
import { upsertProfile } from "./profile.js";
import { getEpicNote } from "./epic-note.js";
import { complementEpicNotes } from "./complement-epic-notes.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-epic-notes-"));
const databasePath = join(tempDir, "questlog.db");
process.env.QUESTLOG_DATA_DIR = tempDir;

try {
  assert.equal(
    jiraDocToPlain({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Olá" }],
        },
      ],
    }),
    "Olá",
  );

  const dataSource = await initDb({ databasePath });

  await upsertProfile({
    repos: [{ nome: "demo", path: "/tmp/demo" }],
    ticketPattern: "DEMO-\\d+",
    ticketHasEpic: true,
  });

  await createQuest({
    titulo: "Task A",
    ticketIds: ["DEMO-1"],
    epicId: "DEMO-100",
  });

  const first = await complementEpicNotes("DEMO-100", {
    generate: async () => ({
      overview: "Épico de login.",
      progress: "Comecei a Task A.",
    }),
  });
  assert.equal(first.overview, "Épico de login.");
  assert.equal(first.progress, "Comecei a Task A.");

  await createQuest({
    titulo: "Task B",
    ticketIds: ["DEMO-2"],
    epicId: "DEMO-100",
  });

  const second = await complementEpicNotes("DEMO-100", {
    generate: async (prompt) => {
      assert.match(prompt, /Épico de login/);
      assert.match(prompt, /Comecei a Task A/);
      assert.match(prompt, /Task B/);
      return {
        overview: "Épico de login (auth + sessão).",
        progress: "Comecei a Task A.\nDepois peguei a Task B.",
      };
    },
  });

  assert.match(second.overview, /auth/);
  assert.match(second.progress, /Task B/);

  const stored = await getEpicNote("DEMO-100");
  assert.equal(stored?.progress, second.progress);

  await dataSource.destroy();
  console.log("check:complement-epic-notes ok");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.QUESTLOG_DATA_DIR;
}
