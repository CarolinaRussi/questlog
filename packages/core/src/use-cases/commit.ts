import { In } from "typeorm";
import { Commit } from "../db/entities/commit.entity.js";
import { Quest } from "../db/entities/quest.entity.js";
import type { Profile } from "../db/entities/profile.entity.js";
import { getProfile } from "./profile.js";
import { ProfileRequiredError } from "./quest.js";
import {
  ingestCommitInputSchema,
  type IngestCommitInput,
} from "./commit.schemas.js";
import { extractTicketIds, questHasAnyTicket } from "./ticket-match.js";

export type IngestCommitResult = {
  commit: Commit;
  /** Null means Inbox. */
  questId: string | null;
  created: boolean;
  matchedBy: "ticket" | "branch" | "active" | "inbox" | "existing";
};

async function findOpenQuests(profileId: string): Promise<Quest[]> {
  return Quest.find({
    where: {
      profileId,
      status: In(["ativa", "pausada"]),
    },
    order: { atualizadoEm: "DESC" },
  });
}

export function resolveQuestForCommit(input: {
  profile: Profile;
  openQuests: Quest[];
  messageText: string;
  branch: string | null | undefined;
}): { questId: string | null; matchedBy: IngestCommitResult["matchedBy"] } {
  const { profile, openQuests, messageText, branch } = input;
  const messageTickets = extractTicketIds(messageText, profile.ticketPattern);

  for (const quest of openQuests) {
    if (questHasAnyTicket(quest.ticketIds, messageTickets)) {
      return { questId: quest.id, matchedBy: "ticket" };
    }
  }

  const branchPattern = profile.branchPattern ?? profile.ticketPattern;
  if (branch && branchPattern) {
    const branchTickets = extractTicketIds(branch, branchPattern);
    for (const quest of openQuests) {
      if (questHasAnyTicket(quest.ticketIds, branchTickets)) {
        return { questId: quest.id, matchedBy: "branch" };
      }
    }
  }

  if (profile.activeQuestId) {
    const activeQuest = openQuests.find(
      (quest) => quest.id === profile.activeQuestId,
    );
    if (activeQuest) {
      return { questId: activeQuest.id, matchedBy: "active" };
    }
  }

  return { questId: null, matchedBy: "inbox" };
}

export async function ingestCommit(
  rawInput: IngestCommitInput,
): Promise<IngestCommitResult> {
  const input = ingestCommitInputSchema.parse(rawInput);
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }

  const existing = await Commit.findOneBy({
    repo: input.repo,
    hash: input.hash,
  });
  if (existing) {
    return {
      commit: existing,
      questId: existing.questId,
      created: false,
      matchedBy: "existing",
    };
  }

  const messageText = [input.assunto, input.mensagemExtra ?? ""]
    .filter(Boolean)
    .join("\n");
  const openQuests = await findOpenQuests(profile.id);
  const resolution = resolveQuestForCommit({
    profile,
    openQuests,
    messageText,
    branch: input.branch,
  });

  const commit = Commit.create({
    profileId: profile.id,
    questId: resolution.questId,
    hash: input.hash,
    repo: input.repo,
    quando: input.quando,
    assunto: input.assunto,
    resumo: input.resumo,
  });
  await commit.save();

  if (resolution.questId) {
    const quest = openQuests.find((item) => item.id === resolution.questId);
    if (quest) {
      quest.atualizadoEm = new Date();
      await quest.save();
    }
  }

  return {
    commit,
    questId: resolution.questId,
    created: true,
    matchedBy: resolution.matchedBy,
  };
}
