export type QuestStatus = "ativa" | "pausada" | "feita";

export type EpicScope = "partial" | "full";

/** Who wrote `falta` — import stubs must not look like user continuity. */
export type FaltaSource = "user" | "import";

export type ProfileRepo = {
  nome: string;
  path: string;
};

export type QuestRepo = {
  nome: string;
  path: string;
  branch: string;
};
