import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  getDataDir,
  ingestCommit,
  type IngestCommitInput,
} from "@questlog/core";

export type QueuedIngestItem = {
  id: string;
  enqueuedAt: string;
  cwd: string;
  payload: {
    hash: string;
    repo: string;
    quando: string;
    assunto: string;
    resumo: string;
    branch: string | null;
    mensagemExtra?: string;
  };
};

type QueueFile = {
  items: QueuedIngestItem[];
};

export function getIngestQueuePath(): string {
  return join(getDataDir(), "ingest-queue.json");
}

function emptyQueue(): QueueFile {
  return { items: [] };
}

function readQueue(): QueueFile {
  const path = getIngestQueuePath();
  if (!existsSync(path)) {
    return emptyQueue();
  }

  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as QueueFile;
    if (!Array.isArray(raw.items)) {
      return emptyQueue();
    }
    return { items: raw.items };
  } catch {
    return emptyQueue();
  }
}

function writeQueue(queue: QueueFile): void {
  const path = getIngestQueuePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
}

export function enqueueIngestFailure(input: {
  cwd: string;
  payload: IngestCommitInput;
}): QueuedIngestItem {
  const queue = readQueue();
  const existing = queue.items.find(
    (item) =>
      item.payload.hash === input.payload.hash &&
      item.payload.repo === input.payload.repo,
  );
  if (existing) {
    return existing;
  }

  const item: QueuedIngestItem = {
    id: randomUUID(),
    enqueuedAt: new Date().toISOString(),
    cwd: input.cwd,
    payload: {
      hash: input.payload.hash,
      repo: input.payload.repo,
      quando:
        input.payload.quando instanceof Date
          ? input.payload.quando.toISOString()
          : String(input.payload.quando),
      assunto: input.payload.assunto,
      resumo: input.payload.resumo ?? "",
      branch: input.payload.branch ?? null,
      mensagemExtra: input.payload.mensagemExtra,
    },
  };

  queue.items.push(item);
  writeQueue(queue);
  return item;
}

export type FlushIngestQueueResult = {
  attempted: number;
  stored: number;
  remaining: number;
};

/** Replay queued ingest payloads. Successful items are removed. */
export async function flushIngestQueue(): Promise<FlushIngestQueueResult> {
  const queue = readQueue();
  if (queue.items.length === 0) {
    return { attempted: 0, stored: 0, remaining: 0 };
  }

  const remaining: QueuedIngestItem[] = [];
  let stored = 0;

  for (const item of queue.items) {
    try {
      await ingestCommit({
        hash: item.payload.hash,
        repo: item.payload.repo,
        quando: new Date(item.payload.quando),
        assunto: item.payload.assunto,
        resumo: item.payload.resumo,
        branch: item.payload.branch,
        mensagemExtra: item.payload.mensagemExtra,
      });
      stored += 1;
    } catch {
      remaining.push(item);
    }
  }

  writeQueue({ items: remaining });

  return {
    attempted: queue.items.length,
    stored,
    remaining: remaining.length,
  };
}
