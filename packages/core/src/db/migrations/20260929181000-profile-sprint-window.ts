import type { MigrationInterface, QueryRunner } from "typeorm";

export class ProfileSprintWindow20260929181000 implements MigrationInterface {
  name = "ProfileSprintWindow20260929181000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE profiles ADD COLUMN sprint_inicio datetime
    `);
    await queryRunner.query(`
      ALTER TABLE profiles ADD COLUMN sprint_fim datetime
    `);
    await queryRunner.query(`
      ALTER TABLE profiles ADD COLUMN sprint_rotulo TEXT
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // no-op (SQLite drop column not used in this project)
  }
}
