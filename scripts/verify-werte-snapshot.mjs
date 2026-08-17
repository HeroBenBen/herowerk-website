import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engineSource = fs.readFileSync(
  path.join(repoRoot, 'apps-script/rechner-backend/kv_engine.gs'),
  'utf8'
);
const codeSource = fs
  .readFileSync(path.join(repoRoot, 'apps-script/rechner-backend/Code.gs'), 'utf8')
  .replace('CONTROLLER_SETZT_WERTE_SNAPSHOT_KEY', 'snapshot-test-secret');

class FakeRange {
  constructor(values) {
    this.values = values;
  }

  getValues() {
    return this.values.map((row) => row.slice());
  }
}

class FakeSheet {
  constructor(values) {
    this.values = values;
  }

  getDataRange() {
    return new FakeRange(this.values);
  }
}

const snapshotRows = {
  KV_Parameter: [
    ['schluessel', 'wert'],
    ['kred_zins_358_eff', 0.98],
  ],
  KV_FoerderPerioden: [
    ['key', 'gueltig_ab'],
    ['h2-2026', '2026-07-21'],
  ],
  Förder_Parameter: [
    ['schluessel', 'wert'],
    ['grundfoerderung_pct', 30],
  ],
  Dimensionierung: [
    ['schluessel', 'wert'],
    ['volllaststunden', 1800],
  ],
  Preise_Wolf: [
    ['Klasse', 'Modell', 'Endpreis_brutto'],
    ['m', 'Wolf CHA-10', 35349],
  ],
  Preise_Vaillant: [
    ['Klasse', 'Modell', 'Endpreis_brutto'],
    ['m', 'Vaillant 75', 32755],
  ],
  Geräte_Katalog: [
    ['Marke', 'Modell'],
    ['wolf', 'Wolf CHA-10'],
  ],
  Geraete_Kennlinien: [
    ['geraete_kennung', 'vorlauf_C', 'aussentemperatur_C', 'heizleistung_volllast_kW'],
    ['CHA-10', 35, -10, 10.4],
  ],
  Klima_PLZ: [
    ['PLZ', 'Ort', 'NAT_C'],
    ...Array.from({ length: 1800 }, (_, index) => [
      String(30000 + index),
      'Hannover Testbezirk ' + index,
      -11,
    ]),
  ],
  Fördervorschuss: [
    ['schluessel', 'wert'],
    ['gesamt', 30],
    ['belegt', 4],
  ],
};

const cacheValues = new Map();
const cachePuts = [];
const requestedSheets = [];
let spreadsheetOpens = 0;
const fakeCache = {
  get(key) {
    return cacheValues.has(key) ? cacheValues.get(key) : null;
  },
  put(key, value, ttl) {
    cacheValues.set(key, value);
    cachePuts.push({ key, ttl });
  },
};

const sandbox = {
  console,
  CacheService: { getScriptCache: () => fakeCache },
  SpreadsheetApp: {
    openById() {
      spreadsheetOpens += 1;
      return {
        getSheetByName(name) {
          requestedSheets.push(name);
          const rows = snapshotRows[name];
          return rows ? new FakeSheet(rows) : null;
        },
      };
    },
  },
  ContentService: {
    MimeType: { JSON: 'JSON' },
    createTextOutput(text) {
      return {
        text,
        setMimeType() {
          return this;
        },
        getContent() {
          return this.text;
        },
      };
    },
  },
};

vm.createContext(sandbox);
vm.runInContext(engineSource, sandbox, { filename: 'kv_engine.gs' });
vm.runInContext(codeSource, sandbox, { filename: 'Code.gs' });

function call(parameters) {
  const output = sandbox.doGet({
    parameter: { origin: 'https://herowerk.de', ...parameters },
  });
  return JSON.parse(output.getContent());
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log('PASS ' + message);
}

const unknown = call({ action: 'nicht_vorhanden' });
const withoutKey = call({ action: 'werte_snapshot' });
const wrongKey = call({ action: 'werte_snapshot', key: 'falsch' });
assert(
  JSON.stringify(withoutKey) === JSON.stringify(unknown),
  'Sammelroute ohne Schlüssel antwortet wie unbekannte Route'
);
assert(
  JSON.stringify(wrongKey) === JSON.stringify(unknown),
  'Sammelroute mit falschem Schlüssel antwortet wie unbekannte Route'
);

cacheValues.clear();
cachePuts.length = 0;
requestedSheets.length = 0;
spreadsheetOpens = 0;

const snapshot = call({ action: 'werte_snapshot', key: 'snapshot-test-secret' });
assert(snapshot.service === 'werte_snapshot', 'Gültiger Schlüssel liefert die Sammelroute');
assert(snapshot.schemaVersion === 2, 'Sammelroute trägt Schema-Version 2');
assert(
  JSON.stringify(Object.keys(snapshot.sheets)) === JSON.stringify(Object.keys(snapshotRows)),
  'Sammelroute enthält genau die zehn freigegebenen Tabellen'
);
assert(
  JSON.stringify(snapshot.sheets.Fördervorschuss) === JSON.stringify(snapshotRows.Fördervorschuss),
  'Sammelroute liefert rohe Tabellenzeilen unverändert'
);
assert(
  JSON.stringify(requestedSheets) === JSON.stringify(Object.keys(snapshotRows)),
  'Sammelroute liest keine weitere Tabelle'
);
assert(
  cachePuts.every(({ ttl }) => ttl === 300),
  'Alle Cache-Blöcke haben 300 Sekunden TTL'
);
assert(
  Number(cacheValues.get('werte_snapshot:v2:parts')) > 1,
  'Großer Rohdatenstand wird auf mehrere Cache-Blöcke verteilt'
);

const opensAfterFirstCall = spreadsheetOpens;
const cachedSnapshot = call({ action: 'werte_snapshot', key: 'snapshot-test-secret' });
assert(
  JSON.stringify(cachedSnapshot) === JSON.stringify(snapshot),
  'Zwischengespeicherter Stand bleibt feld- und reihenfolgegleich'
);
assert(spreadsheetOpens === opensAfterFirstCall, 'Cache-Treffer liest das Sheet nicht erneut');

console.log('ERGEBNIS: 11 von 11 Prüfungen bestanden.');
