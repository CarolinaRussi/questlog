import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { getDataDir } from "../paths/get-data-dir.js";

const secretsFileSchema = z.object({
  geminiApiKey: z.string().optional(),
});

export type LocalSecrets = {
  geminiApiKey: string | null;
};

export type LocalSecretsPublic = {
  geminiConfigured: boolean;
};

export function getSecretsPath(): string {
  return join(getDataDir(), "secrets.json");
}

function readSecretsFile(): z.infer<typeof secretsFileSchema> {
  const path = getSecretsPath();
  if (!existsSync(path)) {
    return {};
  }

  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return secretsFileSchema.parse(raw);
  } catch {
    return {};
  }
}

function writeSecretsFile(data: z.infer<typeof secretsFileSchema>): void {
  const path = getSecretsPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function getLocalSecrets(): LocalSecrets {
  const file = readSecretsFile();
  const key = file.geminiApiKey?.trim() || null;
  return { geminiApiKey: key };
}

/** Safe for HTTP — never returns the raw key. */
export function getLocalSecretsPublic(): LocalSecretsPublic {
  const secrets = getLocalSecrets();
  return { geminiConfigured: Boolean(secrets.geminiApiKey) };
}

export function upsertLocalSecrets(input: {
  geminiApiKey?: string | null;
}): LocalSecretsPublic {
  const file = readSecretsFile();

  if (input.geminiApiKey !== undefined) {
    const trimmed = input.geminiApiKey?.trim() ?? "";
    if (trimmed.length === 0) {
      delete file.geminiApiKey;
    } else {
      file.geminiApiKey = trimmed;
    }
  }

  writeSecretsFile(file);
  return getLocalSecretsPublic();
}
