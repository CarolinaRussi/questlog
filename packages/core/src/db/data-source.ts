import { DataSource } from "typeorm";
import { Commit } from "./entities/commit.entity.js";
import { EpicNote } from "./entities/epic-note.entity.js";
import { Profile } from "./entities/profile.entity.js";
import { Quest } from "./entities/quest.entity.js";
import { Bootstrap20260922120000 } from "./migrations/20260922120000-bootstrap.js";
import { ProfileQuestCommit20260922130000 } from "./migrations/20260922130000-profile-quest-commit.js";
import { QuestTicketSync20260922140000 } from "./migrations/20260922140000-quest-ticket-sync.js";
import { EpicNotes20260922150000 } from "./migrations/20260922150000-epic-notes.js";
import { QuestWatching20260922160000 } from "./migrations/20260922160000-quest-watching.js";
import { EpicNoteTitle20260922170000 } from "./migrations/20260922170000-epic-note-title.js";
import { QuestCompletedAt20260929180000 } from "./migrations/20260929180000-quest-completed-at.js";

const BUSY_TIMEOUT_MS = 5000;

export function createDataSource(databasePath: string): DataSource {
  return new DataSource({
    type: "better-sqlite3",
    database: databasePath,
    enableWAL: true,
    timeout: BUSY_TIMEOUT_MS,
    entities: [Profile, Quest, Commit, EpicNote],
    migrations: [
      Bootstrap20260922120000,
      ProfileQuestCommit20260922130000,
      QuestTicketSync20260922140000,
      EpicNotes20260922150000,
      QuestWatching20260922160000,
      EpicNoteTitle20260922170000,
      QuestCompletedAt20260929180000,
    ],
    migrationsTableName: "typeorm_migrations",
  });
}
