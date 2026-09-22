import { DataSource } from "typeorm";
import { Bootstrap20260922120000 } from "./migrations/20260922120000-bootstrap.js";

const BUSY_TIMEOUT_MS = 5000;

export function createDataSource(databasePath: string): DataSource {
  return new DataSource({
    type: "better-sqlite3",
    database: databasePath,
    enableWAL: true,
    timeout: BUSY_TIMEOUT_MS,
    entities: [],
    migrations: [Bootstrap20260922120000],
    migrationsTableName: "typeorm_migrations",
  });
}
