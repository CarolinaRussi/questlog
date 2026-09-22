import { createWriteStream, existsSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";

// ponytail: Windows-only pack for phase 4.2; mac/linux later if needed.
if (process.platform !== "win32") {
  console.error("desktop:pack currently supports Windows only.");
  process.exit(1);
}

const desktopDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(desktopDir, "../..");
const stagingDir = join(desktopDir, "pack-staging");
const cacheDir = join(desktopDir, ".cache");
const nodeVersion = process.versions.node;
const nodeZipName = `node-v${nodeVersion}-win-x64.zip`;
const nodeUrl = `https://nodejs.org/dist/v${nodeVersion}/${nodeZipName}`;
const nodeZipPath = join(cacheDir, nodeZipName);
const nodeExtractDir = join(cacheDir, `node-v${nodeVersion}-win-x64`);
const pnpmCmd = "pnpm";

function quoteArg(arg) {
  if (!/[ \t"]/.test(arg)) {
    return arg;
  }
  return `"${arg.replaceAll('"', '\\"')}"`;
}

function run(command, args) {
  const line = [command, ...args].map(quoteArg).join(" ");
  const result = spawnSync(line, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${line}`);
  }
}

function extractZip(zipPath, destDir) {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`Expand-Archive failed for ${zipPath}`);
  }
}

async function download(url, dest) {
  if (existsSync(dest)) {
    console.log(`Using cached ${dest}`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  console.log(`Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download Node: ${response.status} ${url}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
}

async function ensureNodeRuntime() {
  const nodeExe = join(nodeExtractDir, "node.exe");
  if (existsSync(nodeExe)) {
    console.log(`Using cached Node at ${nodeExtractDir}`);
    return nodeExtractDir;
  }
  await download(nodeUrl, nodeZipPath);
  mkdirSync(cacheDir, { recursive: true });
  if (existsSync(nodeExtractDir)) {
    rmSync(nodeExtractDir, { recursive: true, force: true });
  }
  extractZip(nodeZipPath, cacheDir);
  if (!existsSync(nodeExe)) {
    throw new Error(`node.exe missing after extract: ${nodeExe}`);
  }
  return nodeExtractDir;
}

async function main() {
  console.log("Building core / server / web…");
  run(pnpmCmd, ["--filter", "@questlog/core", "build"]);
  run(pnpmCmd, ["--filter", "@questlog/server", "build"]);
  run(pnpmCmd, ["--filter", "@questlog/web", "build"]);

  if (existsSync(stagingDir)) {
    rmSync(stagingDir, { recursive: true, force: true });
  }
  mkdirSync(stagingDir, { recursive: true });

  const serverStaging = join(stagingDir, "server");
  console.log("Deploying server runtime…");
  run(pnpmCmd, [
    "--filter",
    "@questlog/server",
    "deploy",
    "--prod",
    "--legacy",
    serverStaging,
  ]);

  // dist/ is gitignored — ensure the compiled server is present for the pack.
  const serverDistSrc = join(repoRoot, "apps/server/dist");
  const serverDistDest = join(serverStaging, "dist");
  if (!existsSync(serverDistSrc)) {
    throw new Error(`server dist missing: ${serverDistSrc}`);
  }
  if (!existsSync(join(serverDistDest, "index.js"))) {
    if (existsSync(serverDistDest)) {
      rmSync(serverDistDest, { recursive: true, force: true });
    }
    cpSync(serverDistSrc, serverDistDest, { recursive: true });
  }
  if (!existsSync(join(serverStaging, "package.json"))) {
    cpSync(
      join(repoRoot, "apps/server/package.json"),
      join(serverStaging, "package.json"),
    );
  }

  const coreDistSrc = join(repoRoot, "packages/core/dist");
  const corePackageDest = join(serverStaging, "node_modules/@questlog/core");
  const coreDistDest = join(corePackageDest, "dist");
  if (!existsSync(join(coreDistSrc, "index.js"))) {
    throw new Error(`core dist missing: ${coreDistSrc}`);
  }
  if (existsSync(corePackageDest) && !existsSync(join(coreDistDest, "index.js"))) {
    cpSync(coreDistSrc, coreDistDest, { recursive: true });
  }

  if (!existsSync(join(serverDistDest, "index.js"))) {
    throw new Error(`server dist not staged: ${serverDistDest}`);
  }
  if (!existsSync(join(coreDistDest, "index.js"))) {
    throw new Error(`core dist not staged: ${coreDistDest}`);
  }

  const webSrc = join(repoRoot, "apps/web/dist");
  const webDest = join(stagingDir, "web");
  if (!existsSync(webSrc)) {
    throw new Error(`web dist missing: ${webSrc}`);
  }
  cpSync(webSrc, webDest, { recursive: true });

  const nodeRuntime = await ensureNodeRuntime();
  const nodeDest = join(stagingDir, "node");
  mkdirSync(nodeDest, { recursive: true });
  for (const name of ["node.exe", "LICENSE", "README.md"]) {
    const from = join(nodeRuntime, name);
    if (existsSync(from)) {
      cpSync(from, join(nodeDest, name));
    }
  }

  console.log(`Pack staging ready at ${stagingDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
