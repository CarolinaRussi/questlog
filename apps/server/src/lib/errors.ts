import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import {
  ProfileRequiredError,
  QuestNotFoundError,
} from "@questlog/core";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "validation_error",
        details: error.flatten(),
      });
    }

    if (error instanceof QuestNotFoundError) {
      return reply.status(404).send({ error: "not_found", message: error.message });
    }

    if (error instanceof ProfileRequiredError) {
      return reply.status(400).send({
        error: "profile_required",
        message: error.message,
      });
    }

    app.log.error(error);
    return reply.status(500).send({ error: "internal_error" });
  });
}
