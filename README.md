# QuestLog

Quadro pessoal de trabalho em andamento: **quest** (o que você está tocando), não o card do Jira.

Local-first · SQLite · API em `127.0.0.1` · hooks do Cursor via CLI.

## Pré-requisitos

- [Node.js](https://nodejs.org/) (LTS) e [pnpm](https://pnpm.io/installation)
- (Opcional) Cursor IDE, se for usar ingest automático de commits
- (Opcional) credenciais Jira / chave Gemini — o board funciona sem isso

## Primeira vez

```bash
pnpm setup
```

Copie o env de exemplo e preencha só o que for usar (Jira, porta, data dir):

```bash
cp .env.example .env
```

Crie o perfil inicial:

```bash
pnpm seed -- minimal   # genérico — recomendado se não for o time Gran
# ou
pnpm seed -- gran      # exemplo HESEC + repos placeholder
```

Suba API + web:

```bash
pnpm start
```

Abra **http://127.0.0.1:5173** e no **Settings / wizard**:

1. Paths **absolutos** dos seus repos monitorados  
2. Regex de ticket / base URL (se usar links)  
3. (Opcional) chave Gemini para resumo de épicos  

Dados locais: `%APPDATA%/questlog/` (Windows), `~/Library/Application Support/questlog` (macOS) ou `$XDG_DATA_HOME/questlog` (Linux).  
Override: `QUESTLOG_DATA_DIR` no `.env`.

## Como abrir de manhã

```bash
pnpm start
```

→ http://127.0.0.1:5173

### Checklist do dia

1. Board aberto; quests ativas / pausadas visíveis  
2. Campo **Falta** quando pausar  
3. (Opcional) hooks do Cursor → commits caem na timeline sozinhos  
4. (Opcional) **Status Jira** / `refresh-jira` pra título + status  

## Hooks do Cursor (ingest automático)

Sem hooks, o board e o CLI já funcionam. Com hooks, todo `git commit` nos repos do perfil vira timeline.

Passo a passo + arquivos prontos: **[cursor/HOOKS.md](cursor/HOOKS.md)**.

Resumo: copiar `cursor/hooks.user.example.json` → `~/.cursor/hooks.json`, copiar `cursor/hooks/questlog-*` → `~/.cursor/hooks/`, definir `QUESTLOG_ROOT`, reiniciar o Cursor.

## CLI

```bash
pnpm --filter @questlog/cli remind
pnpm --filter @questlog/cli ingest-commit
pnpm --filter @questlog/cli ingest-commit -- --strict
pnpm --filter @questlog/cli refresh-jira
pnpm --filter @questlog/cli refresh-jira -- --file path/to/issues.json
pnpm --filter @questlog/cli import-jira -- path/to/export.json
```

`ingest-commit` é **fail-open** por padrão (não quebra o `git commit`).  
Se o ingest falhar depois de ler o commit, o payload vai para `ingest-queue.json` no data dir e é reprocessado no próximo `ingest-commit`.

`refresh-jira` atualiza **só título + status** das tickets já ligadas a quests  
(nunca a descrição do card). Credenciais: `JIRA_BASE_URL`, `JIRA_EMAIL`,  
`JIRA_API_TOKEN` no `.env` (ver `.env.example`).

Resumo de épicos (Gemini): chave em **Settings** na UI (`secrets.json` no data dir).  
Sem chave o board funciona; o botão de resumo pede configuração.

## Seed de exemplos

```bash
pnpm seed -- minimal   # um repo genérico
pnpm seed -- gran      # HESEC + 3 repos placeholder (edite paths depois)
```

## Stack

| Peça | Tech |
|------|------|
| `packages/core` | TypeORM + better-sqlite3 + Zod |
| `apps/server` | Fastify (`127.0.0.1:8787`) |
| `apps/web` | Vite · React · Tailwind · TanStack Query |
| `apps/cli` | seed · ingest-commit · remind · jira |

Plano: [questlog-PLAN.md](questlog-PLAN.md).
