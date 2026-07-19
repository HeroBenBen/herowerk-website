---
type: reference
tldr: "API-Contract des serverseitigen Kostenvergleichs (ADR-04 Lane B): Request-Parameter action=kostenvergleich, Response-Payload (alle calculate()-Ausgaben strukturiert), kv_bootstrap-Payload für den Thin-Client und Lead-Contract hero_kv_lead ohne PII."
datum: 2026-07-15
quelle: "Orakel WP_Rechner_HeroWerk.html, Script-SHA 55344fe56a7043ffed5eec352eeeee0717d34ddebd34d57ecef0e7c88f61b9f3 (kanonische rfind-Extraktion, PASS gemessen in dieser Session)"
status: Lane-B-Deliverable B2, Umsetzung durch kv_engine.gs (B3) + Lane C (Wiring)
---

# KV-Contract — Kostenvergleichs-Engine serverseitig (ADR-04)

Alle Feldnamen sind verbindlich für `kv_engine.gs` (Lane B), das Code.gs-Wiring (Lane C)
und den Thin-Client `kostenvergleich-waermepumpe.html` (Schritt B7).
Zahlen im Response sind **ungerundete Engine-Werte** (Rundungs-Pfad des Orakels:
Engine rundet NICHT, Anzeige-Formatierung inkl. `Math.round`/`toLocaleString` bleibt Client).
Ausnahmen (im Orakel selbst gerundet) sind je Feld markiert mit `[gerundet: …]`.

## 1. Request `action=kostenvergleich`

`GET …/exec?action=kostenvergleich&origin=…&<Parameter>`. Alle Parameter als Strings
(Apps-Script-Query); Wiring castet nach Spalte "Typ". Fehlende Parameter → Default
(= Orakel-HTML-Startwert). Checkbox-Parameter: `1|true|ja` = an, alles andere = aus.

### 1.1 Modus & Periode

| Parameter | Typ | Default | Wertebereich / Bedeutung |
|---|---|---|---|
| `modus` | enum | `kunde` | `kunde` \| `berater` — reines Echo (Rechenkern identisch), steuert Client-Layout |
| `fHalbjahr` | enum | `h2-2026` | `alt` \| `h2-2026` \| `h1-2027` \| `h2-2027` \| `h1-2028` \| `h2-2028` \| `h1-2029`. `alt` = Alt-Regelwerk für Anträge bis 20.07.2026 (Kanon Abschnitt 2, Perioden-Automatik Lane C). Die 6 Reform-Perioden sind orakel-äquivalent geprüft. |

### 1.2 System (Wizard Schritt 1 + Berater-Tab System)

| Parameter | Typ | Default | Bedeutung |
|---|---|---|---|
| `heizart` | enum | `gas` | Bestands-Heizungsart `gas` \| `oel` |
| `bedarf` | number | `20000` | Brennstoff-Jahresverbrauch in **kWh** (5000–80000, Schritt 500). Einheiten-Umrechnung (m³/Liter × 10) macht der Client VOR dem Request (siehe 3.4); der Server rechnet nur kWh. |
| `eta` | number | `85` | Kessel-Nutzungsgrad in Prozent (65–98). Defaults je Kessel-Karten-Antwort siehe Bootstrap `etaMatrix`. |
| `invWP` | number | `30000` | WP-Investition brutto € (8000–65000) |
| `jaz` | number | `3.8` | Jahresarbeitszahl (2.5–5.0) |
| `laufzeit` | int | `20` | Betrachtungszeitraum Jahre (5–25) |

### 1.3 Vergleich (Wizard Schritt 2)

| Parameter | Typ | Default | Bedeutung |
|---|---|---|---|
| `neuFossilTog` | bool | `1` | Vergleich gegen NEUE fossile Anlage (3-Wege-Vergleich aktiv) |
| `vglBrennstoff` | enum | `gas` | Vergleichs-Brennstoff `gas` \| `oel` (wirkt nur bei `neuFossilTog=1`, sonst zählt `heizart`) |
| `gasInvest` | number | `12000` | Invest neue Gasheizung € (6000–20000) |
| `oelInvest` | number | `16000` | Invest neue Ölheizung € (9000–28000) |

### 1.4 Energie & Preise (Berater-Tab Energie)

| Parameter | Typ | Default | Bedeutung |
|---|---|---|---|
| `gaspreis` | number | `12` | ct/kWh (6–20) |
| `gasStg` | number | `2.5` | %/Jahr Steigerung (Optionen 1.5/2.5/4.0) |
| `oelpreis` | number | `11` | ct/kWh (6–20) |
| `oelStg` | number | `2.5` | %/Jahr (1.5/2.5/4.0) |
| `strompreis` | number | `32` | ct/kWh (20–45) |
| `stromEntw` | number | `1.5` | %/Jahr (-0.5/1.5/3.0) |
| `co2preis` | number | `55` | €/t heute (25–80) |
| `co2Pfad` | number | `250` | €/t Ziel 2045 (150/250/300) |
| `bioTog` | bool | `1` | Bio-Beimischungs-Treppe (GEG §71(9)) einrechnen |
| `bioAufpreis` | number | `2.5` | Bio-Aufpreisfaktor × fossil (2.0/2.5/3.0) |

### 1.5 Förderung (Wizard Schritt 3 + Berater-Tab Förderung)

| Parameter | Typ | Default | Bedeutung |
|---|---|---|---|
| `fGrund` | bool | `1` | Grundförderung an |
| `fEU` | bool | `1` | Gerät mit EU-Wertschöpfung (ab 2027 relevant: sonst 15 statt 30 %) |
| `fKlima` | bool | `1` | Klimageschwindigkeitsbonus beantragt |
| `fAlt20` | bool | `1` | Klimabonus-Voraussetzung erfüllt (Öl/Kohle/Gasetagen/Nachtspeicher funktionsfähig ODER Gas/Biomasse ≥ 20 J.) |
| `fEinkSlider` | number | `60000` | zu versteuerndes Haushaltseinkommen € (15000–120000) |
| `fKind` | bool | `0` | mind. ein minderjähriges Kind (einmalig −10.000 € anrechenbar) |
| `fEffizienz` | bool | `0` | NUR Alt-Periode: R290-Effizienzbonus-Flag. In allen Reform-Perioden wirkungslos (`effizienz_pct=0`). Engine-Erweiterung für die Perioden-Automatik, ohne Orakel-Entsprechung. |

### 1.6 Finanzierung & Extras (Wizard Schritt 4 + Berater-Tab)

| Parameter | Typ | Default | Bedeutung |
|---|---|---|---|
| `finanzTog` | bool | `0` | Finanzierungs-Vergleich an |
| `kredLZ` | int | `10` | Kredit-Laufzeit Jahre (5–20) |
| `kredZins` | number | `0.7` | Zins % nominal (0.5–6.0). Bei `finanzTog=0` intern 3.5 (Orakel-Default) |
| `immoTog` | bool | `0` | Immobilienwert-Block an |
| `hausW` | number | `350000` | Hauswert € (100000–800000) |
| `immoP` | number | `7` | Wertsteigerung % (3–15) |
| `dynTarifTog` | bool | `0` | dynamischer Stromtarif an |
| `dynAnteil` | number | `40` | % WP-Strom im Niedrigtarif (20–60) |
| `dynSpread` | number | `10` | ct/kWh Spread (5–20) |

## 2. Response `action=kostenvergleich`

**Diese Struktur ist die IMPLEMENTIERTE und äquivalenz-bewiesene** (`kv_engine.gs`,
Gate-Protokoll `tests/kv_equivalence/PROTOKOLL.md`: 858/858 Vektoren, Delta 0).
Sie ersetzt den unratifizierten Entwurfs-Vorschlag der Vorgänger-Runde
(`engine.*`/`chartSerien`/`kpis[]`-Schema), der nie gegen das Orakel lief.

Zahlen sind **ungerundete Engine-Werte**. Wo das Orakel selbst rundet, ist das
Feld mit `[gerundet]` markiert und der ungerundete Partner steht daneben.

```jsonc
{
  "service": "kostenvergleich",
  "inputsEcho": { /* alle normalisierten Inputs aus Abschnitt 1, inkl. modus */ },
  "periodeAutomatik": false,       // true = Server hat fHalbjahr gesetzt (Lane C)

  "foerder": {                     // kvFoerder() der gewählten Periode
    "periode": "h2-2026",
    "label": "21.07.2026 bis 31.01.2027",
    "euDifferenzierung": false,     // serverseitige Periodeneigenschaft; alt und h2-2026 = false
    "grundPct": 30,                // 30 (EU/ohne EU-Differenzierung) | 15 (nicht-EU ab 2027)
    "grund": 30,                   // wirksam (0 wenn fGrund aus)
    "klimaPct": 16,                // Perioden-Klimabonus (Anzeige-Wert)
    "klima": 16,                   // wirksam (0 wenn fKlima aus ODER fAlt20 aus)
    "einkommen": 0,                // Einkommensbonus-Prozent (Staffel je Periode)
    "effizienz": 0,                // R290-Effizienzbonus, nur Alt-Periode ≠ 0
    "zvE": 60000,
    "anrechenbar": 60000,          // zvE − kindFreibetrag (wenn fKind)
    "summe": 46,                   // grund + klima + einkommen + effizienz
    "quote": 46,                   // min(summe, cap)
    "cap": 80,                     // Deckel der Periode (Alt: 70)
    "gekappt": false,              // summe > cap → Anzeige "(gekappt)"
    "grenze": 28000,               // Bemessungsgrenze der Periode
    "basis": 28000,                // min(invWP, grenze)
    "betrag": 12880.0,             // basis*quote/100 — ENGINE, NICHT gerundet
    "anzeigeBetrag": 12880,        // [gerundet] Math.round(basis*quote/100) — Förderbox
    "netto": 17120,                // invWP − anzeigeBetrag (Anzeige-Pfad)
    "proKlima": 0,                 // INTERN: Äquivalenzfeld, nie kundensichtbar; produktiv global aus
    "proKlimaErlaubt": true,       // INTERN: Orakel-/Periodenreferenz, kein Client-Opt-in
    "proKlimaOptIn": false,        // INTERN: produktives Mapping erzwingt false
    "proKlimaEffektiv": 0,         // INTERN: Äquivalenzfeld nach 60-Prozent-Deckel
    "liveZuschuss": 12880,         // [gerundet] Live-Kachel: max(betrag, min(betrag+pk, round(0.6*invWP)))
    "liveEigenanteil": 17120,      // invWP − liveZuschuss
    "kumCap": 18000.0,             // 0.6*invWP — ENGINE, ungerundet
    "totalFoerderung": 12880.0,    // ungerundet, fließt in invest.netto
    "treppe": [                    // Degressions-Treppe: Quote je REFORM-Periode
      { "periode": "h2-2026", "quote": 46, "label": "21.07.2026 bis 31.01.2027" }
    ],
    // NUR für den Lead (Abschnitt 4). NICHT anzeigen.
    "quoteOhneEinkommen": 46,
    "zuschussOhneEinkommen": 12880,
    "eigenanteilOhneEinkommen": 17120
  },

  "invest": {
    "brutto": 30000, "netto": 17120.0,        // max(0, invWP − totalFoerderung)
    "fossilInvest": 12000,                    // gasInvest|oelInvest je vglFuel
    "mehrInvest": 5120.0,                     // netto − fossilInvest
    "investDelta": 5120.0,                    // neuFossilOn ? mehrInvest : netto
    "gasInvest": 12000, "oelInvest": 16000
  },

  "system": {
    "vglFuel": "gas", "heizart": "gas",
    "heizLabel": "Gas",                       // Label des VERGLEICHS-Brennstoffs
    "heizLabelBestand": "Gas",                // Label der BESTANDS-Heizung
    "wpStrom": 4473.68,                       // bedarf*eta/jaz
    "fossilVerbrauch": 17894.7,               // neuFossilOn ? bedarf*eta/etaNeu[vglFuel] : bedarf
    "nutzwaerme": 17000.0, "etaProzent": 85, "jaz": 3.8, "laufzeit": 20,
    "neuFossilOn": true, "bioOn": true, "bioFak": 2.5
  },

  "ergebnis": {
    "cumSav": 50509.0,                        // Summe Ersparnis über die Laufzeit
    "wpNG": 45389.0,                          // Vorteil bar = cumSav − investDelta
    "wpNGFinanziert": 45389.0,                // wpNG − zinsDelta
    "breakEven": 4,                           // Jahr, null wenn nicht in Laufzeit
    "breakEvenSofort": false,                 // neuFossilOn && investDelta <= 0
    "totFossil": 0.0, "totWPK": 40103.0, "totMehr": 0.0,
    "sparProJahr": 2525.45
  },

  "dreiWege": {                               // aktiv nur bei neuFossilOn
    "aktiv": true,
    "oel": { "invest": 16000, "betrieb": 87196.0, "gesamt": 103196.0 },
    "gas": { "invest": 12000, "betrieb": 90612.0, "gesamt": 102612.0 },
    "wp":  { "invest": 17120.0, "betrieb": 40103.0, "gesamt": 57223.0 },
    "bestFossil": 102612.0, "vorteil": 45389.0  // bestFossil − wp.gesamt
  },

  "finanzierung": {
    "aktiv": false,
    "kreditBetrag": 17120.0, "kredLZ": 10, "kredZinsProzent": 3.5, "kredN": 120,
    // ACHTUNG: bei aktiv=false erzwingt das Orakel kredLZ=10 und kredZins=3.5 %,
    // die Slider-Werte werden ignoriert (Orakel Z.178 bis 179).
    "monRate": 0.0, "monRateFossil": 0.0,
    "monWPStrom": 0.0, "monFossil": 0.0, "monGesWP": 0.0, "monDiff": 0.0,
    "wpMon": 0.0, "fossMon": 0.0, "monVorteil": 0.0,   // monVorteil = fossMon − wpMon (dCf)
    "zinsKosten": 0.0, "zinsFossil": 0.0, "zinsDelta": 0.0,
    "gesamtkostenKredit": 0.0,
    "endJahrIndex": 9,                        // min(kredLZ, laufzeit) − 1
    "endWpMon": 0.0, "endFossilMon": 0.0      // Betriebskosten/Monat am Kreditende
  },

  "immo": { "aktiv": false, "hausWert": 0, "prozent": 0, "wertzuwachs": 0 },  // wertzuwachs [gerundet]

  "dynTarif": { "aktiv": false, "anteil": 0, "spread": 0, "ersparnisProJahr": 0 },  // [gerundet]

  "co2": {
    "gesamt": 28.3,                           // [gerundet: 1 Dezimale] Strommix-Bilanz
    "oeko": 45.6,                             // [gerundet: 1 Dezimale]
    "proJahr": 1.4,                           // [gerundet: 1 Dezimale]
    "fluege": 57, "baeume": 2264,             // [gerundet]
    "faktor": 0.182, "tonnenProJahr": 3.256
  },

  "sensi": {
    "best": 63693.0, "basis": 45389.0, "worst": 27464.0,   // wpNG je Szenario, ungerundet
    "bestFossilStg": 4.0, "bestStromStg": 0.5,             // Prozent/Jahr für die Fußnote
    "worstFossilStg": 1.0, "worstStromStg": 3.0
  },

  "annahmen": {                               // Annahmen-Box: Zahlen, Client baut den Text
    "bedarf": 20000, "fossilP0": 12, "fossilStgProzent": 2.5,
    "stromP0": 32, "stromEProzent": 1.5, "co2P0": 55, "co2Ziel": 250,
    "etaNeuGas": 95, "etaNeuOel": 93, "wartungWp": 350, "wartungFossil": 250
  },

  "jahre": [                                  // je Jahr 1..laufzeit, ALLE Felder ungerundet
    { "j": 1, "cY": 2026, "fossilBP": 12.0, "fossilEP": 12.0, "bioP": 0,
      "fossilK": 2147.36, "co2St": 0.0, "fossilW": 250, "fossilG": 2397.36,
      "wpStromK": 1431.58, "pvSav": 0, "dynSav": 0, "wpW": 350, "wpGes": 1781.58,
      "mehrK": 615.78, "cumMehr": 615.78, "jSav": 615.78, "cumSav": 615.78,
      "cumFossil": 2397.36, "cumWPKosten": 1781.58 }
  ],

  "charts": {                                 // exakt die Chart.js-Serien des Orakels
    "labels": ["2026", "..."],
    "vermoegen": [ /* [gerundet] round(cumSav − investDelta) */ ],
    "nullLinie": [ /* 0 je Jahr */ ],
    "sparEnergieCo2": [ /* UNGERUNDET: fossilVerbrauch*fossilBP/100 + co2St − wpStromK */ ],
    "sparDyn": [ /* UNGERUNDET: dynSav */ ],
    "bioAufschlag": [ /* UNGERUNDET: fossilK − fossilVerbrauch*fossilBP/100 */ ],
    "wartungDelta": [ /* UNGERUNDET: −(wpW − fossilW) */ ],
    "heizFossil": [ /* [gerundet] round(fossilG) */ ],
    "heizWp": [ /* [gerundet] round(wpGes) */ ],
    "heizDiff": [ /* [gerundet] round(mehrK) */ ]
  }
}
```

### 2.1 Render-Regeln, die der Client einhalten MUSS

Die Reihenfolge und die Bedingungen der Anzeige gehören zum Vertrag, weil der
Äquivalenz-Beweis über die angezeigten Zahlen läuft. Verbindliche Vorlage:
`tests/kv_equivalence/view_adapter.js` (das ist genau der Renderer, gegen den
das Orakel geprüft wurde).

| Fläche | Regel |
|---|---|
| Chart 2 (`cBreak`) | Serien-Reihenfolge `sparEnergieCo2, sparDyn, bioAufschlag, wartungDelta`; dann `if(!bioOn) splice(2,1)`, DANACH `if(!dynTarifOn) splice(1,1)`. Reihenfolge der Splices ist nicht vertauschbar. |
| KPI-Karten | `anschaffung`, [`mehrpreis` nur bei `neuFossilOn`], `ausgeglichen`, `einsparung`, `co2`, [`monatlich` nur bei `finanzierung.aktiv`, Variante je `neuFossilOn`], [`immo`], [`dynTarif`] |
| Mehrpreis-Darstellung | `mehrInvest > 0` → `eur(v)`, sonst `'−' + eur(|v|)` (U+2212, kein ASCII-Minus) |
| Monats-Vorteil | Vorzeichen-Präfix `+`/`−` und Absolutbetrag, NICHT der rohe negative Wert |
| `dreiWegeBox` / `cashflowBox` / `immoBox` | `display:none`, wenn der jeweilige Schalter aus ist |
| €-Anzeige | `Math.round(v).toLocaleString('de-DE') + ' €'` |
| Prozent/1-Dezimal-Anzeige | `v.toFixed(1).replace('.', ',')` |

### 2.2 Bewusst NICHT portiert

`pvOn` und `batOn` sind im Orakel hart `false` (Z.169 bis 170). Der gesamte
PV-/Speicher-Pfad (`pvInvest`, `pvErtrag`, `eigenQ`, `batBoost`, `einspV`,
`pvFoerd`, `pkPV`, `pkBat`) ist damit toter Code und wurde NICHT mitportiert.
Die Response enthält `jahre[].pvSav: 0` nur, damit die Jahresreihe formgleich
zum Orakel bleibt. Kommt PV zurück, ist das eine neue Fach-Entscheidung, kein
Port-Thema.

### 2.3 Hero-Rechnung (`updateHero`, Orakel Z.1127 bis 1177) — Client-Regel

`updateHero` hat **keine eigene Rechenlogik**: es liest die bereits gerenderten
DOM-Werte zurück (`findPathValue`, `findKpiValue`, `findDreiWegeTotal`) und
kombiniert sie. Der Thin-Client baut beide Zweige direkt aus der Response,
statt Text zurückzuparsen:

| Zweig | Bedingung | Rechnung |
|---|---|---|
| A "Vergleich" | `neuFossilOn` und beide TCO vorhanden | Zeile 1 `dreiWege.<vglFuel>.gesamt`; Zeile 2 `dreiWege.<vglFuel>.gesamt − ergebnis.wpNG`; Summe `ergebnis.wpNG` |
| B "Weiterbetrieb" | `!neuFossilOn` | Zeile 1 `wpNG + invest.netto + wpBetrieb`; Zeile 2 `wpBetrieb = ergebnis.totWPK`; Zeile 3 `invest.netto`; Summe `ergebnis.wpNG` |

**Achtung Alt-Semantik:** Das Orakel liest die Zahlen mit
`pf(t) = parseInt(t.replace(/[^0-9]/g,''), 10)` zurück. Das verschluckt
Vorzeichen (aus `−5.120 €` wird `5120`). Der Client rechnet stattdessen mit den
echten Zahlen der Response. Das ist eine **absichtliche Abweichung vom Orakel**
und der einzige Punkt, an dem der Port bewusst "besser" ist als die Vorlage.
Sie betrifft nur den Erklärtext des Hero-Blocks, keine Kennzahl.
→ Vom Controller zu bestätigen (BLOCKED-4 im Lane-B-Protokoll).

Satz unter der Hero-Zahl (`satz`, Orakel Z.1171 bis 1175):
`!neuFossilOn` → "Weiterbetrieb"-Satz · `mehrInvest ≤ 0` oder `breakEvenSofort`
→ "günstiger"-Satz · `breakEven` und `mehrInvest > 0` → "Mehrpreis nach N Jahren
drin" · sonst → "Mehrpreis"-Satz.

## 3. Response `action=kv_bootstrap`

Der folgende Contract entspricht der implementierten Funktion
`kvBootstrapPayload` in `kv_engine.gs`. Er ersetzt das frühere Entwurfs-Schema
mit `controls`, `altPeriode`, `wizard` und `anzeigeKonstanten`; diese Felder
existieren in der realen Payload nicht.

```jsonc
{
  "service": "kv_bootstrap",
  "aktivePeriode": "alt",             // ergänzt durch kvBootstrap_ im Wiring
  "perioden": [
    {
      "key": "h2-2026",
      "label": "21.07.2026 bis 31.01.2027",
      "klimaPct": 16,
      "grenze": 28000,
      "euDifferenzierung": false,
      "cap": 80
    }
  ],
  "defaults": {
    "heizart": "gas", "bedarf": 20000, "eta": 85,
    "invWP": 30000, "jaz": 3.8, "laufzeit": 20,
    "neuFossilTog": true, "vglBrennstoff": "gas",
    "gasInvest": 12000, "oelInvest": 16000,
    "gaspreis": 12, "gasStg": 2.5, "oelpreis": 11, "oelStg": 2.5,
    "strompreis": 32, "stromEntw": 1.5, "co2preis": 55, "co2Pfad": 250,
    "bioTog": true, "bioAufpreis": 2.5,
    "fHalbjahr": "h2-2026", "fGrund": true, "fEU": true,
    "fKlima": true, "fAlt20": true, "fEinkSlider": 60000,
    "fKind": false, "fEffizienz": false,
    "finanzTog": false, "kredLZ": 10, "kredZins": 0.7,
    "immoTog": false, "hausW": 350000, "immoP": 7,
    "dynTarifTog": false, "dynAnteil": 40, "dynSpread": 10,
    "modus": "kunde"
  },
  "etaMatrix": {
    "fallback": { "wert": 85, "label": null, "text": "..." },
    "regeln": [
      { "rohr": "unklar", "kbj": null, "heizart": null, "wert": 85, "label": null },
      { "rohr": "metall", "kbj": "vor1990", "heizart": null, "wert": 70, "label": "..." },
      { "rohr": "metall", "kbj": "*", "heizart": null, "wert": 80, "label": "..." },
      { "rohr": "kunststoff", "kbj": "nach2010", "heizart": null, "wert": 93, "label": "..." },
      { "rohr": "kunststoff", "kbj": "*", "heizart": "gas", "wert": 86, "label": "..." },
      { "rohr": "kunststoff", "kbj": "*", "heizart": "oel", "wert": 90, "label": "..." }
    ],
    "quelle": "...", "textVorbelegt": "...", "textEigen": "..."
  },
  "schaetzung": {
    "spezVerbrauch": { "vor1978": 180, "1978-1994": 140, "1995-2010": 100, "nach2010": 60 },
    "stufen": ["vor1978", "1978-1994", "1995-2010", "nach2010"],
    "gebaeudeFaktor": { "efh": 1.0, "dhh": 0.9, "rh": 0.85, "zfh": 0.95, "mfh": 0.85 },
    "sanierungSprung": { "nein": 0, "teilweise": 1, "umfassend": 2 },
    "einheitFaktor": 10, "rundungKwh": 500,
    "bedarfMin": 5000, "bedarfMax": 80000, "bedarfStep": 500,
    "flaecheDefault": 140, "quelle": "..."
  },
  "hinweise": {
    "kappung": "Mehr als 80 Prozent Zuschuss gibt es nicht.",
    "unverbindlich": "Unverbindliche Berechnung, ohne Gewähr."
  }
}
```

`aktivePeriode` kann vor dem Reform-Stichtag `alt` sein, obwohl `perioden` nur
die sechs Reform-Zeilen der Treppe enthält. Der Client ergänzt dann eine
temporäre Select-Option für den aktuell gültigen Zeitraum und verwendet ihren
Schlüssel unverändert im `kostenvergleich`-Request. Nach der ersten Rechnung
ersetzt er das neutrale Label mit `foerder.label` aus dem Server-Response.

**Öffentliche proKlima-Grenze:** `perioden[].proKlimaErlaubt`,
`defaults.proklimaTog` und `hinweise.proKlima` werden bewusst nicht ausgeliefert.
Die gleichnamige Engine-Fähigkeit bleibt intern für das Äquivalenz-Gate erhalten.

### 3.1 Verbrauchsschätzung ohne Client-Heuristik

Es gibt keine dritte öffentliche Route. Der Thin-Client ruft
`action=kostenvergleich` mit `bedarfModus=schaetzung` sowie `geb`, `bj`, `san`
und `flaeche` auf. Das O5-Wiring validiert die vier Felder, ruft
`kvSchaetzeBedarf` auf und überschreibt `inputs.bedarf` vor `kvCalculate`.
Der normale Kostenvergleich-Response liefert den Wert in
`inputsEcho.bedarf`. Ohne `bedarfModus=schaetzung` gewinnt die direkte
`bedarf`-Eingabe. Damit stehen im ausgelieferten HTML keine Schätzkonstanten
oder Schätzformeln.

## 4. Lead-Contract `hero_kv_lead` (sessionStorage beim CTA-Klick)

Der Thin-Client schreibt beim Klick auf "Individuelles Angebot anfragen" EIN JSON-Objekt
unter dem sessionStorage-Key `hero_kv_lead`; `anfrage.html` liest es zur Vorbefüllung.
Es verlässt den Browser nicht (kein Request, kein Server-Log).

```jsonc
{
  "v": 1,
  "quelle": "kostenvergleich-waermepumpe",
  "zeitpunkt": null,                 // optional ISO-Datum, vom Client gesetzt
  "heizungsart": "gas",              // gas | oel
  "verbrauch": { "kwh": 20000, "eingabeWert": 2000, "einheit": "m3", "herkunft": "own" },  // herkunft: own | market (Schätzung)
  "gebaeude": { "geb": "efh", "bj": "1978-1994", "san": "teilweise", "flaeche": 140 },     // nur wenn Schätzstrecke genutzt, sonst null
  "kessel": { "rohr": "kunststoff", "kbj": "nach2010", "altgas": "ja" },
  "zeitraum": "h2-2026",
  "ergebnis": { "eigenanteil": 15620, "vorteil": 24500, "zuschuss": 14380, "quote": 46 }
}
```

**EXPLIZIT VERBOTEN im Lead-Objekt (hart, Review-Kriterium für B7 und Lane C):**
- `fEinkSlider` / zvE / anrechenbares Einkommen in jeder Form
- `fKind` / Kinder-Information
- Einkommensbonus-Prozentsatz oder jede Zahl, aus der sich die Einkommensklasse ableiten lässt
- proKlima-Einkommensdaten
- jede PII (Name, Adresse, Mail, Telefon, IP, PLZ)

### 4.1 Warum die Ergebnis-Zahlen OHNE Einkommensbonus in den Lead gehen

Ein Lead mit `quote: 76` verrät die Einkommensklasse: wer Grund- und Klimabonus
der Periode kennt (beide stehen offen im Bootstrap), rechnet den Einkommensbonus
und damit das Haushaltseinkommen zurück. Das Einkommen wäre dann faktisch doch im
Lead, nur verschleiert. Deshalb schreibt der Client die drei Ergebnis-Zahlen aus
den Feldern

- `foerder.quoteOhneEinkommen`
- `foerder.zuschussOhneEinkommen`
- `foerder.eigenanteilOhneEinkommen`

und NICHT aus `foerder.quote` / `liveZuschuss` / `liveEigenanteil`.
Die Engine liefert beide Sätze, der Client wählt. Wer den Einkommensbonus
geltend machen will, bespricht ihn "diskret im persönlichen Gespräch"
(Orakel-Wortlaut, Z.1064).

**Folge, die der Controller kennen muss:** Die Zahl im Lead kann niedriger sein
als die Zahl, die der Kunde auf dem Bildschirm gesehen hat. Der Vertrieb darf
den Lead-Eigenanteil deshalb nicht als "Kunde hat X gesehen" lesen.
→ Alternative wäre, `vorteil`/`eigenanteil` ganz aus dem Lead zu nehmen und nur
die technischen Daten zu übergeben. Entscheidung des Controllers
(BLOCKED-5 im Lane-B-Protokoll).

### 4.2 Transportweg

`sessionStorage`, gleiche Origin, kein Request. **Keine Lead-Daten in URLs**
(kein Query-Parameter, kein Fragment): URLs landen in Browser-History,
Referer-Headern und Server-Logs. Der Rechner sendet die Eingaben des Kunden
ohnehin nur als Rechen-Request an das Backend; der Lead selbst verlässt den
Browser erst, wenn der Kunde das Anfrage-Formular absendet.

## 5. Rundungs-Vertrag (Kanon Abschnitt 1.2, Pflicht)

Der Kanon ist hier eindeutig und der Äquivalenz-Beweis hängt daran: Die
**Förderrechner-ANZEIGE rundet** den Zuschuss (`Math.round`), die
**Kostenvergleichs-ENGINE rundet NICHT** (`fBetrag = fBasis*fq`). Beide Pfade
existieren nebeneinander im Payload, damit der Client nicht raten muss.

| Pfad | Rundung | Contract-Feld |
|---|---|---|
| Kostenvergleichs-Engine | KEINE (`basis*quote/100` roh, fließt in `totalFoerderung`/`invest.netto`) | `foerder.betrag`, `foerder.totalFoerderung`, `invest.netto` |
| Förderrechner-Anzeige | `Math.round(basis*quote/100)` | `foerder.anzeigeBetrag`, `foerder.netto` |
| proKlima-Betrag | `min(Math.round(0.05*invWP), 1500)` — in BEIDEN Pfaden gerundet | `foerder.proKlima` |
| Kumulierungs-Deckel Engine | `0.6*invWP` UNGERUNDET | `foerder.kumCap` |
| Kumulierungs-Deckel Live-Kachel | `Math.round(0.6*invWP)` GERUNDET (Orakel `renderLiveFoerder` Z.1018) | `foerder.liveZuschuss` |
| Immobilien-Wertzuwachs | `Math.round(hausW*immoP)` | `immo.wertzuwachs` |
| CO₂-Summen | `Math.round(v*10)/10` (1 Dezimale) | `co2.gesamt`, `co2.oeko`, `co2.proJahr` |
| Flüge / Bäume | `Math.round` | `co2.fluege`, `co2.baeume` |
| Dyn.-Tarif-Ersparnis | `Math.round` | `dynTarif.ersparnisProJahr` |
| Chart 1 / Chart 3 | `Math.round` je Punkt | `charts.vermoegen`, `charts.heizFossil`, `charts.heizWp`, `charts.heizDiff` |
| Chart 2 | KEINE (roh) | `charts.sparEnergieCo2`, `sparDyn`, `bioAufschlag`, `wartungDelta` |
| Alle €-Anzeigen | Client: `Math.round(v).toLocaleString('de-DE') + ' €'` | — |

Dass `foerder.betrag` (12880.0, roh) und `foerder.anzeigeBetrag` (12880,
gerundet) beim Default-Vektor gleich aussehen, ist Zufall der Zahlen
(28.000 × 0,46 ist ganzzahlig). Bei `invWP = 27.500` und Quote 46 laufen die
Pfade auseinander. Genau dafür sind beide Felder da.

## 6. Status und Herkunft dieses Contracts

| Punkt | Stand |
|---|---|
| Abschnitt 1 (Request) | Defaults maschinell gegen die Orakel-HTML-Startwerte verifiziert (Regler `min`/`max`/`step`, `selected`-Option). |
| Abschnitt 2 (Response) | Beschreibt die implementierte, äquivalenz-bewiesene Struktur (858/858, Delta 0). Ersetzt den Entwurfs-Vorschlag der Vorgänger-Runde. |
| Abschnitt 3 (Bootstrap) | Aus dem Entwurf übernommen und gegen das B1-Inventar geprüft; `aktivePeriode` ergänzt (Perioden-Automatik). |
| Abschnitt 4 (Lead) | Aus dem Entwurf übernommen, Begründung und Transportweg ergänzt. |
| Abschnitt 5 (Rundung) | Auf die implementierten Feldnamen umgestellt, um die im Orakel gerundeten Stellen vollständig erweitert. |

**Korrekturen am geerbten Entwurf** (`abgebrochene_lanes/kv_contract_fable-abbruch.md`,
411 Zeilen, unratifiziert, ohne Protokoll):

1. Response-Schema komplett ersetzt: der Entwurf beschrieb ein `engine.*`/`chartSerien`/
   `kpis[]`-Schema, das nie gegen das Orakel lief. Die implementierte Struktur ist
   flacher und trägt beide Rundungs-Pfade nebeneinander.
2. `foerderTreppe` ist jetzt Teil von `foerder.treppe` und **äquivalenz-geprüft**
   (der Entwurf listete sie ohne Beweis; ein gezielter Mutationstest belegt, dass
   die Treppe eigene Abdeckung hat).
3. `fEffizienz` bleibt, aber mit klarer Ansage: in allen Reform-Perioden wirkungslos.
4. Lead: die drei `*OhneEinkommen`-Felder sind neu in der Engine. Ohne sie müsste
   der Client den Einkommensbonus selbst herausrechnen — das wäre Rechenlogik im
   Client und damit ein ADR-04-Verstoß.
5. `defaultPeriode` → `aktivePeriode` (der Server setzt sie datumsabhängig, sie ist
   kein statischer Default).
6. Ergänzt: Abschnitt 2.1 (Render-Regeln), 2.2 (PV/Speicher bewusst nicht portiert),
   2.3 (Hero-Zweige inkl. der `pf()`-Alt-Semantik).
