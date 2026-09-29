import assert from "node:assert/strict";
import {
  extractDoneTransitionAtIso,
  parseJiraTimestampIso,
} from "./jira-rest.js";

assert.equal(parseJiraTimestampIso("not-a-date"), null);
assert.equal(
  parseJiraTimestampIso("2026-03-15T14:30:00.000+0000")?.slice(0, 10),
  "2026-03-15",
);

const fromChangelog = extractDoneTransitionAtIso({
  histories: [
    {
      created: "2026-01-10T10:00:00.000+0000",
      items: [{ field: "status", toString: "In Progress" }],
    },
    {
      created: "2026-02-20T18:45:00.000+0000",
      items: [{ field: "status", toString: "Done" }],
    },
  ],
});
assert.ok(fromChangelog?.startsWith("2026-02-20"));

console.log("check:jira-resolution ok — resolutiondate + Done changelog");
