/** Normalize ticket ids for stable comparison (HESEC-10). */
export function normalizeTicketId(ticketId: string): string {
  return ticketId.trim().toUpperCase();
}

/** Strip remote/ref noise from a git branch name. */
export function normalizeBranchName(branch: string): string {
  return branch
    .trim()
    .replace(/^refs\/heads\//i, "")
    .replace(/^refs\/remotes\//i, "")
    .replace(/^origin\//i, "")
    .replace(/^upstream\//i, "");
}

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
    const normalized = normalizeTicketId(match);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    ticketIds.push(normalized);
  }

  return ticketIds;
}

/**
 * Extract tickets from a branch name.
 * Tries the full cleaned name, then path segments (feature / HESEC-20 / login).
 */
export function extractTicketsFromBranch(
  branch: string,
  pattern: string,
): string[] {
  if (!branch || !pattern) {
    return [];
  }

  const cleaned = normalizeBranchName(branch);
  const fromFull = extractTicketIds(cleaned, pattern);
  if (fromFull.length > 0) {
    return fromFull;
  }

  const seen = new Set<string>();
  const ticketIds: string[] = [];
  for (const segment of cleaned.split(/[/_]+/)) {
    for (const ticketId of extractTicketIds(segment, pattern)) {
      if (seen.has(ticketId)) {
        continue;
      }
      seen.add(ticketId);
      ticketIds.push(ticketId);
    }
  }
  return ticketIds;
}

export function questHasAnyTicket(
  questTicketIds: string[],
  candidateTicketIds: string[],
): boolean {
  return countTicketOverlap(questTicketIds, candidateTicketIds) > 0;
}

export function countTicketOverlap(
  questTicketIds: string[],
  candidateTicketIds: string[],
): number {
  if (questTicketIds.length === 0 || candidateTicketIds.length === 0) {
    return 0;
  }

  const questSet = new Set(questTicketIds.map(normalizeTicketId));
  let overlap = 0;
  for (const candidate of candidateTicketIds) {
    if (questSet.has(normalizeTicketId(candidate))) {
      overlap += 1;
    }
  }
  return overlap;
}

/** Prefer the open quest that shares the most ticket ids (list order is tie-break). */
export function pickBestQuestByTickets<
  T extends { ticketIds: string[] },
>(quests: T[], candidateTicketIds: string[]): T | null {
  let best: T | null = null;
  let bestScore = 0;

  for (const quest of quests) {
    const score = countTicketOverlap(quest.ticketIds, candidateTicketIds);
    if (score > bestScore) {
      best = quest;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}
