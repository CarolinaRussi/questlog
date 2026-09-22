import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import type { ProfileRepo } from "@questlog/core";

export function expandUserPath(filePath: string): string {
  if (filePath === "~") {
    return homedir();
  }
  if (filePath.startsWith("~/") || filePath.startsWith("~\\")) {
    return resolve(homedir(), filePath.slice(2));
  }
  return resolve(filePath);
}

function isSameOrChildPath(cwd: string, repoPath: string): boolean {
  const normalizedCwd = resolve(cwd).toLowerCase();
  const normalizedRepo = resolve(repoPath).toLowerCase();
  return (
    normalizedCwd === normalizedRepo ||
    normalizedCwd.startsWith(`${normalizedRepo}${sep}`)
  );
}

export function matchRepoByCwd(
  cwd: string,
  repos: ProfileRepo[],
): ProfileRepo | null {
  for (const repo of repos) {
    if (isSameOrChildPath(cwd, expandUserPath(repo.path))) {
      return repo;
    }
  }
  return null;
}
