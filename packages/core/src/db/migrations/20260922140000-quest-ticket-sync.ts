import type { MigrationInterface, QueryRunner } from "typeorm";

export class QuestTicketSync20260922140000 implements MigrationInterface {
  name = "QuestTicketSync20260922140000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE quests ADD COLUMN ticket_status TEXT
    `);
    await queryRunner.query(`
      ALTER TABLE quests ADD COLUMN ticket_synced_at datetime
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite cannot DROP COLUMN in older versions; rebuild table.
    await queryRunner.query(`
      CREATE TABLE quests_tmp (
        id TEXT PRIMARY KEY NOT NULL,
        profile_id TEXT NOT NULL,
        titulo TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ativa',
        ticket_ids_json TEXT NOT NULL DEFAULT '[]',
        epic_id TEXT,
        epic_scope TEXT NOT NULL DEFAULT 'partial',
        repos_json TEXT NOT NULL DEFAULT '[]',
        falta TEXT NOT NULL DEFAULT '',
        atualizado_em datetime NOT NULL,
        created_at datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (profile_id) REFERENCES profiles(id)
      )
    `);
    await queryRunner.query(`
      INSERT INTO quests_tmp (
        id, profile_id, titulo, status, ticket_ids_json, epic_id, epic_scope,
        repos_json, falta, atualizado_em, created_at
      )
      SELECT
        id, profile_id, titulo, status, ticket_ids_json, epic_id, epic_scope,
        repos_json, falta, atualizado_em, created_at
      FROM quests
    `);
    await queryRunner.query(`DROP TABLE quests`);
    await queryRunner.query(`ALTER TABLE quests_tmp RENAME TO quests`);
    await queryRunner.query(`
      CREATE INDEX idx_quests_profile_status ON quests (profile_id, status)
    `);
  }
}
