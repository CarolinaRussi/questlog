import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchSecrets, saveSecrets } from "../../shared/lib/api";

export function JiraSettings() {
  const queryClient = useQueryClient();
  const [baseUrl, setBaseUrl] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const secretsQuery = useQuery({
    queryKey: ["secrets"],
    queryFn: fetchSecrets,
  });

  const mutation = useMutation({
    mutationFn: (body: {
      jiraBaseUrl: string | null;
      jiraEmail: string | null;
      jiraApiToken: string | null;
    }) => saveSecrets(body),
    onSuccess: (result) => {
      setApiToken("");
      setError(null);
      setNotice(
        result.jiraConfigured
          ? "Jira salvo neste computador (vale no app e no CLI)."
          : "Credenciais Jira removidas.",
      );
      queryClient.setQueryData(["secrets"], result);
    },
    onError: (err) => {
      setNotice(null);
      setError(err instanceof Error ? err.message : "Erro ao salvar Jira");
    },
  });

  const configured = secretsQuery.data?.jiraConfigured ?? false;
  const savedBaseUrl = secretsQuery.data?.jiraBaseUrl ?? "";
  const savedEmail = secretsQuery.data?.jiraEmail ?? "";

  return (
    <section
      className="space-y-3 rounded-xl border px-4 py-4"
      style={{ borderColor: "var(--ql-border)" }}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          Jira (status + títulos)
        </h3>
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          Salvo no data dir deste PC — o app desktop não lê o{" "}
          <code>.env</code> do clone. Token de API do Atlassian, não a senha da
          conta.
        </p>
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          Status:{" "}
          <strong>{configured ? "configurado" : "não configurado"}</strong>
          {configured && savedEmail ? ` · ${savedEmail}` : ""}
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Base URL</span>
        <input
          className="field"
          type="url"
          autoComplete="off"
          placeholder={savedBaseUrl || "https://seu-site.atlassian.net"}
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <input
          className="field"
          type="email"
          autoComplete="off"
          placeholder={savedEmail || "voce@empresa.com"}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">
          {configured ? "Substituir token" : "Token da API"}
        </span>
        <input
          className="field"
          type="password"
          autoComplete="off"
          placeholder={configured ? "••••••••" : "token do Atlassian"}
          value={apiToken}
          onChange={(event) => setApiToken(event.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--ql-accent)" }}
          disabled={
            mutation.isPending ||
            !baseUrl.trim() ||
            !email.trim() ||
            !apiToken.trim()
          }
          onClick={() =>
            mutation.mutate({
              jiraBaseUrl: baseUrl.trim() || null,
              jiraEmail: email.trim() || null,
              jiraApiToken: apiToken.trim() || null,
            })
          }
        >
          {mutation.isPending ? "Salvando…" : "Salvar Jira"}
        </button>
        {configured ? (
          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ borderColor: "var(--ql-border)" }}
            disabled={mutation.isPending}
            onClick={() => {
              setBaseUrl("");
              setEmail("");
              setApiToken("");
              mutation.mutate({
                jiraBaseUrl: null,
                jiraEmail: null,
                jiraApiToken: null,
              });
            }}
          >
            Remover
          </button>
        ) : null}
      </div>

      {notice ? (
        <p className="text-sm font-medium" style={{ color: "var(--ql-accent)" }}>
          {notice}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </section>
  );
}
