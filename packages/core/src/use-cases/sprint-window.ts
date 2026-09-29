import { SprintPeriod } from "../db/entities/sprint-period.entity.js";
import { Profile } from "../db/entities/profile.entity.js";
import { getProfile } from "./profile.js";
import { ProfileRequiredError } from "./quest.js";
import {
  sprintWindowInputSchema,
  type SprintWindowInput,
  type SprintWindowView,
} from "./sprint-window.schemas.js";

export class SprintWindowNotConfiguredError extends Error {
  constructor() {
    super("Current sprint window is not configured");
    this.name = "SprintWindowNotConfiguredError";
  }
}

function calendarDayToUtcDate(day: string): Date {
  return new Date(`${day}T12:00:00.000Z`);
}

function utcDateToCalendarDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function viewFromProfile(profile: Profile): SprintWindowView | null {
  if (!profile.sprintInicio || !profile.sprintFim) {
    return null;
  }
  return {
    rotulo: profile.sprintRotulo,
    inicio: utcDateToCalendarDay(profile.sprintInicio),
    fim: utcDateToCalendarDay(profile.sprintFim),
  };
}

export async function getCurrentSprintWindow(): Promise<SprintWindowView | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }
  return viewFromProfile(profile);
}

export async function upsertCurrentSprintWindow(
  rawInput: SprintWindowInput,
): Promise<SprintWindowView> {
  const input = sprintWindowInputSchema.parse(rawInput);
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }

  profile.sprintInicio = calendarDayToUtcDate(input.inicio);
  profile.sprintFim = calendarDayToUtcDate(input.fim);
  profile.sprintRotulo = input.rotulo?.trim() ? input.rotulo.trim() : null;
  await profile.save();

  return viewFromProfile(profile)!;
}

export async function clearCurrentSprintWindow(): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }
  profile.sprintInicio = null;
  profile.sprintFim = null;
  profile.sprintRotulo = null;
  await profile.save();
}

export async function listClosedSprintPeriods(): Promise<SprintPeriod[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }
  return SprintPeriod.find({
    where: { profileId: profile.id },
    order: { fechadaEm: "DESC" },
  });
}

/** Move the configured window into local history and clear the profile fields. */
export async function archiveCurrentSprintWindow(): Promise<SprintPeriod> {
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }
  if (!profile.sprintInicio || !profile.sprintFim) {
    throw new SprintWindowNotConfiguredError();
  }

  const archived = SprintPeriod.create({
    profileId: profile.id,
    rotulo: profile.sprintRotulo,
    inicio: profile.sprintInicio,
    fim: profile.sprintFim,
    fechadaEm: new Date(),
  });
  await archived.save();

  profile.sprintInicio = null;
  profile.sprintFim = null;
  profile.sprintRotulo = null;
  await profile.save();

  return archived;
}
