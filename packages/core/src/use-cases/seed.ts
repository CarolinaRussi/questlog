import {
  upsertProfileInputSchema,
  type UpsertProfileInput,
} from "./profile.schemas.js";
import { upsertProfile } from "./profile.js";
import type { Profile } from "../db/entities/profile.entity.js";

export async function seedProfile(
  rawInput: UpsertProfileInput,
): Promise<Profile> {
  const input = upsertProfileInputSchema.parse(rawInput);
  return upsertProfile(input);
}
