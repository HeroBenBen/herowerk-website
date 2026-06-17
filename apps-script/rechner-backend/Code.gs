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
  const d = getAllParameters_().dimensionierung;
  const prices = getPrices_('wolf');
  const flaeche = num_(p.flaeche, 0);
  const baujahr = String(p.baujahr || '1978-1994');
  const gebaeude = String(p.gebaeude || 'efh');
  const sanierung = String(p.sanierung || 'nein');
  const verbrauchKnown = String(p.verbrauchKnown || '').toLowerCase() === 'known' || String(p.verbrauchKnown || '').toLowerCase() === 'true' || String(p.verbrauchKnown || '').toLowerCase() === 'ja';
  let verbrauch = int_(p.verbrauch, 0);
  const einheit = String(p.einheit || 'kwh').toLowerCase();
  if (einheit === 'liter') verbrauch *= getNum_(d, 'oel_faktor', 10);
  if (einheit === 'm3') verbrauch *= getNum_(d, 'gas_faktor', 10);

  const bedarfStufen = ['vor1978', '1978-1994', '1995-2010', 'nach2010'];
  let effBaujahr = baujahr;
  if (sanierung === 'teilweise') {
    const idx = bedarfStufen.indexOf(baujahr);
    if (idx >= 0 && idx < bedarfStufen.length - 1) effBaujahr = bedarfStufen[idx + 1];
  } else if (sanierung === 'umfassend') {
    const idx = bedarfStufen.indexOf(baujahr);
    if (idx >= 0) effBaujahr = bedarfStufen[Math.min(idx + 2, bedarfStufen.length - 1)];
  }

  const bedarf = verbrauchKnown ? verbrauch : Math.round(flaeche * getNum_(d, 'spez_bedarf_' + key_(effBaujahr), 140) * getNum_(d, 'gebaeudef_' + key_(gebaeude), 1.0));
  const jaz = getNum_(d, 'jaz_' + key_(effBaujahr), 3.5);
  const heizleistung = bedarf / getNum_(d, 'volllaststunden', 2000);
  let empfehlung, empIndex;
  if (heizleistung <= getNum_(d, 'kw_schwelle_s_max', 7)) { empfehlung = 's'; empIndex = 0; }
  else if (heizleistung <= getNum_(d, 'kw_schwelle_m_max', 14)) { empfehlung = 'm'; empIndex = 1; }
  else if (heizleistung <= getNum_(d, 'kw_schwelle_l_max', 18)) { empfehlung = 'l'; empIndex = 2; }
  else if (heizleistung <= getNum_(d, 'kw_schwelle_xl_max', 24)) { empfehlung = 'xl'; empIndex = 3; }
  else { empfehlung = 'xxl'; empIndex = 4; }

  const preisBlock = wizardPreisblock_(p, gebaeude, empfehlung, prices[empfehlung] || 0);
  return Object.assign({ empfehlung, empIndex, bedarf, heizleistung, jaz, effBaujahr }, preisBlock);
}

function wizardPreisblock_(p, gebaeude, wpTyp, preis) {
  const f = getAllParameters_().foerder;
  let foerderSatz = getNum_(f, 'grundfoerderung_pct', 30) + getNum_(f, 'effizienzbonus_pct', 5);
  const heizung = String(p.heizung || 'sonstige');
  if (['gas-old', 'oel', 'nachtspeicher', 'gas-etage'].indexOf(heizung) >= 0) foerderSatz += getNum_(f, 'klimabonus_pct', 20);
  foerderSatz = Math.min(foerderSatz, getNum_(f, 'deckel_selbst_pct', 70));
  const gemeinde = String(p.gemeinde || '').toLowerCase();
  const proGemeinden = String(f.proklima_gemeinden || '').split(',').map(function (x) { return x.trim(); });
  const isMehrfach = gebaeude === 'zfh' || gebaeude === 'mfh';
  const isKaskade = wpTyp === 'xxl';
  let zuschuss = 0, proklima = 0;
  if (isKaskade) {
    const foerderWE1 = Math.round(getNum_(f, 'foerderfaehig_we1', 30000) * (foerderSatz / 100));
    const satzVermietetK = Math.min(getNum_(f, 'deckel_vermietet_pct', 35), getNum_(f, 'grundfoerderung_pct', 30) + getNum_(f, 'effizienzbonus_pct', 5));
    const foerderWE26 = Math.round(5 * getNum_(f, 'foerderfaehig_we2bis6', 15000) * (satzVermietetK / 100));
    zuschuss = foerderWE1 + foerderWE26;
  } else if (isMehrfach) {
    const foerderFaehig = getNum_(f, 'foerderfaehig_we1', 30000) + getNum_(f, 'foerderfaehig_we2bis6', 15000);
    const proWE = foerderFaehig / 2;
    const zuschussSelbst = Math.round(proWE * (foerderSatz / 100));
    const satzVermietet = Math.min(getNum_(f, 'deckel_vermietet_pct', 35), getNum_(f, 'grundfoerderung_pct', 30) + getNum_(f, 'effizienzbonus_pct', 5));
    const zuschussVermietet = Math.round(proWE * (satzVermietet / 100));
    zuschuss = zuschussSelbst + zuschussVermietet;
    proklima = proGemeinden.indexOf(gemeinde) >= 0 ? Math.min(Math.round(foerderFaehig * getNum_(f, 'proklima_pct', 5) / 100), getNum_(f, 'proklima_max_eur', 1500)) : 0;
  } else {
    const foerderBasis = Math.min(preis, getNum_(f, 'foerderfaehig_we1', 30000));
    zuschuss = Math.round(foerderBasis * (foerderSatz / 100));
    proklima = proGemeinden.indexOf(gemeinde) >= 0 ? Math.min(Math.round(foerderBasis * getNum_(f, 'proklima_pct', 5) / 100), getNum_(f, 'proklima_max_eur', 1500)) : 0;
  }
  return { preis, zuschuss, proklima, eigenanteil: Math.max(0, preis - zuschuss - proklima) };
}

function foerderung_(p) {
  const f = getAllParameters_().foerder;
  const we = int_(p.we, 1);
  const selbstWE = int_(p.selbstWE, 1);
  const heizung = String(p.heizung || 'gas');
  const einkommen = String(p.einkommen || 'ueber40');
  const gemeinde = String(p.gemeinde || '').toLowerCase();
  const marke = String(p.marke || 'wolf').toLowerCase();
  if (marke === 'vaillant') return { error: true, message: 'vaillant_noch_nicht_verfuegbar' };
  const prices = getPrices_(marke);
  const wpTyp = String(p.wpTyp || 'm').toLowerCase();
  const preis = p.preisManuell !== undefined && p.preisManuell !== '' ? int_(p.preisManuell, 34510) : (prices[wpTyp] || 34510);
  let satzSelbst = getNum_(f, 'grundfoerderung_pct', 30);
  let klimaBonus = false;
  if (heizung === 'oel' || heizung === 'nachtspeicher' || heizung === 'gas-etage') klimaBonus = true;
  else if (heizung === 'gas') klimaBonus = int_(p.heizungsalter, 20) >= getNum_(f, 'gas_klimabonus_min_alter', 20);
  if (selbstWE > 0 && klimaBonus) satzSelbst += getNum_(f, 'klimabonus_pct', 20);
  if (einkommen === 'unter40') satzSelbst += getNum_(f, 'einkommensbonus_pct', 30);
  satzSelbst += getNum_(f, 'effizienzbonus_pct', 5);
  satzSelbst = Math.min(satzSelbst, getNum_(f, 'deckel_selbst_pct', 70));
  const satzVermietet = Math.min(getNum_(f, 'deckel_vermietet_pct', 35), getNum_(f, 'grundfoerderung_pct', 30) + getNum_(f, 'effizienzbonus_pct', 5));
  const foerderFaehigGesamt = foerderFaehigeKostenGesamt_(we, f);
  const foerderProWE = foerderFaehigGesamt / we;
  const kostenProWE = Math.min(foerderProWE, preis / we);
  const vermieteteWE = we - selbstWE;
  const zuschussSelbst = selbstWE > 0 ? Math.round(kostenProWE * (satzSelbst / 100)) : 0;
  const zuschussVermietet = vermieteteWE > 0 ? Math.round(kostenProWE * (satzVermietet / 100) * vermieteteWE) : 0;
  const zuschussGesamt = zuschussSelbst + zuschussVermietet;
  const proGemeinden = String(f.proklima_gemeinden || '').split(',').map(function (x) { return x.trim(); });
  const proklimaZuschuss = proGemeinden.indexOf(gemeinde) >= 0 && String(p.proklimaOptin) === 'ja' ? Math.min(Math.round(foerderFaehigGesamt * getNum_(f, 'proklima_pct', 5) / 100), getNum_(f, 'proklima_max_eur', 1500)) : 0;
  const eigenanteil = Math.max(0, preis - zuschussGesamt - proklimaZuschuss);
  const kfwSatz = selbstWE > 0 ? satzSelbst : satzVermietet;
  const effektivSatz = preis > 0 ? Math.round(((zuschussGesamt + proklimaZuschuss) / preis) * 100) : 0;
  const bausteine = ['Grundförderung 30%', 'Effizienzbonus (R290) +5%'];
  if (selbstWE > 0 && klimaBonus) bausteine.splice(1, 0, 'Klimageschwindigkeitsbonus +20%');
  if (selbstWE > 0 && einkommen === 'unter40') bausteine.splice(1, 0, 'Einkommensbonus +30%');
  if (proklimaZuschuss > 0) bausteine.push('proKlima Zuschuss ' + proklimaZuschuss + ' €');
  return { kfwSatz, zuschussGesamt, proklimaZuschuss, eigenanteil, effektivSatz, preis, klimaBonus, bausteine };
}

function foerderFaehigeKostenGesamt_(we, f) {
  if (we <= 1) return getNum_(f, 'foerderfaehig_we1', 30000);
  if (we <= 6) return getNum_(f, 'foerderfaehig_we1', 30000) + (we - 1) * getNum_(f, 'foerderfaehig_we2bis6', 15000);
  return getNum_(f, 'foerderfaehig_we1', 30000) + 5 * getNum_(f, 'foerderfaehig_we2bis6', 15000) + (we - 6) * getNum_(f, 'foerderfaehig_we7plus', 8000);
}

function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  writeKeyValueDoc_(ss, 'Förder_Parameter', FOERDER_ROWS_());
  writeKeyValueDoc_(ss, 'Dimensionierung', DIMENSION_ROWS_());
  writeKalkulationWolf_(ss);
  writeKalkulationVaillant_(ss);
  writePreiseFromKalkulation_(ss, 'Preise_Wolf', 'Kalkulation_Wolf', WOLF_PRODUCTS_());
  writePreiseFromKalkulation_(ss, 'Preise_Vaillant', 'Kalkulation_Vaillant', VAILLANT_PRODUCTS_());
  writeStatus_(ss);
  CacheService.getScriptCache().remove('params:v1');
}

function writeKeyValueDoc_(ss, name, rows) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, 5).setValues([['schluessel', 'wert', 'einheit', 'bedeutung', 'quelle']]);
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
function isAllowedOrigin_(p) {
  const origin = String(p.origin || p.originToken || 'https://herowerk.de');
  const host = origin.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  return ALLOWED_ORIGIN_RE.test(host);
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function num_(v, fallback) { if (typeof v === 'number') return v; const n = parseFloat(String(v || '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? fallback : n; }
function int_(v, fallback) { const n = parseInt(String(v || '').replace(/\./g, ''), 10); return isNaN(n) ? fallback : n; }
function getNum_(map, key, fallback) { return num_(map[key], fallback); }
function key_(s) { return String(s).replace(/-/g, '_'); }

function FOERDER_ROWS_() { return [
  ['grundfoerderung_pct',30,'%', 'KfW-Grundförderung','ADR-04 Anhang A / js/site.js calculateFoerder'], ['klimabonus_pct',20,'%', 'Klimageschwindigkeitsbonus','ADR-04 Anhang A'], ['einkommensbonus_pct',30,'%', 'Einkommensbonus bis Einkommensgrenze','ADR-04 Anhang A'], ['effizienzbonus_pct',5,'%', 'Effizienzbonus R290','ADR-04 Anhang A'], ['deckel_selbst_pct',70,'%', 'Maximaler Satz Selbstnutzer','ADR-04 Anhang A'], ['deckel_vermietet_pct',35,'%', 'Maximaler Satz vermietet','ADR-04 Anhang A'], ['gas_klimabonus_min_alter',20,'Jahre', 'Mindestalter Gas-Zentralheizung für Klimabonus','js/site.js getHeizungsalter/calculateFoerder'], ['einkommensgrenze_eur',40000,'EUR', 'Grenze Einkommensbonus','ADR-04 Anhang A'], ['foerderfaehig_we1',30000,'EUR', 'Förderfähige Kosten 1. WE','js/site.js foerderFaehigeKostenGesamt'], ['foerderfaehig_we2bis6',15000,'EUR/WE', 'Förderfähige Kosten 2.–6. WE','js/site.js foerderFaehigeKostenGesamt'], ['foerderfaehig_we7plus',8000,'EUR/WE', 'Förderfähige Kosten ab 7. WE','js/site.js foerderFaehigeKostenGesamt'], ['proklima_pct',5,'%', 'proKlima-Satz','ADR-04 Anhang A'], ['proklima_max_eur',1500,'EUR', 'proKlima-Höchstbetrag','ADR-04 Anhang A'], ['proklima_gemeinden','hannover,seelze,langenhagen,laatzen,hemmingen,ronnenberg','CSV', 'proKlima-Fördergebiet','ADR-04 Anhang A']
]; }
function DIMENSION_ROWS_() { return [
  ['spez_bedarf_vor1978',180,'kWh/m²a','spezifischer Bedarf vor 1978','js/site.js wizCalculate'], ['spez_bedarf_1978_1994',140,'kWh/m²a','spezifischer Bedarf 1978–1994','js/site.js wizCalculate'], ['spez_bedarf_1995_2010',100,'kWh/m²a','spezifischer Bedarf 1995–2010','js/site.js wizCalculate'], ['spez_bedarf_nach2010',60,'kWh/m²a','spezifischer Bedarf nach 2010','js/site.js wizCalculate'], ['gebaeudef_efh',1.0,'Faktor','Gebäudefaktor EFH','js/site.js wizCalculate'], ['gebaeudef_dhh',0.9,'Faktor','Gebäudefaktor DHH','js/site.js wizCalculate'], ['gebaeudef_rh',0.85,'Faktor','Gebäudefaktor RH','js/site.js wizCalculate'], ['gebaeudef_rh_end',0.85,'Faktor','Gebäudefaktor Reihenendhaus','js/site.js wizCalculate'], ['gebaeudef_zfh',1.15,'Faktor','Gebäudefaktor ZFH','js/site.js wizCalculate'], ['gebaeudef_mfh',1.3,'Faktor','Gebäudefaktor MFH','js/site.js wizCalculate'], ['jaz_vor1978',3.0,'JAZ','JAZ vor 1978','js/site.js wizCalculate'], ['jaz_1978_1994',3.3,'JAZ','JAZ 1978–1994','js/site.js wizCalculate'], ['jaz_1995_2010',3.8,'JAZ','JAZ 1995–2010','js/site.js wizCalculate'], ['jaz_nach2010',4.2,'JAZ','JAZ nach 2010','js/site.js wizCalculate'], ['volllaststunden',2000,'h/a','Volllaststunden-Faktor','js/site.js wizCalculate'], ['kw_schwelle_s_max',7,'kW','Grenze Klasse S','js/site.js wizCalculate'], ['kw_schwelle_m_max',14,'kW','Grenze Klasse M','js/site.js wizCalculate'], ['kw_schwelle_l_max',18,'kW','Grenze Klasse L','js/site.js wizCalculate'], ['kw_schwelle_xl_max',24,'kW','Grenze Klasse XL','js/site.js wizCalculate'], ['oel_faktor',10,'kWh/L','Umrechnung Heizöl','js/site.js OEL_FAKTOR'], ['gas_faktor',10,'kWh/m³','Umrechnung Gas','js/site.js GAS_FAKTOR']
]; }
function WOLF_PRODUCTS_() { return [{klasse:'s',modell:'Wolf CHA-07',hausgroesse:'bis ca. 120 m²',kw:'5–7 kW'},{klasse:'m',modell:'Wolf CHA-10',hausgroesse:'ca. 120–180 m²',kw:'9–12 kW'},{klasse:'l',modell:'Wolf CHA-16/20',hausgroesse:'ca. 180–280 m²',kw:'14–16 kW'},{klasse:'xl',modell:'Wolf CHA-20/24',hausgroesse:'ab 250 m² / 2 WE',kw:'18–24 kW'},{klasse:'xxl',modell:'2× Wolf CHA-16',hausgroesse:'Ref. 6 WE MFH',kw:'2× 16 kW (32 kW)'}]; }
function VAILLANT_PRODUCTS_() { return [{klasse:'s',modell:'',hausgroesse:'',kw:''},{klasse:'m',modell:'',hausgroesse:'',kw:''},{klasse:'l',modell:'',hausgroesse:'',kw:''},{klasse:'xl',modell:'',hausgroesse:'',kw:''},{klasse:'xxl',modell:'',hausgroesse:'',kw:''}]; }
