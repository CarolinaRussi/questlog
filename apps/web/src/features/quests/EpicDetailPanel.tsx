import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  fetchEpicNotes,
  fetchSecrets,
  summarizeEpic,
  ticketHref,
  type Profile,
  type Quest,
  type QuestStatus,
} from "../../shared/lib/api";

type EpicDetailPanelProps = {
  epicId: string;
  quests: Quest[];
  profile: Profile;
  selectedQuestId: string | null;
  onSelectQuest: (questId: string) => void;
  questActions: ReactNode;
};

export function EpicDetailPanel({
  epicId,
  quests,
  profile,
  selectedQuestId,
  onSelectQuest,
  questActions,
}: EpicDetailPanelProps) {
  const queryClient = useQueryClient();
  const epicHref = ticketHref(profile.ticketBaseUrl, epicId);

  const notesQuery = useQuery({
    queryKey: ["epic-notes"],
    queryFn: fetchEpicNotes,
  });

  const secretsQuery = useQuery({
    queryKey: ["secrets"],
    queryFn: fetchSecrets,
  });

  const note =
    notesQuery.data?.find(
      (item) => item.epicId.toUpperCase() === epicId.toUpperCase(),
    ) ?? null;

  const summarizeMutation = useMutation({
    mutationFn: () => summarizeEpic(epicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["epic-notes"] });
      void queryClient.invalidateQueries({ queryKey: ["board-revision"] });
    },
  });

  const geminiConfigured = secretsQuery.data?.geminiConfigured ?? false;
  const selectedQuest =
    quests.find((quest) => quest.id === selectedQuestId) ?? null;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide">Épico</p>
        <h3
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {epicHref ? (
            <a
              href={epicHref}
              target="_blank"
              rel="noreferrer"
              style={{ color: "inherit" }}
            >
              {epicId}
            </a>
          ) : (
            epicId
          )}
        </h3>
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          {quests.length} tarefa{quests.length === 1 ? "" : "s"} neste épico
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold uppercase tracking-wide">
          Tarefas
        </h4>
        {quests.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
            Nenhuma quest ligada a este épico.
          </p>
        ) : null}
        {quests.map((quest) => {
          const selected = quest.id === selectedQuestId;
          return (
            <button
              key={quest.id}
              type="button"
              onClick={() => onSelectQuest(quest.id)}
              className="w-full rounded-xl border px-3 py-2.5 text-left transition"
              style={{
                borderColor: selected ? "var(--ql-accent)" : "var(--ql-border)",
                background: selected ? "#f0fdfa" : "#fff",
              }}
            >
              <p className="font-medium leading-snug">{quest.titulo}</p>
              <p className="mt-0.5 text-sm" style={{ color: "var(--ql-muted)" }}>
                {statusLabel(quest.status)}
                {quest.ticketStatus ? ` · ${quest.ticketStatus}` : ""}
                {quest.status === "pausada" && quest.falta
                  ? ` · falta: ${quest.falta}`
                  : ""}
              </p>
            </button>
          );
        })}
      </div>

      {selectedQuest ? questActions : (
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          Clique numa tarefa para pausar, retomar ou marcar feita.
        </p>
      )}

      <div
        className="space-y-3 rounded-xl border px-3 py-3"
        style={{ borderColor: "var(--ql-border)", background: "#fafaf9" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">
              Resumo do épico
            </p>
            <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
              Junta as tarefas acima — complementar, não recomeçar do zero.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--ql-accent)" }}
            disabled={summarizeMutation.isPending || !geminiConfigured}
            onClick={() => summarizeMutation.mutate()}
          >
            {summarizeMutation.isPending
              ? "Resumindo…"
              : note?.overview || note?.progress
                ? "Complementar resumo"
                : "Gerar resumo"}
          </button>
        </div>

        {!geminiConfigured ? (
          <p className="text-sm text-amber-900">
            Configure a chave Gemini em Settings para gerar resumos.
          </p>
        ) : null}

        {summarizeMutation.isError ? (
          <p className="text-sm text-red-800">
            {summarizeMutation.error instanceof Error
              ? summarizeMutation.error.message
              : "Erro ao resumir"}
          </p>
        ) : null}

        {summarizeMutation.isSuccess ? (
          <p className="text-sm" style={{ color: "var(--ql-accent)" }}>
            Resumo atualizado
            {summarizeMutation.data.usedJiraContext
              ? " (incluiu contexto do Jira)"
              : ""}
            .
          </p>
        ) : null}

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">
              Overview
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
              {note?.overview?.trim() || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">
              O que eu fiz
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
              {note?.progress?.trim() || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: QuestStatus): string {
  if (status === "ativa") return "Ativa";
  if (status === "pausada") return "Pausada";
  return "Feita";
}
