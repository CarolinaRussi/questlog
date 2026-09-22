import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "commits" })
export class Commit extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "profile_id", type: "text" })
  profileId!: string;

  /** Null = Inbox (unclassified). */
  @Column({ name: "quest_id", type: "text", nullable: true })
  questId!: string | null;

  @Column({ type: "text" })
  hash!: string;

  @Column({ type: "text" })
  repo!: string;

  @Column({ type: "datetime" })
  quando!: Date;

  @Column({ type: "text" })
  assunto!: string;

  @Column({ type: "text", default: "" })
  resumo!: string;

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt!: Date;
}
