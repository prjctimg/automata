#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
mkdir -p dist
OUT="${1:-dist/craftty-bot}"
ENTRY="scripts/bot/tui.mjs"

if command -v scriptc >/dev/null 2>&1; then
  echo "Using scriptc..."
  scriptc "$ENTRY" -o "$OUT"
elif command -v bun >/dev/null 2>&1; then
  echo "scriptc not found; using bun build --compile fallback..."
  bun build --compile "$ENTRY" --outfile "$OUT"
elif command -v deno >/dev/null 2>&1; then
  echo "scriptc/bun not found; using deno compile fallback..."
  deno compile --allow-read --allow-run --allow-env --output "$OUT" "$ENTRY"
else
  echo "No supported compiler found (scriptc, bun, deno)." >&2
  exit 1
fi

echo "Built: $OUT"
file "$OUT" || true
