import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { initDb } from "@questlog/core";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

loadEnv({
  path: join(dirname(fileURLToPath(import.meta.url)), "../../../.env"),
});

const config = loadConfig();
await initDb();

const app = await buildApp();
await app.listen({ host: config.host, port: config.port });

app.log.info(`QuestLog API on http://${config.host}:${config.port}`);
