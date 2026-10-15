// NA2: derselbe Anzeigevertrag gegen Arbeitsbaum und ausgelieferte Ausgangsfassung.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const basis = process.argv.includes('--basis') ? '7840681dd2c7eb88b3a53f85c7e2da92fab2c4dc' : '';
const read = (file) =>
  basis
    ? cp.execFileSync('git', ['show', basis + ':' + file], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(path.join(root, file), 'utf8');
const {
  raw,
  clone,
  keys,
  marked,
  selected,
  forbidden,
  model,
  label,
} = require('./helpers/t1087-geraetetyp.cjs');
const { internal } = require('./helpers/t1087-datenblatt.cjs');
function element() {
  return {
    dataset: {},
    style: {},
    children: [],
    textContent: '',
    _html: '',
    value: 'wolf:m',
    appendChild(child) {
      this.children.push(child);
    },
    set innerHTML(value) {
      this._html = value;
      this.children = [];
    },
    get innerHTML() {
      return this._html;
    },
    get options() {
      return this.children.flatMap((g) => g.children);
    },
    get selectedOptions() {
      return this.options.filter((o) => o.value === this.value);
    },
    querySelector() {
      return this;
    },
  };
}
function browser() {
  const nodes = Object.fromEntries(
    ['foerderWpTyp', 'paCards', 'paSpecsTitle', 'paSpecsSub', 'paSpecsTable', 'paDetailCta'].map(
      (id) => [id, element()]
    )
  );
  const ctx = vm.createContext({
    console: { info() {} },
    document: {
      getElementById: (id) => nodes[id] || null,
      createElement: element,
      querySelector: () => null,
    },
    window: {},
    setTimeout,
    clearTimeout,
    RECHNER_API: '/api/rechner',
    foerderMarke: 'wolf',
  });
  let src = read('js/site.js');
  if (process.argv.includes('--mutation')) {
    const needle = '[identity.modell, brutto.toLocaleString';
    assert.ok(src.includes(needle), 'Mutationsstelle muss vorhanden sein');
    src = src.replace(needle, '[identity.modell, row.kw, brutto.toLocaleString');
  }
  vm.runInContext(
    src.slice(src.indexOf('let paData = []'), src.indexOf('// Pfeilposition berechnen')),
    ctx
  );
  return { ctx, nodes };
}
const cases = [];
const test = (name, fn) => cases.push([name, fn]);
test('Prüfmuster erkennt Varianten und lässt Gerätekennungen zu', () => {
  for (const value of ['kW', 'W35', 'W55', 'A-7', 'A-11', 'A − 12,5 / W 45', 'A+2/W30'])
    assert.match(value, forbidden);
  for (const row of Object.values(selected).flat()) assert.doesNotMatch(label(row), forbidden);
});
for (const [name, rows] of Object.entries({ marker: marked, altvertrag: raw, ausfall: null })) {
  test('Jede Förderoption nur Gerätetyp und Preis: ' + name, async () => {
    const { ctx, nodes } = browser();
    ctx.rechnerFetch = async () =>
      rows ? { ok: true, json: async () => clone(rows) } : { ok: false, status: 503 };
    await ctx.paLoadData();
    const expected =
      name === 'altvertrag' ? { wolf: raw.wolf, vaillant: raw.vaillant.slice(0, 5) } : selected;
    const labels = nodes.foerderWpTyp.options.map((o) => o.textContent);
    console.log('AUSGABE ' + name + ': ' + JSON.stringify(labels));
    assert.equal(labels.length, 10);
    labels.forEach((text, i) => {
      assert.doesNotMatch(text, forbidden);
      assert.equal(text, label(Object.values(expected).flat()[i]));
    });
    for (const brand of ['wolf', 'vaillant']) {
      for (const row of ctx.foerderPackageRows(brand)) {
        assert.equal(ctx.foerderFormatPackageOption({ ...row, kw: 'A−12/W45: 99 kW' }), label(row));
      }
    }
  });
  test('Tafel: Geräte, Paare und Herstellerdaten: ' + name, async () => {
    const { ctx, nodes } = browser();
    ctx.rechnerFetch = async () =>
      rows ? { ok: true, json: async () => clone(rows) } : { ok: false, status: 503 };
    await ctx.paLoadData();
    for (const brand of ['wolf', 'vaillant']) {
      ctx.paApplyBrand(brand);
      const cards = vm.runInContext('paData', ctx);
      ctx.paRenderCards();
      assert.doesNotMatch(nodes.paCards.innerHTML, internal);
      assert.match(nodes.paCards.innerHTML, /class="pa-kw"/);
      for (const [i, card] of cards.entries()) {
        const expected = rows
          ? keys.map((key) =>
              rows[brand]
                .filter((r) => r.klasse === key && (name !== 'marker' || r.tafel === 'ja'))
                .at(-1)
            )[i]
          : selected[brand][i];
        assert.equal(card.modell, model(expected));
        assert.equal(card.preis, rows ? expected.brutto : null);
        assert.equal(card.eigen, rows ? expected.eigen : null);
        ctx.paUpdateDetail(card);
        console.log(
          'TAFEL ' +
            name +
            '/' +
            brand +
            '/' +
            keys[i] +
            ': ' +
            JSON.stringify({
              modell: card.modell,
              preis: card.preis,
              eigen: card.eigen,
              specs: card.specs,
            })
        );
        assert.equal(nodes.paSpecsSub.textContent, model(expected) + ' · ' + card.kw);
        assert.doesNotMatch(nodes.paSpecsTable.innerHTML, internal);
        if (expected.modell.includes('/7.1')) {
          assert.equal(card.specs.length, 13);
          assert.match(nodes.paSpecsTable.innerHTML, /JAZ Heizkörper¹/);
          assert.match(nodes.paSpecsTable.innerHTML, /SCOP/);
        }
      }
    }
  });
}
test('Erfolg, Ausfall, Markerfehler, neuer Erfolg: kein alter Leistungstext', async () => {
  const { ctx, nodes } = browser();
  for (const data of [
    marked,
    null,
    { ...marked, vaillant: marked.vaillant.map((r) => ({ ...r, tafel: '' })) },
    marked,
  ]) {
    ctx.rechnerFetch = async () => {
      if (!data) throw new Error('Testausfall');
      return { ok: true, json: async () => clone(data) };
    };
    await ctx.paLoadData();
    assert.deepEqual(
      nodes.foerderWpTyp.options.map((o) => o.textContent),
      Object.values(selected).flat().map(label)
    );
  }
});
test('Rohdaten können keine interne Auslegung zurück in die Anzeige bringen', () => {
  const { ctx, nodes } = browser();
  ctx.input = clone(marked);
  Object.values(ctx.input)
    .flat()
    .forEach((row) => {
      row.kw = 'A-11/W55: 99 kW';
    });
  vm.runInContext('paPrices=input', ctx);
  for (const brand of ['wolf', 'vaillant']) {
    ctx.paApplyBrand(brand);
    ctx.paRenderCards();
    for (const card of vm.runInContext('paData', ctx)) {
      ctx.paUpdateDetail(card);
      assert.doesNotMatch(
        nodes.paCards.innerHTML + nodes.paSpecsSub.textContent + nodes.paSpecsTable.innerHTML,
        internal
      );
    }
  }
});
test('Statische Förderoptionen haben denselben Vertrag', () => {
  const html = read('foerderung.html');
  const select = html.match(/<select id="foerderWpTyp">([\s\S]*?)<\/select>/)[1];
  const labels = [...select.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map((m) => m[1]);
  console.log('AUSGABE statisch: ' + JSON.stringify(labels));
  assert.equal(labels.length, 10);
  labels.forEach((text, i) => {
    assert.doesNotMatch(text, forbidden);
    assert.equal(text, label(Object.values(selected).flat()[i]));
  });
});
test('Statischer Tafeluntertitel mit Herstellerpunkt, Fußtext ohne interne Temperatur', () => {
  const html = read('preise.html');
  assert.equal(html.match(/id="paSpecsSub">([^<]*)</)[1], 'Wolf CHA-10 · A-7/W35: 2,3–9,8 kW');
  assert.doesNotMatch(
    html.slice(html.indexOf('id="paSpecsTitle"'), html.indexOf('<!-- CTAs')),
    internal
  );
});
async function main() {
  let failed = 0;
  for (const [name, fn] of cases) {
    try {
      await fn();
      console.log('PASS ' + name);
    } catch (error) {
      failed++;
      console.log('FAIL ' + name + ': ' + error.message);
    }
  }
  console.log(
    JSON.stringify({
      basis: basis || 'Arbeitsbaum',
      bestanden: cases.length - failed,
      fehlgeschlagen: failed,
    })
  );
  process.exitCode = failed ? 1 : 0;
}
main();
