# Cursor hooks — QuestLog

Instalação **user-level** em `~/.cursor/` (vale para todos os projetos).  
Os hooks chamam o **CLI** (`core` direto) — a API HTTP não precisa estar no ar para o ingest.

Exemplos prontos neste repo:

| Arquivo | Uso |
|---------|-----|
| `cursor/hooks.user.example.json` | Windows (PowerShell) |
| `cursor/hooks.user.example.unix.json` | macOS / Linux (bash) |
| `cursor/hooks/questlog-*.ps1` | Scripts Windows |
| `cursor/hooks/questlog-*.sh` | Scripts Unix |

## Pré-requisitos

- Node.js + [pnpm](https://pnpm.io)
- Repo QuestLog clonado; `pnpm setup` ok
- Perfil criado (`pnpm seed -- minimal` ou `gran`) com **paths reais** dos repos no Settings
- Variável opcional `QUESTLOG_ROOT` = caminho absoluto do monorepo QuestLog  
  (senão edite a linha `EDIT ME` / default nos scripts)

## Instalação rápida (Windows)

No PowerShell, a partir da pasta do QuestLog:

```powershell
# 1) apontar o monorepo (persista no ambiente do usuário se quiser)
$env:QUESTLOG_ROOT = (Resolve-Path .).Path
[System.Environment]::SetEnvironmentVariable("QUESTLOG_ROOT", $env:QUESTLOG_ROOT, "User")

# 2) copiar hooks
$cursor = Join-Path $env:USERPROFILE ".cursor"
New-Item -ItemType Directory -Force -Path (Join-Path $cursor "hooks") | Out-Null
Copy-Item .\cursor\hooks.user.example.json (Join-Path $cursor "hooks.json") -Force
Copy-Item .\cursor\hooks\questlog-*.ps1 (Join-Path $cursor "hooks\") -Force
```

Reinicie o Cursor.

## Instalação rápida (macOS / Linux)

```bash
mkdir -p ~/.cursor/hooks
cp cursor/hooks.user.example.unix.json ~/.cursor/hooks.json
cp cursor/hooks/questlog-*.sh ~/.cursor/hooks/
chmod +x ~/.cursor/hooks/questlog-*.sh
export QUESTLOG_ROOT="$(pwd)"   # adicione ao shell profile
```

Reinicie o Cursor.

## O que cada hook faz

### `sessionStart` → remind

- lista ativas/pausadas
- testa `http://127.0.0.1:8787/api/health`
- se a API estiver down, pede para subir o server (`pnpm start`)

### `afterShellExecution` → ingest-commit

Quando o comando parece um **`git commit`** bem-sucedido:

1. Usa o `cwd` do evento (repo do commit)
2. Roda `pnpm --filter @questlog/cli ingest-commit` nesse diretório

### Fail-open

`ingest-commit` **não** deve falhar o commit do git:

- default: erros do QuestLog só vão para stderr; exit code 0
- use `--strict` só para debug manual

## O que o ingest faz

1. Casa `cwd` com `profile.repos[].path`
2. Lê `git log -1` + `--stat` + branch
3. Chama `ingestCommit` no core (ticket → branch → quest ativa → Inbox)

Se o cwd **não** for um repo do perfil, o CLI avisa e sai sem erro.

## Conferindo

```bash
pnpm --filter @questlog/cli remind
cd /caminho/do/seu-repo
# faça um commit de teste
pnpm --dir "$QUESTLOG_ROOT" --filter @questlog/cli ingest-commit -- --strict
```

Abra o board e veja a timeline da quest / Inbox.

## Notas

- Não coloque lógica QuestLog dentro dos repos da empresa — só hooks no `~/.cursor`
- Não commite o `.db` nem paths reais sensíveis no GitHub público
- Formato dos hooks do Cursor pode mudar; estes exemplos seguem `hooks.json` version 1
