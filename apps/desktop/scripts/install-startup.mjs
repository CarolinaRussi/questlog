import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// ponytail: Windows logon via Task Scheduler (Startup folder is flaky on Azure AD).
if (process.platform !== "win32") {
  console.error("desktop:startup currently supports Windows only.");
  process.exit(1);
}

const desktopDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const unpackedExe = join(desktopDir, "release/win-unpacked/QuestLog.exe");
const portableExe = join(desktopDir, "release/QuestLog.exe");
const exePath =
  process.env.QUESTLOG_EXE?.trim() ||
  (existsSync(unpackedExe) ? unpackedExe : portableExe);
const remove = process.argv.includes("--remove");
const taskName = "QuestLog";

function powershell(script) {
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "PowerShell failed").trim());
  }
  return (result.stdout || "").trim();
}

if (remove) {
  powershell(`
    $startup = [Environment]::GetFolderPath('Startup')
    $link = Join-Path $startup 'QuestLog.lnk'
    if (Test-Path -LiteralPath $link) { Remove-Item -LiteralPath $link -Force }
    Unregister-ScheduledTask -TaskName '${taskName}' -Confirm:$false -ErrorAction SilentlyContinue
  `);
  console.log("Removed QuestLog from Windows logon (Startup + Task Scheduler).");
  process.exit(0);
}

if (!existsSync(exePath)) {
  throw new Error(
    `QuestLog.exe not found at ${exePath}. Run: pnpm desktop:pack`,
  );
}

const escapedExe = exePath.replace(/'/g, "''");

powershell(`
  $exe = '${escapedExe}'
  $work = Split-Path $exe
  $startup = [Environment]::GetFolderPath('Startup')
  $link = Join-Path $startup 'QuestLog.lnk'
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($link)
  $shortcut.TargetPath = $exe
  $shortcut.WorkingDirectory = $work
  $shortcut.Description = 'QuestLog'
  $shortcut.Save()

  Unregister-ScheduledTask -TaskName '${taskName}' -Confirm:$false -ErrorAction SilentlyContinue
  $action = New-ScheduledTaskAction -Execute $exe -WorkingDirectory $work
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $trigger.Delay = 'PT20S'
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
  Register-ScheduledTask -TaskName '${taskName}' -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
  Write-Output $link
`);

console.log(`QuestLog will open ~20s after Windows login.`);
console.log(`Target: ${exePath}`);
console.log(`Task Scheduler: ${taskName}`);
