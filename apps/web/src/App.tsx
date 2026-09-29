import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ProfileSettings } from "./features/profile/ProfileSettings";
import { ProfileWizard } from "./features/profile/ProfileWizard";
import { ArchiveBoard } from "./features/quests/ArchiveBoard";
import { QuestBoard } from "./features/quests/QuestBoard";
import { SprintHistoryView } from "./features/sprint/SprintHistoryView";
import { fetchHealth, fetchProfile } from "./shared/lib/api";
import { useBoardLiveSync } from "./shared/lib/use-board-live-sync";

type Screen = "board" | "archive" | "settings" | "sprint";

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
  const onBoard =
    !apiDown &&
    !loading &&
    Boolean(profileQuery.data) &&
    (screen === "board" || screen === "archive");

  useBoardLiveSync(onBoard);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
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
            <code className="rounded bg-stone-200 px-1">pnpm start</code>
            {" "}na pasta do QuestLog.
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

      {!apiDown && !loading && profileQuery.data && screen === "sprint" ? (
        <SprintHistoryView onBack={() => setScreen("board")} />
      ) : null}

      {!apiDown && !loading && profileQuery.data && screen === "archive" ? (
        <ArchiveBoard
          profile={profileQuery.data}
          onBack={() => setScreen("board")}
        />
      ) : null}

      {!apiDown && !loading && profileQuery.data && screen === "board" ? (
        <QuestBoard
          profile={profileQuery.data}
          onOpenSettings={() => setScreen("settings")}
          onOpenArchive={() => setScreen("archive")}
          onOpenSprint={() => setScreen("sprint")}
        />
      ) : null}
    </main>
  );
}
