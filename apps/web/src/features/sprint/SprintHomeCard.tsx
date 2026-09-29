import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  complementSprintSummary,
  fetchSprintCurrent,
} from "../../shared/lib/api";

type SprintHomeCardProps = {
  onOpenSprint: () => void;
};

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength).trim()}…`;
}

export function SprintHomeCard({ onOpenSprint }: SprintHomeCardProps) {
  const queryClient = useQueryClient();
  const sprintQuery = useQuery({
    queryKey: ["sprint-current"],
    queryFn: fetchSprintCurrent,
  });

  const complementMutation = useMutation({
    mutationFn: complementSprintSummary,
    onSuccess: (result) => {
      queryClient.setQueryData(["sprint-current"], (previous: unknown) => {
        const base =
          previous && typeof previous === "object"
            ? (previous as Record<string, unknown>)
            : {};
        return {
          ...base,
          resumo: result.resumo,
          pendingCount: Math.max(
            0,
            Number(base.pendingCount ?? 0) - result.addedQuestCount,
          ),
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["sprint-current"] });
      void queryClient.invalidateQueries({ queryKey: ["sprint-history"] });
    },
  });

  const window = sprintQuery.data?.window;
  if (!window) {
    return null;
  }

  const label =
    window.rotulo?.trim() ||
    `Sprint ${window.inicio} → ${window.fim}`;
  const resumo = sprintQuery.data?.resumo ?? "";
  const pendingCount = sprintQuery.data?.pendingCount ?? 0;

  return (
    <section
      className="rounded-2xl border px-4 py-3"
      style={{ borderColor: "var(--ql-border)", background: "var(--ql-panel)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs" style={{ color: "var(--ql-muted)" }}>
            {window.inicio} → {window.fim}
            {pendingCount > 0
              ? ` · ${pendingCount} feita(s) ainda fora do resumo`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--ql-border)" }}
            onClick={onOpenSprint}
          >
            Ver sprint
          </button>
          <button
            type="button"
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--ql-accent)" }}
            disabled={complementMutation.isPending}
            onClick={() => complementMutation.mutate()}
          >
            {complementMutation.isPending ? "Atualizando…" : "Atualizar resumo"}
          </button>
        </div>
      </div>
      {resumo ? (
        <p
          className="mt-3 whitespace-pre-wrap text-sm"
          style={{ color: "var(--ql-muted)" }}
        >
          {truncate(resumo, 280)}
        </p>
      ) : (
        <p className="mt-3 text-sm" style={{ color: "var(--ql-muted)" }}>
          Ainda sem resumo — use “Atualizar resumo” quando fechar quests neste
          intervalo.
        </p>
      )}
      {complementMutation.isError ? (
        <p className="mt-2 text-sm text-red-800">
          {complementMutation.error instanceof Error
            ? complementMutation.error.message
            : "Erro ao atualizar resumo"}
        </p>
      ) : null}
      {complementMutation.isSuccess && complementMutation.data.addedQuestCount > 0 ? (
        <p
          className="mt-2 text-sm font-medium"
          style={{ color: "var(--ql-accent)" }}
        >
          Resumo atualizado com {complementMutation.data.addedQuestCount}{" "}
          quest(s) nova(s).
        </p>
      ) : null}
    </section>
  );
}
