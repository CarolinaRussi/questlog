import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  listAccompaniedQuests,
  listArchiveQuests,
  listArchiveSuggestions,
  pickNextFaltaForEpic,
  promoteQuest,
  promoteQuestInputSchema,
  getProfile,
} from "@questlog/core";

const archiveQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function registerAccompaniedRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/api/board/home", async () => {
    const profile = await getProfile();
    const quests = await listAccompaniedQuests();
    const byEpic = new Map<string, typeof quests>();

    for (const quest of quests) {
      const key = quest.epicId?.trim().toUpperCase() || "";
      const list = byEpic.get(key) ?? [];
      list.push(quest);
      byEpic.set(key, list);
    }

    const epics = [...byEpic.entries()]
      .filter(([epicId]) => epicId.length > 0)
      .map(([epicId, epicQuests]) => {
        const next = pickNextFaltaForEpic(
          epicQuests,
          profile?.activeQuestId ?? null,
        );
        return {
          epicId,
          quests: epicQuests,
          nextFalta: next,
          openCount: epicQuests.length,
        };
      })
      .sort((left, right) => left.epicId.localeCompare(right.epicId));

    const ungrouped = byEpic.get("") ?? [];

    return {
      epics,
      ungrouped,
      suggestions: await listArchiveSuggestions(3),
    };
  });

  app.get("/api/board/archive", async (request) => {
    const query = archiveQuerySchema.parse(request.query);
    return listArchiveQuests({
      query: query.q,
      limit: query.limit,
    });
  });

  app.post("/api/quests/:id/promote", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = promoteQuestInputSchema.parse(request.body ?? {});
    return promoteQuest(id, body);
  });
}
