import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Rolling AI notes for an epic key (e.g. HESEC-100).
 * overview = what the epic is about; progress = what I've been doing.
 */
@Entity({ name: "epic_notes" })
export class EpicNote extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "profile_id", type: "text" })
  profileId!: string;

  /** External epic key (ticket id), normalized uppercase. */
  @Column({ name: "epic_id", type: "text" })
  epicId!: string;

  @Column({ type: "text", default: "" })
  overview!: string;

  @Column({ type: "text", default: "" })
  progress!: string;

  @UpdateDateColumn({ name: "updated_at", type: "datetime" })
  updatedAt!: Date;
}
