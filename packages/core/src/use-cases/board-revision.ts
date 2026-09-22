import { Commit } from "../db/entities/commit.entity.js";
import { EpicNote } from "../db/entities/epic-note.entity.js";
import { Quest } from "../db/entities/quest.entity.js";
import { getProfile } from "./profile.js";

export type BoardRevision = {
  /** Opaque token; changes when profile, quests, or commits change. */
  revision: string;
};

function toIso(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

/**
 * Lightweight board fingerprint for live polling.
 * Clients poll this and refetch full lists only when the token changes.
 */
export async function getBoardRevision(): Promise<BoardRevision> {
  const profile = await getProfile();
  if (!profile) {
    return { revision: "empty" };
  }

  const questAgg = await Quest.createQueryBuilder("q")
    .select("MAX(q.atualizadoEm)", "maxAt")
    .addSelect("COUNT(q.id)", "count")
    .where("q.profileId = :profileId", { profileId: profile.id })
    .getRawOne<{ maxAt: string | null; count: string }>();

  const commitAgg = await Commit.createQueryBuilder("c")
    .select("MAX(c.createdAt)", "maxAt")
    .addSelect("COUNT(c.id)", "count")
    .where("c.profileId = :profileId", { profileId: profile.id })
    .getRawOne<{ maxAt: string | null; count: string }>();

  const noteAgg = await EpicNote.createQueryBuilder("n")
    .select("MAX(n.updatedAt)", "maxAt")
    .addSelect("COUNT(n.id)", "count")
    .where("n.profileId = :profileId", { profileId: profile.id })
    .getRawOne<{ maxAt: string | null; count: string }>();

  const revision = [
    profile.id,
    profile.activeQuestId ?? "",
    toIso(profile.updatedAt),
    toIso(questAgg?.maxAt),
    questAgg?.count ?? "0",
    toIso(commitAgg?.maxAt),
    commitAgg?.count ?? "0",
    toIso(noteAgg?.maxAt),
    noteAgg?.count ?? "0",
  ].join("|");

  return { revision };
}