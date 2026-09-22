import { z } from "zod";

export const ingestCommitInputSchema = z.object({
  hash: z.string().trim().min(1),
  repo: z.string().trim().min(1),
  quando: z.coerce.date(),
  assunto: z.string(),
  resumo: z.string().default(""),
  branch: z.string().nullable().optional(),
  /** Extra text to scan for tickets (e.g. commit body). Assunto is always scanned. */
  mensagemExtra: z.string().optional(),
});

export type IngestCommitInput = z.infer<typeof ingestCommitInputSchema>;
