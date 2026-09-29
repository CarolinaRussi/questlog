import type { Quest } from "../db/entities/quest.entity.js";
import { generateSprintSummaryWithGemini } from "../integrations/gemini-rest.js";
import { GeminiNotConfiguredError } from "./complement-epic-notes.js";
import { getProfile } from "./profile.js";
import { ProfileRequiredError } from "./quest.js";
import { getLocalSecrets } from "./secrets.js";
import {
  appendIncludedQuestsToCurrentSprint,
  listPendingQuestsForCurrentSprint,
} from "./sprint-summary.js";
import {
  getCurrentSprintWindow,
  SprintWindowNotConfiguredError,
} from "./sprint-window.js";

export type SprintSummaryGenerator = (prompt: string) => Promise<string>;

export type ComplementSprintSummaryResult = {
  resumo: string;
  addedQuestCount: number;
  usedGemini: boolean;
};

export function formatQuestsAsSprintList(quests: Quest[]): string {
  return quests
    .map((quest) => {
      const tickets = quest.ticketIds.join(", ") || "—";
      const epic = quest.epicId ? ` · épico ${quest.epicId}` : "";
      return `- ${quest.titulo} (${tickets})${epic}`;
    })
    .join("\n");
}

function appendResumo(existing: string, addition: string): string {
  const base = existing.trim();
  const next = addition.trim();
  if (!base) {
    return next;
  }
  if (!next) {
    return base;
  }
  return `${base}\n\n${next}`;
}

function buildGeminiPrompt(input: {
  sprintLabel: string | null;
  windowLabel: string;
  existingResumo: string;
  newQuestsBlock: string;
}): string {
  return `Você ajuda a manter um resumo pessoal de sprint no QuestLog (retrospectiva minha, não relatório de time).

Sprint: ${input.sprintLabel?.trim() || "(sem rótulo)"} · ${input.windowLabel}

Regras:
- Responda SOMENTE JSON válido: {"summary":"..."}
- COMPLEMENTE o resumo existente com as quests novas abaixo; preserve o que ainda vale; não reescreva do zero.
- Tom: português do Brasil, parágrafo(s) curto(s), primeira pessoa quando fizer sentido.
- Não invente trabalho que não aparece nas quests listadas.

Resumo atual:
${input.existingResumo.trim() || "(vazio)"}

Quests novas desta complementação:
${input.newQuestsBlock}
`;
}

export async function complementSprintSummary(options?: {
  generate?: SprintSummaryGenerator;
}): Promise<ComplementSprintSummaryResult> {
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }
  const window = await getCurrentSprintWindow();
  if (!window) {
    throw new SprintWindowNotConfiguredError();
  }

  const pending = await listPendingQuestsForCurrentSprint();
  if (pending.length === 0) {
    return {
      resumo: profile.sprintResumoText,
      addedQuestCount: 0,
      usedGemini: false,
    };
  }

  const listBlock = formatQuestsAsSprintList(pending);
  const windowLabel = `${window.inicio} → ${window.fim}`;
  let nextResumo = profile.sprintResumoText;
  let usedGemini = false;

  const generate =
    options?.generate ??
    (async (prompt: string) => {
      const secrets = getLocalSecrets();
      if (!secrets.geminiApiKey) {
        throw new GeminiNotConfiguredError();
      }
      const generated = await generateSprintSummaryWithGemini({
        apiKey: secrets.geminiApiKey,
        prompt,
      });
      return generated.summary;
    });

  try {
    const prompt = buildGeminiPrompt({
      sprintLabel: window.rotulo,
      windowLabel,
      existingResumo: profile.sprintResumoText,
      newQuestsBlock: listBlock,
    });
    nextResumo = await generate(prompt);
    usedGemini = true;
  } catch (error) {
    if (!(error instanceof GeminiNotConfiguredError)) {
      throw error;
    }
    nextResumo = appendResumo(
      profile.sprintResumoText,
      formatQuestsAsSprintList(pending),
    );
  }

  profile.sprintResumoText = nextResumo.trim();
  await profile.save();
  await appendIncludedQuestsToCurrentSprint(pending.map((quest) => quest.id));

  return {
    resumo: profile.sprintResumoText,
    addedQuestCount: pending.length,
    usedGemini,
  };
}
