import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";

const desktopDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(desktopDir, "../../..");
const webDist = join(repoRoot, "apps/web/dist");
const serverEntry = join(repoRoot, "apps/server/src/index.ts");
const tsxCliCandidates = [
  join(repoRoot, "apps/server/node_modules/tsx/dist/cli.mjs"),
  join(repoRoot, "node_modules/tsx/dist/cli.mjs"),
];

const HOST = "127.0.0.1";
const PORT = Number(process.env.QUESTLOG_PORT?.trim() || "8787");
const BOARD_URL = `http://${HOST}:${PORT}`;

/** @type {import('node:child_process').ChildProcess | null} */
let serverProcess = null;
/** @type {BrowserWindow | null} */
let mainWindow = null;
let stopping = false;

function resolveNodeBinary() {
  if (process.env.QUESTLOG_NODE?.trim()) {
    return process.env.QUESTLOG_NODE.trim();
  }
  if (process.env.npm_node_execpath?.trim()) {
    return process.env.npm_node_execpath.trim();
  }
  return "node";
}

function resolveTsxCli() {
  const found = tsxCliCandidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `tsx not found. Tried:\n${tsxCliCandidates.join("\n")}\nRun: pnpm setup`,
    );
  }
  return found;
}

function assertReadyToStart() {
  if (!existsSync(webDist)) {
    throw new Error(
      `Web build missing at ${webDist}. Run: pnpm --filter @questlog/web build`,
    );
  }
  if (!existsSync(serverEntry)) {
    throw new Error(`Server entry missing: ${serverEntry}`);
  }
  resolveTsxCli();
}

function startServer() {
  assertReadyToStart();

  const nodeBinary = resolveNodeBinary();
  const tsxCli = resolveTsxCli();
  serverProcess = spawn(nodeBinary, [tsxCli, serverEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      QUESTLOG_WEB_DIST: webDist,
      QUESTLOG_PORT: String(PORT),
    },
    stdio: "inherit",
    windowsHide: true,
  });

  serverProcess.on("exit", (code, signal) => {
    serverProcess = null;
    if (stopping) {
      return;
    }
    console.error(
      `QuestLog API exited unexpectedly (code=${code}, signal=${signal})`,
    );
    app.quit();
  });
}

async function waitForHealth(timeoutMs = 30_000) {
  const startedAt = Date.now();
  let lastError = /** @type {unknown} */ (null);

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${BOARD_URL}/api/health`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`health status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(
    `QuestLog API did not become ready at ${BOARD_URL}/api/health: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "QuestLog",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void mainWindow.loadURL(BOARD_URL);
}

function stopServer() {
  if (!serverProcess || serverProcess.killed) {
    return;
  }
  stopping = true;
  const child = serverProcess;
  serverProcess = null;

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");
}

async function boot() {
  startServer();
  await waitForHealth();
  createWindow();
}

app.whenReady().then(() => {
  void boot().catch((error) => {
    console.error(error);
    stopServer();
    app.exit(1);
  });
});

app.on("before-quit", () => {
  stopServer();
});

app.on("window-all-closed", () => {
  app.quit();
});
