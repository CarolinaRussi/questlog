# QuestLog

Quadro pessoal de trabalho em andamento: **quest** (o que você está tocando), não o card do Jira.

Local-first · SQLite · API em `127.0.0.1` · hooks do Cursor via CLI.

## Como abrir de manhã

Um terminal só:

```bash
pnpm start
```

Isso builda o `core` e sobe **API + web** juntos. Abra **http://127.0.0.1:5173**.

### Primeira vez (só uma vez)

```bash
pnpm setup
pnpm seed -- gran
```

Depois ajuste os paths dos repos no **wizard/Settings** da UI.

### Checklist do dia

1. `pnpm start` → http://127.0.0.1:5173
2. (Opcional) hook `sessionStart` com `pnpm remind`
3. Confirmar quest ativa / campo **Falta**
4. Commits nos repos do perfil → `ingest-commit` atualiza a timeline

## Seed de exemplos

```bash
pnpm seed -- gran      # HESEC + 3 repos placeholder
pnpm seed -- minimal   # um repo genérico
```

Dados ficam em `%APPDATA%/questlog/` (Windows), `~/Library/Application Support/questlog` (macOS) ou `$XDG_DATA_HOME/questlog` (Linux).  
Override: `QUESTLOG_DATA_DIR`.

## CLI

```bash
pnpm --filter @questlog/cli remind
pnpm --filter @questlog/cli ingest-commit
pnpm --filter @questlog/cli ingest-commit -- --strict
```

`ingest-commit` é **fail-open** por padrão (não quebra o `git commit`).

## Hooks do Cursor

Ver [cursor/HOOKS.md](cursor/HOOKS.md).

## Stack

| Peça | Tech |
|------|------|
| `packages/core` | TypeORM + better-sqlite3 + Zod |
| `apps/server` | Fastify (`127.0.0.1:8787`) |
| `apps/web` | Vite · React · Tailwind · TanStack Query |
| `apps/cli` | seed · ingest-commit · remind |

Plano: [questlog-PLAN.md](questlog-PLAN.md).
