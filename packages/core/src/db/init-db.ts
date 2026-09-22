import "reflect-metadata";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { DataSource } from "typeorm";
import { getDatabasePath } from "../paths/get-data-dir.js";
import { createDataSource } from "./data-source.js";
import { Commit } from "./entities/commit.entity.js";
import { Profile } from "./entities/profile.entity.js";
import { Quest } from "./entities/quest.entity.js";

export type InitDbOptions = {
  databasePath?: string;
};

export async function initDb(options: InitDbOptions = {}): Promise<DataSource> {
  const databasePath = options.databasePath ?? getDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });

  const dataSource = createDataSource(databasePath);
  await dataSource.initialize();
  await dataSource.runMigrations();

  Profile.useDataSource(dataSource);
  Quest.useDataSource(dataSource);
  Commit.useDataSource(dataSource);

  return dataSource;
}
