import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchArchive,
  fetchCommits,
  promoteEpic,
  promoteQuest,
  type Profile,
  type Quest,
  type QuestStatus,
} from "../../shared/lib/api";
import { EpicDetailPanel } from "./EpicDetailPanel";
import { PauseQuestPanel } from "./PauseQuestPanel";

type ArchiveBoardProps = {
  profile: Profile;
  onBack: () => void;
};

type EpicGroup = {
  epicId: string;
  quests: Quest[];
  openCount: number;
};

export function ArchiveBoard({ profile, onBack }: ArchiveBoardProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [prefixTab, setPrefixTab] = useState<string | null>(null);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
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
          ? "Agora está no board — volta em Agora pra ver."
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

  const promoteEpicMutation = useMutation({
    mutationFn: (epicId: string) => promoteEpic(epicId, { mode: "watch" }),
    onSuccess: (result) => {
      setSelectedEpicId(null);
      setSelectedQuestId(null);
      setErrorFeedback(null);
      setFeedback(
        result.promoted === 0
          ? "Nenhuma tarefa nesse épico."
          : `Épico ${result.epicId}: ${result.promoted} tarefa(s) no agora.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["board-archive"] });
      void queryClient.invalidateQueries({ queryKey: ["board-home"] });
      void queryClient.invalidateQueries({ queryKey: ["board-revision"] });
    },
    onError: (error) => {
      setErrorFeedback(
        error instanceof Error ? error.message : "Erro ao acompanhar épico",
      );
    },
  });

  const quests = archiveQuery.data?.quests ?? [];
  const epicTitles = archiveQuery.data?.epicTitles ?? {};
  const prefixes = useMemo(() => collectPrefixes(quests), [quests]);
  const activePrefix = prefixTab && prefixes.includes(prefixTab)
    ? prefixTab
    : (prefixes[0] ?? null);

  const scoped = useMemo(() => {
    if (!activePrefix) return [];
    return quests.filter((quest) => questProjectKey(quest) === activePrefix);
  }, [quests, activePrefix]);

  const { epics, ungrouped } = useMemo(
    () => groupByEpicNewestFirst(scoped),
    [scoped],
  );

  const selectedEpicQuests =
    selectedEpicId != null
      ? (epics.find((group) => group.epicId === selectedEpicId)?.quests ?? [])
      : [];

  const selectedQuest =
    selectedQuestId != null
      ? (selectedEpicQuests.find((quest) => quest.id === selectedQuestId) ??
        ungrouped.find((quest) => quest.id === selectedQuestId) ??
        null)
      : null;

  const commitsQuery = useQuery({
    queryKey: ["commits", selectedQuest?.id],
    queryFn: () => fetchCommits({ questId: selectedQuest!.id }),
    enabled: Boolean(selectedQuest),
  });

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
            Índice do que já foi feito — busca e reabre se precisar.
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

      {prefixes.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {prefixes.map((prefix) => {
            const selected = prefix === activePrefix;
            const count = quests.filter(
              (quest) => questProjectKey(quest) === prefix,
            ).length;
            return (
              <button
                key={prefix}
                type="button"
                onClick={() => {
                  setPrefixTab(prefix);
                  setSelectedEpicId(null);
                  setSelectedQuestId(null);
                }}
                className="rounded-xl border px-3 py-1.5 text-sm font-semibold"
                style={{
                  borderColor: selected
                    ? "var(--ql-accent)"
                    : "var(--ql-border)",
                  background: selected ? "#f0fdfa" : "#fff",
                }}
              >
                {prefixLabel(prefix)}
                <span
                  className="ml-1.5 text-xs font-normal"
                  style={{ color: "var(--ql-muted)" }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

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

      {!archiveQuery.isLoading && scoped.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          {search
            ? "Nada encontrado com essa busca."
            : "Nada neste projeto no arquivo."}
        </p>
      ) : null}

      {ungrouped.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            Sem épico
          </h3>
          <div className="space-y-2">
            {ungrouped.map((quest) => (
              <ArchiveQuestRow
                key={quest.id}
                quest={quest}
                busy={promoteMutation.isPending}
                onWatch={() =>
                  promoteMutation.mutate({
                    questId: quest.id,
                    mode: "watch",
                  })
                }
                onResume={() =>
                  promoteMutation.mutate({
                    questId: quest.id,
                    mode: "resume",
                  })
                }
                onPause={() => setPausingQuest(quest)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {epics.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            Épicos
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {epics.map((group) => (
              <div
                key={group.epicId}
                className="rounded-2xl border px-4 py-4"
                style={{
                  borderColor:
                    selectedEpicId === group.epicId
                      ? "var(--ql-accent)"
                      : "var(--ql-border)",
                  background:
                    selectedEpicId === group.epicId
                      ? "#f0fdfa"
                      : "var(--ql-surface)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEpicId(group.epicId);
                    setSelectedQuestId(group.quests[0]?.id ?? null);
                  }}
                  className="w-full text-left"
                >
                  <p
                    className="text-lg font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {group.epicId}
                  </p>
                  {epicTitles[group.epicId] ? (
                    <p className="mt-1 text-sm font-medium leading-snug">
                      {epicTitles[group.epicId]}
                    </p>
                  ) : null}
                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--ql-muted)" }}
                  >
                    {group.quests.length} tarefa(s)
                    {group.openCount > 0
                      ? ` · ${group.openCount} aberta(s)`
                      : " · todas feitas"}
                  </p>
                </button>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    style={{ background: "var(--ql-accent)" }}
                    disabled={promoteEpicMutation.isPending}
                    onClick={() => promoteEpicMutation.mutate(group.epicId)}
                  >
                    Acompanhar épico
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                    style={{ borderColor: "var(--ql-border)" }}
                    onClick={() => {
                      setSelectedEpicId(group.epicId);
                      setSelectedQuestId(group.quests[0]?.id ?? null);
                    }}
                  >
                    Abrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {selectedEpicId ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Fechar"
            onClick={() => {
              setSelectedEpicId(null);
              setSelectedQuestId(null);
            }}
          />
          <aside
            className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l bg-white p-5 shadow-xl"
            style={{ borderColor: "var(--ql-border)" }}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <h3
                className="text-lg font-bold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Arquivo · {selectedEpicId}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: "var(--ql-accent)" }}
                  disabled={promoteEpicMutation.isPending}
                  onClick={() => promoteEpicMutation.mutate(selectedEpicId)}
                >
                  {promoteEpicMutation.isPending
                    ? "Acompanhando…"
                    : "Acompanhar épico"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border px-2 py-1 text-sm"
                  style={{ borderColor: "var(--ql-border)" }}
                  onClick={() => {
                    setSelectedEpicId(null);
                    setSelectedQuestId(null);
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
            <EpicDetailPanel
              epicId={selectedEpicId}
              epicTitle={epicTitles[selectedEpicId] ?? null}
              quests={selectedEpicQuests}
              profile={profile}
              selectedQuestId={selectedQuestId}
              onSelectQuest={setSelectedQuestId}
              questActions={
                selectedQuest ? (
                  <ArchiveQuestActions
                    quest={selectedQuest}
                    busy={promoteMutation.isPending}
                    commits={commitsQuery.data ?? []}
                    onWatch={() =>
                      promoteMutation.mutate({
                        questId: selectedQuest.id,
                        mode: "watch",
                      })
                    }
                    onResume={() =>
                      promoteMutation.mutate({
                        questId: selectedQuest.id,
                        mode: "resume",
                      })
                    }
                    onPause={() => setPausingQuest(selectedQuest)}
                  />
                ) : null
              }
            />
          </aside>
        </div>
      ) : null}

      {pausingQuest ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
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

function ArchiveQuestRow({
  quest,
  busy,
  onWatch,
  onResume,
  onPause,
}: {
  quest: Quest;
  busy: boolean;
  onWatch: () => void;
  onResume: () => void;
  onPause: () => void;
}) {
  return (
    <div
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60"
          style={{ borderColor: "var(--ql-border)" }}
          disabled={busy}
          onClick={onWatch}
        >
          Acompanhar
        </button>
        <button
          type="button"
          className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60"
          style={{ borderColor: "var(--ql-border)" }}
          disabled={busy}
          onClick={onResume}
        >
          Retomar
        </button>
        <button
          type="button"
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--ql-accent)" }}
          disabled={busy}
          onClick={onPause}
        >
          Pausar + falta
        </button>
      </div>
    </div>
  );
}

function ArchiveQuestActions({
  busy,
  commits,
  onWatch,
  onResume,
  onPause,
}: {
  quest: Quest;
  busy: boolean;
  commits: { id: string; assunto: string }[];
  onWatch: () => void;
  onResume: () => void;
  onPause: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
          style={{ borderColor: "var(--ql-border)" }}
          disabled={busy}
          onClick={onWatch}
        >
          Acompanhar
        </button>
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--ql-accent)" }}
          disabled={busy}
          onClick={onResume}
        >
          Retomar
        </button>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
          style={{ borderColor: "var(--ql-border)" }}
          disabled={busy}
          onClick={onPause}
        >
          Pausar + falta
        </button>
      </div>
      {commits.length > 0 ? (
        <ul className="space-y-1 text-sm" style={{ color: "var(--ql-muted)" }}>
          {commits.slice(0, 8).map((commit) => (
            <li key={commit.id}>
              {commit.assunto.slice(0, 100)}
              {commit.assunto.length > 100 ? "…" : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          Sem commits nesta quest ainda.
        </p>
      )}
    </div>
  );
}

/** HESEC-406 → HESEC; falls back to first ticket, else OUTROS. */
function questProjectKey(quest: Quest): string {
  return (
    projectKeyFromTicket(quest.epicId) ??
    projectKeyFromTicket(quest.ticketIds[0] ?? null) ??
    "OUTROS"
  );
}

function projectKeyFromTicket(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const match = value.trim().toUpperCase().match(/^([A-Z][A-Z0-9]*)-\d+/);
  return match?.[1] ?? null;
}

function ticketNumber(value: string): number {
  const match = value.toUpperCase().match(/-(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}

function collectPrefixes(quests: Quest[]): string[] {
  const counts = new Map<string, number>();
  for (const quest of quests) {
    const key = questProjectKey(quest);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => {
      if (left[0] === "OUTROS") return 1;
      if (right[0] === "OUTROS") return -1;
      return right[1] - left[1] || left[0].localeCompare(right[0]);
    })
    .map(([key]) => key);
}

function prefixLabel(prefix: string): string {
  if (prefix === "OUTROS") return "Outros";
  return prefix;
}

function groupByEpicNewestFirst(quests: Quest[]): {
  epics: EpicGroup[];
  ungrouped: Quest[];
} {
  const map = new Map<string, Quest[]>();
  const ungrouped: Quest[] = [];

  for (const quest of quests) {
    const epicId = quest.epicId?.trim().toUpperCase() ?? "";
    if (!epicId) {
      ungrouped.push(quest);
      continue;
    }
    const list = map.get(epicId) ?? [];
    list.push(quest);
    map.set(epicId, list);
  }

  const epics = [...map.entries()]
    .map(([epicId, epicQuests]) => ({
      epicId,
      quests: epicQuests,
      openCount: epicQuests.filter((quest) => quest.status !== "feita").length,
    }))
    .sort((left, right) => ticketNumber(right.epicId) - ticketNumber(left.epicId));

  ungrouped.sort(
    (left, right) =>
      new Date(right.atualizadoEm).getTime() -
      new Date(left.atualizadoEm).getTime(),
  );

  return { epics, ungrouped };
}

function statusLabel(status: QuestStatus): string {
  if (status === "ativa") return "Ativa";
  if (status === "pausada") return "Pausada";
  return "Feita";
}
