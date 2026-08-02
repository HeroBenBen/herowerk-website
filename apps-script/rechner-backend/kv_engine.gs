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

  // --- Biotreppe GEG §71(9) als STUFEN. Orakel Z.151
  bioStufen: [{ y: 2029, p: 0.15 }, { y: 2035, p: 0.30 }, { y: 2040, p: 0.60 }],

  // --- Nutzungsgrad neuer Kessel. Orakel Z.236
  etaNeu: { gas: 0.95, oel: 0.93 },

  // --- Strommix g/kWh, linear. Orakel Z.158
  strommix: { startY: 2026, startG: 350, endY: 2040, endG: 100 },

  // --- Wartung €/Jahr. Orakel Z.257 (fossilW) und Z.271 (wpW)
  wartungWp: 350,
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
  params = params || KV_PARAMS_SEED;

  var heizart = inputs.heizart;
  var bedarf = inputs.bedarf;
  var eta = inputs.eta / 100;
  var investWP = inputs.invWP;
  var jaz = inputs.jaz;
  var laufzeit = inputs.laufzeit;

  // Orakel Z.171 bis 172: bioFak nur wenn bioTog an, sonst 1 (neutral)
  var bioOn = !!inputs.bioTog;
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
  var nettoInvest = Math.max(0, investWP - totalFoerd);

  var fossilInvest = vglFuel === 'gas' ? gasInvest : oelInvest;
  var mehrInvest = nettoInvest - fossilInvest;

  // Nutzwärme = Brennstoffverbrauch × Kessel-Nutzungsgrad. Orakel Z.234
  var wpStrom = bedarf * eta / jaz;
  var fossilVerbrauch = neuFossilOn ? bedarf * eta / params.etaNeu[vglFuel] : bedarf;

  var co2Fac = params.co2f[vglFuel];
  var co2TPJ = fossilVerbrauch * co2Fac / 1000;
  var startY = params.startY;
  var zielSchritte = params.co2ZielSchritte;

  // CO2-Preis im Schritt k. Orakel Z.240
  function co2PJ(k) {
    var t = co2Ziel, y = zielSchritte;
    return k >= y ? t : co2P0 + (t - co2P0) * k / y;
  }

  var data = [];
  var cumSav = 0, cumFossil = 0, cumMehr = 0, cumWPKosten = 0, co2SavedMix = 0, co2FossilSum = 0;

  for (var j = 1; j <= laufzeit; j++) {
    var cY = startY + j - 1;
    var fossilBP = fossilP0 * Math.pow(1 + fossilStg, j - 1);
    var fossilEP = fossilBP;
    if (bioOn) { var bA = kvBioAnteil(cY, params); fossilEP = fossilBP * (1 + bA * (bioFak - 1)); }
    var fossilK = fossilVerbrauch * fossilEP / 100;

    // Nur der CO2-Preis-ANSTIEG über heute wird angesetzt. Bio-Anteil bilanziell
    // CO2-frei. Orakel Z.253 bis 256
    var bAj = bioOn ? kvBioAnteil(cY, params) : 0;
    var co2St = co2TPJ * (1 - bAj) * (co2PJ(j - 1) - co2P0);
    var fossilW = params.wartungFossil;
    var fossilG = fossilK + co2St + fossilW;
    cumFossil += fossilG;
    co2FossilSum += co2TPJ * (1 - bAj);
    co2SavedMix += co2TPJ * (1 - bAj) - wpStrom * kvMixG(cY, params) / 1e6;

    var stromPJ = stromP0 * Math.pow(1 + stromE, j - 1);
    var wpStromK = wpStrom * stromPJ / 100;
    var wpW = params.wartungWp;
    var dynSav = 0;
    if (dynTarifOn) { dynSav = wpStrom * (dynAnteil / 100) * (dynSpread / 100); }
    var wpGes = wpStromK + wpW - dynSav;   // pvSav entfällt (pvOn im Orakel hart false)
    cumWPKosten += wpGes;
    var jSav = fossilG - wpGes;
    cumSav += jSav;
    var mehrK = fossilG - wpGes;           // Orakel Z.281: identisch zu jSav
    cumMehr += mehrK;

    data.push({
      j: j, cY: cY, fossilBP: fossilBP, fossilEP: fossilEP,
      bioP: bioOn ? kvBioAnteil(cY, params) * 100 : 0,
      fossilK: fossilK, co2St: co2St, fossilW: fossilW, fossilG: fossilG,
      wpStromK: wpStromK, pvSav: 0, dynSav: dynSav, wpW: wpW, wpGes: wpGes,
      mehrK: mehrK, cumMehr: cumMehr, jSav: jSav, cumSav: cumSav,
      cumFossil: cumFossil, cumWPKosten: cumWPKosten
    });
  }

  var last = data[data.length - 1];

  // Kanonische Vergleichsbasis. Orakel Z.292 bis 294
  var investDelta = neuFossilOn ? mehrInvest : nettoInvest;
  var be = null;
  for (var i = 0; i < data.length; i++) {
    if (data[i].cumSav >= Math.max(0, investDelta)) { be = data[i].j; break; }
  }
  var beSofort = neuFossilOn && investDelta <= 0;

  // 3-Wege-Vergleich. Orakel Z.296 bis 306
  function fossilOpSum(fuel) {
    var vb = neuFossilOn ? bedarf * eta / params.etaNeu[fuel] : bedarf;
    var p0 = fuel === 'gas' ? gasP0 : oelP0;
    var stg = fuel === 'gas' ? gasStgV : oelStgV;
    var cf = params.co2f[fuel];
    var cTPJ = vb * cf / 1000;
    var s = 0;
    for (var j2 = 1; j2 <= laufzeit; j2++) {
      var cY2 = startY + j2 - 1;
      var bp = p0 * Math.pow(1 + stg, j2 - 1);
      var bA2 = bioOn ? kvBioAnteil(cY2, params) : 0;
      var ep = bp * (1 + bA2 * (bioFak - 1));
      var k2 = vb * ep / 100;
      var co2 = cTPJ * (1 - bA2) * (co2PJ(j2 - 1) - co2P0);
      s += k2 + co2 + params.wartungFossil;
    }
    return s;
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
    var cSav = 0;
    for (var j3 = 1; j3 <= laufzeit; j3++) {
      var fBP = fossilP0 * Math.pow(1 + fossilStg + gasDelta, j3 - 1);
      var bA3 = bioOn ? kvBioAnteil(startY + j3 - 1, params) : 0;
      var fEP = fBP * (1 + bA3 * (bioFak - 1));
      var fK = fossilVerbrauch * fEP / 100;
      var co2S = co2TPJ * (1 - bA3) * (co2PJ(j3 - 1) - co2P0);
      var fG = fK + co2S + params.wartungFossil;
      var sPJ = stromP0 * Math.pow(1 + stromE + stromDelta, j3 - 1);
      var wSK = wpStrom * sPJ / 100;
      var dS = 0;
      if (dynTarifOn) dS = wpStrom * (dynAnteil / 100) * (dynSpread / 100);
      var wG = wSK + params.wartungWp - dS;
      cSav += fG - wG;
    }
    return { wpNG: cSav - investDelta };
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
  var anzeigeBetrag = Math.round(fBasis * fInfo.q / 100);

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
      nutzwaerme: bedarf * eta, etaProzent: inputs.eta, jaz: jaz, laufzeit: laufzeit,
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
      ersparnisProJahr: Math.round(wpStrom * (dynAnteil / 100) * (dynSpread / 100))
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

    annahmen: {
      bedarf: bedarf, fossilP0: fossilP0, fossilStgProzent: fossilStg * 100,
      stromP0: stromP0, stromEProzent: stromE * 100,
      co2P0: co2P0, co2Ziel: co2Ziel,
      etaNeuGas: params.etaNeu.gas * 100, etaNeuOel: params.etaNeu.oel * 100,
      wartungWp: params.wartungWp, wartungFossil: params.wartungFossil
    },

    // Jahresreihen für Tabelle und Diagramme. Reihenfolge = Anzeige-Reihenfolge.
    jahre: data,

    charts: {
      labels: data.map(function (d) { return String(d.cY); }),
      // Chart 1 [Orakel rundet] Z.437
      vermoegen: data.map(function (d) { return Math.round(d.cumSav - investDelta); }),
      nullLinie: data.map(function () { return 0; }),
      // Chart 2, ungerundet. Orakel Z.469 bis 479
      sparEnergieCo2: data.map(function (d) { return fossilVerbrauch * d.fossilBP / 100 + d.co2St - d.wpStromK; }),
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
  return {
    service: 'kv_bootstrap',
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
