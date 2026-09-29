import { z } from "zod";

const calendarDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const sprintWindowInputSchema = z
  .object({
    rotulo: z.string().trim().min(1).nullable().optional(),
    inicio: calendarDaySchema,
    fim: calendarDaySchema,
  })
  .refine(
    (value) => value.fim >= value.inicio,
    { message: "fim must be on or after inicio", path: ["fim"] },
  );

export type SprintWindowInput = z.infer<typeof sprintWindowInputSchema>;

export type SprintWindowView = {
  rotulo: string | null;
  inicio: string;
  fim: string;
};
