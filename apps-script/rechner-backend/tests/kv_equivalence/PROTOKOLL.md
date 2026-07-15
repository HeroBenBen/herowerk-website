---
type: reference
tldr: "Aequivalenz-Beweis Lane B: kv_engine.gs (Port) liefert auf 776 Testvektoren exakt dieselben Zahlen wie das eingefrorene Orakel, Delta 0; Gate durch 5 Mutationstests als wirksam nachgewiesen."
datum: 2026-07-15
status: B5 FERTIG (Gate PASS)
---

# Äquivalenz-Protokoll (B4/B5) — kv_engine.gs gegen Orakel

## 1. SHA-Beweis (Gate 1)

Kanonische Extraktion (Briefing Abschnitt 1, einzige gültige Methode):
`s[s.rfind("<script>"):s.rfind("</script>")]` auf utf-8-Inhalt von
`04_Marketing_Vertrieb/Website/WP_Rechner_HeroWerk.html`.

| Prüfung | Wert |
|---|---|
| sha256 IST | `55344fe56a7043ffed5eec352eeeee0717d34ddebd34d57ecef0e7c88f61b9f3` |
| sha256 SOLL | `55344fe56a7043ffed5eec352eeeee0717d34ddebd34d57ecef0e7c88f61b9f3` |
| Ergebnis | **PASS** |
| Länge (Python, Codepoints) | 90.104 |
| Länge (Node, UTF-16-Einheiten) | 90.112 |

Die beiden Längen unterscheiden sich um 8, weil Python Codepoints zählt und
JavaScript UTF-16-Einheiten (Zeichen ausserhalb der BMP zählen doppelt). Der
Byte-Inhalt und damit der SHA ist identisch. Das SHA-Gate läuft bei JEDEM
Testlauf mit (`oracle_runner.js::extractScript`) und bricht bei Mismatch ab.

Das Orakel wurde NICHT verändert. Es wird zur Laufzeit read-only gelesen.

## 2. Aufbau des Beweises (B4)

| Seite | Vorgehen |
|---|---|
| Orakel | Der unveränderte Script-Block läuft in Node (`vm`) auf einem DOM-Stub. `calculate()` und `updateFoerderung()` schreiben in die Stub-Elemente. Aus jeder Ausgabefläche werden ALLE Zahlen in Anzeige-Reihenfolge geerntet. |
| Port | `kvCalculate()` liefert Zahlen, `view_adapter.js` rendert die Anzeige-Texte, daraus werden die Zahlen mit DERSELBEN Funktion geerntet. |
| Vergleich | Zahl für Zahl, Reihenfolge inklusive. Delta muss exakt 0 sein. |

Der DOM-Stub parst die Startwerte der Regler aus dem Orakel-HTML selbst
(`dom_stub.js::parseControls`), statt sie abzutippen. Damit können Defaults nicht
auseinanderlaufen.

**Warum die Wizard-Schicht nicht stört:** Der Runner setzt
`window.location.search = "?modus=berater"`. Dann bricht `init()` (Orakel Z.719)
sofort ab und die gesamte Wizard-UI bleibt inaktiv. `calculate()`, `getFoerder()`
und `updateFoerderung()` lesen ausschliesslich die Basis-Controls und sind davon
unberührt. Der Rechenkern wird also vollständig, die UI-Schicht gar nicht getestet.

**Schärfster Teil:** Die Serien von Chart 2 (`cBreak`) sind im Orakel UNGERUNDET
(Orakel Z.469 bis 479). Dort wird auf volle Float-Gleichheit verglichen, nicht auf
gerundete Anzeigewerte. Eine Abweichung im letzten Bit fiele auf.

### Verglichene Ausgabeflächen

`foerderBox` (10 Felder als Strings) · `pathSummary` · `kpiGrid` (Zahlen + Labels) ·
`dreiWegeBox` (+ display) · `cashflowBox` (+ display) · `co2Box` · `sensiBox` ·
`immoBox` (+ display) · `detTbl` (alle Zeilen) · `assBox` ·
Chart-Serien: `vermoegen`, `nullLinie`, `labels`, `cBreak` (alle Serien inkl.
Splice-Reihenfolge), `heizFossil`, `heizWp`, `heizDiff`.

## 3. Testvektoren (B5)

**Gesamt: 776.** Jede diskrete Achse einzeln vollständig durchpermutiert,
plus Kreuzprodukte der Achsen, die sich im Orakel gegenseitig bedingen,
plus 200 Zufallskombinationen mit festem Seed 42 (`mulberry32`, eigener
deterministischer Generator im Testskript, NICHT `Math.random`).

| Gruppe | Vektoren | Inhalt |
|---|---|---|
| `default` | 1 | Orakel-HTML-Startwerte |
| `achse:*` | 121 | jede Achse einzeln, vollständiger Wertebereich |
| `foerder:*` | 384 | Vollkreuz Periode(6) × EU(2) × Klima(2) × Alt20(2) × Kind(2) × Einkommen(4) |
| `togg:*` | 16 | neuFossil × vglBrennstoff × bio × finanz |
| `togg2:*` | 16 | dynTarif × immo × proKlima × heizart |
| `proklima:*` | 24 | Periode(6) × invWP(4), 60-Prozent-Deckel und 1.500-Kappung |
| `einheit:*` | 5 | kWh / m³ / Liter (Client-Umrechnung ×10) |
| `modus:*` | 2 | kunde / berater (reines Echo) |
| `kante:*` | 7 | Break-even sofort/nie, Mehrinvest ≤ 0, Quote gekappt, kredLZ > laufzeit, Strompreis sinkend |
| `rand#*` | 200 | Zufallskombination über ALLE Achsen, Seed 42 |

### Achsen einzeln (vollständig durchpermutiert)

| Achse | Werte | Achse | Werte |
|---|---|---|---|
| fHalbjahr | 6 (alle Reform-Perioden) | fEinkSlider | 12 (Staffelgrenzen 30k/40k/50k exakt + ±1) |
| eta | 8 (alle Kesselklassen-Defaults 70/80/85/86/90/93 + Reglerenden 65/98) | laufzeit | 5 |
| fKlima / fAlt20 / fEU / fKind / fGrund | je 2 | bedarf | 4 |
| proklimaTog / finanzTog / neuFossilTog | je 2 | invWP | 5 (inkl. Bemessungsgrenze 28.000) |
| bioTog / dynTarifTog / immoTog | je 2 | jaz | 3 |
| vglBrennstoff / heizart | je 2 | kredLZ / kredZins | 3 / 4 |
| bioAufpreis / gasStg / oelStg / stromEntw / co2Pfad | je 3 | gasInvest / oelInvest | je 3 |
| gaspreis / oelpreis / strompreis / co2preis | je 3 | dynAnteil / dynSpread | je 3 |
| hausW / immoP | je 3 | | |

## 4. Ergebnis

```
== SHA-GATE ==
sha256 IST:  55344fe56a7043ffed5eec352eeeee0717d34ddebd34d57ecef0e7c88f61b9f3
sha256 SOLL: 55344fe56a7043ffed5eec352eeeee0717d34ddebd34d57ecef0e7c88f61b9f3
Ergebnis: PASS

== VEKTOREN ==
Gesamt: 776

== ERGEBNIS ==
Delta EXAKT 0: 776 / 776
Abweichend:    0

GATE: PASS. Port ist orakel-aequivalent auf jeder ausgegebenen Zahl.
```

Reproduktion: `node apps-script/rechner-backend/tests/kv_equivalence/run_equivalence.js`

## 5. Wirksamkeits-Nachweis des Gates (Mutationstest)

Ein grünes Gate beweist nichts, solange nicht gezeigt ist, dass es rot werden
KANN. Darum wurde der Port fünfmal gezielt verfälscht und der Lauf wiederholt
(je 60 Vektoren). Jede Verfälschung wurde gefangen, danach wurde der Port
wiederhergestellt.

| Mutation im Port | Ergebnis (Delta 0 von 60) | Gefangen |
|---|---|---|
| `wartungWp: 350 → 351` | 0 / 60 | ja |
| `co2f.gas: 0.182 → 0.1821` | 0 / 60 | ja |
| `grundPctEu: 30 → 31` | 0 / 60 | ja |
| `proKlimaMax: 1500 → 1400` | 59 / 60 | ja (nur proKlima-Vektoren betroffen) |
| `klima h2-2026: 16 → 15` | 5 / 60 | ja |
| Kontrolllauf nach Wiederherstellung | 60 / 60 | — |

sha256 kv_engine.gs nach Wiederherstellung:
`671c84ae9814866bd226f978e94f1e02190485a0c12ec46678ccdae5670071e9`

## 6. Im Port gefixte Abweichungen

**Keine.** Der Port war bei der ersten Ausführung auf allen 776 Vektoren
rechnerisch deckungsgleich. Die zwei Rot-Läufe der ersten Runde lagen
ausschliesslich in der TEST-Seite (`view_adapter.js` / `dom_stub.js`), nicht im
Rechenkern. Sie sind hier vollständig aufgeführt, damit nichts unter den Tisch
fällt:

| # | Befund | Ursache | Fix (Test-Seite) |
|---|---|---|---|
| 1 | `detTbl`: Orakel liefert `202612`, Port `2026` und `12` | `stripTags` löschte Tags ersatzlos, dadurch klebten benachbarte Tabellenzellen zusammen (`<td>2026</td><td>12,0` → `202612,0`) und erzeugten Phantom-Zahlen | Tags werden durch ein Leerzeichen ersetzt (`dom_stub.js`) |
| 2 | `co2Box`: Port hatte 2 Zahlen zu viel (350, 100) | Adapter zog die Strommix-Zahlen in die CO₂-Box; im Orakel stehen sie in der Annahmen-Box | Adapter korrigiert |
| 3 | `cashflowBox[6]`: Orakel `-36`, Port `36` | Das Orakel setzt bei negativem Monatsvorteil ein `−` (U+2212) vor die Zahl (Z.554/567); der Adapter gab immer den Absolutbetrag aus | Adapter spiegelt das Vorzeichen-Präfix |
| 4 | `cashflowBox`: Orakel 17 Zahlen, Port 16 | Sub-Text „ab dem 1. Monat" (nur bei dCf ≥ 0) trägt eine `1`, im Adapter fehlte er | Adapter ergänzt, konditional |
| 5 | `immoBox`: Orakel 11 Zahlen, Port 10 | Einleitungssatz enthält „ImmoScout24" → die `24` zählt als Zahl mit | Adapter ergänzt |

Diese fünf Befunde sind gleichzeitig die Präzisions-Vorgabe für den Thin-Client
in B7: `view_adapter.js` ist die verbindliche Render-Vorlage.

## 7. Bekannte Grenzen (ehrlich benannt)

1. **Die Alt-Periode (`fHalbjahr=alt`) ist NICHT äquivalenz-geprüft.** Das Orakel
   kennt sie nicht, es gibt also kein Vergleichsobjekt. Ihre Werte stammen aus
   Kanon Abschnitt 2. Sie braucht eine eigene fachliche Abnahme, bevor die
   Perioden-Automatik scharf geschaltet wird. → BLOCKED-1 in `LANE-B.md`.
2. **Geprüft wird der Rechenkern, nicht die UI.** Wizard-Schicht, Chart-Optik,
   Tooltips und Tracking sind nicht Gegenstand dieses Gates (Schritt B7).
3. **Der Vergleich läuft über die Anzeige-Zahlen.** Wo das Orakel selbst rundet,
   wird auch gerundet verglichen. Ausnahme und Härtefall: die ungerundeten
   Chart-2-Serien (siehe Abschnitt 2), die auf voller Float-Genauigkeit prüfen.
4. **`fEffizienz`** (R290-Bonus, nur Alt-Periode) hat keine Orakel-Entsprechung
   und ist in allen Reform-Perioden wirkungslos (`effizienzPct: 0`).
