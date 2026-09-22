# QuestLog

Quadro pessoal de trabalho em andamento: a unidade é a **quest** (o que você está tocando agora), não o card do Jira.

Local-first · SQLite na sua máquina · sem cloud obrigatório.

## O que você precisa

- [Node.js](https://nodejs.org/) LTS + [pnpm](https://pnpm.io/installation) — só na **primeira vez** (setup / gerar o app)
- (Opcional) [Cursor](https://cursor.com/) — se quiser ingest automático de commits
- (Opcional) Jira / Gemini — o board funciona sem isso

## Instalação (primeira vez)

No clone do repositório:

```bash
pnpm setup
cp .env.example .env
```

Crie o perfil:

```bash
pnpm seed -- minimal   # genérico — use este se não for o time Gran
# ou
pnpm seed -- gran      # exemplo HESEC + repos placeholder
```

### Opção A — App Windows (recomendado no dia a dia)

Gera o executável (demora alguns minutos na primeira vez):

```bash
pnpm desktop:pack
```

Abra:

`apps/desktop/release/QuestLog.exe`

- Windows pode avisar que o app **não é assinado** — esperado nesta fase; avance se confiar no build local.
- Não precisa deixar terminal aberto nem rodar `pnpm start`.
- Seus dados ficam no data dir do usuário (abaixo), não “dentro” do `.exe`.

Atalho útil: copie `QuestLog.exe` para a Área de Trabalho ou fixe na barra de tarefas.

### Opção B — Pelo monorepo (desenvolvimento)

```bash
pnpm desktop          # janela Electron (precisa do clone + Node)
# ou
pnpm start            # API + Vite no browser → http://127.0.0.1:5173
```

### Configurar o perfil

Na primeira abertura, no **Settings / wizard**:

1. Paths **absolutos** dos repos que você quer monitorar  
2. Regex de ticket e base URL (se usar links)  
3. (Opcional) chave Gemini para resumo de épicos  

Dados locais:

| SO | Pasta |
|----|--------|
| Windows | `%APPDATA%/questlog/` |
| macOS | `~/Library/Application Support/questlog` |
| Linux | `$XDG_DATA_HOME/questlog` (ou `~/.local/share/questlog`) |

Override: `QUESTLOG_DATA_DIR` no `.env`.

## Como abrir de manhã

1. Duplo clique em **QuestLog.exe** (ou `pnpm desktop` / `pnpm start` se estiver desenvolvendo)
2. Confira quests **Em andamento** e **Pausadas**
3. Ao pausar, preencha **Falta**
4. (Opcional) hooks do Cursor → commits entram sozinhos na timeline
5. (Opcional) Status Jira / `refresh-jira` para título + status

## Hooks do Cursor (commits → timeline)

Sem hooks, board e CLI já funcionam. Com hooks, `git commit` nos repos do perfil alimenta a timeline **mesmo com o app fechado**.

Passo a passo + arquivos prontos: **[cursor/HOOKS.md](cursor/HOOKS.md)**.

Resumo: copiar exemplos de `cursor/` para `~/.cursor/`, definir `QUESTLOG_ROOT` (caminho deste clone), reiniciar o Cursor.

## Gerar o .exe de novo

Depois de puxar mudanças ou alterar o app:

```bash
pnpm desktop:pack
```

Saída: `apps/desktop/release/QuestLog.exe`  
(Windows only por enquanto; sem auto-update / code signing.)

## CLI

```bash
pnpm --filter @questlog/cli remind
pnpm --filter @questlog/cli ingest-commit
pnpm --filter @questlog/cli ingest-commit -- --strict
pnpm --filter @questlog/cli refresh-jira
pnpm --filter @questlog/cli refresh-jira -- --file path/to/issues.json
pnpm --filter @questlog/cli import-jira -- path/to/export.json
```

`ingest-commit` é **fail-open** (não quebra o `git commit`).  
Se falhar depois de ler o commit, o payload vai para `ingest-queue.json` no data dir e é reprocessado no próximo ingest.

`refresh-jira` atualiza **só título + status** das tickets já ligadas a quests (nunca a descrição do card).  
Credenciais: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` no `.env` (ver `.env.example`).

Resumo de épicos (Gemini): chave em **Settings** na UI (`secrets.json` no data dir).

## Stack

| Peça | Tech |
|------|------|
| `packages/core` | TypeORM + better-sqlite3 + Zod |
| `apps/server` | Fastify (`127.0.0.1:8787`) |
| `apps/web` | Vite · React · Tailwind · TanStack Query |
| `apps/cli` | seed · ingest-commit · remind · jira |
| `apps/desktop` | Electron (shell + pack Windows) |

Plano: [questlog-PLAN.md](questlog-PLAN.md).
