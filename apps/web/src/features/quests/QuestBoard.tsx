import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  activateQuest,
  completeQuest,
  createQuest,
  fetchCommits,
  fetchQuests,
  pauseQuest,
  refreshTickets,
  resumeQuest,
  ticketHref,
  type Profile,
  type Quest,
  type QuestStatus,
} from "../../shared/lib/api";
import { PauseQuestPanel } from "./PauseQuestPanel";
import { EpicNotesPanel } from "./EpicNotesPanel";

type QuestBoardProps = {
  profile: Profile;
  onOpenSettings: () => void;
};

export function QuestBoard({ profile, onOpenSettings }: QuestBoardProps) {
  const queryClient = useQueryClient();
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [showFeitas, setShowFeitas] = useState(false);
  const [newTitulo, setNewTitulo] = useState("");
  const [newTickets, setNewTickets] = useState("");
  const [newEpicId, setNewEpicId] = useState("");
  const [pausingQuestId, setPausingQuestId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  const questsQuery = useQuery({
    queryKey: ["quests"],
    queryFn: fetchQuests,
  });

  const inboxQuery = useQuery({
    queryKey: ["commits", "inbox"],
    queryFn: () => fetchCommits({ inbox: true }),
  });

  const selectedQuest =
    questsQuery.data?.find((quest) => quest.id === selectedQuestId) ?? null;

  const commitsQuery = useQuery({
    queryKey: ["commits", selectedQuestId],
    queryFn: () => fetchCommits({ questId: selectedQuestId! }),
    enabled: Boolean(selectedQuestId),
  });

  function invalidateBoard() {
    void queryClient.invalidateQueries({ queryKey: ["quests"] });
    void queryClient.invalidateQueries({ queryKey: ["commits"] });
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
    void queryClient.invalidateQueries({ queryKey: ["epic-notes"] });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createQuest({
        titulo: newTitulo.trim(),
        ticketIds: newTickets
          .split(",")
          .map((ticket) => ticket.trim())
          .filter(Boolean),
        epicId: profile.ticketHasEpic
          ? newEpicId.trim() || null
          : null,
        setActive: true,
      }),
    onSuccess: (quest) => {
      setNewTitulo("");
      setNewTickets("");
      setNewEpicId("");
      setFormError(null);
      setSelectedQuestId(quest.id);
      invalidateBoard();
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Erro ao criar");
    },
  });

  const pauseMutation = useMutation({
    mutationFn: ({ questId, falta }: { questId: string; falta: string }) =>
      pauseQuest(questId, falta),
    onSuccess: () => {
      setPausingQuestId(null);
      setFormError(null);
      invalidateBoard();
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Erro ao pausar");
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
    onSuccess: () => {
      setFormError(null);
      invalidateBoard();
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Erro na ação");
    },
  });

  const refreshMutation = useMutation({
    mutationFn: refreshTickets,
    onSuccess: (result) => {
      setFormError(null);
      setFormNotice(
        result.fetched === 0
          ? "Nenhuma ticket para atualizar."
          : `Tickets atualizados: ${result.updated}` +
              (result.epicLinked > 0
                ? ` · ${result.epicLinked} com épico`
                : "") +
              (result.markedFeita > 0
                ? ` · ${result.markedFeita} marcadas feitas`
                : ""),
      );
      invalidateBoard();
    },
    onError: (error) => {
      setFormNotice(null);
      setFormError(
        error instanceof Error ? error.message : "Erro ao atualizar tickets",
      );
    },
  });

  const ativas =
    questsQuery.data?.filter((quest) => quest.status === "ativa") ?? [];
  const pausadas =
    questsQuery.data?.filter((quest) => quest.status === "pausada") ?? [];
  const feitas =
    questsQuery.data?.filter((quest) => quest.status === "feita") ?? [];
  const openQuests = [...ativas, ...pausadas];
  const epicGroups = profile.ticketHasEpic
    ? groupQuestsByEpic(openQuests)
    : null;

  return (
    <div className="space-y-6">
      <section className="panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Board
            </h2>
            <p style={{ color: "var(--ql-muted)" }}>
              Perfil <strong>{profile.name}</strong>
              {profile.commitHint ? ` · ${profile.commitHint}` : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60"
              style={{ borderColor: "var(--ql-border)" }}
              disabled={refreshMutation.isPending}
              onClick={() => refreshMutation.mutate()}
            >
              {refreshMutation.isPending
                ? "Atualizando…"
                : "Atualizar tickets"}
            </button>
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--ql-border)" }}
              onClick={onOpenSettings}
            >
              Settings
            </button>
          </div>
        </div>

        <form
          className={`grid gap-2 ${
            profile.ticketHasEpic
              ? "sm:grid-cols-[1fr_1fr_1fr_auto]"
              : "sm:grid-cols-[1fr_1fr_auto]"
          }`}
          onSubmit={(event) => {
            event.preventDefault();
            if (!newTitulo.trim()) return;
            createMutation.mutate();
          }}
        >
          <input
            className="field"
            placeholder="Nova quest"
            value={newTitulo}
            onChange={(event) => setNewTitulo(event.target.value)}
            required
          />
          <input
            className="field"
            placeholder="Tickets (HESEC-1, HESEC-2)"
            value={newTickets}
            onChange={(event) => setNewTickets(event.target.value)}
          />
          {profile.ticketHasEpic ? (
            <input
              className="field"
              placeholder="Épico (HESEC-100)"
              value={newEpicId}
              onChange={(event) => setNewEpicId(event.target.value)}
            />
          ) : null}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--ql-accent)" }}
          >
            {createMutation.isPending ? "Criando…" : "Criar"}
          </button>
        </form>
      </section>

      {questsQuery.isLoading ? (
        <section className="panel animate-pulse space-y-3">
          <div className="h-5 w-32 rounded bg-stone-200" />
          <div className="h-16 rounded bg-stone-200" />
        </section>
      ) : null}

      {questsQuery.isError ? (
        <section className="panel text-red-800">
          {questsQuery.error instanceof Error
            ? questsQuery.error.message
            : "Erro ao carregar quests"}
        </section>
      ) : null}

      {questsQuery.data ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            {epicGroups ? (
              epicGroups.map((group) => (
                <QuestGroup
                  key={group.epicId ?? "none"}
                  title={
                    group.epicId
                      ? `Épico ${group.epicId}`
                      : "Sem épico"
                  }
                  quests={group.quests}
                  selectedQuestId={selectedQuestId}
                  activeQuestId={profile.activeQuestId}
                  onSelect={(questId) => {
                    setSelectedQuestId(questId);
                    setPausingQuestId(null);
                  }}
                />
              ))
            ) : (
              <>
                <QuestGroup
                  title="Ativas"
                  quests={ativas}
                  selectedQuestId={selectedQuestId}
                  activeQuestId={profile.activeQuestId}
                  onSelect={(questId) => {
                    setSelectedQuestId(questId);
                    setPausingQuestId(null);
                  }}
                />
                <QuestGroup
                  title="Pausadas"
                  quests={pausadas}
                  selectedQuestId={selectedQuestId}
                  activeQuestId={profile.activeQuestId}
                  onSelect={(questId) => {
                    setSelectedQuestId(questId);
                    setPausingQuestId(null);
                  }}
                />
              </>
            )}
            <section className="panel space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide">
                  Inbox
                </h3>
                <span className="text-sm" style={{ color: "var(--ql-muted)" }}>
                  {inboxQuery.data?.length ?? 0}
                </span>
              </div>
              {(inboxQuery.data ?? []).slice(0, 5).map((commit) => (
                <p key={commit.id} className="text-sm">
                  <span className="font-medium">{commit.repo}</span> ·{" "}
                  {commit.assunto}
                </p>
              ))}
              {inboxQuery.data?.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
                  Sem commits sem quest.
                </p>
              ) : null}
            </section>
            <div>
              <button
                type="button"
                className="text-sm font-semibold"
                style={{ color: "var(--ql-accent)" }}
                onClick={() => setShowFeitas((current) => !current)}
              >
                {showFeitas ? "Ocultar feitas" : `Ver feitas (${feitas.length})`}
              </button>
              {showFeitas ? (
                <div className="mt-3">
                  <QuestGroup
                    title="Feitas"
                    quests={feitas}
                    selectedQuestId={selectedQuestId}
                    activeQuestId={profile.activeQuestId}
                    onSelect={(questId) => {
                      setSelectedQuestId(questId);
                      setPausingQuestId(null);
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <section className="panel space-y-4">
            {!selectedQuest ? (
              <p style={{ color: "var(--ql-muted)" }}>
                Selecione uma quest para ver detalhe, falta e commits.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    {statusLabel(selectedQuest.status)}
                    {selectedQuest.epicId
                      ? ` · épico ${selectedQuest.epicId}`
                      : ""}
                    {profile.activeQuestId === selectedQuest.id
                      ? " · ativa no ingest"
                      : ""}
                  </p>
                  <h3
                    className="text-2xl font-bold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {selectedQuest.titulo}
                  </h3>
                </div>

                {selectedQuest.epicId ? (
                  <EpicNotesPanel epicId={selectedQuest.epicId} />
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {selectedQuest.ticketIds.map((ticketId) => {
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
                        {profile.ticketPrefixLabel} {ticketId}
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
                  {selectedQuest.ticketStatus ? (
                    <span
                      className="rounded-full border px-2.5 py-1 text-sm"
                      style={{
                        borderColor: "var(--ql-accent)",
                        color: "var(--ql-accent)",
                      }}
                      title={
                        selectedQuest.ticketSyncedAt
                          ? `Sincronizado em ${new Date(selectedQuest.ticketSyncedAt).toLocaleString("pt-BR")}`
                          : undefined
                      }
                    >
                      {selectedQuest.ticketStatus}
                    </span>
                  ) : null}
                </div>

                {selectedQuest.status === "pausada" || selectedQuest.falta ? (
                  <div
                    className="rounded-xl px-3 py-3"
                    style={{ background: "#f0fdf4" }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      Falta
                    </p>
                    <p className="mt-1 text-base font-medium">
                      {selectedQuest.falta || "—"}
                    </p>
                  </div>
                ) : null}

                {pausingQuestId === selectedQuest.id ? (
                  <PauseQuestPanel
                    questTitulo={selectedQuest.titulo}
                    isPending={pauseMutation.isPending}
                    onCancel={() => setPausingQuestId(null)}
                    onConfirm={(falta) =>
                      pauseMutation.mutate({
                        questId: selectedQuest.id,
                        falta,
                      })
                    }
                  />
                ) : null}

                {selectedQuest.status === "ativa" &&
                pausingQuestId !== selectedQuest.id ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
                      style={{ background: "var(--ql-accent)" }}
                      onClick={() => setPausingQuestId(selectedQuest.id)}
                    >
                      Pausar…
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border px-3 py-2 text-sm font-semibold"
                      style={{ borderColor: "var(--ql-border)" }}
                      disabled={actionMutation.isPending}
                      onClick={() =>
                        actionMutation.mutate({
                          questId: selectedQuest.id,
                          action: "activate",
                        })
                      }
                    >
                      Definir ativa
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border px-3 py-2 text-sm font-semibold"
                      style={{ borderColor: "var(--ql-border)" }}
                      disabled={actionMutation.isPending}
                      onClick={() =>
                        actionMutation.mutate({
                          questId: selectedQuest.id,
                          action: "complete",
                        })
                      }
                    >
                      Marcar feita
                    </button>
                  </div>
                ) : null}

                {selectedQuest.status === "pausada" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
                      style={{ background: "var(--ql-accent)" }}
                      disabled={actionMutation.isPending}
                      onClick={() =>
                        actionMutation.mutate({
                          questId: selectedQuest.id,
                          action: "resume",
                        })
                      }
                    >
                      Retomar
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border px-3 py-2 text-sm font-semibold"
                      style={{ borderColor: "var(--ql-border)" }}
                      disabled={actionMutation.isPending}
                      onClick={() =>
                        actionMutation.mutate({
                          questId: selectedQuest.id,
                          action: "complete",
                        })
                      }
                    >
                      Marcar feita
                    </button>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wide">
                    Commits
                  </h4>
                  {commitsQuery.isLoading ? (
                    <p style={{ color: "var(--ql-muted)" }}>Carregando…</p>
                  ) : null}
                  {(commitsQuery.data ?? []).map((commit) => (
                    <div
                      key={commit.id}
                      className="rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: "var(--ql-border)" }}
                    >
                      <p className="font-medium">{commit.assunto}</p>
                      <p style={{ color: "var(--ql-muted)" }}>
                        {commit.repo} · {commit.hash.slice(0, 7)}
                      </p>
                    </div>
                  ))}
                  {commitsQuery.data?.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
                      Nenhum commit nesta quest ainda.
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}

      {formNotice ? (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: "#f0fdf4", color: "#166534" }}
        >
          {formNotice}
        </p>
      ) : null}

      {formError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError}
        </p>
      ) : null}
    </div>
  );
}

function groupQuestsByEpic(
  quests: Quest[],
): Array<{ epicId: string | null; quests: Quest[] }> {
  const map = new Map<string, Quest[]>();
  for (const quest of quests) {
    const key = quest.epicId?.trim().toUpperCase() || "";
    const list = map.get(key) ?? [];
    list.push(quest);
    map.set(key, list);
  }

  const groups = [...map.entries()].map(([key, groupQuests]) => ({
    epicId: key.length > 0 ? key : null,
    quests: groupQuests,
  }));

  groups.sort((left, right) => {
    if (left.epicId === null) return 1;
    if (right.epicId === null) return -1;
    return left.epicId.localeCompare(right.epicId);
  });

  return groups;
}

function QuestGroup({
  title,
  quests,
  selectedQuestId,
  activeQuestId,
  onSelect,
}: {
  title: string;
  quests: Quest[];
  selectedQuestId: string | null;
  activeQuestId: string | null;
  onSelect: (questId: string) => void;
}) {
  return (
    <section className="panel space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      {quests.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          Nenhuma.
        </p>
      ) : null}
      {quests.map((quest) => {
        const selected = quest.id === selectedQuestId;
        return (
          <button
            key={quest.id}
            type="button"
            onClick={() => onSelect(quest.id)}
            className="w-full rounded-xl border px-3 py-2 text-left transition"
            style={{
              borderColor: selected ? "var(--ql-accent)" : "var(--ql-border)",
              background: selected ? "#f0fdfa" : "#fff",
            }}
          >
            <p className="font-medium">{quest.titulo}</p>
            <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
              {statusLabel(quest.status)}
              {activeQuestId === quest.id ? " · ingest" : ""}
              {quest.ticketStatus ? ` · ${quest.ticketStatus}` : ""}
              {quest.status === "pausada" && quest.falta
                ? ` · ${quest.falta}`
                : ""}
            </p>
          </button>
        );
      })}
    </section>
  );
}

function statusLabel(status: QuestStatus): string {
  if (status === "ativa") return "Ativa";
  if (status === "pausada") return "Pausada";
  return "Feita";
}
