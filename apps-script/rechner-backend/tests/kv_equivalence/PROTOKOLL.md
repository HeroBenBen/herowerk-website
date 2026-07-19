---
type: reference
tldr: "Aequivalenz-Beweis Lane B: kv_engine.gs (Port) liefert auf 858 Testvektoren dieselben Zahlen wie das eingefrorene Orakel, Delta 0, auf 11 Anzeigeflaechen plus allen Chart-Serien; dazu Perioden-Gate (18 Stichtage) und Live-Foerderbox-Gate (12 Faelle). Bewusst nicht verglichene Flaechen sind in Abschnitt 7 einzeln benannt."
datum: 2026-07-15
status: B5 FERTIG (Gate PASS); Stand nach Fix-Lauf LANE-B2 (Abnahme-Befunde B-1/B-2/B-4, M9-Marge)
---

# Äquivalenz-Protokoll (B4/B5) — kv_engine.gs gegen Orakel

> **Was die Suite deckt (Kurzfassung, verbindlich):** Sie beweist, dass der Port
> auf 858 Vektoren dieselben Zahlen liefert wie das Orakel, und zwar auf den 11
> Anzeigeflächen von `calculate()` + `updateFoerderung()` im Berater-Modus plus
> allen Chart-Serien. Sie beweist NICHT, dass jede Zahl des Orakels verglichen
> wird: vier Flächen sind ausgenommen und in Abschnitt 7 einzeln mit Begründung
> benannt. Dazu kommen zwei eigenständige Gates ohne Orakel-Bezug: die
> Perioden-Automatik (Abschnitt 8) und die Live-Förderbox (Abschnitt 9).
>
> Ein Lauf, drei Gates: `node run_equivalence.js`.

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

### Verglichene Ausgabeflächen (11): die Zusage des Gates

`foerderBox` (10 Felder als Strings) · `foerderTreppe` (Quote je Reform-Periode) ·
`pathSummary` · `kpiGrid` (Zahlen + Labels) · `dreiWegeBox` (+ display) ·
`cashflowBox` (+ display) · `co2Box` · `sensiBox` · `immoBox` (+ display) ·
`detTbl` (alle Zeilen) · `assBox`.

Dazu alle Chart-Serien: `vermoegen`, `nullLinie`, `labels`, `cBreak` (alle Serien
inkl. Splice-Reihenfolge), `heizFossil`, `heizWp`, `heizDiff`.

Was hier NICHT steht, ist auch nicht verglichen. Die vier Lücken stehen in
Abschnitt 7. (Frühere Fassungen dieses Protokolls zählten `fBadges` zur Förderbox
und sprachen von „jeder ausgegebenen Zahl": beides war zu weit gefasst,
Abnahme-Befunde B-2 und B-4.)

## 3. Testvektoren (B5)

**Gesamt: 858** (gezählt aus dem tatsächlichen Lauf, nicht geschätzt). Jede
diskrete Achse einzeln vollständig durchpermutiert, plus Kreuzprodukte der Achsen,
die sich im Orakel gegenseitig bedingen, plus 200 Zufallskombinationen mit festem
Seed 42 (`mulberry32`, eigener deterministischer Generator im Testskript, NICHT
`Math.random`).

| Gruppe | Vektoren | Inhalt |
|---|---|---|
| `default` | 1 | Orakel-HTML-Startwerte |
| `achse:*` | 121 | jede Achse einzeln, vollständiger Wertebereich |
| `foerder:*` | 384 | Vollkreuz Periode(6) × EU(2) × Klima(2) × Alt20(2) × Kind(2) × Einkommen(4) |
| `togg:*` | 16 | neuFossil × vglBrennstoff × bio × finanz |
| `togg2:*` | 16 | dynTarif × immo × proKlima × heizart |
| `proklima:*` | 24 | Periode(6) × invWP(4), 60-Prozent-Deckel und 1.500-Kappung |
| `deckel:*` | 82 | 60-Prozent-Kumulierungsdeckel beidseitig umzingelt (siehe unten) |
| `einheit:*` | 5 | kWh / m³ / Liter (Client-Umrechnung ×10) |
| `modus:*` | 2 | kunde / berater (reines Echo) |
| `kante:*` | 7 | Break-even sofort/nie, Mehrinvest ≤ 0, Quote gekappt, kredLZ > laufzeit, Strompreis sinkend |
| `rand#*` | 200 | Zufallskombination über ALLE Achsen, Seed 42 |

Summe der Gruppen = 858. (Frühere Fassung: 776, ohne die Gruppe `deckel:*`.)

### Die Deckel-Gruppe (`deckel:*`, 82 Vektoren)

Anlass: die Mutation `kumCapPct 0.6 → 0.65` wurde von nur **2 von 776** Vektoren
gefangen. Die Regel mit dem grössten Geld-Hebel hing an zwei Fällen.

Wo liegt die Kante? Der Deckel beisst, sobald `fBetrag + pkWP > 0,6 × invWP`
(Orakel Z.224 bis 226):

| Bereich | Kante | Testfälle |
|---|---|---|
| `invWP ≤ 28.000` (pkWP = round(0,05 × inv)) | kürzt sich zu **Quote > 55 %**, unabhängig von invWP | Quoten 30/46 darunter, 56/60/70/76/80 darüber, je mit proKlima an und aus, je bei invWP 20.000 und 28.000 |
| `invWP ≥ 30.000` (pkWP auf 1.500 gekappt) | **280 × q + 1.500 = 0,6 × invWP**, bei q=60 also invWP = 30.500 exakt | 30.400 (beisst) / **30.500 (exakt auf der Grenze)** / 30.600 (beisst nicht) |
| Paket-Preise | Kanon Abschnitt 5 | 29.750 / 34.510 / 45.220 / 57.120, je Periode und je proKlima an/aus |

Quote 55 selbst ist mit dem ganzzahligen Bonus-Raster der Reform-Perioden nicht
erreichbar (mögliche Quoten in h2-2026: 0/10/16/26/30/40/46/56/60/70/76/80). Sie
wird deshalb beidseitig eingeklemmt statt exakt getroffen; exakt getroffen wird
die Kante im Invest-Raum bei 30.500 Euro.

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

== PERIODEN-GATE (Seed-Pfad, ohne Sheet) ==
Stichtags-Faelle: 18 / 18
Invariante 'ab 2026-07-21 nie alt' (72 Monatsraster-Daten): PASS
PERIODEN-GATE: PASS

== LIVE-FOERDERBOX-GATE (Zuschuss/Eigenanteil/proKlima-effektiv) ==
Faelle: 12 / 12
LIVE-FOERDERBOX-GATE: PASS

== VEKTOREN ==
Gesamt: 858

== ERGEBNIS ==
Delta EXAKT 0: 858 / 858
Abweichend:    0

AEQUIVALENZ-GATE: PASS. Delta 0 auf den 11 verglichenen Anzeigeflaechen
plus allen Chart-Serien von calculate() + updateFoerderung() (Berater-Modus).
NICHT im Vergleich: fBadges-Flags, renderLiveFoerder, renderFoerderAufbau,
cBreakLabels, Wizard-UI. Begruendung je Flaeche: PROTOKOLL.md Abschnitt 7.
Gate 2 (Perioden-Automatik): PASS. Gate 3 (Live-Foerderbox): PASS.
```

Reproduktion: `node apps-script/rechner-backend/tests/kv_equivalence/run_equivalence.js`
(führt alle drei Gates aus). Einzeln: `node run_perioden_automatik.js`,
`node run_livebox_gate.js`.

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

sha256 kv_engine.gs nach Wiederherstellung (Stand Lane-B-Lauf, vor den Fixes
X-1 bis X-4): `671c84ae9814866bd226f978e94f1e02190485a0c12ec46678ccdae5670071e9`

### 5b. Wirksamkeit der Deckel-Gruppe (Fix X-2, eigener Mutationslauf LANE-B2)

Der Deckel wurde dreimal verfälscht, je über den vollen Vektorsatz (858).
Wiederherstellung nach jedem Lauf per `sha256` belegt.

| Mutation | rote Vektoren | davon `deckel:*` | Aussage |
|---|---|---|---|
| `kumCapPct 0.6 → 0.65` | **8** (vorher: 2 von 776) | 6 | dieselbe Mutation wie M9 der Abnahme, Marge vervierfacht |
| `kumCapPct 0.6 → 0.61` | **7** | 5 | auch eine Verfälschung um einen Prozentpunkt wird gefangen |
| `kumCapPct 0.6 → 0.599` | **6** | 4 | Deckel SENKEN wird ebenfalls gefangen (Gegenrichtung) |

Der Vektor `deckel:kante-inv30500/pktrue` (exakt auf der Kappungsgrenze) wird nur
beim **Senken** des Deckels rot, nicht beim Anheben. Genau so muss sich ein Fall
auf der Grenze verhalten: `fBetrag + pkWP` ist dort gleich `0,6 × invWP`, ein
höherer Deckel ändert das Ergebnis nicht, ein niedrigerer sofort. Der Fall ist
damit nachweislich kein Blindgänger.

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

## 7. Bewusst NICHT verglichen (Abnahme-Befund B-2, eigene Nachmessung)

Diese Orakel-Ausgaben werden vom Äquivalenz-Gate **nicht** berührt. Sie stehen
hier vollständig, damit die Zusage des Gates (Abschnitt 2) nicht grösser wirkt,
als sie ist.

| Orakel-Ausgabe | Ort | Warum nicht verglichen | Risiko |
|---|---|---|---|
| `fBadges` | Z.139 bis 141, in `updateFoerderung` | Reine Anzeige-Formatierung ohne eigene Rechnung: der Text setzt `f.grundPct`, `f.hj.klima`, `f.e` zusammen, die alle einzeln über `fGrundPct` / `fKlimaPct` / `fEinkBonusLbl` verglichen werden. Eigenständig sind nur die aktiv/inaktiv-Flags (CSS-Klassen), also Optik. | keins für Zahlen; ein falsches Flag wäre ein UI-Fehler und fiele in B7 auf |
| `renderLiveFoerder` → `wzLiveFoerder` | Z.1006 bis 1035 | **Rechen-relevant, deshalb NICHT einfach abgehakt, sondern durch Gate 3 abgedeckt** (Abschnitt 9). Ein echter Orakel-Vergleich ist mit diesem Harness unmöglich, eigene Messung: die Funktion liegt in der Wizard-IIFE (Z.676 bis 1180) und ist von aussen nicht aufrufbar; `#wzLiveFoerder` existiert im HTML nicht, sondern wird erst von `init()` im Kunden-Modus erzeugt (Z.723); und dort liefert sie leeren Text, solange `step1Valid()` falsch ist (Z.1008), was nur echte Wizard-Interaktion ändert. Ein Vergleich braucht einen wizard-fähigen DOM. → BLOCKED-1 in `LANE-B2.md`. | gedeckt durch Gate 3 gegen Kanon Abschnitt 5, siehe dortige Einschränkung |
| `renderFoerderAufbau` | Z.1036 ff. | Läuft nur im Kunden-Modus (`wz-customer`), der Harness läuft `?modus=berater`. Zeigt die Bausteine der Quote (Grund/Klima/Einkommen), deren Zahlen alle über `foerderBox` verglichen werden. Eigene Rechnung: keine. | gering, gleiche Quellzahlen |
| `cBreakLabels` | Chart-2-Serien-Namen | Reine Beschriftung („Energie + CO₂", „Wartung" …), keine Zahl. Der Port erzeugt sie gar nicht: die Serien-Namen sind Sache des Clients (B7). Die zugehörigen **Daten** werden auf voller Float-Gleichheit verglichen. | keins |
| Wizard-Ausgaben (`wzEstVal`, `wzVerbVal`, `bedarfLive`, `etaLive`, `wzStepper` …) | diverse | Ausserhalb des Lane-B-Scope: Dimensionierung und UI, nicht Teil von `calculate()`. | Scope-Grenze, in B7 zu prüfen |

## 8. Gate 2: Perioden-Automatik (`run_perioden_automatik.js`)

Anlass: Abnahme-Befund B-1 (KRITISCH). Die Perioden-Auswahl lebte nur als
Code-Block in `kv_routes_wiring_spec.md`, entschied über `gueltigAb`/`gueltigBis`
und wurde von keinem Test berührt. Diese Felder fehlten im `KV_PARAMS_SEED`:
auf dem Seed-Fallback-Pfad (`kv_sheet_spec.md` 4) lieferte die Funktion deshalb
für **jedes** Datum `alt`, auch 2030.

Fix: die Felder stehen jetzt im Seed (zeilengleich mit dem Sheet-Tab), und die
Auswahl-Logik liegt als reine Funktion `kvPeriodeFuerDatum(heuteIso, params)` in
`kv_engine.gs`, dort, wo die Tests greifen. Der Wrapper `kvPeriodeHeute_` in der
Spec liest nur noch die Uhr und ruft sie auf. Keine doppelte Logik mehr.

Geprüft wird der **reine Seed-Pfad** (ohne Sheet), genau dort sass der Defekt:
18 Stichtags-Fälle (jede Periode an beiden Kanten) plus die Invariante, dass kein
Datum ab dem 21.07.2026 jemals `alt` liefert (72 Monatsraster-Daten bis 2031).

## 9. Gate 3: Live-Förderbox (`run_livebox_gate.js`)

Deckt `liveZuschuss`, `liveEigenanteil`, `proKlimaEffektiv` ab (Abnahme-Befund
B-2, die einzige rechen-relevante Lücke).

**Autorität dieses Gates, unmissverständlich:** Es ist **kein** Orakel-Vergleich
(Begründung in Abschnitt 7). Die Sollwerte stammen aus der ratifizierten
Eigenanteils-Tabelle in **Kanon Abschnitt 5**, einer vom Port unabhängigen,
abgenommenen Quelle, plus den drei Kappungs-Kanten aus Abschnitt 3. Das Gate
fängt jede spätere Verfälschung dieser Zahlen. Es beweist **nicht**, dass die
Erst-Transkription aus dem Orakel korrekt war; dafür bräuchte es den
wizard-fähigen DOM aus BLOCKED-1.

12 Fälle, alle PASS. Der Port reproduziert die vier Paket-Eigenanteile des Kanons
(7.350 / 12.110 / 21.320 / 33.220) unabhängig nach.

## 10. Bekannte Grenzen (ehrlich benannt)

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
