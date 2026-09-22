import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  initDb,
  seedProfile,
  upsertProfileInputSchema,
} from "@questlog/core";

const EXAMPLE_NAMES = ["gran", "minimal"] as const;
type ExampleName = (typeof EXAMPLE_NAMES)[number];

function isExampleName(value: string): value is ExampleName {
  return (EXAMPLE_NAMES as readonly string[]).includes(value);
}

function examplesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // apps/cli/src/commands → repo root
  return join(here, "../../../../examples");
}

export async function runSeedCommand(exampleName: string): Promise<void> {
  if (!isExampleName(exampleName)) {
    throw new Error(
      `Unknown example "${exampleName}". Use: ${EXAMPLE_NAMES.join(", ")}`,
    );
  }

  const filePath = join(examplesDir(), `${exampleName}.profile.json`);
  const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  const input = upsertProfileInputSchema.parse(raw);

  await initDb();
  const profile = await seedProfile(input);
  console.log(
    `Seeded profile "${profile.name}" (${profile.id}) from examples/${exampleName}.profile.json`,
  );
  console.log(
    "Adjust repo paths in settings or re-seed after editing the example file.",
  );
}
