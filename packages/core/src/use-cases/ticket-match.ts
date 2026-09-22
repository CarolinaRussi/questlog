/** Extract unique ticket ids from text using the profile regex (global). */
export function extractTicketIds(text: string, pattern: string): string[] {
  if (!text || !pattern) {
    return [];
  }

  const regex = new RegExp(pattern, "gi");
  const matches = text.match(regex) ?? [];
  const seen = new Set<string>();
  const ticketIds: string[] = [];

  for (const match of matches) {
    const normalized = match.toUpperCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    ticketIds.push(match);
  }

  return ticketIds;
}

export function questHasAnyTicket(
  questTicketIds: string[],
  candidateTicketIds: string[],
): boolean {
  if (questTicketIds.length === 0 || candidateTicketIds.length === 0) {
    return false;
  }

  const questSet = new Set(questTicketIds.map((id) => id.toUpperCase()));
  return candidateTicketIds.some((id) => questSet.has(id.toUpperCase()));
}
