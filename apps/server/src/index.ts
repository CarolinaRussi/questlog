import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { getDataDir, hydrateJiraSecretsFromEnv, initDb } from "@questlog/core";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(getDataDir(), ".env") });
loadEnv({ path: join(here, "../../../.env") });
hydrateJiraSecretsFromEnv();

const config = loadConfig();
await initDb();

const app = await buildApp();
await app.listen({ host: config.host, port: config.port });

app.log.info(`QuestLog API on http://${config.host}:${config.port}`);
