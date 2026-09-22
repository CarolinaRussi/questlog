import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchSecrets, saveSecrets } from "../../shared/lib/api";

export function GeminiSettings() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const secretsQuery = useQuery({
    queryKey: ["secrets"],
    queryFn: fetchSecrets,
  });

  const mutation = useMutation({
    mutationFn: (geminiApiKey: string | null) =>
      saveSecrets({ geminiApiKey }),
    onSuccess: (result) => {
      setApiKey("");
      setError(null);
      setNotice(
        result.geminiConfigured
          ? "Chave Gemini salva neste computador."
          : "Chave Gemini removida.",
      );
      queryClient.setQueryData(["secrets"], result);
    },
    onError: (err) => {
      setNotice(null);
      setError(err instanceof Error ? err.message : "Erro ao salvar chave");
    },
  });

  const configured = secretsQuery.data?.geminiConfigured ?? false;

  return (
    <section className="space-y-3 rounded-xl border px-4 py-4" style={{ borderColor: "var(--ql-border)" }}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          Gemini (resumo de épicos)
        </h3>
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          Chave só neste PC (data dir). Cada pessoa usa a própria chave do{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--ql-accent)" }}
          >
            Google AI Studio
          </a>
          . Sem chave, o board funciona; o resumo inteligente fica desligado.
        </p>
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          Status:{" "}
          <strong>{configured ? "configurada" : "não configurada"}</strong>
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">
          {configured ? "Substituir chave" : "Colar chave"}
        </span>
        <input
          className="field"
          type="password"
          autoComplete="off"
          placeholder={configured ? "••••••••" : "AIza…"}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--ql-accent)" }}
          disabled={mutation.isPending || !apiKey.trim()}
          onClick={() => mutation.mutate(apiKey.trim())}
        >
          {mutation.isPending ? "Salvando…" : "Salvar chave"}
        </button>
        {configured ? (
          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ borderColor: "var(--ql-border)" }}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(null)}
          >
            Remover chave
          </button>
        ) : null}
      </div>

      {notice ? (
        <p className="text-sm font-medium" style={{ color: "var(--ql-accent)" }}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-800">{error}</p>
      ) : null}
    </section>
  );
}
