/**
 * Isolierter Nachweis für T585. Liest ein per STDIN geliefertes Abbild einer Google-Sheets-Kopie
 * und rechnet Repo-Apps-Script, gezogene Live-Fassung und PHP-Kern gegen exakt dieselben Zeilen.
 *
 * Aufruf:
 *   node tests/foerder-periodenquelle-sheet-harness.mjs \
 *     --live-code /pfad/Code.js --live-engine /pfad/kv_engine.js < kopiedaten.json
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

const eingabe = JSON.parse(fs.readFileSync(0, 'utf8'));
assert.notEqual(
  eingabe.copyId,
  eingabe.sourceId,
  'Testkopie und Produktivblatt müssen verschiedene IDs haben'
);

const foerderRows = eingabe.sheets['Förder_Parameter'];
const parameterRows = eingabe.sheets.KV_Parameter;
const periodenRows = eingabe.sheets.KV_FoerderPerioden;
assert.ok(foerderRows?.length > 1 && parameterRows?.length > 1 && periodenRows?.length > 1);

const f = Object.fromEntries(
  foerderRows
    .slice(1)
    .filter((row) => row[0])
    .map((row) => [String(row[0]), row[1]])
);
const h2 = periodenRows.find((row) => row[0] === 'h2-2026');
assert.equal(h2[7], 70, 'Kopie muss h2-2026 cap=70 tragen');
assert.equal(h2[9], 0, 'Kopie muss h2-2026 kind_freibetrag=0 tragen');
assert.equal(Number(f.reform_deckel_pct), 80, 'Rückfallwert muss absichtlich cap=80 widersprechen');
assert.equal(
  Number(f.reform_kind_abzug_eur),
  10000,
  'Rückfallwert muss absichtlich Kinderabzug=10.000 widersprechen'
);

const faelle = [
  {
    id: 'bis30-ohne-kind',
    einkommen: 'bis30',
    kind: 'nein',
    soll: { satz: 70, zuschuss: 19600, eigenanteil: 14910, bonus: 40 },
  },
  {
    id: 'bis60-mit-kind',
    einkommen: 'bis60',
    kind: 'ja',
    soll: { satz: 46, zuschuss: 12880, eigenanteil: 21630, bonus: 0 },
  },
];

function rechneAppsScript(codePath, enginePath) {
  const sheetMap = {
    KV_Parameter: parameterRows.slice(1),
    KV_FoerderPerioden: periodenRows.slice(1),
  };
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (name) => {
          const rows = sheetMap[name];
          if (!rows) return null;
          return {
            getLastRow: () => rows.length + 1,
            getRange: () => ({ getValues: () => rows }),
          };
        },
      }),
    },
    ContentService: {
      MimeType: { JSON: 'JSON' },
      createTextOutput() {
        throw new Error('nicht erlaubt');
      },
    },
    Utilities: {},
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(enginePath, 'utf8'), sandbox, { filename: enginePath });
  vm.runInContext(fs.readFileSync(codePath, 'utf8'), sandbox, { filename: codePath });
  const params = sandbox.foerderParamsMitRueckfall_(sandbox.kvGetParams_(), f, () => {});
  const perioden = sandbox.foerderPeriodenAusKv_(params);
  return faelle.map((fall) => {
    const out = sandbox.foerderCalc_(
      {
        we: '1',
        selbstWE: '1',
        heizung: 'gas',
        heizungsalter: '25',
        preis: '34510',
        einkommen: fall.einkommen,
        kind: fall.kind,
      },
      f,
      '2026-08-20T12:00:00',
      perioden
    );
    return {
      satz: out.kfwSatz,
      zuschuss: out.zuschussGesamt,
      eigenanteil: out.eigenanteil,
      bonus: out.einkommensbonusPct,
    };
  });
}

const repo = rechneAppsScript(
  'apps-script/rechner-backend/Code.gs',
  'apps-script/rechner-backend/kv_engine.gs'
);
const live = rechneAppsScript(argument('--live-code'), argument('--live-engine'));

const phpRunner = String.raw`
require 'api/rechner-engine.php';
$in = json_decode(stream_get_contents(STDIN), true);
$sheets = $in['sheets'];
$f = hw_read_kv($sheets, 'Förder_Parameter');
$params = hw_foerder_params_mit_rueckfall(hw_kv_get_params($sheets), $f, static function (): void {});
$perioden = hw_foerder_perioden_aus_kv($params);
$out = [];
foreach ($in['faelle'] as $fall) {
    $r = hw_foerder_calc([
        'we' => 1, 'selbstWE' => 1, 'heizung' => 'gas', 'heizungsalter' => 25,
        'preis' => 34510, 'einkommen' => $fall['einkommen'], 'kind' => $fall['kind'],
    ], $f, '2026-08-20T12:00:00', $perioden);
    $out[] = ['satz' => $r['kfwSatz'], 'zuschuss' => $r['zuschussGesamt'],
              'eigenanteil' => $r['eigenanteil'], 'bonus' => $r['einkommensbonusPct']];
}
echo json_encode($out);
`;
const phpRun = spawnSync('php', ['-r', phpRunner], {
  input: JSON.stringify({ sheets: eingabe.sheets, faelle }),
  encoding: 'utf8',
});
assert.equal(phpRun.status, 0, phpRun.stderr);
const php = JSON.parse(phpRun.stdout);

for (let index = 0; index < faelle.length; index++) {
  assert.deepEqual(repo[index], faelle[index].soll, `Repo-Apps-Script: ${faelle[index].id}`);
  assert.deepEqual(live[index], faelle[index].soll, `Live-Apps-Script-Abzug: ${faelle[index].id}`);
  assert.deepEqual(php[index], faelle[index].soll, `PHP: ${faelle[index].id}`);
  console.log(
    `PASS | ${faelle[index].id} | Satz ${faelle[index].soll.satz} % | ` +
      `Zuschuss ${faelle[index].soll.zuschuss} € | Eigenanteil ${faelle[index].soll.eigenanteil} € | ` +
      `Repo = Live-Abzug = PHP`
  );
}
console.log(
  `KOPIE ${eingabe.copyId} gewinnt gegen unveränderte Rückfallwerte; Produktivblatt ${eingabe.sourceId} nicht beschrieben.`
);
