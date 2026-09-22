import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEpicNotes,
  fetchSecrets,
  summarizeEpic,
} from "../../shared/lib/api";

type EpicNotesPanelProps = {
  epicId: string;
};

export function EpicNotesPanel({ epicId }: EpicNotesPanelProps) {
  const queryClient = useQueryClient();

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

  return (
    <div
      className="space-y-3 rounded-xl border px-3 py-3"
      style={{ borderColor: "var(--ql-border)", background: "#fafaf9" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">
            Épico {epicId}
          </p>
          <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
            Overview + o que você foi fazendo (incremental; uma quest ≠ épico
            inteiro).
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
            ? " (incluiu descrição/comentários do Jira)"
            : ""}
          .
        </p>
      ) : null}

      <div className="space-y-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">
            Overview
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {note?.overview?.trim() || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">
            O que eu fiz
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {note?.progress?.trim() || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
