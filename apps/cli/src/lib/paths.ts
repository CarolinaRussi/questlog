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
  return filePath.startsWith("\\\\") || filePath.startsWith("//")
    ? filePath.replace(/\//g, "\\")
    : resolve(filePath);
}

/**
 * Compare Windows UNC (`\\wsl.localhost\Distro\home\...`) with the
 * Linux cwd Cursor/WSL often reports (`/home/...`).
 */
export function pathMatchKey(raw: string): string {
  const trimmed = raw.trim();
  const asBackslash = trimmed.replace(/\//g, "\\");

  const wslUnc = asBackslash.match(
    /^\\\\wsl(?:\.localhost|\$)\\[^\\]+\\(.+)$/i,
  );
  if (wslUnc?.[1]) {
    return wslUnc[1].toLowerCase();
  }

  if (trimmed.startsWith("/")) {
    return trimmed.slice(1).replace(/\//g, "\\").toLowerCase();
  }

  return resolve(expandUserPath(trimmed)).toLowerCase();
}

function isSameOrChildPath(cwd: string, repoPath: string): boolean {
  const cwdKey = pathMatchKey(cwd);
  const repoKey = pathMatchKey(repoPath);
  return cwdKey === repoKey || cwdKey.startsWith(`${repoKey}${sep}`);
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
