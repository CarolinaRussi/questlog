import { Profile } from "../db/entities/profile.entity.js";
import {
  upsertProfileInputSchema,
  type UpsertProfileInput,
} from "./profile.schemas.js";

function assertValidRegex(pattern: string, fieldName: string): void {
  try {
    new RegExp(pattern);
  } catch {
    throw new Error(`${fieldName} is not a valid regular expression`);
  }
}

/** MVP: single profile row (first created). */
export async function getProfile(): Promise<Profile | null> {
  return Profile.findOne({
    where: {},
    order: { createdAt: "ASC" },
  });
}

export async function upsertProfile(
  rawInput: UpsertProfileInput,
): Promise<Profile> {
  const input = upsertProfileInputSchema.parse(rawInput);
  assertValidRegex(input.ticketPattern, "ticketPattern");
  if (input.branchPattern) {
    assertValidRegex(input.branchPattern, "branchPattern");
  }

  const existing = await getProfile();
  if (existing) {
    existing.name = input.name ?? existing.name;
    existing.repos = input.repos;
    existing.ticketPattern = input.ticketPattern;
    existing.ticketPrefixLabel =
      input.ticketPrefixLabel ?? existing.ticketPrefixLabel;
    existing.ticketBaseUrl = input.ticketBaseUrl ?? existing.ticketBaseUrl;
    existing.ticketHasEpic = input.ticketHasEpic ?? existing.ticketHasEpic;
    if (input.branchPattern !== undefined) {
      existing.branchPattern = input.branchPattern;
    }
    if (input.commitHint !== undefined) {
      existing.commitHint = input.commitHint;
    }
    existing.locale = input.locale ?? existing.locale;
    if (input.activeQuestId !== undefined) {
      existing.activeQuestId = input.activeQuestId;
    }
    await existing.save();
    return existing;
  }

  const profile = Profile.create({
    name: input.name ?? "default",
    repos: input.repos,
    ticketPattern: input.ticketPattern,
    ticketPrefixLabel: input.ticketPrefixLabel ?? "Ticket",
    ticketBaseUrl: input.ticketBaseUrl ?? "",
    ticketHasEpic: input.ticketHasEpic ?? false,
    branchPattern: input.branchPattern ?? null,
    commitHint: input.commitHint ?? null,
    locale: input.locale ?? "pt-BR",
    activeQuestId: input.activeQuestId ?? null,
  });
  await profile.save();
  return profile;
}
