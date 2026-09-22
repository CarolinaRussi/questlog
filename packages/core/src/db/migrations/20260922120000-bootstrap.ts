import type { MigrationInterface, QueryRunner } from "typeorm";

/** Proves the migration runner; domain tables arrive in slice 1.3. */
export class Bootstrap20260922120000 implements MigrationInterface {
  name = "Bootstrap20260922120000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE questlog_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )
    `);
    await queryRunner.query(
      `INSERT INTO questlog_meta (key, value) VALUES ('schema_bootstrap', '1')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE questlog_meta`);
  }
}
