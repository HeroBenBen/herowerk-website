#!/usr/bin/env bash
# ============================================================
# Stempelt das IONOS-Bündel mit dem Website-Code-Stand.
#
# Semantik:
#   version.json nennt den Commit des letzten Uploads.
#   Jede Seite nennt den Commit ihres eigenen Schnitts.
#   Bei Voll-Uploads sind beide identisch.
#   Jeder Upload, auch ein Einzeldatei-Upload, wird aus einem frisch gebauten
#   Bündel gezogen und nimmt version.json mit, sonst lügt der Stempel.
#
# Aufruf:
#   scripts/stamp-version.sh ZIELORDNER
#   scripts/stamp-version.sh --check ZIELORDNER
#   scripts/stamp-version.sh --selbsttest
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  echo "Aufruf: scripts/stamp-version.sh [--check ZIELORDNER|--selbsttest|ZIELORDNER]" >&2
  exit 2
}

json_escape() {
  printf '%s' "$1" | perl -pe 's/\\/\\\\/g; s/"/\\"/g; s/\n/\\n/g'
}

json_value() {
  key="$1"
  file="$2"
  KEY="$key" perl -0ne '
    my $key = $ENV{KEY};
    if (/"\Q$key\E"\s*:\s*"((?:\\.|[^"])*)"/) {
      my $v = $1;
      $v =~ s/\\"/"/g;
      $v =~ s/\\\\/\\/g;
      print $v;
      exit 0;
    }
    if (/"\Q$key\E"\s*:\s*([0-9]+)/) {
      print $1;
      exit 0;
    }
    exit 1;
  ' "$file"
}

require_clean_worktree() {
  status="$(git -C "$REPO_ROOT" status --porcelain)"
  if [ -n "$status" ]; then
    echo "FEHLER: Arbeitsbaum ist nicht sauber. Kein Stempel für einen schmutzigen Stand." >&2
    echo "$status" >&2
    exit 1
  fi
}

load_repo_version() {
  COMMIT_KURZ="$(git -C "$REPO_ROOT" rev-parse --short=10 HEAD)"
  COMMIT_VOLL="$(git -C "$REPO_ROOT" rev-parse HEAD)"
  BRANCH="$(git -C "$REPO_ROOT" branch --show-current || true)"
  if [ -z "$BRANCH" ]; then
    BRANCH="${GITHUB_HEAD_REF:-detached}"
  fi
  GEBAUT_AM_RAW="$(date '+%Y-%m-%dT%H:%M:%S%z')"
  GEBAUT_AM="${GEBAUT_AM_RAW%??}:${GEBAUT_AM_RAW#${GEBAUT_AM_RAW%??}}"

  if [ -z "$COMMIT_KURZ" ] || [ -z "$COMMIT_VOLL" ] || [ -z "$BRANCH" ] || [ -z "$GEBAUT_AM" ]; then
    echo "FEHLER: Versionsfeld ist leer. Stempel abgebrochen." >&2
    exit 1
  fi
}

read_html_files() {
  target="$1"
  HTML_FILES=()
  while IFS= read -r line; do
    HTML_FILES+=("$line")
  done < <(find "$target" -type f -name '*.html' | sort)

  if [ "${#HTML_FILES[@]}" -eq 0 ]; then
    echo "FEHLER: keine HTML-Seiten in $target gefunden." >&2
    exit 1
  fi
}

write_version_json() {
  target="$1"
  seiten="$2"
  commit_kurz_json="$(json_escape "$COMMIT_KURZ")"
  commit_voll_json="$(json_escape "$COMMIT_VOLL")"
  branch_json="$(json_escape "$BRANCH")"
  gebaut_am_json="$(json_escape "$GEBAUT_AM")"

  cat > "$target/version.json" <<JSON
{
  "commit": "$commit_kurz_json",
  "commit_voll": "$commit_voll_json",
  "branch": "$branch_json",
  "gebaut_am": "$gebaut_am_json",
  "seiten": $seiten
}
JSON
}

stamp_target_without_clean_check() {
  target="$1"
  if [ ! -d "$target" ]; then
    echo "FEHLER: Zielordner fehlt: $target" >&2
    exit 1
  fi

  load_repo_version
  read_html_files "$target"

  missing_head=0
  for file in "${HTML_FILES[@]}"; do
    if ! grep -qi '</head>' "$file"; then
      echo "FEHLER: </head> fehlt in $file" >&2
      missing_head=1
    fi
  done
  [ "$missing_head" -eq 0 ] || exit 1

  content="$COMMIT_KURZ $GEBAUT_AM"
  for file in "${HTML_FILES[@]}"; do
    CONTENT="$content" perl -0pi -e '
      my $stamp = q{<meta name="herowerk-stand" content="} . $ENV{CONTENT} . q{">};
      s{[ \t]*<meta\s+name="herowerk-stand"\s+content="[^"]*"\s*>\s*\n?}{}g;
      s{</head>}{  $stamp\n</head>}i;
    ' "$file"
  done

  write_version_json "$target" "${#HTML_FILES[@]}"
  echo "Versionsstempel geschrieben: $COMMIT_KURZ, ${#HTML_FILES[@]} HTML-Seiten."
}

stamp_target() {
  require_clean_worktree
  stamp_target_without_clean_check "$1"
}

check_repo_has_no_html_stamp() {
  target="$1"
  target_abs="$(cd "$target" && pwd)"
  found=0

  while IFS= read -r rel; do
    file="$REPO_ROOT/${rel#./}"
    case "$file" in
      "$target_abs"|"$target_abs"/*) continue ;;
    esac
    if grep -q '<meta name="herowerk-stand"' "$file"; then
      echo "FEHLER: Repo-HTML trägt Stempel: $rel" >&2
      found=1
    fi
  done < <(
    cd "$REPO_ROOT" && find . \
      \( -path './dist-ionos' \
      -o -path './node_modules' \
      -o -path './test-results' \
      -o -path './playwright-report' \
      -o -path './.git' \
      -o -path './archive' \) -prune \
      -o -type f -name '*.html' -print | sort
  )

  [ "$found" -eq 0 ] || exit 1
}

check_target() {
  target="$1"
  if [ ! -d "$target" ]; then
    echo "FEHLER: Zielordner fehlt: $target" >&2
    exit 1
  fi

  version_file="$target/version.json"
  if [ ! -f "$version_file" ]; then
    echo "FEHLER: version.json fehlt in $target" >&2
    exit 1
  fi

  expected_keys="$(printf 'commit\ncommit_voll\nbranch\ngebaut_am\nseiten')"
  actual_keys="$(perl -0ne 'my @keys = /"([^"]+)"\s*:/g; print join("\n", @keys)' "$version_file")"
  if [ "$actual_keys" != "$expected_keys" ]; then
    echo "FEHLER: version.json enthält nicht exakt die fünf erlaubten Felder." >&2
    echo "$actual_keys" >&2
    exit 1
  fi

  load_repo_version
  version_commit="$(json_value commit "$version_file")"
  version_commit_voll="$(json_value commit_voll "$version_file")"
  version_seiten="$(json_value seiten "$version_file")"

  if [ "$version_commit" != "$COMMIT_KURZ" ]; then
    echo "FEHLER: version.json commit $version_commit passt nicht zu HEAD $COMMIT_KURZ." >&2
    exit 1
  fi
  if [ "$version_commit_voll" != "$COMMIT_VOLL" ]; then
    echo "FEHLER: version.json commit_voll passt nicht zu HEAD." >&2
    exit 1
  fi

  read_html_files "$target"
  if [ "$version_seiten" != "${#HTML_FILES[@]}" ]; then
    echo "FEHLER: version.json seiten=$version_seiten, gefunden=${#HTML_FILES[@]}." >&2
    exit 1
  fi

  failed=0
  for file in "${HTML_FILES[@]}"; do
    count="$(perl -0ne 'my $n = () = /<meta name="herowerk-stand"/g; print $n' "$file")"
    if [ "$count" != "1" ]; then
      echo "FEHLER: $file trägt $count Versionsstempel, erwartet 1." >&2
      failed=1
      continue
    fi
    if ! grep -qF "<meta name=\"herowerk-stand\" content=\"$version_commit " "$file"; then
      echo "FEHLER: $file trägt nicht den Commit aus version.json." >&2
      failed=1
    fi
  done
  [ "$failed" -eq 0 ] || exit 1

  check_repo_has_no_html_stamp "$target"
  echo "Versionsprüfung grün: $version_commit, ${#HTML_FILES[@]} HTML-Seiten."
}

run_check_subprocess() {
  "$SCRIPT_DIR/stamp-version.sh" --check "$1"
}

selftest() {
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  mkdir -p "$tmp/unterordner"
  printf '<!doctype html><html><head><title>Eins</title></head><body></body></html>\n' > "$tmp/eins.html"
  printf '<!doctype html><html><head><title>Zwei</title></head><body></body></html>\n' > "$tmp/unterordner/zwei.html"

  stamp_target_without_clean_check "$tmp" >/dev/null
  check_target "$tmp" >/dev/null

  perl -0pi -e 's{[ \t]*<meta name="herowerk-stand" content="[^"]*">\s*\n?}{}' "$tmp/eins.html"
  if run_check_subprocess "$tmp" > "$tmp/fehler.log" 2>&1; then
    echo "FEHLER: Selbsttest blieb grün, obwohl ein Stempel entfernt wurde." >&2
    exit 1
  fi

  echo "Selbsttest grün: gestempelte Attrappe wurde erkannt."
  echo "Selbsttest grün: manipulierte Attrappe wurde korrekt rot."
  sed -n '1,6p' "$tmp/fehler.log"
}

if [ "$#" -eq 1 ] && [ "$1" = "--selbsttest" ]; then
  selftest
  exit 0
fi

if [ "$#" -eq 2 ] && [ "$1" = "--check" ]; then
  check_target "$2"
  exit 0
fi

if [ "$#" -eq 1 ]; then
  stamp_target "$1"
  exit 0
fi

usage
