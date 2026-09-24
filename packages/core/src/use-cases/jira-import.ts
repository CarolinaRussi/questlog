import { Quest } from "../db/entities/quest.entity.js";
import type { QuestStatus } from "../domain/types.js";
import { getProfile } from "./profile.js";
import { ProfileRequiredError } from "./quest.js";
import {
  jiraImportFileSchema,
  type JiraIssueImport,
} from "./jira-import.schemas.js";
import { mapExternalTicketStatus } from "./ticket-snapshot.js";

export type ImportJiraResult = {
  created: number;
  skippedExisting: number;
  skippedCancelled: number;
  byStatus: Record<QuestStatus, number>;
};

export async function importJiraIssues(
  raw: unknown,
): Promise<ImportJiraResult> {
  const payload = jiraImportFileSchema.parse(raw);
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }

  const existingQuests = await Quest.find({
    where: { profileId: profile.id },
  });
  const knownTickets = new Set(
    existingQuests.flatMap((quest) =>
      quest.ticketIds.map((ticketId) => ticketId.toUpperCase()),
    ),
  );

  const result: ImportJiraResult = {
    created: 0,
    skippedExisting: 0,
    skippedCancelled: 0,
    byStatus: { ativa: 0, pausada: 0, feita: 0 },
  };

  for (const issue of payload.issues) {
    await importOneIssue(profile.id, issue, knownTickets, result);
  }

  return result;
}

async function importOneIssue(
  profileId: string,
  issue: JiraIssueImport,
  knownTickets: Set<string>,
  result: ImportJiraResult,
): Promise<void> {
  const key = issue.key.toUpperCase();
  if (knownTickets.has(key)) {
    result.skippedExisting += 1;
    return;
  }

  const mapped = mapExternalTicketStatus(issue.status);
  if (mapped === "skip") {
    result.skippedCancelled += 1;
    return;
  }

  const quest = Quest.create({
    profileId,
    titulo: `[${issue.key}] ${issue.summary}`,
    status: mapped,
    ticketIds: [issue.key],
    epicId: issue.epicId ? issue.epicId.trim().toUpperCase() : null,
    epicScope: "partial",
    repos: [],
    falta: mapped === "pausada" ? `Status no Jira: ${issue.status}` : "",
    faltaSource: mapped === "pausada" ? "import" : null,
    watching: false,
    atualizadoEm: new Date(),
  });
  await quest.save();
  knownTickets.add(key);

  result.created += 1;
  result.byStatus[mapped] += 1;
}
