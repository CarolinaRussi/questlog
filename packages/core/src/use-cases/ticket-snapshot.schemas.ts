import { z } from "zod";

/** Provider-agnostic ticket snapshot (title + status + optional epic). */
export const ticketSnapshotSchema = z.object({
  key: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  status: z.string().trim().min(1),
  /** Parent/epic key when known (e.g. Jira parent). */
  epicId: z.string().trim().min(1).nullable().optional(),
  /** Why the ticket is waiting (Jira transition comment). */
  statusReason: z.string().trim().min(1).nullable().optional(),
  /** Issue resolution / Done transition time (ISO 8601), when known. */
  completedAt: z.iso.datetime().optional().nullable(),
});

export const ticketSnapshotsInputSchema = z.object({
  issues: z.array(ticketSnapshotSchema).min(1),
});

export type TicketSnapshot = z.infer<typeof ticketSnapshotSchema>;
export type TicketSnapshotsInput = z.infer<typeof ticketSnapshotsInputSchema>;
