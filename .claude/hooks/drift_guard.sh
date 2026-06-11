#!/bin/bash
# HeroWerk Drift-Warnsystem — PreToolUse Hard-Block (R21, 2026-05-23).
# Blockiert Write/Edit/MultiEdit auf geschuetzte Pfade (01_Finanzmodell/**, _Vault_Pending/**),
# wenn der Kontext-Fuellgrad die rote Schwelle ueberschreitet (Default 70 %).
#
# Logik:
#   1. Tool muss Write/Edit/MultiEdit sein, sonst exit 0 (kein Eingriff).
#   2. file_path muss in einem geschuetzten Pfad liegen, sonst exit 0.
#   3. Token-Schaetzung aus transcript_path (bytes/4, konservativ).
#   4. Wenn pct >= red_percent (Default 70 %): exit 2 mit Klartext-Begruendung auf stderr.
#      Claude Code zeigt stderr dem Agent + User als Block-Grund an.

set -u

input=$(cat)
tool_name=$(printf '%s' "$input" | jq -r '.tool_name // ""' 2>/dev/null)

# Nur Write/Edit/MultiEdit pruefen
case "$tool_name" in
  Write|Edit|MultiEdit) ;;
  *) exit 0 ;;
esac

file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""' 2>/dev/null)
transcript=$(printf '%s' "$input" | jq -r '.transcript_path // ""' 2>/dev/null)

# Pfad-Schutz: 01_Finanzmodell/ oder _Vault_Pending/
PROTECTED=0
case "$file_path" in
  */01_Finanzmodell/*|*/_Vault_Pending/*) PROTECTED=1 ;;
esac
[ "$PROTECTED" -eq 0 ] && exit 0

# Token-Schaetzung
if [ ! -f "$transcript" ]; then
  exit 0
fi
bytes=$(wc -c < "$transcript" | tr -d ' ')
# FIX 2026-06-03 (ZK27-Befund, Benjamin-freigegeben): eingebettete base64-Bilder
# (Visual-QA-Renders, Screenshots) blaehen die Transcript-Bytes massiv auf -> Hook
# meldete 78 % bei real 28 % und loeste einen False-Block aus. Korrektur: alle
# base64-`data`-Felder (Bild-/Anhang-Payload) aus der Byte-Schaetzung herausrechnen.
# Fallback auf Roh-Bytes, falls jq fehlt/scheitert. Schwellen/Schutz unveraendert.
img_bytes=$(jq -rn '[inputs | .. | .data? // empty | select(type=="string") | length] | add // 0' "$transcript" 2>/dev/null)
case "$img_bytes" in
  ''|*[!0-9]*) img_bytes=0 ;;
esac
eff_bytes=$((bytes - img_bytes))
[ "$eff_bytes" -lt 0 ] && eff_bytes="$bytes"
tokens=$((eff_bytes / 4))
ctx_size=1000000
pct=$((tokens * 100 / ctx_size))

# Threshold aus Config
THR_FILE="$(dirname "$0")/../drift_thresholds.json"
HARD=70
if [ -f "$THR_FILE" ]; then
  HARD=$(jq -r '.red_percent // 70' "$THR_FILE" 2>/dev/null || echo 70)
  CFG_CTX=$(jq -r '.context_window_size // empty' "$THR_FILE" 2>/dev/null)
  if [ -n "${CFG_CTX:-}" ] && [ "$CFG_CTX" != "null" ] && [ "$CFG_CTX" -gt 0 ]; then
    ctx_size="$CFG_CTX"
    pct=$((tokens * 100 / ctx_size))
  fi
fi

if [ "$pct" -ge "$HARD" ]; then
  cat <<EOF >&2
=== R21 DRIFT-ZONE HARD-BLOCK ===
Kontext-Fuellgrad: ca. ${pct} % (Schaetzung ${tokens} Tokens aus ${bytes} Transcript-Bytes / 4).
Rote Schwelle: ${HARD} %.
Geschuetzter Pfad: '${file_path}'
Geschuetzte Zonen: 01_Finanzmodell/**, _Vault_Pending/**

Grund: Opus 4.7 zeigt ab dieser Schwelle empirisch Drift/Halluzination.
High-Stakes-Writes (Modell, Bank, Strategie) sind blockiert, um Korruption
des Finanzmodells durch driftendes Reasoning zu verhindern.

Aktion:
  - '/compact' ausfuehren (kompaktiert Conversation), ODER
  - Neue Session starten und Aufgabe mit frischem Kontext angehen.

Schwellen tunen: .claude/drift_thresholds.json (red_percent).
Bypass im Notfall: Hook-Eintrag in .claude/settings.json temporaer entfernen.
EOF
  exit 2
fi
exit 0
