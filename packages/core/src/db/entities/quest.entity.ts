import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { EpicScope, QuestRepo, QuestStatus } from "../../domain/types.js";

@Entity({ name: "quests" })
export class Quest extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "profile_id", type: "text" })
  profileId!: string;

  @Column({ type: "text" })
  titulo!: string;

  @Column({ type: "text", default: "ativa" })
  status!: QuestStatus;

  @Column({ name: "ticket_ids_json", type: "simple-json", default: "[]" })
  ticketIds!: string[];

  @Column({ name: "epic_id", type: "text", nullable: true })
  epicId!: string | null;

  @Column({ name: "epic_scope", type: "text", default: "partial" })
  epicScope!: EpicScope;

  @Column({ name: "repos_json", type: "simple-json", default: "[]" })
  repos!: QuestRepo[];

  @Column({ type: "text", default: "" })
  falta!: string;

  /** Last known external ticket status label (e.g. Jira). Read-only sync. */
  @Column({ name: "ticket_status", type: "text", nullable: true })
  ticketStatus!: string | null;

  @Column({ name: "ticket_synced_at", type: "datetime", nullable: true })
  ticketSyncedAt!: Date | null;

  @Column({ name: "atualizado_em", type: "datetime" })
  atualizadoEm!: Date;

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt!: Date;
}
