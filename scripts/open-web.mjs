import { execFile } from "node:child_process";
import { platform } from "node:os";

const url = process.argv[2]?.trim() || "http://localhost:5173/";

function openUrl(target) {
  if (platform() === "win32") {
    execFile("cmd", ["/c", "start", "", target], { windowsHide: true });
    return;
  }
  if (platform() === "darwin") {
    execFile("open", [target]);
    return;
  }
  execFile("xdg-open", [target]);
}

setTimeout(() => openUrl(url), 1500);
