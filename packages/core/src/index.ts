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

export {
  listQuests,
  getQuest,
  createQuest,
  updateQuest,
  pauseQuest,
  resumeQuest,
  completeQuest,
  setActiveQuest,
  QuestNotFoundError,
  ProfileRequiredError,
} from "./use-cases/quest.js";
export {
  createQuestInputSchema,
  updateQuestInputSchema,
  pauseQuestInputSchema,
  type CreateQuestInput,
  type UpdateQuestInput,
  type PauseQuestInput,
} from "./use-cases/quest.schemas.js";

export {
  ingestCommit,
  resolveQuestForCommit,
  type IngestCommitResult,
} from "./use-cases/commit.js";
export {
  ingestCommitInputSchema,
  type IngestCommitInput,
} from "./use-cases/commit.schemas.js";
export { extractTicketIds, questHasAnyTicket } from "./use-cases/ticket-match.js";
export {
  normalizeTicketId,
  normalizeBranchName,
  extractTicketsFromBranch,
  countTicketOverlap,
  pickBestQuestByTickets,
} from "./use-cases/ticket-match.js";
export { listCommits } from "./use-cases/list-commits.js";
export {
  getBoardRevision,
  type BoardRevision,
} from "./use-cases/board-revision.js";

export { seedProfile } from "./use-cases/seed.js";
export { importJiraIssues } from "./use-cases/jira-import.js";
export type { ImportJiraResult } from "./use-cases/jira-import.js";
export {
  jiraIssueImportSchema,
  jiraImportFileSchema,
  type JiraIssueImport,
} from "./use-cases/jira-import.schemas.js";

export {
  applyTicketSnapshots,
  listLinkedTicketKeys,
  type ApplyTicketSnapshotsResult,
} from "./use-cases/ticket-snapshot.js";
export {
  ticketSnapshotSchema,
  ticketSnapshotsInputSchema,
  type TicketSnapshot,
  type TicketSnapshotsInput,
} from "./use-cases/ticket-snapshot.schemas.js";

export {
  fetchJiraTicketSnapshots,
  type JiraRestCredentials,
} from "./integrations/jira-rest.js";

export const QUESTLOG_CORE_VERSION = "0.0.0";
