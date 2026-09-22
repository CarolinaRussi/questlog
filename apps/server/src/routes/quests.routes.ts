import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  completeQuest,
  createQuest,
  createQuestInputSchema,
  getQuest,
  listQuests,
  pauseQuest,
  pauseQuestInputSchema,
  QuestNotFoundError,
  resumeQuest,
  setActiveQuest,
  updateQuest,
  updateQuestInputSchema,
  type QuestStatus,
} from "@questlog/core";

const statusQuerySchema = z.object({
  status: z.enum(["ativa", "pausada", "feita"]).optional(),
});

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function registerQuestRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/quests", async (request) => {
    const query = statusQuerySchema.parse(request.query);
    return listQuests(
      query.status ? { status: query.status as QuestStatus } : undefined,
    );
  });

  app.get("/api/quests/:id", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const quest = await getQuest(id);
    if (!quest) {
      throw new QuestNotFoundError(id);
    }
    return quest;
  });

  app.post("/api/quests", async (request) => {
    const input = createQuestInputSchema.parse(request.body);
    return createQuest(input);
  });

  app.patch("/api/quests/:id", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = updateQuestInputSchema.parse(request.body);
    return updateQuest(id, input);
  });

  app.post("/api/quests/:id/pause", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = pauseQuestInputSchema.parse(request.body);
    return pauseQuest(id, input);
  });

  app.post("/api/quests/:id/resume", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return resumeQuest(id);
  });

  app.post("/api/quests/:id/complete", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return completeQuest(id);
  });

  app.post("/api/quests/:id/activate", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return setActiveQuest(id);
  });
}
