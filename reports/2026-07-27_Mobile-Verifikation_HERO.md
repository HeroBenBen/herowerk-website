# Mobile-Verifikation, Befundbericht

Erzeugt von `scripts/verify-mobile.mjs` gegen `Arbeitsstand des Repos`.
Breiten 320 / 360 / 390 / 414 px, Modi dark und light, 10 Kernseiten, 80 Seitenlaeufe.

## Ergebnis je Punkt

| Punkt | Gegenstand | Geprueft | Befunde | Urteil |
|---|---|---|---|---|
| 1 | Anfragestrecke vollstaendig durchspielbar | 4 | 0 | PASS |
| 2 | Trefferflaechen mindestens 44 px | 80 | 0 | PASS |
| 3 | Kein waagerechter Bildlauf | 80 | 0 | PASS |
| 4 | Feste Kopfzeile verdeckt keinen Inhalt | 80 | 0 | PASS |
| 5 | Marken-Umschalter der Preiskarten bedienbar | 8 | 0 | PASS |
| 6 | Hintergrundvideo mit wirksamem Halteknopf | 8 | 0 | PASS |
| 7 | Einwilligungsdialog bedienbar und schliessbar | 0 | 0 | NICHT MASCHINELL PRUEFBAR, Sichtpruefung |
| 8 | Bewerbungsweg auf der Karriereseite | 8 | 0 | PASS |
| 9 | Eingabefelder mindestens 16 px | 80 | 0 | PASS |
| 10 | Ladekennzahlen als Stichprobe | 2 | 0 | PASS |

Keine Befunde.

## Was dieser Lauf NICHT abdeckt

- Punkt 7, Einwilligungsdialog: externer Anbieter, eigene Fokusfuehrung, in der Pruefumgebung nicht zuverlaessig geladen. Bleibt Sichtpruefung, vermerkt in `docs/compliance/bfsg-scope.md`.
- Punkt 10 misst Naeherungswerte im Labor, keine Feldmessung.
- Echte Geraete, echte Netze und echte Hilfsmittel ersetzt dieser Lauf nicht.
