export type GeminiGenerateResult = {
  overview: string;
  progress: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; status?: string; code?: number };
};

const MODEL_CANDIDATES = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
] as const;

function isRetryableGeminiError(
  status: number,
  message: string | undefined,
): boolean {
  if (status === 429 || status === 503) return true;
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("high demand") ||
    normalized.includes("try again later") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("unavailable")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateOnce(input: {
  apiKey: string;
  prompt: string;
  model: string;
}): Promise<GeminiGenerateResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": input.apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | GeminiResponse
    | null;
  const message =
    payload?.error?.message ?? `Gemini request failed (HTTP ${response.status})`;

  if (!response.ok) {
    const error = new Error(message) as Error & {
      status?: number;
      retryable?: boolean;
    };
    error.status = response.status;
    error.retryable = isRetryableGeminiError(response.status, message);
    throw error;
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini response was not valid JSON");
  }

  const record = parsed as { overview?: unknown; progress?: unknown };
  if (
    typeof record.overview !== "string" ||
    typeof record.progress !== "string"
  ) {
    throw new Error("Gemini JSON must include string overview and progress");
  }

  return {
    overview: record.overview.trim(),
    progress: record.progress.trim(),
  };
}

/**
 * Call Gemini generateContent and parse JSON { overview, progress }.
 * Retries briefly on high demand and falls back across flash models.
 */
export async function generateEpicNotesWithGemini(input: {
  apiKey: string;
  prompt: string;
  model?: string;
}): Promise<GeminiGenerateResult> {
  const models = input.model
    ? [input.model, ...MODEL_CANDIDATES.filter((model) => model !== input.model)]
    : [...MODEL_CANDIDATES];

  let lastError: Error | null = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await generateOnce({
          apiKey: input.apiKey,
          prompt: input.prompt,
          model,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        const retryable =
          "retryable" in err && Boolean((err as { retryable?: boolean }).retryable);

        if (retryable && attempt === 0) {
          await sleep(1500);
          continue;
        }
        if (retryable) {
          break;
        }
        throw err;
      }
    }
  }

  const message = lastError?.message ?? "Gemini request failed";
  if (isRetryableGeminiError(503, message)) {
    throw new Error(
      "Gemini está com alta demanda agora. Espera 1–2 min e tenta de novo (não é problema do QuestLog).",
    );
  }
  throw lastError ?? new Error(message);
}
