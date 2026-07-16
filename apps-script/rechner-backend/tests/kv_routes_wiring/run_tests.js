/**
 * O-5 VM-Gate für das Apps-Script-Wiring.
 * Kein Netz, kein Live-Sheet, kein Deploy. Fake-Sheet, Fake-Cache und feste
 * Europe/Berlin-Uhr prüfen Dispatcher, Dezimal-Caster und gemeinsame Periodenquelle.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const engineSrc = fs.readFileSync(path.join(ROOT, 'kv_engine.gs'), 'utf8');
const codeSrc = fs.readFileSync(path.join(ROOT, 'Code.gs'), 'utf8');

let clockIso = '2026-08-15';
class FixedDate extends Date {
  constructor(value) {
    super(arguments.length ? value : clockIso + 'T12:00:00+02:00');
  }
}

class FakeRange {
  constructor(values) { this.values = values; }
  getValues() { return this.values.map((row) => row.slice()); }
}

class FakeSheet {
  constructor(rows) { this.rows = rows; }
  getLastRow() { return this.rows.length; }
  getDataRange() { return new FakeRange(this.rows); }
  getRange(row, col, numRows, numCols) {
    const values = [];
    for (let r = 0; r < numRows; r++) {
      const source = this.rows[row - 1 + r] || [];
      values.push(source.slice(col - 1, col - 1 + numCols));
    }
    return new FakeRange(values);
  }
}

class FakeSpreadsheet {
  constructor(tabs) { this.tabs = tabs; }
  getSheetByName(name) { return this.tabs[name] || null; }
}

const cacheData = new Map();
const cachePuts = [];
const fakeCache = {
  get(key) { return cacheData.has(key) ? cacheData.get(key) : null; },
  put(key, value, ttl) { cacheData.set(key, value); cachePuts.push({ key, ttl }); },
  remove(key) { cacheData.delete(key); },
};

let openCount = 0;
let spreadsheet = new FakeSpreadsheet({});
const sandbox = {
  console,
  Date: FixedDate,
  SpreadsheetApp: { openById() { openCount++; return spreadsheet; } },
  CacheService: { getScriptCache() { return fakeCache; } },
  ContentService: {
    MimeType: { JSON: 'JSON' },
    createTextOutput(text) {
      return {
        text,
        setMimeType() { return this; },
        getContent() { return this.text; },
      };
    },
  },
  Utilities: { formatDate() { return clockIso; } },
};
vm.createContext(sandbox);
vm.runInContext(engineSrc, sandbox, { filename: 'kv_engine.gs' });
vm.runInContext(codeSrc, sandbox, { filename: 'Code.gs' });

function keyValueRows(rows) {
  return [['schluessel', 'wert', 'einheit', 'bedeutung', 'quelle']].concat(rows);
}
function periodenRows(rows) {
  return [['key', 'gueltig_ab', 'gueltig_bis', 'label', 'klima_pct', 'grenze',
    'eu_differenzierung', 'cap', 'effizienz_pct', 'kind_freibetrag',
    'eink_stufen', 'proklima_erlaubt', 'quelle']].concat(rows);
}
function freshTabs() {
  return {
    KV_Parameter: new FakeSheet(keyValueRows(sandbox.KV_PARAMETER_ROWS_())),
    KV_FoerderPerioden: new FakeSheet(periodenRows(sandbox.KV_PERIODEN_ROWS_())),
    'Förder_Parameter': new FakeSheet(keyValueRows(sandbox.FOERDER_ROWS_())),
    Dimensionierung: new FakeSheet(keyValueRows([['test', 1, '', '', '']])),
    Preise_Wolf: new FakeSheet([
      ['Klasse', 'Modell', 'Hausgröße', 'kW', 'Endpreis_brutto', 'Eigenanteil', 'proKlima_Eigenanteil'],
      ['m', 'Wolf Test', 'Test', '10', 30000, 17120, ''],
    ]),
    Preise_Vaillant: new FakeSheet([
      ['Klasse', 'Modell', 'Hausgröße', 'kW', 'Endpreis_brutto', 'Eigenanteil', 'proKlima_Eigenanteil'],
    ]),
  };
}
function reset(tabs) {
  spreadsheet = new FakeSpreadsheet(tabs || freshTabs());
  cacheData.clear();
  cachePuts.length = 0;
  openCount = 0;
}
function call(params) {
  const out = sandbox.doGet({ parameter: Object.assign({ origin: 'https://herowerk.de' }, params) });
  return JSON.parse(out.getContent());
}

let pass = 0;
const fails = [];
function check(id, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log('PASS ' + id);
  } else {
    fails.push(id + ': ist=' + a + ' soll=' + e);
    console.log('FAIL ' + id);
  }
}

reset();
const boot = call({ action: 'kv_bootstrap' });
check('Route kv_bootstrap', { service: boot.service, perioden: boot.perioden.length, aktiv: boot.aktivePeriode },
  { service: 'kv_bootstrap', perioden: 6, aktiv: 'h2-2026' });

const decimal = call({
  action: 'kostenvergleich', fHalbjahr: 'h2-2026', jaz: '3.8', kredZins: '0.7',
  stromEntw: '-0.5', gasStg: '2.5', strompreis: '32.5',
});
check('Route kostenvergleich', decimal.service, 'kostenvergleich');
check('Dezimalwerte kvNum_', {
  jaz: decimal.inputsEcho.jaz,
  kredZins: decimal.inputsEcho.kredZins,
  stromEntw: decimal.inputsEcho.stromEntw,
  gasStg: decimal.inputsEcho.gasStg,
  strompreis: decimal.inputsEcho.strompreis,
}, { jaz: 3.8, kredZins: 0.7, stromEntw: -0.5, gasStg: 2.5, strompreis: 32.5 });
check('kvparams Cache-Key und TTL', cachePuts.some((x) => x.key === 'kvparams:v1' && x.ttl === 300), true);

reset();
const blocked = call({ action: 'kostenvergleich', origin: 'https://fremd.de' });
check('Origin-Gate vor Sheet', { message: blocked.message, sheetReads: openCount },
  { message: 'origin_not_allowed', sheetReads: 0 });

reset();
const invalidPeriod = call({ action: 'kostenvergleich', fHalbjahr: 'quatsch' });
check('Ungültige Periode fällt auf Serverzeit',
  { periode: invalidPeriod.inputsEcho.fHalbjahr, automatisch: invalidPeriod.periodeAutomatik },
  { periode: 'h2-2026', automatisch: true });

const estimated = call({
  action: 'kostenvergleich', bedarfModus: 'schaetzung', geb: 'efh',
  bj: '1978-1994', san: 'teilweise', flaeche: '140',
});
const estimatedNoRenovation = call({
  action: 'kostenvergleich', bedarfModus: 'schaetzung', geb: 'efh',
  bj: '1978-1994', san: 'nein', flaeche: '140',
});
check('Gebäudeschätzung Seed-Parität', {
  teilweise: estimated.inputsEcho.bedarf,
  nein: estimatedNoRenovation.inputsEcho.bedarf,
}, { teilweise: 14000, nein: 19500 });

reset();
const spez1978 = spreadsheet.tabs.KV_Parameter.rows.find((r) => r[0] === 'wz_spez_1978_1994');
spez1978[1] = 200;
const bootSpez1978 = call({ action: 'kv_bootstrap' });
const estimateSpez1978 = call({
  action: 'kostenvergleich', bedarfModus: 'schaetzung', geb: 'efh',
  bj: '1978-1994', san: 'nein', flaeche: '140',
});
check('Sheet-Treiber 1978 bis 1994 wirkt in Bootstrap und Schätzung', {
  bootstrap: bootSpez1978.schaetzung.spezVerbrauch['1978-1994'],
  bedarf: estimateSpez1978.inputsEcho.bedarf,
}, { bootstrap: 200, bedarf: 28000 });

reset();
const spez1995 = spreadsheet.tabs.KV_Parameter.rows.find((r) => r[0] === 'wz_spez_1995_2010');
spez1995[1] = 200;
const bootSpez1995 = call({ action: 'kv_bootstrap' });
const estimateSpez1995 = call({
  action: 'kostenvergleich', bedarfModus: 'schaetzung', geb: 'efh',
  bj: '1978-1994', san: 'teilweise', flaeche: '140',
});
check('Sanierungssprung nutzt mutierten Zielstufen-Treiber', {
  bootstrap: bootSpez1995.schaetzung.spezVerbrauch['1995-2010'],
  bedarf: estimateSpez1995.inputsEcho.bedarf,
}, { bootstrap: 200, bedarf: 28000 });

reset();
const mutationRow = spreadsheet.tabs.KV_FoerderPerioden.rows.find((r) => r[0] === 'h2-2026');
mutationRow[4] = 17;
const kvMutiert = call({ action: 'kostenvergleich', fHalbjahr: 'h2-2026' });
cacheData.clear();
const foerderMutiert = call({ action: 'foerderung', einkommen: 'ueber50', preisManuell: '30000', heizungsalter: '20' });
check('Sheet-Mutation wirkt auf beide Routen', {
  kvQuote: kvMutiert.foerder.quote,
  kvBetrag: kvMutiert.foerder.anzeigeBetrag,
  foerderQuote: foerderMutiert.kfwSatz,
  foerderBetrag: foerderMutiert.zuschussGesamt,
}, { kvQuote: 47, kvBetrag: 13160, foerderQuote: 47, foerderBetrag: 13160 });

reset();
delete spreadsheet.tabs.KV_Parameter;
delete spreadsheet.tabs.KV_FoerderPerioden;
const kvSeed = call({ action: 'kostenvergleich', fHalbjahr: 'h2-2026' });
const bootSeed = call({ action: 'kv_bootstrap' });
cacheData.clear();
const foerderSeed = call({ action: 'foerderung', einkommen: 'ueber50', preisManuell: '30000', heizungsalter: '20' });
check('Fehlende Tabs nutzen gemeinsamen Seed', {
  kvQuote: kvSeed.foerder.quote,
  bootPeriode: bootSeed.aktivePeriode,
  foerderQuote: foerderSeed.kfwSatz,
}, { kvQuote: 46, bootPeriode: 'h2-2026', foerderQuote: 46 });

clockIso = '2026-07-15';
reset();
const kvAlt = call({
  action: 'kostenvergleich', fHalbjahr: 'alt', invWP: '30000', fEinkSlider: '60000',
  fEffizienz: '1', proklimaTog: '1',
});
cacheData.clear();
const foerderAlt = call({
  action: 'foerderung', einkommen: 'ueber50', preisManuell: '30000', heizungsalter: '20',
  gemeinde: 'hannover', proklimaOptin: 'ja',
});
check('Alt-Parität 1 WE selbstgenutzt ohne proKlima', {
  kvQuote: kvAlt.foerder.quote,
  kvBetrag: kvAlt.foerder.anzeigeBetrag,
  kvPro: kvAlt.foerder.proKlimaEffektiv,
  kvProInput: kvAlt.inputsEcho.proklimaTog,
  foerderQuote: foerderAlt.kfwSatz,
  foerderBetrag: foerderAlt.zuschussGesamt,
  foerderPro: foerderAlt.proklimaZuschuss,
}, { kvQuote: 55, kvBetrag: 16500, kvPro: 0, kvProInput: false, foerderQuote: 55, foerderBetrag: 16500, foerderPro: 0 });

clockIso = '2026-08-15';
reset();
const health = call({ action: 'health' });
const prices = call({ action: 'preise' });
check('Health bleibt erreichbar', { status: health.status, ready: health.ready }, { status: 'ok', ready: true });
check('Bestandsdispatcher Preise bleibt erreichbar', { wolf: prices.wolf.length, vaillant: prices.vaillant.length }, { wolf: 1, vaillant: 0 });

const kvFunctions = [sandbox.kvMapRequest_, sandbox.kostenvergleich_, sandbox.kvGetParams_];
check('KV-Wiring ruft num_ nie auf', kvFunctions.some((fn) => /(^|[^A-Za-z])num_\s*\(/m.test(String(fn))), false);

if (fails.length) {
  console.error('\nFEHLER:\n' + fails.join('\n'));
  console.error(`ERGEBNIS: ${pass} PASS, ${fails.length} FAIL`);
  process.exit(1);
}
console.log(`\nERGEBNIS: ${pass}/${pass} PASS.`);
