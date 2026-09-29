import { finalizeExpiredCurrentSprint } from "@questlog/core";
import type { FastifyBaseLogger } from "fastify";

/** Complement + archive when manual sprint end passed. Fail-open. */
export function startSprintStartupFinalize(log: FastifyBaseLogger): void {
  void runSprintStartupFinalize(log);
}

async function runSprintStartupFinalize(log: FastifyBaseLogger): Promise<void> {
  try {
    const result = await finalizeExpiredCurrentSprint();
    if (!result) {
      log.info("Sprint startup finalize skipped (no expired window)");
      return;
    }
    log.info(result, "Sprint startup finalize done");
  } catch (error) {
    log.warn({ err: error }, "Sprint startup finalize failed");
  }
}
