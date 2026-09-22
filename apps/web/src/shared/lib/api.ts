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

export function ticketHref(baseUrl: string, ticketId: string): string | null {
  if (!baseUrl.trim()) return null;
  return `${baseUrl.replace(/\/?$/, "/")}${ticketId}`;
}
