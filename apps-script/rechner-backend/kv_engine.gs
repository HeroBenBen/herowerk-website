/**
 * kv_engine.gs — Kostenvergleichs-Engine (ADR-04, Lane B)
 *
 * Reiner Rechenkern, portiert aus dem eingefrorenen Orakel
 * 04_Marketing_Vertrieb/Website/WP_Rechner_HeroWerk.html
 * Script-Block-SHA256 (kanonische rfind-Extraktion, utf-8):
 *   55344fe56a7043ffed5eec352eeeee0717d34ddebd34d57ecef0e7c88f61b9f3
 *
 * Regeln dieses Moduls:
 *  - KEIN DOM, KEIN new Date(): die Periode kommt als Eingabe (inputs.fHalbjahr).
 *    Die Perioden-AUSWAHL steht als reine Funktion kvPeriodeFuerDatum hier im
 *    Modul (Datum als Argument, testbar). Nur das LESEN der Server-Zeit liegt im
 *    Wrapper kvPeriodeHeute_ (kv_routes_wiring_spec.md 4, Lane C).
 *  - Apps-Script-V8-kompatibel (kein optional chaining, kein Spread in Objekten).
 *  - Alle Zahlen sind ungerundete Engine-Werte, AUSSER den Stellen, an denen das
 *    Orakel selbst rundet. Diese sind einzeln kommentiert mit "[Orakel rundet]".
 *  - Parameter kommen aus params (Spiegel der Sheet-Tabs KV_Parameter /
 *    KV_FoerderPerioden, siehe kv_sheet_spec.md). KV_PARAMS_SEED = Orakel-Werte.
 *
 * Orakel-Zeilenangaben in den Kommentaren beziehen sich auf den extrahierten
 * Script-Block (Zeile 1 = "<script>").
 */

/* ===================== PARAMETER-SEED (= Sheet KV_Parameter) ===================== */

var KV_PARAMS_SEED = {
  // --- Perioden (= Sheet KV_FoerderPerioden). Orakel Z.96 bis 103 (FOERDER_HJ)
  //     plus Alt-Zeile aus Kanon Abschnitt 2 (Anträge bis 20.07.2026).
  //     gueltigAb/gueltigBis (ISO) tragen die Perioden-Automatik und sind
  //     zeilengleich mit dem Sheet-Tab KV_FoerderPerioden (kv_sheet_spec.md 2).
  //     Sie MUESSEN hier stehen: der Seed ist der Fallback, wenn ein Tab fehlt
  //     (kv_sheet_spec.md 4). Ohne sie bliebe die Engine ewig im Alt-Regelwerk.
  perioden: {
    // Alt-Regelwerk, Anträge bis 20.07.2026. Quelle: Kanon Abschnitt 2
    // (verifiziert gegen Code.gs origin/main 95c0e91, foerderung_ Z.157 bis 196).
    // NICHT orakel-äquivalenz-geprüft (das Orakel kennt keine Alt-Periode).
    // Modelliert den selbstgenutzten Einzelfall (erste Wohneinheit).
    'alt': {
      label: 'bis 20.07.2026',
      gueltigAb: '', gueltigBis: '2026-07-20',
      klima: 20,
      grenze: 30000,
      eu: false,
      cap: 70,
      effizienzPct: 5,
      kindFreibetrag: 0,
      einkStufen: [{ maxAnr: 40000, pct: 30 }],
      proKlimaErlaubt: true
    },
    'h2-2026': {
      label: '21.07.2026 bis 31.01.2027',
      gueltigAb: '2026-07-21', gueltigBis: '2027-01-31',
      klima: 16, grenze: 28000, eu: false, cap: 80, effizienzPct: 0,
      kindFreibetrag: 10000,
      einkStufen: [{ maxAnr: 30000, pct: 40 }, { maxAnr: 40000, pct: 30 }, { maxAnr: 50000, pct: 10 }],
      proKlimaErlaubt: true
    },
    'h1-2027': {
      label: '01.02. bis 31.07.2027',
      gueltigAb: '2027-02-01', gueltigBis: '2027-07-31',
      klima: 12, grenze: 27250, eu: true, cap: 80, effizienzPct: 0,
      kindFreibetrag: 10000,
      einkStufen: [{ maxAnr: 30000, pct: 40 }, { maxAnr: 40000, pct: 30 }, { maxAnr: 50000, pct: 10 }],
      proKlimaErlaubt: false
    },
    'h2-2027': {
      label: '01.08.2027 bis 31.01.2028',
      gueltigAb: '2027-08-01', gueltigBis: '2028-01-31',
      klima: 8, grenze: 26500, eu: true, cap: 80, effizienzPct: 0,
      kindFreibetrag: 10000,
      einkStufen: [{ maxAnr: 30000, pct: 40 }, { maxAnr: 40000, pct: 30 }, { maxAnr: 50000, pct: 10 }],
      proKlimaErlaubt: false
    },
    'h1-2028': {
      label: '01.02. bis 31.07.2028',
      gueltigAb: '2028-02-01', gueltigBis: '2028-07-31',
      klima: 4, grenze: 25750, eu: true, cap: 80, effizienzPct: 0,
      kindFreibetrag: 10000,
      einkStufen: [{ maxAnr: 30000, pct: 40 }, { maxAnr: 40000, pct: 30 }, { maxAnr: 50000, pct: 10 }],
      proKlimaErlaubt: false
    },
    'h2-2028': {
      label: '01.08.2028 bis 31.01.2029',
      gueltigAb: '2028-08-01', gueltigBis: '2029-01-31',
      klima: 0, grenze: 25000, eu: true, cap: 80, effizienzPct: 0,
      kindFreibetrag: 10000,
      einkStufen: [{ maxAnr: 30000, pct: 40 }, { maxAnr: 40000, pct: 30 }, { maxAnr: 50000, pct: 10 }],
      proKlimaErlaubt: false
    },
    'h1-2029': {
      label: '01.02. bis 31.07.2029',
      gueltigAb: '2029-02-01', gueltigBis: '2029-07-31',
      klima: 0, grenze: 24250, eu: true, cap: 80, effizienzPct: 0,
      kindFreibetrag: 10000,
      einkStufen: [{ maxAnr: 30000, pct: 40 }, { maxAnr: 40000, pct: 30 }, { maxAnr: 50000, pct: 10 }],
      proKlimaErlaubt: false
    }
  },
  // Reihenfolge für Anzeige (Degressions-Treppe). Alt bewusst NICHT enthalten:
  // die Treppe zeigt nur die Reform-Perioden (Orakel Z.67, Object.keys(FOERDER_HJ)).
  periodenReihenfolge: ['h2-2026', 'h1-2027', 'h2-2027', 'h1-2028', 'h2-2028', 'h1-2029'],

  // --- Förder-Grundregeln. Orakel Z.107 bis 121
  grundPctEu: 30,          // EU-Gerät bzw. Perioden ohne EU-Differenzierung
  grundPctNichtEu: 15,     // ab 2027 ohne EU-Wertschöpfung

  // --- proKlima Hannover. Orakel Z.217 bis 219, Kanon 1.3
  proKlimaPct: 0.05,
  proKlimaMax: 1500,
  kumCapPct: 0.6,          // BEG-Kumulierungsgrenze 60 % derselben Kosten. Orakel Z.225

  // --- CO2-Faktoren kg/kWh. Orakel Z.148 (Gas brennwertbezogen Hs, Öl UBA)
  co2f: { gas: 0.182, oel: 0.266 },

  // --- GModG § 43 Abs. 1, BGBl. 2026 I Nr. 226; Preisfaktor: BDEW Januar 2026
  bioStufen: [{ y: 2029, p: 0.10 }, { y: 2030, p: 0.15 }, { y: 2035, p: 0.30 }, { y: 2040, p: 0.60 }],
  grundpreisGas:250.38, schornsteinfeger:39, modul14aVorteil:156.22, pvAnteil:30, pvKosten:7, wwKwhProPerson:700,
  co2ZielJahr:2045, netzentgelt:{basisjahr:null,einheit:"ct/kWh Aufschlag gegenüber heute",jahreswerte:[],quelle:"",abrufdatum:""},

  // --- Nutzungsgrad neuer Kessel. Orakel Z.236
  etaNeu: { gas: 0.95, oel: 0.93 },

  // --- Strommix g/kWh, linear. Orakel Z.158
  strommix: { startY: 2026, startG: 350, endY: 2040, endG: 100 },

  // --- Wartung €/Jahr. Orakel Z.257 (fossilW) und Z.271 (wpW)
  wartungWp: 250,
  wartungFossil: 250,

  // --- Zeitachse. Orakel Z.240 und Z.243
  startY: 2026,
  co2ZielSchritte: 19,     // Index 0 = 2026, Index 19 = Zieljahr 2045

  // --- Finanzierungs-Defaults, wenn finanzTog aus ist. Orakel Z.178 bis 179
  kredLZDefault: 10,
  kredZinsDefault: 0.035,
  kredZins358Eff: 0.98,
  kredZins359Eff: 4.10,
  kredZinsZveGrenze: 90000,
  kredBereitstellungProv: 0.15,
  kredZinsStand: '2026-07-24',
  kredZinsQuelle: 'KfW-Ergänzungskredit 358/359',

  // --- Sensitivitäts-Szenarien (additive Deltas). Orakel Z.359 bis 361
  sensi: {
    best: { fossil: 0.015, strom: -0.01 },
    base: { fossil: 0, strom: 0 },
    worst: { fossil: -0.015, strom: 0.015 }
  },

  // --- CO2-Vergleichsgrößen. Orakel Z.338 bis 340
  co2FlugT: 0.5,
  co2BaumKg: 12.5
};

// BEGIN KV_JAZ_GENERATED
var KV_JAZ_SEED = [{"geraet":"5535","heizsystem":"heizkoerper","wert":4.3,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha07-A-hk/response.json","abrufdatum":"2026-10-26T12:52:42.322492+00:00","alias":["Wolf CHA-07/400V","Wolf CHA-07"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5535","heizsystem":"fbh","wert":4.98,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha07-B-fbh/response.json","abrufdatum":"2026-10-26T12:52:56.841036+00:00","alias":["Wolf CHA-07/400V","Wolf CHA-07"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5536","heizsystem":"heizkoerper","wert":4.37,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha10-A-hk/response.json","abrufdatum":"2026-10-26T12:53:01.354268+00:00","alias":["Wolf CHA-10/400V","Wolf CHA-10"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":false},{"geraet":"5536","heizsystem":"fbh","wert":5.08,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha10-B-fbh/response.json","abrufdatum":"2026-10-26T12:53:15.467071+00:00","alias":["Wolf CHA-10/400V","Wolf CHA-10"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":false},{"geraet":"5540","heizsystem":"heizkoerper","wert":4.42,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-e9-A-hk/response.json","abrufdatum":"2026-10-26T12:53:21.711331+00:00","alias":["Wolf CHA-16/20 mit Heizstab (CS-e9-C2)","Wolf CHA-16/20"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":false},{"geraet":"5540","heizsystem":"fbh","wert":5.11,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-e9-B-fbh/response.json","abrufdatum":"2026-10-26T12:53:36.179320+00:00","alias":["Wolf CHA-16/20 mit Heizstab (CS-e9-C2)","Wolf CHA-16/20"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":false},{"geraet":"5539","heizsystem":"heizkoerper","wert":4.42,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-A-hk/response.json","abrufdatum":"2026-10-26T12:53:40.716481+00:00","alias":["Wolf CHA-16/20 ohne Heizstab (CS-C2)"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":false},{"geraet":"5539","heizsystem":"fbh","wert":5.11,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-B-fbh/response.json","abrufdatum":"2026-10-26T12:53:54.346775+00:00","alias":["Wolf CHA-16/20 ohne Heizstab (CS-C2)"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":false},{"geraet":"5558","heizsystem":"heizkoerper","wert":4.34,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha2024-e9-A-hk/response.json","abrufdatum":"2026-10-26T12:53:58.913774+00:00","alias":["Wolf CHA-20/24 mit Heizstab (CS-e9-D2)","Wolf CHA-20/24"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"5558","heizsystem":"fbh","wert":5.03,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha2024-e9-B-fbh/response.json","abrufdatum":"2026-10-26T12:54:13.002790+00:00","alias":["Wolf CHA-20/24 mit Heizstab (CS-e9-D2)","Wolf CHA-20/24"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"5559","heizsystem":"heizkoerper","wert":4.34,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha2024-A-hk/response.json","abrufdatum":"2026-10-26T12:54:17.600629+00:00","alias":["Wolf CHA-20/24 ohne Heizstab (CS-D2)"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"5559","heizsystem":"fbh","wert":5.03,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha2024-B-fbh/response.json","abrufdatum":"2026-10-26T12:54:31.533734+00:00","alias":["Wolf CHA-20/24 ohne Heizstab (CS-D2)"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"5080","heizsystem":"heizkoerper","wert":3.88,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl35-81-A-hk/response.json","abrufdatum":"2026-10-26T12:54:36.260376+00:00","alias":["Vaillant aroTHERM plus VWL 35/8.1 A 230V","Vaillant VWL 35/8.1 A","Vaillant aroTHERM plus VWL 35/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":3},"kaskade":false},{"geraet":"5080","heizsystem":"fbh","wert":4.49,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl35-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:54:50.064033+00:00","alias":["Vaillant aroTHERM plus VWL 35/8.1 A 230V","Vaillant VWL 35/8.1 A","Vaillant aroTHERM plus VWL 35/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":3},"kaskade":false},{"geraet":"5081","heizsystem":"heizkoerper","wert":3.86,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl55-81-A-hk/response.json","abrufdatum":"2026-10-26T12:54:54.629091+00:00","alias":["Vaillant aroTHERM plus VWL 55/8.1 A 230V","Vaillant VWL 55/8.1 A","Vaillant aroTHERM plus VWL 55/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":5},"kaskade":false},{"geraet":"5081","heizsystem":"fbh","wert":4.47,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl55-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:10.192588+00:00","alias":["Vaillant aroTHERM plus VWL 55/8.1 A 230V","Vaillant VWL 55/8.1 A","Vaillant aroTHERM plus VWL 55/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":5},"kaskade":false},{"geraet":"5078","heizsystem":"heizkoerper","wert":3.9,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:14.949227+00:00","alias":["Vaillant aroTHERM plus VWL 75/8.1 A 230V","Vaillant VWL 75/8.1 A","Vaillant aroTHERM plus VWL 75/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5078","heizsystem":"fbh","wert":4.51,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:30.884345+00:00","alias":["Vaillant aroTHERM plus VWL 75/8.1 A 230V","Vaillant VWL 75/8.1 A","Vaillant aroTHERM plus VWL 75/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5079","heizsystem":"heizkoerper","wert":4.18,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:40.137148+00:00","alias":["Vaillant aroTHERM plus VWL 105/8.1 A 400V","Vaillant VWL 105/8.1 A","Vaillant aroTHERM plus VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":false},{"geraet":"5079","heizsystem":"fbh","wert":4.83,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:54.295390+00:00","alias":["Vaillant aroTHERM plus VWL 105/8.1 A 400V","Vaillant VWL 105/8.1 A","Vaillant aroTHERM plus VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":false},{"geraet":"5077","heizsystem":"heizkoerper","wert":4.21,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl125-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:58.988822+00:00","alias":["Vaillant aroTHERM plus VWL 125/8.1 A 400V","Vaillant VWL 125/8.1 A","Vaillant aroTHERM plus VWL 125/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":12},"kaskade":false},{"geraet":"5077","heizsystem":"fbh","wert":4.87,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl125-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:56:14.589132+00:00","alias":["Vaillant aroTHERM plus VWL 125/8.1 A 400V","Vaillant VWL 125/8.1 A","Vaillant aroTHERM plus VWL 125/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":12},"kaskade":false},{"geraet":"5082","heizsystem":"heizkoerper","wert":3.94,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl55-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:19.393112+00:00","alias":["Vaillant aroTHERM pro VWL 55/7.1 A 230V","Vaillant VWL 55/7.1 A","Vaillant aroTHERM pro VWL 55/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":5},"kaskade":false},{"geraet":"5082","heizsystem":"fbh","wert":4.56,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl55-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:56:34.569053+00:00","alias":["Vaillant aroTHERM pro VWL 55/7.1 A 230V","Vaillant VWL 55/7.1 A","Vaillant aroTHERM pro VWL 55/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":5},"kaskade":false},{"geraet":"5083","heizsystem":"heizkoerper","wert":3.86,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:39.168445+00:00","alias":["Vaillant aroTHERM pro VWL 75/7.1 A 230V","Vaillant VWL 75/7.1 A","Vaillant aroTHERM pro VWL 75/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5083","heizsystem":"fbh","wert":4.47,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:56:53.485421+00:00","alias":["Vaillant aroTHERM pro VWL 75/7.1 A 230V","Vaillant VWL 75/7.1 A","Vaillant aroTHERM pro VWL 75/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5085","heizsystem":"heizkoerper","wert":3.95,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:58.061418+00:00","alias":["Vaillant aroTHERM pro VWL 115/7.1 A 400V","Vaillant VWL 115/7.1 A","Vaillant aroTHERM pro VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":false},{"geraet":"5085","heizsystem":"fbh","wert":4.57,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:57:12.583875+00:00","alias":["Vaillant aroTHERM pro VWL 115/7.1 A 400V","Vaillant VWL 115/7.1 A","Vaillant aroTHERM pro VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":false},{"geraet":"5084","heizsystem":"heizkoerper","wert":4.42,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl205-81-A-hk/response.json","abrufdatum":"2026-10-26T12:57:17.194542+00:00","alias":["Vaillant aroTHERM perform VWL 205/8.1 A S2 Q","Vaillant VWL 205/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"5084","heizsystem":"fbh","wert":5.11,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl205-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:57:31.672241+00:00","alias":["Vaillant aroTHERM perform VWL 205/8.1 A S2 Q","Vaillant VWL 205/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"2x:5540","heizsystem":"heizkoerper","wert":4.42,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-e9-A-hk/response.json","abrufdatum":"2026-10-26T12:53:21.711331+00:00","alias":["2× Wolf CHA-16/20","2× Wolf CHA-16/20 (Kaskade)","2x Wolf CHA-16/20","2× Wolf CHA-16"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":true},{"geraet":"2x:5540","heizsystem":"fbh","wert":5.11,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-e9-B-fbh/response.json","abrufdatum":"2026-10-26T12:53:36.179320+00:00","alias":["2× Wolf CHA-16/20","2× Wolf CHA-16/20 (Kaskade)","2x Wolf CHA-16/20","2× Wolf CHA-16"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":true},{"geraet":"2x:5078","heizsystem":"heizkoerper","wert":3.9,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:14.949227+00:00","alias":["2× Vaillant VWL 75/8.1 A","2× Vaillant VWL 75/8.1 A (Kaskade)","2x Vaillant VWL 75/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":true},{"geraet":"2x:5078","heizsystem":"fbh","wert":4.51,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:30.884345+00:00","alias":["2× Vaillant VWL 75/8.1 A","2× Vaillant VWL 75/8.1 A (Kaskade)","2x Vaillant VWL 75/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":true},{"geraet":"2x:5079","heizsystem":"heizkoerper","wert":4.18,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:40.137148+00:00","alias":["2× Vaillant VWL 105/8.1 A","2× Vaillant VWL 105/8.1 A (Kaskade)","2x Vaillant VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":true},{"geraet":"2x:5079","heizsystem":"fbh","wert":4.83,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:54.295390+00:00","alias":["2× Vaillant VWL 105/8.1 A","2× Vaillant VWL 105/8.1 A (Kaskade)","2x Vaillant VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":true},{"geraet":"3x:5079","heizsystem":"heizkoerper","wert":4.18,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:40.137148+00:00","alias":["3× Vaillant VWL 105/8.1 A","3× Vaillant VWL 105/8.1 A (Kaskade)","3x Vaillant VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":true},{"geraet":"3x:5079","heizsystem":"fbh","wert":4.83,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:54.295390+00:00","alias":["3× Vaillant VWL 105/8.1 A","3× Vaillant VWL 105/8.1 A (Kaskade)","3x Vaillant VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":true},{"geraet":"2x:5077","heizsystem":"heizkoerper","wert":4.21,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl125-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:58.988822+00:00","alias":["2× Vaillant VWL 125/8.1 A","2× Vaillant VWL 125/8.1 A (Kaskade)","2x Vaillant VWL 125/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":12},"kaskade":true},{"geraet":"2x:5077","heizsystem":"fbh","wert":4.87,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl125-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:56:14.589132+00:00","alias":["2× Vaillant VWL 125/8.1 A","2× Vaillant VWL 125/8.1 A (Kaskade)","2x Vaillant VWL 125/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":12},"kaskade":true},{"geraet":"2x:5083","heizsystem":"heizkoerper","wert":3.86,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:39.168445+00:00","alias":["2× Vaillant VWL 75/7.1 A","2× Vaillant VWL 75/7.1 A (Kaskade)","2x Vaillant VWL 75/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":true},{"geraet":"2x:5083","heizsystem":"fbh","wert":4.47,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:56:53.485421+00:00","alias":["2× Vaillant VWL 75/7.1 A","2× Vaillant VWL 75/7.1 A (Kaskade)","2x Vaillant VWL 75/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":true},{"geraet":"2x:5085","heizsystem":"heizkoerper","wert":3.95,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:58.061418+00:00","alias":["2× Vaillant VWL 115/7.1 A","2× Vaillant VWL 115/7.1 A (Kaskade)","2x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true},{"geraet":"2x:5085","heizsystem":"fbh","wert":4.57,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:57:12.583875+00:00","alias":["2× Vaillant VWL 115/7.1 A","2× Vaillant VWL 115/7.1 A (Kaskade)","2x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true},{"geraet":"3x:5085","heizsystem":"heizkoerper","wert":3.95,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:58.061418+00:00","alias":["3× Vaillant VWL 115/7.1 A","3× Vaillant VWL 115/7.1 A (Kaskade)","3x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true},{"geraet":"3x:5085","heizsystem":"fbh","wert":4.57,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:57:12.583875+00:00","alias":["3× Vaillant VWL 115/7.1 A","3× Vaillant VWL 115/7.1 A (Kaskade)","3x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true},{"geraet":"4x:5085","heizsystem":"heizkoerper","wert":3.95,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:58.061418+00:00","alias":["4× Vaillant VWL 115/7.1 A","4× Vaillant VWL 115/7.1 A (Kaskade)","4x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true},{"geraet":"4x:5085","heizsystem":"fbh","wert":4.57,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:57:12.583875+00:00","alias":["4× Vaillant VWL 115/7.1 A","4× Vaillant VWL 115/7.1 A (Kaskade)","4x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true}];
// END KV_JAZ_GENERATED

/* T1245: reine, für PHP und JS identische Regeln; keine Uhr und kein Netz. */
function kvBioStand(stufen) {
  var neu = [{y:2029,p:0.10},{y:2030,p:0.15},{y:2035,p:0.30},{y:2040,p:0.60}];
  var alt = [{y:2029,p:0.15},{y:2035,p:0.30},{y:2040,p:0.60}];
  function gleich(a,b) { return Array.isArray(a) && a.length === b.length && a.every(function(s,i){return Number(s.y)===b[i].y && Number(s.p)===b[i].p;}); }
  if (gleich(stufen, neu)) return {stufen:neu, hinweis:null};
  if (gleich(stufen, alt)) return {stufen:neu, hinweis:'Altes Bio-Sheet erkannt; vollständig auf GModG § 43 Abs. 1, BGBl. 2026 I Nr. 226 umgestellt.'};
  throw new Error('Bio-Parameter unvollständig oder widersprüchlich. Erforderlich: 2029/10 %, 2030/15 %, 2035/30 %, 2040/60 %.');
}
function kvNutzenEingaben(raw) {
  var i = {}, k;
  for (k in KV_DEFAULTS) i[k] = KV_DEFAULTS[k];
  for (k in raw) if (raw[k] !== undefined) i[k] = raw[k];
  function zahl(name, min, max, leer) {
    var v = i[name];
    if (v === null || v === undefined || v === '') { if (leer) return null; throw new Error('Bitte ' + name + ' angeben.'); }
    var n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    if (!isFinite(n) || n < min || n > max) throw new Error('Ungültiger Wert für ' + name + '.');
    return n;
  }
  ['pvTog','wpZaehler','netzentgeltTog','warmwasserBisherZentral','warmwasserKuenftigZentral'].forEach(function(k){var v=i[k];i[k]=v===true||v===1||v==='1'||v==='true'||v==='ja';});
  i.heizsystemAnnahme = !raw.heizsystem;
  i.heizsystem = String(i.heizsystem || 'heizkoerper');
  if (i.heizsystem === 'gemischt') i.heizsystem='heizkoerper';
  if (i.heizsystem === 'fussbodenheizung' || i.heizsystem === 'fussboden') i.heizsystem='fbh';
  if (['fbh','heizkoerper'].indexOf(i.heizsystem)<0) throw new Error('Ungültiges Heizsystem.');
  if (['gas','oel'].indexOf(i.heizart)<0 || ['gas','oel'].indexOf(i.vglBrennstoff)<0) throw new Error('Kostenvergleich nur für Gas und Öl.');
  i.geraet = String(i.geraet || '').trim();
  i.modul14a = String(i.modul14a || 'modul1');
  if (['modul1','modul2','kein'].indexOf(i.modul14a)<0) throw new Error('Ungültiges Modul nach Paragraf 14a.');
  i.pvAnteil=zahl('pvAnteil',0,100,false); i.pvKosten=zahl('pvKosten',0,1000,false);
  i.grundpreisGas=zahl('grundpreisGas',0,100000,false);
  i.foerderBetragExtern=zahl('foerderBetragExtern',0,i.invWP,true);
  i.wpArbeitspreis=zahl('wpArbeitspreis',0,1000,!i.wpZaehler);
  i.wpGrundpreis=zahl('wpGrundpreis',0,100000,!i.wpZaehler);
  if (i.modul14a==='modul2' && !i.wpZaehler) throw new Error('Modul 2 erfordert einen eigenen Wärmepumpenzähler und dessen Tarif.');
  i.startJahr=zahl('startJahr',1900,2200,true);
  if (i.startJahr!==null && Math.floor(i.startJahr)!==i.startJahr) throw new Error('Startjahr muss ganzzahlig sein.');
  i.personen=zahl('personen',0,1000,true);
  if (!i.warmwasserBisherZentral && i.warmwasserKuenftigZentral && !(i.personen>0)) throw new Error('Bitte die Personenzahl für den Warmwasserwechsel angeben.');
  if (!(i.bedarf>0) || !(i.eta>0 && i.eta<=100) || !(i.laufzeit>=1 && i.laufzeit<=100 && i.laufzeit===Math.floor(i.laufzeit))) throw new Error('Verbrauch, Nutzungsgrad oder Laufzeit ungültig.');
  return i;
}
function kvJazAuswahl(i, tabelle) {
  if (!Array.isArray(tabelle) || !tabelle.length) throw new Error('Arbeitszahltabelle KV_JAZ fehlt oder ist leer.');
  var seen={};
  tabelle.forEach(function(r){var key=r.geraet+':'+r.heizsystem,b=r.randbedingungen;
    if(seen[key]||!b||!b.standort||!b.norm||!isFinite(b.gesamtlast)||!(b.gesamtlast>0)||!isFinite(b.vorlauf)||!isFinite(b.ruecklauf)||!isFinite(b.warmwasserAnteil)||!isFinite(b.speicher)||!isFinite(r.wert)||!(r.wert>0)||!r.quelle||!r.abrufdatum)throw new Error('Ungültige oder doppelte Zeile in KV_JAZ.');
    seen[key]=true;
  });
  if(!i.geraet)KV_JAZ_SEED.filter(function(r){return !r.kaskade&&r.heizsystem===i.heizsystem;}).forEach(function(r){if(!seen[r.geraet+':'+r.heizsystem])throw new Error('KV_JAZ ist für das Portfolio-Minimum unvollständig.');});
  var aus = tabelle.filter(function(r){return r.heizsystem===i.heizsystem && (!i.geraet || String(r.geraet)===i.geraet || (r.alias||[]).indexOf(i.geraet)>=0);});
  if (!aus.length) throw new Error('Für das Gerät und Heizsystem fehlt eine belegte Arbeitszahl. Berechnung gesperrt.');
  var r=aus[0];
  aus.forEach(function(x){if (!(Number(x.wert)>0) || !x.quelle || !x.abrufdatum) throw new Error('Ungültige Zeile in KV_JAZ.'); if(Number(x.wert)<Number(r.wert))r=x;});
  if(i.geraet && aus.length!==1)throw new Error('Gerätezuordnung in KV_JAZ ist nicht eindeutig.');
  return {wert:Number(r.wert),geraet:r.geraet,heizsystem:i.heizsystem,quelle:r.quelle,abrufdatum:r.abrufdatum,randbedingungen:r.randbedingungen,
    annahme:!i.geraet?'Portfolio-Minimum; Gerät noch nicht gewählt.':((r.kaskade)?'Kaskade: Arbeitszahl des Einzelgeräts als Annahme.':null),heizsystemAnnahme:i.heizsystemAnnahme};
}
function kvNetzentgeltPruefen(n, an) {
  if(!an)return;
  if(!n || !Array.isArray(n.jahreswerte) || !n.jahreswerte.length) throw new Error('Netzentgeltpfad eingeschaltet, aber keine belegte Jahresreihe hinterlegt. Bitte ausschalten.');
  if(!Number.isInteger(n.basisjahr) || n.einheit!=='ct/kWh Aufschlag gegenüber heute' || !n.quelle || !n.abrufdatum) throw new Error('Netzentgeltpfad: Basisjahr, Einheit, Quelle oder Abrufdatum fehlen.');
  var gesehen={};
  n.jahreswerte.forEach(function(r){if(!Number.isInteger(r.jahr)||!isFinite(r.wert)||r.wert<0||gesehen[r.jahr])throw new Error('Netzentgeltpfad enthält ungültige oder doppelte Jahreswerte.');gesehen[r.jahr]=true;});
  var basis=n.jahreswerte.filter(function(r){return r.jahr===n.basisjahr;});
  if(basis.length!==1||basis[0].wert!==0)throw new Error('Netzentgeltpfad muss im Basisjahr mit Aufschlag 0 beginnen.');
}
function kvJahreskosten(j, fuel, i, p, s, fossilDelta, stromDelta) {
  var cY=s.startY+j-1, neu=!!i.neuFossilTog, bio=neu&&!!i.bioTog, bA=bio?kvBioAnteil(cY,p):0;
  var preis=fuel==='gas'?i.gaspreis:i.oelpreis, stg=(fuel==='gas'?i.gasStg:i.oelStg)/100;
  var vb=neu?s.nutzwaerme/p.etaNeu[fuel]:i.bedarf;
  var bp=preis*Math.pow(1+stg+fossilDelta,j-1), ep=bp*(1+bA*((bio?i.bioAufpreis:1)-1));
  var fossilK=vb*ep/100, co2Preis=s.zielSchritte<=0||j-1>=s.zielSchritte?i.co2Pfad:i.co2preis+(i.co2Pfad-i.co2preis)*(j-1)/s.zielSchritte;
  var co2Basis=vb*p.co2f[fuel]/1000*(co2Preis-i.co2preis), co2St=co2Basis*(1-bA);
  var grundpreisGas=fuel==='gas'&&i.heizart==='gas'?i.grundpreisGas:0, netzentgelt=0;
  if(i.netzentgeltTog && fuel==='gas') {
    var treffer=p.netzentgelt.jahreswerte.filter(function(r){return r.jahr===cY;});
    if(treffer.length!==1)throw new Error('Netzentgeltpfad: Jahreswert für '+cY+' fehlt.');
    netzentgelt=vb*treffer[0].wert/100;
  }
  // Bestand: bisheriger Elektroboiler. Neuer Kessel: Warmwasser bereits im Brennstoffbedarf.
  var wwStromK=(neu?0:s.wwZuschlag)*i.strompreis*Math.pow(1+i.stromEntw/100+stromDelta,j-1)/100;
  var fossilW=p.wartungFossil, fossilG=fossilK+co2St+fossilW+grundpreisGas+p.schornsteinfeger+netzentgelt+wwStromK;
  var stromPJ=(i.wpZaehler?i.wpArbeitspreis:i.strompreis)*Math.pow(1+i.stromEntw/100+stromDelta,j-1);
  var pvAnteil=i.pvTog?i.pvAnteil/100:0, pvStrom=s.wpStrom*pvAnteil, netzStrom=s.wpStrom-pvStrom;
  var wpStromK=s.wpStrom*stromPJ/100, pvKosten=pvStrom*i.pvKosten/100, pvSav=pvStrom*stromPJ/100-pvKosten;
  var dynSav=i.dynTarifTog?netzStrom*i.dynAnteil/100*i.dynSpread/100:0;
  var wpGrundpreis=i.wpZaehler?i.wpGrundpreis:0, modul14a=!i.wpZaehler&&i.modul14a==='modul1'?p.modul14aVorteil:0;
  var wpW=p.wartungFossil, wpGes=wpStromK+wpW-pvSav-dynSav+wpGrundpreis-modul14a;
  return {j:j,cY:cY,fossilBP:bp,fossilEP:ep,bioP:bA*100,fossilK:fossilK,co2St:co2St,fossilW:fossilW,fossilG:fossilG,
    wpStromK:wpStromK,pvSav:pvSav,dynSav:dynSav,wpW:wpW,wpGes:wpGes,grundpreisGas:grundpreisGas,schornsteinfeger:p.schornsteinfeger,
    netzentgelt:netzentgelt,wwStromK:wwStromK,wpGrundpreis:wpGrundpreis,modul14a:modul14a,pvStrom:pvStrom,pvKosten:pvKosten,netzStrom:netzStrom,netzStromK:netzStrom*stromPJ/100,
    bioAufschlag:fossilK-vb*bp/100,bioCo2Entlastung:co2Basis-co2St,bioNetto:fossilK-vb*bp/100+co2St-co2Basis,co2Preis:co2Preis};
}
function kvNutzenParameter(kv) {
  function n(k,d){var v=kv[k];if(v===undefined||v===null||v==='')return d;var x=Number(String(v).replace(',','.'));if(!isFinite(x))throw new Error('Ungültiger Parameter '+k);return x;}
  var st=[], vorhanden=false;
  for(var j=1;j<=4;j++){var y=kv['bio_stufe_'+j+'_jahr'],v=kv['bio_stufe_'+j+'_anteil'];if(y!==undefined||v!==undefined){vorhanden=true;st.push({y:n('bio_stufe_'+j+'_jahr',NaN),p:n('bio_stufe_'+j+'_anteil',NaN)});}}
  var b=kvBioStand(vorhanden?st:KV_PARAMS_SEED.bioStufen), reihe=[];
  try{reihe=JSON.parse(String(kv.netzentgelt_jahreswerte||'[]'));}catch(e){throw new Error('Netzentgelt-Jahresreihe ist kein gültiges JSON.');}
  return {bioStufen:b.stufen,bioHinweis:b.hinweis,wartungWp:n('wartung_fossil',250),wartungFossil:n('wartung_fossil',250),
    grundpreisGas:n('grundpreis_gas',250.38),schornsteinfeger:n('schornsteinfeger',39),modul14aVorteil:n('modul14a_vorteil',156.22),
    pvAnteil:n('pv_anteil',30),pvKosten:n('pv_kosten',7),wwKwhProPerson:n('ww_abzug_kwh_pro_person_jahr',700),co2ZielJahr:n('co2_ziel_jahr',2045),
    netzentgelt:{basisjahr:n('netzentgelt_basisjahr',null),einheit:String(kv.netzentgelt_einheit||'ct/kWh Aufschlag gegenüber heute'),jahreswerte:reihe,quelle:String(kv.netzentgelt_quelle||''),abrufdatum:String(kv.netzentgelt_abrufdatum||'')}};
}
function kvJazAusZeilen(rows) {
  var h=['Gerät','Heizsystem','Wert','Quelle','Abrufdatum','Randbedingungen','Aliase','Kaskade'];
  if(!Array.isArray(rows)||JSON.stringify(rows[0])!==JSON.stringify(h))throw new Error('KV_JAZ: Tabellenkopf ungültig.');
  return rows.slice(1).filter(function(r){return r[0];}).map(function(r){
    var bed,ali;try{bed=JSON.parse(r[5]);ali=JSON.parse(r[6]||'[]');}catch(e){throw new Error('KV_JAZ: Metadaten ungültig.');}
    if(['fbh','heizkoerper'].indexOf(r[1])<0||!(Number(String(r[2]).replace(',','.'))>0)||!r[3]||!r[4]||!bed||!Array.isArray(ali))throw new Error('KV_JAZ: Zeile ungültig.');
    return {geraet:String(r[0]),heizsystem:r[1],wert:Number(String(r[2]).replace(',','.')),quelle:r[3],abrufdatum:r[4],randbedingungen:bed,alias:ali,kaskade:r[7]===true||r[7]==='J'};
  });
}
function KV_JAZ_ROWS_() {return KV_JAZ_SEED.map(function(r){return [r.geraet,r.heizsystem,r.wert,r.quelle,r.abrufdatum,JSON.stringify(r.randbedingungen),JSON.stringify(r.alias||[]),r.kaskade?'J':'N'];});}
function kvNutzenRequest(p, params, jahr) {
  return {heizsystem:p.heizsystem||null,geraet:p.geraet||'',startJahr:p.startJahr===undefined||p.startJahr===''?jahr:p.startJahr,
    pvTog:p.pvTog,pvAnteil:p.pvAnteil===undefined?params.pvAnteil:p.pvAnteil,pvKosten:p.pvKosten===undefined?params.pvKosten:p.pvKosten,
    foerderBetragExtern:p.foerderBetragExtern===undefined?null:p.foerderBetragExtern,
    grundpreisGas:p.grundpreisGas===undefined?params.grundpreisGas:p.grundpreisGas,wpZaehler:p.wpZaehler,wpArbeitspreis:p.wpArbeitspreis,wpGrundpreis:p.wpGrundpreis,
    netzentgeltTog:p.netzentgeltTog,modul14a:p.modul14a||'modul1',warmwasserBisherZentral:p.warmwasserBisherZentral,warmwasserKuenftigZentral:p.warmwasserKuenftigZentral,personen:p.personen};
}

/* ===================== HILFSFUNKTIONEN ===================== */

/** Bio-Anteil des Jahres yr als Stufe (keine Interpolation). Orakel Z.152 bis 156 */
function kvBioAnteil(yr, params) {
  var p = 0;
  var st = params.bioStufen;
  for (var i = 0; i < st.length; i++) { if (yr >= st[i].y) p = st[i].p; }
  return p;
}

/** Strommix g/kWh im Jahr y, linear. Orakel Z.158 */
function kvMixG(y, params) {
  var m = params.strommix;
  var a = m.startG, b = m.endG;
  if (y <= m.startY) return a;
  if (y >= m.endY) return b;
  return a + (b - a) * (y - m.startY) / (m.endY - m.startY);
}

/**
 * Förderquote. Port von getFoerder() (Orakel Z.104 bis 123), verallgemeinert:
 * Einkommensstaffel, Kind-Freibetrag, Deckel und Effizienzbonus sind Perioden-Daten.
 * Für die 6 Reform-Perioden identisch zum Orakel (äquivalenz-geprüft, siehe
 * tests/kv_equivalence/PROTOKOLL.md).
 */
/* ===================== PERIODEN-AUTOMATIK (datumsgesteuert) ===================== */

/**
 * Antragsperiode zu einem Datum. REINE Funktion: das Datum kommt als Eingabe,
 * hier wird KEINE Uhr gelesen (Briefing Abschnitt 5). Die Server-Zeit liest
 * ausschliesslich der Wrapper kvPeriodeHeute_ (kv_routes_wiring_spec.md 4), der
 * genau diese Funktion aufruft. Damit lebt die Auswahl-Logik an EINER Stelle und
 * wird vom Perioden-Gate getestet (tests/kv_equivalence/run_perioden_automatik.js).
 *
 * Vergleich ueber ISO-Strings (yyyy-MM-dd): lexikografisch = chronologisch, damit
 * ist keine Zeitzonen-Arithmetik noetig.
 *
 * @param {string} heuteIso Datum als 'yyyy-MM-dd'
 * @param {Object} params Parametersatz (KV_PARAMS_SEED oder Sheet-Spiegel)
 * @return {string} Perioden-Schluessel
 */
function kvPeriodeFuerDatum(heuteIso, params) {
  params = params || KV_PARAMS_SEED;
  var heute = String(heuteIso || '');
  var keys = Object.keys(params.perioden);
  for (var i = 0; i < keys.length; i++) {
    var per = params.perioden[keys[i]];
    var ab = per.gueltigAb || '';
    var bis = per.gueltigBis || '';
    // Eine Periode ohne BEIDE Grenzen waere ein Datenfehler und wuerde jedes
    // Datum fangen (Abnahme-Befund B-1). Darum wird sie uebersprungen, statt
    // still das falsche Regelwerk zu liefern.
    if (!ab && !bis) continue;
    if ((!ab || heute >= ab) && (!bis || heute <= bis)) return keys[i];
  }
  // Nach der letzten definierten Periode: bei der letzten bleiben, statt zu
  // werfen. NIE auf 'alt' zurueckfallen (das waere das Regelwerk von gestern).
  var rf = params.periodenReihenfolge;
  return rf[rf.length - 1];
}

function kvFoerder(inputs, params) {
  var hj = params.perioden[inputs.fHalbjahr];
  if (!hj) throw new Error('Unbekannte Förderperiode: ' + inputs.fHalbjahr);

  var grundPct = (hj.eu && !inputs.fEU) ? params.grundPctNichtEu : params.grundPctEu;
  var g = inputs.fGrund ? grundPct : 0;
  var k = inputs.fKlima ? hj.klima : 0;

  // Anrechenbares Einkommen = zvE minus EINMALIG Familienzuschlag bei mind. einem
  // minderjährigen Kind (KfW-PM BEG-Reform). Orakel Z.111 bis 113
  var zvE = inputs.fEinkSlider;
  var anr = Math.max(0, zvE - (inputs.fKind ? hj.kindFreibetrag : 0));
  var e = 0;
  for (var i = 0; i < hj.einkStufen.length; i++) {
    if (anr <= hj.einkStufen[i].maxAnr) { e = hj.einkStufen[i].pct; break; }
  }

  // Klimabonus-Voraussetzung (KfW 458): Öl/Kohle/Gasetagen/Nachtspeicher
  // funktionsfähig ODER Gas-/Biomasseheizung mind. 20 Jahre alt. Orakel Z.118 bis 119
  var kEff = inputs.fAlt20 ? k : 0;

  // Effizienzbonus: nur Alt-Periode (Kanon Abschnitt 2), Reform = 0.
  var eff = (hj.effizienzPct > 0 && inputs.fEffizienz) ? hj.effizienzPct : 0;

  var sum = g + kEff + e + eff;
  var q = Math.min(sum, hj.cap);
  return {
    periode: inputs.fHalbjahr, label: hj.label,
    g: g, grundPct: grundPct, klimaPct: hj.klima, k: kEff, e: e, eff: eff,
    sum: sum, q: q, cap: hj.cap, grenze: hj.grenze, zvE: zvE, anr: anr,
    eu: hj.eu, proKlimaErlaubt: hj.proKlimaErlaubt
  };
}

/* ===================== HAUPTRECHNUNG ===================== */

/**
 * Reiner Rechenkern. Port von calculate() (Orakel Z.162 bis 673).
 * @param {Object} inputs normalisierte Eingaben (siehe kv_contract.md Abschnitt 1)
 * @param {Object} params Parametersatz (Default KV_PARAMS_SEED)
 * @return {Object} Response-Payload (siehe kv_contract.md Abschnitt 2)
 */
function kvCalculate(inputs, params) {
  var gegeben = params || KV_PARAMS_SEED;
  params = {}; Object.keys(KV_PARAMS_SEED).forEach(function(k){params[k]=KV_PARAMS_SEED[k];}); Object.keys(gegeben).forEach(function(k){params[k]=gegeben[k];});
  var bioStand=kvBioStand(params.bioStufen); params.bioStufen=bioStand.stufen;
  inputs=kvNutzenEingaben(inputs);
  var jazInfo=kvJazAuswahl(inputs,params.jazTabelle===undefined?KV_JAZ_SEED:params.jazTabelle);
  inputs.jaz=jazInfo.wert;
  kvNetzentgeltPruefen(params.netzentgelt,inputs.netzentgeltTog);

  var heizart = inputs.heizart;
  var bedarf = inputs.bedarf;
  var eta = inputs.eta / 100;
  var investWP = inputs.invWP;
  var jaz = inputs.jaz;
  var laufzeit = inputs.laufzeit;

  // Orakel Z.171 bis 172: bioFak nur wenn bioTog an, sonst 1 (neutral)
  var bioOn = !!inputs.bioTog && !!inputs.neuFossilTog;
  var bioFak = bioOn ? inputs.bioAufpreis : 1;

  // Orakel Z.174 bis 182: die Toggles überschreiben die Slider-Werte hart.
  var dynTarifOn = !!inputs.dynTarifTog;
  var dynAnteil = dynTarifOn ? inputs.dynAnteil : 0;
  var dynSpread = dynTarifOn ? inputs.dynSpread : 0;
  var finanzOn = !!inputs.finanzTog;
  var kredLZ = finanzOn ? inputs.kredLZ : params.kredLZDefault;
  var kredZins = finanzOn ? inputs.kredZins / 100 : params.kredZinsDefault;
  var immoOn = !!inputs.immoTog;
  var hausW = immoOn ? inputs.hausW : 0;
  var immoP = immoOn ? inputs.immoP / 100 : 0;

  // Orakel Z.196: mit Neuanlagen-Vergleich steuert vglBrennstoff den Pfad,
  // sonst die Bestands-Heizungsart.
  var neuFossilOn = !!inputs.neuFossilTog;
  var vglFuel = neuFossilOn ? inputs.vglBrennstoff : heizart;

  var fossilP0 = vglFuel === 'gas' ? inputs.gaspreis : inputs.oelpreis;
  var fossilStg = vglFuel === 'gas' ? inputs.gasStg / 100 : inputs.oelStg / 100;
  var stromP0 = inputs.strompreis;
  var stromE = inputs.stromEntw / 100;
  var co2P0 = inputs.co2preis;
  var co2Ziel = inputs.co2Pfad;
  var gasP0 = inputs.gaspreis, gasStgV = inputs.gasStg / 100;
  var oelP0 = inputs.oelpreis, oelStgV = inputs.oelStg / 100;
  var gasInvest = inputs.gasInvest;
  var oelInvest = inputs.oelInvest;

  // --- Förderung. Orakel Z.213 bis 228
  var fInfo = kvFoerder(inputs, params);
  var fq = fInfo.q / 100;
  var fBasis = Math.min(investWP, fInfo.grenze);
  var fBetrag = fBasis * fq;   // Engine rundet NICHT (Kanon 1.2, Briefing Abschnitt 2)

  var pkAllowed = fInfo.proKlimaErlaubt;
  // [Orakel rundet] Z.219: Math.round INNERHALB von Math.min
  var pkWP = (inputs.proklimaTog && pkAllowed) ? Math.min(Math.round(params.proKlimaPct * investWP), params.proKlimaMax) : 0;
  var kumCap = params.kumCapPct * investWP;
  var totalFoerd = fBetrag + pkWP;
  if (pkWP > 0) totalFoerd = Math.max(fBetrag, Math.min(totalFoerd, kumCap));
  var extern=inputs.foerderBetragExtern!==null;
  if(extern){totalFoerd=inputs.foerderBetragExtern;fBetrag=totalFoerd;pkWP=0;}
  var nettoInvest = Math.max(0, investWP - totalFoerd);

  var fossilInvest = vglFuel === 'gas' ? gasInvest : oelInvest;
  var mehrInvest = nettoInvest - fossilInvest;

  // Nutzwärme = Brennstoffverbrauch × Kessel-Nutzungsgrad. Orakel Z.234
  var wwZuschlag=!inputs.warmwasserBisherZentral&&inputs.warmwasserKuenftigZentral?inputs.personen*params.wwKwhProPerson:0;
  var nutzwaerme=bedarf*eta+wwZuschlag;
  var wpStrom = nutzwaerme / jaz;
  var fossilVerbrauch = neuFossilOn ? nutzwaerme / params.etaNeu[vglFuel] : bedarf;

  var co2Fac = params.co2f[vglFuel];
  var co2TPJ = fossilVerbrauch * co2Fac / 1000;
  var startY = inputs.startJahr===null?params.startY:inputs.startJahr;
  var zielSchritte = Math.max(0,params.co2ZielJahr-startY);
  var rechenSystem={startY:startY,zielSchritte:zielSchritte,nutzwaerme:nutzwaerme,wpStrom:wpStrom,wwZuschlag:wwZuschlag};

  // CO2-Preis im Schritt k. Orakel Z.240
  function co2PJ(k) {
    var t = co2Ziel, y = zielSchritte;
    return k >= y ? t : co2P0 + (t - co2P0) * k / y;
  }

  var data = [];
  var cumSav = 0, cumFossil = 0, cumMehr = 0, cumWPKosten = 0, co2SavedMix = 0, co2FossilSum = 0;

  for (var j = 1; j <= laufzeit; j++) {
    var d=kvJahreskosten(j,vglFuel,inputs,params,rechenSystem,0,0);
    cumSav+=d.fossilG-d.wpGes;cumFossil+=d.fossilG;cumWPKosten+=d.wpGes;cumMehr=cumSav;
    co2FossilSum+=co2TPJ*(1-d.bioP/100);co2SavedMix+=co2TPJ*(1-d.bioP/100)-wpStrom*kvMixG(d.cY,params)/1e6;
    d.jSav=d.fossilG-d.wpGes;d.mehrK=d.jSav;d.cumSav=cumSav;d.cumMehr=cumMehr;d.cumFossil=cumFossil;d.cumWPKosten=cumWPKosten;
    data.push(d);
  }

  var last = data[data.length - 1];

  // Kanonische Vergleichsbasis. Orakel Z.292 bis 294
  var investDelta = neuFossilOn ? mehrInvest : nettoInvest;
  var be = investDelta<=0?0:null;
  for (var i = 0; i < data.length; i++) {
    if (be===null && data[i].cumSav >= investDelta) { be = data[i].j; break; }
  }
  var beSofort = investDelta <= 0;

  // 3-Wege-Vergleich. Orakel Z.296 bis 306
  function fossilOpSum(fuel) {
    var sum=0;for(var j=1;j<=laufzeit;j++)sum+=kvJahreskosten(j,fuel,inputs,params,rechenSystem,0,0).fossilG;
    return sum;
  }
  var opGas = fossilOpSum('gas'), opOel = fossilOpSum('oel'), opWP = last.cumWPKosten;
  var tcoGas = gasInvest + opGas, tcoOel = oelInvest + opOel, tcoWP = nettoInvest + opWP;
  var bestFoss = Math.min(tcoGas, tcoOel);
  var dreiWegeVorteil = bestFoss - tcoWP;

  // EINE Vorteilsformel überall. Orakel Z.310
  var wpNG = last.cumSav - investDelta;

  // Finanzierung. Orakel Z.318 bis 329
  var kredN = kredLZ * 12;
  function annuity(betrag) {
    var r = kredZins / 12, n = kredN;
    return r > 0 ? betrag * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : betrag / n;
  }
  var kreditBetrag = nettoInvest;
  var monRate = annuity(nettoInvest);
  var monRateFossil = annuity(fossilInvest);
  var monWPStrom = data[0] ? data[0].wpGes / 12 : 0;
  var monFossil = data[0] ? data[0].fossilG / 12 : 0;
  var monGesWP = monRate + monWPStrom;
  var monDiff = monFossil - monGesWP;
  var zinsKosten = finanzOn ? monRate * kredN - kreditBetrag : 0;
  var zinsFossil = (finanzOn && neuFossilOn) ? monRateFossil * kredN - fossilInvest : 0;
  var zinsDelta = zinsKosten - zinsFossil;
  var wpMon = monRate + monWPStrom;
  var fossMon = monRateFossil + monFossil;
  var dCf = fossMon - wpMon;

  // [Orakel rundet] Z.332
  var immoWert = immoOn ? Math.round(hausW * immoP) : 0;

  // CO2-Summen. [Orakel rundet] Z.335 bis 340
  var co2Total = Math.round(co2SavedMix * 10) / 10;
  var co2Oeko = Math.round(co2FossilSum * 10) / 10;
  var co2ProJ = Math.round(co2SavedMix / laufzeit * 10) / 10;
  var fluege = Math.round(co2Total / params.co2FlugT);
  var baeume = Math.round(co2Total * 1000 / params.co2BaumKg);

  // Sensitivität. Orakel Z.343 bis 361
  function runScenario(gasDelta, stromDelta) {
    var sum=0;for(var j=1;j<=laufzeit;j++){var d=kvJahreskosten(j,vglFuel,inputs,params,rechenSystem,gasDelta,stromDelta);sum+=d.fossilG-d.wpGes;}
    return {wpNG:sum-investDelta};
  }
  var sBest = runScenario(params.sensi.best.fossil, params.sensi.best.strom);
  var sBase = runScenario(params.sensi.base.fossil, params.sensi.base.strom);
  var sWorst = runScenario(params.sensi.worst.fossil, params.sensi.worst.strom);

  // Degressions-Treppe (renderFoerderTreppe, Orakel Z.62 bis 78): Quote je
  // Reform-Periode mit den AKTUELLEN Bonus-Eingaben. Nur die Reform-Perioden,
  // die Alt-Zeile bleibt aussen vor (Orakel Z.67 iteriert nur ueber FOERDER_HJ).
  var foerderTreppe = params.periodenReihenfolge.map(function (key) {
    var alt = {};
    for (var kk in inputs) { if (Object.prototype.hasOwnProperty.call(inputs, kk)) alt[kk] = inputs[kk]; }
    alt.fHalbjahr = key;
    var fi = kvFoerder(alt, params);
    // Euro-Zuschuss je Stufe nach dem ANZEIGE-Pfad (Kanon 1.2): Basis ist die Investition,
    // gekappt auf die Grenze DIESER Periode, gerundet wie anzeigeBetrag (Orakel Z.135).
    var basisStufe = Math.min(investWP, fi.grenze);
    return {
      periode: key, quote: fi.q, label: fi.label,
      grenze: fi.grenze, basis: basisStufe,
      betrag: Math.round(basisStufe * fi.q / 100)
    };
  });

  // Anzeige-Pfad Förderbox (updateFoerderung, Orakel Z.124 bis 142).
  // [Orakel rundet] Z.135: hier rundet die ANZEIGE, anders als fBetrag oben.
  var anzeigeBetrag = extern?totalFoerd:Math.round(fBasis * fInfo.q / 100);

  // Live-Förderbox des Wizards (renderLiveFoerder, Orakel Z.1006 bis 1035)
  var pkOn = !!inputs.proklimaTog;
  var liveZuschuss = pkWP > 0
    ? Math.max(anzeigeBetrag, Math.min(anzeigeBetrag + pkWP, Math.round(params.kumCapPct * investWP)))
    : anzeigeBetrag;
  var liveEigen = investWP - liveZuschuss;

  // Datenschutz-Variante für den Lead (kv_contract.md Abschnitt 4): Quote OHNE
  // Einkommensbonus. Damit kann der Client einen Lead bauen, aus dem sich die
  // Einkommensklasse NICHT zurückrechnen lässt. Kein Orakel-Gegenstück
  // (die Zahl wird im Rechner nirgends angezeigt) → nicht äquivalenz-geprüft.
  var quoteOhneEink = Math.min(fInfo.g + fInfo.k + fInfo.eff, fInfo.cap);
  var zuschussOhneEink = Math.round(fBasis * quoteOhneEink / 100);

  return {
    service: 'kostenvergleich',
    inputsEcho: inputs,

    foerder: {
      extern:extern,
      periode: fInfo.periode, label: fInfo.label,
      euDifferenzierung: fInfo.eu,
      grundPct: fInfo.grundPct, grund: fInfo.g,
      klimaPct: fInfo.klimaPct, klima: fInfo.k,
      einkommen: fInfo.e, effizienz: fInfo.eff,
      zvE: fInfo.zvE, anrechenbar: fInfo.anr,
      summe: fInfo.sum, quote: fInfo.q, cap: fInfo.cap, gekappt: fInfo.sum > fInfo.cap,
      grenze: fInfo.grenze, basis: fBasis,
      betrag: fBetrag,                 // Engine, ungerundet (Kanon 1.2)
      anzeigeBetrag: anzeigeBetrag,    // Anzeige-Pfad Förderbox, gerundet
      netto: investWP - anzeigeBetrag,
      proKlima: pkWP, proKlimaErlaubt: pkAllowed, proKlimaOptIn: pkOn,
      proKlimaEffektiv: liveZuschuss - anzeigeBetrag,
      liveZuschuss: liveZuschuss, liveEigenanteil: liveEigen,
      kumCap: kumCap, totalFoerderung: totalFoerd,
      treppe: foerderTreppe,
      // nur für den Lead, siehe oben. NICHT für die Anzeige verwenden.
      quoteOhneEinkommen: quoteOhneEink,
      zuschussOhneEinkommen: zuschussOhneEink,
      eigenanteilOhneEinkommen: investWP - zuschussOhneEink
    },

    invest: {
      brutto: investWP, netto: nettoInvest,
      fossilInvest: fossilInvest, mehrInvest: mehrInvest, investDelta: investDelta,
      gasInvest: gasInvest, oelInvest: oelInvest
    },

    system: {
      vglFuel: vglFuel, heizart: heizart,
      heizLabel: vglFuel === 'gas' ? 'Gas' : 'Öl',
      heizLabelBestand: heizart === 'gas' ? 'Gas' : 'Öl',
      wpStrom: wpStrom, fossilVerbrauch: fossilVerbrauch,
      jazInfo:jazInfo, jazTabellenstand:params.jazTabellenstand||"Gebündelter Tabellenstand 26.10.2026", wwZuschlag:wwZuschlag, startJahr:startY,
      nutzwaerme: nutzwaerme, etaProzent: inputs.eta, jaz: jaz, laufzeit: laufzeit,
      neuFossilOn: neuFossilOn, bioOn: bioOn, bioFak: bioFak
    },

    ergebnis: {
      cumSav: last.cumSav, wpNG: wpNG, wpNGFinanziert: wpNG - zinsDelta,
      breakEven: be, breakEvenSofort: beSofort,
      totFossil: last.cumFossil, totWPK: last.cumWPKosten, totMehr: last.cumMehr,
      sparProJahr: last.cumSav / laufzeit
    },

    dreiWege: {
      aktiv: neuFossilOn,
      oel: { invest: oelInvest, betrieb: opOel, gesamt: tcoOel },
      gas: { invest: gasInvest, betrieb: opGas, gesamt: tcoGas },
      wp: { invest: nettoInvest, betrieb: opWP, gesamt: tcoWP },
      bestFossil: bestFoss, vorteil: dreiWegeVorteil
    },

    finanzierung: {
      aktiv: finanzOn, kreditBetrag: finanzOn ? kreditBetrag : null, kredLZ: kredLZ,
      kredZinsProzent: finanzOn ? kredZins * 100 : null, kredN: finanzOn ? kredN : null,
      monRate: finanzOn ? monRate : null,
      monRateFossil: finanzOn ? monRateFossil : null,
      monWPStrom: monWPStrom, monFossil: monFossil,
      monGesWP: finanzOn ? monGesWP : null,
      monDiff: finanzOn ? monDiff : null,
      wpMon: finanzOn ? wpMon : null,
      fossMon: finanzOn ? fossMon : null,
      monVorteil: finanzOn ? dCf : null,
      zinsKosten: zinsKosten, zinsFossil: zinsFossil, zinsDelta: zinsDelta,
      gesamtkostenKredit: finanzOn ? monRate * kredN : null,
      // Betriebskosten-Monatswerte am Kreditende. Orakel Z.557 und Z.570
      endJahrIndex: Math.min(kredLZ, laufzeit) - 1,
      endWpMon: data[Math.min(kredLZ, laufzeit) - 1] ? data[Math.min(kredLZ, laufzeit) - 1].wpGes / 12 : 0,
      endFossilMon: data[Math.min(kredLZ, laufzeit) - 1] ? data[Math.min(kredLZ, laufzeit) - 1].fossilG / 12 : 0
    },

    immo: { aktiv: immoOn, hausWert: hausW, prozent: immoP * 100, wertzuwachs: immoWert },

    dynTarif: {
      aktiv: dynTarifOn, anteil: dynAnteil, spread: dynSpread,
      // [Orakel rundet] Z.396 und Z.664
      ersparnisProJahr: Math.round(data[0].dynSav)
    },

    co2: {
      gesamt: co2Total, oeko: co2Oeko, proJahr: co2ProJ,
      fluege: fluege, baeume: baeume,
      faktor: co2Fac, tonnenProJahr: co2TPJ
    },

    sensi: {
      best: sBest.wpNG, basis: sBase.wpNG, worst: sWorst.wpNG,
      bestFossilStg: (fossilStg + params.sensi.best.fossil) * 100,
      bestStromStg: (stromE + params.sensi.best.strom) * 100,
      worstFossilStg: (fossilStg + params.sensi.worst.fossil) * 100,
      worstStromStg: (stromE + params.sensi.worst.strom) * 100
    },

    posten: (function(){var o={};['grundpreisGas','schornsteinfeger','netzentgelt','modul14a','wpGrundpreis','pvSav','bioAufschlag','bioCo2Entlastung','bioNetto','wwStromK'].forEach(function(k){o[k]=data.reduce(function(s,d){return s+d[k];},0);});return o;})(),
    quellen: {bio:'GModG § 43 Abs. 1, BGBl. 2026 I Nr. 226',bioPreis:'BDEW Januar 2026; Preisannahme, kein Gesetz',bioHinweis:params.bioHinweis||bioStand.hinweis,netzentgelt:params.netzentgelt.quelle,netzentgeltAbrufdatum:params.netzentgelt.abrufdatum,modul14a:'enercity Netz, Preisblatt 2026; außerhalb des Netzgebiets Annahme'},
    annahmen: {
      bedarf: bedarf, fossilP0: fossilP0, fossilStgProzent: fossilStg * 100,
      stromP0: inputs.wpZaehler?inputs.wpArbeitspreis:stromP0, stromEProzent: stromE * 100,
      co2P0: co2P0, co2Ziel: co2Ziel, co2ZielJahr:params.co2ZielJahr,
      etaNeuGas: params.etaNeu.gas * 100, etaNeuOel: params.etaNeu.oel * 100,
      wartungWp: params.wartungFossil, wartungFossil: params.wartungFossil
    },

    // Jahresreihen für Tabelle und Diagramme. Reihenfolge = Anzeige-Reihenfolge.
    jahre: data,

    charts: {
      labels: data.map(function (d) { return String(d.cY); }),
      // Chart 1 [Orakel rundet] Z.437
      vermoegen: data.map(function (d) { return Math.round(d.cumSav - investDelta); }),
      nullLinie: data.map(function () { return 0; }),
      // Chart 2, ungerundet. Orakel Z.469 bis 479
      sparEnergieCo2: data.map(function (d) { return fossilVerbrauch * d.fossilBP / 100 + d.co2St + d.bioCo2Entlastung - d.wpStromK; }),
      grundpreisGas:data.map(function(d){return d.grundpreisGas;}),schornsteinfeger:data.map(function(d){return d.schornsteinfeger;}),netzentgelt:data.map(function(d){return d.netzentgelt;}),modul14a:data.map(function(d){return d.modul14a;}),wpGrundpreis:data.map(function(d){return -d.wpGrundpreis;}),pv:data.map(function(d){return d.pvSav;}),warmwasser:data.map(function(d){return d.wwStromK;}),bioNetto:data.map(function(d){return d.bioNetto;}),
      sparDyn: data.map(function (d) { return d.dynSav; }),
      bioAufschlag: data.map(function (d) { return d.fossilK - fossilVerbrauch * d.fossilBP / 100; }),
      wartungDelta: data.map(function (d) { return -(d.wpW - d.fossilW); }),
      // Chart 3 [Orakel rundet] Z.507 bis 513
      heizFossil: data.map(function (d) { return Math.round(d.fossilG); }),
      heizWp: data.map(function (d) { return Math.round(d.wpGes); }),
      heizDiff: data.map(function (d) { return Math.round(d.mehrK); })
    }
  };
}

/* ===================== BOOTSTRAP ===================== */

/**
 * Anzeige- und Metadaten für den Thin-Client. Enthält KEINE Rechenlogik:
 * nur Perioden-Anzeigedaten, eta-Matrix mit Herkunftstexten, Defaults und
 * Schätz-Fragen-Metadaten. Siehe kv_contract.md Abschnitt 3.
 */
function kvBootstrapPayload(params) {
  params = params || KV_PARAMS_SEED;
  var schaetzung = params.schaetzung || KV_SCHAETZUNG;
  var perioden = params.periodenReihenfolge.map(function (key) {
    var p = params.perioden[key];
    return {
      key: key, label: p.label, klimaPct: p.klima, grenze: p.grenze,
      euDifferenzierung: p.eu, cap: p.cap
    };
  });
  // Die Engine behält proKlima vollständig für das eingefrorene
  // Äquivalenz-Gate. Im öffentlichen Bootstrap gibt es dagegen weder einen
  // Schalter noch ein Perioden- oder Hinweisfeld dazu (GF-Entscheid 15.07.).
  var clientDefaults = {};
  for (var key in KV_DEFAULTS) {
    if (Object.prototype.hasOwnProperty.call(KV_DEFAULTS, key) && key !== 'proklimaTog') {
      clientDefaults[key] = KV_DEFAULTS[key];
    }
  }
  clientDefaults.kredZins = params.kredZins358Eff;
  clientDefaults.grundpreisGas=params.grundpreisGas;clientDefaults.pvAnteil=params.pvAnteil;clientDefaults.pvKosten=params.pvKosten;
  return {
    service: 'kv_bootstrap',
    jaz: {quelle:'BWP-JAZ-Rechner nach VDI 4650 Blatt 1:2024-02',heizsysteme:['heizkoerper','fbh']},
    bioHinweis:params.bioHinweis||null,netzentgeltBereit:!!(params.netzentgelt&&params.netzentgelt.jahreswerte.length),
    perioden: perioden,
    defaults: clientDefaults,
    kredit: {
      zins358Eff: params.kredZins358Eff,
      zins359Eff: params.kredZins359Eff,
      zveGrenze: params.kredZinsZveGrenze,
      bereitstellungProv: params.kredBereitstellungProv,
      stand: params.kredZinsStand,
      quelle: params.kredZinsQuelle
    },
    etaMatrix: KV_ETA_MATRIX,
    schaetzung: schaetzung,
    hinweise: {
      kappung: 'Mehr als 80 Prozent Zuschuss gibt es nicht.',
      unverbindlich: 'Unverbindliche Berechnung, ohne Gewähr.'
    }
  };
}

/**
 * Startwerte = Orakel-HTML-Startwerte (verifiziert gegen WP_Rechner_HeroWerk.html).
 * Der Client belegt seine Regler damit vor, der Server nutzt sie als Fallback
 * für fehlende Request-Parameter.
 */
var KV_DEFAULTS = {
  heizart: 'gas', bedarf: 20000, eta: 85, invWP: 30000, jaz: 3.8, laufzeit: 20,
  // oelInvest 17500 seit 30.07.2026 (GF-Entscheid M5, Marktanalyse Niedersachsen
  // 12.000 bis 22.000 EUR inkl. Tank-Erneuerung und Warmwasser).
  neuFossilTog: true, vglBrennstoff: 'gas', gasInvest: 12000, oelInvest: 17500,
  gaspreis: 12, gasStg: 2.5, oelpreis: 11, oelStg: 2.5,
  strompreis: 32, stromEntw: 1.5, co2preis: 55, co2Pfad: 250,
  bioTog: true, bioAufpreis: 2.5,
  fHalbjahr: 'h2-2026', fGrund: true, fEU: true, fKlima: true, fAlt20: true,
  fEinkSlider: 60000, fKind: false, proklimaTog: false, fEffizienz: false,
  finanzTog: false, kredLZ: 10, kredZins: KV_PARAMS_SEED.kredZins358Eff,
  immoTog: false, hausW: 350000, immoP: 7,
  dynTarifTog: false, dynAnteil: 40, dynSpread: 10,
  heizsystem:null,geraet:'',startJahr:null,pvTog:false,pvAnteil:30,pvKosten:7,foerderBetragExtern:null,grundpreisGas:250.38,wpZaehler:false,wpArbeitspreis:null,wpGrundpreis:null,netzentgeltTog:false,modul14a:'modul1',warmwasserBisherZentral:true,warmwasserKuenftigZentral:true,personen:null,
  modus: 'kunde'
};

/**
 * Kessel-Nutzungsgrad-Matrix mit Herkunftstexten. Port von wzEtaDefault()
 * (Orakel Z.896 bis 919). Reine Vorbelegung: der Client schickt den Endwert
 * als eta mit, der Server rechnet nur mit eta.
 * Quellen: Verbraucherzentrale NRW 2020, BEE/ECONSULT-Feldstudien 2018, Stand 15.07.2026.
 */
var KV_ETA_MATRIX = {
  fallback: { wert: 85, label: null, text: 'Wir rechnen mit einem marktüblichen Mittelwert von 85 %. Sie können den Regler jederzeit selbst anpassen.' },
  regeln: [
    { rohr: 'unklar', kbj: null, heizart: null, wert: 85, label: null },
    { rohr: 'metall', kbj: 'vor1990', heizart: null, wert: 70, label: 'ältere Heizung ohne Brennwerttechnik (vor 1990)' },
    { rohr: 'metall', kbj: '*', heizart: null, wert: 80, label: 'Heizung ohne Brennwerttechnik (Niedertemperaturkessel)' },
    { rohr: 'kunststoff', kbj: 'nach2010', heizart: null, wert: 93, label: 'Brennwert-Heizung junger Generation (nach 2010)' },
    { rohr: 'kunststoff', kbj: '*', heizart: 'gas', wert: 86, label: 'Brennwert-Heizung älterer Generation' },
    { rohr: 'kunststoff', kbj: '*', heizart: 'oel', wert: 90, label: 'Brennwert-Heizung älterer Generation' }
  ],
  quelle: 'Verbraucherzentrale NRW 2020, BEE/ECONSULT-Feldstudien 2018, Stand 15.07.2026',
  textVorbelegt: 'Vorbelegt aus Ihren Angaben: {label}, typisch rund {wert} % der abgerechneten Energie (Quellen: Verbraucherzentrale NRW 2020, BEE/ECONSULT-Feldstudien 2018, Stand 15.07.2026). Sie können den Regler jederzeit selbst anpassen.',
  textEigen: 'Sie haben den Wert selbst eingestellt. Typisch für {label}: rund {wert} % der abgerechneten Energie.'
};

/**
 * Metadaten der Schätz-Fragen (Wizard Schritt 1, Verbrauch unbekannt).
 * Port von WZ_SPEZ/WZ_STUFEN/WZ_GEBF/WZ_UNIT_F und wzUpdateEstimate()
 * (Orakel Z.778 bis 781, Z.860 bis 873).
 * Die Schätzformel selbst rechnet der Server (Route kv_bootstrap liefert nur
 * die Metadaten; der Client schickt das Ergebnis als bedarf).
 */
var KV_SCHAETZUNG = {
  spezVerbrauch: { 'vor1978': 180, '1978-1994': 140, '1995-2010': 100, 'nach2010': 60 },
  stufen: ['vor1978', '1978-1994', '1995-2010', 'nach2010'],
  gebaeudeFaktor: { efh: 1.0, dhh: 0.9, rh: 0.85, zfh: 0.95, mfh: 0.85 },
  sanierungSprung: { nein: 0, teilweise: 1, umfassend: 2 },
  einheitFaktor: 10,        // m³ Gas bzw. Liter Heizöl → kWh
  rundungKwh: 500,
  bedarfMin: 5000, bedarfMax: 80000, bedarfStep: 500,
  flaecheDefault: 140,
  quelle: 'N2-Schätzkonstanten, belegt aus herowerk-website apps-script/rechner-backend/Code.gs (Dimensionierungsrechner)'
};

/**
 * Verbrauchsschätzung aus Gebäudedaten. Port von wzUpdateEstimate() (Orakel Z.860 bis 873).
 * Rein rechnerisch, kein DOM.
 */
function kvSchaetzeBedarf(geb, bj, san, flaeche, params) {
  params = params || KV_PARAMS_SEED;
  var S = params.schaetzung || KV_SCHAETZUNG;
  var idx = S.stufen.indexOf(bj);
  if (idx < 0) return null;
  var sprung = S.sanierungSprung[san] || 0;
  idx = Math.min(idx + sprung, S.stufen.length - 1);
  var kwh = Math.round(flaeche * S.spezVerbrauch[S.stufen[idx]] * S.gebaeudeFaktor[geb] / S.rundungKwh) * S.rundungKwh;
  return Math.min(S.bedarfMax, Math.max(S.bedarfMin, Math.round(kwh / S.bedarfStep) * S.bedarfStep));
}

/* ===================== NODE-EXPORT (Testbarkeit) ===================== */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    kvBioStand:kvBioStand,kvNutzenParameter:kvNutzenParameter,kvNutzenEingaben:kvNutzenEingaben,kvNutzenRequest:kvNutzenRequest,kvJazAusZeilen:kvJazAusZeilen,KV_JAZ_ROWS_:KV_JAZ_ROWS_,KV_JAZ_SEED:KV_JAZ_SEED,
    kvCalculate: kvCalculate,
    kvFoerder: kvFoerder,
    kvPeriodeFuerDatum: kvPeriodeFuerDatum,
    kvBootstrapPayload: kvBootstrapPayload,
    kvSchaetzeBedarf: kvSchaetzeBedarf,
    kvBioAnteil: kvBioAnteil,
    kvMixG: kvMixG,
    KV_PARAMS_SEED: KV_PARAMS_SEED,
    KV_DEFAULTS: KV_DEFAULTS,
    KV_ETA_MATRIX: KV_ETA_MATRIX,
    KV_SCHAETZUNG: KV_SCHAETZUNG
  };
}
