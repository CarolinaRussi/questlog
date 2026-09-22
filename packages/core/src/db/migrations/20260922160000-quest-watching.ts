import type { MigrationInterface, QueryRunner } from "typeorm";

export class QuestWatching20260922160000 implements MigrationInterface {
  name = "QuestWatching20260922160000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE quests ADD COLUMN falta_source TEXT
    `);
    await queryRunner.query(`
      ALTER TABLE quests ADD COLUMN watching INTEGER NOT NULL DEFAULT 0
    `);

    // Backfill: Jira import stubs are not user continuity.
    await queryRunner.query(`
      UPDATE quests
      SET falta_source = 'import'
      WHERE falta LIKE 'Status no Jira:%'
    `);

    await queryRunner.query(`
      UPDATE quests
      SET falta_source = 'user'
      WHERE TRIM(falta) != ''
        AND falta NOT LIKE 'Status no Jira:%'
    `);

    // Active quests are in focus.
    await queryRunner.query(`
      UPDATE quests
      SET watching = 1
      WHERE status = 'ativa'
    `);

    // Paused with real user falta = accompanied.
    await queryRunner.query(`
      UPDATE quests
      SET watching = 1
      WHERE status = 'pausada' AND falta_source = 'user'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
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
        ticket_status TEXT,
        ticket_synced_at datetime,
        atualizado_em datetime NOT NULL,
        created_at datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (profile_id) REFERENCES profiles(id)
      )
    `);
    await queryRunner.query(`
      INSERT INTO quests_tmp (
        id, profile_id, titulo, status, ticket_ids_json, epic_id, epic_scope,
        repos_json, falta, ticket_status, ticket_synced_at, atualizado_em, created_at
      )
      SELECT
        id, profile_id, titulo, status, ticket_ids_json, epic_id, epic_scope,
        repos_json, falta, ticket_status, ticket_synced_at, atualizado_em, created_at
      FROM quests
    `);
    await queryRunner.query(`DROP TABLE quests`);
    await queryRunner.query(`ALTER TABLE quests_tmp RENAME TO quests`);
    await queryRunner.query(`
      CREATE INDEX idx_quests_profile_status ON quests (profile_id, status)
    `);
  }
}
