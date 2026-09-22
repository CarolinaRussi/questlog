import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ProfileSettings } from "./features/profile/ProfileSettings";
import { ProfileWizard } from "./features/profile/ProfileWizard";
import { fetchHealth, fetchProfile } from "./shared/lib/api";

type Screen = "board" | "settings";

export function App() {
  const [screen, setScreen] = useState<Screen>("board");

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    enabled: healthQuery.isSuccess,
  });

  const apiDown = healthQuery.isError;
  const loading =
    healthQuery.isLoading || (healthQuery.isSuccess && profileQuery.isLoading);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
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
      </header>

      {apiDown ? (
        <section className="panel">
          <p className="text-red-800">
            API fora. Rode{" "}
            <code className="rounded bg-stone-200 px-1">
              pnpm --filter @questlog/server start
            </code>
          </p>
        </section>
      ) : null}

      {loading ? (
        <section className="panel animate-pulse space-y-3">
          <div className="h-6 w-40 rounded bg-stone-200" />
          <div className="h-24 rounded bg-stone-200" />
        </section>
      ) : null}

      {!apiDown && !loading && profileQuery.data === null ? (
        <ProfileWizard onSaved={() => setScreen("board")} />
      ) : null}

      {!apiDown && !loading && profileQuery.data && screen === "settings" ? (
        <ProfileSettings
          profile={profileQuery.data}
          onBack={() => setScreen("board")}
        />
      ) : null}

      {!apiDown && !loading && profileQuery.data && screen === "board" ? (
        <section className="panel space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Board
              </h2>
              <p style={{ color: "var(--ql-muted)" }}>
                Perfil <strong>{profileQuery.data.name}</strong> pronto. Lista
                de quests na fatia 1.12.
              </p>
            </div>
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--ql-border)" }}
              onClick={() => setScreen("settings")}
            >
              Settings
            </button>
          </div>
          {healthQuery.data ? (
            <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
              API OK · core {healthQuery.data.core} ·{" "}
              {profileQuery.data.repos.length} repo(s)
            </p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
