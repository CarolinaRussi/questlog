import { In } from "typeorm";
import { z } from "zod";
import { Commit } from "../db/entities/commit.entity.js";
import { Quest } from "../db/entities/quest.entity.js";
import { getProfile } from "./profile.js";
import {
  pauseQuest,
  ProfileRequiredError,
  QuestNotFoundError,
  resumeQuest,
  setActiveQuest,
} from "./quest.js";

export function isImportFaltaStub(falta: string): boolean {
  return falta.trim().startsWith("Status no Jira:");
}

export function isAccompaniedQuest(
  quest: Quest,
  options?: { hasCommits?: boolean; activeQuestId?: string | null },
): boolean {
  if (quest.status === "feita") {
    return false;
  }
  if (quest.status === "ativa") {
    return true;
  }
  if (quest.watching) {
    return true;
  }
  if (quest.status === "pausada" && quest.faltaSource === "user") {
    return true;
  }
  if (options?.hasCommits) {
    return true;
  }
  if (options?.activeQuestId && quest.id === options.activeQuestId) {
    return true;
  }
  return false;
}

/**
 * Pick the falta line to show on an epic home card.
 * Priority: active ingest quest → paused with user falta (newest) → first open.
 */
export function pickNextFaltaForEpic(
  quests: Quest[],
  activeQuestId: string | null,
): { questId: string; falta: string; titulo: string } | null {
  const open = quests.filter((quest) => quest.status !== "feita");
  if (open.length === 0) {
    return null;
  }

  const active = open.find((quest) => quest.id === activeQuestId);
  if (active) {
    return {
      questId: active.id,
      falta: active.faltaSource === "user" ? active.falta : "",
      titulo: active.titulo,
    };
  }

  const pausedWithFalta = open
    .filter(
      (quest) =>
        quest.status === "pausada" &&
        quest.faltaSource === "user" &&
        quest.falta.trim().length > 0,
    )
    .sort(
      (left, right) =>
        right.atualizadoEm.getTime() - left.atualizadoEm.getTime(),
    );

  const picked = pausedWithFalta[0] ?? open[0];
  if (!picked) {
    return null;
  }
  return {
    questId: picked.id,
    falta:
      picked.faltaSource === "user" && picked.falta.trim()
        ? picked.falta
        : "",
    titulo: picked.titulo,
  };
}

/** All open quests (ativa + pausada) — the home board. */
export async function listOpenQuests(): Promise<Quest[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  return Quest.find({
    where: [
      { profileId: profile.id, status: "ativa" },
      { profileId: profile.id, status: "pausada" },
    ],
    order: { atualizadoEm: "DESC" },
  });
}

export async function listAccompaniedQuests(): Promise<Quest[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  const openQuests = await listOpenQuests();

  const questIds = openQuests.map((quest) => quest.id);
  const commitQuestIds = new Set<string>();
  if (questIds.length > 0) {
    const commits = await Commit.find({
      where: {
        profileId: profile.id,
        questId: In(questIds),
      },
      select: ["questId"],
    });
    for (const commit of commits) {
      if (commit.questId) {
        commitQuestIds.add(commit.questId);
      }
    }
  }

  return openQuests.filter((quest) =>
    isAccompaniedQuest(quest, {
      hasCommits: commitQuestIds.has(quest.id),
      activeQuestId: profile.activeQuestId,
    }),
  );
}

export async function listArchiveQuests(options?: {
  query?: string;
  limit?: number;
}): Promise<Quest[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  // Archive = done work (open quests live on home).
  const all = await Quest.find({
    where: { profileId: profile.id, status: "feita" },
    order: { atualizadoEm: "DESC" },
  });

  let archive = all;

  const query = options?.query?.trim().toLowerCase();
  if (query) {
    archive = archive.filter((quest) => {
      const haystack = [
        quest.titulo,
        quest.epicId ?? "",
        ...quest.ticketIds,
        quest.falta,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
    const limit = options?.limit ?? 200;
    return archive.slice(0, limit);
  }

  if (options?.limit != null) {
    return archive.slice(0, options.limit);
  }
  return archive;
}

export async function listArchiveSuggestions(limit = 3): Promise<Quest[]> {
  const archive = await listArchiveQuests({ limit: 50 });
  return archive
    .filter((quest) => quest.status !== "feita")
    .slice(0, limit);
}

export const promoteQuestInputSchema = z.object({
  mode: z.enum(["watch", "resume", "pause"]).default("watch"),
  falta: z.string().trim().min(3).optional(),
});

export type PromoteQuestInput = z.infer<typeof promoteQuestInputSchema>;

/**
 * Bring an archive quest into home focus.
 * - watch: mark watching (keep status)
 * - resume: set ativa + watching + active ingest
 * - pause: require falta, set pausada + user falta + watching
 */
export async function promoteQuest(
  questId: string,
  rawInput: PromoteQuestInput = { mode: "watch" },
): Promise<Quest> {
  const input = promoteQuestInputSchema.parse(rawInput);
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }

  const quest = await Quest.findOneBy({ id: questId });
  if (!quest || quest.profileId !== profile.id) {
    throw new QuestNotFoundError(questId);
  }

  if (input.mode === "pause") {
    if (!input.falta) {
      throw new Error("falta is required to pause while promoting");
    }
    return pauseQuest(questId, { falta: input.falta });
  }

  if (input.mode === "resume") {
    await resumeQuest(questId);
    return setActiveQuest(questId);
  }

  // watch: reopen done quests so they can appear on home again
  if (quest.status === "feita") {
    quest.status = "pausada";
  }
  quest.watching = true;
  quest.atualizadoEm = new Date();
  await quest.save();
  return quest;
}

/**
 * Promote every quest under an epic (watch = accompany whole epic).
 * Pause is not supported here — falta is per quest.
 */
export async function promoteEpic(
  epicId: string,
  rawInput: PromoteQuestInput = { mode: "watch" },
): Promise<{ epicId: string; promoted: number; quests: Quest[] }> {
  const input = promoteQuestInputSchema.parse(rawInput);
  if (input.mode === "pause") {
    throw new Error(
      "pause requires falta per quest; promote quests individually",
    );
  }

  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }

  const normalized = epicId.trim().toUpperCase();
  if (!normalized) {
    throw new Error("epicId is required");
  }

  const quests = await Quest.find({
    where: { profileId: profile.id },
    order: { atualizadoEm: "DESC" },
  });
  const inEpic = quests.filter(
    (quest) => quest.epicId?.trim().toUpperCase() === normalized,
  );

  const promoted: Quest[] = [];
  for (const quest of inEpic) {
    promoted.push(await promoteQuest(quest.id, { mode: "watch" }));
  }

  if (input.mode === "resume" && promoted.length > 0) {
    const firstOpen =
      promoted.find((quest) => quest.status !== "feita") ?? promoted[0];
    if (firstOpen) {
      await resumeQuest(firstOpen.id);
      await setActiveQuest(firstOpen.id);
      const refreshed = await Quest.findOneBy({ id: firstOpen.id });
      if (refreshed) {
        const index = promoted.findIndex((quest) => quest.id === refreshed.id);
        if (index >= 0) promoted[index] = refreshed;
      }
    }
  }

  return {
    epicId: normalized,
    promoted: promoted.length,
    quests: promoted,
  };
}

