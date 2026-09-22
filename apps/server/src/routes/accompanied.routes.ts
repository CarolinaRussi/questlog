import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  listAccompaniedQuests,
  listArchiveQuests,
  listPendingQuests,
  pickNextFaltaForEpic,
  promoteEpic,
  promoteQuest,
  promoteQuestInputSchema,
  getProfile,
  resolveEpicTitles,
} from "@questlog/core";
import { epicTitlesForBoard } from "../lib/epic-titles.js";

const archiveQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(5000).optional(),
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

    const epicIds = [...byEpic.keys()].filter((epicId) => epicId.length > 0);
    // Local titles only — never block the board on Jira.
    const titles = await resolveEpicTitles(epicIds);
    void epicTitlesForBoard(epicIds);

    const epics = epicIds
      .map((epicId) => {
        const epicQuests = byEpic.get(epicId) ?? [];
        const next = pickNextFaltaForEpic(
          epicQuests,
          profile?.activeQuestId ?? null,
        );
        return {
          epicId,
          quests: epicQuests,
          nextFalta: next,
          openCount: epicQuests.length,
          title: titles[epicId] ?? "",
        };
      })
      .sort(
        (left, right) =>
          ticketNumber(right.epicId) - ticketNumber(left.epicId),
      );

    const ungrouped = byEpic.get("") ?? [];
    const pending = await listPendingQuests();

    return {
      epics,
      ungrouped,
      pending,
    };
  });

  app.get("/api/board/archive", async (request) => {
    const query = archiveQuerySchema.parse(request.query);
    const quests = await listArchiveQuests({
      query: query.q,
      limit: query.limit,
    });
    const epicIds = [
      ...new Set(
        quests
          .map((quest) => quest.epicId?.trim().toUpperCase() ?? "")
          .filter(Boolean),
      ),
    ];
    // Local titles first so the archive renders immediately with every quest.
    // Jira fill runs in background (Status Jira also syncs titles).
    const epicTitles = await resolveEpicTitles(epicIds);
    void epicTitlesForBoard(epicIds);
    return { quests, epicTitles };
  });

  app.post("/api/quests/:id/promote", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const body = promoteQuestInputSchema.parse(request.body ?? {});
    return promoteQuest(id, body);
  });

  app.post("/api/epics/:epicId/promote", async (request) => {
    const { epicId } = z
      .object({ epicId: z.string().trim().min(1) })
      .parse(request.params);
    const body = promoteQuestInputSchema.parse(request.body ?? {});
    return promoteEpic(epicId, body);
  });
}

function ticketNumber(value: string): number {
  const match = value.toUpperCase().match(/-(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}
