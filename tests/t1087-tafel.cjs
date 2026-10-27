// T1087: echte Leser, keine Netz-/Tabellenwrites. --basis testet denselben Prüfsatz gegen origin/main.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const { runPhpEngine } = require('./helpers/php-engine.cjs');
const root = path.resolve(__dirname, '..');
const website = fs.existsSync(path.join(root, 'api/rechner-engine.php'));
const basis = process.argv.includes('--basis');
const read = (file) =>
  basis
    ? cp.execFileSync('git', ['show', 'origin/main:' + file], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(path.join(root, file), 'utf8');
const clone = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b) => assert.deepEqual(clone(a), clone(b));
const prices = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/t1087-preise.json')));
const keys = ['s', 'm', 'l', 'xl', 'xxl'];
function sheet(rows, marked = false) {
  const head = ['Klasse', 'Modell', 'Hausgroesse', 'kW', 'Endpreis_brutto', 'Eigenanteil'];
  if (marked) {
    while (head.length < 17) head.push('');
    head.push('tafel');
  }
  return [
    head,
    ...rows.map((r) => {
      const row = [r.klasse, r.modell, '', r.kw, r.brutto, r.eigen];
      if (marked) {
        while (row.length < 17) row.push('');
        row.push(r.tafel || '');
      }
      return row;
    }),
  ];
}
const oldSheets = { Preise_Wolf: sheet(prices.wolf), Preise_Vaillant: sheet(prices.vaillant) };
const selected = prices.vaillant.slice(5).map((r, i) => ({
  ...r,
  brutto: prices.vaillant[i].brutto,
  eigen: prices.vaillant[i].eigen,
  tafel: 'ja',
}));
const middle = [
  ...prices.vaillant
    .slice(0, 5)
    .map((r) => ({ ...r, tafel: keys.indexOf(r.klasse) > 2 ? 'ja' : '' })),
  ...selected,
  ...prices.vaillant.slice(0, 3).map((r) => ({
    ...r,
    modell: 'anderes ' + r.modell,
    brutto: r.brutto + 1000,
    eigen: r.eigen + 1000,
    tafel: '',
  })),
];
const marked = {
  Preise_Wolf: sheet(
    prices.wolf.map((r) => ({ ...r, tafel: 'ja' })),
    true
  ),
  Preise_Vaillant: sheet(middle, true),
};
const expected = [...selected, ...middle.slice(3, 5)];
const map = (rows) => Object.fromEntries(rows.map((r) => [r.klasse, r.brutto]));
function gas(sheets) {
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
  vm.runInContext(read(website ? 'apps-script/rechner-backend/Code.gs' : 'Code.js'), ctx);
  return ctx;
}
function php(sheets, action) {
  const script = `require $argv[1]; $s=json_decode(stream_get_contents(STDIN),true); try { $v=${action}; echo json_encode(['ok'=>true,'value'=>$v]); } catch (Throwable $e) { echo json_encode(['ok'=>false,'error'=>$e->getMessage()]); }`;
  const r = runPhpEngine(read('api/rechner-engine.php'), script, {
    input: JSON.stringify(sheets),
    encoding: 'utf8',
    maxBuffer: 4e6,
  });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
const cases = [];
function test(name, fn) {
  cases.push([name, fn]);
}
test('Apps Script ohne tafel: letzter Treffer unverändert', () =>
  same(gas(oldSheets).getPrices_('vaillant'), map(prices.vaillant)));
test('Apps Script getPrices_: markierte mittlere Zeile', () =>
  same(gas(marked).getPrices_('vaillant'), map(expected)));
test('Apps Script preise_: ausgewählte Paare und Identität', () =>
  same(
    gas(marked)
      .preise_({})
      .vaillant.map((r) => [r.klasse, r.modell, r.brutto, r.eigen])
      .sort(),
    expected.map((r) => [r.klasse, r.modell, r.brutto, r.eigen]).sort()
  ));
test('Apps Script Rohleser erhält unmarkierte Anker', () =>
  assert.equal(gas(marked).readPriceTable_('Preise_Vaillant').length, middle.length));
test('Apps Script Marker unabhängig von Reihenfolge', () => {
  const s = clone(marked);
  s.Preise_Vaillant = [s.Preise_Vaillant[0], ...s.Preise_Vaillant.slice(1).reverse()];
  same(gas(s).getPrices_('vaillant'), map(expected));
});
for (const kind of ['leer', 'doppelt', 'preislos', 'ungueltig'])
  test('Apps Script weist Markerfehler ab: ' + kind, () => {
    const s = clone(marked);
    const r = s.Preise_Vaillant;
    if (kind === 'leer') r[6][17] = '';
    if (kind === 'doppelt') r[1][17] = 'ja';
    if (kind === 'preislos') r[6][4] = 0;
    if (kind === 'ungueltig') r[1][17] = 'nein';
    for (const fn of [() => gas(s).getPrices_('vaillant'), () => gas(s).preise_({})])
      assert.throws(fn, /tafel/);
  });
if (!website)
  test('Marktanker VWL 55/75/105 bleibt einschließlich Ampel unverändert', () => {
    for (const r of prices.vaillant.slice(0, 3)) {
      const a = { q30_hersteller: 'vaillant' },
        g = { modell: r.modell, kaskade: false };
      same(
        gas(marked).konfMarktAnker_(a, g, r.brutto, []),
        gas(oldSheets).konfMarktAnker_(a, g, r.brutto, [])
      );
    }
  });
if (website) {
  function browser(rows = prices) {
    const source = read('js/site.js');
    const ctx = vm.createContext({
      console,
      document: { getElementById: () => null },
      window: {},
      setTimeout,
      clearTimeout,
    });
    vm.runInContext(
      source.slice(source.indexOf('let paData = []'), source.indexOf('// Karten rendern')),
      ctx
    );
    ctx.input = clone(rows);
    vm.runInContext('paPrices=input', ctx);
    return ctx;
  }
  test('Abruf getrennt: Erfolg, danach Netzfehler und Markerfehler ohne Altstand', async () => {
    const c = browser();
    c.RECHNER_API = '/api/rechner';
    c.console = { info: () => {} };
    const response = { wolf: prices.wolf.map((r) => ({ ...r, tafel: 'ja' })), vaillant: middle };
    c.rechnerFetch = async () => ({ ok: true, json: async () => clone(response) });
    await c.paLoadData();
    c.paApplyBrand('vaillant');
    same(
      vm.runInContext('paData.slice(0,3).map(r=>[r.preis,r.eigen])', c),
      selected.map((r) => [r.brutto, r.eigen])
    );
    for (const fail of [
      async () => {
        throw new Error('Testausfall');
      },
      async () => ({ ok: false, status: 503 }),
      async () => ({
        ok: true,
        json: async () => ({ ...response, vaillant: middle.map((r) => ({ ...r, tafel: '' })) }),
      }),
    ]) {
      c.rechnerFetch = fail;
      await c.paLoadData();
      same(vm.runInContext('paPrices', c), { wolf: [], vaillant: [] });
      c.paApplyBrand('vaillant');
      const cards = vm.runInContext('paData', c);
      assert.ok(cards.every((r) => r.preis === null && r.eigen === null));
      assert.match(cards[0].modell, /aroTHERM pro/);
      same(
        c
          .foerderPackageRows('vaillant')
          .slice(0, 3)
          .map((r) => [r.brutto, r.eigen]),
        selected.map((r) => [r.brutto, r.eigen])
      );
    }
  });
  test('Unbekanntes Modell bleibt ohne Technik; Modellnamen werden als Text ausgegeben', () => {
    const c = browser();
    const identity = c.paDeviceIdentity({ modell: 'Vaillant VWL unbekannt/7.1 A' });
    same(identity.specs, []);
    assert.equal(identity.kw, '');
    assert.equal(
      c.paEscapeHtml('<img src=x onerror="test">'),
      '&lt;img src=x onerror=&quot;test&quot;&gt;'
    );
  });
  test('Browser ohne tafel: Tafel letzter, Förderauswahl erster Treffer', () => {
    const c = browser();
    assert.equal(c.paRowsByKlasse(prices.vaillant).s.brutto, 28963);
    assert.equal(c.foerderPackageRows('vaillant')[0].brutto, 29944);
  });
  test('Browser Tafel: markierte mittlere Gerätezeile', () =>
    same(
      Object.values(browser().paRowsByKlasse(middle))
        .map((r) => [r.klasse, r.modell, r.brutto, r.eigen])
        .sort(),
      expected.map((r) => [r.klasse, r.modell, r.brutto, r.eigen]).sort()
    ));
  test('Browser Förderauswahl: markierte mittlere Gerätezeile', () =>
    same(
      browser({ wolf: prices.wolf, vaillant: middle })
        .foerderPackageRows('vaillant')
        .map((r) => r.modell),
      expected.map((r) => r.modell)
    ));
  test('Browser fehlt/mehrfach ja: kein Positionsrückfall', () => {
    for (const rows of [
      middle.map((r) => ({ ...r, tafel: '' })),
      middle.map((r, i) => ({ ...r, tafel: i === 0 ? 'ja' : r.tafel })),
    ])
      assert.throws(() => browser().paRowsByKlasse(rows), /tafel/);
  });
  test('Gerätebindung auch ohne Marker: keine plus-Technik auf pro', () => {
    const c = browser();
    c.paApplyBrand('vaillant');
    const cards = vm.runInContext('paData', c);
    for (let i = 0; i < 3; i++) {
      assert.match(cards[i].modell, /aroTHERM pro/);
      assert.match(cards[i].modell, /7\.1/);
      assert.equal(cards[i].kw, ['A-7/W35: 4,84 kW', 'A-7/W35: 6,37 kW', 'A-7/W35: 11,12 kW'][i]);
      assert.equal(cards[i].specs.length, 13);
      assert.ok(JSON.stringify(cards[i].specs).includes('JAZ Heizkörper¹'));
    }
  });
  test('Ausfall: neue Rückfallidentität und Preise, Tafel auf Anfrage', () => {
    const c = browser({ wolf: [], vaillant: [] });
    const rows = c.foerderPackageRows('vaillant');
    same(
      rows.map((r) => r.brutto),
      [29944, 34146, 42864, 48865, 85604]
    );
    assert.match(c.foerderFormatPackageOption(rows[0]), /aroTHERM pro/);
    c.paApplyBrand('vaillant');
    const cards = vm.runInContext('paData', c);
    assert.equal(cards[0].preis, null);
    assert.match(cards[0].modell, /7\.1/);
  });
  test('PHP ohne tafel: letzter Treffer und vollständige Preisantwort', () => {
    same(php(oldSheets, "hw_get_prices($s,'vaillant')").value, map(prices.vaillant));
    assert.equal(php(oldSheets, 'hw_preise($s)').value.vaillant.length, 8);
  });
  test('PHP hw_get_prices: markierte mittlere Zeile', () =>
    same(php(marked, "hw_get_prices($s,'vaillant')").value, map(expected)));
  test('PHP hw_preise: Paar, Identität und Marker', () => {
    const r = php(marked, 'hw_preise($s)');
    assert.equal(r.ok, true);
    same(
      r.value.vaillant.map((r) => [r.klasse, r.modell, r.brutto, r.eigen]).sort(),
      expected.map((r) => [r.klasse, r.modell, r.brutto, r.eigen]).sort()
    );
    assert.ok(r.value.vaillant.every((r) => r.tafel === 'ja'));
  });
  test('PHP Rohleser: alle Modellzeilen für Dimensionierung', () =>
    assert.equal(
      php(marked, "hw_read_price_table($s,'Preise_Vaillant')").value.length,
      middle.length
    ));
  for (const kind of ['leer', 'doppelt', 'preislos', 'ungueltig'])
    test('PHP weist Markerfehler ab: ' + kind, () => {
      const s = clone(marked);
      if (kind === 'leer') s.Preise_Vaillant[6][17] = '';
      if (kind === 'doppelt') s.Preise_Vaillant[1][17] = 'ja';
      if (kind === 'preislos') s.Preise_Vaillant[6][4] = 0;
      if (kind === 'ungueltig') s.Preise_Vaillant[1][17] = 'nein';
      for (const fn of ["hw_get_prices($s,'vaillant')", 'hw_preise($s)']) {
        const r = php(s, fn);
        assert.equal(r.ok, false);
        assert.match(r.error, /tafel/);
      }
    });
}
// Referenzfall aus PLAN_SM.md: kein manueller Preis, erste selbstgenutzte WE,
// volle Förderung im Antragszeitraum h2-2026, kein Gemeindezuschuss.
if (!website)
  test('Apps Script leeres Altblatt bleibt leer statt Ausnahme', () => {
    same(gas({ Preise_Vaillant: [] }).getPrices_('vaillant'), {});
    same(gas({ Preise_Vaillant: [] }).readPriceTable_('Preise_Vaillant'), []);
  });
test('Referenzpaare S/M/L: echte Förderroute und getPrices_ lesen dieselbe Zeile', () => {
  const c = gas(marked);
  vm.runInContext(read(website ? 'apps-script/rechner-backend/kv_engine.gs' : 'kv_engine.js'), c);
  const sheets = {
    ...marked,
    Förder_Parameter: [['schluessel', 'wert'], ...c.FOERDER_ROWS_()],
    KV_Parameter: [['schluessel', 'wert'], ...c.KV_PARAMETER_ROWS_()],
    KV_FoerderPerioden: [
      [
        'key',
        'von',
        'bis',
        'label',
        'klima',
        'grenze',
        'eu',
        'cap',
        'effizienz',
        'kindFreibetrag',
        'einkStufen',
        'proKlima',
        'quelle',
      ],
      ...c.KV_PERIODEN_ROWS_(),
    ],
  };
  c.getAllParameters_ = () => ({ foerder: Object.fromEntries(c.FOERDER_ROWS_()) });
  c.SpreadsheetApp = {
    openById: () => ({
      getSheetByName: (name) =>
        sheets[name]
          ? {
              getDataRange: () => ({ getValues: () => clone(sheets[name]) }),
              getLastRow: () => sheets[name].length,
              getRange: (r, col, n, w) => ({
                getValues: () =>
                  sheets[name]
                    .slice(r - 1, r - 1 + n)
                    .map((row) => Array.from({ length: w }, (_, i) => row[col - 1 + i] ?? '')),
              }),
            }
          : null,
    }),
  };
  c.Utilities = { formatDate: () => '2026-10-14' };
  for (const row of selected) {
    const q = {
      we: '1',
      selbstWE: '1',
      heizung: 'oel',
      einkommen: 'bis30',
      heizungsalter: '30',
      funktionstuechtig: 'ja',
      eu: 'ja',
      kind: 'nein',
      gemeinde: '',
      fHalbjahr: 'h2-2026',
      marke: 'vaillant',
      wpTyp: row.klasse,
    };
    const value = c.foerderung_(q);
    same([value.preis, value.eigenanteil], [row.brutto, row.eigen]);
    assert.equal(c.getPrices_('vaillant')[row.klasse], value.preis);
    if (website) {
      const query = Buffer.from(JSON.stringify(q)).toString('base64');
      const result = php(sheets, `hw_foerderung(json_decode(base64_decode('${query}'),true),$s)`);
      assert.equal(result.ok, true, result.error);
      same([result.value.preis, result.value.eigenanteil], [row.brutto, row.eigen]);
    }
  }
});
test('Apps Script Rohdaten-Abzug reicht R unverändert durch', () => {
  const c = gas(marked);
  c.werteSnapshotCacheRead_ = () => null;
  c.werteSnapshotCacheWrite_ = () => {};
  // Nicht betroffene Blattnamen haben hier eine leere Testmatrix.
  c.SpreadsheetApp = {
    openById: () => ({
      getSheetByName: (name) => ({
        getDataRange: () => ({ getValues: () => clone(marked[name] || []) }),
      }),
    }),
  };
  same(c.werteSnapshot_().sheets.Preise_Vaillant, marked.Preise_Vaillant);
});
if (website)
  test('Brücke: Sollprobe grün, fremder Letzttreffer und fehlendes R rot', async () => {
    const { pruefeSmBruecke } = await import('../scripts/verify-t1087-bruecke.mjs');
    const result = pruefeSmBruecke(oldSheets, true);
    assert.equal(result.bruecke, true);
    const bad = clone(oldSheets);
    bad.Preise_Vaillant.push(['s', 'anderes Gerät', '', '', 99999, 9999]);
    assert.throws(() => pruefeSmBruecke(bad, true), /letzter Klassentreffer/);
    assert.throws(() => pruefeSmBruecke(oldSheets), /R1/);
  });
async function main() {
  let failures = 0;
  for (const [name, fn] of cases) {
    try {
      await fn();
      console.log('PASS ' + name);
    } catch (e) {
      failures++;
      console.log('FAIL ' + name + ' | ' + e.message.slice(0, 300));
    }
  }
  console.log(
    `${cases.length - failures}/${cases.length} grün; ${failures} rot; Quelle ${basis ? 'origin/main' : 'Arbeitsbaum'}`
  );
  process.exitCode = failures ? 1 : 0;
}
main();
