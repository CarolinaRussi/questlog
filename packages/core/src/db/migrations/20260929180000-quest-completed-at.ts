import type { MigrationInterface, QueryRunner } from "typeorm";

export class QuestCompletedAt20260929180000 implements MigrationInterface {
  name = "QuestCompletedAt20260929180000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE quests ADD COLUMN concluida_em datetime
    `);
    await queryRunner.query(`
      UPDATE quests
      SET concluida_em = atualizado_em
      WHERE status = 'feita' AND concluida_em IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite: column stays; down is no-op (same pattern as other migrations).
  }
}
