import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog } from "electron";

const desktopDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(desktopDir, "../../..");

const HOST = "127.0.0.1";
const PORT = Number(process.env.QUESTLOG_PORT?.trim() || "8787");
const BOARD_URL = `http://${HOST}:${PORT}`;

/** @type {import('node:child_process').ChildProcess | null} */
let serverProcess = null;
/** @type {BrowserWindow | null} */
let mainWindow = null;
let stopping = false;
let serverStartedByApp = false;
/** @type {string} */
let boardUrl = BOARD_URL;

function resolveRuntime() {
  if (app.isPackaged) {
    const resources = process.resourcesPath;
    const webDist = join(resources, "runtime/web");
    const serverEntry = join(resources, "runtime/server/dist/index.js");
    const nodeBinary = join(resources, "runtime/node/node.exe");
    return {
      mode: "packaged",
      cwd: join(resources, "runtime/server"),
      webDist,
      serverEntry,
      nodeBinary,
      serverArgs: [serverEntry],
    };
  }

  const webDist = join(repoRoot, "apps/web/dist");
  const serverEntry = join(repoRoot, "apps/server/src/index.ts");
  const tsxCliCandidates = [
    join(repoRoot, "apps/server/node_modules/tsx/dist/cli.mjs"),
    join(repoRoot, "packages/core/node_modules/tsx/dist/cli.mjs"),
    join(repoRoot, "node_modules/tsx/dist/cli.mjs"),
  ];
  const tsxCli = tsxCliCandidates.find((candidate) => existsSync(candidate));
  if (!tsxCli) {
    throw new Error(
      `tsx not found. Tried:\n${tsxCliCandidates.join("\n")}\nRun: pnpm setup`,
    );
  }

  return {
    mode: "dev",
    cwd: repoRoot,
    webDist,
    serverEntry,
    nodeBinary: resolveDevNodeBinary(),
    serverArgs: [tsxCli, serverEntry],
  };
}

function resolveDevNodeBinary() {
  if (process.env.QUESTLOG_NODE?.trim()) {
    return process.env.QUESTLOG_NODE.trim();
  }
  if (process.env.npm_node_execpath?.trim()) {
    return process.env.npm_node_execpath.trim();
  }
  return "node";
}

function assertReadyToStart(runtime) {
  if (!existsSync(runtime.webDist)) {
    throw new Error(
      `Web build missing at ${runtime.webDist}. Run: pnpm --filter @questlog/web build`,
    );
  }
  if (!existsSync(runtime.serverEntry)) {
    throw new Error(`Server entry missing: ${runtime.serverEntry}`);
  }
  if (runtime.mode === "packaged" && !existsSync(runtime.nodeBinary)) {
    throw new Error(`Bundled Node missing: ${runtime.nodeBinary}`);
  }
}

function startServer() {
  const runtime = resolveRuntime();
  assertReadyToStart(runtime);
  serverStartedByApp = true;

  serverProcess = spawn(runtime.nodeBinary, runtime.serverArgs, {
    cwd: runtime.cwd,
    env: {
      ...process.env,
      QUESTLOG_WEB_DIST: runtime.webDist,
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

async function isApiHealthy() {
  try {
    const response = await fetch(`${BOARD_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function servesQuestLogUi(baseUrl) {
  try {
    const response = await fetch(baseUrl);
    if (!response.ok) {
      return false;
    }
    const html = await response.text();
    return html.includes('id="root"') || html.includes("QuestLog");
  } catch {
    return false;
  }
}

async function waitForHealth(timeoutMs = 30_000) {
  const startedAt = Date.now();
  let lastError = /** @type {unknown} */ (null);

  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await isApiHealthy()) {
        return;
      }
      lastError = new Error("health check failed");
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

async function resolveBoardUrlForDev() {
  if (!(await isApiHealthy())) {
    return BOARD_URL;
  }

  if (await servesQuestLogUi(BOARD_URL)) {
    return BOARD_URL;
  }

  const viteUrl = "http://localhost:5173";
  if (await servesQuestLogUi(viteUrl)) {
    console.log(
      `API already on ${BOARD_URL}; opening Vite UI at ${viteUrl} (pnpm start).`,
    );
    return viteUrl;
  }

  throw new Error(
    `A API já responde em ${BOARD_URL}, mas a UI não abriu. ` +
      `Use pnpm desktop sozinha (feche outros terminais do QuestLog) ou abra http://localhost:5173 no navegador.`,
  );
}

function showBootError(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  if (app.isReady()) {
    dialog.showErrorBox("QuestLog não abriu", message);
  }
}

function resolveAppIcon() {
  const candidates = [
    join(desktopDir, "../branding/icon.png"),
    join(process.resourcesPath ?? "", "icon.png"),
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function createWindow() {
  const iconPath = resolveAppIcon();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "QuestLog",
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void mainWindow.loadURL(boardUrl);
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

function focusMainWindow() {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

async function boot() {
  if (app.isPackaged) {
    startServer();
    await waitForHealth();
    boardUrl = BOARD_URL;
  } else if (await isApiHealthy()) {
    boardUrl = await resolveBoardUrlForDev();
    console.log(`QuestLog API already running; UI at ${boardUrl}`);
  } else {
    startServer();
    await waitForHealth();
    boardUrl = BOARD_URL;
  }
  createWindow();
}

if (process.platform === "win32") {
  app.setAppUserModelId("dev.questlog.app");
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    focusMainWindow();
  });

  app.whenReady().then(() => {
    void boot().catch((error) => {
      showBootError(error);
      stopServer();
      app.exit(1);
    });
  });
}

app.on("before-quit", () => {
  if (serverStartedByApp) {
    stopServer();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
