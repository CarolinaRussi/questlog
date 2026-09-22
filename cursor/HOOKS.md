# Cursor hooks — QuestLog

Instalação **user-level** em `~/.cursor/` (vale para todos os projetos).  
Os hooks chamam o **CLI** (`core` direto) — a API HTTP não precisa estar no ar para o ingest.

## Pré-requisitos

- Repo QuestLog clonado e `pnpm install` + `pnpm --filter @questlog/core build` ok
- Perfil seedado (`pnpm seed -- gran`) com **paths reais** dos repos
- No Windows, use caminhos absolutos nos hooks (evite depender do `cwd` do Cursor)

Defina (opcional) no ambiente ou no início dos scripts:

- `QUESTLOG_ROOT` — pasta do monorepo QuestLog
- `QUESTLOG_DATA_DIR` — se quiser DB fora do default do SO

## 1. `sessionStart` → remind

Crie/edite o hook de session start para rodar o remind.

Exemplo de comando (ajuste o path):

```bash
pnpm --dir "C:/Users/SEU_USER/projetos pessoais/questlog" --filter @questlog/cli remind
```

PowerShell:

```powershell
pnpm --dir "C:\Users\SEU_USER\projetos pessoais\questlog" --filter @questlog/cli remind
```

O remind:

- lista ativas/pausadas
- testa `http://127.0.0.1:8787/api/health`
- se a API estiver down, pede para subir o server

## 2. `afterShellExecution` → ingest-commit

Quando um comando de shell terminar com sucesso e for um **`git commit`**:

1. Use o `cwd` do comando (repo onde o commit aconteceu)
2. Rode o ingest **nesse diretório**

PowerShell (esqueleto):

```powershell
# Pseudocódigo — adapte aos campos que o seu hook expõe (command, cwd, exitCode)
if ($exitCode -ne 0) { exit 0 }
if ($command -notmatch 'git\s+commit') { exit 0 }

Set-Location $cwd
pnpm --dir "C:\Users\SEU_USER\projetos pessoais\questlog" --filter @questlog/cli ingest-commit
exit 0
```

Bash:

```bash
# Pseudocódigo
[ "$exit_code" -eq 0 ] || exit 0
echo "$command" | grep -Eq 'git[[:space:]]+commit' || exit 0
cd "$cwd" || exit 0
pnpm --dir "$QUESTLOG_ROOT" --filter @questlog/cli ingest-commit
exit 0
```

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
cd /caminho/do/es-api
# faça um commit de teste
pnpm --dir /caminho/do/questlog --filter @questlog/cli ingest-commit -- --strict
```

Abra o board e veja a timeline da quest / Inbox.

## Notas

- Não coloque lógica QuestLog dentro dos repos da empresa — só hooks no `~/.cursor`
- Não commite o `.db` nem paths reais sensíveis no GitHub público
- Formato exato dos arquivos de hook do Cursor muda com a versão do produto; use esta página como **contrato de comportamento** e adapte ao schema atual do seu `~/.cursor/hooks.json` (ou equivalente)
