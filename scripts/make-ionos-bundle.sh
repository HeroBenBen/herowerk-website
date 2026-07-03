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
echo "Cache-Busting: versioniere lokale JS/CSS-Referenzen (Content-Hash)..."
asset_count=0
while IFS= read -r -d '' asset; do
  rel="${asset#"$OUT"/}"
  hash="$(shasum -a 256 "$asset" | cut -c1-10)"
  while IFS= read -r -d '' html; do
    PR="$rel" PH="$hash" perl -0pi -e 'my $r=$ENV{PR}; my $q=quotemeta($r); my $h=$ENV{PH}; s{(["\x27])((?:\.\./|/)*)$q\1}{$1$2$r?v=$h$1}g;' "$html"
  done < <(find "$OUT" -name '*.html' -print0)
  asset_count=$((asset_count + 1))
done < <(find "$OUT" \( -name '*.js' -o -name '*.css' \) -print0)
busted="$(grep -rlF '?v=' "$OUT" --include='*.html' | wc -l | tr -d ' ')"
echo "  versionierte Assets: $asset_count | HTML-Seiten mit Cache-Bust: $busted"
# Fail-safe: js/site.js MUSS versioniert sein (Kern des Rechner-Handoff-Fixes).
if grep -rEl 'src="[^"?]*js/site\.js"' "$OUT" --include='*.html' >/dev/null 2>&1; then
  echo "FEHLER: unversionierte js/site.js-Referenz im Bundle gefunden." >&2
  exit 1
fi

echo "============================================"
echo "IONOS-Bundle erstellt: $OUT"
echo "  Dateien gesamt : $(find "$OUT" -type f | wc -l | tr -d ' ')"
echo "  HTML-Seiten    : $(find "$OUT" -maxdepth 1 -name '*.html' | wc -l | tr -d ' ')"
echo "  Groesse        : $(du -sh "$OUT" | cut -f1)"
echo "  .htaccess      : vorhanden"
echo "============================================"
echo "Naechster Schritt: Inhalt von $OUT per SFTP in den Webroot (Vertrag 112773601) laden."
