// Nachauftrag: --ref <Commit> führt denselben Prüfsatz gegen den beanstandeten Kopf aus.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const website = fs.existsSync(path.join(root, 'api/rechner-engine.php'));
const ref = process.argv.includes('--ref') ? process.argv[process.argv.indexOf('--ref') + 1] : null;
const read = (file, revision = ref) =>
  revision
    ? cp.execFileSync('git', ['show', revision + ':' + file], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(path.join(root, file), 'utf8');
const clone = (x) => JSON.parse(JSON.stringify(x));
const same = (a, b) => assert.deepEqual(clone(a), clone(b));
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/t1087-preise.json')));
const old = {};
for (const brand of ['wolf', 'vaillant'])
  old['Preise_' + brand[0].toUpperCase() + brand.slice(1)] = [
    ['Klasse', 'Modell', 'Hausgroesse', 'kW', 'Endpreis_brutto', 'Eigenanteil'],
    ...fixture[brand].map((r) => [r.klasse, r.modell, '', r.kw, r.brutto, r.eigen]),
  ];
const marked = clone(old);
for (const [name, rows] of Object.entries(marked)) {
  rows[0][17] = 'tafel';
  for (let i = 1; i < rows.length; i++) rows[i][17] = name === 'Preise_Wolf' || i >= 4 ? 'ja' : '';
}
for (let i = 0; i < 3; i++) {
  marked.Preise_Vaillant[6 + i][4] = old.Preise_Vaillant[1 + i][4];
  marked.Preise_Vaillant[6 + i][5] = old.Preise_Vaillant[1 + i][5];
}
function gas(sheets, revision = ref) {
  const ctx = vm.createContext({
    console,
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (name) => ({
          getDataRange: () => ({ getValues: () => clone(sheets[name]) }),
        }),
      }),
    },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
  });
  vm.runInContext(read(website ? 'apps-script/rechner-backend/Code.gs' : 'Code.js', revision), ctx);
  return ctx;
}
function php(sheets, action, revision = ref) {
  const script = `eval(substr($argv[1],5)); $s=json_decode(stream_get_contents(STDIN),true); echo json_encode(${action}, JSON_THROW_ON_ERROR);`;
  const r = cp.spawnSync('php', ['-r', script, read('api/rechner-engine.php', revision)], {
    input: JSON.stringify(sheets),
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
function browser(rows, revision = ref) {
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id))
      nodes.set(id, {
        innerHTML: '',
        textContent: '',
        style: {},
        querySelector: (sel) => node(id + sel),
      });
    return nodes.get(id);
  };
  const ctx = vm.createContext({
    console,
    document: {
      getElementById: node,
      querySelector: () => ({ dataset: { manufacturer: 'vaillant' } }),
    },
    window: {},
    setTimeout,
    clearTimeout,
  });
  const source = read('js/site.js', revision);
  vm.runInContext(
    source.slice(source.indexOf('let paData = []'), source.indexOf('// Pfeilposition berechnen')),
    ctx
  );
  ctx.input = clone(rows);
  vm.runInContext('paPrices=input', ctx);
  ctx.nodes = nodes;
  return ctx;
}
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
for (const raw of ['', '   ', null, 'kein Preis', '123abc', true]) {
  test('Apps Script F7 ungültig ' + JSON.stringify(raw), () => {
    const s = clone(marked);
    s.Preise_Vaillant[6][5] = raw;
    const rows = gas(s).preise_({}).vaillant;
    assert.equal(rows.find((r) => r.klasse === 's').eigen, null);
    assert.equal(rows.find((r) => r.klasse === 'm').eigen, 11746);
  });
  if (website)
    test('PHP bis Tafel F7 ungültig ' + JSON.stringify(raw), () => {
      const s = clone(marked);
      s.Preise_Vaillant[6][5] = raw;
      const prices = php(s, 'hw_preise($s)');
      assert.equal(prices.vaillant.find((r) => r.klasse === 's').eigen, null);
      const c = browser(prices);
      c.paApplyBrand('vaillant');
      c.paRenderCards();
      const cards = vm.runInContext('paData', c);
      c.paUpdateDetail(cards[0]);
      assert.equal(cards[0].eigen, null);
      assert.equal(cards[1].eigen, 11746);
      assert.match(cards[0].modell, /VWL 55\/7\.1 A/);
      const first = c.nodes.get('paCards').innerHTML.split('data-idx="1"')[0];
      assert.match(first, /Auf Anfrage/);
      assert.doesNotMatch(first, /ab 0 €/);
      assert.match(c.nodes.get('paDetailCta').innerHTML, /auf Anfrage/);
      assert.doesNotMatch(c.nodes.get('paDetailCta').innerHTML, /ab 0 €/);
    });
}
for (const [raw, expected] of [
  [0, 0],
  ['0', 0],
  [7544, 7544],
  ['7.544,50', 7544.5],
]) {
  test('Gültiger Eigenanteil einschließlich echter Null ' + JSON.stringify(raw), () => {
    const s = clone(marked);
    s.Preise_Vaillant[6][5] = raw;
    assert.equal(
      gas(s)
        .preise_({})
        .vaillant.find((r) => r.klasse === 's').eigen,
      expected
    );
    if (website)
      assert.equal(php(s, 'hw_preise($s)').vaillant.find((r) => r.klasse === 's').eigen, expected);
  });
}
for (const raw of [' S ', 'S', 's']) {
  test('Apps Script ohne Marker exakter Altvertrag A7=' + JSON.stringify(raw), () => {
    const s = clone(old);
    s.Preise_Vaillant[6][0] = raw;
    same(gas(s).getPrices_('vaillant'), gas(s, 'origin/main').getPrices_('vaillant'));
    same(gas(s).preise_({}), gas(s, 'origin/main').preise_({}));
    same(
      gas(s).readPriceTable_('Preise_Vaillant'),
      gas(s, 'origin/main').readPriceTable_('Preise_Vaillant')
    );
  });
  if (website) {
    test('PHP ohne Marker exakter Altvertrag A7=' + JSON.stringify(raw), () => {
      const s = clone(old);
      s.Preise_Vaillant[6][0] = raw;
      for (const action of [
        "hw_get_prices($s,'vaillant')",
        'hw_preise($s)',
        "hw_read_price_table($s,'Preise_Vaillant')",
      ])
        same(php(s, action), php(s, action, 'origin/main'));
    });
    test('Browser ohne Marker exakter Altvertrag A7=' + JSON.stringify(raw), () => {
      const rows = clone(fixture);
      rows.vaillant[5].klasse = raw;
      const a = browser(rows),
        b = browser(rows, 'origin/main');
      same(a.paRowsByKlasse(rows.vaillant), b.paRowsByKlasse(rows.vaillant));
      same(a.foerderPackageRows('vaillant'), b.foerderPackageRows('vaillant'));
    });
  }
}
test('Mit Marker wird A7=" S " normalisiert und dieselbe Gerätezeile gewählt', () => {
  const s = clone(marked);
  s.Preise_Vaillant[6][0] = ' S ';
  assert.equal(gas(s).getPrices_('vaillant').s, 29944);
  const response = gas(s).preise_({});
  assert.equal(response.vaillant.find((r) => r.klasse === 's').modell, fixture.vaillant[5].modell);
  if (website) {
    same(php(s, "hw_get_prices($s,'vaillant')"), gas(s).getPrices_('vaillant'));
    const rows = php(s, 'hw_preise($s)');
    rows.vaillant.find((r) => r.klasse === 's').klasse = ' S ';
    const b = browser(rows);
    assert.equal(b.paRowsByKlasse(rows.vaillant).s.modell, fixture.vaillant[5].modell);
    assert.equal(b.foerderPackageRows('vaillant')[0].modell, fixture.vaillant[5].modell);
  }
});
if (website)
  test('Brücke darf A7=" S " nicht als alten Klassentreffer bestätigen', async () => {
    const source = read('scripts/verify-t1087-bruecke.mjs');
    const { pruefeSmBruecke } = await import(
      'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
    );
    assert.equal(pruefeSmBruecke(old, true).bruecke, true);
    const spaced = clone(old);
    spaced.Preise_Vaillant[6][0] = ' S ';
    assert.throws(() => pruefeSmBruecke(spaced, true), /nicht letzter Klassentreffer/);
  });
async function main() {
  let failures = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log('PASS ' + name);
    } catch (e) {
      failures++;
      console.log('FAIL ' + name + ' | ' + e.message.slice(0, 200));
    }
  }
  console.log(
    `${tests.length - failures}/${tests.length} grün; ${failures} rot; Quelle ${ref || 'Arbeitsbaum'}`
  );
  process.exitCode = failures ? 1 : 0;
}
main();
