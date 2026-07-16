/**
 * HeroWerk_Rechner_Backend — Code.gs (standalone Google Apps Script Web App)
 * Serverseitiger Spiegel der js/site.js-Rechnerlogik: Dimensionierung (wizCalculate),
 * KfW-458-Förderung (calculateFoerder), Wizard-Sofort-Förderblock und wizToFoerder.
 * Quelle/Port: HeroBenBen/herowerk-website js/site.js @ origin/main 0ea5151.
 * Tier-4 byte-genau bestaetigt 2026-06-17 (Testfaelle T1-T5 == heutige Seite, 2x unabhaengig nachgerechnet).
 * Parameter liegen in der privaten Google-Tabelle (setupSheets schreibt sie); Formeln im Code.
 * Einspielen ins Apps-Script-Projekt 1n4qidc... + setupSheets() + Re-Deploy = Cowork/Benjamin.
 */

/**
 * HeroWerk_Rechner_Backend — standalone Apps Script Web App.
 * Server-side mirror of js/site.js calculator logic without DOM/UI code.
 */
const SHEET_ID = '176a2khhd3eIJJwe23JXfuEaTTjY-qrkccxb-F52yoVA';
const SERVICE_NAME = 'HeroWerk Rechner Backend';
const CACHE_TTL_SECONDS = 300;
const ALLOWED_ORIGIN_RE = /(^|\.)herowerk\.de$/i;

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || 'health').toLowerCase();
  try {
    if (!isAllowedOrigin_(params)) return json_({ error: true, message: 'origin_not_allowed' });
    if (action === 'dimensionierung') return json_(dimensionierung_(params));
    if (action === 'foerderung') return json_(foerderung_(params));
    if (action === 'preise') return json_(preise_(params));
    if (action === 'kostenvergleich') return json_(kostenvergleich_(params));
    if (action === 'kv_bootstrap') return json_(kvBootstrap_(params));
    return json_(health_());
  } catch (err) {
    return json_({ error: true, message: err && err.message ? err.message : String(err), service: SERVICE_NAME, ready: false });
  }
}

function health_() {
  const data = getAllParameters_();
  return { status: 'ok', service: SERVICE_NAME, ready: !!(data.foerder && data.dimensionierung) };
}

function dimensionierung_(p) {
  const all = getAllParameters_();
  const d = all.dimensionierung;
  const flaeche = num_(p.flaeche, 0);
  const baujahr = String(p.baujahr || '1978-1994');
  const gebaeude = String(p.gebaeude || 'efh');
  const sanierung = String(p.sanierung || 'nein');
  const warmwasser = String(p.warmwasser || 'ja').toLowerCase();
  const heizsystem = String(p.heizsystem || 'heizkoerper').toLowerCase();
  const verbrauchKnown = String(p.verbrauchKnown || '').toLowerCase() === 'known' || String(p.verbrauchKnown || '').toLowerCase() === 'true' || String(p.verbrauchKnown || '').toLowerCase() === 'ja';
  let verbrauch = num_(p.verbrauch, 0);
  const einheit = String(p.einheit || 'kwh').toLowerCase();
  if (einheit === 'liter') verbrauch *= getNum_(d, 'oel_faktor', 10);
  if (einheit === 'm3') verbrauch *= getNum_(d, 'gas_faktor', 10);

  const bedarfStufen = ['vor1978', '1978-1994', '1995-2010', 'nach2010'];
  let effBaujahr = baujahr;
  const idx = bedarfStufen.indexOf(baujahr);
  if (sanierung === 'teilweise' && idx >= 0) effBaujahr = bedarfStufen[Math.min(idx + 1, bedarfStufen.length - 1)];
  if (sanierung === 'umfassend' && idx >= 0) effBaujahr = bedarfStufen[Math.min(idx + 2, bedarfStufen.length - 1)];

  const bedarfKwh = verbrauchKnown ? verbrauch : Math.round(flaeche * getNum_(d, 'spez_bedarf_' + key_(effBaujahr), 140) * getNum_(d, 'gebaeudef_' + key_(gebaeude), 1.0));

  // NAT (Normaußentemperatur) PLZ-scharf aus Klima_PLZ; Fallback '*'/A-11 (Großraum-konservativ).
  const klima = getKlimaPlz_();
  const plzKey = String(p.plz || '').replace(/\D/g, '').slice(0, 5);
  const zone = klima[plzKey] || klima['*'] || { nat: -11, volllast: 1800 };

  // Volllaststunden = fester Verbrauchs-Richtwert (Vollbenutzungsstunden = Jahresheizarbeit/Heizlast,
  // DIN/VDI 4710); KEIN Klima-Hebel. Das Klima wirkt auf die Dimensionierung allein über die NAT
  // (zone.nat → Geräte-Grenze über die Leistungskurve in matchCatalog_).
  const heizlast = bedarfKwh / getNum_(d, 'volllaststunden', 1800);

  // Warmwasser: VDI 4645 personenbasiert (+0,25 kW × Personen) — WW skaliert mit Personen, nicht
  // mit Heizlast. RAUS oberhalb der Standard-VWL-125-Klasse (heizlast > ww_max_heizlast_kw) →
  // Brauchwasser-WP. Der Wizard sendet die Personenzahl (>=1) mit, sobald Warmwasser=ja gewählt ist;
  // der frühere ×1,10-Fallback entfällt damit. Dimensioniert wird am Emitter-Vorlauf, nie wegen WW auf W55.
  const personen = int_(p.personen, 0);
  let wwZuschlag = 0;
  if (warmwasser === 'ja' && heizlast <= getNum_(d, 'ww_max_heizlast_kw', 19.5)) {
    wwZuschlag = personen * getNum_(d, 'ww_zuschlag_kw_pro_person', 0.25);
  }
  const auslegung = round1_(heizlast + wwZuschlag);
  const jaz = getNum_(d, 'jaz_' + key_(effBaujahr), 3.5);

  const marken = {};
  ['wolf', 'vaillant'].forEach(function (marke) {
    const match = matchCatalog_(marke, auslegung, heizsystem, zone.nat);
    marken[marke] = match ? catalogResult_(match, getPriceTableCached_(marke)) : { deckt: false };
  });

  // Transparenz fürs Ergebnis: effektive spezifische Heizlast (W/m²) + welches Verfahren griff.
  // Verfahrens-Mix: bekannter Jahresverbrauch → Verbrauchsmethode (im Bestand genauer, cci-dialog);
  // sonst Flächen-Schätzung mit Sanierungs-Korrektur (effBaujahr-Shift, mildert die Hauptschwäche der
  // Baualtersklassen-Methode). Reine Anzeige-Felder, KEINE Wirkung auf die Dimensionierung.
  const spezHeizlastWm2 = flaeche > 0 ? Math.round(heizlast / flaeche * 1000) : null;
  const methode = verbrauchKnown ? 'verbrauch' : 'flaeche';
  const methodeHinweis = verbrauchKnown
    ? 'aus deinem Jahresverbrauch'
    : 'Flächen-Schätzung (Baujahr ' + baujahr + (sanierung !== 'nein' ? ', Sanierung berücksichtigt' : '') + ')';

  return { bedarf: auslegung, heizlast: round1_(heizlast), spez_heizlast_wm2: spezHeizlastWm2, methode: methode, methode_hinweis: methodeHinweis, jaz: jaz, heizsystem: heizsystem, warmwasser: warmwasser, marken: marken };
}

// Geräte-Auswahl: kleinste Maschine, deren Grenze (an der exakten PLZ-NAT, am Emitter-Vorlauf) die
// Auslegung deckt. Toleranz (KASKADEN_TOLERANZ_KW) greift NUR an der Single↔Kaskade-Schwelle (Kurven-
// Ablesegenauigkeit ±0,3–0,5 kW; keine 5%-Aufweichung).
var KASKADEN_TOLERANZ_KW = 0.5;
// Geräte-Grenze an der exakten Normaußentemperatur: linear interpoliert zwischen dem A-11-Stützpunkt
// (grenze…, NAT -11 °C) und dem A-10-Stützpunkt (grenze…a10, NAT -10 °C). VDI 4645: Auslegung an der
// exakten NAT, Leistungskurve interpoliert (nicht auf einen Nachbarpunkt gerundet). Wärmer als -10 °C →
// A-10-Wert (keine Extrapolation über den wärmsten Messpunkt); kälter als -11 °C → A-11-Wert (Großraum-
// konservativer Boden). Fehlt der A-10-Stützpunkt (Vaillant vorläufig, Spalte 0) → flach der A-11-Wert.
function grenzeInterp_(grenzeA11, grenzeA10, nat) {
  if (!grenzeA10) return grenzeA11;
  var f = num_(nat, -11) + 11;             // Interpolationsfaktor: 0 bei -11 °C (A-11), 1 bei -10 °C (A-10)
  if (f < 0) f = 0; else if (f > 1) f = 1; // clampen: keine Extrapolation über die Stützpunkte hinaus
  return grenzeA11 + (grenzeA10 - grenzeA11) * f;
}
function matchCatalog_(marke, auslegung, heizsystem, nat) {
  const grenzeOf = function (item) {
    return heizsystem === 'heizkoerper'
      ? grenzeInterp_(item.grenzeW55, item.grenzeW55a10, nat)
      : grenzeInterp_(item.grenzeW35, item.grenzeW35a10, nat);
  };
  const items = getCatalog_()
    .filter(function (item) { return item.marke === marke; })
    .sort(function (a, b) { return grenzeOf(a) - grenzeOf(b); });
  const strict = items.filter(function (item) { return grenzeOf(item) >= auslegung; });
  const pick = strict[0] || null;
  // Toleranz NUR an der Schwelle: wäre die kleinste deckende Lösung eine Kaskade, aber die größte
  // Einzelmaschine deckt innerhalb ±Toleranz noch, dann Single bevorzugen (kein 89k-Kaskaden-Sprung).
  if (pick && pick.kaskade) {
    const single = items.filter(function (item) { return !item.kaskade && grenzeOf(item) + KASKADEN_TOLERANZ_KW >= auslegung; });
    if (single.length) return single[single.length - 1];
  }
  return pick;
}

function catalogResult_(item, priceRows) {
  // Eigenanteil = Single Source aus der Preis-Tafel (Preise_Wolf/Preise_Vaillant), gematcht per
  // Brutto -> Rechner zeigt EXAKT denselben Eigenanteil wie die Preistafel, fuer JEDES Segment
  // (auch XL/XXL mit gemischter WE-Foerderung). eigenanteil = ohne proKlima (Hauptwert,
  // standortunabhaengig); eigenanteilProklima = mit proKlima (nur als 'moeglich'-Hinweis, < eigen).
  const pr = (priceRows || []).filter(function (r) { return r.brutto === item.brutto; })[0];
  const eigen = pr ? pr.eigen : Math.max(0, item.brutto - Math.round(Math.min(item.brutto, 30000) * 0.70));
  const eigenProklima = pr && pr.proklima > 0 && pr.proklima < pr.eigen ? pr.proklima : null;
  return {
    deckt: true,
    modell: item.modell,
    kaskade: item.kaskade,
    brutto: item.brutto,
    eigenanteil: eigen,
    eigenanteilProklima: eigenProklima,
    vorlaeufig: String(item.stand || '').toLowerCase() !== 'belegt'
  };
}

// ===== FÖRDERUNG: Perioden-Automatik (Alt bis 20.07.2026 | BEG-Reform ab 21.07.2026) =====
// Architektur (ADR-04 + Briefing §5): Beide Regelwerke leben als DATEN (FOERDER_PERIODEN_ + Förder_Parameter),
// nicht als dupliziertes Code-Zweig-Paar. Der Rechenkern foerderCalc_(p, f, heute) ist rein: kein Sheet-Zugriff,
// kein new Date(). Nur der Wrapper foerderung_(p) liest Server-Zeit und Sheet-Parameter. Damit ist ein Deploy
// VOR dem Stichtag gefahrlos: die Engine schaltet am 21.07.2026 selbst um.
// Quellen: Kanon 2026-07-15_Foerder-Regelwerk-Kanon_BEG-Reform_HERO.md, Abschnitt 1 (Reform) + Abschnitt 2 (Alt).
// Reform-Werte 1:1 aus dem eingefrorenen Orakel (WP_Rechner_HeroWerk.html, Script-SHA 55344fe56a7043ff…,
// FOERDER_HJ Z.95-102, getFoerder Z.103-122). Alt-Werte = Ist-Stand dieser Datei @ origin/main 95c0e91.
//
// HINWEIS zur Verbotsliste (Kanon 6): Die Alt-Werte 20 / 30 / 5 / 70 / 35 / 30000 / 15000 / 8000 stehen hier
// bewusst weiter im Code. Das ist KEIN Verstoß: sie sind die Parameter der Alt-Periode und gelten für Anträge
// bis 20.07.2026. Verboten sind sie nur als Aussage über die Reform (Kunden-Texte), dort sind sie ersetzt.
function FOERDER_PERIODEN_() {
  // Ein gemeinsamer Seed für beide Rechner: KV_PARAMS_SEED. Die produktive
  // Quelle ist KV_FoerderPerioden über kvGetParams_(); dieser Adapter bleibt
  // nur Fallback für reine Kern-Tests und fehlende KV-Tabs.
  return foerderPeriodenAusKv_(KV_PARAMS_SEED);
}

// Datum (Date) -> Perioden-Objekt. Jenseits von h1-2029 (Orakel-Horizont) klemmt die Funktion auf die letzte
// bekannte Periode und markiert sie via ueberHorizont: Kanon A3 verbietet, die 750-Euro-Degression
// fortzuschreiben. Der Kern hängt daran einen Hinweis auf die projektgenaue Rechnung.
function periodeFuer_(heute, periodenQuelle) {
  const d = heute instanceof Date ? heute : new Date(heute);
  const ymd = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const perioden = periodenQuelle || FOERDER_PERIODEN_();
  for (let i = 0; i < perioden.length; i++) {
    if (ymd >= perioden[i].von && ymd <= perioden[i].bis) return perioden[i];
  }
  const letzte = perioden[perioden.length - 1];
  const out = {};
  for (const k in letzte) out[k] = letzte[k];
  out.ueberHorizont = true;
  return out;
}

// Einkommens-Enum normalisieren. Neue Werte (Kanon 1.2 / E-05): bis30 | bis40 | bis50 | ueber50.
// RÜCKWÄRTSKOMPATIBILITÄT (Auftrag C1.3): die alten Request-Werte bleiben gültig und werden gemappt:
//   'unter40' -> 'bis40'   (Alt-Regel "zvE unter 40.000" -> Klasse bis 40.000)
//   'ueber40' -> 'ueber50' (kein Bonus in beiden Regelwerken)
// 'keine' ("möchte ich nicht angeben") und alles Unbekannte -> 'unbekannt' = konservativ kein Bonus,
// exakt wie die Ist-Logik (dort schlug jede Nicht-'unter40'-Eingabe in "kein Bonus" um).
function einkommenNorm_(v) {
  const s = String(v || '').toLowerCase();
  if (s === 'unter40') return 'bis40';
  if (s === 'ueber40') return 'ueber50';
  if (s === 'bis30' || s === 'bis40' || s === 'bis50' || s === 'ueber50') return s;
  return 'unbekannt';
}

// Anrechenbares Einkommen -> Bonus-Prozentsatz (Orakel Z.109-113).
// Die Enum-Klasse wird über ihre OBERGRENZE repräsentiert; weil Staffelgrenzen (30/40/50k) und Kinderabzug
// (10k) auf demselben 10.000er-Raster liegen, bildet jede Klasse auf genau EINEN Bonuswert ab, auch mit Kind.
// Das ist exakt, keine Näherung. 'ueber50' ist nach oben offen -> anr = Infinity -> 0 % (konservativ).
function einkommensbonusPct_(einkommenNorm, kind, f) {
  const grenzen = { bis30: getNum_(f, 'reform_eink_grenze_bis30', 30000), bis40: getNum_(f, 'reform_eink_grenze_bis40', 40000), bis50: getNum_(f, 'reform_eink_grenze_bis50', 50000) };
  const zvE = grenzen[einkommenNorm];
  if (zvE === undefined) return 0; // ueber50 / unbekannt
  const anr = Math.max(0, zvE - (kind ? getNum_(f, 'reform_kind_abzug_eur', 10000) : 0));
  if (anr <= grenzen.bis30) return getNum_(f, 'reform_eink_pct_bis30', 40);
  if (anr <= grenzen.bis40) return getNum_(f, 'reform_eink_pct_bis40', 30);
  if (anr <= grenzen.bis50) return getNum_(f, 'reform_eink_pct_bis50', 10);
  return 0;
}

function foerderFaehigeKostenGesamt_(we, f) {
  if (we <= 1) return getNum_(f, 'foerderfaehig_we1', 30000);
  if (we <= 6) return getNum_(f, 'foerderfaehig_we1', 30000) + (we - 1) * getNum_(f, 'foerderfaehig_we2bis6', 15000);
  return getNum_(f, 'foerderfaehig_we1', 30000) + 5 * getNum_(f, 'foerderfaehig_we2bis6', 15000) + (we - 6) * getNum_(f, 'foerderfaehig_we7plus', 8000);
}

/**
 * Reiner Rechenkern der Förderung. KEIN Sheet-Zugriff, KEIN new Date().
 * @param {Object} p      Request-Parameter (wie doGet sie liefert).
 * @param {Object} f      Förder-Parameter (Schlüssel/Wert aus Förder_Parameter).
 * @param {Date}   heute  Antragsdatum = Stichtag der Perioden-Automatik (Eingabe, nie intern gelesen).
 */
function foerderCalc_(p, f, heute, periodenQuelle) {
  const per = periodeFuer_(heute, periodenQuelle);
  const we = int_(p.we, 1);
  const selbstWE = int_(p.selbstWE, 1);
  const heizung = String(p.heizung || 'gas');
  const einkommen = einkommenNorm_(p.einkommen !== undefined ? p.einkommen : 'ueber40');
  const kind = String(p.kind || '').toLowerCase() === 'ja' || String(p.kind || '').toLowerCase() === 'true';
  const euOk = String(p.eu || 'ja').toLowerCase() !== 'nein'; // EU-Gerät = Normalfall (Wolf/Vaillant, beide EU-Fertigung)
  const gemeinde = String(p.gemeinde || '').toLowerCase();
  const preis = int_(p.preis, 34510);
  const hinweise = [];

  // --- Klimabonus-Voraussetzung: in beiden Regelwerken gleich (Kanon 1.2 / Orakel Z.116-118 == Ist-Code).
  // Öl/Kohle/Gasetage/Nachtspeicher immer; Gas-Zentralheizung und Biomasse ab Mindestalter. Nur für selbstgenutzte WE.
  let klimaBonus = false;
  if (heizung === 'oel' || heizung === 'kohle' || heizung === 'nachtspeicher' || heizung === 'gas-etage') klimaBonus = true;
  else if (heizung === 'gas' || heizung === 'biomasse') klimaBonus = int_(p.heizungsalter, 20) >= getNum_(f, 'gas_klimabonus_min_alter', 20);

  let satzSelbst, satzVermietet, foerderFaehigGesamt, einkommensbonusPct, grundPct, klimaPct, bausteine;

  if (!per.reform) {
    // ===== ALT-REGELWERK (Kanon 2), Anträge bis 20.07.2026 =====
    grundPct = getNum_(f, 'grundfoerderung_pct', 30);
    klimaPct = getNum_(f, 'klimabonus_pct', 20);
    // Alt: Einkommensbonus FLACH 30 % unter 40.000 € -> greift für die Klassen bis30 und bis40 (D2).
    const altEinkOk = einkommen === 'bis30' || einkommen === 'bis40';
    einkommensbonusPct = altEinkOk ? getNum_(f, 'einkommensbonus_pct', 30) : 0;
    satzSelbst = grundPct;
    if (selbstWE > 0 && klimaBonus) satzSelbst += klimaPct;
    if (selbstWE > 0 && altEinkOk) satzSelbst += einkommensbonusPct;
    satzSelbst += getNum_(f, 'effizienzbonus_pct', 5);
    satzSelbst = Math.min(satzSelbst, getNum_(f, 'deckel_selbst_pct', 70));
    satzVermietet = Math.min(getNum_(f, 'deckel_vermietet_pct', 35), grundPct + getNum_(f, 'effizienzbonus_pct', 5));
    foerderFaehigGesamt = foerderFaehigeKostenGesamt_(we, f);
    bausteine = ['Grundförderung ' + grundPct + '%', 'Effizienzbonus (R290) +' + getNum_(f, 'effizienzbonus_pct', 5) + '%'];
    if (selbstWE > 0 && klimaBonus) bausteine.splice(1, 0, 'Klimageschwindigkeitsbonus +' + klimaPct + '%');
    if (selbstWE > 0 && altEinkOk) bausteine.splice(1, 0, 'Einkommensbonus +' + einkommensbonusPct + '%');
  } else {
    // ===== REFORM (Kanon 1.2 / Orakel getFoerder Z.103-122), Anträge ab 21.07.2026 =====
    // Grundförderung 30 %; ab Perioden mit eu:true (01.02.2027) nur für EU-Geräte, sonst 15 %.
    // KfW-Logik ab 2027 = 15 % für alle + 15 % Wertschöpfungsbonus für EU: in 30/15 vollständig
    // abgebildet, KEIN Bonus obendrauf (Orakel Z.114-115).
    grundPct = (per.eu && !euOk) ? getNum_(f, 'reform_grund_pct_nicht_eu', 15) : getNum_(f, 'reform_grund_pct', 30);
    klimaPct = per.klima;
    einkommensbonusPct = einkommensbonusPct_(einkommen, kind, f);
    satzSelbst = grundPct;
    if (selbstWE > 0 && klimaBonus) satzSelbst += klimaPct;
    if (selbstWE > 0) satzSelbst += einkommensbonusPct;
    // KEIN Effizienzbonus mehr (Kanon E-06, mit der Reform entfallen).
    satzSelbst = Math.min(satzSelbst, getNum_(f, 'reform_deckel_pct', 80));
    // Vermietete WE: nur Grundförderung (Kanon A1 [abgeleitet], W-4-Vorbehalt).
    satzVermietet = grundPct;
    // Bemessungsgrenze der ERSTEN Wohneinheit. Kanon A2: für weitere WE ist KEINE Staffel belegt ->
    // keine erfundenen Zahlen, konservativ die Grenze der ersten WE + Hinweis auf die projektgenaue Rechnung.
    foerderFaehigGesamt = per.grenze;
    if (we > 1) hinweise.push('Bei mehreren Wohneinheiten gelten gestaffelte Grenzen je Wohneinheit. Wir rechnen dein Projekt genau durch.');
    if (per.ueberHorizont) hinweise.push('Für Anträge nach dem 31.07.2029 stehen die Fördersätze noch nicht fest. Wir rechnen dein Projekt genau durch.');
    bausteine = ['Grundförderung ' + grundPct + '%'];
    if (selbstWE > 0 && klimaBonus && klimaPct > 0) bausteine.splice(1, 0, 'Klimageschwindigkeitsbonus +' + klimaPct + '%');
    if (selbstWE > 0 && einkommensbonusPct > 0) bausteine.splice(1, 0, 'Einkommensbonus +' + einkommensbonusPct + '%');
  }

  // --- Zuschuss-Rechnung: Struktur in beiden Perioden identisch, nur die Parameter unterscheiden sich.
  const foerderProWE = foerderFaehigGesamt / we;
  const kostenProWE = Math.min(foerderProWE, preis / we);
  const vermieteteWE = we - selbstWE;
  const zuschussSelbst = selbstWE > 0 ? Math.round(kostenProWE * (satzSelbst / 100)) : 0;
  const zuschussVermietet = vermieteteWE > 0 ? Math.round(kostenProWE * (satzVermietet / 100) * vermieteteWE) : 0;
  const zuschussGesamt = zuschussSelbst + zuschussVermietet;

  // --- proKlima (Kanon 1.3, primärquellen-verifiziert).
  // Frist: Richtlinie läuft bis 31.10.2026 (datumsbasiert, nicht periodenbasiert).
  // Basis: Alt rechnet auf den förderfähigen Kosten (Ist-Stand), Reform auf der Investition
  // (Orakel Z.218 `0.05*investWP`, Kanon 5 "0,05 mal Brutto") -> Parameter proklima_basis.
  const proGemeinden = String(f.proklima_gemeinden || '').split(',').map(function (x) { return x.trim(); });
  const imFoerdergebiet = proGemeinden.indexOf(gemeinde) >= 0;
  const proklimaAktiv = String(f.proklima_aktiv || 'N').trim().toUpperCase() === 'J';
  const optin = proklimaAktiv && String(p.proklimaOptin) === 'ja';
  const d = heute instanceof Date ? heute : new Date(heute);
  const ymd = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const pkFrist = int_(f.proklima_frist_ymd, 20261031);
  const pkFristOk = ymd <= pkFrist;
  const pkBasis = String(f.proklima_basis || (per.reform ? 'preis' : 'foerderfaehig')) === 'preis' ? preis : foerderFaehigGesamt;
  const pkRoh = (imFoerdergebiet && optin && pkFristOk)
    ? Math.min(Math.round(pkBasis * getNum_(f, 'proklima_pct', 5) / 100), getNum_(f, 'proklima_max_eur', 1500))
    : 0;
  if (imFoerdergebiet && optin && !pkFristOk) hinweise.push('Die proKlima-Förderung gilt nur für Anträge bis zum 31.10.2026 und ist deshalb nicht eingerechnet.');

  // BEG-Kumulierungsgrenze (BEG-EM Nr. 8.6, BAnz AT 29.12.2023 B1 + KfW-Merkblatt 458, 12/2025):
  // Zuschuss aus ALLEN öffentlichen Mitteln zusammen max. 60 % derselben Kosten; der KfW-Zuschuss allein
  // darf darüber liegen. proKlima gilt selbst als öffentliche Mittel und kappt sich selbst (Kanon 1.3).
  // Formel sinngemäß nach Orakel Z.224-226: totalFoerd = max(kfw, min(kfw + pk, 0,6 × Investition)).
  const kumCap = preis * getNum_(f, 'kumulierung_max_pct', 60) / 100;
  let totalFoerd = zuschussGesamt + pkRoh;
  if (pkRoh > 0) totalFoerd = Math.max(zuschussGesamt, Math.min(totalFoerd, kumCap));
  const proklimaZuschuss = Math.max(0, totalFoerd - zuschussGesamt);
  const proklimaGekappt = pkRoh > 0 && proklimaZuschuss < pkRoh;
  if (proklimaGekappt) hinweise.push('KfW-Zuschuss und proKlima zusammen sind auf 60 Prozent derselben Kosten begrenzt. Der KfW-Zuschuss allein darf darüber liegen.');

  const eigenanteil = Math.max(0, preis - zuschussGesamt - proklimaZuschuss);
  const kfwSatz = selbstWE > 0 ? satzSelbst : satzVermietet;
  const effektivSatz = preis > 0 ? Math.round(((zuschussGesamt + proklimaZuschuss) / preis) * 100) : 0;
  if (proklimaZuschuss > 0) bausteine.push('proKlima Zuschuss ' + proklimaZuschuss + ' €');

  return {
    // --- Bestandsfelder: unveränderte Bedeutung (Rückwärtskompatibilität, Auftrag C1.3).
    kfwSatz: kfwSatz,
    zuschussGesamt: zuschussGesamt,
    proklimaZuschuss: proklimaZuschuss,
    eigenanteil: eigenanteil,
    effektivSatz: effektivSatz,
    preis: preis,
    klimaBonus: klimaBonus,
    bausteine: bausteine,
    // --- Neue Felder: rein additiv.
    periode: per.id,
    periodeLabel: per.label,
    grenze: foerderFaehigGesamt,
    einkommensbonusPct: selbstWE > 0 ? einkommensbonusPct : 0,
    hinweis: hinweise.join(' '),
    proklimaGekappt: proklimaGekappt
  };
}

// Wrapper: holt Sheet-Parameter + Preis + Server-Zeit und ruft den reinen Kern. Einziger Ort mit new Date().
function foerderung_(p) {
  const f = getAllParameters_().foerder;
  const kvParams = kvGetParams_();
  const marke = String(p.marke || 'wolf').toLowerCase();
  const prices = getPrices_(marke);
  const wpTyp = String(p.wpTyp || 'm').toLowerCase();
  const preis = p.preisManuell !== undefined && p.preisManuell !== '' ? int_(p.preisManuell, 34510) : (prices[wpTyp] || 34510);
  const args = {};
  for (const k in p) args[k] = p[k];
  args.preis = preis;
  const out = foerderCalc_(args, f, new Date(), foerderPeriodenAusKv_(kvParams));
  if (marke === 'vaillant') out.vorlaeufig = true;
  return out;
}

// ===== KOSTENVERGLEICH: Apps-Script-Wiring (ADR-04) =====

/**
 * Gemeinsamer Perioden-Adapter für Förderrechner und Kostenvergleich.
 * Das Sheet-Objekt und KV_PARAMS_SEED haben dieselbe Struktur; die bestehende
 * Förderrechnung erhält daraus ihren rückwärtskompatiblen Perioden-Vertrag.
 */
function foerderPeriodenAusKv_(params) {
  const keys = ['alt'].concat(params.periodenReihenfolge || []);
  return keys.map(function (id) {
    const p = params.perioden[id];
    const isoNum = function (v, fallback) {
      const s = String(v || '').replace(/-/g, '');
      return s ? kvNum_(s, fallback) : fallback;
    };
    return {
      id: id,
      von: isoNum(p.gueltigAb, 0),
      bis: isoNum(p.gueltigBis, 99991231),
      reform: id !== 'alt',
      klima: kvNum_(p.klima, 0),
      grenze: kvNum_(p.grenze, 0),
      eu: !!p.eu,
      label: id === 'alt' ? 'Anträge bis 20.07.2026' : String(p.label || '')
    };
  });
}

function kostenvergleich_(p) {
  const params = kvGetParams_();
  const inputs = kvMapRequest_(p, params);
  if (String(p.bedarfModus || '') === 'schaetzung') {
    const geb = kvEnum_(p.geb, ['efh', 'dhh', 'rh', 'zfh', 'mfh'], '');
    const bj = kvEnum_(p.bj, ['vor1978', '1978-1994', '1995-2010', 'nach2010'], '');
    const san = kvEnum_(p.san, ['nein', 'teilweise', 'umfassend'], '');
    const flaeche = kvNum_(p.flaeche, 0);
    if (!geb || !bj || !san || flaeche < 60 || flaeche > 800) {
      throw new Error('Ungültige Angaben für die Verbrauchsschätzung.');
    }
    inputs.bedarf = kvSchaetzeBedarf(geb, bj, san, flaeche, params);
  }
  const out = kvCalculate(inputs, params);
  out.periodeAutomatik = inputs._periodeAutomatik;
  return out;
}

function kvBootstrap_(p) {
  const params = kvGetParams_();
  const out = kvBootstrapPayload(params);
  out.aktivePeriode = kvPeriodeHeute_(params);
  return out;
}

function kvPeriodeHeute_(params) {
  const heute = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd');
  return kvPeriodeFuerDatum(heute, params);
}

function kvMapRequest_(p, params) {
  const d = KV_DEFAULTS;
  const periodeServer = kvPeriodeHeute_(params);
  const periodenKeys = Object.keys(params.perioden);
  const periodeReq = String(p.fHalbjahr || '').trim();
  const periode = periodenKeys.indexOf(periodeReq) >= 0 ? periodeReq : periodeServer;

  return {
    _periodeAutomatik: periodenKeys.indexOf(periodeReq) < 0,
    modus: kvEnum_(p.modus, ['kunde', 'berater'], d.modus),
    heizart: kvEnum_(p.heizart, ['gas', 'oel'], d.heizart),
    bedarf: kvNum_(p.bedarf, d.bedarf),
    eta: kvNum_(p.eta, d.eta),
    invWP: kvNum_(p.invWP, d.invWP),
    jaz: kvNum_(p.jaz, d.jaz),
    laufzeit: Math.round(kvNum_(p.laufzeit, d.laufzeit)),
    neuFossilTog: kvBool_(p.neuFossilTog, d.neuFossilTog),
    vglBrennstoff: kvEnum_(p.vglBrennstoff, ['gas', 'oel'], d.vglBrennstoff),
    gasInvest: kvNum_(p.gasInvest, d.gasInvest),
    oelInvest: kvNum_(p.oelInvest, d.oelInvest),
    gaspreis: kvNum_(p.gaspreis, d.gaspreis),
    gasStg: kvNum_(p.gasStg, d.gasStg),
    oelpreis: kvNum_(p.oelpreis, d.oelpreis),
    oelStg: kvNum_(p.oelStg, d.oelStg),
    strompreis: kvNum_(p.strompreis, d.strompreis),
    stromEntw: kvNum_(p.stromEntw, d.stromEntw),
    co2preis: kvNum_(p.co2preis, d.co2preis),
    co2Pfad: kvNum_(p.co2Pfad, d.co2Pfad),
    bioTog: kvBool_(p.bioTog, d.bioTog),
    bioAufpreis: kvNum_(p.bioAufpreis, d.bioAufpreis),
    fHalbjahr: periode,
    fGrund: kvBool_(p.fGrund, d.fGrund),
    fEU: kvBool_(p.fEU, d.fEU),
    fKlima: kvBool_(p.fKlima, d.fKlima),
    fAlt20: kvBool_(p.fAlt20, d.fAlt20),
    fEinkSlider: kvNum_(p.fEinkSlider, d.fEinkSlider),
    fKind: kvBool_(p.fKind, d.fKind),
    proklimaTog: false,
    fEffizienz: kvBool_(p.fEffizienz, d.fEffizienz),
    finanzTog: kvBool_(p.finanzTog, d.finanzTog),
    kredLZ: Math.round(kvNum_(p.kredLZ, d.kredLZ)),
    kredZins: kvNum_(p.kredZins, d.kredZins),
    immoTog: kvBool_(p.immoTog, d.immoTog),
    hausW: kvNum_(p.hausW, d.hausW),
    immoP: kvNum_(p.immoP, d.immoP),
    dynTarifTog: kvBool_(p.dynTarifTog, d.dynTarifTog),
    dynAnteil: kvNum_(p.dynAnteil, d.dynAnteil),
    dynSpread: kvNum_(p.dynSpread, d.dynSpread)
  };
}

function kvNum_(v, fallback) {
  if (typeof v === 'number') return v;
  const s = String(v === undefined || v === null ? '' : v).trim().replace(',', '.');
  if (s === '') return fallback;
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n;
}

function kvBool_(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'ja';
}

function kvEnum_(v, erlaubt, fallback) {
  const s = String(v === undefined || v === null ? '' : v).trim();
  return erlaubt.indexOf(s) >= 0 ? s : fallback;
}

function kvGetParams_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('kvparams:v1');
  if (cached) return JSON.parse(cached);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const shP = ss.getSheetByName('KV_Parameter');
  const shF = ss.getSheetByName('KV_FoerderPerioden');
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
          const teile = s.split(':');
          return { maxAnr: kvNum_(teile[0], 0), pct: kvNum_(teile[1], 0) };
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
    grundPctEu: kvNum_(kv.grund_pct_eu, 30),
    grundPctNichtEu: kvNum_(kv.grund_pct_nicht_eu, 15),
    proKlimaAktiv: String(kv.proklima_aktiv || 'N').toUpperCase() === 'J',
    proKlimaPct: kvNum_(kv.proklima_pct, 0.05),
    proKlimaMax: kvNum_(kv.proklima_max, 1500),
    kumCapPct: kvNum_(kv.kum_cap_pct, 0.6),
    co2f: { gas: kvNum_(kv.co2f_gas, 0.182), oel: kvNum_(kv.co2f_oel, 0.266) },
    bioStufen: [
      { y: kvNum_(kv.bio_stufe_1_jahr, 2029), p: kvNum_(kv.bio_stufe_1_anteil, 0.15) },
      { y: kvNum_(kv.bio_stufe_2_jahr, 2035), p: kvNum_(kv.bio_stufe_2_anteil, 0.30) },
      { y: kvNum_(kv.bio_stufe_3_jahr, 2040), p: kvNum_(kv.bio_stufe_3_anteil, 0.60) }
    ],
    etaNeu: { gas: kvNum_(kv.eta_neu_gas, 0.95), oel: kvNum_(kv.eta_neu_oel, 0.93) },
    strommix: {
      startY: kvNum_(kv.strommix_start_jahr, 2026), startG: kvNum_(kv.strommix_start_g, 350),
      endY: kvNum_(kv.strommix_end_jahr, 2040), endG: kvNum_(kv.strommix_end_g, 100)
    },
    wartungWp: kvNum_(kv.wartung_wp, 350),
    wartungFossil: kvNum_(kv.wartung_fossil, 250),
    startY: kvNum_(kv.start_jahr, 2026),
    co2ZielSchritte: kvNum_(kv.co2_ziel_schritte, 19),
    kredLZDefault: kvNum_(kv.kred_lz_default, 10),
    kredZinsDefault: kvNum_(kv.kred_zins_default, 0.035),
    sensi: {
      best: { fossil: kvNum_(kv.sensi_best_fossil, 0.015), strom: kvNum_(kv.sensi_best_strom, -0.01) },
      base: { fossil: 0, strom: 0 },
      worst: { fossil: kvNum_(kv.sensi_worst_fossil, -0.015), strom: kvNum_(kv.sensi_worst_strom, 0.015) }
    },
    co2FlugT: kvNum_(kv.co2_flug_t, 0.5),
    co2BaumKg: kvNum_(kv.co2_baum_kg, 12.5),
    schaetzung: {
      spezVerbrauch: {
        vor1978: kvNum_(kv.wz_spez_vor1978, 180),
        '1978-1994': kvNum_(kv.wz_spez_1978_1994, 140),
        '1995-2010': kvNum_(kv.wz_spez_1995_2010, 100),
        nach2010: kvNum_(kv.wz_spez_nach2010, 60)
      },
      stufen: KV_SCHAETZUNG.stufen.slice(),
      gebaeudeFaktor: {
        efh: kvNum_(kv.wz_gebf_efh, 1.0),
        dhh: kvNum_(kv.wz_gebf_dhh, 0.9),
        rh: kvNum_(kv.wz_gebf_rh, 0.85),
        zfh: kvNum_(kv.wz_gebf_zfh, 0.95),
        mfh: kvNum_(kv.wz_gebf_mfh, 0.85)
      },
      sanierungSprung: KV_SCHAETZUNG.sanierungSprung,
      einheitFaktor: kvNum_(kv.wz_unit_faktor, 10),
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

function kvSetupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  writeKeyValueDoc_(ss, 'KV_Parameter', KV_PARAMETER_ROWS_());
  kvWriteFoerderPerioden_(ss, 'KV_FoerderPerioden', KV_PERIODEN_ROWS_());
  CacheService.getScriptCache().remove('kvparams:v1');
}

function kvWriteFoerderPerioden_(ss, name, rows) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, 13).setValues([['key', 'gueltig_ab', 'gueltig_bis', 'label',
    'klima_pct', 'grenze', 'eu_differenzierung', 'cap', 'effizienz_pct',
    'kind_freibetrag', 'eink_stufen', 'proklima_erlaubt', 'quelle']]);
  sh.getRange(2, 2, rows.length, 2).setNumberFormat('@');
  sh.getRange(2, 11, rows.length, 1).setNumberFormat('@');
  sh.getRange(2, 1, rows.length, 13).setValues(rows);
  sh.setFrozenRows(1);
}

function KV_PARAMETER_ROWS_() {
  return [
    ['grund_pct_eu', 30, 'Prozent', 'Grundförderung mit EU-Wertschöpfung', 'Orakel Z.107, KfW 458'],
    ['grund_pct_nicht_eu', 15, 'Prozent', 'Grundförderung ohne EU-Wertschöpfung ab 2027', 'Orakel Z.107, KfW-PM BEG-Reform'],
    ['proklima_aktiv', 'N', 'J/N', 'Globaler produktiver Kill-Switch; interne Engine-Referenz bleibt erhalten', 'GF-Decision 15.07.2026, Kanon 1.3'],
    ['proklima_pct', 0.05, 'Anteil', 'proKlima Hannover: Anteil der förderfähigen Kosten', 'Orakel Z.219, Kanon 1.3'],
    ['proklima_max', 1500, 'Euro', 'proKlima Hannover: Höchstbetrag', 'Orakel Z.219, Kanon 1.3'],
    ['kum_cap_pct', 0.6, 'Anteil', 'BEG-Kumulierungsgrenze', 'Orakel Z.225, Kanon 1.3'],
    ['co2f_gas', 0.182, 'kg/kWh', 'CO₂-Faktor Gas, brennwertbezogen', 'Orakel Z.148, UBA'],
    ['co2f_oel', 0.266, 'kg/kWh', 'CO₂-Faktor Heizöl', 'Orakel Z.148, UBA'],
    ['bio_stufe_1_jahr', 2029, 'Jahr', 'Biotreppe Stufe 1 ab', 'Orakel Z.151, GEG §71(9)'],
    ['bio_stufe_1_anteil', 0.15, 'Anteil', 'Biotreppe Stufe 1', 'Orakel Z.151, GEG §71(9)'],
    ['bio_stufe_2_jahr', 2035, 'Jahr', 'Biotreppe Stufe 2 ab', 'Orakel Z.151, GMG-Eckpunkte Februar 2026'],
    ['bio_stufe_2_anteil', 0.30, 'Anteil', 'Biotreppe Stufe 2', 'Orakel Z.151'],
    ['bio_stufe_3_jahr', 2040, 'Jahr', 'Biotreppe Stufe 3 ab', 'Orakel Z.151'],
    ['bio_stufe_3_anteil', 0.60, 'Anteil', 'Biotreppe Stufe 3', 'Orakel Z.151, Öko-Institut März 2026'],
    ['eta_neu_gas', 0.95, 'Anteil', 'Nutzungsgrad neuer Gas-Brennwertkessel', 'Orakel Z.236'],
    ['eta_neu_oel', 0.93, 'Anteil', 'Nutzungsgrad neuer Öl-Brennwertkessel', 'Orakel Z.236'],
    ['strommix_start_jahr', 2026, 'Jahr', 'Strommix-Pfad Startjahr', 'Orakel Z.158, UBA/Agora'],
    ['strommix_start_g', 350, 'g/kWh', 'Strommix Startwert', 'Orakel Z.158, UBA'],
    ['strommix_end_jahr', 2040, 'Jahr', 'Strommix-Pfad Endjahr', 'Orakel Z.158, Agora'],
    ['strommix_end_g', 100, 'g/kWh', 'Strommix Endwert', 'Orakel Z.158, Agora'],
    ['wartung_wp', 350, 'Euro/Jahr', 'Wartungskosten Wärmepumpe', 'Orakel Z.271'],
    ['wartung_fossil', 250, 'Euro/Jahr', 'Wartungskosten fossile Heizung', 'Orakel Z.257'],
    ['start_jahr', 2026, 'Jahr', 'Jahr 1 der Betrachtung', 'Orakel Z.243'],
    ['co2_ziel_schritte', 19, 'Anzahl', 'Schritte bis zum CO₂-Zieljahr 2045', 'Orakel Z.240'],
    ['kred_lz_default', 10, 'Jahre', 'Kredit-Laufzeit bei Finanzierung AUS', 'Orakel Z.178'],
    ['kred_zins_default', 0.035, 'Anteil', 'Kredit-Zins bei Finanzierung AUS', 'Orakel Z.179'],
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
    ['wz_unit_faktor', 10, 'kWh je m³/Liter', 'Umrechnung m³ Gas oder Liter Heizöl in kWh', 'Orakel Z.781']
  ];
}

function KV_PERIODEN_ROWS_() {
  return [
    ['alt', '', '2026-07-20', 'bis 20.07.2026', 20, 30000, 'N', 70, 5, 0, '40000:30', 'J', 'Kanon Abschnitt 2'],
    ['h2-2026', '2026-07-21', '2027-01-31', '21.07.2026 bis 31.01.2027', 16, 28000, 'N', 80, 0, 10000, '30000:40;40000:30;50000:10', 'J', 'Orakel Z.97, KfW 458'],
    ['h1-2027', '2027-02-01', '2027-07-31', '01.02. bis 31.07.2027', 12, 27250, 'J', 80, 0, 10000, '30000:40;40000:30;50000:10', 'N', 'Orakel Z.98'],
    ['h2-2027', '2027-08-01', '2028-01-31', '01.08.2027 bis 31.01.2028', 8, 26500, 'J', 80, 0, 10000, '30000:40;40000:30;50000:10', 'N', 'Orakel Z.99'],
    ['h1-2028', '2028-02-01', '2028-07-31', '01.02. bis 31.07.2028', 4, 25750, 'J', 80, 0, 10000, '30000:40;40000:30;50000:10', 'N', 'Orakel Z.100'],
    ['h2-2028', '2028-08-01', '2029-01-31', '01.08.2028 bis 31.01.2029', 0, 25000, 'J', 80, 0, 10000, '30000:40;40000:30;50000:10', 'N', 'Orakel Z.101'],
    ['h1-2029', '2029-02-01', '2029-07-31', '01.02. bis 31.07.2029', 0, 24250, 'J', 80, 0, 10000, '30000:40;40000:30;50000:10', 'N', 'Orakel Z.102']
  ];
}

function setupSheets() {
  // NICHT AUSFÜHREN: überschreibt die fertige v4-Tab-Struktur. Nur Erstbefüllung.
  const ss = SpreadsheetApp.openById(SHEET_ID);
  writeKeyValueDoc_(ss, 'Förder_Parameter', FOERDER_ROWS_());
  writeKeyValueDoc_(ss, 'Dimensionierung', DIMENSION_ROWS_());
  writeKalkulationWolf_(ss);
  writeKalkulationVaillant_(ss);
  writePreiseFromKalkulation_(ss, 'Preise_Wolf', 'Kalkulation_Wolf', WOLF_PRODUCTS_());
  writePreiseFromKalkulation_(ss, 'Preise_Vaillant', 'Kalkulation_Vaillant', VAILLANT_PRODUCTS_());
  writeStatus_(ss);
  CacheService.getScriptCache().remove('params:v1');
  CacheService.getScriptCache().remove('catalog:v1');
}

function writeKeyValueDoc_(ss, name, rows) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, 5).setValues([['schluessel', 'wert', 'einheit', 'bedeutung', 'quelle']]);
  // Wert-Spalte (B) zwingend als reine Zahl formatieren: verhindert, dass eine (geerbte)
  // Datums-Formatierung dazu fuehrt, dass getValues() ein Date liefert (-> 1899/1900 statt
  // z. B. 1.0 / 60 / 4.2). Textwerte wie proklima_gemeinden bleiben davon unberuehrt.
  sh.getRange(2, 2, rows.length, 1).setNumberFormat('0.############');
  sh.getRange(2, 1, rows.length, 5).setValues(rows);
  sh.setFrozenRows(1);
}

function writeKalkulationWolf_(ss) {
  const sh = ss.getSheetByName('Kalkulation_Wolf') || ss.insertSheet('Kalkulation_Wolf');
  sh.clear();
  sh.getRange(1, 1, 1, 11).setValues([['Klasse','status','Bruttopreis','angenommener_Foerderfall','foerderfaehige_Kosten','KfW_Satz','KfW_Zuschuss','proKlima','Eigenanteil','proKlima_Eigenanteil','quelle']]);
  const rows = [
    ['s','vorläufig',29750,'1 WE, Selbstnutzer, 70 % Best-Case',30000,0.70,'=ROUND(MIN(C2,E2)*F2,0)',1500,'=C2-G2','=C2-G2-H2','produkte_HERO.json / Web-Stand; Finanzmodell-Abgleich offen'],
    ['m','vorläufig',34510,'1 WE, Selbstnutzer, 70 % Best-Case',30000,0.70,'=ROUND(MIN(C3,E3)*F3,0)',1500,'=C3-G3','=C3-G3-H3','produkte_HERO.json / Web-Stand; Finanzmodell-Abgleich offen'],
    ['l','vorläufig',45220,'1 WE, Selbstnutzer, 70 % Best-Case',30000,0.70,'=ROUND(MIN(C4,E4)*F4,0)',1500,'=C4-G4','=C4-G4-H4','produkte_HERO.json / Web-Stand; Finanzmodell-Abgleich offen'],
    ['xl','vorläufig',57120,'2 WE: 1 selbst 70 % + 1 vermietet 35 %',45000,'gemischt','=ROUND((E5/2)*0.70,0)+ROUND((E5/2)*0.35,0)',1500,'=C5-G5','=C5-G5-H5','produkte_HERO.json / Web-Stand; Finanzmodell-Abgleich offen'],
    ['xxl','vorläufig',82223,'6 WE: 1 selbst 70 % + 5 vermietet 35 %',105000,'gemischt','=ROUND(30000*0.70,0)+ROUND(5*15000*0.35,0)','', '=C6-G6', '', 'produkte_HERO.json / Web-Stand; Finanzmodell-Abgleich offen'],
    ['Material','PLATZHALTER','','','','','','','','','aus Finanzmodell — folgt (Benjamin-Update)'],
    ['Lohn','PLATZHALTER','','','','','','','','','aus Finanzmodell — folgt (Benjamin-Update)'],
    ['Overhead','PLATZHALTER','','','','','','','','','aus Finanzmodell — folgt (Benjamin-Update)'],
    ['Marge','PLATZHALTER','','','','','','','','','aus Finanzmodell — folgt (Benjamin-Update)']
  ];
  sh.getRange(2, 1, rows.length, 11).setValues(rows);
  sh.setFrozenRows(1);
}

function writeKalkulationVaillant_(ss) {
  const sh = ss.getSheetByName('Kalkulation_Vaillant') || ss.insertSheet('Kalkulation_Vaillant');
  sh.clear();
  sh.getRange(1, 1, 1, 11).setValues([['Klasse','status','Bruttopreis','angenommener_Foerderfall','foerderfaehige_Kosten','KfW_Satz','KfW_Zuschuss','proKlima','Eigenanteil','proKlima_Eigenanteil','quelle']]);
  ['s','m','l','xl','xxl','Vaillant-JAZ','Stammdaten/SCOP'].forEach(function (k, i) { sh.getRange(i + 2, 1, 1, 11).setValues([[k,'PLATZHALTER','','Daten folgen','','','','','','','Vaillant-Preise/JAZ/Stammdaten offen']]); });
  sh.setFrozenRows(1);
}

function writePreiseFromKalkulation_(ss, name, calcName, products) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, 7).setValues([['Klasse','Modell','Hausgroesse','kW','Endpreis_brutto','Eigenanteil','proKlima_Eigenanteil']]);
  products.forEach(function (p, i) {
    const r = i + 2;
    sh.getRange(r, 1, 1, 7).setValues([[p.klasse, p.modell, p.hausgroesse, p.kw, '=' + calcName + '!C' + r, '=' + calcName + '!I' + r, '=' + calcName + '!J' + r]]);
  });
  sh.setFrozenRows(1);
}

function writeStatus_(ss) {
  const sh = ss.getSheetByName('_Status') || ss.insertSheet('_Status');
  sh.clear();
  sh.getRange(1, 1, 1, 3).setValues([['Stand', new Date(), 'HeroWerk Rechner Backend Sheet-Completion-Gate']]);
  sh.getRange(3, 1, 1, 4).setValues([['status','offener Punkt','fehlt von','hinweis']]);
  sh.getRange(4, 1, 4, 4).setValues([
    ['PLATZHALTER','Bruttopreis-Bausteine','Finanzmodell-Update (Benjamin)','Material/Lohn/Overhead/Marge nicht erfinden'],
    ['PLATZHALTER','Vaillant-Preise','Finanzmodell','öffentliche Preise bleiben leer/formelbezogen'],
    ['PLATZHALTER','Vaillant-JAZ','BWP-Rechner (Cowork)','vor Einbau gegenprüfen'],
    ['PLATZHALTER','Vaillant-Stammdaten/SCOP','Recherche done, vor Einbau gegenprüfen','noch nicht in Backend aktiv']
  ]);
}


function getCatalog_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('catalog:v1');
  if (cached) return JSON.parse(cached);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('Geräte_Katalog');
  if (!sh) throw new Error('missing_tab_Geräte_Katalog');
  const values = sh.getRange('A9:O18').getValues();
  const out = [];
  values.forEach(function (row) {
    if (!row[0] || !row[1]) return;
    out.push({
      marke: String(row[0]).toLowerCase(),
      modell: String(row[1]),
      kaskade: String(row[2]).toUpperCase() === 'J',
      grenzeW35: num_(row[7], 0),     // H = Grenze W35 @A-11 (Großraum-konservativ)
      grenzeW55: num_(row[8], 0),     // I = Grenze W55 @A-11
      grenzeW35a10: num_(row[13], 0), // N = Grenze W35 @A-10 (Hannover Stadt; 0 => Fallback A-11)
      grenzeW55a10: num_(row[14], 0), // O = Grenze W55 @A-10
      brutto: num_(row[10], 0),
      stand: String(row[11] || '')
    });
  });
  cache.put('catalog:v1', JSON.stringify(out), CACHE_TTL_SECONDS);
  return out;
}

// PLZ-scharfe Normaußentemperatur (+ Volllaststunden) aus dem Tab Klima_PLZ.
// Spalten: PLZ | Ort | NAT_C | Volllaststunden | Quelle. Zeile mit PLZ '*' = Default (unbekannte PLZ).
function getKlimaPlz_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('klimaplz:v1');
  if (cached) return JSON.parse(cached);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('Klima_PLZ');
  const out = {};
  if (sh) {
    const values = sh.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      const plz = String(values[i][0] || '').trim();
      if (!plz) continue;
      out[plz] = { nat: num_(values[i][2], -11), volllast: num_(values[i][3], 1800) };
    }
  }
  cache.put('klimaplz:v1', JSON.stringify(out), CACHE_TTL_SECONDS);
  return out;
}

function getAllParameters_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('params:v1');
  if (cached) return JSON.parse(cached);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const data = { foerder: readKv_(ss, 'Förder_Parameter'), dimensionierung: readKv_(ss, 'Dimensionierung') };
  cache.put('params:v1', JSON.stringify(data), CACHE_TTL_SECONDS);
  return data;
}
function readKv_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('missing_tab_' + name);
  const values = sh.getDataRange().getValues();
  const out = {};
  for (let i = 1; i < values.length; i++) if (values[i][0] !== '') out[String(values[i][0])] = values[i][1];
  return out;
}
function getPrices_(marke) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(marke === 'vaillant' ? 'Preise_Vaillant' : 'Preise_Wolf');
  if (!sh) throw new Error('missing_tab_preise_' + marke);
  const values = sh.getDataRange().getValues();
  const out = {};
  for (let i = 1; i < values.length; i++) if (values[i][0]) out[String(values[i][0]).toLowerCase()] = num_(values[i][4], 0);
  return out;
}

// Preis-Tafel-Quelle (Single Source): liest Preise_Wolf/Preise_Vaillant live.
// Spalten: Klasse | Modell | Hausgroesse | kW | Endpreis_brutto | Eigenanteil | proKlima_Eigenanteil.
// Eigenanteil = Brutto - KfW-Zuschuss (max. 70 %); proklima = zusaetzlich - proKlima.
// Zeilen ohne Brutto (PLATZHALTER, z. B. Vaillant) werden uebersprungen.
function readPriceTable_(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r[0]) continue;
    const brutto = num_(r[4], 0);
    if (brutto <= 0) continue;
    out.push({
      klasse: String(r[0]).toLowerCase(),
      modell: String(r[1] || ''),
      hausgroesse: String(r[2] || ''),
      kw: String(r[3] || ''),
      brutto: brutto,
      eigen: num_(r[5], 0),
      proklima: num_(r[6], 0)
    });
  }
  return out;
}
function getPriceTableCached_(marke) {
  const cache = CacheService.getScriptCache();
  const key = 'pricetable:' + (marke === 'vaillant' ? 'vaillant' : 'wolf');
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  const rows = readPriceTable_(marke === 'vaillant' ? 'Preise_Vaillant' : 'Preise_Wolf');
  cache.put(key, JSON.stringify(rows), CACHE_TTL_SECONDS);
  return rows;
}
function preise_(p) {
  return { wolf: readPriceTable_('Preise_Wolf'), vaillant: readPriceTable_('Preise_Vaillant') };
}
function isAllowedOrigin_(p) {
  const origin = String(p.origin || p.originToken || 'https://herowerk.de');
  const host = origin.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  return ALLOWED_ORIGIN_RE.test(host);
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function num_(v, fallback) { if (typeof v === 'number') return v; const n = parseFloat(String(v || '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? fallback : n; }
function int_(v, fallback) { const n = parseInt(String(v || '').replace(/\./g, ''), 10); return isNaN(n) ? fallback : n; }
function getNum_(map, key, fallback) { return num_(map[key], fallback); }
function round1_(v) { return Math.round(v * 10) / 10; }
function key_(s) { return String(s).replace(/-/g, '_'); }

function FOERDER_ROWS_() { return [
  ['grundfoerderung_pct',30,'%', 'KfW-Grundförderung','ADR-04 Anhang A / js/site.js calculateFoerder'], ['klimabonus_pct',20,'%', 'Klimageschwindigkeitsbonus','ADR-04 Anhang A'], ['einkommensbonus_pct',30,'%', 'Einkommensbonus bis Einkommensgrenze','ADR-04 Anhang A'], ['effizienzbonus_pct',5,'%', 'Effizienzbonus R290','ADR-04 Anhang A'], ['deckel_selbst_pct',70,'%', 'Maximaler Satz Selbstnutzer','ADR-04 Anhang A'], ['deckel_vermietet_pct',35,'%', 'Maximaler Satz vermietet','ADR-04 Anhang A'], ['gas_klimabonus_min_alter',20,'Jahre', 'Mindestalter Gas-Zentralheizung und Biomasse für Klimabonus','js/site.js getHeizungsalter/calculateFoerder'], ['einkommensgrenze_eur',40000,'EUR', 'Grenze Einkommensbonus','ADR-04 Anhang A'], ['foerderfaehig_we1',30000,'EUR', 'Förderfähige Kosten 1. WE','js/site.js foerderFaehigeKostenGesamt'], ['foerderfaehig_we2bis6',15000,'EUR/WE','Förderfähige Kosten 2. bis 6. WE','js/site.js foerderFaehigeKostenGesamt'], ['foerderfaehig_we7plus',8000,'EUR/WE','Förderfähige Kosten ab 7. WE','js/site.js foerderFaehigeKostenGesamt'], ['proklima_aktiv','N','J/N', 'proKlima global aktiv','GF-Entscheid 15.07.2026: Website aus, Engine bleibt'], ['proklima_pct',5,'%', 'proKlima-Satz','ADR-04 Anhang A'], ['proklima_max_eur',1500,'EUR', 'proKlima-Höchstbetrag','ADR-04 Anhang A'], ['proklima_gemeinden','hannover,seelze,langenhagen,laatzen,hemmingen,ronnenberg','CSV', 'proKlima-Fördergebiet','ADR-04 Anhang A'],
  // --- Reform ab 21.07.2026 (additiv). Defaults im Code = Kanon-Werte: die Engine rechnet auch dann
  // korrekt, wenn diese Zeilen im Sheet noch fehlen. Perioden-Tabelle (Klima/Grenze/EU) = FOERDER_PERIODEN_().
  ['reform_grund_pct',30,'%', 'Grundförderung Reform (EU-Gerät)','Kanon 1.2 / Orakel Z.106'], ['reform_grund_pct_nicht_eu',15,'%', 'Grundförderung Reform ohne EU-Wertschöpfung (ab 01.02.2027)','Kanon 1.2 / Orakel Z.106, Z.114-115'], ['reform_deckel_pct',80,'%', 'Maximaler Satz Selbstnutzer Reform','Kanon 1.2 / Orakel Z.120'], ['reform_eink_pct_bis30',40,'%', 'Einkommensbonus bis 30.000 EUR anrechenbar','Kanon 1.2 / Orakel Z.113'], ['reform_eink_pct_bis40',30,'%', 'Einkommensbonus bis 40.000 EUR anrechenbar','Kanon 1.2 / Orakel Z.113'], ['reform_eink_pct_bis50',10,'%', 'Einkommensbonus bis 50.000 EUR anrechenbar','Kanon 1.2 / Orakel Z.113'], ['reform_eink_grenze_bis30',30000,'EUR', 'Staffelgrenze 1 anrechenbares zvE','Kanon 1.2 / Orakel Z.113'], ['reform_eink_grenze_bis40',40000,'EUR', 'Staffelgrenze 2 anrechenbares zvE','Kanon 1.2 / Orakel Z.113'], ['reform_eink_grenze_bis50',50000,'EUR', 'Staffelgrenze 3 anrechenbares zvE','Kanon 1.2 / Orakel Z.113'], ['reform_kind_abzug_eur',10000,'EUR', 'Einmaliger Abzug vom zvE bei mind. einem minderjährigen Kind','Kanon 1.2 / Orakel Z.109-112'], ['kumulierung_max_pct',60,'%', 'BEG-Kumulierungshöchstsatz aller öffentlichen Mittel','BEG-EM Nr. 8.6 (BAnz AT 29.12.2023 B1) + KfW-Merkblatt 458 12/2025; Kanon 1.3'], ['proklima_frist_ymd',20261031,'YYYYMMDD', 'Letztes Antragsdatum proKlima-Richtlinie','Kanon 1.3 / proKlima-Richtlinie 2026 v1.4'], ['proklima_basis','','Text', 'proKlima-Bemessungsbasis: preis | foerderfaehig (leer = periodenabhängiger Default: Alt foerderfaehig, Reform preis)','Kanon 1.3 / Orakel Z.218 / Kanon 5']
]; }
function DIMENSION_ROWS_() { return [
  ['spez_bedarf_vor1978',180,'kWh/m²a','spezifischer Bedarf vor 1978','js/site.js wizCalculate'], ['spez_bedarf_1978_1994',140,'kWh/m²a','spezifischer Bedarf 1978–1994','js/site.js wizCalculate'], ['spez_bedarf_1995_2010',100,'kWh/m²a','spezifischer Bedarf 1995–2010','js/site.js wizCalculate'], ['spez_bedarf_nach2010',60,'kWh/m²a','spezifischer Bedarf nach 2010','js/site.js wizCalculate'], ['gebaeudef_efh',1.0,'Faktor','Gebäudefaktor EFH','js/site.js wizCalculate'], ['gebaeudef_dhh',0.9,'Faktor','Gebäudefaktor DHH','js/site.js wizCalculate'], ['gebaeudef_rh',0.85,'Faktor','Gebäudefaktor RH','js/site.js wizCalculate'], ['gebaeudef_rh_end',0.85,'Faktor','Gebäudefaktor Reihenendhaus','js/site.js wizCalculate'], ['gebaeudef_zfh',0.95,'Faktor','Gebäudefaktor ZFH','js/site.js wizCalculate'], ['gebaeudef_mfh',0.85,'Faktor','Gebäudefaktor MFH','js/site.js wizCalculate'], ['jaz_vor1978',3.0,'JAZ','JAZ vor 1978','js/site.js wizCalculate'], ['jaz_1978_1994',3.3,'JAZ','JAZ 1978–1994','js/site.js wizCalculate'], ['jaz_1995_2010',3.8,'JAZ','JAZ 1995–2010','js/site.js wizCalculate'], ['jaz_nach2010',4.2,'JAZ','JAZ nach 2010','js/site.js wizCalculate'], ['volllaststunden',1800,'h/a','Volllaststunden-Faktor','js/site.js wizCalculate'], ['ww_zuschlag_faktor',1.10,'Faktor','Warmwasser-Zuschlag Wärmepumpe','js/site.js wizCalculate'], ['oel_faktor',10,'kWh/L','Umrechnung Heizöl','js/site.js OEL_FAKTOR'], ['gas_faktor',10,'kWh/m³','Umrechnung Gas','js/site.js GAS_FAKTOR']
]; }
function WOLF_PRODUCTS_() { return [{klasse:'s',modell:'Wolf CHA-07',hausgroesse:'bis ca. 120 m²',kw:'5–7 kW'},{klasse:'m',modell:'Wolf CHA-10',hausgroesse:'ca. 120–180 m²',kw:'9–12 kW'},{klasse:'l',modell:'Wolf CHA-16/20',hausgroesse:'ca. 180–280 m²',kw:'14–16 kW'},{klasse:'xl',modell:'Wolf CHA-20/24',hausgroesse:'ab 250 m² / 2 WE',kw:'18–24 kW'},{klasse:'xxl',modell:'2× Wolf CHA-16',hausgroesse:'Ref. 6 WE MFH',kw:'2× 16 kW (32 kW)'}]; }
function VAILLANT_PRODUCTS_() { return [{klasse:'s',modell:'',hausgroesse:'',kw:''},{klasse:'m',modell:'',hausgroesse:'',kw:''},{klasse:'l',modell:'',hausgroesse:'',kw:''},{klasse:'xl',modell:'',hausgroesse:'',kw:''},{klasse:'xxl',modell:'',hausgroesse:'',kw:''}]; }
