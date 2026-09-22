import { EpicNote } from "../db/entities/epic-note.entity.js";
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
