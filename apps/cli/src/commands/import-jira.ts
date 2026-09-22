import { readFile } from "node:fs/promises";
import { initDb, importJiraIssues } from "@questlog/core";

export async function runImportJiraCommand(filePath: string): Promise<void> {
  const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  await initDb();
  const result = await importJiraIssues(raw);
  console.log(
    `Import Jira: created=${result.created} skippedExisting=${result.skippedExisting} skippedCancelled=${result.skippedCancelled}`,
  );
  console.log(
    `  by status → ativa=${result.byStatus.ativa} pausada=${result.byStatus.pausada} feita=${result.byStatus.feita}`,
  );
}
