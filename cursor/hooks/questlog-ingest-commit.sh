#!/usr/bin/env bash
# QuestLog — afterShellExecution: ingest-commit (fail-open)
# Prefer env QUESTLOG_ROOT = absolute path to the questlog monorepo.
set +e

QUESTLOG_ROOT="${QUESTLOG_ROOT:-$HOME/path/to/questlog}"

input_json="$(cat || true)"
if [[ -z "$input_json" ]]; then
  exit 0
fi

# Prefer node for JSON; fall back to python3
read_field() {
  local field="$1"
  if command -v node >/dev/null 2>&1; then
    node -e "const d=JSON.parse(process.argv[1]||'{}'); const v=d['$field']; process.stdout.write(v==null?'':String(v))" "$input_json"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import json,sys; d=json.loads(sys.argv[1] or '{}'); v=d.get('$field'); print('' if v is None else v)" "$input_json"
  else
    echo ""
  fi
}

command="$(read_field command)"
cwd="$(read_field cwd)"
exit_code="$(read_field exit_code)"
if [[ -z "$exit_code" ]]; then
  exit_code="$(read_field exitCode)"
fi

echo "$command" | grep -Eiq 'git(\.exe)?([[:space:]]+|-C[[:space:]]+[^[:space:]]+[[:space:]]+)commit\b' || exit 0

if [[ -n "$exit_code" && "$exit_code" != "0" ]]; then
  exit 0
fi

if [[ -z "$cwd" || ! -d "$cwd" ]]; then
  cwd="$PWD"
fi

if [[ ! -d "$QUESTLOG_ROOT" ]]; then
  echo "QUESTLOG_ROOT not found: $QUESTLOG_ROOT — set env or edit this script." >&2
  exit 0
fi

cd "$cwd" || exit 0
pnpm --dir "$QUESTLOG_ROOT" --filter @questlog/cli ingest-commit
exit 0
