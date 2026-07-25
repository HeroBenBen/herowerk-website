#!/usr/bin/env bash
# ============================================================
# Erzeugt das statische IONOS-Upload-Bundle (SFTP) aus dem Repo-Root.
# Enthaelt NUR Laufzeit-Dateien - keine Build-/Test-/Dev-/CI-Artefakte.
# Aufruf:  scripts/make-ionos-bundle.sh [ZIELORDNER]
#          (Default-Ziel: ./dist-ionos)
# WICHTIG: Bundle erst aus main schneiden, NACHDEM die offenen PRs
#          (Trust-Strip-Icons + diese Deploy-Config) gemergt sind,
#          damit alle Aenderungen enthalten sind.
# ============================================================
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$SRC/dist-ionos}"

rm -rf "$OUT"
mkdir -p "$OUT"

rsync -a \
  --exclude '.git/' \
  --exclude '.github/' \
  --exclude '.claude/' \
  --exclude 'node_modules/' \
  --exclude 'tests/' \
  --exclude 'baseline/' \
  --exclude 'reports/' \
  --exclude 'scripts/' \
  --exclude 'schemas/' \
  --exclude 'apps-script/' \
  --exclude 'archive/' \
  --exclude 'dist-ionos/' \
  --exclude '_mock_*' \
  --exclude 'vercel.json' \
  --exclude 'package.json' \
  --exclude 'package-lock.json' \
  --exclude 'eslint.config.js' \
  --exclude 'playwright.config.js' \
  --exclude 'lighthouserc.json' \
  --exclude 'tsconfig.json' \
  --exclude '.gitignore' \
  --exclude '.prettier*' \
  --exclude 'README*' \
  "$SRC/" "$OUT/"

# Sicherstellen, dass die .htaccess im Bundle liegt (Webroot-Steuerung)
if [ ! -f "$OUT/.htaccess" ]; then
  echo "FEHLER: .htaccess fehlt im Bundle." >&2
  exit 1
fi

# ── Cache-Busting: Content-Hash an lokale JS/CSS-Referenzen anhaengen ────────
# Grund (2026-07-04): .htaccess cacht JS/CSS 1 Jahr (ExpiresByType ... "access
# plus 1 year"). Ohne versionierte URL fuehren wiederkehrende Besucher alte
# Dateien aus dem Browser-Cache aus - konkret fehlte hwMergeLeadPrefill im
# gecachten js/site.js, wodurch Rechner-Werte (Heizlast/Foerderung) nicht an den
# HubSpot-Lead durchgereicht wurden. Loesung: pro Asset ein Inhalts-Hash als
# ?v=<hash>. Geaenderte Datei -> neue URL -> Browser laedt frisch; unveraenderte
# Datei -> gleiche URL -> Cache bleibt gueltig (1-Jahr-Cache bleibt korrekt).
# Seit G3-N2 (25.07.2026) steht die Versionierung bereits IM REPO und wird vom
# CI-Gate "npm run verify:assets" erzwungen. Dieser Aufruf ist die Rueckversicherung
# fuer den Bundle-Weg und nutzt DASSELBE Skript - eine Implementierung, eine
# Wahrheit. Frueher lag die Logik nur hier; als die Deploys auf Einzeldatei-Upload
# umstellten, lief sie nicht mehr mit und die Versionierung verschwand still aus
# der Auslieferung (Umschalter-Defekt 25.07.). Genau das darf nicht wieder passieren.
"$SRC/scripts/version-assets.sh" "$OUT"

echo "============================================"
echo "IONOS-Bundle erstellt: $OUT"
echo "  Dateien gesamt : $(find "$OUT" -type f | wc -l | tr -d ' ')"
echo "  HTML-Seiten    : $(find "$OUT" -maxdepth 1 -name '*.html' | wc -l | tr -d ' ')"
echo "  Groesse        : $(du -sh "$OUT" | cut -f1)"
echo "  .htaccess      : vorhanden"
echo "============================================"
echo "Naechster Schritt: Inhalt von $OUT per SFTP in den Webroot (Vertrag 112773601) laden."
