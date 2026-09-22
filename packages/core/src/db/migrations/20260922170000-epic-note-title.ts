import type { MigrationInterface, QueryRunner } from "typeorm";

export class EpicNoteTitle20260922170000 implements MigrationInterface {
  name = "EpicNoteTitle20260922170000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE epic_notes ADD COLUMN title TEXT NOT NULL DEFAULT ''
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite: drop+recreate would be heavy; leave column on downgrade.
    await queryRunner.query(`
      UPDATE epic_notes SET title = '' WHERE title IS NOT NULL
    `);
  }
}
