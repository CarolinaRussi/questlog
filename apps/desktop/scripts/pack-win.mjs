import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const desktopDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function runElectronBuilder(outputDir) {
  return spawnSync(
    "npx",
    [
      "electron-builder",
      "--win",
      "portable",
      "dir",
      "--publish",
      "never",
      `-c.directories.output=${outputDir}`,
    ],
    { cwd: desktopDir, stdio: "inherit", shell: true },
  );
}

let outputDir = "release";
let result = runElectronBuilder(outputDir);
if (result.status !== 0) {
  console.warn("Pack to release/ failed (folder locked?). Retrying in release2/…");
  outputDir = "release2";
  result = runElectronBuilder(outputDir);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const portable = join(desktopDir, outputDir, "QuestLog.exe");
const pinnedPortable = join(desktopDir, "release/QuestLog.exe");
const unpackedSrc = join(desktopDir, outputDir, "win-unpacked");
const unpackedDest = join(desktopDir, "release/win-unpacked");

if (outputDir !== "release" && existsSync(portable)) {
  mkdirSync(dirname(pinnedPortable), { recursive: true });
  copyFileSync(portable, pinnedPortable);
  console.log(`Copied portable to ${pinnedPortable}.`);
}

if (outputDir !== "release" && existsSync(unpackedSrc)) {
  cpSync(unpackedSrc, unpackedDest, { recursive: true, force: true });
  console.log(`Synced win-unpacked to ${unpackedDest} (best for taskbar pin).`);
}

console.log(`Pack done: ${join(desktopDir, outputDir)}`);
