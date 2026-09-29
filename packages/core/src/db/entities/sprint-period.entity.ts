import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

/** Closed manual sprint window (summary text comes in phase 7.3+). */
@Entity({ name: "sprint_periods" })
export class SprintPeriod extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "profile_id", type: "text" })
  profileId!: string;

  @Column({ type: "text", nullable: true })
  rotulo!: string | null;

  @Column({ type: "datetime" })
  inicio!: Date;

  @Column({ type: "datetime" })
  fim!: Date;

  @Column({ name: "fechada_em", type: "datetime" })
  fechadaEm!: Date;

  @Column({ name: "resumo_text", type: "text", default: "" })
  resumoText!: string;

  @Column({
    name: "included_quest_ids_json",
    type: "simple-json",
    default: "[]",
  })
  includedQuestIds!: string[];
}
