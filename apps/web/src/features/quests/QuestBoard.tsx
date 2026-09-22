import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  activateQuest,
  completeQuest,
  createQuest,
  fetchBoardHome,
  fetchCommits,
  pauseQuest,
  promoteQuest,
  refreshTickets,
  resumeQuest,
  type Profile,
  type Quest,
  type QuestStatus,
} from "../../shared/lib/api";
import { EpicDetailPanel } from "./EpicDetailPanel";
import { PauseQuestPanel } from "./PauseQuestPanel";

type QuestBoardProps = {
  profile: Profile;
  onOpenSettings: () => void;
  onOpenArchive?: () => void;
};

type Surface =
  | { kind: "idle" }
  | { kind: "create" }
  | { kind: "pause"; quest: Quest }
  | { kind: "epic"; epicId: string; questId: string | null }
  | { kind: "promote-pause"; quest: Quest };

export function QuestBoard({
  profile,
  onOpenSettings,
  onOpenArchive,
}: QuestBoardProps) {
  const queryClient = useQueryClient();
  const [surface, setSurface] = useState<Surface>({ kind: "idle" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [createTitle, setCreateTitle] = useState("");
  const [createTickets, setCreateTickets] = useState("");
  const [createEpicId, setCreateEpicId] = useState("");

  const homeQuery = useQuery({
    queryKey: ["board-home"],
    queryFn: fetchBoardHome,
  });

  const inboxQuery = useQuery({
    queryKey: ["commits", "inbox"],
    queryFn: () => fetchCommits({ inbox: true }),
  });

  const invalidateBoard = () => {
    void queryClient.invalidateQueries({ queryKey: ["board-home"] });
    void queryClient.invalidateQueries({ queryKey: ["board-revision"] });
    void queryClient.invalidateQueries({ queryKey: ["commits"] });
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
    void queryClient.invalidateQueries({ queryKey: ["epic-notes"] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createQuest({
        titulo: createTitle.trim(),
        ticketIds: createTickets
          .split(/[\s,]+/)
          .map((ticket) => ticket.trim())
          .filter(Boolean),
        epicId: profile.ticketHasEpic ? createEpicId.trim() || null : null,
        setActive: true,
      }),
    onSuccess: () => {
      setCreateTitle("");
      setCreateTickets("");
      setCreateEpicId("");
      setSurface({ kind: "idle" });
      setErrorFeedback(null);
      setFeedback("Quest criada.");
      invalidateBoard();
    },
    onError: (error) => {
      setErrorFeedback(
        error instanceof Error ? error.message : "Erro ao criar",
      );
    },
  });

  const pauseMutation = useMutation({
    mutationFn: ({ questId, falta }: { questId: string; falta: string }) =>
      pauseQuest(questId, falta),
    onSuccess: () => {
      setSurface({ kind: "idle" });
      setErrorFeedback(null);
      setFeedback("Quest pausada.");
      invalidateBoard();
    },
    onError: (error) => {
      setErrorFeedback(
        error instanceof Error ? error.message : "Erro ao pausar",
      );
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      questId,
      action,
    }: {
      questId: string;
      action: "resume" | "complete" | "activate";
    }) => {
      if (action === "resume") return resumeQuest(questId);
      if (action === "complete") return completeQuest(questId);
      return activateQuest(questId);
    },
    onSuccess: (_quest, variables) => {
      setErrorFeedback(null);
      setFeedback(
        variables.action === "complete"
          ? "Quest marcada como feita."
          : "Quest retomada.",
      );
      invalidateBoard();
    },
    onError: (error) => {
      setErrorFeedback(
        error instanceof Error ? error.message : "Erro na ação",
      );
    },
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
      setSurface({ kind: "idle" });
      setErrorFeedback(null);
      setFeedback(
        variables.mode === "watch"
          ? "Acompanhando no board."
          : variables.mode === "resume"
            ? "Quest retomada."
            : "Quest pausada e no board.",
      );
      invalidateBoard();
    },
    onError: (error) => {
      setErrorFeedback(
        error instanceof Error ? error.message : "Erro ao promover",
      );
    },
  });

  const refreshMutation = useMutation({
    mutationFn: refreshTickets,
    onSuccess: (result) => {
      setErrorFeedback(null);
      setFeedback(
        result.fetched === 0
          ? "Nenhuma ticket para atualizar."
          : `Tickets atualizados: ${result.updated}` +
              (result.epicLinked > 0
                ? ` · ${result.epicLinked} com épico`
                : "") +
              (result.markedFeita > 0
                ? ` · ${result.markedFeita} marcadas feitas`
                : "") +
              (result.epicTitlesUpdated
                ? ` · ${result.epicTitlesUpdated} nome(s) de épico`
                : ""),
      );
      invalidateBoard();
    },
    onError: (error) => {
      setFeedback(null);
      setErrorFeedback(
        error instanceof Error ? error.message : "Erro ao atualizar tickets",
      );
    },
  });

  const home = homeQuery.data;
  const selectedQuest =
    surface.kind === "epic" && surface.questId
      ? findQuest(home, surface.questId)
      : null;

  const commitsQuery = useQuery({
    queryKey: ["commits", selectedQuest?.id],
    queryFn: () => fetchCommits({ questId: selectedQuest!.id }),
    enabled: Boolean(selectedQuest),
  });

  if (homeQuery.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-stone-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-stone-200" />
      </div>
    );
  }

  if (homeQuery.isError || !home) {
    return (
      <p className="text-red-800">
        {homeQuery.error instanceof Error
          ? homeQuery.error.message
          : "Erro ao carregar board"}
      </p>
    );
  }

  const isEmpty =
    home.epics.length === 0 &&
    home.ungrouped.length === 0 &&
    home.pending.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Agora
          </h2>
          <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
            Em andamento + o que ainda está aberto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenArchive ? (
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--ql-border)" }}
              onClick={onOpenArchive}
            >
              Arquivo
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--ql-border)" }}
            onClick={onOpenSettings}
          >
            Settings
          </button>
          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ borderColor: "var(--ql-border)" }}
            disabled={refreshMutation.isPending}
            onClick={() => refreshMutation.mutate()}
          >
            {refreshMutation.isPending ? "Atualizando…" : "Status Jira"}
          </button>
          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--ql-border)" }}
            onClick={() => setSurface({ kind: "create" })}
          >
            Nova quest
          </button>
        </div>
      </header>

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

      {(inboxQuery.data?.length ?? 0) > 0 ? (
        <section
          className="rounded-2xl border px-4 py-3"
          style={{ borderColor: "#fde68a", background: "#fffbeb" }}
        >
          <p className="text-sm font-semibold">
            Inbox — {inboxQuery.data!.length} commit(s) sem quest
          </p>
          <ul
            className="mt-2 space-y-1 text-sm"
            style={{ color: "var(--ql-muted)" }}
          >
            {inboxQuery.data!.slice(0, 5).map((commit) => (
              <li key={commit.id}>
                {commit.assunto.slice(0, 80)}
                {commit.assunto.length > 80 ? "…" : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isEmpty ? (
        <EmptyHome
          onCreate={() => setSurface({ kind: "create" })}
          onOpenArchive={onOpenArchive}
        />
      ) : null}

      {home.epics.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            Em andamento
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {home.epics.map((card) => {
              const open =
                surface.kind === "epic" && surface.epicId === card.epicId;
              const faltaLine = card.nextFalta?.falta.trim() ?? "";
              return (
                <button
                  key={card.epicId}
                  type="button"
                  onClick={() =>
                    setSurface({
                      kind: "epic",
                      epicId: card.epicId,
                      questId:
                        card.nextFalta?.questId ?? card.quests[0]?.id ?? null,
                    })
                  }
                  className="rounded-2xl border px-4 py-4 text-left transition hover:border-teal-600"
                  style={{
                    borderColor: open ? "var(--ql-accent)" : "var(--ql-border)",
                    background: open ? "#f0fdfa" : "var(--ql-surface)",
                  }}
                >
                  <p
                    className="text-lg font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {card.epicId}
                  </p>
                  {card.title ? (
                    <p className="mt-1 text-sm font-medium leading-snug">
                      {card.title}
                    </p>
                  ) : null}
                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--ql-muted)" }}
                  >
                    {card.openCount} tarefa(s)
                  </p>
                  {faltaLine ? (
                    <p className="mt-3 text-sm leading-snug">
                      <span className="font-semibold">Falta: </span>
                      {faltaLine}
                    </p>
                  ) : (
                    <p
                      className="mt-3 text-sm"
                      style={{ color: "var(--ql-muted)" }}
                    >
                      Sem falta registrada ainda
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {home.ungrouped.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            Sem épico
          </h3>
          <div className="space-y-2">
            {home.ungrouped.map((quest) => (
              <QuestRow
                key={quest.id}
                quest={quest}
                active={profile.activeQuestId === quest.id}
                busy={actionMutation.isPending || pauseMutation.isPending}
                onPause={() => setSurface({ kind: "pause", quest })}
                onResume={() =>
                  actionMutation.mutate({
                    questId: quest.id,
                    action:
                      quest.status === "pausada" ? "resume" : "activate",
                  })
                }
                onFinish={() =>
                  actionMutation.mutate({
                    questId: quest.id,
                    action: "complete",
                  })
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {home.pending.length > 0 ? (
        <section className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide">
              Pendências
            </h3>
            <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
              Abertas no Jira, ainda sem acompanhamento — pra não esquecer.
            </p>
          </div>
          <ul className="divide-y rounded-xl border" style={{ borderColor: "var(--ql-border)" }}>
            {home.pending.map((quest) => (
              <li
                key={quest.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                style={{ background: "#fff" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{quest.titulo}</p>
                  <p className="text-xs" style={{ color: "var(--ql-muted)" }}>
                    {quest.status === "ativa" ? "Ativa" : "Pausada"}
                    {quest.ticketStatus ? ` · ${quest.ticketStatus}` : ""}
                    {quest.epicId ? ` · ${quest.epicId}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="rounded-lg border px-2 py-1 text-xs font-semibold disabled:opacity-60"
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
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    style={{ background: "var(--ql-accent)" }}
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
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {surface.kind === "create" ? (
        <Sheet onClose={() => setSurface({ kind: "idle" })} title="Nova quest">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Título</span>
              <input
                className="w-full rounded-xl border px-3 py-2"
                style={{ borderColor: "var(--ql-border)" }}
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Tickets (opcional)</span>
              <input
                className="w-full rounded-xl border px-3 py-2"
                style={{ borderColor: "var(--ql-border)" }}
                value={createTickets}
                onChange={(event) => setCreateTickets(event.target.value)}
                placeholder={profile.ticketPrefixLabel || "TICKET-123"}
              />
            </label>
            {profile.ticketHasEpic ? (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Épico (opcional)</span>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  style={{ borderColor: "var(--ql-border)" }}
                  value={createEpicId}
                  onChange={(event) => setCreateEpicId(event.target.value)}
                />
              </label>
            ) : null}
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--ql-accent)" }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Criando…" : "Criar"}
            </button>
          </form>
        </Sheet>
      ) : null}

      {surface.kind === "pause" ? (
        <Sheet
          onClose={() => setSurface({ kind: "idle" })}
          title={`Pausar — ${surface.quest.titulo}`}
        >
          <PauseQuestPanel
            questTitulo={surface.quest.titulo}
            isPending={pauseMutation.isPending}
            onCancel={() => setSurface({ kind: "idle" })}
            onConfirm={(falta) =>
              pauseMutation.mutate({ questId: surface.quest.id, falta })
            }
          />
        </Sheet>
      ) : null}

      {surface.kind === "promote-pause" ? (
        <Sheet
          onClose={() => setSurface({ kind: "idle" })}
          title={`Pausar + acompanhar — ${surface.quest.titulo}`}
        >
          <PauseQuestPanel
            questTitulo={surface.quest.titulo}
            isPending={promoteMutation.isPending}
            onCancel={() => setSurface({ kind: "idle" })}
            onConfirm={(falta) =>
              promoteMutation.mutate({
                questId: surface.quest.id,
                mode: "pause",
                falta,
              })
            }
          />
        </Sheet>
      ) : null}

      {surface.kind === "epic" ? (
        <Sheet
          onClose={() => setSurface({ kind: "idle" })}
          title="Detalhe do épico"
          wide
        >
          <EpicDetailPanel
            epicId={surface.epicId}
            epicTitle={
              home.epics.find((card) => card.epicId === surface.epicId)
                ?.title ?? null
            }
            quests={
              home.epics.find((card) => card.epicId === surface.epicId)
                ?.quests ?? []
            }
            profile={profile}
            selectedQuestId={surface.questId}
            onSelectQuest={(questId) =>
              setSurface({ kind: "epic", epicId: surface.epicId, questId })
            }
            questActions={
              selectedQuest ? (
                <QuestActionsBlock
                  quest={selectedQuest}
                  busy={actionMutation.isPending}
                  commits={commitsQuery.data ?? []}
                  onPause={() =>
                    setSurface({ kind: "pause", quest: selectedQuest })
                  }
                  onResume={() =>
                    actionMutation.mutate({
                      questId: selectedQuest.id,
                      action:
                        selectedQuest.status === "pausada"
                          ? "resume"
                          : "activate",
                    })
                  }
                  onFinish={() =>
                    actionMutation.mutate({
                      questId: selectedQuest.id,
                      action: "complete",
                    })
                  }
                />
              ) : null
            }
          />
        </Sheet>
      ) : null}
    </div>
  );
}

function EmptyHome({
  onCreate,
  onOpenArchive,
}: {
  onCreate: () => void;
  onOpenArchive?: () => void;
}) {
  return (
    <section
      className="rounded-2xl border px-5 py-8 text-center"
      style={{
        borderColor: "var(--ql-border)",
        background: "var(--ql-surface)",
      }}
    >
      <h3
        className="text-xl font-bold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Nada no agora ainda
      </h3>
      <p
        className="mx-auto mt-2 max-w-md text-sm"
        style={{ color: "var(--ql-muted)" }}
      >
        Crie uma quest
        {onOpenArchive
          ? " ou abra o Arquivo para acompanhar algo importado do Jira."
          : "."}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--ql-accent)" }}
          onClick={onCreate}
        >
          Nova quest
        </button>
        {onOpenArchive ? (
          <button
            type="button"
            className="rounded-xl border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--ql-border)" }}
            onClick={onOpenArchive}
          >
            Ir ao Arquivo
          </button>
        ) : null}
      </div>
    </section>
  );
}

function QuestRow({
  quest,
  active,
  onPause,
  onResume,
  onFinish,
  busy,
}: {
  quest: Quest;
  active: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  busy: boolean;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-3"
      style={{
        borderColor: active ? "var(--ql-accent)" : "var(--ql-border)",
        background: active ? "#f0fdfa" : "#fff",
      }}
    >
      <div className="min-w-0">
        <p className="font-medium">{quest.titulo}</p>
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          {statusLabel(quest.status)}
          {quest.faltaSource === "user" && quest.falta
            ? ` · falta: ${quest.falta.slice(0, 60)}${quest.falta.length > 60 ? "…" : ""}`
            : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {quest.status === "pausada" || quest.status === "feita" ? (
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--ql-accent)" }}
            disabled={busy}
            onClick={onResume}
          >
            Retomar
          </button>
        ) : null}
        {quest.status === "ativa" ? (
          <button
            type="button"
            className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--ql-border)" }}
            disabled={busy}
            onClick={onPause}
          >
            Pausar
          </button>
        ) : null}
        {quest.status !== "feita" ? (
          <button
            type="button"
            className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--ql-border)" }}
            disabled={busy}
            onClick={onFinish}
          >
            Feita
          </button>
        ) : null}
      </div>
    </div>
  );
}

function QuestActionsBlock({
  quest,
  busy,
  commits,
  onPause,
  onResume,
  onFinish,
}: {
  quest: Quest;
  busy: boolean;
  commits: { id: string; assunto: string }[];
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {quest.status === "pausada" || quest.status === "feita" ? (
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--ql-accent)" }}
            disabled={busy}
            onClick={onResume}
          >
            Retomar
          </button>
        ) : null}
        {quest.status === "ativa" ? (
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
            style={{ borderColor: "var(--ql-border)" }}
            onClick={onPause}
          >
            Pausar
          </button>
        ) : null}
        {quest.status !== "feita" ? (
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
            style={{ borderColor: "var(--ql-border)" }}
            disabled={busy}
            onClick={onFinish}
          >
            Marcar feita
          </button>
        ) : null}
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

function Sheet({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={onClose}
      />
      <aside
        className={`relative z-10 h-full overflow-y-auto border-l bg-white p-5 shadow-xl ${
          wide ? "w-full max-w-xl" : "w-full max-w-md"
        }`}
        style={{ borderColor: "var(--ql-border)" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h3>
          <button
            type="button"
            className="rounded-lg border px-2 py-1 text-sm"
            style={{ borderColor: "var(--ql-border)" }}
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function findQuest(
  home:
    | {
        epics: { quests: Quest[] }[];
        ungrouped: Quest[];
        pending: Quest[];
      }
    | undefined,
  questId: string,
): Quest | null {
  if (!home) return null;
  for (const card of home.epics) {
    const found = card.quests.find((quest) => quest.id === questId);
    if (found) return found;
  }
  return (
    home.ungrouped.find((quest) => quest.id === questId) ??
    home.pending.find((quest) => quest.id === questId) ??
    null
  );
}

function statusLabel(status: QuestStatus): string {
  if (status === "ativa") return "Ativa";
  if (status === "pausada") return "Pausada";
  return "Feita";
}
