# QuestLog

Quadro pessoal de trabalho em andamento: **quest** (o que você está tocando), não o card do Jira.

Local-first · SQLite · API em `127.0.0.1` · hooks do Cursor via CLI.

## Como abrir de manhã

Num terminal, na pasta do repo:

```bash
pnpm install
pnpm --filter @questlog/core build
pnpm seed -- gran
```

Ajuste os **paths dos repos** no wizard/Settings da UI (o seed Gran usa placeholders `~/projetos/...`).

Suba API + web:

```bash
pnpm --filter @questlog/server start
```

Em outro terminal:

```bash
pnpm --filter @questlog/web dev
```

Abra **http://127.0.0.1:5173** (proxy `/api` → `8787`).

Ou, com tudo em paralelo (depois do build do core):

```bash
pnpm dev
```

### Checklist do dia

1. Abrir o Cursor → o hook `sessionStart` deve lembrar o board (`questlog remind`)
2. Abrir http://127.0.0.1:5173
3. Confirmar/criar a quest ativa e o campo **Falta** se estiver retomando
4. Trabalhar e commitar nos repos do perfil → `ingest-commit` atualiza a timeline

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
