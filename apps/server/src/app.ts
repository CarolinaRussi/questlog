import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerErrorHandler } from "./lib/errors.js";
import { registerBoardRoutes } from "./routes/board.routes.js";
import { registerCommitRoutes } from "./routes/commits.routes.js";
import { registerEpicRoutes } from "./routes/epics.routes.js";
import { registerHealthRoutes } from "./routes/health.routes.js";
import { registerProfileRoutes } from "./routes/profile.routes.js";
import { registerQuestRoutes } from "./routes/quests.routes.js";
import { registerSecretsRoutes } from "./routes/secrets.routes.js";
import { registerTicketRoutes } from "./routes/tickets.routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
  });

  registerErrorHandler(app);

  await registerHealthRoutes(app);
  await registerBoardRoutes(app);
  await registerProfileRoutes(app);
  await registerSecretsRoutes(app);
  await registerQuestRoutes(app);
  await registerCommitRoutes(app);
  await registerTicketRoutes(app);
  await registerEpicRoutes(app);

  return app;
}
