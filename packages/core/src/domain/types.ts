export type QuestStatus = "ativa" | "pausada" | "feita";

export type EpicScope = "partial" | "full";

export type ProfileRepo = {
  nome: string;
  path: string;
};

export type QuestRepo = {
  nome: string;
  path: string;
  branch: string;
};
