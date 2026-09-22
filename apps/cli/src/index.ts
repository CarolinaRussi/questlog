import { QUESTLOG_CORE_VERSION } from "@questlog/core";
import { runImportJiraCommand } from "./commands/import-jira.js";
import { runIngestCommitCommand } from "./commands/ingest-commit.js";
import { runRemindCommand } from "./commands/remind.js";
import { runSeedCommand } from "./commands/seed.js";

function argvCommands(): string[] {
  return process.argv.slice(2).filter((arg) => arg !== "--");
}

async function main(): Promise<void> {
  const args = argvCommands();
  const command = args[0] ?? "help";

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(`questlog (core ${QUESTLOG_CORE_VERSION})
Commands:
  seed <gran|minimal>     Upsert profile from examples/*.profile.json
  import-jira <file.json> Import issues export into quests
  ingest-commit           Read latest git commit in cwd and store via core (fail-open)
  remind                  Session reminder (quests + API health)
  help                    Show this help

Flags:
  ingest-commit --strict   Exit non-zero on failure (default is fail-open)

Notes:
  Failed ingest payloads are queued under the QuestLog data dir and
  replayed on the next successful ingest-commit run.`);
    return;
  }

  if (command === "seed") {
    const exampleName = args[1];
    if (!exampleName) {
      throw new Error("Usage: questlog seed <gran|minimal>");
    }
    await runSeedCommand(exampleName);
    return;
  }

  if (command === "import-jira") {
    const filePath = args[1];
    if (!filePath) {
      throw new Error("Usage: questlog import-jira <file.json>");
    }
    await runImportJiraCommand(filePath);
    return;
  }

  if (command === "ingest-commit") {
    await runIngestCommitCommand({
      strict: args.includes("--strict"),
    });
    return;
  }

  if (command === "remind") {
    await runRemindCommand();
    return;
  }

  throw new Error(`Unknown command "${command}". Try: questlog help`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
