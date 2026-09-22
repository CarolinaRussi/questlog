import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { fetchBoardRevision } from "../lib/api";

const BOARD_POLL_MS = 2_500;

/**
 * Polls a light board revision token and invalidates full board queries
 * only when something actually changed (quests / commits / profile).
 */
export function useBoardLiveSync(enabled: boolean): void {
  const queryClient = useQueryClient();
  const lastRevisionRef = useRef<string | null>(null);

  const revisionQuery = useQuery({
    queryKey: ["board-revision"],
    queryFn: fetchBoardRevision,
    enabled,
    refetchInterval: enabled ? BOARD_POLL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  useEffect(() => {
    const next = revisionQuery.data?.revision;
    if (!next) return;

    const previous = lastRevisionRef.current;
    lastRevisionRef.current = next;

    if (previous === null || previous === next) return;

    void queryClient.invalidateQueries({ queryKey: ["profile"] });
    void queryClient.invalidateQueries({ queryKey: ["board-home"] });
    void queryClient.invalidateQueries({ queryKey: ["board-archive"] });
    void queryClient.invalidateQueries({ queryKey: ["quests"] });
    void queryClient.invalidateQueries({ queryKey: ["commits"] });
    void queryClient.invalidateQueries({ queryKey: ["epic-notes"] });
  }, [queryClient, revisionQuery.data?.revision]);
}
