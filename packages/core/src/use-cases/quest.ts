import type { QuestStatus } from "../domain/types.js";
import { Quest } from "../db/entities/quest.entity.js";
import { getProfile } from "./profile.js";
import {
  createQuestInputSchema,
  pauseQuestInputSchema,
  updateQuestInputSchema,
  type CreateQuestInput,
  type PauseQuestInput,
  type UpdateQuestInput,
} from "./quest.schemas.js";

export class QuestNotFoundError extends Error {
  constructor(questId: string) {
    super(`Quest not found: ${questId}`);
    this.name = "QuestNotFoundError";
  }
}

export class ProfileRequiredError extends Error {
  constructor() {
    super("Profile is required before creating quests");
    this.name = "ProfileRequiredError";
  }
}

async function requireProfile() {
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }
  return profile;
}

async function requireQuest(questId: string): Promise<Quest> {
  const quest = await Quest.findOneBy({ id: questId });
  if (!quest) {
    throw new QuestNotFoundError(questId);
  }
  return quest;
}

function touch(quest: Quest): void {
  quest.atualizadoEm = new Date();
}

export async function listQuests(filters?: {
  status?: QuestStatus;
}): Promise<Quest[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  return Quest.find({
    where: {
      profileId: profile.id,
      ...(filters?.status ? { status: filters.status } : {}),
    },
    order: { atualizadoEm: "DESC" },
  });
}

export async function getQuest(questId: string): Promise<Quest | null> {
  return Quest.findOneBy({ id: questId });
}

export async function createQuest(rawInput: CreateQuestInput): Promise<Quest> {
  const input = createQuestInputSchema.parse(rawInput);
  const profile = await requireProfile();

  const quest = Quest.create({
    profileId: profile.id,
    titulo: input.titulo,
    status: "ativa",
    ticketIds: input.ticketIds,
    epicId: input.epicId ?? null,
    epicScope: input.epicScope ?? "partial",
    repos: input.repos,
    falta: input.falta ?? "",
    faltaSource: input.falta?.trim() ? "user" : null,
    watching: true,
    atualizadoEm: new Date(),
  });
  await quest.save();

  if (input.setActive) {
    profile.activeQuestId = quest.id;
    await profile.save();
  }

  return quest;
}

export async function updateQuest(
  questId: string,
  rawInput: UpdateQuestInput,
): Promise<Quest> {
  const input = updateQuestInputSchema.parse(rawInput);
  const quest = await requireQuest(questId);

  if (input.titulo !== undefined) quest.titulo = input.titulo;
  if (input.ticketIds !== undefined) quest.ticketIds = input.ticketIds;
  if (input.epicId !== undefined) quest.epicId = input.epicId;
  if (input.epicScope !== undefined) quest.epicScope = input.epicScope;
  if (input.repos !== undefined) quest.repos = input.repos;
  if (input.falta !== undefined) {
    quest.falta = input.falta;
    quest.faltaSource = input.falta.trim() ? "user" : null;
  }

  touch(quest);
  await quest.save();
  return quest;
}

export async function pauseQuest(
  questId: string,
  rawInput: PauseQuestInput,
): Promise<Quest> {
  const input = pauseQuestInputSchema.parse(rawInput);
  const quest = await requireQuest(questId);

  quest.status = "pausada";
  quest.falta = input.falta;
  quest.faltaSource = "user";
  quest.watching = true;
  touch(quest);
  await quest.save();
  return quest;
}

export async function resumeQuest(questId: string): Promise<Quest> {
  const quest = await requireQuest(questId);
  quest.status = "ativa";
  quest.watching = true;
  touch(quest);
  await quest.save();
  return quest;
}

export async function completeQuest(questId: string): Promise<Quest> {
  const quest = await requireQuest(questId);
  const profile = await getProfile();

  quest.status = "feita";
  quest.watching = false;
  touch(quest);
  await quest.save();

  if (profile?.activeQuestId === questId) {
    profile.activeQuestId = null;
    await profile.save();
  }

  return quest;
}

export async function setActiveQuest(questId: string): Promise<Quest> {
  const profile = await requireProfile();
  const quest = await requireQuest(questId);

  if (quest.profileId !== profile.id) {
    throw new QuestNotFoundError(questId);
  }

  quest.watching = true;
  touch(quest);
  await quest.save();

  profile.activeQuestId = quest.id;
  await profile.save();
  return quest;
}
