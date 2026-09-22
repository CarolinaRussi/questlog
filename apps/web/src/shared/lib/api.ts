export type ProfileRepo = {
  nome: string;
  path: string;
};

export type Profile = {
  id: string;
  name: string;
  repos: ProfileRepo[];
  ticketPattern: string;
  ticketPrefixLabel: string;
  ticketBaseUrl: string;
  ticketHasEpic: boolean;
  branchPattern: string | null;
  commitHint: string | null;
  locale: string;
  activeQuestId: string | null;
};

export type UpsertProfileBody = {
  name?: string;
  repos: ProfileRepo[];
  ticketPattern: string;
  ticketPrefixLabel?: string;
  ticketBaseUrl?: string;
  ticketHasEpic?: boolean;
  branchPattern?: string | null;
  commitHint?: string | null;
  locale?: string;
};

export type QuestStatus = "ativa" | "pausada" | "feita";

export type QuestRepo = {
  nome: string;
  path: string;
  branch: string;
};

export type Quest = {
  id: string;
  profileId: string;
  titulo: string;
  status: QuestStatus;
  ticketIds: string[];
  epicId: string | null;
  epicScope: "partial" | "full";
  repos: QuestRepo[];
  falta: string;
  faltaSource: "user" | "import" | null;
  watching: boolean;
  ticketStatus: string | null;
  ticketSyncedAt: string | null;
  atualizadoEm: string;
  createdAt: string;
};

export type CommitRow = {
  id: string;
  profileId: string;
  questId: string | null;
  hash: string;
  repo: string;
  quando: string;
  assunto: string;
  resumo: string;
};

export type HealthResponse = {
  ok: boolean;
  core: string;
};

export type BoardRevision = {
  revision: string;
};

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  return payload?.message ?? `Request failed (${response.status})`;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error(`API health failed (${response.status})`);
  }
  return (await response.json()) as HealthResponse;
}

export async function fetchBoardRevision(): Promise<BoardRevision> {
  const response = await fetch("/api/board-revision");
  if (!response.ok) {
    throw new Error(`Failed to load board revision (${response.status})`);
  }
  return (await response.json()) as BoardRevision;
}

export async function fetchProfile(): Promise<Profile | null> {
  const response = await fetch("/api/profile");
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load profile (${response.status})`);
  }
  return (await response.json()) as Profile;
}

export async function saveProfile(body: UpsertProfileBody): Promise<Profile> {
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Profile;
}

export async function fetchQuests(): Promise<Quest[]> {
  const response = await fetch("/api/quests");
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Quest[];
}

export async function createQuest(body: {
  titulo: string;
  ticketIds?: string[];
  epicId?: string | null;
  setActive?: boolean;
}): Promise<Quest> {
  const response = await fetch("/api/quests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Quest;
}

export async function pauseQuest(
  questId: string,
  falta: string,
): Promise<Quest> {
  const response = await fetch(`/api/quests/${questId}/pause`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ falta }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Quest;
}

export async function resumeQuest(questId: string): Promise<Quest> {
  const response = await fetch(`/api/quests/${questId}/resume`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Quest;
}

export async function completeQuest(questId: string): Promise<Quest> {
  const response = await fetch(`/api/quests/${questId}/complete`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Quest;
}

export async function activateQuest(questId: string): Promise<Quest> {
  const response = await fetch(`/api/quests/${questId}/activate`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Quest;
}

export async function fetchCommits(options?: {
  questId?: string;
  inbox?: boolean;
}): Promise<CommitRow[]> {
  const params = new URLSearchParams();
  if (options?.questId) params.set("questId", options.questId);
  if (options?.inbox) params.set("inbox", "1");
  const query = params.toString();
  const response = await fetch(
    `/api/commits${query ? `?${query}` : ""}`,
  );
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as CommitRow[];
}

export type RefreshTicketsResult = {
  updated: number;
  markedFeita: number;
  epicLinked: number;
  unmatched: number;
  fetched: number;
};

export async function refreshTickets(): Promise<RefreshTicketsResult> {
  const response = await fetch("/api/tickets/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as RefreshTicketsResult;
}

export type LocalSecretsPublic = {
  geminiConfigured: boolean;
};

export async function fetchSecrets(): Promise<LocalSecretsPublic> {
  const response = await fetch("/api/secrets");
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as LocalSecretsPublic;
}

export async function saveSecrets(body: {
  geminiApiKey?: string | null;
}): Promise<LocalSecretsPublic> {
  const response = await fetch("/api/secrets", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as LocalSecretsPublic;
}

export type EpicNote = {
  id: string;
  profileId: string;
  epicId: string;
  overview: string;
  progress: string;
  updatedAt: string;
};

export type ComplementEpicNotesResult = {
  epicId: string;
  overview: string;
  progress: string;
  questCount: number;
  usedJiraContext: boolean;
};

export async function fetchEpicNotes(): Promise<EpicNote[]> {
  const response = await fetch("/api/epics/notes");
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as EpicNote[];
}

export async function summarizeEpic(
  epicId: string,
): Promise<ComplementEpicNotesResult> {
  const response = await fetch(
    `/api/epics/${encodeURIComponent(epicId)}/summarize`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as ComplementEpicNotesResult;
}

export type HomeEpicCard = {
  epicId: string;
  quests: Quest[];
  openCount: number;
  nextFalta: {
    questId: string;
    falta: string;
    titulo: string;
  } | null;
};

export type BoardHome = {
  epics: HomeEpicCard[];
  ungrouped: Quest[];
  suggestions: Quest[];
};

export async function fetchBoardHome(): Promise<BoardHome> {
  const response = await fetch("/api/board/home");
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as BoardHome;
}

export async function fetchArchive(query?: string): Promise<Quest[]> {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("q", query.trim());
  params.set("limit", "200");
  const response = await fetch(`/api/board/archive?${params}`);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Quest[];
}

export async function promoteQuest(
  questId: string,
  body: { mode?: "watch" | "resume" | "pause"; falta?: string } = {},
): Promise<Quest> {
  const response = await fetch(`/api/quests/${questId}/promote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Quest;
}

export function ticketHref(baseUrl: string, ticketId: string): string | null {
  if (!baseUrl.trim()) return null;
  return `${baseUrl.replace(/\/?$/, "/")}${ticketId}`;
}
