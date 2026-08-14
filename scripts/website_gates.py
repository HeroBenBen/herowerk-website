#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dies ist die laufende Fassung der Website-Prüfung im Repo; die Vault-Fassung unter
HeroPlan/_tools/website_gates.py ist ausschließlich ihr Ursprung und wird nicht automatisch
synchronisiert.

Zwei harte Prüfungen:

1. Rechenlogik unserer Rechner bleibt aus ausgeliefertem HTML und JavaScript heraus.
2. Neue Seiten müssen sofort in den vier festen Testlisten stehen.

Aufruf:
  python3 scripts/website_gates.py --repo . --basis origin/main
  python3 scripts/website_gates.py --repo . --nur rechenlogik

Eine lokale Optik-Vorschau darf Beispielwerte nur über die sichtbare, begründete Markierung
"website-gate: rechenwerte-vorschau-naechster-block -- <Grund>" ausnehmen. Die Ausnahme gilt
ausschließlich für den unmittelbar folgenden, einer Variablen zugewiesenen Objektblock.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERBOTE_DATEI = ROOT / "scripts" / "rechenlogik_verbote.json"

STANDARD_VERBOTE = {
    "begriffe": [
        "jaz",
        "cop\\b",
        "koeffizient",
        "kennlinie",
        "heizlast_faktor",
        "marge",
        "aufschlag",
        "ek_preis",
        "einkaufspreis",
        "kalkulationsfaktor",
    ],
    "kommastellen_ab": 3,
    "ausnahmen": ["package-lock.json", "node_modules/", "tests/", "scripts/"],
}

TESTLISTEN = [
    "tests/a11y.spec.js",
    "tests/smoke.spec.js",
    "scripts/fidelity-pages.json",
    "lighthouserc.js",
    "lighthouserc.json",
    ".lighthouserc.js",
    ".lighthouserc.json",
]

SCRIPT_RE = re.compile(r"<script\b[^>]*>(.*?)</script>", re.DOTALL | re.IGNORECASE)
KOMMAZAHL_RE_VORLAGE = r"\b[A-Za-z_$][\w$]*\s*[:=]\s*-?\d+\.\d{{{n},}}\b"
MARKER_TEXT = "website-gate: rechenwerte-vorschau-naechster-block"
MARKER_RE = re.compile(
    rf"^\s*//\s*{re.escape(MARKER_TEXT)}\s+--\s+(\S.*)\s*$"
)
OBJEKT_START_RE = re.compile(
    r"^\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*\{"
)


def verbote_laden() -> dict:
    if VERBOTE_DATEI.exists():
        try:
            daten = json.loads(VERBOTE_DATEI.read_text(encoding="utf-8"))
            return {**STANDARD_VERBOTE, **daten}
        except Exception:
            pass
    return STANDARD_VERBOTE


def ausgeliefert(repo: Path, verbote: dict) -> list[Path]:
    dateien = []
    for muster in ("*.html", "*.js"):
        for datei in repo.rglob(muster):
            relativ = str(datei.relative_to(repo))
            if any(ausnahme in relativ for ausnahme in verbote["ausnahmen"]):
                continue
            dateien.append(datei)
    return sorted(dateien)


def objektblock_ende(zeilen: list[str], start: int) -> int | None:
    """Findet die schließende Klammer des markierten Objektblocks, ohne Strings mitzuzählen."""
    tiefe = 0
    geoeffnet = False
    in_blockkommentar = False
    in_string: str | None = None
    escaped = False

    for index in range(start, len(zeilen)):
        zeile = zeilen[index]
        position = 0
        while position < len(zeile):
            zeichen = zeile[position]
            folgezeichen = zeile[position + 1] if position + 1 < len(zeile) else ""

            if in_blockkommentar:
                if zeichen == "*" and folgezeichen == "/":
                    in_blockkommentar = False
                    position += 2
                    continue
                position += 1
                continue

            if in_string is not None:
                if escaped:
                    escaped = False
                elif zeichen == "\\":
                    escaped = True
                elif zeichen == in_string:
                    in_string = None
                position += 1
                continue

            if zeichen == "/" and folgezeichen == "/":
                break
            if zeichen == "/" and folgezeichen == "*":
                in_blockkommentar = True
                position += 2
                continue
            if zeichen in ("'", '"', "`"):
                in_string = zeichen
                position += 1
                continue
            if zeichen == "{":
                tiefe += 1
                geoeffnet = True
            elif zeichen == "}":
                tiefe -= 1
                if geoeffnet and tiefe == 0:
                    return index
            position += 1
    return None


def markierte_zeilen(
    zeilen: list[str], datei: str, start_zeile: int
) -> tuple[set[int], list[str]]:
    """Liefert lokale Zeilenindizes, die durch eine gültige sichtbare Markierung ausgenommen sind."""
    ausgenommen: set[int] = set()
    fehler: list[str] = []

    for index, zeile in enumerate(zeilen):
        if MARKER_TEXT not in zeile:
            continue
        echte_zeile = start_zeile + index
        if not MARKER_RE.fullmatch(zeile):
            fehler.append(
                f"{datei}:{echte_zeile} ungültige Vorschau-Markierung; erforderlich sind "
                f"'{MARKER_TEXT} -- <Begründung>'."
            )
            continue
        block_start = index + 1
        if block_start >= len(zeilen) or not OBJEKT_START_RE.match(zeilen[block_start]):
            fehler.append(
                f"{datei}:{echte_zeile} Vorschau-Markierung steht nicht unmittelbar vor "
                "einem zugewiesenen Objektblock."
            )
            continue
        block_ende = objektblock_ende(zeilen, block_start)
        if block_ende is None:
            fehler.append(
                f"{datei}:{echte_zeile} markierter Vorschau-Objektblock ist nicht geschlossen."
            )
            continue
        if any(nummer in ausgenommen for nummer in range(block_start, block_ende + 1)):
            fehler.append(f"{datei}:{echte_zeile} Vorschau-Markierungen überlappen sich.")
            continue
        ausgenommen.update(range(block_start, block_ende + 1))
    return ausgenommen, fehler


def code_zeilen(datei: Path, repo: Path) -> tuple[list[tuple[int, str]], list[str]]:
    """Nur Code mit echter Zeilennummer; bei HTML nur die Skriptblöcke."""
    try:
        text = datei.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return [], []
    relativ = str(datei.relative_to(repo))
    code: list[tuple[int, str]] = []
    fehler: list[str] = []
    bloecke = [(1, text)] if datei.suffix == ".js" else [
        (text.count("\n", 0, treffer.start(1)) + 1, treffer.group(1))
        for treffer in SCRIPT_RE.finditer(text)
    ]
    for start_zeile, block in bloecke:
        zeilen = block.splitlines()
        ausgenommen, block_fehler = markierte_zeilen(zeilen, relativ, start_zeile)
        fehler.extend(block_fehler)
        code.extend(
            (start_zeile + index, zeile)
            for index, zeile in enumerate(zeilen)
            if index not in ausgenommen
        )
    return code, fehler


def gate_rechenlogik(repo: Path) -> list[str]:
    verbote = verbote_laden()
    kommazahl = re.compile(KOMMAZAHL_RE_VORLAGE.format(n=verbote["kommastellen_ab"]))
    begriffe = [
        re.compile(rf"(?:^|[^\w]){begriff}\s*[:=]\s*-?\d", re.IGNORECASE)
        for begriff in verbote["begriffe"]
    ]
    befunde: list[str] = []
    for datei in ausgeliefert(repo, verbote):
        relativ = str(datei.relative_to(repo))
        zeilen, marker_fehler = code_zeilen(datei, repo)
        befunde.extend(marker_fehler)
        for nummer, zeile in zeilen:
            for begriff in begriffe:
                if begriff.search(zeile):
                    befunde.append(
                        f"{relativ}:{nummer} einem Rechen-Bezeichner wird im ausgelieferten "
                        f"Quelltext eine Zahl zugewiesen: {zeile.strip()[:90]}"
                    )
                    break
            else:
                if kommazahl.search(zeile):
                    befunde.append(
                        f"{relativ}:{nummer} Zuweisung einer Zahl mit mindestens "
                        f"{verbote['kommastellen_ab']} Nachkommastellen, das ist die Form eines "
                        f"Koeffizienten: {zeile.strip()[:90]}"
                    )
    return befunde


def neue_seiten(repo: Path, basis: str) -> set[str] | None:
    ergebnis = subprocess.run(
        ["git", "-C", str(repo), "diff", "--name-only", "--diff-filter=A", f"{basis}...HEAD"],
        capture_output=True,
        text=True,
    )
    if ergebnis.returncode != 0:
        return None
    return {
        Path(zeile).stem
        for zeile in ergebnis.stdout.split()
        if zeile.endswith(".html") and "/" not in zeile
    }


def gate_testlisten(repo: Path, basis: str | None = None) -> list[str]:
    seiten = sorted(datei.stem for datei in repo.glob("*.html"))
    if not seiten:
        return [f"{repo}: keine .html im Wurzelverzeichnis gefunden, ist das das Website-Repo?"]
    listen = {
        relativ: (repo / relativ).read_text(encoding="utf-8", errors="replace")
        for relativ in TESTLISTEN
        if (repo / relativ).exists()
    }
    if not listen:
        return [
            f"{repo}: keine der festen Testlisten gefunden ({', '.join(TESTLISTEN[:4])}). "
            "Ohne Listen kann die Prüfung nichts messen."
        ]

    neu = neue_seiten(repo, basis) if basis else None
    befunde: list[str] = []
    altbestand: list[str] = []
    for seite in seiten:
        fehlt = [
            relativ
            for relativ, inhalt in listen.items()
            if not re.search(rf"[\"'\/]{re.escape(seite)}(\.html)?[\"'\/]?", inhalt)
        ]
        if not fehlt:
            continue
        satz = (
            f"Seite '{seite}' fehlt in: {', '.join(fehlt)}. Sie wird dort nicht automatisch "
            "geprüft und sieht trotzdem grün aus. Bei content-fidelity zusätzlich eine neue "
            "Vergleichsgrundlage erzeugen, sonst wird die Prüfung rot."
        )
        if neu is None or seite in neu:
            befunde.append(satz)
        else:
            altbestand.append(seite)
    if altbestand:
        print(
            f"   (Altbestand, blockt nicht: {len(altbestand)} Seite(n) fehlen in mindestens "
            f"einer Liste: {', '.join(sorted(altbestand)[:8])}"
            f"{' ...' if len(altbestand) > 8 else ''})"
        )
    return befunde


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--nur", choices=["rechenlogik", "testlisten"], default=None)
    parser.add_argument(
        "--basis",
        default=None,
        help="Git-Vergleichsfassung, z. B. origin/main; dann blockieren nur neue Seiten.",
    )
    argumente = parser.parse_args()
    repo = Path(argumente.repo).expanduser().resolve()
    if not repo.exists():
        print(f"FEHLER: Repo nicht gefunden: {repo}", file=sys.stderr)
        return 2

    alle: list[str] = []
    gelaufen: list[str] = []
    if argumente.nur in (None, "rechenlogik"):
        befunde = gate_rechenlogik(repo)
        print(f"RECHENLOGIK im ausgelieferten Quelltext: {len(befunde)} Befund(e)")
        for befund in befunde:
            print(f"   ! {befund}")
        alle.extend(befunde)
        gelaufen.append("Rechenlogik")
    if argumente.nur in (None, "testlisten"):
        befunde = gate_testlisten(repo, argumente.basis)
        print(f"SEITEN OHNE EINTRAG IN DEN TESTLISTEN: {len(befunde)} Befund(e)")
        for befund in befunde:
            print(f"   ! {befund}")
        alle.extend(befunde)
        gelaufen.append("Testlisten")

    print()
    if alle:
        print(f">>> BEANSTANDET ({' und '.join(gelaufen)}). Erst grün, wenn die Punkte leer sind.")
        return 1
    print(
        f">>> SAUBER, geprüft wurde: {' und '.join(gelaufen)}."
        + ("" if argumente.nur is None else " Die andere Prüfung lief NICHT.")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
