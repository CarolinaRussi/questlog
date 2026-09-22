import type { MigrationInterface, QueryRunner } from "typeorm";

export class EpicNotes20260922150000 implements MigrationInterface {
  name = "EpicNotes20260922150000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE epic_notes (
        id TEXT PRIMARY KEY NOT NULL,
        profile_id TEXT NOT NULL,
        epic_id TEXT NOT NULL,
        overview TEXT NOT NULL DEFAULT '',
        progress TEXT NOT NULL DEFAULT '',
        updated_at datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (profile_id) REFERENCES profiles(id),
        UNIQUE (profile_id, epic_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_epic_notes_profile ON epic_notes (profile_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE epic_notes`);
  }
}
