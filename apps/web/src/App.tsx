import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "./shared/lib/api";

export function App() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <header className="space-y-2">
        <p
          className="text-sm font-semibold tracking-[0.2em] uppercase"
          style={{ color: "var(--ql-accent)" }}
        >
          Local board
        </p>
        <h1
          className="text-5xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          QuestLog
        </h1>
        <p className="max-w-xl text-lg" style={{ color: "var(--ql-muted)" }}>
          Scaffold da web (fatia 1.10). A API local aparece abaixo — wizard e
          board vêm nas próximas fatias.
        </p>
      </header>

      <section
        className="rounded-2xl border px-5 py-4 shadow-sm"
        style={{
          background: "var(--ql-panel)",
          borderColor: "var(--ql-border)",
        }}
      >
        <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase">
          API health
        </h2>
        {healthQuery.isLoading ? (
          <p style={{ color: "var(--ql-muted)" }}>Checando http://127.0.0.1:8787…</p>
        ) : null}
        {healthQuery.isError ? (
          <p className="text-red-800">
            API fora. Rode{" "}
            <code className="rounded bg-stone-200 px-1">
              pnpm --filter @questlog/server start
            </code>
          </p>
        ) : null}
        {healthQuery.data ? (
          <p>
            OK — core <code>{healthQuery.data.core}</code>
          </p>
        ) : null}
      </section>
    </main>
  );
}
