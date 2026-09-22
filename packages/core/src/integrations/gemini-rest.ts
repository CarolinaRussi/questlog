export type GeminiGenerateResult = {
  overview: string;
  progress: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Call Gemini generateContent and parse JSON { overview, progress }.
 * API key is passed by the caller (from local secrets).
 */
export async function generateEpicNotesWithGemini(input: {
  apiKey: string;
  prompt: string;
  model?: string;
}): Promise<GeminiGenerateResult> {
  const model = input.model ?? DEFAULT_MODEL;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(input.apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ?? `Gemini request failed (HTTP ${response.status})`,
    );
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
  if (typeof record.overview !== "string" || typeof record.progress !== "string") {
    throw new Error("Gemini JSON must include string overview and progress");
  }

  return {
    overview: record.overview.trim(),
    progress: record.progress.trim(),
  };
}
