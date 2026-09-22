import { z } from "zod";
import type { ProfileRepo } from "../domain/types.js";

const profileRepoSchema = z.object({
  nome: z.string().trim().min(1),
  path: z.string().trim().min(1),
});

export const upsertProfileInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  repos: z.array(profileRepoSchema),
  ticketPattern: z.string().trim().min(1),
  ticketPrefixLabel: z.string().trim().min(1).optional(),
  ticketBaseUrl: z.string().optional(),
  ticketHasEpic: z.boolean().optional(),
  branchPattern: z.string().trim().min(1).nullable().optional(),
  commitHint: z.string().nullable().optional(),
  locale: z.string().trim().min(1).optional(),
  activeQuestId: z.string().uuid().nullable().optional(),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileInputSchema>;

export type { ProfileRepo };
