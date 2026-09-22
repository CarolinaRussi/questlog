export { getDataDir, getDatabasePath } from "./paths/get-data-dir.js";
export { createDataSource } from "./db/data-source.js";
export { initDb } from "./db/init-db.js";
export type { InitDbOptions } from "./db/init-db.js";

export { Profile } from "./db/entities/profile.entity.js";
export { Quest } from "./db/entities/quest.entity.js";
export { Commit } from "./db/entities/commit.entity.js";

export type {
  QuestStatus,
  EpicScope,
  ProfileRepo,
  QuestRepo,
} from "./domain/types.js";

export { getProfile, upsertProfile } from "./use-cases/profile.js";
export {
  upsertProfileInputSchema,
  type UpsertProfileInput,
} from "./use-cases/profile.schemas.js";

export const QUESTLOG_CORE_VERSION = "0.0.0";
