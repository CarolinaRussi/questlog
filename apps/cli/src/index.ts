import { QUESTLOG_CORE_VERSION } from "@questlog/core";
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
  seed <gran|minimal>   Upsert profile from examples/*.profile.json
  help                  Show this help`);
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

  throw new Error(`Unknown command "${command}". Try: questlog help`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
