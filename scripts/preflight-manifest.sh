#!/usr/bin/env bash
# P-13-Preflight (Master-Fixplan 23.07.2026, G1): Vor jedem WEBSITE-Versions-Build muss das
# Apps-Script-Manifest des Push-Stands webapp.access == ANYONE_ANONYMOUS tragen, sonst laeuft
# der oeffentliche Rechner nach dem Deploy in eine Google-Anmeldewand. Versionen sind
# unveraenderliche Momentaufnahmen INKLUSIVE Manifest; der HEAD steht zwischen Builds bewusst
# auf DOMAIN (fail-closed, Lehre 20.07.2026).
#
# Aufruf:  scripts/preflight-manifest.sh <pfad/zu/appsscript.json>
# Exit 0 = PASS (Website-Versions-Build erlaubt), Exit 2 = BLOCK (nicht pushen/deployen).
set -euo pipefail

MANIFEST="${1:?Aufruf: preflight-manifest.sh <pfad/zu/appsscript.json>}"

if [ ! -f "$MANIFEST" ]; then
  echo "PREFLIGHT BLOCK: $MANIFEST nicht gefunden." >&2
  exit 2
fi

ACCESS=$(node -e 'const m=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String((m.webapp&&m.webapp.access)||""))' "$MANIFEST")

if [ "$ACCESS" != "ANYONE_ANONYMOUS" ]; then
  echo "PREFLIGHT BLOCK: webapp.access ist '$ACCESS', erwartet ANYONE_ANONYMOUS." >&2
  echo "Manifest vor dem Website-Versions-Build zuruecksetzen (P-13, Master-Fixplan G1)." >&2
  exit 2
fi

echo "PREFLIGHT PASS: webapp.access == ANYONE_ANONYMOUS ($MANIFEST)"
