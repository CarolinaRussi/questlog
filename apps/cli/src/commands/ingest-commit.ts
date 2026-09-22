import {
  getProfile,
  ingestCommit,
  initDb,
} from "@questlog/core";
import { readLatestCommit } from "../lib/git.js";
import { matchRepoByCwd } from "../lib/paths.js";

export type IngestCommitCliOptions = {
  cwd?: string;
  /** When true, exit with code 1 on failure. Hooks should leave this false. */
  strict?: boolean;
};

export async function runIngestCommitCommand(
  options: IngestCommitCliOptions = {},
): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const strict = options.strict ?? false;

  try {
    await initDb();
    const profile = await getProfile();
    if (!profile) {
      throw new Error("No profile configured. Run: questlog seed gran");
    }

    const matchedRepo = matchRepoByCwd(cwd, profile.repos);
    if (!matchedRepo) {
      console.error(
        `questlog ingest-commit: cwd is not a configured repo (${cwd})`,
      );
      return;
    }

    const commitInfo = await readLatestCommit(cwd);
    const result = await ingestCommit({
      hash: commitInfo.hash,
      repo: matchedRepo.nome,
      quando: commitInfo.quando,
      assunto: commitInfo.assunto,
      resumo: commitInfo.resumo,
      branch: commitInfo.branch,
      mensagemExtra: commitInfo.body,
    });

    const target = result.questId ?? "inbox";
    console.log(
      `ingest-commit: ${result.created ? "stored" : "exists"} → ${target} (${result.matchedBy})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`questlog ingest-commit: ${message}`);
    if (strict) {
      throw error;
    }
    // fail-open for hooks
  }
}
