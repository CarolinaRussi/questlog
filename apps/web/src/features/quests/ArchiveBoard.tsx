import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchArchive,
  promoteQuest,
  type Quest,
  type QuestStatus,
} from "../../shared/lib/api";
import { PauseQuestPanel } from "./PauseQuestPanel";

type ArchiveBoardProps = {
  onBack: () => void;
};

export function ArchiveBoard({ onBack }: ArchiveBoardProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [pausingQuest, setPausingQuest] = useState<Quest | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const archiveQuery = useQuery({
    queryKey: ["board-archive", search],
    queryFn: () => fetchArchive(search),
  });

  const promoteMutation = useMutation({
    mutationFn: ({
      questId,
      mode,
      falta,
    }: {
      questId: string;
      mode: "watch" | "resume" | "pause";
      falta?: string;
    }) => promoteQuest(questId, { mode, falta }),
    onSuccess: (_quest, variables) => {
      setPausingQuest(null);
      setErrorFeedback(null);
      setFeedback(
        variables.mode === "watch"
          ? "Agora está no board."
          : variables.mode === "resume"
            ? "Retomada — voltou ao agora."
            : "Pausada com falta — no agora.",
      );
      void queryClient.invalidateQueries({ queryKey: ["board-archive"] });
      void queryClient.invalidateQueries({ queryKey: ["board-home"] });
      void queryClient.invalidateQueries({ queryKey: ["board-revision"] });
    },
    onError: (error) => {
      setErrorFeedback(
        error instanceof Error ? error.message : "Erro ao promover",
      );
    },
  });

  const quests = archiveQuery.data ?? [];
  const byEpic = groupArchiveByEpic(quests);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button
            type="button"
            className="mb-2 text-sm font-semibold"
            style={{ color: "var(--ql-accent)" }}
            onClick={onBack}
          >
            ← Agora
          </button>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Arquivo
          </h2>
          <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
            Índice de épicos, busca e o que ainda não acompanha.
          </p>
        </div>
      </header>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(query.trim());
        }}
      >
        <input
          className="min-w-[12rem] flex-1 rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: "var(--ql-border)" }}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar título, ticket, épico…"
        />
        <button
          type="submit"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--ql-accent)" }}
        >
          Buscar
        </button>
      </form>

      {feedback ? (
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: "var(--ql-border)", background: "#f0fdf4" }}
        >
          {feedback}
        </div>
      ) : null}

      {errorFeedback ? (
        <div
          className="rounded-xl border px-3 py-2 text-sm text-red-800"
          style={{ borderColor: "#fecaca", background: "#fef2f2" }}
        >
          {errorFeedback}
        </div>
      ) : null}

      {archiveQuery.isLoading ? (
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-xl bg-stone-200" />
          <div className="h-16 animate-pulse rounded-xl bg-stone-200" />
        </div>
      ) : null}

      {archiveQuery.isError ? (
        <p className="text-red-800">
          {archiveQuery.error instanceof Error
            ? archiveQuery.error.message
            : "Erro ao carregar arquivo"}
        </p>
      ) : null}

      {!archiveQuery.isLoading && quests.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          {search
            ? "Nada encontrado com essa busca."
            : "Arquivo vazio — tudo que existe já está no agora, ou ainda não há quests."}
        </p>
      ) : null}

      {byEpic.map((group) => (
        <section key={group.key} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            {group.label}
          </h3>
          <div className="space-y-2">
            {group.quests.map((quest) => (
              <div
                key={quest.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-3"
                style={{ borderColor: "var(--ql-border)", background: "#fff" }}
              >
                <div className="min-w-0">
                  <p className="font-medium">{quest.titulo}</p>
                  <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
                    {statusLabel(quest.status)}
                    {quest.ticketIds.length > 0
                      ? ` · ${quest.ticketIds.join(", ")}`
                      : ""}
                  </p>
                </div>
                {quest.status !== "feita" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60"
                      style={{ borderColor: "var(--ql-border)" }}
                      disabled={promoteMutation.isPending}
                      onClick={() =>
                        promoteMutation.mutate({
                          questId: quest.id,
                          mode: "watch",
                        })
                      }
                    >
                      Acompanhar
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60"
                      style={{ borderColor: "var(--ql-border)" }}
                      disabled={promoteMutation.isPending}
                      onClick={() =>
                        promoteMutation.mutate({
                          questId: quest.id,
                          mode: "resume",
                        })
                      }
                    >
                      Retomar
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      style={{ background: "var(--ql-accent)" }}
                      disabled={promoteMutation.isPending}
                      onClick={() => setPausingQuest(quest)}
                    >
                      Pausar + falta
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}

      {pausingQuest ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Fechar"
            onClick={() => setPausingQuest(null)}
          />
          <aside
            className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l bg-white p-5 shadow-xl"
            style={{ borderColor: "var(--ql-border)" }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3
                className="text-lg font-bold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Pausar + acompanhar
              </h3>
              <button
                type="button"
                className="rounded-lg border px-2 py-1 text-sm"
                style={{ borderColor: "var(--ql-border)" }}
                onClick={() => setPausingQuest(null)}
              >
                Fechar
              </button>
            </div>
            <PauseQuestPanel
              questTitulo={pausingQuest.titulo}
              isPending={promoteMutation.isPending}
              onCancel={() => setPausingQuest(null)}
              onConfirm={(falta) =>
                promoteMutation.mutate({
                  questId: pausingQuest.id,
                  mode: "pause",
                  falta,
                })
              }
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function groupArchiveByEpic(
  quests: Quest[],
): { key: string; label: string; quests: Quest[] }[] {
  const map = new Map<string, Quest[]>();
  for (const quest of quests) {
    const key = quest.epicId?.trim().toUpperCase() || "";
    const list = map.get(key) ?? [];
    list.push(quest);
    map.set(key, list);
  }

  return [...map.entries()]
    .map(([key, groupQuests]) => ({
      key: key || "__none__",
      label: key || "Sem épico",
      quests: groupQuests,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function statusLabel(status: QuestStatus): string {
  if (status === "ativa") return "Ativa";
  if (status === "pausada") return "Pausada";
  return "Feita";
}
