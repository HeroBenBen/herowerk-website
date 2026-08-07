#!/usr/bin/env bash
# ============================================================
# Startet den Pruefserver: echter Apache, der das fertige IONOS-Buendel mit der
# produktiven .htaccess ausliefert. Ersetzt seit dem 07.08.2026 die Vercel-Vorschau
# als Ziel der automatischen Pruefungen (GF-Entscheid Vercel-Abschaffung).
#
# Aufruf:  scripts/start-pruefserver.sh [PORT]
#          Standard-Port 8080 (gleicher Port wie der lokale Standardwert in
#          playwright.config.js, damit lokal und in der CI dieselbe Adresse gilt).
#
# Gibt die Basis-Adresse auf der Standardausgabe aus und schreibt sie zusaetzlich
# nach $GITHUB_ENV als PREVIEW_URL, wenn die Variable gesetzt ist.
#
# Der Server ist NUR im Laufband erreichbar. Es entsteht keine oeffentliche
# Zweitfassung der Website und es werden keine Zugangsdaten gebraucht.
# ============================================================
set -euo pipefail

PORT="${1:-8080}"
NAME="hw-pruefserver"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE="${PRUEFSERVER_BUNDLE:-/tmp/pruefserver-buendel}"

echo "== 1/4 Buendel bauen (dasselbe Skript wie fuer die Auslieferung nach IONOS)"
"$SRC/scripts/make-ionos-bundle.sh" "$BUNDLE" >/dev/null
if [ ! -f "$BUNDLE/.htaccess" ]; then
  echo "FEHLER: Das Buendel enthaelt keine .htaccess. Ohne sie prueft der Server nichts." >&2
  exit 1
fi
echo "   Buendel: $BUNDLE ($(find "$BUNDLE" -type f | wc -l | tr -d ' ') Dateien)"

echo "== 2/4 Alten Pruefserver entfernen, falls vorhanden"
docker rm -f "$NAME" >/dev/null 2>&1 || true

echo "== 3/4 Apache starten (Port $PORT)"
docker run -d --name "$NAME" \
  -p "$PORT":80 \
  -v "$BUNDLE":/usr/local/apache2/htdocs:ro \
  -v "$SRC/scripts/pruefserver.conf":/usr/local/apache2/conf/extra/pruefserver.conf:ro \
  httpd:2.4 httpd-foreground -c "Include conf/extra/pruefserver.conf" >/dev/null

echo "== 4/4 Auf Antwort warten"
BASE="http://127.0.0.1:$PORT"
for i in $(seq 1 60); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/" || true)"
  if [ "$CODE" = "200" ]; then
    # Gegenprobe: Ohne wirksame .htaccess liefert Apache zwar 200, aber KEINE
    # Sicherheitskopfzeile. Genau das war der stumme Fehler, den diese Umstellung
    # beseitigen soll, deshalb wird er hier hart abgefangen.
    if ! curl -s -D - -o /dev/null "$BASE/" | grep -qi '^content-security-policy:'; then
      echo "FEHLER: Der Server antwortet, liefert aber keine Sicherheitskopfzeile." >&2
      echo "Ursache ist fast immer eine nicht ausgewertete .htaccess (AllowOverride)." >&2
      docker logs "$NAME" 2>&1 | tail -20 >&2
      exit 1
    fi
    echo "Pruefserver bereit: $BASE"
    if [ -n "${GITHUB_ENV:-}" ]; then
      echo "PREVIEW_URL=$BASE" >>"$GITHUB_ENV"
    fi
    exit 0
  fi
  sleep 1
done

echo "FEHLER: Pruefserver hat nach 60 Sekunden nicht mit HTTP 200 geantwortet (zuletzt $CODE)." >&2
docker logs "$NAME" 2>&1 | tail -30 >&2
exit 1
