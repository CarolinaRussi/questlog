import type { MigrationInterface, QueryRunner } from "typeorm";

export class SprintPeriods20260929181100 implements MigrationInterface {
  name = "SprintPeriods20260929181100";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sprint_periods (
        id TEXT PRIMARY KEY NOT NULL,
        profile_id TEXT NOT NULL,
        rotulo TEXT,
        inicio datetime NOT NULL,
        fim datetime NOT NULL,
        fechada_em datetime NOT NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles(id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sprint_periods_profile_fechada
      ON sprint_periods (profile_id, fechada_em DESC)
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // no-op
  }
}
