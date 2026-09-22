import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Directory for QuestLog local state (SQLite file, etc.).
 * Override with QUESTLOG_DATA_DIR for tests / portable installs.
 */
export function getDataDir(): string {
  const fromEnv = process.env.QUESTLOG_DATA_DIR?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (process.platform === "win32") {
    const appData =
      process.env.APPDATA?.trim() || join(homedir(), "AppData", "Roaming");
    return join(appData, "questlog");
  }

  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "questlog");
  }

  const xdgDataHome =
    process.env.XDG_DATA_HOME?.trim() || join(homedir(), ".local", "share");
  return join(xdgDataHome, "questlog");
}

export function getDatabasePath(): string {
  return join(getDataDir(), "questlog.db");
}
