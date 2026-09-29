import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  fetchSprintCurrent,
  saveSprintWindow,
} from "../../shared/lib/api";

export function SprintSettings() {
  const queryClient = useQueryClient();
  const sprintQuery = useQuery({
    queryKey: ["sprint-current"],
    queryFn: fetchSprintCurrent,
  });

  const [rotulo, setRotulo] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const window = sprintQuery.data?.window;
    if (!window) {
      return;
    }
    setRotulo(window.rotulo ?? "");
    setInicio(window.inicio);
    setFim(window.fim);
  }, [sprintQuery.data?.window]);

  const mutation = useMutation({
    mutationFn: () =>
      saveSprintWindow({
        rotulo: rotulo.trim() ? rotulo.trim() : null,
        inicio,
        fim,
      }),
    onSuccess: (result) => {
      setError(null);
      setNotice("Intervalo da sprint salvo.");
      queryClient.setQueryData(["sprint-current"], (previous: unknown) => {
        const base =
          previous && typeof previous === "object"
            ? (previous as Record<string, unknown>)
            : {};
        return {
          ...base,
          window: result.window,
        };
      });
    },
    onError: (err) => {
      setNotice(null);
      setError(err instanceof Error ? err.message : "Erro ao salvar sprint");
    },
  });

  return (
    <section
      className="space-y-3 rounded-xl border px-4 py-4"
      style={{ borderColor: "var(--ql-border)" }}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          Sprint (resumo pessoal)
        </h3>
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          Defina manualmente início e fim. O QuestLog usa quests{" "}
          <strong>feitas</strong> nesse intervalo — não puxa sprint board do
          Jira.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Rótulo (opcional)</span>
        <input
          className="field"
          value={rotulo}
          onChange={(event) => setRotulo(event.target.value)}
          placeholder="Sprint 12"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Início</span>
          <input
            className="field"
            type="date"
            value={inicio}
            onChange={(event) => setInicio(event.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Fim</span>
          <input
            className="field"
            type="date"
            value={fim}
            onChange={(event) => setFim(event.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        className="rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: "var(--ql-accent)" }}
        disabled={mutation.isPending || !inicio || !fim}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Salvando…" : "Salvar intervalo"}
      </button>

      {notice ? (
        <p className="text-sm font-medium" style={{ color: "var(--ql-accent)" }}>
          {notice}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </section>
  );
}
