import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { k, plain, base } from './t1245-kv-nutzen.mjs';
const jobs = [];
for (const row of k.KV_JAZ_SEED.filter((r) => !r.kaskade))
  for (let n = 0; n < 20; n++)
    jobs.push({
      inputs: {
        ...base,
        geraet: row.geraet,
        heizsystem: row.heizsystem,
        pvTog: n % 2 === 0,
        pvAnteil: n % 4 === 0 ? 0 : 30,
        heizart: n % 3 ? 'gas' : 'oel',
        vglBrennstoff: n % 3 ? 'gas' : 'oel',
        neuFossilTog: n % 4 !== 0,
        bioTog: n % 3 !== 0,
        startJahr: n % 2 ? 2027 : 2026,
        foerderBetragExtern: n % 5 === 0 ? 0 : null,
        wpZaehler: n % 5 === 1,
        wpArbeitspreis: n % 5 === 1 ? 22 : null,
        wpGrundpreis: n % 5 === 1 ? 100 : null,
        modul14a: n % 5 === 1 ? 'modul2' : 'modul1',
        warmwasserBisherZentral: n % 6 !== 0,
        personen: 4,
        finanzTog: n % 4 === 1,
        dynTarifTog: n % 7 === 0,
      },
      params: plain(k.KV_PARAMS_SEED),
    });
for (const row of k.KV_JAZ_SEED.filter((r) => r.kaskade))
  jobs.push({
    inputs: { ...base, geraet: row.geraet, heizsystem: row.heizsystem },
    params: plain(k.KV_PARAMS_SEED),
  });
for (const override of [
  { netzentgeltTog: true },
  { geraet: 'fehlt' },
  { wpZaehler: true },
  { foerderBetragExtern: -1 },
  { pvAnteil: 101 },
  { startJahr: 2027.5 },
  { modul14a: 'modul2' },
])
  jobs.push({ inputs: { ...base, ...override }, params: plain(k.KV_PARAMS_SEED) });
const result = spawnSync('php', ['tests/t1245-kv-runner.php'], {
  input: JSON.stringify(jobs),
  encoding: 'utf8',
  maxBuffer: 60e6,
});
assert.equal(result.status, 0, result.stderr);
const php = JSON.parse(result.stdout);
let max = 0;
function equal(a, b, p) {
  if (typeof a === 'number' && typeof b === 'number') {
    max = Math.max(max, Math.abs(a - b));
    assert.ok(Math.abs(a - b) < 1e-7, p + ': ' + a + ' != ' + b);
    if (Number.isInteger(a)) assert.equal(a, b, p);
    return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), p);
    for (const key of Object.keys(a)) equal(a[key], b[key], p + '.' + key);
    return;
  }
  assert.equal(a, b, p);
}
for (let j = 0; j < jobs.length; j++) {
  let js;
  try {
    js = { value: plain(k.kvCalculate(jobs[j].inputs, jobs[j].params)) };
  } catch (e) {
    js = { error: e.message };
  }
  equal(js, php[j], 'Fall ' + j);
}
console.log(
  `GRÜN PHP/JS: ${jobs.length} feste Fälle, 30 Geräte-/Heizsystempaare plus Kaskaden und Fehler; größtes Float-Delta ${max}`
);
