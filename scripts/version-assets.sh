#!/usr/bin/env bash
# ============================================================
# Cache-Busting: haengt an JEDE lokale CSS-/JS-Referenz in den HTML-Seiten
# einen Inhalts-Fingerabdruck (?v=<sha256-10>) an und haelt ihn aktuell.
#
# WARUM (G3-N2, 25.07.2026):
#   .htaccess liefert CSS/JS mit "access plus 1 year" aus. Ohne versionierte URL
#   fuehren wiederkehrende Besucher monatelang alte Dateien aus dem Browser-Cache
#   aus. Das ist zweimal real passiert:
#     04.07.2026 - gecachtes js/site.js ohne hwMergeLeadPrefill -> Rechnerwerte
#                  kamen nicht am HubSpot-Lead an (Lead-Datenverlust).
#     25.07.2026 - neues js/theme.js mit Mond-/Sonnen-Icon traf alte tokens.css
#                  ohne inline-flex/gap -> Icon klebte am Text im Umschalter.
#   Die Logik lag bis dahin NUR in make-ionos-bundle.sh. Seit die Deploys als
#   Einzeldatei-Upload aus dem Repo laufen (G3/G3-N), lief dieses Skript nicht
#   mehr mit und die Versionierung verschwand still aus der Auslieferung.
#   Deshalb: die Version steht jetzt IM REPO, nicht in einem optionalen
#   Verpackungsschritt. Was im Repo steht, ist das, was hochgeladen wird -
#   und genau das prueft der Byte-Abgleich nach jedem Upload.
#
# Aufruf:
#   scripts/version-assets.sh              # patcht das Repo in-place
#   scripts/version-assets.sh --check      # patcht nichts, Exit 1 bei Abweichung
#   scripts/version-assets.sh [ZIELORDNER] # patcht einen anderen Baum (Bundle)
#
# Idempotent: gleicher Dateiinhalt -> gleicher Hash -> keine Aenderung.
# Nur LOKALE Referenzen; Fremd-URLs (consentmanager-CDN) bleiben unberuehrt.
# ============================================================
set -euo pipefail

MODE="patch"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for arg in "$@"; do
  case "$arg" in
    --check) MODE="check" ;;
    *) ROOT="$(cd "$arg" && pwd)" ;;
  esac
done

# Assets, die tatsaechlich ausgeliefert werden. Build-/Test-/Konfig-Bereiche
# sind ausgeschlossen: sie werden von keiner HTML-Seite referenziert.
# bash 3.2 auf macOS kennt kein mapfile - deshalb klassisch einlesen.
ASSETS=()
while IFS= read -r line; do
  ASSETS+=("$line")
done < <(
  cd "$ROOT" && find . \( -name '*.js' -o -name '*.css' \) \
    -not -path './.git/*' \
    -not -path './node_modules/*' \
    -not -path './scripts/*' \
    -not -path './tests/*' \
    -not -path './apps-script/*' \
    -not -path './archive/*' \
    -not -path './dist-ionos/*' \
    -not -path './reports/*' \
    -not -name 'eslint.config.js' \
    -not -name 'playwright.config.js' \
    -print | sed 's|^\./||' | sort
)

PAGES=()
while IFS= read -r line; do
  PAGES+=("$line")
done < <(
  cd "$ROOT" && find . -name '*.html' \
    -not -path './.git/*' \
    -not -path './node_modules/*' \
    -not -path './archive/*' \
    -not -path './dist-ionos/*' \
    -print | sed 's|^\./||' | sort
)

if [ "${#ASSETS[@]}" -eq 0 ] || [ "${#PAGES[@]}" -eq 0 ]; then
  echo "FEHLER: keine Assets oder keine HTML-Seiten unter $ROOT gefunden." >&2
  exit 1
fi

changed_files=0
patched_refs=0

for rel in "${ASSETS[@]}"; do
  hash="$(shasum -a 256 "$ROOT/$rel" | cut -c1-10)"
  for page in "${PAGES[@]}"; do
    out="$(
      REL="$rel" HASH="$hash" MODE="$MODE" perl -0777 -e '
        my $rel  = $ENV{REL};
        my $hash = $ENV{HASH};
        my $file = $ARGV[0];
        open(my $fh, "<:raw", $file) or die "read $file: $!";
        my $src = do { local $/; <$fh> };
        close $fh;
        my $dst = $src;
        # Quote + optionaler Pfad-Praefix + exakter Asset-Pfad + optionale Alt-Version.
        # Der Praefix laesst nur ./ ../ / zu, damit Fremd-URLs nicht matchen.
        my $n = ($dst =~ s{(["\x27])((?:\.\./|\./|/)*)\Q$rel\E(?:\?v=[0-9a-f]+)?\1}
                          {$1$2$rel?v=$hash$1}g);
        exit 0 if $dst eq $src;
        if ($ENV{MODE} ne "check") {
          open(my $wh, ">:raw", $file) or die "write $file: $!";
          print $wh $dst;
          close $wh;
        }
        print "$n\n";
      ' "$ROOT/$page"
    )"
    if [ -n "$out" ]; then
      changed_files=$((changed_files + 1))
      patched_refs=$((patched_refs + out))
      if [ "$MODE" = "check" ]; then
        echo "  VERALTET: $page -> $rel (Soll ?v=$hash)"
      fi
    fi
  done
done

if [ "$MODE" = "check" ]; then
  if [ "$patched_refs" -gt 0 ]; then
    echo "" >&2
    echo "FEHLER: $patched_refs Asset-Referenz(en) ohne oder mit veralteter Version." >&2
    echo "Behebung: scripts/version-assets.sh ausfuehren und das Ergebnis committen." >&2
    exit 1
  fi
  echo "Asset-Versionierung aktuell: ${#ASSETS[@]} Assets, ${#PAGES[@]} Seiten, 0 Abweichungen."
  exit 0
fi

echo "Asset-Versionierung: ${#ASSETS[@]} Assets, ${#PAGES[@]} Seiten,"
echo "  $patched_refs Referenz(en) in $changed_files Seiten-Treffern aktualisiert."

# Notbremse: keine unversionierte lokale Referenz darf uebrig bleiben.
rest=0
for rel in "${ASSETS[@]}"; do
  hits="$(cd "$ROOT" && grep -rlE "[\"'](\.\./|\./|/)*${rel//./\\.}[\"']" --include='*.html' . 2>/dev/null | grep -v '^./archive/' || true)"
  if [ -n "$hits" ]; then
    echo "FEHLER: unversionierte Referenz auf $rel in:" >&2
    echo "$hits" >&2
    rest=1
  fi
done
[ "$rest" -eq 0 ] || exit 1
echo "  Notbremse: 0 unversionierte lokale Referenzen."
