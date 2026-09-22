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

export type HealthResponse = {
  ok: boolean;
  core: string;
};

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

export async function saveProfile(
  body: UpsertProfileBody,
): Promise<Profile> {
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(
      payload?.message ?? `Failed to save profile (${response.status})`,
    );
  }
  return (await response.json()) as Profile;
}
