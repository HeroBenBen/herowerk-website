import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
const clock = '2027-01-01';
let sheets = {},
  hits = 0,
  cache = new Map();
const range = (rows) => ({ getValues: () => structuredClone(rows) });
const c = vm.createContext({
  console,
  Date,
  Utilities: { formatDate: () => clock },
  SpreadsheetApp: {
    openById: () => ({
      getSheetByName: (name) => {
        const rows = sheets[name];
        return rows
          ? {
              getLastRow: () => rows.length,
              getDataRange: () => range(rows),
              getRange: (r, col, n, w) =>
                range(rows.slice(r - 1, r - 1 + n).map((row) => row.slice(col - 1, col - 1 + w))),
            }
          : null;
      },
    }),
  },
  CacheService: {
    getScriptCache: () => ({
      get: (key) => {
        hits++;
        return cache.get(key) || null;
      },
      put: (key, value) => cache.set(key, value),
      remove: (key) => cache.delete(key),
    }),
  },
});
vm.runInContext(fs.readFileSync('apps-script/rechner-backend/kv_engine.gs', 'utf8'), c);
vm.runInContext(fs.readFileSync('apps-script/rechner-backend/Code.gs', 'utf8'), c);
const plain = (v) => JSON.parse(JSON.stringify(v));
const head = [
  'Gerät',
  'Heizsystem',
  'Wert',
  'Quelle',
  'Abrufdatum',
  'Randbedingungen',
  'Aliase',
  'Kaskade',
];
const make = () => ({
  KV_Parameter: [['Schlüssel', 'Wert'], ...plain(c.KV_PARAMETER_ROWS_())],
  KV_FoerderPerioden: [
    [
      'key',
      'ab',
      'bis',
      'label',
      'klima',
      'grenze',
      'eu',
      'cap',
      'eff',
      'kind',
      'stufen',
      'pk',
      'quelle',
    ],
    ...plain(c.KV_PERIODEN_ROWS_()),
  ],
  KV_JAZ: [head, ...plain(c.KV_JAZ_ROWS_())],
  Dimensionierung: [
    ['Schlüssel', 'Wert'],
    ['ww_abzug_kwh_pro_person_jahr', 700],
  ],
});
function read(t) {
  sheets = t;
  cache.clear();
  const p = c.kvGetParams_();
  c.kvJazParameterLaden_(p);
  return p;
}
const neu = make();
const p = read(neu);
assert.equal(p.bioStufen.length, 4);
assert.equal(p.wartungWp, 250);
c.kvJazParameterLaden_(p);
assert.equal(p.jazTabelle.length, 48);
assert.equal(c.kvMapRequest_({}, p).startJahr, 2027);
assert.equal(c.kvMapRequest_({ foerderBetragExtern: '0' }, p).foerderBetragExtern, '0');
assert.equal(c.kvMapRequest_({}, p).pvTog, undefined);
const old = make();
old.KV_Parameter = old.KV_Parameter.filter(
  (r) => !String(r[0]).startsWith('bio_stufe_') && r[0] !== 'jaz_tabellenstand'
);
for (const [j, y, v] of [
  [1, 2029, 0.15],
  [2, 2035, 0.3],
  [3, 2040, 0.6],
])
  old.KV_Parameter.push(['bio_stufe_' + j + '_jahr', y], ['bio_stufe_' + j + '_anteil', v]);
delete old.KV_JAZ;
let po = read(old);
assert.match(po.bioHinweis, /Altes Bio/);
c.kvJazParameterLaden_(po);
assert.equal(po.jazTabellenstand, 'Gebündelter Tabellenstand 26.10.2026');
cache.set('kvparams:v1', JSON.stringify({ falsch: true }));
assert.equal(c.kvGetParams_().falsch, undefined);
assert.ok(cache.has('kvparams:t1245:v3'));
const partial = structuredClone(old);
partial.KV_Parameter.push(['bio_stufe_4_jahr', 2040], ['bio_stufe_4_anteil', 0.6]);
assert.throws(() => read(partial), /Bio-Parameter/);
const missing = make();
delete missing.KV_JAZ;
assert.throws(() => read(missing), /fehlt/);
const invalid = make();
invalid.KV_JAZ[1][2] = '';
assert.throws(() => read(invalid), /ungültig/);
const jobs = [neu, old, partial, missing].map((sheets) => ({ mode: 'parameter', sheets }));
const out = spawnSync('php', ['tests/t1245-kv-runner.php'], {
  encoding: 'utf8',
  input: JSON.stringify(jobs),
  maxBuffer: 5e6,
});
assert.equal(out.status, 0, out.stderr);
const php = JSON.parse(out.stdout);
assert.equal(php[0].value.bioStufen.length, 4);
assert.equal(php[0].value.jazTabelle.length, 48);
assert.match(php[1].value.bioHinweis, /Altes Bio/);
assert.match(php[2].error, /Bio-Parameter/);
// Fehlende Veröffentlichung darf auch PHP nicht still durch einen Seed ersetzen.
const blocked = spawnSync('php', ['tests/t1245-kv-runner.php'], {
  encoding: 'utf8',
  input: JSON.stringify([{ inputs: {}, params: php[3].value }]),
});
assert.equal(blocked.status, 0, blocked.stderr);
assert.match(JSON.parse(blocked.stdout)[0].error, /KV_JAZ/);
console.log(
  'GRÜN T1245 Parameter: Seed, vier Bio-Stufen, Alt-/Teilstand, Cachewechsel, Startjahr 2027 und JAZ-Sperren in JS/PHP'
);
// H2: Auch der öffentliche Apps-Script-/PHP-Förderweg liest keine Kostenvalidierung.
const foerderFrage = {
  we: '1',
  selbstWE: '1',
  heizung: 'oel',
  heizungsalter: '25',
  einkommen: 'ueber90',
  preisManuell: '34500',
  fHalbjahr: 'h2-2026',
};
const foerderTabs = make();
foerderTabs['Förder_Parameter'] = [['schluessel', 'wert'], ...plain(c.FOERDER_ROWS_())];
foerderTabs.Preise_Wolf = [
  ['Klasse', 'Endpreis_brutto'],
  ['m', 34500],
];
const pruefPeriode = foerderTabs.KV_FoerderPerioden.find((r) => r[0] === 'h2-2026');
pruefPeriode[3] = 'Synthetische Prüfförderperiode T1245';
pruefPeriode[4] = 17;
pruefPeriode[5] = 31000;
const kaputt = [
  structuredClone(foerderTabs),
  structuredClone(foerderTabs),
  structuredClone(foerderTabs),
];
kaputt[0].KV_Parameter.find((r) => r[0] === 'bio_stufe_4_anteil')[1] = 0.7;
kaputt[1].KV_Parameter.find((r) => r[0] === 'netzentgelt_jahreswerte')[1] = '[kaputt';
kaputt[2].KV_JAZ[1][2] = '';
const sperren = [/Bio-Parameter/, /Netzentgelt-Jahresreihe/, /KV_JAZ/],
  warnungen = [];
c.console = { ...console, warn: (...v) => warnungen.push(v.join(' ')) };
const foerderAusgabe = (t) => {
  sheets = t;
  cache.clear();
  const foerder = c.foerderung_(foerderFrage),
    p = c.kvGetParams_();
  assert.equal(p.perioden['h2-2026'].grenze, 31000);
  return JSON.stringify({
    foerder,
    perioden: c.foerderPeriodenAusKv_(p),
    waehlbar: c.foerderPeriodenWaehlbar_(p),
  });
};
const foerderSoll = foerderAusgabe(foerderTabs);
kaputt.forEach((t, j) => {
  assert.equal(foerderAusgabe(t), foerderSoll);
  assert.throws(() => c.kostenvergleich_({}), sperren[j]);
  assert.throws(() => c.kvBootstrap_({}), sperren[j]);
  assert.equal(foerderAusgabe(t), foerderSoll);
});
assert.deepEqual(warnungen, []);
const phpJobs = [foerderTabs, ...kaputt].flatMap((sheets) => [
  { mode: 'foerderung', query: foerderFrage, sheets },
  { mode: 'kostenvergleich', query: {}, sheets },
  { mode: 'bootstrap', sheets },
]);
const phpRun = spawnSync('php', ['tests/t1245-kv-runner.php'], {
  encoding: 'utf8',
  input: JSON.stringify(phpJobs),
  maxBuffer: 5e6,
});
assert.equal(phpRun.status, 0, phpRun.stderr);
assert.equal(phpRun.stderr, '', 'keine Förder-Rückfallwarnung');
const phpAntwort = JSON.parse(phpRun.stdout);
assert.ok(phpAntwort[0].value);
assert.ok(phpAntwort[1].value);
assert.ok(phpAntwort[2].value);
const phpSperren = [/Bio-Parameter/, /^Syntax error$/, /KV_JAZ/];
kaputt.forEach((t, j) => {
  assert.deepEqual(phpAntwort[(j + 1) * 3].value, phpAntwort[0].value);
  assert.match(phpAntwort[(j + 1) * 3 + 1].error, phpSperren[j]);
  assert.match(phpAntwort[(j + 1) * 3 + 2].error, phpSperren[j]);
});
console.log(
  'GRÜN H2 Website: ungültige Bio-/Netz-/JAZ-Daten sperren nur Kostenvergleich/Bootstrap; Förderung und Perioden exakt gleich, keine Rückfallwarnung in GS/PHP'
);
