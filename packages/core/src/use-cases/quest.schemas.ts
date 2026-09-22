import { z } from "zod";

const questRepoSchema = z.object({
  nome: z.string().trim().min(1),
  path: z.string().trim().min(1),
  branch: z.string().trim().min(1),
});

export const createQuestInputSchema = z.object({
  titulo: z.string().trim().min(1),
  ticketIds: z.array(z.string().trim().min(1)).default([]),
  epicId: z.string().trim().min(1).nullable().optional(),
  epicScope: z.enum(["partial", "full"]).optional(),
  repos: z.array(questRepoSchema).default([]),
  falta: z.string().optional(),
  setActive: z.boolean().optional(),
});

export const updateQuestInputSchema = z.object({
  titulo: z.string().trim().min(1).optional(),
  ticketIds: z.array(z.string().trim().min(1)).optional(),
  epicId: z.string().trim().min(1).nullable().optional(),
  epicScope: z.enum(["partial", "full"]).optional(),
  repos: z.array(questRepoSchema).optional(),
  falta: z.string().optional(),
});

export const pauseQuestInputSchema = z.object({
  falta: z.string().trim().min(1),
});

export type CreateQuestInput = z.infer<typeof createQuestInputSchema>;
export type UpdateQuestInput = z.infer<typeof updateQuestInputSchema>;
export type PauseQuestInput = z.infer<typeof pauseQuestInputSchema>;
