import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import {
  GeminiNotConfiguredError,
  ProfileRequiredError,
  QuestNotFoundError,
  SprintWindowNotConfiguredError,
} from "@questlog/core";
import { JiraCredentialsMissingError } from "../routes/tickets.routes.js";

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

    if (error instanceof JiraCredentialsMissingError) {
      return reply.status(400).send({
        error: "jira_credentials_missing",
        message: error.message,
      });
    }

    if (error instanceof SprintWindowNotConfiguredError) {
      return reply.status(400).send({
        error: "sprint_window_not_configured",
        message: error.message,
      });
    }

    if (error instanceof GeminiNotConfiguredError) {
      return reply.status(400).send({
        error: "gemini_not_configured",
        message: error.message,
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: "internal_error",
      message: error instanceof Error ? error.message : "internal_error",
    });
  });
}
