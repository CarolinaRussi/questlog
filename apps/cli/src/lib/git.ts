import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function git(
  cwd: string,
  args: string[],
): Promise<string> {
  const { stdout } = await execFileAsync(
    "git",
    ["-c", "safe.directory=*", ...args],
    {
      cwd,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  return stdout.trim();
}

export type GitCommitInfo = {
  hash: string;
  assunto: string;
  body: string;
  branch: string;
  quando: Date;
  resumo: string;
};

export async function readLatestCommit(cwd: string): Promise<GitCommitInfo> {
  const hash = await git(cwd, ["log", "-1", "--pretty=%H"]);
  const assunto = await git(cwd, ["log", "-1", "--pretty=%s"]);
  const body = await git(cwd, ["log", "-1", "--pretty=%b"]);
  const isoDate = await git(cwd, ["log", "-1", "--pretty=%cI"]);
  const branch = await git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const resumo = await git(cwd, ["show", "--stat", "--format=", "-1"]);

  return {
    hash,
    assunto,
    body,
    branch,
    quando: new Date(isoDate),
    resumo,
  };
}
