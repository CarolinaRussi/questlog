import { getProfile, initDb, listQuests } from "@questlog/core";

function apiBaseUrl(): string {
  const port = process.env.QUESTLOG_PORT?.trim() || "8787";
  return `http://127.0.0.1:${port}`;
}

async function isApiUp(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/health`, {
      signal: AbortSignal.timeout(800),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function runRemindCommand(): Promise<void> {
  const baseUrl = apiBaseUrl();

  try {
    await initDb();
    const profile = await getProfile();
    const ativas = profile ? (await listQuests({ status: "ativa" })).length : 0;
    const pausadas = profile
      ? (await listQuests({ status: "pausada" })).length
      : 0;

    const apiUp = await isApiUp();

    console.log("— QuestLog —");
    if (!profile) {
      console.log("Nenhum perfil ainda. Rode: pnpm seed -- gran");
    } else {
      console.log(
        `Perfil "${profile.name}": ${ativas} ativa(s), ${pausadas} pausada(s).`,
      );
    }

    if (apiUp) {
      console.log(`Board: ${baseUrl}  (API no ar)`);
      console.log("Abre o board e retoma pelo campo Falta se precisar.");
    } else {
      console.log(`API fora (${baseUrl}).`);
      console.log("Sobe com: pnpm start");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`questlog remind: ${message}`);
    console.log(`Board esperado em ${baseUrl}`);
    console.log("Sobe com: pnpm start");
  }
}
