import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initDb } from "../db/init-db.js";
import { getProfile, upsertProfile } from "./profile.js";
import { createQuest, pauseQuest } from "./quest.js";
import { ingestCommit } from "./commit.js";
import { extractTicketIds } from "./ticket-match.js";

const tempDir = mkdtempSync(join(tmpdir(), "questlog-commit-"));
const databasePath = join(tempDir, "questlog.db");

try {
  assert.deepEqual(
    extractTicketIds("feat: x #HESEC-1 and HESEC-2", "HESEC-\\d+"),
    ["HESEC-1", "HESEC-2"],
  );

  const dataSource = await initDb({ databasePath });

  await upsertProfile({
    repos: [{ nome: "demo", path: "/tmp/demo" }],
    ticketPattern: "HESEC-\\d+",
    branchPattern: "HESEC-\\d+",
    ticketHasEpic: true,
  });

  const byTicket = await createQuest({
    titulo: "Ticket quest",
    ticketIds: ["HESEC-10"],
  });
  const byBranch = await createQuest({
    titulo: "Branch quest",
    ticketIds: ["HESEC-20"],
  });
  const active = await createQuest({
    titulo: "Active quest",
    ticketIds: ["HESEC-30"],
    setActive: true,
  });
  await pauseQuest(byBranch.id, { falta: "esperando review" });

  const ticketMatch = await ingestCommit({
    hash: "aaa",
    repo: "demo",
    quando: new Date(),
    assunto: "fix: bug #HESEC-10",
    resumo: "1 file",
  });
  assert.equal(ticketMatch.matchedBy, "ticket");
  assert.equal(ticketMatch.questId, byTicket.id);

  const branchMatch = await ingestCommit({
    hash: "bbb",
    repo: "demo",
    quando: new Date(),
    assunto: "chore: no ticket in message",
    branch: "feature/HESEC-20-login",
    resumo: "",
  });
  assert.equal(branchMatch.matchedBy, "branch");
  assert.equal(branchMatch.questId, byBranch.id);

  const activeMatch = await ingestCommit({
    hash: "ccc",
    repo: "demo",
    quando: new Date(),
    assunto: "docs: readme",
    branch: "main",
    resumo: "",
  });
  assert.equal(activeMatch.matchedBy, "active");
  assert.equal(activeMatch.questId, active.id);

  const profile = await getProfile();
  assert.ok(profile);
  profile.activeQuestId = null;
  await profile.save();

  const inboxMatch = await ingestCommit({
    hash: "eee",
    repo: "demo",
    quando: new Date(),
    assunto: "random",
    branch: "main",
    resumo: "",
  });
  assert.equal(inboxMatch.matchedBy, "inbox");
  assert.equal(inboxMatch.questId, null);

  const idempotent = await ingestCommit({
    hash: "aaa",
    repo: "demo",
    quando: new Date(),
    assunto: "fix: bug #HESEC-10",
    resumo: "1 file",
  });
  assert.equal(idempotent.created, false);
  assert.equal(idempotent.matchedBy, "existing");
  assert.equal(idempotent.commit.id, ticketMatch.commit.id);

  await dataSource.destroy();
  console.log("check:commit ok — ticket/branch/active/inbox + idempotent");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
