import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
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
  ticketHref,
  type HomeEpicCard,
  type Profile,
  type Quest,
  type QuestStatus,
  type RefreshTicketsResult,
} from "../../shared/lib/api";
import { EpicDetailPanel } from "./EpicDetailPanel";
import { PauseQuestPanel } from "./PauseQuestPanel";

type QuestBoardProps = {
  profile: Profile;
  onOpenSettings: () => void;
  onOpenArchive?: () => void;
};

function refreshTicketsFeedback(result: RefreshTicketsResult): string {
  const created = result.created ?? 0;
  const removed = result.removed ?? 0;
  if (result.fetched === 0 && created === 0 && removed === 0) {
    return "Nenhuma ticket para atualizar.";
  }

  const parts: string[] = [];
  if (result.fetched > 0) {
    parts.push(`Tickets atualizados: ${result.updated}`);
    if (result.epicLinked > 0) {
      parts.push(`${result.epicLinked} com épico`);
    }
    if (result.markedFeita > 0) {
      parts.push(`${result.markedFeita} marcadas feitas`);
    }
    if (result.epicTitlesUpdated) {
      parts.push(`${result.epicTitlesUpdated} nome(s) de épico`);
    }
  }
  if (created > 0) {
    parts.push(
      created === 1 ? "1 nova no quadro" : `${created} novas no quadro`,
    );
  }
  if (removed > 0) {
    parts.push(
      removed === 1
        ? "1 que não é sua saiu"
        : `${removed} que não são suas saíram`,
    );
  }
  return parts.join(" · ");
}

type Surface =
  | { kind: "idle" }
  | { kind: "create" }
  | { kind: "pause"; quest: Quest }
  | { kind: "epic"; epicId: string; questId: string | null }
  | { kind: "quest"; questId: string }
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
    void queryClient.invalidateQueries({ queryKey: ["board-archive"] });
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
      setFeedback(refreshTicketsFeedback(result));
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
    (surface.kind === "epic" || surface.kind === "quest") && surface.questId
      ? findQuest(home, surface.questId)
      : null;

  const commitsQuery = useQuery({
    queryKey: ["commits", selectedQuest?.id],
    queryFn: () => fetchCommits({ questId: selectedQuest!.id }),
    enabled: Boolean(selectedQuest),
  });

  const sections = useMemo(() => {
    if (!home) {
      return {
        inProgressEpics: [] as HomeEpicCard[],
        pendingEpics: [] as HomeEpicCard[],
        inProgressUngrouped: [] as Quest[],
        pendingUngrouped: [] as Quest[],
      };
    }
    return splitOpenSections(home.epics, home.ungrouped, profile.activeQuestId);
  }, [home, profile.activeQuestId]);

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

  const isEmpty = home.epics.length === 0 && home.ungrouped.length === 0;

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
            Em andamento separado das pausadas — clique pra abrir.
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

      <HomeBucket
        title="Em andamento"
        hint="Quests ativas agora."
        epics={sections.inProgressEpics}
        ungrouped={sections.inProgressUngrouped}
        profile={profile}
        selectedEpicId={
          surface.kind === "epic" ? surface.epicId : null
        }
        selectedQuestId={
          surface.kind === "quest" ? surface.questId : null
        }
        busy={actionMutation.isPending || pauseMutation.isPending}
        onOpenEpic={(epicId, questId) =>
          setSurface({ kind: "epic", epicId, questId })
        }
        onOpenQuest={(questId) => setSurface({ kind: "quest", questId })}
        onPause={(quest) => setSurface({ kind: "pause", quest })}
        onResume={(quest) =>
          actionMutation.mutate({
            questId: quest.id,
            action: quest.status === "pausada" ? "resume" : "activate",
          })
        }
        onFinish={(quest) =>
          actionMutation.mutate({ questId: quest.id, action: "complete" })
        }
      />

      <HomeBucket
        title="Pausadas / pendentes"
        hint="Abertas, mas não em andamento — ainda dá pra abrir e ler."
        epics={sections.pendingEpics}
        ungrouped={sections.pendingUngrouped}
        profile={profile}
        selectedEpicId={
          surface.kind === "epic" ? surface.epicId : null
        }
        selectedQuestId={
          surface.kind === "quest" ? surface.questId : null
        }
        busy={actionMutation.isPending || pauseMutation.isPending}
        onOpenEpic={(epicId, questId) =>
          setSurface({ kind: "epic", epicId, questId })
        }
        onOpenQuest={(questId) => setSurface({ kind: "quest", questId })}
        onPause={(quest) => setSurface({ kind: "pause", quest })}
        onResume={(quest) =>
          actionMutation.mutate({
            questId: quest.id,
            action: quest.status === "pausada" ? "resume" : "activate",
          })
        }
        onFinish={(quest) =>
          actionMutation.mutate({ questId: quest.id, action: "complete" })
        }
      />

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

      {surface.kind === "quest" && selectedQuest ? (
        <Sheet
          onClose={() => setSurface({ kind: "idle" })}
          title="Detalhe da quest"
        >
          <QuestDetailPanel
            quest={selectedQuest}
            profile={profile}
            busy={actionMutation.isPending}
            commits={commitsQuery.data ?? []}
            onPause={() =>
              setSurface({ kind: "pause", quest: selectedQuest })
            }
            onResume={() =>
              actionMutation.mutate({
                questId: selectedQuest.id,
                action:
                  selectedQuest.status === "pausada" ? "resume" : "activate",
              })
            }
            onFinish={() =>
              actionMutation.mutate({
                questId: selectedQuest.id,
                action: "complete",
              })
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
          ? " ou reabra algo feito no Arquivo."
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

function HomeBucket({
  title,
  hint,
  epics,
  ungrouped,
  profile,
  selectedEpicId,
  selectedQuestId,
  busy,
  onOpenEpic,
  onOpenQuest,
  onPause,
  onResume,
  onFinish,
}: {
  title: string;
  hint: string;
  epics: HomeEpicCard[];
  ungrouped: Quest[];
  profile: Profile;
  selectedEpicId: string | null;
  selectedQuestId: string | null;
  busy: boolean;
  onOpenEpic: (epicId: string, questId: string | null) => void;
  onOpenQuest: (questId: string) => void;
  onPause: (quest: Quest) => void;
  onResume: (quest: Quest) => void;
  onFinish: (quest: Quest) => void;
}) {
  if (epics.length === 0 && ungrouped.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          {title}
        </h3>
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          {hint}
        </p>
      </div>

      {epics.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {epics.map((card) => {
            const open = selectedEpicId === card.epicId;
            const faltaLine = card.nextFalta?.falta.trim() ?? "";
            return (
              <button
                key={`${title}-${card.epicId}`}
                type="button"
                onClick={() =>
                  onOpenEpic(
                    card.epicId,
                    card.nextFalta?.questId ?? card.quests[0]?.id ?? null,
                  )
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
                <p className="mt-1 text-sm" style={{ color: "var(--ql-muted)" }}>
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
      ) : null}

      {ungrouped.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ql-muted)" }}>
            Sem épico
          </p>
          {ungrouped.map((quest) => (
            <QuestRow
              key={quest.id}
              quest={quest}
              active={
                profile.activeQuestId === quest.id ||
                selectedQuestId === quest.id
              }
              busy={busy}
              onOpen={() => onOpenQuest(quest.id)}
              onPause={() => onPause(quest)}
              onResume={() => onResume(quest)}
              onFinish={() => onFinish(quest)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function QuestDetailPanel({
  quest,
  profile,
  busy,
  commits,
  onPause,
  onResume,
  onFinish,
}: {
  quest: Quest;
  profile: Profile;
  busy: boolean;
  commits: { id: string; assunto: string }[];
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide">
          {statusLabel(quest.status)}
          {quest.ticketStatus ? ` · ${quest.ticketStatus}` : ""}
        </p>
        <h3
          className="text-xl font-bold leading-snug"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {quest.titulo}
        </h3>
      </div>

      {quest.ticketIds.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {quest.ticketIds.map((ticketId) => {
            const href = ticketHref(profile.ticketBaseUrl, ticketId);
            return href ? (
              <a
                key={ticketId}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border px-2.5 py-1 text-sm"
                style={{ borderColor: "var(--ql-border)" }}
              >
                {ticketId}
              </a>
            ) : (
              <span
                key={ticketId}
                className="rounded-full border px-2.5 py-1 text-sm"
                style={{ borderColor: "var(--ql-border)" }}
              >
                {ticketId}
              </span>
            );
          })}
        </div>
      ) : null}

      {quest.faltaSource === "user" && quest.falta.trim() ? (
        <div className="rounded-xl px-3 py-3" style={{ background: "#f0fdf4" }}>
          <p className="text-xs font-semibold uppercase tracking-wide">
            O que falta
          </p>
          <p className="mt-1 text-base font-medium">{quest.falta}</p>
        </div>
      ) : null}

      <QuestActionsBlock
        quest={quest}
        busy={busy}
        commits={commits}
        onPause={onPause}
        onResume={onResume}
        onFinish={onFinish}
      />
    </div>
  );
}

function QuestRow({
  quest,
  active,
  onOpen,
  onPause,
  onResume,
  onFinish,
  busy,
}: {
  quest: Quest;
  active: boolean;
  onOpen: () => void;
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
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <p className="font-medium">{quest.titulo}</p>
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          {statusLabel(quest.status)}
          {quest.faltaSource === "user" && quest.falta
            ? ` · falta: ${quest.falta.slice(0, 60)}${quest.falta.length > 60 ? "…" : ""}`
            : ""}
          <span className="ml-1 font-semibold" style={{ color: "var(--ql-accent)" }}>
            · abrir
          </span>
        </p>
      </button>
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
      }
    | undefined,
  questId: string,
): Quest | null {
  if (!home) return null;
  for (const card of home.epics) {
    const found = card.quests.find((quest) => quest.id === questId);
    if (found) return found;
  }
  return home.ungrouped.find((quest) => quest.id === questId) ?? null;
}

function splitOpenSections(
  epics: HomeEpicCard[],
  ungrouped: Quest[],
  activeQuestId: string | null,
): {
  inProgressEpics: HomeEpicCard[];
  pendingEpics: HomeEpicCard[];
  inProgressUngrouped: Quest[];
  pendingUngrouped: Quest[];
} {
  const inProgressEpics: HomeEpicCard[] = [];
  const pendingEpics: HomeEpicCard[] = [];

  for (const card of epics) {
    const ativas = card.quests.filter((quest) => quest.status === "ativa");
    const pausadas = card.quests.filter((quest) => quest.status === "pausada");
    if (ativas.length > 0) {
      inProgressEpics.push({
        ...card,
        quests: ativas,
        openCount: ativas.length,
        nextFalta: pickNextFaltaLocal(ativas, activeQuestId),
      });
    }
    if (pausadas.length > 0) {
      pendingEpics.push({
        ...card,
        quests: pausadas,
        openCount: pausadas.length,
        nextFalta: pickNextFaltaLocal(pausadas, activeQuestId),
      });
    }
  }

  return {
    inProgressEpics,
    pendingEpics,
    inProgressUngrouped: ungrouped.filter((quest) => quest.status === "ativa"),
    pendingUngrouped: ungrouped.filter((quest) => quest.status === "pausada"),
  };
}

function pickNextFaltaLocal(
  quests: Quest[],
  activeQuestId: string | null,
): HomeEpicCard["nextFalta"] {
  if (quests.length === 0) return null;
  const active = quests.find((quest) => quest.id === activeQuestId);
  const pausedWithFalta = quests
    .filter(
      (quest) =>
        quest.status === "pausada" &&
        quest.faltaSource === "user" &&
        quest.falta.trim().length > 0,
    )
    .sort(
      (left, right) =>
        new Date(right.atualizadoEm).getTime() -
        new Date(left.atualizadoEm).getTime(),
    );
  const picked = active ?? pausedWithFalta[0] ?? quests[0];
  if (!picked) return null;
  return {
    questId: picked.id,
    titulo: picked.titulo,
    falta:
      picked.faltaSource === "user" && picked.falta.trim() ? picked.falta : "",
  };
}

function statusLabel(status: QuestStatus): string {
  if (status === "ativa") return "Ativa";
  if (status === "pausada") return "Pausada";
  return "Feita";
}
