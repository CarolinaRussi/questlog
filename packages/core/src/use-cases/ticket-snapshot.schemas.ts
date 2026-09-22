import { z } from "zod";

/** Provider-agnostic ticket snapshot (title + status only). */
export const ticketSnapshotSchema = z.object({
  key: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  status: z.string().trim().min(1),
});

export const ticketSnapshotsInputSchema = z.object({
  issues: z.array(ticketSnapshotSchema).min(1),
});

export type TicketSnapshot = z.infer<typeof ticketSnapshotSchema>;
export type TicketSnapshotsInput = z.infer<typeof ticketSnapshotsInputSchema>;
