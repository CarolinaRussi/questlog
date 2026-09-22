import { IsNull } from "typeorm";
import { Commit } from "../db/entities/commit.entity.js";
import { getProfile } from "./profile.js";

export async function listCommits(filters?: {
  questId?: string | null;
  inboxOnly?: boolean;
}): Promise<Commit[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  if (filters?.inboxOnly) {
    return Commit.find({
      where: { profileId: profile.id, questId: IsNull() },
      order: { quando: "DESC" },
    });
  }

  if (filters?.questId) {
    return Commit.find({
      where: { profileId: profile.id, questId: filters.questId },
      order: { quando: "DESC" },
    });
  }

  return Commit.find({
    where: { profileId: profile.id },
    order: { quando: "DESC" },
  });
}
