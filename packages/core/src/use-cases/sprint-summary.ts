import { Quest } from "../db/entities/quest.entity.js";
import { SprintPeriod } from "../db/entities/sprint-period.entity.js";
import { getProfile } from "./profile.js";
import { ProfileRequiredError } from "./quest.js";
import { SprintWindowNotConfiguredError } from "./sprint-window.js";

export class SprintPeriodNotFoundError extends Error {
  constructor(sprintPeriodId: string) {
    super(`Sprint period not found: ${sprintPeriodId}`);
    this.name = "SprintPeriodNotFoundError";
  }
}

export function sprintWindowUtcBounds(
  inicio: Date,
  fim: Date,
): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(
      inicio.getUTCFullYear(),
      inicio.getUTCMonth(),
      inicio.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const end = new Date(
    Date.UTC(
      fim.getUTCFullYear(),
      fim.getUTCMonth(),
      fim.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
  return { start, end };
}

export function isConcluidaEmInWindow(
  concluidaEm: Date,
  inicio: Date,
  fim: Date,
): boolean {
  const { start, end } = sprintWindowUtcBounds(inicio, fim);
  return concluidaEm >= start && concluidaEm <= end;
}

export async function listCompletedQuestsInWindow(
  inicio: Date,
  fim: Date,
): Promise<Quest[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  const { start, end } = sprintWindowUtcBounds(inicio, fim);
  const quests = await Quest.find({
    where: { profileId: profile.id, status: "feita" },
    order: { concluidaEm: "ASC" },
  });

  return quests.filter(
    (quest) =>
      quest.concluidaEm != null &&
      quest.concluidaEm >= start &&
      quest.concluidaEm <= end,
  );
}

function excludeIncluded(quests: Quest[], includedQuestIds: string[]): Quest[] {
  const included = new Set(includedQuestIds);
  return quests.filter((quest) => !included.has(quest.id));
}

/** Quests feitas na janela da sprint atual ainda não “consumidas” pelo resumo. */
export async function listPendingQuestsForCurrentSprint(): Promise<Quest[]> {
  const profile = await getProfile();
  if (!profile?.sprintInicio || !profile.sprintFim) {
    return [];
  }

  const completed = await listCompletedQuestsInWindow(
    profile.sprintInicio,
    profile.sprintFim,
  );
  return excludeIncluded(completed, profile.sprintIncludedQuestIds);
}

export async function listPendingQuestsForClosedSprint(
  sprintPeriodId: string,
): Promise<Quest[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  const period = await SprintPeriod.findOneBy({
    id: sprintPeriodId,
    profileId: profile.id,
  });
  if (!period) {
    throw new SprintPeriodNotFoundError(sprintPeriodId);
  }

  const completed = await listCompletedQuestsInWindow(period.inicio, period.fim);
  return excludeIncluded(completed, period.includedQuestIds);
}

export async function getClosedSprintPeriod(
  sprintPeriodId: string,
): Promise<SprintPeriod | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }
  return SprintPeriod.findOneBy({
    id: sprintPeriodId,
    profileId: profile.id,
  });
}

export async function appendIncludedQuestsToCurrentSprint(
  questIds: string[],
): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }
  if (!profile.sprintInicio || !profile.sprintFim) {
    throw new SprintWindowNotConfiguredError();
  }

  const merged = new Set(profile.sprintIncludedQuestIds);
  for (const questId of questIds) {
    merged.add(questId);
  }
  profile.sprintIncludedQuestIds = [...merged];
  await profile.save();
}
