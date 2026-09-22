import { z } from "zod";

/** Provider-agnostic ticket snapshot (title + status + optional epic). */
export const ticketSnapshotSchema = z.object({
  key: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  status: z.string().trim().min(1),
  /** Parent/epic key when known (e.g. Jira parent). */
  epicId: z.string().trim().min(1).nullable().optional(),
});

export const ticketSnapshotsInputSchema = z.object({
  issues: z.array(ticketSnapshotSchema).min(1),
});

export type TicketSnapshot = z.infer<typeof ticketSnapshotSchema>;
export type TicketSnapshotsInput = z.infer<typeof ticketSnapshotsInputSchema>;
