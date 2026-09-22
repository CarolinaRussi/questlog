import { EpicNote } from "../db/entities/epic-note.entity.js";
import { Quest } from "../db/entities/quest.entity.js";
import { normalizeTicketId } from "./ticket-match.js";
import { getProfile } from "./profile.js";
import { ProfileRequiredError } from "./quest.js";

export async function listEpicNotes(): Promise<EpicNote[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  return EpicNote.find({
    where: { profileId: profile.id },
    order: { updatedAt: "DESC" },
  });
}

export async function getEpicNote(epicId: string): Promise<EpicNote | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }

  const normalized = normalizeTicketId(epicId);
  return EpicNote.findOne({
    where: { profileId: profile.id, epicId: normalized },
  });
}

export async function getOrCreateEpicNote(epicId: string): Promise<EpicNote> {
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }

  const normalized = normalizeTicketId(epicId);
  const existing = await EpicNote.findOne({
    where: { profileId: profile.id, epicId: normalized },
  });
  if (existing) {
    return existing;
  }

  const note = EpicNote.create({
    profileId: profile.id,
    epicId: normalized,
    title: "",
    overview: "",
    progress: "",
  });
  await note.save();
  return note;
}

export async function saveEpicNoteFields(
  epicId: string,
  fields: { overview: string; progress: string },
): Promise<EpicNote> {
  const note = await getOrCreateEpicNote(epicId);
  note.overview = fields.overview;
  note.progress = fields.progress;
  await note.save();
  return note;
}

export async function saveEpicTitle(
  epicId: string,
  title: string,
): Promise<EpicNote> {
  const note = await getOrCreateEpicNote(epicId);
  const trimmed = title.trim();
  if (trimmed && note.title !== trimmed) {
    note.title = trimmed;
    await note.save();
  }
  return note;
}

export async function upsertEpicTitles(
  entries: { epicId: string; title: string }[],
): Promise<number> {
  let updated = 0;
  for (const entry of entries) {
    const trimmed = entry.title.trim();
    if (!trimmed) continue;
    const before = (await getEpicNote(entry.epicId))?.title.trim() ?? "";
    await saveEpicTitle(entry.epicId, trimmed);
    if (before !== trimmed) {
      updated += 1;
    }
  }
  return updated;
}

/** Epic keys currently linked on quests. */
export async function listLinkedEpicKeys(): Promise<string[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  const quests = await Quest.find({ where: { profileId: profile.id } });
  const keys = new Set<string>();
  for (const quest of quests) {
    if (quest.epicId?.trim()) {
      keys.add(normalizeTicketId(quest.epicId));
    }
  }
  return [...keys].sort();
}

/**
 * Resolve display titles for epic keys: stored Jira/title → quest that is the
 * epic issue. Never uses Gemini overview (that is description, not title).
 */
export async function resolveEpicTitles(
  epicIds: string[],
): Promise<Record<string, string>> {
  const profile = await getProfile();
  if (!profile) {
    return {};
  }

  const unique = [
    ...new Set(
      epicIds.map((epicId) => normalizeTicketId(epicId)).filter(Boolean),
    ),
  ];
  if (unique.length === 0) {
    return {};
  }

  const notes = await EpicNote.find({ where: { profileId: profile.id } });
  const noteByEpic = new Map(
    notes.map((note) => [normalizeTicketId(note.epicId), note]),
  );

  const quests = await Quest.find({ where: { profileId: profile.id } });
  const questTitleByEpic = new Map<string, string>();
  for (const quest of quests) {
    for (const ticketId of quest.ticketIds) {
      const key = normalizeTicketId(ticketId);
      if (!unique.includes(key)) continue;
      const stripped = stripTicketPrefix(quest.titulo, key);
      if (stripped) {
        questTitleByEpic.set(key, stripped);
      }
    }
  }

  const result: Record<string, string> = {};
  for (const epicId of unique) {
    const note = noteByEpic.get(epicId);
    if (note?.title.trim()) {
      result[epicId] = note.title.trim();
      continue;
    }
    const fromQuest = questTitleByEpic.get(epicId);
    if (fromQuest) {
      result[epicId] = fromQuest;
      await saveEpicTitle(epicId, fromQuest);
    }
  }
  return result;
}

/**
 * Fill missing epic titles via a fetcher (typically Jira summary by key).
 */
export async function ensureEpicTitles(
  epicIds: string[],
  fetchSummaries: (
    keys: string[],
  ) => Promise<Array<{ key: string; summary: string }>>,
): Promise<Record<string, string>> {
  const resolved = await resolveEpicTitles(epicIds);
  const unique = [
    ...new Set(
      epicIds.map((epicId) => normalizeTicketId(epicId)).filter(Boolean),
    ),
  ];
  const missing = unique.filter((epicId) => !resolved[epicId]);
  if (missing.length === 0) {
    return resolved;
  }

  const fetched = await fetchSummaries(missing);
  if (fetched.length > 0) {
    await upsertEpicTitles(
      fetched.map((issue) => ({
        epicId: issue.key,
        title: issue.summary,
      })),
    );
  }

  return resolveEpicTitles(epicIds);
}

function stripTicketPrefix(titulo: string, ticketId: string): string {
  const pattern = new RegExp(
    `^\\[\\s*${escapeRegExp(ticketId)}\\s*\\]\\s*`,
    "i",
  );
  return titulo.replace(pattern, "").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

