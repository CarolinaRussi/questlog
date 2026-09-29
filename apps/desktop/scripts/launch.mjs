import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const packagedCandidates = [
  join(desktopDir, "release/QuestLog.exe"),
  join(desktopDir, "release2/QuestLog.exe"),
  join(desktopDir, "release/win-unpacked/QuestLog.exe"),
  join(desktopDir, "release2/win-unpacked/QuestLog.exe"),
];

function launchPackaged(exePath) {
  const child = spawn(exePath, [], {
    cwd: dirname(exePath),
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
}

function launchElectronDev() {
  const child = spawn("electron", ["."], {
    cwd: desktopDir,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

const useDev =
  process.env.QUESTLOG_ELECTRON_DEV === "1" ||
  process.env.QUESTLOG_ELECTRON_DEV === "true";

const packagedExe = packagedCandidates.find((candidate) => existsSync(candidate));

if (!useDev && packagedExe) {
  launchPackaged(packagedExe);
  process.exit(0);
}

launchElectronDev();
