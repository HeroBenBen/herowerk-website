#!/usr/bin/env bash
# Ein Aufruf, ausschließlich lokale Prüfdaten. Kein Bündel, kein Live-Server.
set -euo pipefail
if [ "${1:-}" != "--freigegeben" ]; then
  echo "Prüflauf gesperrt: Container und Browser benötigen die ausdrückliche Freigabe. Nach Freigabe mit --freigegeben aufrufen." >&2
  exit 64
fi
T1308_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$T1308_SCRIPT_DIR/pruefe-t1308-controller.mjs" "$@"
