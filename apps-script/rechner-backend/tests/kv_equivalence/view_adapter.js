/**
 * view_adapter.js — Referenz-Renderer des Thin-Clients (Vorlage fuer Schritt B7).
 *
 * Baut aus dem kvCalculate-Payload EXAKT die Anzeige-Texte, die das Orakel heute
 * im Browser erzeugt: gleiche Werte, gleiche Reihenfolge, gleiche Formatierung
 * (eur() = Math.round + toLocaleString('de-DE')).
 *
 * Zweck 1: Aequivalenz-Beweis. Die Zahlen dieser Texte werden gegen die Zahlen
 *          der Orakel-DOM-Ausgaben verglichen (run_equivalence.js).
 * Zweck 2: Der Client in B7 rendert nach genau dieser Vorlage.
 *
 * WICHTIG (Kanon 1.2): Hier, in der ANZEIGE, wird gerundet. Die Engine liefert
 * ungerundete Werte. Jede Rundung steht in dieser Datei, keine in kv_engine.gs
 * ausser den im Orakel selbst gerundeten Stellen.
 */
'use strict';

const de = v => Number(v).toLocaleString('de-DE');
const eur = v => Math.round(v).toLocaleString('de-DE') + ' €';
/** Orakel-Muster: positiv → eur(v), sonst '−' + eur(|v|). Orakel Z.368 */
const eurSigned = v => (v > 0 ? eur(v) : '−' + eur(Math.abs(v)));
const fix = (v, n) => Number(v).toFixed(n).replace('.', ',');

/* ---------- Foerderbox (updateFoerderung, Orakel Z.124 bis 142) ---------- */
function foerderBox(p) {
  const f = p.foerder;
  return {
    vFEink: de(f.zvE) + ' €',
    fEinkAnr: de(f.anrechenbar) + ' €',
    fEinkBonusLbl: '+' + f.einkommen + ' %',
    fGrundPct: f.grundPct + ' %',
    fKlimaPct: f.klimaPct + ' %',
    fQuote: f.quote + ' %' + (f.gekappt ? ' (gekappt)' : ''),
    fGrenzeLbl: de(f.grenze) + ' €',
    fBasis: de(f.basis) + ' €',
    fBetrag: de(f.anzeigeBetrag) + ' €',
    fNetto: de(f.netto) + ' €'
  };
}

/* ---------- pathSummary (Orakel Z.364 bis 375) ---------- */
function pathSummary(p) {
  const s = p.system, e = p.ergebnis, i = p.invest, fin = p.finanzierung;
  let t = eur(i.netto);
  if (s.neuFossilOn) t += ' | ' + eur(i.fossilInvest) + ' | ' + eurSigned(i.mehrInvest);
  t += ' | ' + s.laufzeit + ' Jahre ' + eur(e.totWPK);
  t += ' | ' + s.laufzeit + ' Jahre ' + eur(e.cumSav);
  t += ' | ' + eur(e.wpNG);
  if (fin.aktiv) {
    t += ' | ' + fin.kredLZ + ' J. ' + (fin.zinsDelta >= 0 ? '-' : '+') + eur(Math.abs(fin.zinsDelta));
    t += ' | ' + eur(e.wpNGFinanziert);
  }
  return t;
}

/* ---------- KPI-Grid (Orakel Z.378 bis 397) ---------- */
function kpiCards(p) {
  const s = p.system, e = p.ergebnis, i = p.invest, f = p.foerder, fin = p.finanzierung;
  const cards = [];
  cards.push({
    l: 'Anschaffung nach Förderung',
    v: eur(i.netto),
    s: 'Brutto ' + eur(i.brutto) + ' · Förderung ' + eur(f.totalFoerderung)
  });
  if (s.neuFossilOn) {
    cards.push({
      l: 'Mehrpreis gegenüber neuer ' + s.heizLabel + 'heizung',
      v: eurSigned(i.mehrInvest),
      s: i.mehrInvest > 0
        ? 'Wärmepumpe netto ' + eur(i.netto) + ' − Neuanlage ' + eur(i.fossilInvest)
        : 'Wärmepumpe schon in der Anschaffung günstiger'
    });
  }
  cards.push({
    l: 'Ausgeglichen ab',
    v: e.breakEvenSofort ? 'Sofort' : (e.breakEven ? 'Jahr ' + e.breakEven : '> ' + s.laufzeit + ' J.'),
    s: e.breakEvenSofort
      ? 'Ab Tag 1 günstiger als neue ' + s.heizLabel + 'heizung'
      : (e.breakEven
        ? (s.neuFossilOn ? 'Mehrpreis nach ' + e.breakEven + ' Jahren zurück' : 'Amortisiert nach ' + e.breakEven + ' Jahren (Barzahlung)')
        : 'Nicht in Laufzeit')
  });
  cards.push({
    l: 'Einsparung ' + s.laufzeit + ' J.',
    v: eur(e.cumSav),
    s: 'Ø ' + eur(e.sparProJahr) + '/Jahr · gegenüber laufenden fossilen Kosten'
  });
  cards.push({
    l: 'CO₂ eingespart',
    v: fix(p.co2.gesamt, 1) + ' t',
    s: 'Strommix-Bilanz · mit Ökostrom bis zu ' + fix(p.co2.oeko, 1) + ' t'
  });
  if (fin.aktiv) {
    if (s.neuFossilOn) {
      cards.push({
        l: 'Monatl. Vorteil (finanziert)',
        v: (fin.monVorteil >= 0 ? '+' : '−') + Math.abs(Math.round(fin.monVorteil)) + ' €/Mo.',
        s: 'Neue ' + s.heizLabel + 'heizung ' + Math.round(fin.fossMon) + ' € gegen Wärmepumpe ' + Math.round(fin.wpMon) + ' €'
      });
    } else {
      cards.push({
        l: 'Monatl. Cashflow (1. J.)',
        v: (fin.monDiff >= 0 ? '+' : '') + Math.round(fin.monDiff) + ' €/Mo.',
        s: Math.round(fin.monFossil) + ' € Fossil gegen ' + Math.round(fin.monGesWP) + ' € Wärmepumpe plus Rate'
      });
    }
  }
  if (p.immo.aktiv) {
    cards.push({
      l: 'Immobilien-Wertzuwachs',
      v: '+' + eur(p.immo.wertzuwachs),
      s: Math.round(p.immo.prozent) + ' % von ' + eur(p.immo.hausWert)
    });
  }
  if (p.dynTarif.aktiv) {
    cards.push({
      l: 'Dyn. Tarif Ersparnis/J.',
      v: '~' + eur(p.dynTarif.ersparnisProJahr),
      s: p.dynTarif.anteil + '% im Niedrigtarif, ' + p.dynTarif.spread + ' ct Spread'
    });
  }
  return cards;
}

/* ---------- 3-Wege-Vergleich (Orakel Z.400 bis 418) ---------- */
function dreiWege(p) {
  if (!p.dreiWege.aktiv) return null;
  const d = p.dreiWege, s = p.system, i = p.invest;
  const rows = [
    { n: 'Neue Ölheizung', inv: d.oel.invest, op: d.oel.betrieb, tco: d.oel.gesamt },
    { n: 'Neue Gasheizung', inv: d.gas.invest, op: d.gas.betrieb, tco: d.gas.gesamt },
    { n: 'Neue Wärmepumpe', inv: d.wp.invest, op: d.wp.betrieb, tco: d.wp.gesamt }
  ];
  // Kopfzeile: "Gesamtkosten über ${laufzeit} Jahre ... kommenden ${laufzeit} Jahre."
  let t = s.laufzeit + ' Jahre ' + s.laufzeit + ' Jahre';
  rows.forEach(r => {
    t += ' | ' + eur(r.inv) + ' | ' + s.laufzeit + ' Jahre ' + eur(r.op) + ' | ' + s.laufzeit + ' Jahre ' + eur(r.tco);
  });
  if (d.vorteil >= 0) {
    t += ' | Über ' + s.laufzeit + ' Jahre ' + eur(d.vorteil) + ' günstiger';
    if (i.mehrInvest > 0) t += ' Mehrinvestition ' + eur(i.mehrInvest);
  } else {
    t += ' | ' + eur(-d.vorteil) + ' unter der Wärmepumpe';
  }
  return t;
}

/* ---------- Cashflow-Box (Orakel Z.543 bis 576) ---------- */
function cashflow(p) {
  if (!p.finanzierung.aktiv) return null;
  const fin = p.finanzierung, s = p.system, i = p.invest;
  let t = '';
  if (s.neuFossilOn) {
    // Karte 1: fossMon | Rate + Brennstoff. Orakel Z.552
    t += Math.round(fin.fossMon).toLocaleString('de-DE') + ' €/Mo. ' + Math.round(fin.monRateFossil) + ' € Rate + ' + Math.round(fin.monFossil) + ' € Brennstoff · steigend';
    // Karte 2. Orakel Z.553
    t += ' | ' + Math.round(fin.wpMon).toLocaleString('de-DE') + ' €/Mo. ' + Math.round(fin.monRate) + ' € Rate + ' + Math.round(fin.monWPStrom) + ' € Strom/Wartung';
    // Karte 3: Vorzeichen-Praefix wie im Orakel, Sub-Text traegt bei dCf>=0 eine "1". Orakel Z.554
    t += ' | ' + (fin.monVorteil >= 0 ? '+' : '−') + Math.abs(Math.round(fin.monVorteil)).toLocaleString('de-DE') + ' €/Mo.';
    t += ' ' + (fin.monVorteil >= 0 ? 'Wärmepumpe günstiger, ab dem 1. Monat' : 'Amortisiert sich über die Jahre');
    // Infobox. Orakel Z.557
    t += ' | ' + (fin.kredLZ <= s.laufzeit ? 'Nach Kreditende (' + fin.kredLZ + ' J.)' : 'Am Ende des Betrachtungszeitraums (' + s.laufzeit + ' J.)');
    t += ' ~' + Math.round(fin.endWpMon) + ' €/Mo. ~' + Math.round(fin.endFossilMon) + ' €/Mo.';
    // Quellzeile. Orakel Z.558
    t += ' | ' + eur(i.netto) + ' ' + eur(i.fossilInvest) + ' je ' + fin.kredLZ + ' J. zu ' + fix(fin.kredZinsProzent, 1) + ' % nominal';
    t += ' Raten: ' + eur(Math.round(fin.monRate)) + ' ' + eur(Math.round(fin.monRateFossil));
  } else {
    // Einleitung traegt "Schritt 1". Orakel Z.563
    t += 'Aktivieren Sie „Neue fossile Anlage" in Schritt 1 für den faireren Vergleich';
    // Karte 1: monFossil | "Im 1. Jahr · steigend". Orakel Z.565
    t += ' | ' + Math.round(fin.monFossil).toLocaleString('de-DE') + ' €/Mo. Im 1. Jahr · steigend';
    t += ' | ' + Math.round(fin.monGesWP).toLocaleString('de-DE') + ' €/Mo. ' + Math.round(fin.monRate) + ' € Rate + ' + Math.round(fin.monWPStrom) + ' € Strom/Wartung';
    t += ' | ' + (fin.monDiff >= 0 ? '+' : '−') + Math.abs(Math.round(fin.monDiff)).toLocaleString('de-DE') + ' €/Mo.';
    t += ' ' + (fin.monDiff >= 0 ? 'Günstiger trotz Kreditrate' : 'Amortisiert sich über die Jahre');
    t += ' | ' + (fin.kredLZ <= s.laufzeit ? 'Nach Kreditende (' + fin.kredLZ + ' J.)' : 'Am Ende des Betrachtungszeitraums (' + s.laufzeit + ' J., Kredit läuft noch)');
    t += ' ~' + Math.round(fin.endWpMon) + ' €/Mo. ~' + Math.round(fin.endFossilMon) + ' €/Mo.';
    t += ' | ' + eur(fin.kreditBetrag) + ', ' + fin.kredLZ + ' J., ' + fix(fin.kredZinsProzent, 1) + ' % nominal, monatl. Rate ' + eur(Math.round(fin.monRate));
    t += ' Gesamtkosten Kredit: ' + eur(Math.round(fin.gesamtkostenKredit));
  }
  return t;
}

/* ---------- CO2-Box (Orakel Z.579 bis 599) ---------- */
function co2Box(p) {
  const c = p.co2, s = p.system;
  return fix(c.gesamt, 1) + ' t CO₂ | in ' + s.laufzeit + ' Jahren (Ø ' + fix(c.proJahr, 1) + ' t/Jahr)'
    + ' | Ökostrom bis zu ' + fix(c.oeko, 1) + ' t'
    + ' | ' + c.fluege + ' Flüge (~0,5 t CO₂ pro Flug)'
    + ' | ' + c.baeume + ' Bäume (~12,5 kg CO₂/Baum/J.)'
    + ' | Kurzstreckenflug ~0,5 t CO₂, Baum ~12,5 kg';
}

/* ---------- Sensitivitaets-Box (Orakel Z.602 bis 618) ---------- */
function sensiBox(p) {
  const se = p.sensi, s = p.system;
  let t = eur(se.best) + ' | ' + eur(se.basis) + ' | ' + eur(se.worst);
  if (se.worst > 0) t += ' | Selbst im Worst Case ' + eur(se.worst) + ' im Plus.';
  t += ' | Über ' + s.laufzeit + ' Jahre';
  t += ' | Best: +' + fix(se.bestFossilStg, 1) + '%/J., Strom ' + fix(se.bestStromStg, 1) + '%/J.';
  t += ' | Worst: ' + fix(se.worstFossilStg, 1) + '%/J., Strom +' + fix(se.worstStromStg, 1) + '%/J.';
  return t;
}

/* ---------- Immo-Box (Orakel Z.621 bis 635) ---------- */
function immoBox(p) {
  if (!p.immo.aktiv) return null;
  const im = p.immo;
  // Einleitung traegt "ImmoScout24" → die 24 zaehlt als Zahl mit. Orakel Z.626
  return 'Immobilien mit besserer Energieeffizienzklasse (dena/ImmoScout24, Korrelation).'
    + ' | ' + eur(im.hausWert)
    + ' | +' + eur(im.wertzuwachs) + ' ' + Math.round(im.prozent) + ' % (dena/ImmoScout24-Spanne: 5 bis 15 %)'
    + ' | +' + eur(im.wertzuwachs)
    + ' | dena-Gebäudereport 2024, ImmoScout24-Energieausweis-Auswertung 2025';
}

/* ---------- Detail-Tabelle (Orakel Z.638 bis 651) ---------- */
function detTbl(p) {
  const bioOn = p.system.bioOn;
  return p.jahre.map(d => {
    let r = d.cY + ' | ' + fix(d.fossilEP, 1) + ' ct';
    if (bioOn) r += ' | ' + Number(d.bioP).toFixed(0) + '%';
    r += ' | ' + eur(d.fossilG) + ' | ' + eur(d.wpGes) + ' | ' + eur(d.mehrK) + ' | ' + eur(d.cumSav);
    return r;
  }).join(' || ');
}

/* ---------- Annahmen-Box (Orakel Z.654 bis 669) ---------- */
function assBox(p) {
  const s = p.system, a = p.annahmen, i = p.invest, e = p.ergebnis, f = p.foerder,
    fin = p.finanzierung, c = p.co2, d = p.dreiWege;
  let t = '';
  t += '• Bestandsheizung: ' + s.heizLabelBestand + ', ' + de(a.bedarf) + ' kWh Brennstoff/J., Nutzungsgrad '
    + Math.round(s.etaProzent) + ' % (Nutzwärme ' + de(Math.round(s.nutzwaerme)) + ' kWh) · WP-Strom: '
    + de(Math.round(s.wpStrom)) + ' kWh/J. (JAZ ' + fix(s.jaz, 1) + ')\n';
  t += '• ' + s.heizLabel + 'preis: ' + fix(a.fossilP0, 1) + ' ct/kWh, +' + fix(a.fossilStgProzent, 1) + '%/J.\n';
  if (s.neuFossilOn) {
    t += '• Vergleich Neuanlage: neue Gasheizung ' + eur(i.gasInvest) + ' / neue Ölheizung ' + eur(i.oelInvest)
      + ' inkl. Einbau (ohne Förderung) · Nutzungsgrad neue Kessel: Gas ' + a.etaNeuGas + ' % / Öl ' + a.etaNeuOel
      + ' % (gleiche Nutzwärme wie WP) · echte Mehrinvestition WP: ' + eurSigned(i.mehrInvest)
      + ' · Gesamtkosten ' + s.laufzeit + ' J.: Öl ' + eur(d.oel.gesamt) + ' / Gas ' + eur(d.gas.gesamt)
      + ' / WP ' + eur(d.wp.gesamt) + '\n';
  }
  if (s.bioOn) {
    t += '• Biotreppe (GEG §71/GMG): Stufen 15 % ab 2029 · 30 % ab 2035 · 60 % ab 2040 (gilt für neu eingebaute Kessel) · Bio-Aufpreis: '
      + s.bioFak + '× fossil\n';
  }
  t += '• Strom: ' + a.stromP0 + ' ct (konservativ Haushaltsstrom; WP-Tarife/§14a EnWG oft 22 bis 28 ct), '
    + fix(a.stromEProzent, 1) + '%/J. · CO₂: ' + a.co2P0 + '→' + a.co2Ziel + ' €/t bis 2045; gerechnet wird nur der Anstieg über heute, der heutige CO₂-Anteil steckt bereits im '
    + s.heizLabel + 'preis\n';
  t += '• CO₂-Bilanz: WP-Strom mit dt. Strommix 350→100 g/kWh (2026→2040, UBA/Agora) gegengerechnet; mit Ökostromtarif bilanziell bis zu '
    + fix(c.oeko, 1) + ' t · CO₂-Faktoren: Gas 0,182 (brennwertbezogen) / Öl 0,266 kg/kWh · Bio-Anteil bilanziell CO₂-frei gerechnet · Alle Geldwerte nominal, ohne Abzinsung\n';
  t += '• Wartung: WP ' + a.wartungWp + '€/J. · Fossil ' + a.wartungFossil + '€/J.';
  if (p.dynTarif.aktiv) {
    t += ' · Dyn. Tarif: ' + p.dynTarif.anteil + '% WP-Strom im Niedrigtarif, Ø ' + p.dynTarif.spread
      + ' ct Spread = ~' + eur(p.dynTarif.ersparnisProJahr) + '/J. Ersparnis (eingerechnet)\n';
  } else {
    t += '  · Tipp: Dyn. Stromtarif + SG-Ready = zusätzl. ~190 bis 580 €/J. Ersparnis je nach Anteil/Spread (nicht eingerechnet)\n';
  }
  if (fin.aktiv) {
    t += '• Finanzierung: ' + eur(fin.kreditBetrag) + ', ' + fin.kredLZ + ' J., ' + fix(fin.kredZinsProzent, 1)
      + '% nominal (KfW-Ergänzungskredit 358/359, Zins-Richtwert Stand 14.07.2026) → ' + eur(Math.round(fin.monRate)) + '/Mo. Rate\n';
  }
  if (p.immo.aktiv) {
    t += '• Immobilienwert: ' + eur(p.immo.hausWert) + ' × ' + Math.round(p.immo.prozent) + '% = +'
      + eur(p.immo.wertzuwachs) + ' Wertsteigerung (dena/ImmoScout24)\n';
  }
  t += '• Heizkosten: Fossil ' + s.laufzeit + 'J.: ' + eur(e.totFossil) + ' · WP-Strom ' + s.laufzeit + 'J.: '
    + eur(e.totWPK) + ' · Mehrkosten fossil: ' + eur(e.totMehr) + '\n';
  t += '• Förderung: KfW 458 ' + Math.round(f.quote) + '% (' + eur(f.betrag) + ') · Antragstellung ' + f.label
    + ', Bemessungsgrenze ' + eur(f.grenze) + ', BEG-Reform 21.07.2026'
    + (f.proKlima > 0 ? ' · proKlima WP: ' + eur(f.proKlima) : '') + '\n';
  t += '• Quellen: CO₂: Agora/UBA, EU-ETS2 · Energie: BMWK Energiepreisszenarien 2024 · Biotreppe: GEG §71(9) + GMG-Eckpunkte Feb. 2026 · Bio-Preise: Öko-Institut März 2026 + BDEW Gaspreisanalyse Jan. 2026 · Strommix: UBA/Agora · Förderung: KfW 458 / BEG-Reform 21.07.2026 (Stand 07/2026, ohne Gewähr)';
  return t;
}

module.exports = { foerderBox, pathSummary, kpiCards, dreiWege, cashflow, co2Box, sensiBox, immoBox, detTbl, assBox, eur, eurSigned, de, fix };
