import type { Quest } from "./api";

/** User pause note, or a real Jira waiting reason — not the import stub. */
export function visibleQuestFalta(
  quest: Pick<Quest, "falta" | "faltaSource">,
): string {
  const text = quest.falta.trim();
  if (!text) {
    return "";
  }
  if (quest.faltaSource === "user") {
    return text;
  }
  if (quest.faltaSource === "import" && !text.startsWith("Status no Jira:")) {
    return text;
  }
  return "";
}
