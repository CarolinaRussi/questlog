import { Quest } from "../db/entities/quest.entity.js";
import type { QuestStatus } from "../domain/types.js";
import { normalizeTicketId } from "./ticket-match.js";
import { getProfile } from "./profile.js";
import { ProfileRequiredError } from "./quest.js";
import {
  ticketSnapshotsInputSchema,
  type TicketSnapshot,
} from "./ticket-snapshot.schemas.js";

export type ApplyTicketSnapshotsResult = {
  updated: number;
  markedFeita: number;
  epicLinked: number;
  unmatched: number;
};

/** Map an external ticket status label onto a quest status. */
export function mapExternalTicketStatus(
  statusName: string,
): QuestStatus | "skip" {
  const normalized = statusName.trim().toLowerCase();
  if (
    normalized === "concluído" ||
    normalized === "concluido" ||
    normalized === "finalizado" ||
    normalized === "done" ||
    normalized === "closed" ||
    normalized === "fechado"
  ) {
    return "feita";
  }
  if (normalized === "cancelado" || normalized === "cancelled") {
    return "skip";
  }
  if (
    normalized === "em andamento" ||
    normalized === "in progress" ||
    normalized === "em progresso"
  ) {
    return "ativa";
  }
  return "pausada";
}

/** Jira statuses that mean “waiting” — pause and keep the why. */
export function isWaitingTicketStatus(statusName: string): boolean {
  const normalized = statusName.trim().toLowerCase();
  return (
    normalized === "scheduled" ||
    normalized === "blocked" ||
    normalized === "bloqueado" ||
    normalized === "paused" ||
    normalized === "pausada" ||
    normalized === "em pausa" ||
    normalized === "on hold" ||
    normalized === "waiting" ||
    normalized === "aguardando"
  );
}

/**
 * Update existing quests from external ticket snapshots (title + status).
 * In Progress → ativa, Done → feita, Scheduled/Blocked/Paused → pausada.
 * Waiting comment fills import `falta` unless the user already wrote one.
 * Does not create quests, does not clear user `falta`, does not mirror
 * descriptions, does not auto-pause To Do.
 */
export async function applyTicketSnapshots(
  raw: unknown,
): Promise<ApplyTicketSnapshotsResult> {
  const payload = ticketSnapshotsInputSchema.parse(raw);
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }

  const quests = await Quest.find({ where: { profileId: profile.id } });
  const byTicket = new Map<string, Quest[]>();
  for (const quest of quests) {
    for (const ticketId of quest.ticketIds) {
      const key = normalizeTicketId(ticketId);
      const list = byTicket.get(key) ?? [];
      list.push(quest);
      byTicket.set(key, list);
    }
  }

  const result: ApplyTicketSnapshotsResult = {
    updated: 0,
    markedFeita: 0,
    epicLinked: 0,
    unmatched: 0,
  };
  const updatedQuestIds = new Set<string>();
  const now = new Date();

  for (const issue of payload.issues) {
    const key = normalizeTicketId(issue.key);
    const matches = byTicket.get(key);
    if (!matches || matches.length === 0) {
      result.unmatched += 1;
      continue;
    }

    for (const quest of matches) {
      const { becameFeita, epicLinked } = applySnapshotToQuest(
        quest,
        issue,
        now,
      );
      await quest.save();

      if (!updatedQuestIds.has(quest.id)) {
        updatedQuestIds.add(quest.id);
        result.updated += 1;
      }
      if (becameFeita) {
        result.markedFeita += 1;
      }
      if (epicLinked) {
        result.epicLinked += 1;
      }
    }
  }

  return result;
}

/** Ticket keys currently linked to quests (for refresh fetch). */
export async function listLinkedTicketKeys(): Promise<string[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  const quests = await Quest.find({ where: { profileId: profile.id } });
  const keys = new Set<string>();
  for (const quest of quests) {
    for (const ticketId of quest.ticketIds) {
      keys.add(normalizeTicketId(ticketId));
    }
  }
  return [...keys].sort();
}

function applySnapshotToQuest(
  quest: Quest,
  issue: TicketSnapshot,
  now: Date,
): { becameFeita: boolean; epicLinked: boolean } {
  const key = normalizeTicketId(issue.key);
  const previousStatus = quest.status;
  let becameFeita = false;
  let epicLinked = false;

  quest.titulo = `[${key}] ${issue.summary}`;
  quest.ticketStatus = issue.status;
  quest.ticketSyncedAt = now;
  quest.atualizadoEm = now;

  if (issue.epicId) {
    const nextEpic = normalizeTicketId(issue.epicId);
    if (quest.epicId !== nextEpic) {
      quest.epicId = nextEpic;
      epicLinked = true;
    }
  }

  const mapped = mapExternalTicketStatus(issue.status);
  if (mapped === "feita" && previousStatus !== "feita") {
    quest.status = "feita";
    becameFeita = true;
    applyQuestCompletedAt(quest, issue, previousStatus, now);
  } else if (mapped === "feita") {
    applyQuestCompletedAt(quest, issue, previousStatus, now);
  } else if (mapped === "ativa" && previousStatus === "pausada") {
    quest.status = "ativa";
  } else if (isWaitingTicketStatus(issue.status) && previousStatus !== "feita") {
    quest.status = "pausada";
    if (quest.faltaSource !== "user") {
      const reason = issue.statusReason?.trim() ?? "";
      quest.falta = reason || `Status no Jira: ${issue.status}`;
      quest.faltaSource = "import";
    }
  }

  return { becameFeita, epicLinked };
}

function resolvedAtFromSnapshot(issue: TicketSnapshot, fallback: Date): Date {
  if (!issue.completedAt) {
    return fallback;
  }
  const parsed = new Date(issue.completedAt);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function applyQuestCompletedAt(
  quest: Quest,
  issue: TicketSnapshot,
  previousStatus: QuestStatus,
  now: Date,
): void {
  const mapped = mapExternalTicketStatus(issue.status);
  if (mapped !== "feita") {
    return;
  }
  const resolved = resolvedAtFromSnapshot(issue, now);
  if (previousStatus !== "feita") {
    quest.concluidaEm = resolved;
    return;
  }
  if (!quest.concluidaEm && issue.completedAt) {
    quest.concluidaEm = resolved;
  }
}
