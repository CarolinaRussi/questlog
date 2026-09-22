import type { MigrationInterface, QueryRunner } from "typeorm";

export class ProfileQuestCommit20260922130000 implements MigrationInterface {
  name = "ProfileQuestCommit20260922130000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL DEFAULT 'default',
        repos_json TEXT NOT NULL DEFAULT '[]',
        ticket_pattern TEXT NOT NULL,
        ticket_prefix_label TEXT NOT NULL DEFAULT 'Ticket',
        ticket_base_url TEXT NOT NULL DEFAULT '',
        ticket_has_epic INTEGER NOT NULL DEFAULT 0,
        branch_pattern TEXT,
        commit_hint TEXT,
        locale TEXT NOT NULL DEFAULT 'pt-BR',
        active_quest_id TEXT,
        created_at datetime NOT NULL DEFAULT (datetime('now')),
        updated_at datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE quests (
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
      CREATE INDEX idx_quests_profile_status ON quests (profile_id, status)
    `);

    await queryRunner.query(`
      CREATE TABLE commits (
        id TEXT PRIMARY KEY NOT NULL,
        profile_id TEXT NOT NULL,
        quest_id TEXT,
        hash TEXT NOT NULL,
        repo TEXT NOT NULL,
        quando datetime NOT NULL,
        assunto TEXT NOT NULL,
        resumo TEXT NOT NULL DEFAULT '',
        created_at datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (profile_id) REFERENCES profiles(id),
        FOREIGN KEY (quest_id) REFERENCES quests(id),
        UNIQUE (repo, hash)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_commits_quest ON commits (quest_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_commits_profile_inbox ON commits (profile_id, quest_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE commits`);
    await queryRunner.query(`DROP TABLE quests`);
    await queryRunner.query(`DROP TABLE profiles`);
  }
}
