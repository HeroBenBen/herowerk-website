#!/bin/bash
# HeroWerk Lighthouse-Gate — PostToolUse-Hook (Lean-Pipeline T1-7, 2026-06-11).
# Triggert nach Schreibvorgang auf HTML-/CSS-Files einen lokalen Lighthouse-Lauf
# gegen die Vercel-Preview-URL. Bei Performance-Score-Sturz > 20 Punkte gegen
# Baseline: WARNUNG im Output (KEIN Block — exit 0 in jedem Fall).
#
# Konfiguration:
#   PREVIEW_URL          via Env-Var PREVIEW_URL oder Datei .lighthouse_preview_url im Repo-Root
#   Baseline             .lighthouse_baseline.json im Repo-Root ({"performance": <0-100>})
#   Schwelle             20 Punkte (DROP_THRESHOLD)
#
# Voraussetzung: npx + lighthouse (Dev-Dependency ab T1-6b). Fehlt eines davon,
# beendet sich der Hook leise (kein Block, keine Warnung).

set -u

DROP_THRESHOLD=20

input=$(cat)
tool_name=$(printf '%s' "$input" | jq -r '.tool_name // ""' 2>/dev/null)

case "$tool_name" in
  Write|Edit|MultiEdit) ;;
  *) exit 0 ;;
esac

file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""' 2>/dev/null)

# Nur HTML/CSS-Schreibvorgaenge pruefen
case "$file_path" in
  *.html|*.css) ;;
  *) exit 0 ;;
esac

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

preview_url="${PREVIEW_URL:-}"
if [ -z "$preview_url" ] && [ -f "$repo_root/.lighthouse_preview_url" ]; then
  preview_url=$(head -1 "$repo_root/.lighthouse_preview_url" | tr -d '[:space:]')
fi
[ -z "$preview_url" ] && exit 0

command -v npx >/dev/null 2>&1 || exit 0

tmp_report=$(mktemp /tmp/lighthouse_gate.XXXXXX.json)
trap 'rm -f "$tmp_report"' EXIT

if ! npx --yes lighthouse "$preview_url" \
    --only-categories=performance \
    --output=json --output-path="$tmp_report" \
    --chrome-flags="--headless --no-sandbox" --quiet >/dev/null 2>&1; then
  echo "lighthouse_gate: Lighthouse-Lauf fehlgeschlagen (kein Block)." >&2
  exit 0
fi

score=$(jq -r '.categories.performance.score // empty' "$tmp_report" 2>/dev/null)
[ -z "$score" ] && exit 0
score_pct=$(awk -v s="$score" 'BEGIN { printf "%d", s * 100 }')

baseline_file="$repo_root/.lighthouse_baseline.json"
if [ ! -f "$baseline_file" ]; then
  printf '{"performance": %d}\n' "$score_pct" > "$baseline_file"
  echo "lighthouse_gate: Baseline initialisiert (Performance ${score_pct})." >&2
  exit 0
fi

baseline=$(jq -r '.performance // empty' "$baseline_file" 2>/dev/null)
[ -z "$baseline" ] && exit 0

drop=$(( baseline - score_pct ))
if [ "$drop" -gt "$DROP_THRESHOLD" ]; then
  echo "⚠ lighthouse_gate WARNUNG: Performance-Score ${score_pct} liegt ${drop} Punkte unter Baseline ${baseline} (Schwelle ${DROP_THRESHOLD}). Preview: ${preview_url} — bitte pruefen. (Kein Block.)" >&2
else
  echo "lighthouse_gate: Performance ${score_pct} (Baseline ${baseline}) — OK." >&2
fi

exit 0
