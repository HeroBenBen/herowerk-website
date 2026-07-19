---
type: reference
tldr: "Spezifikation der zwei neuen Sheet-Tabs KV_Parameter und KV_FoerderPerioden (alle Schlüssel mit Seed-Werten aus dem Orakel plus Alt-Periode) samt Seed-Funktion nach dem Muster setupSheets/writeKeyValueDoc_ aus Code.gs."
datum: 2026-07-15
quelle: "Orakel WP_Rechner_HeroWerk.html (Script-SHA 55344fe5…b9f3, PASS); Kanon Abschnitt 2 für die Alt-Zeile; Code.gs origin/main (read-only gelesen) für Tab- und Seed-Muster"
status: O-5 Repo-Wiring umgesetzt; Live-Sheet-Seed und Read-back bleiben R15-Gate
---

# KV-Sheet-Spec — Tabs `KV_Parameter` und `KV_FoerderPerioden`

Zielsheet: `SHEET_ID = 176a2khhd3eIJJwe23JXfuEaTTjY-qrkccxb-F52yoVA`
(privates Rechner-Backend-Sheet, dasselbe wie für die Bestands-Routen).

Die Engine (`kv_engine.gs`) liest ihre Parameter aus diesen Tabs. `KV_PARAMS_SEED`
im Code ist der **Fallback und Seed**, nicht die Quelle der Wahrheit: sobald die
Tabs stehen, gewinnt das Sheet (ADR-04: Rechenlogik im Apps Script, Werte im
privaten Sheet).

**Alle Seed-Werte unten sind orakel-identisch** (Ausnahme: die Alt-Zeile, die
durch 33 Förderfälle inklusive 600er Alt-Matrix abgesichert ist). Der
Äquivalenz-Beweis (tests/kv_equivalence/PROTOKOLL.md) gilt genau
für diese Werte. Wer hier etwas ändert, ändert das Ergebnis: erst
Änderungsprotokoll, dann Sheet (R9).

## 1. Tab `KV_Parameter`

Struktur exakt wie die bestehenden Key-Value-Tabs (`writeKeyValueDoc_`, Code.gs
Z.394 bis 404): 5 Spalten, Kopfzeile eingefroren, Spalte B als reine Zahl
formatiert (`0.############`) — sonst liefert `getValues()` bei geerbter
Datumsformatierung ein `Date` statt der Zahl.

| Spalte | A | B | C | D | E |
|---|---|---|---|---|---|
| Kopf | `schluessel` | `wert` | `einheit` | `bedeutung` | `quelle` |

| schluessel | wert | einheit | bedeutung | quelle |
|---|---|---|---|---|
| `grund_pct_eu` | 30 | Prozent | Grundförderung mit EU-Wertschöpfung bzw. in Perioden ohne EU-Differenzierung | Orakel Z.107, KfW 458 |
| `grund_pct_nicht_eu` | 15 | Prozent | Grundförderung ohne EU-Wertschöpfung (ab 2027) | Orakel Z.107, KfW-PM BEG-Reform |
| `proklima_aktiv` | N | J/N | Globaler produktiver Kill-Switch: `N` verhindert jede Anrechnung; Prozent, Höchstbetrag und Periodenfelder bleiben ausschließlich als interne Engine-/Orakel-Referenz erhalten | GF-Decision 15.07.2026, Kanon 1.3 |
| `proklima_pct` | 0.05 | Anteil | proKlima Hannover: Anteil der förderfähigen Kosten | Orakel Z.219, Kanon 1.3 |
| `proklima_max` | 1500 | Euro | proKlima Hannover: Höchstbetrag | Orakel Z.219, Kanon 1.3 |
| `kum_cap_pct` | 0.6 | Anteil | BEG-Kumulierungsgrenze bei weiteren öffentlichen Mitteln | Orakel Z.225, Kanon 1.3 |
| `co2f_gas` | 0.182 | kg/kWh | CO₂-Faktor Gas, brennwertbezogen (Hs, Abrechnungs-kWh) | Orakel Z.148, UBA |
| `co2f_oel` | 0.266 | kg/kWh | CO₂-Faktor Heizöl | Orakel Z.148, UBA |
| `bio_stufe_1_jahr` | 2029 | Jahr | Biotreppe Stufe 1 ab | Orakel Z.151, GEG §71(9) |
| `bio_stufe_1_anteil` | 0.15 | Anteil | Biotreppe Stufe 1 | Orakel Z.151, GEG §71(9) |
| `bio_stufe_2_jahr` | 2035 | Jahr | Biotreppe Stufe 2 ab | Orakel Z.151, GMG-Eckpunkte Feb. 2026 |
| `bio_stufe_2_anteil` | 0.30 | Anteil | Biotreppe Stufe 2 | Orakel Z.151 |
| `bio_stufe_3_jahr` | 2040 | Jahr | Biotreppe Stufe 3 ab | Orakel Z.151 |
| `bio_stufe_3_anteil` | 0.60 | Anteil | Biotreppe Stufe 3 | Orakel Z.151, Öko-Institut März 2026 |
| `eta_neu_gas` | 0.95 | Anteil | Nutzungsgrad neuer Gas-Brennwertkessel | Orakel Z.236 |
| `eta_neu_oel` | 0.93 | Anteil | Nutzungsgrad neuer Öl-Brennwertkessel | Orakel Z.236 |
| `strommix_start_jahr` | 2026 | Jahr | Strommix-Pfad Startjahr | Orakel Z.158, UBA/Agora |
| `strommix_start_g` | 350 | g/kWh | Strommix Startwert (konservativ) | Orakel Z.158, UBA |
| `strommix_end_jahr` | 2040 | Jahr | Strommix-Pfad Endjahr, danach konstant | Orakel Z.158, Agora |
| `strommix_end_g` | 100 | g/kWh | Strommix Endwert | Orakel Z.158, Agora |
| `wartung_wp` | 350 | Euro/Jahr | Wartungskosten Wärmepumpe | Orakel Z.271 |
| `wartung_fossil` | 250 | Euro/Jahr | Wartungskosten fossile Heizung | Orakel Z.257 |
| `start_jahr` | 2026 | Jahr | Jahr 1 der Betrachtung | Orakel Z.243 |
| `co2_ziel_schritte` | 19 | Anzahl | Schritte bis zum CO₂-Zieljahr 2045 (Index 0 = 2026) | Orakel Z.240 |
| `kred_lz_default` | 10 | Jahre | Kredit-Laufzeit, wenn Finanzierung AUS ist | Orakel Z.178 |
| `kred_zins_default` | 0.035 | Anteil | Kredit-Zins, wenn Finanzierung AUS ist | Orakel Z.179 |
| `sensi_best_fossil` | 0.015 | Prozentpunkte/Jahr | Best Case: fossil steigt schneller | Orakel Z.359 |
| `sensi_best_strom` | -0.01 | Prozentpunkte/Jahr | Best Case: Strom steigt langsamer | Orakel Z.359 |
| `sensi_worst_fossil` | -0.015 | Prozentpunkte/Jahr | Worst Case: fossil steigt langsamer | Orakel Z.361 |
| `sensi_worst_strom` | 0.015 | Prozentpunkte/Jahr | Worst Case: Strom steigt schneller | Orakel Z.361 |
| `co2_flug_t` | 0.5 | t CO₂ | Vergleichsgröße Kurzstreckenflug Hannover-Mallorca | Orakel Z.338, UBA-Rechner |
| `co2_baum_kg` | 12.5 | kg CO₂/Jahr | Vergleichsgröße Baum-Bindung pro Jahr | Orakel Z.338, Forst-Durchschnitt |
| `wz_spez_vor1978` | 180 | kWh/m²a | Schätzung spezifischer Verbrauch | Orakel Z.778 |
| `wz_spez_1978_1994` | 140 | kWh/m²a | Schätzung spezifischer Verbrauch | Orakel Z.778 |
| `wz_spez_1995_2010` | 100 | kWh/m²a | Schätzung spezifischer Verbrauch | Orakel Z.778 |
| `wz_spez_nach2010` | 60 | kWh/m²a | Schätzung spezifischer Verbrauch | Orakel Z.778 |
| `wz_gebf_efh` | 1.0 | Faktor | Gebäudefaktor Einfamilienhaus | Orakel Z.780 |
| `wz_gebf_dhh` | 0.9 | Faktor | Gebäudefaktor Doppelhaushälfte | Orakel Z.780 |
| `wz_gebf_rh` | 0.85 | Faktor | Gebäudefaktor Reihenhaus | Orakel Z.780 |
| `wz_gebf_zfh` | 0.95 | Faktor | Gebäudefaktor Zweifamilienhaus | Orakel Z.780 |
| `wz_gebf_mfh` | 0.85 | Faktor | Gebäudefaktor Mehrfamilienhaus | Orakel Z.780 |
| `wz_unit_faktor` | 10 | kWh je m³/Liter | Umrechnung m³ Gas bzw. Liter Heizöl in kWh | Orakel Z.781 |

## 2. Tab `KV_FoerderPerioden`

Eine Zeile je Periode. **Die Alt-Zeile steht bewusst als Datenzeile drin**, damit
die Perioden-Automatik (Briefing Abschnitt 5) ohne Code-Zweig-Duplikat auskommt:
Alt und Reform laufen durch dieselbe Formel, sie unterscheiden sich nur in diesen
Feldern.

| Spalte | Bedeutung |
|---|---|
| A `key` | Perioden-Schlüssel (Request-Wert `fHalbjahr`) |
| B `gueltig_ab` | Antragsdatum ab (ISO), leer bei `alt` |
| C `gueltig_bis` | Antragsdatum bis (ISO) |
| D `label` | Kundentext des Antragszeitraums |
| E `klima_pct` | Klimageschwindigkeitsbonus in Prozent |
| F `grenze` | Bemessungsgrenze förderfähige Kosten in Euro |
| G `eu_differenzierung` | `J`/`N`: EU-Wertschöpfung wirkt auf die Grundförderung |
| H `cap` | Deckel der Gesamtquote in Prozent |
| I `effizienz_pct` | Effizienzbonus R290 in Prozent (nur Alt) |
| J `kind_freibetrag` | Familienzuschlag in Euro (einmalig, mind. 1 minderjähriges Kind) |
| K `eink_stufen` | Einkommensstaffel als `maxAnrechenbar:Prozent`, mit `;` getrennt |
| L `proklima_erlaubt` | `J`/`N`: proKlima in dieser Periode ansetzbar |
| M `quelle` | Beleg |

| key | gueltig_ab | gueltig_bis | label | klima_pct | grenze | eu | cap | effizienz_pct | kind_freibetrag | eink_stufen | proklima | quelle |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `alt` | | 2026-07-20 | bis 20.07.2026 | 20 | 30000 | N | 70 | 5 | 0 | `40000:30` | J | Kanon Abschnitt 2 (Code.gs `foerderung_` Z.157 bis 196) |
| `h2-2026` | 2026-07-21 | 2027-01-31 | 21.07.2026 bis 31.01.2027 | 16 | 28000 | N | 80 | 0 | 10000 | `30000:40;40000:30;50000:10` | J | Orakel Z.97, KfW 458 |
| `h1-2027` | 2027-02-01 | 2027-07-31 | 01.02. bis 31.07.2027 | 12 | 27250 | J | 80 | 0 | 10000 | `30000:40;40000:30;50000:10` | N | Orakel Z.98 |
| `h2-2027` | 2027-08-01 | 2028-01-31 | 01.08.2027 bis 31.01.2028 | 8 | 26500 | J | 80 | 0 | 10000 | `30000:40;40000:30;50000:10` | N | Orakel Z.99 |
| `h1-2028` | 2028-02-01 | 2028-07-31 | 01.02. bis 31.07.2028 | 4 | 25750 | J | 80 | 0 | 10000 | `30000:40;40000:30;50000:10` | N | Orakel Z.100 |
| `h2-2028` | 2028-08-01 | 2029-01-31 | 01.08.2028 bis 31.01.2029 | 0 | 25000 | J | 80 | 0 | 10000 | `30000:40;40000:30;50000:10` | N | Orakel Z.101 |
| `h1-2029` | 2029-02-01 | 2029-07-31 | 01.02. bis 31.07.2029 | 0 | 24250 | J | 80 | 0 | 10000 | `30000:40;40000:30;50000:10` | N | Orakel Z.102 |

**Anzeige-Reihenfolge der Degressions-Treppe** = die 6 Reform-Zeilen in dieser
Reihenfolge, OHNE `alt` (Orakel Z.67 iteriert nur über `FOERDER_HJ`).

**Parität-Pflicht Sheet ↔ Seed:** Diese Tabelle ist zeilen- und feldgleich mit
`KV_PARAMS_SEED.perioden` in `kv_engine.gs`, ausdrücklich einschliesslich
`gueltig_ab`/`gueltig_bis` (dort `gueltigAb`/`gueltigBis`). Grund: der Seed ist
der Fallback, wenn ein Tab fehlt (Abschnitt 4). Fehlen die Datumsfelder im Seed,
fällt die Perioden-Automatik still und dauerhaft auf die erste Zeile (`alt`)
zurück, während die Website Reform-Zahlen verspricht (Abnahme-Befund B-1). Wer
hier eine Zeile ändert, ändert den Seed mit und lässt
`node tests/kv_equivalence/run_perioden_automatik.js` laufen.

## 3. Seed-Funktion (Muster: `setupSheets` / `writeKeyValueDoc_`)

Zur Übernahme in Code.gs durch den Controller. `kvSetupSheets()` bleibt bewusst
eine EIGENE Funktion und wird NICHT in `setupSheets()` hineingezogen: `setupSheets`
trägt den Warnhinweis „NICHT AUSFÜHREN: überschreibt die fertige v4-Tab-Struktur"
(Code.gs Z.381). Die KV-Tabs sind neu und dürfen isoliert geseedet werden.

```javascript
/**
 * Erstbefüllung der KV-Tabs. Idempotent (clear + write), berührt KEINE
 * Bestands-Tabs. Nach dem Lauf ist der Engine-Cache zu leeren.
 */
function kvSetupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  writeKeyValueDoc_(ss, 'KV_Parameter', KV_PARAMETER_ROWS_());
  kvWriteFoerderPerioden_(ss, 'KV_FoerderPerioden', KV_PERIODEN_ROWS_());
  CacheService.getScriptCache().remove('kvparams:v1');
}

/** Perioden-Tab: 13 Spalten, Kopf eingefroren. Analog writeKeyValueDoc_. */
function kvWriteFoerderPerioden_(ss, name, rows) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, 13).setValues([['key', 'gueltig_ab', 'gueltig_bis', 'label',
    'klima_pct', 'grenze', 'eu_differenzierung', 'cap', 'effizienz_pct',
    'kind_freibetrag', 'eink_stufen', 'proklima_erlaubt', 'quelle']]);
  // Datums-Spalten als TEXT: die Engine vergleicht ISO-Strings, kein Date-Objekt.
  sh.getRange(2, 2, rows.length, 2).setNumberFormat('@');
  // eink_stufen ist Text ("30000:40;40000:30"), sonst frisst Sheets den Doppelpunkt als Zeit.
  sh.getRange(2, 11, rows.length, 1).setNumberFormat('@');
  sh.getRange(2, 1, rows.length, 13).setValues(rows);
  sh.setFrozenRows(1);
}

function KV_PARAMETER_ROWS_() {
  return [
    ['grund_pct_eu', 30, 'Prozent', 'Grundförderung mit EU-Wertschöpfung', 'Orakel Z.107, KfW 458'],
    ['grund_pct_nicht_eu', 15, 'Prozent', 'Grundförderung ohne EU-Wertschöpfung (ab 2027)', 'Orakel Z.107, KfW-PM BEG-Reform'],
    ['proklima_aktiv', 'N', 'J/N', 'Globaler produktiver Kill-Switch; interne Engine-Referenz bleibt erhalten', 'GF-Decision 15.07.2026, Kanon 1.3'],
    ['proklima_pct', 0.05, 'Anteil', 'proKlima Hannover: Anteil der förderfähigen Kosten', 'Orakel Z.219, Kanon 1.3'],
    ['proklima_max', 1500, 'Euro', 'proKlima Hannover: Höchstbetrag', 'Orakel Z.219, Kanon 1.3'],
    ['kum_cap_pct', 0.6, 'Anteil', 'BEG-Kumulierungsgrenze', 'Orakel Z.225, Kanon 1.3'],
    ['co2f_gas', 0.182, 'kg/kWh', 'CO₂-Faktor Gas (brennwertbezogen)', 'Orakel Z.148, UBA'],
    ['co2f_oel', 0.266, 'kg/kWh', 'CO₂-Faktor Heizöl', 'Orakel Z.148, UBA'],
    ['bio_stufe_1_jahr', 2029, 'Jahr', 'Biotreppe Stufe 1 ab', 'Orakel Z.151, GEG §71(9)'],
    ['bio_stufe_1_anteil', 0.15, 'Anteil', 'Biotreppe Stufe 1', 'Orakel Z.151, GEG §71(9)'],
    ['bio_stufe_2_jahr', 2035, 'Jahr', 'Biotreppe Stufe 2 ab', 'Orakel Z.151, GMG-Eckpunkte Feb. 2026'],
    ['bio_stufe_2_anteil', 0.30, 'Anteil', 'Biotreppe Stufe 2', 'Orakel Z.151'],
    ['bio_stufe_3_jahr', 2040, 'Jahr', 'Biotreppe Stufe 3 ab', 'Orakel Z.151'],
    ['bio_stufe_3_anteil', 0.60, 'Anteil', 'Biotreppe Stufe 3', 'Orakel Z.151, Öko-Institut März 2026'],
    ['eta_neu_gas', 0.95, 'Anteil', 'Nutzungsgrad neuer Gas-Brennwertkessel', 'Orakel Z.236'],
    ['eta_neu_oel', 0.93, 'Anteil', 'Nutzungsgrad neuer Öl-Brennwertkessel', 'Orakel Z.236'],
    ['strommix_start_jahr', 2026, 'Jahr', 'Strommix-Pfad Startjahr', 'Orakel Z.158, UBA/Agora'],
    ['strommix_start_g', 350, 'g/kWh', 'Strommix Startwert (konservativ)', 'Orakel Z.158, UBA'],
    ['strommix_end_jahr', 2040, 'Jahr', 'Strommix-Pfad Endjahr, danach konstant', 'Orakel Z.158, Agora'],
    ['strommix_end_g', 100, 'g/kWh', 'Strommix Endwert', 'Orakel Z.158, Agora'],
    ['wartung_wp', 350, 'Euro/Jahr', 'Wartungskosten Wärmepumpe', 'Orakel Z.271'],
    ['wartung_fossil', 250, 'Euro/Jahr', 'Wartungskosten fossile Heizung', 'Orakel Z.257'],
    ['start_jahr', 2026, 'Jahr', 'Jahr 1 der Betrachtung', 'Orakel Z.243'],
    ['co2_ziel_schritte', 19, 'Anzahl', 'Schritte bis CO₂-Zieljahr 2045 (Index 0 = 2026)', 'Orakel Z.240'],
    ['kred_lz_default', 10, 'Jahre', 'Kredit-Laufzeit, wenn Finanzierung AUS', 'Orakel Z.178'],
    ['kred_zins_default', 0.035, 'Anteil', 'Kredit-Zins, wenn Finanzierung AUS', 'Orakel Z.179'],
    ['sensi_best_fossil', 0.015, 'Prozentpunkte/Jahr', 'Best Case: fossil steigt schneller', 'Orakel Z.359'],
    ['sensi_best_strom', -0.01, 'Prozentpunkte/Jahr', 'Best Case: Strom steigt langsamer', 'Orakel Z.359'],
    ['sensi_worst_fossil', -0.015, 'Prozentpunkte/Jahr', 'Worst Case: fossil steigt langsamer', 'Orakel Z.361'],
    ['sensi_worst_strom', 0.015, 'Prozentpunkte/Jahr', 'Worst Case: Strom steigt schneller', 'Orakel Z.361'],
    ['co2_flug_t', 0.5, 't CO₂', 'Vergleichsgröße Kurzstreckenflug', 'Orakel Z.338, UBA-Rechner'],
    ['co2_baum_kg', 12.5, 'kg CO₂/Jahr', 'Vergleichsgröße Baum-Bindung', 'Orakel Z.338, Forst-Durchschnitt'],
    ['wz_spez_vor1978', 180, 'kWh/m²a', 'Schätzung spezifischer Verbrauch', 'Orakel Z.778'],
    ['wz_spez_1978_1994', 140, 'kWh/m²a', 'Schätzung spezifischer Verbrauch', 'Orakel Z.778'],
    ['wz_spez_1995_2010', 100, 'kWh/m²a', 'Schätzung spezifischer Verbrauch', 'Orakel Z.778'],
    ['wz_spez_nach2010', 60, 'kWh/m²a', 'Schätzung spezifischer Verbrauch', 'Orakel Z.778'],
    ['wz_gebf_efh', 1.0, 'Faktor', 'Gebäudefaktor Einfamilienhaus', 'Orakel Z.780'],
    ['wz_gebf_dhh', 0.9, 'Faktor', 'Gebäudefaktor Doppelhaushälfte', 'Orakel Z.780'],
    ['wz_gebf_rh', 0.85, 'Faktor', 'Gebäudefaktor Reihenhaus', 'Orakel Z.780'],
    ['wz_gebf_zfh', 0.95, 'Faktor', 'Gebäudefaktor Zweifamilienhaus', 'Orakel Z.780'],
    ['wz_gebf_mfh', 0.85, 'Faktor', 'Gebäudefaktor Mehrfamilienhaus', 'Orakel Z.780'],
    ['wz_unit_faktor', 10, 'kWh je m³/Liter', 'Umrechnung m³ Gas / Liter Heizöl in kWh', 'Orakel Z.781']
  ];
}

function KV_PERIODEN_ROWS_() {
  return [
    ['alt', '', '2026-07-20', 'bis 20.07.2026', 20, 30000, 'N', 70, 5, 0, '40000:30', 'J', 'Kanon Abschnitt 2 (Code.gs foerderung_ Z.157 bis 196)'],
    ['h2-2026', '2026-07-21', '2027-01-31', '21.07.2026 bis 31.01.2027', 16, 28000, 'N', 80, 0, 10000, '30000:40;40000:30;50000:10', 'J', 'Orakel Z.97, KfW 458'],
    ['h1-2027', '2027-02-01', '2027-07-31', '01.02. bis 31.07.2027', 12, 27250, 'J', 80, 0, 10000, '30000:40;40000:30;50000:10', 'N', 'Orakel Z.98'],
    ['h2-2027', '2027-08-01', '2028-01-31', '01.08.2027 bis 31.01.2028', 8, 26500, 'J', 80, 0, 10000, '30000:40;40000:30;50000:10', 'N', 'Orakel Z.99'],
    ['h1-2028', '2028-02-01', '2028-07-31', '01.02. bis 31.07.2028', 4, 25750, 'J', 80, 0, 10000, '30000:40;40000:30;50000:10', 'N', 'Orakel Z.100'],
    ['h2-2028', '2028-08-01', '2029-01-31', '01.08.2028 bis 31.01.2029', 0, 25000, 'J', 80, 0, 10000, '30000:40;40000:30;50000:10', 'N', 'Orakel Z.101'],
    ['h1-2029', '2029-02-01', '2029-07-31', '01.02. bis 31.07.2029', 0, 24250, 'J', 80, 0, 10000, '30000:40;40000:30;50000:10', 'N', 'Orakel Z.102']
  ];
}
```

## 4. Leser (Sheet → params-Objekt)

Muster wie `getAllParameters_` / `getCatalog_` (Code.gs Z.458 bis 483): Cache
zuerst, dann Sheet, dann `CACHE_TTL_SECONDS`. Der Leser baut die Struktur von
`KV_PARAMS_SEED` und ergänzt `params.schaetzung`. Damit verwenden
`kvBootstrapPayload` und `kvSchaetzeBedarf` dieselben zehn `wz_*`-Sheet-Treiber.
Fehlt der Tab, bleibt `KV_SCHAETZUNG` der geprüfte Seed-Fallback.

```javascript
function kvGetParams_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('kvparams:v1');
  if (cached) return JSON.parse(cached);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const shP = ss.getSheetByName('KV_Parameter');
  const shF = ss.getSheetByName('KV_FoerderPerioden');
  // Fällt ein Tab aus, rechnet die Engine mit dem geprüften Seed weiter,
  // statt dem Kunden einen Fehler zu zeigen. Der Seed trägt dieselben
  // gueltigAb/gueltigBis-Felder wie dieser Tab (kv_engine.gs), sonst bliebe die
  // Perioden-Automatik auf diesem Pfad dauerhaft im Alt-Regelwerk stehen
  // (Abnahme-Befund B-1, gefixt und durch das Perioden-Gate abgesichert).
  if (!shP || !shF) return KV_PARAMS_SEED;

  const kv = {};
  shP.getRange(2, 1, Math.max(shP.getLastRow() - 1, 1), 2).getValues()
    .forEach(function (r) { if (r[0]) kv[String(r[0])] = r[1]; });

  const perioden = {}, reihenfolge = [];
  shF.getRange(2, 1, Math.max(shF.getLastRow() - 1, 1), 13).getValues()
    .forEach(function (r) {
      if (!r[0]) return;
      const key = String(r[0]);
      perioden[key] = {
        label: String(r[3]),
        klima: kvNum_(r[4], 0),
        grenze: kvNum_(r[5], 0),
        eu: String(r[6]).toUpperCase() === 'J',
        cap: kvNum_(r[7], 80),
        effizienzPct: kvNum_(r[8], 0),
        kindFreibetrag: kvNum_(r[9], 0),
        einkStufen: String(r[10]).split(';').filter(String).map(function (s) {
          const p = s.split(':');
          return { maxAnr: kvNum_(p[0], 0), pct: kvNum_(p[1], 0) };
        }),
        proKlimaErlaubt: String(r[11]).toUpperCase() === 'J',
        gueltigAb: String(r[1] || ''),
        gueltigBis: String(r[2] || '')
      };
      if (key !== 'alt') reihenfolge.push(key);
    });

  const p = {
    perioden: perioden,
    periodenReihenfolge: reihenfolge,
    grundPctEu: kvNum_(kv['grund_pct_eu'], 30),
    grundPctNichtEu: kvNum_(kv['grund_pct_nicht_eu'], 15),
    proKlimaAktiv: String(kv['proklima_aktiv'] || 'N').toUpperCase() === 'J',
    proKlimaPct: kvNum_(kv['proklima_pct'], 0.05),
    proKlimaMax: kvNum_(kv['proklima_max'], 1500),
    kumCapPct: kvNum_(kv['kum_cap_pct'], 0.6),
    co2f: { gas: kvNum_(kv['co2f_gas'], 0.182), oel: kvNum_(kv['co2f_oel'], 0.266) },
    bioStufen: [
      { y: kvNum_(kv['bio_stufe_1_jahr'], 2029), p: kvNum_(kv['bio_stufe_1_anteil'], 0.15) },
      { y: kvNum_(kv['bio_stufe_2_jahr'], 2035), p: kvNum_(kv['bio_stufe_2_anteil'], 0.30) },
      { y: kvNum_(kv['bio_stufe_3_jahr'], 2040), p: kvNum_(kv['bio_stufe_3_anteil'], 0.60) }
    ],
    etaNeu: { gas: kvNum_(kv['eta_neu_gas'], 0.95), oel: kvNum_(kv['eta_neu_oel'], 0.93) },
    strommix: {
      startY: kvNum_(kv['strommix_start_jahr'], 2026), startG: kvNum_(kv['strommix_start_g'], 350),
      endY: kvNum_(kv['strommix_end_jahr'], 2040), endG: kvNum_(kv['strommix_end_g'], 100)
    },
    wartungWp: kvNum_(kv['wartung_wp'], 350),
    wartungFossil: kvNum_(kv['wartung_fossil'], 250),
    startY: kvNum_(kv['start_jahr'], 2026),
    co2ZielSchritte: kvNum_(kv['co2_ziel_schritte'], 19),
    kredLZDefault: kvNum_(kv['kred_lz_default'], 10),
    kredZinsDefault: kvNum_(kv['kred_zins_default'], 0.035),
    sensi: {
      best: { fossil: kvNum_(kv['sensi_best_fossil'], 0.015), strom: kvNum_(kv['sensi_best_strom'], -0.01) },
      base: { fossil: 0, strom: 0 },
      worst: { fossil: kvNum_(kv['sensi_worst_fossil'], -0.015), strom: kvNum_(kv['sensi_worst_strom'], 0.015) }
    },
    co2FlugT: kvNum_(kv['co2_flug_t'], 0.5),
    co2BaumKg: kvNum_(kv['co2_baum_kg'], 12.5),
    schaetzung: {
      spezVerbrauch: {
        vor1978: kvNum_(kv['wz_spez_vor1978'], 180),
        '1978-1994': kvNum_(kv['wz_spez_1978_1994'], 140),
        '1995-2010': kvNum_(kv['wz_spez_1995_2010'], 100),
        nach2010: kvNum_(kv['wz_spez_nach2010'], 60)
      },
      stufen: KV_SCHAETZUNG.stufen.slice(),
      gebaeudeFaktor: {
        efh: kvNum_(kv['wz_gebf_efh'], 1.0),
        dhh: kvNum_(kv['wz_gebf_dhh'], 0.9),
        rh: kvNum_(kv['wz_gebf_rh'], 0.85),
        zfh: kvNum_(kv['wz_gebf_zfh'], 0.95),
        mfh: kvNum_(kv['wz_gebf_mfh'], 0.85)
      },
      sanierungSprung: KV_SCHAETZUNG.sanierungSprung,
      einheitFaktor: kvNum_(kv['wz_unit_faktor'], 10),
      rundungKwh: KV_SCHAETZUNG.rundungKwh,
      bedarfMin: KV_SCHAETZUNG.bedarfMin,
      bedarfMax: KV_SCHAETZUNG.bedarfMax,
      bedarfStep: KV_SCHAETZUNG.bedarfStep,
      flaecheDefault: KV_SCHAETZUNG.flaecheDefault,
      quelle: KV_SCHAETZUNG.quelle
    }
  };
  cache.put('kvparams:v1', JSON.stringify(p), CACHE_TTL_SECONDS);
  return p;
}
```

## 5. Abnahme des Tabs (Sheet-Completion-Gate)

Nach dem Seed sind drei Kontrollwerte zu prüfen (Default-Vektor des Rechners):
Förderquote **46 %**, Zuschuss **12.880 €**, Eigenanteil **17.120 €**.
Weichen sie ab, stimmt eine Zeile in `KV_FoerderPerioden` nicht.
Der vollständige Kontrollwert-Satz steht in `tests/kv_equivalence/PROTOKOLL.md`.

## 6. Offene Punkte

- **ERLEDIGT:** Die `alt`-Zeile ist gegen den Alt-Code abgesichert. Das Gate
  `tests/foerderung_perioden/run_tests.js` prüft 33 Fälle, darunter eine Matrix
  mit 600 Kombinationen und Delta exakt 0.
- **Scope-Grenze:** Kanon 2 kennt eine Wohneinheiten-Staffel (30.000 / 15.000 / 8.000)
  und einen Deckel 35 % für vermietete Einheiten. Der Rechner hat keine
  WE-Eingabe; der Port modelliert den selbstgenutzten Einzelfall. Entscheidung
  des Controllers nötig (Empfehlung: Beschränkung auf selbstgenutztes EZFH
  belassen und in der Annahmen-Box benennen).
