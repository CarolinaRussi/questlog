import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  archiveCurrentSprintWindow,
  complementSprintSummary,
  getCurrentSprintWindow,
  getProfile,
  listClosedSprintPeriods,
  listPendingQuestsForCurrentSprint,
  sprintWindowInputSchema,
  upsertCurrentSprintWindow,
} from "@questlog/core";

const sprintPeriodParamsSchema = z.object({
  id: z.string().uuid(),
});

function mapClosedPeriod(period: {
  id: string;
  rotulo: string | null;
  inicio: Date;
  fim: Date;
  fechadaEm: Date;
  resumoText: string;
  includedQuestIds: string[];
}) {
  return {
    id: period.id,
    rotulo: period.rotulo,
    inicio: period.inicio.toISOString().slice(0, 10),
    fim: period.fim.toISOString().slice(0, 10),
    fechadaEm: period.fechadaEm.toISOString(),
    resumo: period.resumoText,
    includedQuestIds: period.includedQuestIds,
  };
}

export async function registerSprintRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/sprint/current", async () => {
    const profile = await getProfile();
    const window = await getCurrentSprintWindow();
    const pending = await listPendingQuestsForCurrentSprint();
    return {
      window,
      resumo: profile?.sprintResumoText ?? "",
      pendingQuestIds: pending.map((quest) => quest.id),
      pendingCount: pending.length,
    };
  });

  app.get("/api/sprint/history", async () => {
    const periods = await listClosedSprintPeriods();
    return periods.map(mapClosedPeriod);
  });

  app.put("/api/sprint/window", async (request) => {
    const input = sprintWindowInputSchema.parse(request.body);
    const window = await upsertCurrentSprintWindow(input);
    return { window };
  });

  app.post("/api/sprint/complement", async () => complementSprintSummary());

  app.post("/api/sprint/archive", async () => {
    const archived = await archiveCurrentSprintWindow();
    return mapClosedPeriod(archived);
  });

  app.get("/api/sprint/history/:id", async (request, reply) => {
    const { id } = sprintPeriodParamsSchema.parse(request.params);
    const periods = await listClosedSprintPeriods();
    const period = periods.find((row) => row.id === id);
    if (!period) {
      return reply.status(404).send({ error: "not_found" });
    }
    return mapClosedPeriod(period);
  });
}
