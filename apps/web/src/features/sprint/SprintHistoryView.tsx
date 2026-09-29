import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  complementSprintSummary,
  fetchSprintCurrent,
  fetchSprintHistory,
} from "../../shared/lib/api";
import { SprintSettings } from "./SprintSettings";

type SprintHistoryViewProps = {
  onBack: () => void;
};

export function SprintHistoryView({ onBack }: SprintHistoryViewProps) {
  const queryClient = useQueryClient();
  const currentQuery = useQuery({
    queryKey: ["sprint-current"],
    queryFn: fetchSprintCurrent,
  });
  const historyQuery = useQuery({
    queryKey: ["sprint-history"],
    queryFn: fetchSprintHistory,
  });

  const complementMutation = useMutation({
    mutationFn: complementSprintSummary,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sprint-current"] });
      void queryClient.invalidateQueries({ queryKey: ["sprint-history"] });
    },
  });

  const window = currentQuery.data?.window;
  const resumo = currentQuery.data?.resumo ?? "";

  return (
    <section className="panel space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sprint
          </h2>
          <p style={{ color: "var(--ql-muted)" }}>
            Resumo pessoal do intervalo manual — histórico fica no seu SQLite.
          </p>
        </div>
        <button type="button" className="text-sm font-semibold" onClick={onBack}>
          Voltar
        </button>
      </div>

      <SprintSettings />

      {window ? (
        <section
          className="space-y-3 rounded-xl border px-4 py-4"
          style={{ borderColor: "var(--ql-border)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide">
              Sprint atual
            </h3>
            <button
              type="button"
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--ql-accent)" }}
              disabled={complementMutation.isPending}
              onClick={() => complementMutation.mutate()}
            >
              {complementMutation.isPending
                ? "Atualizando…"
                : "Atualizar resumo"}
            </button>
          </div>
          <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
            {window.rotulo?.trim() || "Sem rótulo"} · {window.inicio} →{" "}
            {window.fim}
          </p>
          <div
            className="rounded-xl border px-3 py-3 text-sm whitespace-pre-wrap"
            style={{ borderColor: "var(--ql-border)" }}
          >
            {resumo.trim() || "(Resumo ainda vazio.)"}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          Histórico
        </h3>
        {historyQuery.isLoading ? (
          <div className="h-16 animate-pulse rounded-xl bg-stone-200" />
        ) : null}
        {(historyQuery.data?.length ?? 0) === 0 ? (
          <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
            Nenhuma sprint fechada ainda. Quando o fim passar, a API arquiva
            automaticamente (fail-open).
          </p>
        ) : (
          <ul className="space-y-3">
            {historyQuery.data!.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border px-4 py-3"
                style={{ borderColor: "var(--ql-border)" }}
              >
                <p className="text-sm font-semibold">
                  {entry.rotulo?.trim() || "Sprint"}{" "}
                  <span
                    className="font-normal"
                    style={{ color: "var(--ql-muted)" }}
                  >
                    {entry.inicio} → {entry.fim}
                  </span>
                </p>
                <p className="text-xs" style={{ color: "var(--ql-muted)" }}>
                  Fechada em{" "}
                  {new Date(entry.fechadaEm).toLocaleString("pt-BR")}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {entry.resumo.trim() || "(Sem resumo gravado.)"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
