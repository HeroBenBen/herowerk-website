// Nur T1247; ohne Browser und ohne Server. Identisch auf Alt und Neu ausführbar.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { parse } from 'acorn';
import { parseDocument } from 'htmlparser2';
import { getElementsByTagName, textContent } from 'domutils';
import { sheets } from './t1247-kv-fixture.mjs';
const html = fs.readFileSync('kostenvergleich-waermepumpe.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const source = scripts.find((s) => s.includes('function kvRender('));
const ast = parse(source, { ecmaVersion: 'latest' });
const funcs = new Map();
function walk(n) {
  if (!n || typeof n !== 'object') return;
  if (n.type === 'FunctionDeclaration') funcs.set(n.id.name, source.slice(n.start, n.end));
  for (const v of Object.values(n))
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') walk(v);
}
walk(ast);
const run = (jobs) => {
  const p = spawnSync('php', ['tests/t1247-kv-runner.php'], {
    input: JSON.stringify(jobs.map((j) => ({ sheets, ...j }))),
    encoding: 'utf8',
    maxBuffer: 30e6,
  });
  assert.equal(p.status, 0, p.stderr);
  return JSON.parse(p.stdout).map((r) => r.value);
};
let green = 0,
  red = 0;
function test(name, fn) {
  try {
    fn();
    green++;
    console.log('GRÜN ' + name);
  } catch (e) {
    red++;
    console.log('ROT  ' + name + ': ' + e.message.split('\n').slice(0, 5).join(' ').slice(0, 240));
  }
}
const base = {
  heizart: 'gas',
  bedarf: 20000,
  kvAnsicht: 'nutzen',
  startJahr: 2026,
  laufzeit: 20,
  gaspreis: 12,
  grundpreisGas: 250.38,
  strompreis: 32,
  geraet: '5078',
};
const req = (q = {}) => ({ query: { ...base, ...q } });
const euro = (q = {}) => req({ bedarfModus: 'jahreskosten', jahreskosten: 2650.38, ...q });
const [gas, oil, price, zeroBase, mixed] = run([
  euro(),
  euro({ heizart: 'oel', n01_preis_oel: 1.1, jahreskosten: 2200 }),
  euro({ gaspreis: 15 }),
  euro({ grundpreisGas: 0, jahreskosten: 2400 }),
  euro({ heizart: 'oel', vglBrennstoff: 'gas', n01_preis_oel: 1.1, jahreskosten: 2200 }),
]);
test('Euro Gas: 2.650,38 Euro ergeben 20.000 kWh', () => {
  assert.ok(gas.verbrauchAbleitung, 'Server liefert keine Euro-Herleitung');
  assert.equal(gas.inputsEcho.bedarf, 20000);
  assert.equal(gas.verbrauchAbleitung.bedarfKwh, 20000);
  assert.match(gas.verbrauchAbleitung.text, /20\.000 kWh.*250,38 Euro\/Jahr.*12,00 ct\/kWh/);
});
test('Euro Öl: Euro/Liter wird serverseitig zu kWh und ct/kWh', () => {
  assert.ok(oil.verbrauchAbleitung, 'Server liefert keine Öl-Euro-Herleitung');
  assert.equal(oil.inputsEcho.bedarf, 20000);
  assert.equal(oil.inputsEcho.oelpreis, 11);
  assert.equal(oil.verbrauchAbleitung.preise.n01_preis_oel.einheit, 'Euro/Liter');
  assert.match(oil.verbrauchAbleitung.text, /2\.000 Litern.*10 kWh je Liter/);
});
test('Preisänderung im Euro-Modus ohne 500-kWh-Rundung', () =>
  assert.equal(price.inputsEcho.bedarf, 16000));
const [exact] = run([euro({ jahreskosten: 2671.49 })]);
test('Euro-Verbrauch bleibt ungerundet', () =>
  assert.equal(exact.inputsEcho.bedarf, (2671.49 - 250.38) / 0.12));
test('Gas-Grundpreis 0 bleibt gültig', () => {
  assert.ok(zeroBase.verbrauchAbleitung, 'Server liefert keine Euro-Herleitung bei Grundpreis 0');
  assert.equal(zeroBase.inputsEcho.bedarf, 20000);
});
test('Heutige Heizungsart führt trotz anderer Vergleichsheizung', () => {
  assert.ok(mixed.verbrauchAbleitung, 'Server liefert keine Ableitung nach heutiger Heizungsart');
  assert.equal(mixed.verbrauchAbleitung.heizart, 'oel');
});
const invalid = [
  { jahreskosten: '' },
  { jahreskosten: -1 },
  { gaspreis: 0 },
  { gaspreis: '' },
  { gaspreis: 'abc' },
  { grundpreisGas: '' },
  { grundpreisGas: -1 },
  { jahreskosten: 250.38 },
  { jahreskosten: 200 },
  { jahreskosten: 100 },
  { jahreskosten: 99999 },
  { heizart: 'oel', n01_preis_oel: 0 },
  { heizart: 'oel', n01_preis_oel: '', jahreskosten: 2200 },
];
const invalidOut = run(invalid.map(euro));
test('Euro-Grenzen 5.000 und 80.000 kWh bleiben gültig', () => {
  const [lo, hi] = run([
    euro({ grundpreisGas: 0, jahreskosten: 600 }),
    euro({ grundpreisGas: 0, jahreskosten: 9600 }),
  ]);
  assert.ok(
    lo.verbrauchAbleitung && hi.verbrauchAbleitung,
    'Server liefert keine Euro-Ableitung an den Grenzen'
  );
  assert.equal(lo.verbrauchAbleitung.bedarfKwh, 5000);
  assert.equal(hi.verbrauchAbleitung.bedarfKwh, 80000);
});
test('Öl-Umrechnung verwendet den bestehenden Parameter statt eines Browserfaktors', () => {
  const changed = structuredClone(sheets);
  const row = changed.KV_Parameter.find((r) => r[0] === 'wz_unit_faktor');
  row[1] = 11;
  const [r] = run([
    { ...euro({ heizart: 'oel', n01_preis_oel: 1.1, jahreskosten: 2200 }), sheets: changed },
  ]);
  assert.ok(
    r.verbrauchAbleitung,
    'Server verwendet den Öl-Einheitenfaktor nicht zur Euro-Ableitung'
  );
  assert.equal(r.verbrauchAbleitung.bedarfKwh, 22000);
  assert.match(r.preisAnzeige.oelNebenangabe, /11 kWh je Liter/);
});
test('13 ungültige Euro-Eingaben sperren mit Klartext', () =>
  invalidOut.forEach((r) => {
    assert.equal(r.error, true);
    assert.ok(r.message.length > 10);
  }));
const [boot] = run([{ action: 'kv_bootstrap', query: { kvAnsicht: 'nutzen' } }]);
test('6 belegte Marktwerte, Defaults unverändert', () => {
  assert.ok(boot.marktwerte, 'Bootstrap liefert keine Marktwerte');
  assert.equal(Object.keys(boot.marktwerte).length, 6);
  assert.equal(boot.defaults.gaspreis, 12);
  assert.equal(boot.defaults.oelpreis, 11);
  assert.equal(boot.defaults.strompreis, 32);
  assert.equal(boot.preisAnzeige.n01_preis_oel, 1.1);
  assert.equal(boot.marktwerte.gaspreis.wert, 12.72);
  assert.equal(boot.marktwerte.n01_preis_oel.wert, 1.72);
  assert.equal(boot.marktwerte.grundpreisGas.wert, 250.38);
  assert.equal(boot.marktwerte.strompreis.wert, 32.93);
  assert.equal(boot.marktwerte.wpArbeitspreis.wert, 24.23);
  assert.equal(boot.marktwerte.wpGrundpreis.wert, 70.27);
});
const probe = {
  wert: 9.87,
  einheit: 'ct/kWh',
  quelle: 'T1247 Prüf-Eintrag Gas',
  stand: '07.11.2026',
};
test('Prüf-Eintrag Gas schaltet ohne Codeänderung frei, 4 Pflichtangaben', () => {
  const jobs = [
    { mode: 'markt', liste: { gaspreis: probe } },
    ...Object.keys(probe).map((key) => ({
      mode: 'markt',
      liste: { gaspreis: { ...probe, [key]: null } },
    })),
  ];
  const [full, ...missing] = run(jobs);
  assert.deepEqual(full.gaspreis, probe);
  missing.forEach((m) => assert.equal(Object.keys(m).length, 0));
});
test('Marktherkunft nur bei tatsächlich verwendetem Marktwert', () => {
  const [r, forged, own] = run([
    euro({ gaspreis: 12.72, preisHerkunft: '{"gaspreis":"market"}' }),
    euro({ preisHerkunft: '{"gaspreis":"market"}' }),
    euro({ preisHerkunft: '{"gaspreis":"own"}' }),
  ]);
  assert.ok(r.verbrauchAbleitung, 'Server liefert keine verwendeten Preise mit Herkunft');
  assert.equal(r.verbrauchAbleitung.preise.gaspreis.herkunft, 'market');
  assert.equal(forged.verbrauchAbleitung.preise.gaspreis.herkunft, 'annahme');
  assert.equal(own.verbrauchAbleitung.preise.gaspreis.herkunft, 'own');
});
test('Preisherkunft nennt je Preis Annahme, eigene Angabe oder Marktquelle mit Stand', () => {
  assert.match(
    gas.verbrauchAbleitung?.text || '',
    /Preisherkunft: Arbeitspreis HeroWerk-Annahme, Grundpreis HeroWerk-Annahme\./
  );
  const [market, mixedOrigin, forged] = run([
    euro({ gaspreis: 12.72, preisHerkunft: '{"gaspreis":"market","grundpreisGas":"market"}' }),
    euro({ preisHerkunft: '{"gaspreis":"own"}' }),
    euro({ preisHerkunft: '{"gaspreis":"market"}' }),
  ]);
  const text = market.verbrauchAbleitung.text;
  for (const [field, label] of [
    ['gaspreis', 'Arbeitspreis'],
    ['grundpreisGas', 'Grundpreis'],
  ]) {
    const ref = market.verbrauchAbleitung.preise[field].referenz;
    assert.ok(text.includes(label + ' Marktwert ' + ref.quelle + ', Stand ' + ref.stand));
  }
  assert.match(
    mixedOrigin.verbrauchAbleitung.text,
    /Preisherkunft: Arbeitspreis eigene Angabe, Grundpreis HeroWerk-Annahme\./
  );
  assert.match(
    forged.verbrauchAbleitung.text,
    /Preisherkunft: Arbeitspreis HeroWerk-Annahme, Grundpreis HeroWerk-Annahme\./
  );
  assert.match(oil.verbrauchAbleitung.text, /Preisherkunft: Arbeitspreis HeroWerk-Annahme\./);
  assert.doesNotMatch(oil.verbrauchAbleitung.text, /Preisherkunft:.*Grundpreis/);
});
test('Kostenlinien ab Jahr 0 einschließlich Investition', () => {
  assert.ok(gas.nutzenKosten, 'Server liefert keine Kostenlinien ab Jahr 0');
  assert.equal(gas.nutzenKosten.labels[0], 0);
  assert.equal(gas.nutzenKosten.labels.length, 21);
  assert.equal(gas.nutzenKosten.wp[0], gas.invest.netto);
  assert.equal(gas.nutzenKosten.fossil[0], gas.invest.fossilInvest);
  assert.equal(gas.nutzenKosten.wp[20], gas.invest.netto + gas.ergebnis.totWPK);
  assert.equal(gas.nutzenKosten.fossil[20], gas.invest.fossilInvest + gas.ergebnis.totFossil);
});
test('Bitgleiche bisherige Kernantworten bei gleichem normalisiertem Verbrauch', () => {
  for (const heizart of ['gas', 'oel'])
    for (const neuFossilTog of [0, 1])
      for (const laufzeit of [5, 20, 25]) {
        const q = { ...base, heizart, neuFossilTog, laufzeit, bedarf: 20175.91666666667 };
        const [a, b] = run([{ query: q }, { query: q, legacy: true }]);
        delete a.nutzenKosten;
        delete a.preisAnzeige;
        assert.equal(JSON.stringify(a), JSON.stringify(b));
      }
});
test('Alte Berater-Anfragen bleiben vollständig bitgleich', () => {
  const [a, b] = run([
    { query: { heizart: 'oel', bedarf: 23456, oelpreis: 11 } },
    { query: { heizart: 'oel', bedarf: 23456, oelpreis: 11 }, legacy: true },
  ]);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
test('Euro und Literpreis führen in denselben unveränderten Kern', () => {
  for (const query of [
    euro().query,
    euro({ heizart: 'oel', n01_preis_oel: 1.1, jahreskosten: 2200 }).query,
    euro({ jahreskosten: 2671.49 }).query,
  ]) {
    const [a] = run([{ query }]);
    const normalized = { ...query, bedarf: a.inputsEcho.bedarf, oelpreis: a.inputsEcho.oelpreis };
    delete normalized.bedarfModus;
    delete normalized.jahreskosten;
    delete normalized.n01_preis_oel;
    const [b] = run([{ query: normalized, legacy: true }]);
    delete a.verbrauchAbleitung;
    delete a.nutzenKosten;
    delete a.preisAnzeige;
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  }
});
test('Adapter ist an der öffentlichen Ausgabestelle eingebunden', () => {
  const api = fs.readFileSync('api/rechner.php', 'utf8');
  assert.match(api, /require_once __DIR__ \. '\/rechner-kv-adapter\.php'/);
  assert.match(api, /\$result = hw_kv_adapter_route\(\$action, \$_GET, \$snapshot\['sheets'\]/);
});
test('Schutzgrenzen exakt auf 6fdf74e', () => {
  for (const file of [
    'api/rechner-engine.php',
    'apps-script/rechner-backend/kv_engine.gs',
    'apps-script/rechner-backend/Code.gs',
    'docs/intern/kostenvergleich-berater.html',
    'amortisation-waermepumpe.html',
  ])
    assert.equal(
      fs.readFileSync(file, 'utf8'),
      execFileSync('git', ['show', '6fdf74e:' + file], { encoding: 'utf8', maxBuffer: 5e6 })
    );
});
// Die echten Funktionen werden isoliert ausgeführt, kein nachgebauter Renderer.
function context(extra = {}) {
  const fields = new Map();
  const el = (id) => {
    if (!fields.has(id))
      fields.set(id, {
        id,
        value: '',
        innerHTML: '',
        textContent: '',
        type: 'number',
        options: [],
        style: {},
        classList: { toggle() {}, add() {}, remove() {} },
        dispatchEvent() {},
      });
    return fields.get(id);
  };
  const ctx = vm.createContext({
    console,
    Number,
    URLSearchParams,
    Event,
    document: { getElementById: el, documentElement: {} },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    renderFoerderTreppe() {},
    $: el,
    window: {},
    WZ: { touched: new Set(), step1: {} },
    WZ_TRACK_IDS: [],
    KV_STATE: { edited: new Set() },
    ...extra,
  });
  for (const name of [
    'deNumber',
    'kvJahreskosten',
    'kvInputValue',
    'kvDisplayInput',
    'kvCurrentParams',
    'kvCommitInput',
    'eur',
    'eurSigned',
    'kvMehrpreisText',
    'fix',
    'pct',
    'kvText',
    'kvLine',
    'kvCard',
    'kvMobileCard',
    'kvMobileYearAnswer',
    'kvMobileYearContent',
    'kvMobileYearDetails',
    'kvRender',
    'updateHero',
    'kvApplyBootstrap',
    'kvReadInputs',
    'buildLeadHandoff',
    'wzSetMode',
    'wzBillStart',
    'renderLiveFoerder',
    'setControl',
  ])
    if (funcs.has(name)) vm.runInContext(funcs.get(name), ctx);
  return { ctx, el };
}
test('Nutzen-Begriffe und Reihenfolge, negative Werte ohne Sparbehauptung', () => {
  const { ctx, el } = context();
  ctx.updateHero(gas);
  let rendered = el('wzHero').innerHTML;
  assert.match(
    rendered,
    /Dein Nutzen mit der Wärmepumpe.*Heizkosten im ersten Jahr.*Bezahlt gemacht nach.*Vorteil nach 20 Jahren/s
  );
  const negative = structuredClone(gas);
  negative.jahre[0].jSav = -100;
  negative.ergebnis.wpNG = -1000;
  negative.ergebnis.breakEven = null;
  ctx.updateHero(negative);
  rendered = el('wzHero').innerHTML;
  assert.match(rendered, /Du zahlst rund.*mehr im Jahr/);
  assert.doesNotMatch(rendered, /Du sparst/);
  assert.match(rendered, /nicht in 20 Jahren/);
});
test('Amortisation Jahr 0 heißt Bezahlt gemacht: sofort', () => {
  const { ctx, el } = context();
  const r = structuredClone(gas);
  r.ergebnis.breakEven = 0;
  r.ergebnis.breakEvenSofort = true;
  ctx.updateHero(r);
  assert.match(el('wzHero').innerHTML, /Bezahlt gemacht: sofort/);
  assert.doesNotMatch(el('wzHero').innerHTML, /nach 0 Jahren/);
});
test('Diagrammbeschriftung vollständig innerhalb der Fläche, Jahre 0 bis 25, schmal und breit', () => {
  let plugin;
  const Chart = {
    register(p) {
      plugin = p;
    },
  };
  const { ctx } = context({ Chart, window: { Chart } });
  const pluginSource = scripts.find((s) => s.includes("id:'wzAmortMark'"));
  vm.runInContext(pluginSource.slice(pluginSource.indexOf('// Q5:')), ctx);
  assert.equal(plugin?.id, 'wzAmortMark');
  for (const width of [375, 1280])
    for (let year = 0; year <= 25; year++) {
      const area = { left: 60, right: width - 40, top: 20, bottom: 260 };
      const drawn = [];
      const canvas = {
        save() {},
        restore() {},
        setLineDash() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        measureText: (text) => ({ width: text.length * 7 }),
        fillText(text, x, y) {
          const w = this.measureText(text).width;
          drawn.push({
            text,
            left: x - (this.textAlign === 'right' ? w : 0),
            right: x + (this.textAlign === 'right' ? 0 : w),
            y,
          });
        },
      };
      ctx.KV_STATE.last = { ergebnis: { breakEven: year, breakEvenSofort: year === 0 } };
      plugin.afterDraw({
        canvas: { id: 'cMain' },
        data: { datasets: [{}], labels: Array.from({ length: 26 }, (_, i) => i) },
        chartArea: area,
        ctx: canvas,
        getDatasetMeta: () => ({
          data: Array.from({ length: 26 }, (_, i) => ({
            x: area.left + ((area.right - area.left) * i) / 25,
          })),
        }),
      });
      assert.equal(drawn.length, 1);
      const label = drawn[0];
      assert.ok(
        label.left >= area.left && label.right <= area.right,
        `${width} px, Jahr ${year}: ${JSON.stringify(label)}`
      );
      assert.ok(label.y - 12 >= area.top && label.y <= area.bottom);
      assert.ok(label.text.includes(year === 0 ? 'sofort' : String(year)));
    }
});
test('Spätes Bootstrap überschreibt keine eigenen Preise', () => {
  const { ctx, el } = context();
  el('gaspreis').value = '19.7';
  el('n01_preis_oel').value = '1.87';
  ctx.KV_STATE.edited.add('gaspreis');
  ctx.KV_STATE.edited.add('n01_preis_oel');
  ctx.kvApplyBootstrap({ defaults: { gaspreis: 12 }, preisAnzeige: { n01_preis_oel: 1.1 } });
  assert.equal(el('gaspreis').value, '19.7');
  assert.equal(el('n01_preis_oel').value, '1.87');
});
test('Anfrage v1 überträgt nur serverseitige kWh mit Herkunft', () => {
  const { ctx } = context({ finiteNumber: (v) => (Number.isFinite(Number(v)) ? Number(v) : null) });
  ctx.KV_STATE.last = gas;
  ctx.WZ.step1.bedarfSource = 'own';
  const lead = ctx.buildLeadHandoff();
  assert.equal(lead.v, 1);
  assert.equal(lead.verbrauch.einheit, 'kwh');
  assert.equal(lead.verbrauch.kwh, 20000);
  assert.equal(lead.verbrauch.eingabeWert, 20000);
});
test('Sichttexte ohne Gedankenstriche und deutsche Zahlenformatierung', () => {
  assert.doesNotMatch(html.replace(/<!--[\s\S]*?-->/g, ''), /[–—]/);
  const { ctx } = context();
  assert.equal(ctx.kvText('Preis – Stand — Test'), 'Preis ,  Stand ,  Test');
  assert.equal(ctx.eur(12345), '12.345 €');
});
test('Verbrauchsschritt: Szenariopreise, Herkunft und bedingte WP-Felder', () => {
  assert.match(html, /place\(\$\('wzPreiseCard'\)\)/);
  assert.match(html, /if\(wp\)group.hidden=!\$\('wpZaehler'\).checked/);
  assert.ok(
    html.includes("if(id==='n01_preis_oel')group.hidden=!fuels.has('oel')"),
    'Ölfeld folgt verwendeten Brennstoffen'
  );
  assert.match(html, /WZ_PREIS_ORIGIN\[id\]='market';WZ.touched.delete\(id\)/);
  assert.match(html, /WZ_PREIS_ORIGIN\[id\]='own';touch\(id\)/);
});
test('Moduswechsel entwertet Altlauf, Verbrauchsbearbeitung führt zurück', () => {
  let aborted = 0,
    applied = 0,
    cleared = 0;
  const { ctx } = context({
    clearTimeout() {
      cleared++;
    },
    wzEstimateWartenStop() {},
    renderStep1Mode() {},
    wzSetVerbLabel() {},
    updateNavState() {},
    updateStep1Reveal() {},
    wzApplyKnown() {
      applied++;
    },
    WZ: { step1: { vmode: 'bill', bedarf: 16000 }, estSeq: 2, estDirty: true },
    KV_STATE: {
      seq: 4,
      last: gas,
      timer: 123,
      controller: {
        abort() {
          aborted++;
        },
      },
    },
  });
  ctx.window.WZ_BRIDGE = { bedarfModus: 'jahreskosten', jahreskosten: '2650.38' };
  assert.equal(typeof ctx.wzSetMode, 'function', 'Gemeinsamer Moduswechsel fehlt');
  ctx.wzSetMode('known');
  assert.equal(ctx.window.WZ_BRIDGE, null);
  assert.equal(ctx.WZ.step1.vmode, 'known');
  assert.equal(ctx.KV_STATE.last, null);
  assert.equal(ctx.KV_STATE.timer, null);
  assert.equal(ctx.KV_STATE.seq, 5);
  assert.equal(aborted, 1);
  assert.equal(applied, 1);
  assert.equal(cleared, 3);
  ctx.wzBillStart();
  assert.equal(
    ctx.window.WZ_BRIDGE,
    null,
    'Verspätete Euro-Eingabe darf Brücke nicht reaktivieren'
  );
});
test('Ungenutzte Brennstoffpreise sperren weder Verbrauch noch Euro-Modus', () => {
  for (const bedarfModus of ['', 'jahreskosten']) {
    const [gasOnly, oilOnly, comparison, gasComparison, disabledComparison] = run([
      req({ bedarfModus, jahreskosten: 2650.38, n01_preis_oel: '' }),
      req({
        bedarfModus,
        jahreskosten: 2200,
        heizart: 'oel',
        vglBrennstoff: 'oel',
        gaspreis: '',
        grundpreisGas: '',
        n01_preis_oel: 1.1,
      }),
      req({ bedarfModus, jahreskosten: 2650.38, vglBrennstoff: 'oel', n01_preis_oel: '' }),
      req({
        bedarfModus,
        jahreskosten: 2200,
        heizart: 'oel',
        vglBrennstoff: 'gas',
        gaspreis: '',
        n01_preis_oel: 1.1,
      }),
      req({
        bedarfModus,
        jahreskosten: 2650.38,
        neuFossilTog: 0,
        vglBrennstoff: 'oel',
        n01_preis_oel: '',
      }),
    ]);
    for (const r of [gasOnly, oilOnly, disabledComparison]) {
      assert.ok(!r.error, r.message);
      assert.equal(r.inputsEcho.bedarf, 20000);
    }
    assert.equal(comparison.error, true);
    assert.match(comparison.message, /Ölpreis/);
    assert.equal(gasComparison.error, true);
    assert.match(gasComparison.message, /Gaspreis/);
  }
});
test('Client überträgt nur Preise verwendeter Brennstoffe und des aktiven Zählers', () => {
  const ids = [
    'heizart',
    'neuFossilTog',
    'vglBrennstoff',
    'gaspreis',
    'grundpreisGas',
    'n01_preis_oel',
    'wpZaehler',
    'wpArbeitspreis',
    'wpGrundpreis',
  ];
  const { ctx, el } = context({ KV_INPUT_IDS: ids });
  el('heizart').value = 'gas';
  el('vglBrennstoff').value = 'gas';
  el('neuFossilTog').type = 'checkbox';
  el('neuFossilTog').checked = true;
  el('wpZaehler').type = 'checkbox';
  el('wpZaehler').checked = false;
  const q = ctx.kvReadInputs();
  assert.equal(q.has('n01_preis_oel'), false);
  assert.equal(q.has('wpArbeitspreis'), false);
  assert.equal(q.get('gaspreis'), '');
  el('vglBrennstoff').value = 'oel';
  assert.equal(ctx.kvReadInputs().get('n01_preis_oel'), '');
  el('heizart').value = 'oel';
  const oil = ctx.kvReadInputs();
  assert.equal(oil.has('gaspreis'), false);
  assert.equal(oil.has('grundpreisGas'), false);
});
test('Echte Renderer: Handy-Klapptexte, vierstellige Rate, negative Finanzierung ohne Sparbehauptung', () => {
  const [negative] = run([
    req({ strompreis: 100, finanzTog: 1, invWP: 65000, fGrund: 0, fKlima: 0, kredLZ: 5 }),
  ]);
  assert.ok(negative.finanzierung.monRate >= 1000);
  assert.ok(negative.finanzierung.monVorteil < 0);
  assert.equal(negative.ergebnis.breakEven, null);
  const { ctx, el } = context();
  ctx.kvRender(negative, true);
  assert.match(
    el('cMainDaten').innerHTML,
    /<span class="chart-summary-mobile">Jahr 0 bis 20 im Detail<\/span>/
  );
  assert.match(
    el('cBreakDaten').innerHTML,
    /<span class="chart-summary-mobile">Alle 20 Jahre im Detail<\/span>/
  );
  const rate = Math.round(negative.finanzierung.monRate).toLocaleString('de-DE');
  assert.ok(el('cashflowBox').innerHTML.includes(rate + ' € Rate'));
  assert.match(
    el('cashflowBox').innerHTML,
    /monatlich teurer.*Bei Barzahlung nicht in 20 Jahren ausgeglichen/
  );
  assert.doesNotMatch(el('cashflowBox').innerHTML, /Amortisiert sich/);
  assert.match(el('pathSummary').innerHTML, /Zusätzliche Betriebs- und CO₂-Kosten/);
  assert.match(el('kpiGrid').innerHTML, /Mehrkosten 20 J./);
});
test('Seitenleiste liest normalisierte 16.000 kWh statt Reglerwert 20.000', () => {
  const { ctx, el } = context({ step1Valid: () => true });
  ctx.KV_STATE.last = price;
  ctx.WZ.step1.heizart = 'gas';
  el('bedarf').value = '20000';
  ctx.renderLiveFoerder();
  assert.match(el('wzLiveFoerder').innerHTML, /Gas, 16\.000 kWh/);
  assert.doesNotMatch(el('wzLiveFoerder').innerHTML, /20\.000 kWh/);
});

test('Fertige Euro-Rechnung: echte change/focusout-Handler entwerten Ergebnis und Herleitung nicht', () => {
  const handlers = {};
  const { ctx, el } = context({
    KV_INPUT_IDS: ['heizart', 'gaspreis'],
    setTimeout: () => 123,
    clearTimeout() {},
    updateNavState() {},
  });
  ctx.document.addEventListener = (type, fn) => {
    handlers[type] = fn;
  };
  // Die echten Handler samt echtem Scheduler und echtem Pending-Callback verwenden.
  vm.runInContext(funcs.get('scheduleKvCalculation'), ctx);
  const pending = source.split('\n').find((line) => line.includes('window.WZ_KV_PENDING='));
  if (pending) vm.runInContext(pending, ctx);
  for (const node of ast.body) {
    if (node.type !== 'ExpressionStatement' || node.expression.type !== 'CallExpression') continue;
    const call = node.expression;
    if (
      call.callee.type === 'MemberExpression' &&
      call.callee.object.name === 'document' &&
      call.callee.property.name === 'addEventListener' &&
      ['change', 'focusout'].includes(call.arguments[0]?.value)
    )
      vm.runInContext(source.slice(node.start, node.end), ctx);
  }
  el('heizart').value = 'gas';
  el('gaspreis').inputMode = 'decimal';
  el('gaspreis').value = '15';
  ctx.WZ.step1 = { vmode: 'bill', bedarf: 16000 };
  ctx.window.WZ_BRIDGE = { bedarfModus: 'jahreskosten', jahreskosten: '2650.38' };
  ctx.KV_STATE.last = price;
  ctx.KV_STATE.timer = null;
  ctx.KV_STATE.seq = 4;
  // Dieselben Anfrageparameter wie im produktiven calculate(), auch auf dem Altstand.
  ctx.KV_STATE.lastParams = ctx.kvReadInputs(ctx.window.WZ_BRIDGE).toString();
  el('wzEuroHinweis').textContent = price.verbrauchAbleitung?.text || 'Lange Herleitung';
  const hint = el('wzEuroHinweis').textContent;
  handlers.change({ target: el('gaspreis') });
  handlers.focusout({ target: el('gaspreis') });
  assert.equal(ctx.KV_STATE.last, price, 'Fokuswechsel hat fertiges Ergebnis entwertet');
  assert.equal(
    el('wzEuroHinweis').textContent,
    hint,
    'Fokuswechsel verkürzt Herleitung und verschiebt den Wechselknopf'
  );
  assert.equal(ctx.WZ.step1.bedarf, 16000);
  assert.equal(ctx.KV_STATE.timer, null);
  el('gaspreis').value = '16,00';
  handlers.change({ target: el('gaspreis') });
  assert.equal(ctx.KV_STATE.last, null, 'Geänderte Eingabe muss weiterhin neu rechnen');
  assert.equal(ctx.KV_STATE.timer, 123);
});
test('Alle drei Nutzen-Karten trennen Bezeichnung, Betrag und Spanne (Z5 unverändert)', () => {
  const { ctx, el } = context();
  ctx.updateHero(gas);
  const cards = getElementsByTagName('section', parseDocument(el('wzHero').innerHTML).children);
  assert.equal(cards.length, 3);
  const texts = cards.map(textContent);
  for (const text of texts) assert.doesNotMatch(text, /[A-Za-zÄÖÜäöüß)]\d/);
  assert.match(texts[2], /Jahren\s+[−\d].*€\s+Spanne:/s);
});
test('Dezimalfelder: deutsche Vorbelegung und Marktwert, Komma/Punkt nur als Punktzahl an API', () => {
  const ids = [
    'gaspreis',
    'n01_preis_oel',
    'strompreis',
    'grundpreisGas',
    'wpArbeitspreis',
    'wpGrundpreis',
    'wzJahreskosten',
  ];
  const inputs = getElementsByTagName(
    'input',
    parseDocument(html + funcs.get('renderStep1')).children
  );
  for (const id of ids) {
    const field = inputs.find((el) => el.attribs.id === id);
    assert.equal(field?.attribs.type, 'text', id + ': Komma verlangt Textfeld');
    assert.equal(field.attribs.inputmode, 'decimal', id + ': Dezimaltastatur');
  }
  const { ctx, el } = context({ KV_INPUT_IDS: ['heizart', 'n01_preis_oel'] });
  el('heizart').value = 'oel';
  for (const id of ids) el(id).inputMode = 'decimal';
  ctx.kvApplyBootstrap(boot);
  el('heizart').value = 'oel';
  assert.equal(el('n01_preis_oel').value, '1,10');
  assert.equal(el('gaspreis').value, '12,00');
  // setControl ist derselbe Schreibpfad wie der echte Marktwertklick.
  ctx.setControl('wpArbeitspreis', boot.marktwerte.wpArbeitspreis.wert, []);
  ctx.setControl('wpGrundpreis', boot.marktwerte.wpGrundpreis.wert, []);
  assert.equal(el('wpArbeitspreis').value, '24,23');
  assert.equal(el('wpGrundpreis').value, '70,27');
  for (const input of ['1,5', '1.5', '1,50']) {
    el('n01_preis_oel').value = input;
    assert.equal(ctx.kvReadInputs().get('n01_preis_oel'), '1.5');
    const [r] = run([
      euro({
        heizart: 'oel',
        jahreskosten: 3000,
        n01_preis_oel: ctx.kvReadInputs().get('n01_preis_oel'),
      }),
    ]);
    assert.equal(r.verbrauchAbleitung.bedarfKwh, 20000);
  }
  assert.equal(ctx.kvDisplayInput(el('wzJahreskosten'), 2650.38), '2.650,38');
  assert.equal(ctx.kvDisplayInput(el('gaspreis'), ''), '');
  el('gaspreis').value = 'ungültig';
  assert.equal(ctx.kvInputValue(el('gaspreis')), 'ungültig');
});
test('Jahreskosten: eindeutige Schreibweisen normalisieren, unklare Eingaben sperren mit Klartext', () => {
  const { ctx, el } = context({
    clearTimeout() {},
    wzEstimateWartenStop() {},
    scheduleKvCalculation() {},
    updateNavState() {},
    updateStep1Reveal() {},
  });
  ctx.WZ.step1.vmode = 'bill';
  el('wzJahreskosten').inputMode = 'decimal';
  for (const [input, expected] of [
    ['2.650,38', '2650.38'],
    ['2650,38', '2650.38'],
    ['2650.38', '2650.38'],
    ['2650', '2650'],
    ['2.650', '2650'],
    ['2.650,3', '2650.3'],
    ['2650,3', '2650.3'],
  ]) {
    ctx.WZ.step1.jahreskosten = input;
    ctx.wzBillStart();
    const amount = ctx.window.WZ_BRIDGE.jahreskosten;
    assert.equal(amount, expected, input);
    el('wzJahreskosten').value = input;
    assert.equal(ctx.kvInputValue(el('wzJahreskosten')), expected);
    const [r] = run([euro({ jahreskosten: amount })]);
    assert.equal(r.verbrauchAbleitung.betrag, Number(expected));
    const display = ctx.kvDisplayInput(el('wzJahreskosten'), input);
    assert.equal(
      display,
      Number(expected).toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    assert.equal(
      ctx.kvDisplayInput(el('wzJahreskosten'), display),
      display,
      'Wiederholter Fokuswechsel'
    );
  }
  for (const input of [
    '2.65,38',
    '2,650.38',
    '2.650.38',
    '2650.3',
    '2,650,38',
    '2e3',
    '0xA5A',
    '2 650,38',
    '2650,385',
    '',
  ]) {
    ctx.WZ.step1.jahreskosten = input;
    ctx.wzBillStart();
    const [r] = run([euro({ jahreskosten: ctx.window.WZ_BRIDGE.jahreskosten })]);
    assert.equal(r.error, true, input);
    assert.match(r.message, /Jahreskosten.*2\.650,38.*2650\.38/);
    assert.equal(
      ctx.kvDisplayInput(el('wzJahreskosten'), input),
      input,
      'Ungültige Eingabe bleibt erhalten'
    );
  }
});
test('Negativer Investitionsunterschied: günstiger als neue Gas- oder Ölheizung, kein negativer Mehrpreis', () => {
  const { ctx, el } = context();
  for (const heizart of ['gas', 'oel']) {
    const [r] = run([
      req({ heizart, vglBrennstoff: heizart, neuFossilTog: 1, gasInvest: 17500, oelInvest: 17500 }),
    ]);
    assert.equal(r.invest.investDelta, -380);
    ctx.updateHero(r);
    assert.match(
      textContent(parseDocument(el('wzHero').innerHTML)),
      new RegExp(
        'Die Wärmepumpe ist nach Förderung 380 € günstiger als die neue ' +
          r.system.heizLabel +
          'heizung\\.'
      )
    );
    assert.doesNotMatch(el('wzHero').innerHTML, /Mehrpreis[^<]*[-−]/);
  }
});
// Anschaffungsunterschied: echte PHP-Antworten und alle vier Ausgabeorte.
for (const [name, delta] of [
  ['positiv', 5120],
  ['negativ', -380],
  ['null', 0],
])
  test(
    'Mehrpreis überall ' + name + ': Hauptkarte, Rechenweg, Detailkarte und Tabellenhinweis',
    () => {
      for (const heizart of ['gas', 'oel']) {
        const [r] = run([
          req({
            heizart,
            vglBrennstoff: heizart,
            neuFossilTog: 1,
            gasInvest: 17120 - delta,
            oelInvest: 17120 - delta,
          }),
        ]);
        assert.equal(r.invest.mehrInvest, delta);
        const expected =
          delta > 0
            ? 'Mehrpreis gegenüber der neuen ' + r.system.heizLabel + 'heizung: 5.120 €.'
            : delta < 0
              ? 'Die Wärmepumpe ist nach Förderung 380 € günstiger als die neue ' +
                r.system.heizLabel +
                'heizung.'
              : 'Wärmepumpe und neue ' +
                r.system.heizLabel +
                'heizung kosten nach Förderung gleich viel.';
        const { ctx, el } = context();
        ctx.kvRender(r, false);
        ctx.updateHero(r);
        for (const id of ['wzHero', 'pathSummary', 'kpiGrid', 'dreiWegeBox']) {
          const text = textContent(parseDocument(el(id).innerHTML));
          assert.ok(text.includes(expected), id + ': ' + text);
          assert.doesNotMatch(
            text,
            /Mehrpreis[^.]*[-−]\s*\d|[-−]0 €|schon in der Anschaffung günstiger/
          );
        }
        if (delta === 0) assert.doesNotMatch(el('kpiGrid').innerHTML, /Ab Tag 1 günstiger/);
      }
    }
  );
test('Mehrpreis rundet vor Textwahl: ±0,49 und ±0,50 Euro, keine Null als Preisvorteil', () => {
  const { ctx, el } = context();
  for (const n of [-0.49, -0.01, 0, 0.01, 0.49]) assert.equal(ctx.eurSigned(n), '0 €');
  for (const delta of [-1.49, -0.5, -0.49, -0.01, 0, 0.01, 0.49, 0.5, 1.49]) {
    const r = structuredClone(oil);
    r.invest.mehrInvest = delta;
    r.invest.investDelta = delta;
    r.system.heizLabel = 'Öl';
    r.system.neuFossilOn = true;
    ctx.kvRender(r, false);
    ctx.updateHero(r);
    const n = Math.round(delta);
    const expected =
      n === 0
        ? 'Wärmepumpe und neue Ölheizung kosten nach Förderung gleich viel.'
        : n < 0
          ? 'Die Wärmepumpe ist nach Förderung 1 € günstiger als die neue Ölheizung.'
          : 'Mehrpreis gegenüber der neuen Ölheizung: 1 €.';
    for (const id of ['wzHero', 'pathSummary', 'kpiGrid', 'dreiWegeBox']) {
      const text = textContent(parseDocument(el(id).innerHTML));
      assert.ok(text.includes(expected), delta + ' / ' + id + ': ' + text);
      assert.doesNotMatch(text, /[-−]0 €|0 € günstiger|Mehrpreis[^.]*[-−]\s*\d/);
    }
  }
});
// Auftrag 12: echte Ausgabe des Dreiwege-Renderers, einschließlich Rundungsgrenzen.
test('Dreiwege-Handyliste: günstiger, teurer und Gleichstand ohne doppelte Vorzeichen', () => {
  for (const delta of [-2000, -0.5, -0.49, 0, 0.49, 0.5, 2000]) {
    const r = structuredClone(oil);
    r.dreiWege.aktiv = true;
    r.dreiWege.wp.gesamt = 100000;
    r.dreiWege.gas.gesamt = 100000 + delta;
    r.dreiWege.oel.gesamt = 100000 - delta;
    const { ctx, el } = context();
    ctx.kvRender(r, false);
    const cards = getElementsByTagName(
      'div',
      parseDocument(el('dreiWegeBox').innerHTML).children
    ).filter((node) => node.attribs.class?.includes('kv-mobile-card-head'));
    assert.equal(cards.length, 3);
    for (const [index, diff] of [
      [1, delta],
      [2, -delta],
    ]) {
      const card = cards[index].parent;
      const n = Math.round(diff),
        amount = Math.abs(n).toLocaleString('de-DE') + ' €';
      const text = textContent(card);
      assert.ok(
        text.includes(
          n < 0
            ? 'Günstiger als Wärmepumpe'
            : n > 0
              ? 'Teurer als Wärmepumpe'
              : 'Gleich teuer wie Wärmepumpe'
        ),
        text
      );
      const lines = getElementsByTagName('div', card.children).filter((node) =>
        node.attribs.class?.split(' ').includes('ln')
      );
      const line = lines.at(-1);
      assert.equal(textContent(line.children.at(-1)), amount);
      assert.equal(line.attribs.class, 'ln' + (n < 0 ? ' pos' : n > 0 ? ' neg' : ''));
      assert.doesNotMatch(text, /\+[−-]|[−-]0 €/);
    }
  }
});
test('Dreiwege-Ergebnissatz: tatsächliche günstigste Neuanlage, teurer/günstiger/gleich', () => {
  for (const fuel of ['gas', 'oel'])
    for (const delta of [-2000, -0.5, -0.49, 0, 0.49, 0.5, 2000]) {
      const r = structuredClone(oil);
      const d = r.dreiWege;
      d.aktiv = true;
      d.wp.gesamt = 100000;
      d.gas.gesamt = d.oel.gesamt = 110000;
      d[fuel].gesamt = 100000 + delta;
      d.bestFossil = d[fuel].gesamt;
      d.vorteil = delta;
      // Die günstigste Gesamtkostenalternative darf von der gewählten Vergleichsheizung abweichen.
      r.system.heizLabel = fuel === 'gas' ? 'Öl' : 'Gas';
      const { ctx, el } = context();
      ctx.kvRender(r, false);
      const strong = getElementsByTagName(
        'strong',
        parseDocument(el('dreiWegeBox').innerHTML).children
      ).at(-1);
      const n = Math.round(delta),
        name = fuel === 'gas' ? 'Gasheizung' : 'Ölheizung';
      const expected =
        n === 0
          ? 'Über 20 Jahre gleich teuer wie die neue ' + name + '.'
          : 'Über 20 Jahre ' +
            Math.abs(n).toLocaleString('de-DE') +
            ' € ' +
            (n < 0 ? 'teurer' : 'günstiger') +
            ' als die neue ' +
            name +
            '.';
      assert.equal(textContent(strong), expected);
    }
  const [downside] = run([req({ invWP: 65000, strompreis: 80, gaspreis: 5, n01_preis_oel: 0.5 })]);
  assert.ok(downside.dreiWege.vorteil < 0, 'Echter PHP-Downside fehlt');
  const { ctx, el } = context();
  ctx.kvRender(downside, false);
  assert.match(
    textContent(parseDocument(el('dreiWegeBox').innerHTML)),
    /Über 20 Jahre [\d.]+ € teurer als die neue (?:Gas|Öl)heizung\./
  );
  assert.doesNotMatch(el('dreiWegeBox').innerHTML, /\+[−-]|unter der Wärmepumpe/);
});
test('Euro-Grenzen belegt durch Verbrauchsfeld und Kern auf 6fdf74e, außerhalb gesperrt', () => {
  const oldHtml = execFileSync('git', ['show', '6fdf74e:kostenvergleich-waermepumpe.html'], {
    encoding: 'utf8',
    maxBuffer: 5e6,
  });
  const oldCore = execFileSync('git', ['show', '6fdf74e:api/rechner-engine.php'], {
    encoding: 'utf8',
    maxBuffer: 5e6,
  });
  for (const code of [oldHtml, html]) assert.match(code, /id="bedarf" min="5000" max="80000"/);
  assert.match(oldCore, /'bedarfMin' => 5000,[\s\S]*?'bedarfMax' => 80000/);
  // Direkte kWh-Anfragen haben im Kern keine 80.000-Obergrenze; Euro folgt dem Kundenregler.
  const direct = run([4999, 80001].map((bedarf) => ({ ...req({ bedarf }), legacy: true })));
  assert.deepEqual(
    direct.map((r) => r.inputsEcho.bedarf),
    [4999, 80001]
  );
  const [lo, hi] = run([
    euro({ grundpreisGas: 0, jahreskosten: 599.99 }),
    euro({ grundpreisGas: 0, jahreskosten: 9600.01 }),
  ]);
  for (const r of [lo, hi]) {
    assert.equal(r.error, true);
    assert.match(r.message, /5\.000 bis 80\.000 kWh/);
  }
});
test('Herleitung: Mengen und Faktoren ohne erzwungene Stellen, Geld und Einheitspreise mit Cent', () => {
  assert.match(
    oil.verbrauchAbleitung.text,
    /20\.000 kWh.*2\.200,00 Euro.*1,10 Euro\/Liter.*2\.000 Litern bei 10 kWh je Liter/
  );
  assert.doesNotMatch(oil.verbrauchAbleitung.text, /,0+ (?:kWh|Litern)/);
  // Reelle Nachkommastellen bleiben sichtbar; die Rechengenauigkeit bleibt erhalten.
  const changed = structuredClone(sheets);
  changed.KV_Parameter.find((r) => r[0] === 'wz_unit_faktor')[1] = 10.5;
  const [r] = run([
    { ...euro({ heizart: 'oel', n01_preis_oel: 1.1, jahreskosten: 2200.55 }), sheets: changed },
  ]);
  assert.match(r.verbrauchAbleitung.text, /21\.005,25 kWh.*2\.000,5 Litern bei 10,5 kWh je Liter/);
  assert.match(r.preisAnzeige.oelNebenangabe, /10,5 kWh je Liter/);
  assert.equal(r.verbrauchAbleitung.bedarfKwh, (2200.55 * 10.5) / 1.1);
});

console.log(`T1247 ERGEBNIS: ${green} grün / ${red} rot`);
process.exitCode = red ? 1 : 0;
