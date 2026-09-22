import { Quest } from "../db/entities/quest.entity.js";
import { generateEpicNotesWithGemini } from "../integrations/gemini-rest.js";
import {
  fetchJiraIssueContexts,
  type JiraRestCredentials,
} from "../integrations/jira-rest.js";
import { listCommits } from "./list-commits.js";
import {
  getOrCreateEpicNote,
  saveEpicNoteFields,
} from "./epic-note.js";
import { getLocalSecrets } from "./secrets.js";
import { normalizeTicketId } from "./ticket-match.js";
import { getProfile } from "./profile.js";
import { ProfileRequiredError } from "./quest.js";

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super(
      "Gemini API key not configured. Add it in Settings (or secrets.json).",
    );
    this.name = "GeminiNotConfiguredError";
  }
}

export type EpicNotesGenerator = (prompt: string) => Promise<{
  overview: string;
  progress: string;
}>;

export type ComplementEpicNotesResult = {
  epicId: string;
  overview: string;
  progress: string;
  questCount: number;
  usedJiraContext: boolean;
};

function buildPrompt(input: {
  epicId: string;
  existingOverview: string;
  existingProgress: string;
  questsBlock: string;
  jiraBlock: string;
}): string {
  return `Você ajuda a manter notas pessoais de trabalho no QuestLog (não é um clone do Jira).

Épico: ${input.epicId}

Regras obrigatórias:
- Responda SOMENTE JSON válido: {"overview":"...","progress":"..."}
- overview = o que o épico é / objetivo (contexto). Se já existir overview, COMPLEMENTE ou ajuste com informação nova; não apague o que ainda vale; não reescreva do zero sem necessidade.
- progress = o que EU (a pessoa) fui fazendo nas quests (sessões de trabalho). Se já existir progress, ACRESCENTE o que é novo; preserve o histórico útil.
- Fazer / concluir UMA tarefa NÃO significa que o épico inteiro está feito. Nunca diga que o épico acabou só porque uma quest foi marcada feita. epic_scope padrão é partial.
- Não invente trabalho que não aparece nos dados.
- Escreva em português do Brasil, tom claro e curto (parágrafos curtos).

Overview atual:
${input.existingOverview.trim() || "(vazio)"}

Progress atual:
${input.existingProgress.trim() || "(vazio)"}

Quests ligadas a este épico (QuestLog):
${input.questsBlock}

Contexto opcional do Jira (descrição/comentários lidos na hora; não espelhar no board):
${input.jiraBlock || "(não disponível)"}
`;
}

async function listQuestsForEpic(epicId: string): Promise<Quest[]> {
  const profile = await getProfile();
  if (!profile) {
    throw new ProfileRequiredError();
  }

  const normalized = normalizeTicketId(epicId);
  const quests = await Quest.find({ where: { profileId: profile.id } });
  return quests.filter(
    (quest) =>
      quest.epicId != null &&
      normalizeTicketId(quest.epicId) === normalized,
  );
}

/**
 * Incrementally update epic overview + progress via Gemini (or injected generator).
 */
export async function complementEpicNotes(
  epicId: string,
  options?: {
    jiraCredentials?: JiraRestCredentials | null;
    generate?: EpicNotesGenerator;
  },
): Promise<ComplementEpicNotesResult> {
  const normalized = normalizeTicketId(epicId);
  const quests = await listQuestsForEpic(normalized);
  const note = await getOrCreateEpicNote(normalized);

  const questBlocks: string[] = [];
  for (const quest of quests) {
    const commits = await listCommits({ questId: quest.id });
    const commitLines = commits
      .slice(0, 5)
      .map((commit) => `- ${commit.assunto} (${commit.hash.slice(0, 7)})`)
      .join("\n");

    questBlocks.push(
      [
        `## ${quest.titulo}`,
        `status=${quest.status}; tickets=${quest.ticketIds.join(", ") || "—"}; scope=${quest.epicScope}`,
        quest.ticketStatus ? `jiraStatus=${quest.ticketStatus}` : null,
        quest.falta ? `falta=${quest.falta}` : null,
        commitLines ? `commits:\n${commitLines}` : "commits: (nenhum)",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  let usedJiraContext = false;
  let jiraBlock = "";
  if (options?.jiraCredentials && quests.length > 0) {
    const keys = [
      normalized,
      ...quests.flatMap((quest) => quest.ticketIds),
    ];
    try {
      const contexts = await fetchJiraIssueContexts(
        options.jiraCredentials,
        keys,
      );
      usedJiraContext = contexts.length > 0;
      jiraBlock = contexts
        .map((context) => {
          const commentLines = context.comments
            .map((comment) => `- ${comment.slice(0, 400)}`)
            .join("\n");
          return [
            `### ${context.key} — ${context.summary} [${context.status}]`,
            context.description
              ? `description:\n${context.description.slice(0, 2000)}`
              : "description: (vazia)",
            commentLines ? `comments:\n${commentLines}` : null,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n");
    } catch {
      jiraBlock = "(falha ao ler Jira; seguindo só com dados locais)";
    }
  }

  const prompt = buildPrompt({
    epicId: normalized,
    existingOverview: note.overview,
    existingProgress: note.progress,
    questsBlock:
      questBlocks.length > 0 ? questBlocks.join("\n\n") : "(nenhuma quest)",
    jiraBlock,
  });

  const generate =
    options?.generate ??
    (async (promptText: string) => {
      const secrets = getLocalSecrets();
      if (!secrets.geminiApiKey) {
        throw new GeminiNotConfiguredError();
      }
      return generateEpicNotesWithGemini({
        apiKey: secrets.geminiApiKey,
        prompt: promptText,
      });
    });

  const generated = await generate(prompt);
  const saved = await saveEpicNoteFields(normalized, {
    overview: generated.overview,
    progress: generated.progress,
  });

  return {
    epicId: saved.epicId,
    overview: saved.overview,
    progress: saved.progress,
    questCount: quests.length,
    usedJiraContext,
  };
}
