#!/usr/bin/env bash
# ============================================================
# Erzeugt das statische IONOS-Upload-Bundle (SFTP) aus dem Repo-Root.
# Enthaelt NUR Laufzeit-Dateien - keine Build-/Test-/Dev-/CI-Artefakte.
# Aufruf:  scripts/make-ionos-bundle.sh [ZIELORDNER]
#          (Default-Ziel: ./dist-ionos)
# WICHTIG: Jeder Upload, auch ein Einzeldatei-Upload, wird aus einem frisch
#          gebauten Bündel gezogen und nimmt version.json mit. Sonst lügt der
#          Versionsstempel.
# ============================================================
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$SRC/dist-ionos}"

rm -rf "$OUT"
mkdir -p "$OUT"

# Warum 2026-07-30: docs/ enthält interne Beraterseiten und darf nicht in den Webroot.
# Warum 2026-07-30: lokale Prüfläufe erzeugen HTML-Berichte, die kein Website-Inhalt sind.
# Warum 2026-08-01: .git ist in einem Worktree eine Datei und darf nicht ins Bündel.
# Warum 2026-08-01: .gitleaks.toml ist interne Secret-Scan-Konfiguration, keine Laufzeit-Datei.
# Warum 2026-08-01: .vercelignore steuert Vercel und gehört nicht in den IONOS-Webroot.
rsync -a \
  --exclude '.git/' \
  --exclude '.git' \
  --exclude '.gitleaks.toml' \
  --exclude '.vercelignore' \
  --exclude '.github/' \
  --exclude '.claude/' \
  --exclude 'node_modules/' \
  --exclude 'tests/' \
  --exclude 'baseline/' \
  --exclude 'docs/' \
  --exclude 'reports/' \
  --exclude 'test-results/' \
  --exclude 'playwright-report/' \
  --exclude 'scripts/' \
  --exclude 'schemas/' \
  --exclude 'apps-script/' \
  --exclude 'archive/' \
  --exclude 'dist-ionos/' \
  --exclude 'rechner-runtime/' \
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

# Nur .htaccess und .well-known sind in der obersten Bündel-Ebene erlaubt.
FREMDE_PUNKTDATEIEN=()
for PUNKTDATEI in "$OUT"/.[!.]* "$OUT"/..?*; do
  if [ ! -e "$PUNKTDATEI" ] && [ ! -L "$PUNKTDATEI" ]; then
    continue
  fi
  PUNKTNAME="${PUNKTDATEI##*/}"
  case "$PUNKTNAME" in
    .htaccess | .well-known) ;;
    *) FREMDE_PUNKTDATEIEN+=("$PUNKTNAME") ;;
  esac
done
if [ "${#FREMDE_PUNKTDATEIEN[@]}" -gt 0 ]; then
  echo "FEHLER: Fremde Punktdateien oder Punktverzeichnisse in der obersten Bündel-Ebene: ${FREMDE_PUNKTDATEIEN[*]}" >&2
  echo "Ausweg: Gehört der Name in den Webroot, ergänze ihn in der Freiliste. Andernfalls ergänze ihn als --exclude im rsync-Aufruf. Nicht nachträglich aus dem fertigen Bündel löschen." >&2
  exit 1
fi
echo "Punktdatei-Wächter: oberste Ebene $OUT geprüft, nur .htaccess und .well-known erlaubt, keine fremden Treffer."

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
"$SRC/scripts/stamp-version.sh" "$OUT"

echo "============================================"
echo "IONOS-Bundle erstellt: $OUT"
echo "  Dateien gesamt : $(find "$OUT" -type f | wc -l | tr -d ' ')"
echo "  HTML-Seiten    : $(find "$OUT" -type f -name '*.html' | wc -l | tr -d ' ')"
echo "  Gestempelter Commit : $(git -C "$SRC" rev-parse --short=10 HEAD)"
echo "  Groesse        : $(du -sh "$OUT" | cut -f1)"
echo "  .htaccess      : vorhanden"
echo "============================================"
echo "Naechster Schritt: Inhalt von $OUT per SFTP in den Webroot (Vertrag 112773601) laden."
