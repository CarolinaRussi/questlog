import assert from "node:assert/strict";
import {
  extractTicketIds,
  extractTicketsFromBranch,
  normalizeBranchName,
  pickBestQuestByTickets,
} from "./ticket-match.js";

assert.deepEqual(
  extractTicketIds("feat: x #hesec-1 and HESEC-2", "HESEC-\\d+"),
  ["HESEC-1", "HESEC-2"],
);

assert.equal(normalizeBranchName("origin/feature/HESEC-20-login"), "feature/HESEC-20-login");
assert.equal(
  normalizeBranchName("refs/heads/bugfix/hesec-9"),
  "bugfix/hesec-9",
);

assert.deepEqual(
  extractTicketsFromBranch("feature/HESEC-20-login", "HESEC-\\d+"),
  ["HESEC-20"],
);
assert.deepEqual(
  extractTicketsFromBranch("origin/feature/hesec-20-login", "HESEC-\\d+"),
  ["HESEC-20"],
);
assert.deepEqual(
  extractTicketsFromBranch("feature/HESEC-20_HESEC-21-desc", "HESEC-\\d+"),
  ["HESEC-20", "HESEC-21"],
);

const quests = [
  { id: "a", ticketIds: ["HESEC-20"] },
  { id: "b", ticketIds: ["HESEC-20", "HESEC-21"] },
];
const best = pickBestQuestByTickets(quests, ["HESEC-20", "HESEC-21"]);
assert.equal(best?.id, "b");

console.log("check:ticket-match ok");
