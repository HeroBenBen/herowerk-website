---
typ: bericht
datum: 2026-08-18
status: abgeschlossen_mit_technischer_luecke
scope: hitl
quelle: agent
---

# Bericht Doppellauf, Fassung 4

## Ergebnis

- Strecke A, Vaillant: **26 von 26** Szenarien treffen Modell und Anzahl.
- Strecke A, Wolf: **0 von 26** Szenarien besitzen einen Fremdvergleich. Der myWOLF-Fachpartner-Zugang war laut Benjamin technisch nicht verfügbar; alle Wolf-Zeilen tragen `kein_fremdvergleich` und `nur_herowerk`.
- Strecke A gesamt: **26 von 52** Zeilen sind gedeckt; die übrigen 26 sind nicht geprüft, nicht bestanden.
- Strecke B: **0 von 12** angezeigten Heizlasten sind gleich. HeroWerk liegt **16,9 bis 24,4 Prozent** unter Vaillant. Der unerklärte Rest beträgt nach Rundung höchstens **0,11 kW**.
- Strecke C, bauteilweise: **1 von 12** angezeigten Heizlasten ist gleich, S7 mit 8,3 kW. Auf Basis W/m² ist ebenfalls **1 von 12** gleich, S5 mit 78 W/m².
- Strecke C, einfacher Baualtersklassenrechner: **0 von 12** Vergleiche; kein separates bedienbares Formular gefunden.

## Stand und Quellen

- HeroWerk-Rechenkern: Commit `854de12070a2814af2a8d6acab8f6e792f3eac3d`, `origin/main`, abgerufen am 18.08.2026.
- Live-Wertevorrat: `Geraete_Katalog!B6 = 8,54 kW`; die acht Vaillant-Kaskadenzeilen tragen in F und G ebenfalls 8,54 kW.
- Feststellung: Der Rechenkern verwendet den Markentreiber `heizstab_vaillant`, nicht die Zeilenspalten F und G.
- Unveränderte Vaillant-Rohantworten für 55 °C/Heizkörper und 35 °C/Flächenheizung: Erhebung 16.08.2026. Live-Vorprobe am 18.08.2026 mit 5 und 26 kW ergab unterschiedliche Heizlasten und unterschiedliche Empfehlungen; die Heizlast greift.
- Vaillant-Warmwasser: 4 Personen, 1 Dusche, 1 Badewanne, Standardkomfort und 55 °C ergeben **3,565632 kW**. HeroWerk bildet aus denselben Standard-Zapfstellen **4,82 kW**. Beide Werte liegen unter den Zusatz-Heizlasten 9, 15 und 23 kW; die Geräteempfehlung bleibt daher unverändert.
- Keine Änderung am Blatt, an B6 oder am Rechenkern.

## Wege und Abrufstände

- Vaillant Schnellauslegung: `https://wp-schnellauslegung.vaillant.de/`, 2 Live-Vorproben für A, 12 bediente Verbrauchsszenarien für B, 26 A-Szenarien aus den unveränderten Rohantworten beider Übergaben.
- Wolf WärmepumpenPlaner: kein Lauf; erforderlich ist Benjamins myWOLF-Fachpartner-Anmeldung. Werkzeug technisch nicht verfügbar.
- BWP-Heizlastrechner: `https://www.waermepumpe.de/werkzeuge/heizlastrechner/`, 12 bediente Szenarien plus 1 erneute Formularprüfung.
- HeroWerk: 52 Gerätezeilen sowie je 12 Heizlastszenarien für B und C direkt im Rechenkern.
- Vaillant nimmt in B den in kWh umgerechneten Gasverbrauch entgegen. Umrechnung: **1 m³ Gas = 10 kWh**.
- BWP verlangt den Ort über PLZ 30419 und zeigt **−11,0 °C**. Für Doppelhaushälfte/Reihenmittelhaus wurde `Reihenhaus`, für Zweifamilienhaus `Mehrfamilienhaus` verwendet, weil das Werkzeug keine genaueren Kategorien anbietet.

## Strecke A, Abweichungen

Vaillant weist keine Abweichung bei Modell und Anzahl auf. Die 26 technisch ungeprüften Wolf-Zeilen sind:

- A1: fremd kein Wert; HeroWerk Wolf CHA-07, 1 Gerät; `nur_herowerk`.
- A2: fremd kein Wert; HeroWerk Wolf CHA-07, 1 Gerät; `nur_herowerk`.
- A3: fremd kein Wert; HeroWerk Wolf CHA-10, 1 Gerät; `nur_herowerk`.
- A4: fremd kein Wert; HeroWerk Wolf CHA-10, 1 Gerät; `nur_herowerk`.
- A5: fremd kein Wert; HeroWerk Wolf CHA-16/20, 1 Gerät; `nur_herowerk`.
- A6: fremd kein Wert; HeroWerk Wolf CHA-16/20, 1 Gerät; `nur_herowerk`.
- A7: fremd kein Wert; HeroWerk Wolf CHA-16/20, 1 Gerät; `nur_herowerk`.
- A8: fremd kein Wert; HeroWerk Wolf CHA-16/20, 1 Gerät; `nur_herowerk`.
- A9: fremd kein Wert; HeroWerk Wolf CHA-20/24, 1 Gerät; `nur_herowerk`.
- A10: fremd kein Wert; HeroWerk 2× Wolf CHA-16/20, 2 Geräte; `nur_herowerk`.
- A11: fremd kein Wert; HeroWerk Wolf CHA-07, 1 Gerät; `nur_herowerk`.
- A12: fremd kein Wert; HeroWerk Wolf CHA-07, 1 Gerät; `nur_herowerk`.
- A13: fremd kein Wert; HeroWerk Wolf CHA-07, 1 Gerät; `nur_herowerk`.
- A14: fremd kein Wert; HeroWerk Wolf CHA-10, 1 Gerät; `nur_herowerk`.
- A15: fremd kein Wert; HeroWerk Wolf CHA-16/20, 1 Gerät; `nur_herowerk`.
- A16: fremd kein Wert; HeroWerk Wolf CHA-16/20, 1 Gerät; `nur_herowerk`.
- A17: fremd kein Wert; HeroWerk Wolf CHA-16/20, 1 Gerät; `nur_herowerk`.
- A18: fremd kein Wert; HeroWerk Wolf CHA-16/20, 1 Gerät; `nur_herowerk`.
- A19: fremd kein Wert; HeroWerk Wolf CHA-20/24, 1 Gerät; `nur_herowerk`.
- A20: fremd kein Wert; HeroWerk Wolf CHA-20/24, 1 Gerät; `nur_herowerk`.
- A21: fremd kein Wert; HeroWerk Wolf CHA-10, 1 Gerät; `nur_herowerk`.
- A22: fremd kein Wert; HeroWerk Wolf CHA-16/20, 1 Gerät; `nur_herowerk`.
- A23: fremd kein Wert; HeroWerk Wolf CHA-20/24, 1 Gerät; `nur_herowerk`.
- A24: fremd kein Wert; HeroWerk Wolf CHA-07, 1 Gerät; `nur_herowerk`.
- A25: fremd kein Wert; HeroWerk Wolf CHA-16/20, 1 Gerät; `nur_herowerk`.
- A26: fremd kein Wert; HeroWerk Wolf CHA-20/24, 1 Gerät; `nur_herowerk`.

## Strecke B, Abweichungen

`differenz_kW = Vaillant − HeroWerk`; Prozentbezug ist immer der Vaillant-Wert.

- S1: Vaillant 17,8 kW; HeroWerk 14,5 kW; Differenz 3,3 kW beziehungsweise 18,5 %; Kesselwirkungsgrad 2,49 kW, Warmwasserabzug 0,78 kW, Rest 0,03 kW.
- S2: 13,4 zu 10,7 kW; 2,7 kW beziehungsweise 20,1 %; 1,87 + 0,78 kW; Rest 0,05 kW.
- S3: 25,6 zu 21,2 kW; 4,4 kW beziehungsweise 17,2 %; 3,58 + 0,78 kW; Rest 0,04 kW.
- S4: 18,9 zu 15,5 kW; 3,4 kW beziehungsweise 18,0 %; 2,64 + 0,78 kW; Rest −0,02 kW.
- S5: 12,3 zu 9,7 kW; 2,6 kW beziehungsweise 21,1 %; 1,71 + 0,78 kW; Rest 0,11 kW.
- S6: 14,5 zu 11,6 kW; 2,9 kW beziehungsweise 20,0 %; 2,02 + 0,78 kW; Rest 0,10 kW.
- S7: 11,7 zu 9,3 kW; 2,4 kW beziehungsweise 20,5 %; 1,63 + 0,78 kW; Rest −0,01 kW.
- S8: 7,8 zu 5,9 kW; 1,9 kW beziehungsweise 24,4 %; 1,09 + 0,78 kW; Rest 0,03 kW.
- S9: 14,5 zu 11,6 kW; 2,9 kW beziehungsweise 20,0 %; 2,02 + 0,78 kW; Rest 0,10 kW.
- S10: 11,7 zu 9,3 kW; 2,4 kW beziehungsweise 20,5 %; 1,63 + 0,78 kW; Rest −0,01 kW.
- S11: 29,0 zu 24,1 kW; 4,9 kW beziehungsweise 16,9 %; 4,04 + 0,78 kW; Rest 0,08 kW.
- S12: 26,7 zu 22,2 kW; 4,5 kW beziehungsweise 16,9 %; 3,73 + 0,78 kW; Rest −0,01 kW.

## Strecke C, Abweichungen

Prozentwerte beziehen sich auf die bauteilweisen BWP-Werte in W/m².

- S1: HeroWerk 100 W/m² und 14,0 kW; BWP 136 W/m² und 19,0 kW; −26,5 %.
- S2: HeroWerk 78 W/m² und 10,9 kW; BWP 109 W/m² und 15,2 kW; −28,4 %; gesetzt: Dach und Fenster.
- S3: HeroWerk 100 W/m² und 20,0 kW; BWP 136 W/m² und 27,2 kW; −26,5 %.
- S4: HeroWerk 100 W/m² und 16,0 kW; BWP 98 W/m² und 15,7 kW; +2,0 %.
- S5: HeroWerk und BWP 78 W/m²; angezeigte Heizlast 12,4 zu 12,5 kW; gesetzt: Dach und Fenster.
- S6: HeroWerk 78 W/m² und 11,7 kW; BWP 74 W/m² und 11,2 kW; +5,4 %.
- S7: HeroWerk 55 W/m²; BWP 56 W/m²; beide zeigen 8,3 kW; −1,8 %.
- S8: HeroWerk 33 W/m² und 5,3 kW; BWP 47 W/m² und 7,5 kW; −29,8 %.
- S9: HeroWerk 90 W/m² und 10,8 kW; BWP 66 W/m² und 8,0 kW; +36,4 %.
- S10: HeroWerk 85 W/m² und 9,4 kW; BWP 66 W/m² und 7,3 kW; +28,8 %.
- S11: HeroWerk 95 W/m² und 20,9 kW; BWP 65 W/m² und 14,3 kW; +46,2 %.
- S12: HeroWerk 78 W/m² und 14,0 kW; BWP 85 W/m² und 15,3 kW; −8,2 %; gesetzt: Dach und Fenster.

Bei S1, S3, S4, S6, S7, S8, S9, S10 und S11 wurde kein Bauteil als saniert markiert. Bei S2, S5 und S12 wurden ausschließlich Dach und Fenster markiert. Außenwand, Boden und Haustür blieben im Ursprungszustand.

## Dateien

- `A_geraeteauswahl.csv`: 52 Ergebniszeilen.
- `B_heizlast_verbrauchswertverfahren.csv`: 12 Ergebniszeilen.
- `C_heizlast_baualtersklassenverfahren.csv`: 12 Ergebniszeilen.
