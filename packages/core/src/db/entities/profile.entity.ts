import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { ProfileRepo } from "../../domain/types.js";

@Entity({ name: "profiles" })
export class Profile extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", default: "default" })
  name!: string;

  @Column({ name: "repos_json", type: "simple-json", default: "[]" })
  repos!: ProfileRepo[];

  @Column({ name: "ticket_pattern", type: "text" })
  ticketPattern!: string;

  @Column({ name: "ticket_prefix_label", type: "text", default: "Ticket" })
  ticketPrefixLabel!: string;

  @Column({ name: "ticket_base_url", type: "text", default: "" })
  ticketBaseUrl!: string;

  @Column({ name: "ticket_has_epic", type: "boolean", default: false })
  ticketHasEpic!: boolean;

  @Column({ name: "branch_pattern", type: "text", nullable: true })
  branchPattern!: string | null;

  @Column({ name: "commit_hint", type: "text", nullable: true })
  commitHint!: string | null;

  @Column({ type: "text", default: "pt-BR" })
  locale!: string;

  @Column({ name: "active_quest_id", type: "text", nullable: true })
  activeQuestId!: string | null;

  @Column({ name: "sprint_inicio", type: "datetime", nullable: true })
  sprintInicio!: Date | null;

  @Column({ name: "sprint_fim", type: "datetime", nullable: true })
  sprintFim!: Date | null;

  @Column({ name: "sprint_rotulo", type: "text", nullable: true })
  sprintRotulo!: string | null;

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime" })
  updatedAt!: Date;
}
