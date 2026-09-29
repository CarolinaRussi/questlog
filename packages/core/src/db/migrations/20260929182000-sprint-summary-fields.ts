import type { MigrationInterface, QueryRunner } from "typeorm";

export class SprintSummaryFields20260929182000 implements MigrationInterface {
  name = "SprintSummaryFields20260929182000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE profiles ADD COLUMN sprint_resumo_text TEXT NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE profiles ADD COLUMN sprint_included_quest_ids_json TEXT NOT NULL DEFAULT '[]'
    `);
    await queryRunner.query(`
      ALTER TABLE sprint_periods ADD COLUMN resumo_text TEXT NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE sprint_periods ADD COLUMN included_quest_ids_json TEXT NOT NULL DEFAULT '[]'
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // no-op
  }
}
