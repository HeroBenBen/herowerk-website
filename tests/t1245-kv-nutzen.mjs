import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c = vm.createContext({ module: { exports: {} }, console });
vm.runInContext(fs.readFileSync('apps-script/rechner-backend/kv_engine.gs', 'utf8'), c);
export const k = c.module.exports;
export const plain = (x) => JSON.parse(JSON.stringify(x));
export const base = {
  ...plain(k.KV_DEFAULTS),
  geraet: '5078',
  heizsystem: 'heizkoerper',
  startJahr: 2026,
  bedarf: 18000,
  eta: 80,
  invWP: 34500,
  strompreis: 30,
  gaspreis: 11.5,
};
export const run = (i = {}, p = {}) =>
  k.kvCalculate({ ...base, ...i }, { ...plain(k.KV_PARAMS_SEED), ...p });
export const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
export function checks() {
  const targets = [
    { pv: true, st: 1, be: 11, v: 27077 },
    { pv: false, st: 1, be: 12, v: 20944 },
    { pv: true, st: 2, be: 6, v: 49301 },
    { pv: false, st: 2, be: 7, v: 43167 },
  ];
  for (const t of targets) {
    const r = run({ pvTog: t.pv, neuFossilTog: t.st === 2, bioTog: t.st === 2 });
    assert.equal(Math.round(r.ergebnis.wpNG), t.v);
    assert.equal(r.ergebnis.breakEven, t.be);
    assert.equal(r.sensi.basis, r.ergebnis.wpNG);
    near(r.system.wpStrom, 14400 / 3.9);
    assert.equal(r.invest.investDelta, t.st === 2 ? 9620 : 21620);
    if (t.pv) near(r.jahre[0].wpGes, 946.7030769230769);
    if (t.st === 1) near(r.jahre[0].fossilG, 2609.38);
    else assert.equal(Math.round(r.posten.bioNetto), 19581);
  }
  const r = run({ pvTog: true });
  for (const d of r.jahre) {
    near(d.wpGes, d.netzStromK + d.pvKosten + d.wpW + d.wpGrundpreis - d.modul14a - d.dynSav);
    near(
      d.fossilG,
      d.fossilK +
        d.co2St +
        d.fossilW +
        d.grundpreisGas +
        d.schornsteinfeger +
        d.netzentgelt +
        d.wwStromK
    );
    near(d.jSav, d.fossilG - d.wpGes);
  }
  near(
    r.ergebnis.totFossil,
    r.jahre.reduce((s, d) => s + d.fossilG, 0)
  );
  near(r.dreiWege.gas.betrieb, r.ergebnis.totFossil);
  near(r.dreiWege.wp.betrieb, r.ergebnis.totWPK);
  assert.equal(run({ foerderBetragExtern: 0 }).foerder.totalFoerderung, 0);
  assert.equal(run({ foerderBetragExtern: 0 }).invest.netto, 34500);
  assert.equal(run({ foerderBetragExtern: 12880 }).foerder.proKlima, 0);
  assert.throws(() => run({ foerderBetragExtern: -1 }));
  assert.throws(() => run({ foerderBetragExtern: 34501 }));
  assert.equal(run({ heizart: 'oel' }).posten.grundpreisGas, 0);
  assert.equal(run({ vglBrennstoff: 'oel' }).posten.grundpreisGas, 0);
  const za = run({ wpZaehler: true, wpArbeitspreis: 22, wpGrundpreis: 100 });
  assert.equal(za.posten.modul14a, 0);
  near(za.jahre[0].wpGes, (14400 / 3.9) * 0.22 + 250 + 100);
  assert.equal(za.sensi.basis, za.ergebnis.wpNG);
  assert.throws(() => run({ wpZaehler: true }));
  assert.throws(() => run({ modul14a: 'modul2' }));
  assert.equal(run({ modul14a: 'kein' }).posten.modul14a, 0);
  const ww = run({ warmwasserBisherZentral: false, warmwasserKuenftigZentral: true, personen: 4 });
  assert.equal(ww.system.wwZuschlag, 2800);
  near(ww.system.nutzwaerme, 17200);
  near(ww.jahre[0].wwStromK, 0);
  near(
    run({
      neuFossilTog: false,
      warmwasserBisherZentral: false,
      warmwasserKuenftigZentral: true,
      personen: 4,
    }).jahre[0].wwStromK,
    840
  );
  near(ww.system.fossilVerbrauch, 17200 / 0.95);
  assert.equal(ww.sensi.basis, ww.ergebnis.wpNG);
  assert.throws(() => run({ warmwasserBisherZentral: false }));
  assert.equal(run({ warmwasserKuenftigZentral: false }).system.wwZuschlag, 0);
  assert.equal(run({ invWP: 10000, foerderBetragExtern: 0 }).ergebnis.breakEven, 0);
  assert.equal(run({ invWP: 10000, foerderBetragExtern: 0 }).ergebnis.breakEvenSofort, true);
  assert.equal(run({ invWP: 1000000, strompreis: 1000 }).ergebnis.breakEven, null);
  const year = run({ startJahr: 2027 });
  assert.equal(year.jahre.at(-1).cY, 2046);
  assert.equal(year.jahre[18].co2Preis, 250);
  assert.equal(year.jahre[19].co2Preis, 250);
  assert.equal(year.sensi.basis, year.ergebnis.wpNG);
  const alt = run({ geraet: '', heizsystem: null, jaz: 20 });
  assert.equal(alt.system.jaz, 3.86);
  assert.equal(alt.system.jazInfo.heizsystemAnnahme, true);
  assert.equal(run({ geraet: '', heizsystem: 'fbh' }).system.jaz, 4.47);
  assert.equal(run({ heizsystem: 'gemischt' }).system.jaz, 3.9);
  assert.throws(() => run({ geraet: 'Unbekannt' }));
  assert.throws(() => run({}, { jazTabelle: [] }));
  for (const row of k.KV_JAZ_SEED) {
    const a = run({ geraet: row.geraet, heizsystem: row.heizsystem });
    assert.equal(a.system.jaz, row.wert);
    if (row.kaskade) assert.match(a.system.jazInfo.annahme, /Einzelgeräts/);
  }
  assert.throws(() => run({ netzentgeltTog: true }), /keine belegte Jahresreihe/);
  const net = {
    basisjahr: 2026,
    einheit: 'ct/kWh Aufschlag gegenüber heute',
    quelle: 'Synthetische Prüfreihe, keine Prognose',
    abrufdatum: '2026-10-27',
    jahreswerte: Array.from({ length: 21 }, (_, j) => ({ jahr: 2026 + j, wert: j * 0.1 })),
  };
  const nr = run({ netzentgeltTog: true }, { netzentgelt: net });
  near(nr.posten.netzentgelt, (nr.system.fossilVerbrauch * 19) / 100);
  near(nr.ergebnis.wpNG - run().ergebnis.wpNG, nr.posten.netzentgelt);
  assert.equal(nr.sensi.basis, nr.ergebnis.wpNG);
  assert.equal(nr.jahre[0].netzentgelt, 0);
  assert.throws(() =>
    run(
      { netzentgeltTog: true },
      { netzentgelt: { ...net, jahreswerte: net.jahreswerte.slice(1) } }
    )
  );
  assert.equal(run({ neuFossilTog: false, bioTog: true }).posten.bioNetto, 0);
  const old = [
    { y: 2029, p: 0.15 },
    { y: 2035, p: 0.3 },
    { y: 2040, p: 0.6 },
  ];
  const migrated = run({}, { bioStufen: old });
  assert.match(migrated.quellen.bioHinweis, /Altes Bio/);
  near(migrated.ergebnis.wpNG, run().ergebnis.wpNG);
  assert.throws(() => run({}, { bioStufen: old.concat({ y: 2040, p: 0.6 }) }));
  const pd = run({ pvTog: true, pvAnteil: 100, dynTarifTog: true });
  near(pd.posten.modul14a, 3124.4);
  assert.equal(pd.jahre[0].dynSav, 0);
  console.log('GRÜN T1245: Referenzen, Summen, Spanne, alle Geräte und Randfälle');
}
if (process.argv[1]?.endsWith('t1245-kv-nutzen.mjs')) checks();
