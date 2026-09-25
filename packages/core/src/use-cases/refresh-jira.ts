import { In } from "typeorm";
import type { JiraRestCredentials } from "../integrations/jira-rest.js";
import {
  fetchJiraIssueKeysAssignedToMe,
  fetchJiraIssuesAssignedToMe,
  fetchJiraTicketSnapshots,
} from "../integrations/jira-rest.js";
import { Commit } from "../db/entities/commit.entity.js";
import { listLinkedEpicKeys, upsertEpicTitles } from "./epic-note.js";
import { importJiraIssues } from "./jira-import.js";
import { getProfile } from "./profile.js";
import { listQuests } from "./quest.js";
import {
  applyTicketSnapshots,
  listLinkedTicketKeys,
  type ApplyTicketSnapshotsResult,
} from "./ticket-snapshot.js";
import type { TicketSnapshot } from "./ticket-snapshot.schemas.js";

export type RefreshJiraResult = ApplyTicketSnapshotsResult & {
  fetched: number;
  created: number;
  removed: number;
  epicTitlesUpdated: number;
};

/**
 * Refresh linked tickets. Create quests only for issues assigned to the
 * Jira account. Drop board + archive tickets that are not assigned to
 * that account (unassigned counts as not mine). Keeps Done tickets
 * still assigned to that account, plus user-paused / committed work.
 */
export async function refreshJiraFromApi(
  credentials: JiraRestCredentials,
): Promise<RefreshJiraResult> {
  const ticketKeys = await listLinkedTicketKeys();

  const linkedIssues =
    ticketKeys.length > 0
      ? await fetchJiraTicketSnapshots(credentials, ticketKeys)
      : [];

  const applyResult =
    linkedIssues.length > 0
      ? await applyTicketSnapshots({ issues: linkedIssues })
      : {
          updated: 0,
          markedFeita: 0,
          epicLinked: 0,
          unmatched: 0,
        };

  const assignedOpen = await fetchJiraIssuesAssignedToMe(credentials);
  const created = await importEpicChildren(assignedOpen);

  const keysAfterImport = await listLinkedTicketKeys();
  const mineOnBoard =
    keysAfterImport.length > 0
      ? await fetchJiraIssueKeysAssignedToMe(credentials, keysAfterImport)
      : [];
  const removed = await removeQuestsNotAssignedToMe(
    keysNotInAssigned(keysAfterImport, mineOnBoard),
  );

  const epicKeysForTitles = await listLinkedEpicKeys();
  let epicTitlesUpdated = 0;
  if (epicKeysForTitles.length > 0) {
    const epicIssues = await fetchJiraTicketSnapshots(
      credentials,
      epicKeysForTitles,
    );
    epicTitlesUpdated = await upsertEpicTitles(
      epicIssues.map((issue) => ({
        epicId: issue.key,
        title: issue.summary,
      })),
    );
  }

  return {
    ...applyResult,
    fetched: linkedIssues.length,
    created,
    removed,
    epicTitlesUpdated,
  };
}

/**
 * If `ticketKeys` include issues not yet on the board and they are
 * assigned to the Jira account, create those quests. Used by commit ingest
 * so a new HESEC does not wait for Status Jira.
 */
export async function importAssignedTicketsIfMissing(
  credentials: JiraRestCredentials,
  ticketKeys: string[],
): Promise<number> {
  const linked = await listLinkedTicketKeys();
  const unknown = unknownTicketKeys(ticketKeys, linked);
  if (unknown.length === 0) {
    return 0;
  }

  const mine = await fetchJiraIssueKeysAssignedToMe(credentials, unknown);
  if (mine.length === 0) {
    return 0;
  }

  const snapshots = await fetchJiraTicketSnapshots(credentials, mine);
  return importEpicChildren(snapshots);
}

/** Create quests for Jira issues not already on the board. */
export async function importEpicChildren(
  issues: TicketSnapshot[],
): Promise<number> {
  if (issues.length === 0) {
    return 0;
  }
  const imported = await importJiraIssues({
    issues: issues.map(snapshotToImport),
  });
  return imported.created;
}

/**
 * Remove quests (home + archive) whose tickets are all in `notMineKeys`,
 * unless user-paused, active, or already have commits.
 */
export async function removeQuestsNotAssignedToMe(
  notMineKeys: string[],
): Promise<number> {
  const notMine = new Set(
    notMineKeys.map((key) => key.trim().toUpperCase()).filter(Boolean),
  );
  if (notMine.size === 0) {
    return 0;
  }

  const profile = await getProfile();
  if (!profile) {
    return 0;
  }

  const quests = await listQuests();
  const questIds = quests.map((quest) => quest.id);
  const commitQuestIds = new Set<string>();
  if (questIds.length > 0) {
    const commits = await Commit.find({
      where: { profileId: profile.id, questId: In(questIds) },
      select: ["questId"],
    });
    for (const commit of commits) {
      if (commit.questId) {
        commitQuestIds.add(commit.questId);
      }
    }
  }

  let removed = 0;
  for (const quest of quests) {
    if (quest.watching && quest.faltaSource === "user") {
      continue;
    }
    if (profile.activeQuestId === quest.id) {
      continue;
    }
    if (commitQuestIds.has(quest.id)) {
      continue;
    }
    if (quest.ticketIds.length === 0) {
      continue;
    }
    const allNotMine = quest.ticketIds.every((ticketId) =>
      notMine.has(ticketId.toUpperCase()),
    );
    if (!allNotMine) {
      continue;
    }
    await quest.remove();
    removed += 1;
  }
  return removed;
}

/** Ticket ids from a commit that are not already linked to any quest. */
export function unknownTicketKeys(
  fromCommit: string[],
  linkedKeys: string[],
): string[] {
  const known = new Set(
    linkedKeys.map((key) => key.trim().toUpperCase()).filter(Boolean),
  );
  return [
    ...new Set(
      fromCommit
        .map((key) => key.trim().toUpperCase())
        .filter((key) => key && !known.has(key)),
    ),
  ];
}

/** Linked tickets that are not in the assigned-to-me set (includes unassigned). */
export function keysNotInAssigned(
  linkedKeys: string[],
  assignedKeys: string[],
): string[] {
  const mine = new Set(
    assignedKeys.map((key) => key.trim().toUpperCase()).filter(Boolean),
  );
  return [
    ...new Set(
      linkedKeys
        .map((key) => key.trim().toUpperCase())
        .filter((key) => key && !mine.has(key)),
    ),
  ];
}

function snapshotToImport(issue: TicketSnapshot) {
  return {
    key: issue.key,
    summary: issue.summary,
    status: issue.status,
    epicId: issue.epicId,
    statusReason: issue.statusReason,
  };
}
