#!/usr/bin/env bash
# QuestLog — sessionStart: remind (copy to ~/.cursor/hooks/)
# Prefer env QUESTLOG_ROOT = absolute path to the questlog monorepo.
set +e

QUESTLOG_ROOT="${QUESTLOG_ROOT:-$HOME/path/to/questlog}"

# Drain stdin JSON
cat >/dev/null || true

if [[ ! -d "$QUESTLOG_ROOT" ]]; then
  echo "QUESTLOG_ROOT not found: $QUESTLOG_ROOT — set env or edit this script." >&2
  exit 0
fi

pnpm --dir "$QUESTLOG_ROOT" --filter @questlog/cli remind
exit 0
