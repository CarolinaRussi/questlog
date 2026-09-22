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
