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
import { visibleQuestFalta } from "../../shared/lib/falta";

type EpicDetailPanelProps = {
  epicId: string;
  epicTitle?: string | null;
  quests: Quest[];
  profile: Profile;
  selectedQuestId: string | null;
  onSelectQuest: (questId: string) => void;
  questActions: ReactNode;
  /** Archive: memory first (overview + o que eu fiz) before task list. */
  notesFirst?: boolean;
};

export function EpicDetailPanel({
  epicId,
  epicTitle: epicTitleProp,
  quests,
  profile,
  selectedQuestId,
  onSelectQuest,
  questActions,
  notesFirst = false,
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

  const epicTitle = epicTitleProp?.trim() || note?.title?.trim() || null;

  const summarizeMutation = useMutation({
    mutationFn: () => summarizeEpic(epicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["epic-notes"] });
      void queryClient.invalidateQueries({ queryKey: ["board-revision"] });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      const overview = note?.overview?.trim() || "(sem overview ainda)";
      const progress = note?.progress?.trim() || "(sem progresso ainda)";
      const tasks = quests
        .map(
          (quest) =>
            `- ${quest.titulo} [${statusLabel(quest.status)}]` +
            (visibleQuestFalta(quest)
              ? ` — falta: ${visibleQuestFalta(quest)}`
              : ""),
        )
        .join("\n");
      const text = [
        `Épico ${epicId}`,
        "",
        "Overview",
        overview,
        "",
        "O que eu fiz",
        progress,
        "",
        "Tarefas",
        tasks || "(nenhuma)",
      ].join("\n");
      await navigator.clipboard.writeText(text);
      return text;
    },
  });

  const geminiConfigured = secretsQuery.data?.geminiConfigured ?? false;
  const faltaQuests = quests.filter(
    (quest) => quest.status !== "feita" && visibleQuestFalta(quest).length > 0,
  );

  const memoryBlock = (
    <div
      className="space-y-3 rounded-xl border px-3 py-3"
      style={{ borderColor: "var(--ql-border)", background: "#fafaf9" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">
            Memória do épico
          </p>
          <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
            Overview + o que você foi fazendo (pra retomar ou currículo).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ borderColor: "var(--ql-border)" }}
            disabled={copyMutation.isPending}
            onClick={() => copyMutation.mutate()}
          >
            {copyMutation.isSuccess ? "Copiado" : "Copiar resumo"}
          </button>
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
                ? "Complementar"
                : "Gerar resumo"}
          </button>
        </div>
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
  );

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
        {epicTitle ? (
          <p className="text-base font-medium leading-snug">{epicTitle}</p>
        ) : null}
      </div>

      {notesFirst ? memoryBlock : null}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold uppercase tracking-wide">
          O que falta
        </h4>
        {faltaQuests.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
            Nenhuma falta registrada ainda. Pause uma tarefa e anote o que
            falta.
          </p>
        ) : (
          faltaQuests.map((quest) => (
            <button
              key={quest.id}
              type="button"
              onClick={() => onSelectQuest(quest.id)}
              className="w-full rounded-xl px-3 py-3 text-left"
              style={{ background: "#f0fdf4" }}
            >
              <p className="text-base font-medium leading-snug">{quest.falta}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--ql-muted)" }}>
                em {quest.titulo}
              </p>
            </button>
          ))
        )}
      </div>

      {notesFirst ? null : memoryBlock}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold uppercase tracking-wide">
          Tarefas
        </h4>
        {quests.map((quest) => {
          const selected = quest.id === selectedQuestId;
          return (
            <div
              key={quest.id}
              className="overflow-hidden rounded-xl border"
              style={{
                borderColor: selected ? "var(--ql-accent)" : "var(--ql-border)",
                background: selected ? "#f0fdfa" : "#fff",
              }}
            >
              <button
                type="button"
                onClick={() => onSelectQuest(quest.id)}
                className="w-full px-3 py-2.5 text-left"
              >
                <p className="font-medium leading-snug">{quest.titulo}</p>
                <p
                  className="mt-0.5 text-sm"
                  style={{ color: "var(--ql-muted)" }}
                >
                  {statusLabel(quest.status)}
                  {quest.ticketStatus ? ` · ${quest.ticketStatus}` : ""}
                </p>
              </button>
              {selected ? (
                <div
                  className="border-t px-3 py-3"
                  style={{ borderColor: "var(--ql-border)" }}
                >
                  {questActions ?? (
                    <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
                      Sem ações disponíveis.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
        {!selectedQuestId ? (
          <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
            Clique numa tarefa para pausar, retomar ou marcar feita.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function statusLabel(status: QuestStatus): string {
  if (status === "ativa") return "Ativa";
  if (status === "pausada") return "Pausada";
  return "Feita";
}
