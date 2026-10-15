// Nachauftrag TAFEL: gemeinsamer Vaillant-Reiter mit unverändertem Markenminimum.
const assert = require('node:assert/strict');
const { read, browser, load, render } = require('./helpers/t1087-datenblatt.cjs');
const { raw, marked, selected, keys } = require('./helpers/t1087-geraetetyp.cjs');
const baseline = '5fe8411b24fc38e705d7e5e44e9fdbd9c424eee8';
const ref = process.argv.includes('--ref') ? process.argv[process.argv.indexOf('--ref') + 1] : '';
const tab = (html, brand) =>
  html.match(new RegExp('<button[^>]*id="manufacturer' + brand + '"[\\s\\S]*?</button>'))[0];
const name = (html) => html.match(/class="manufacturer-name">([^<]*)</)[1];
const price = (html) => html.match(/class="manufacturer-price"[^>]*>([^<]*)</)[1];
function setup(version) {
  const b = browser(version);
  const html = read('preise.html', version);
  b.tabs = Object.fromEntries(['Wolf', 'Vaillant'].map((brand) => [brand, tab(html, brand)]));
  for (const brand of ['wolf', 'vaillant']) {
    b.nodes[brand + 'MinEigen'] = {
      textContent: price(b.tabs[brand === 'wolf' ? 'Wolf' : 'Vaillant']),
    };
  }
  b.output = (brand) =>
    b.tabs[brand].replace(
      /(<span class="manufacturer-price"[^>]*>)[^<]*(<\/span>)/,
      (_, open, close) => open + b.nodes[brand.toLowerCase() + 'MinEigen'].textContent + close
    );
  return b;
}
const cases = [];
const test = (title, run) => cases.push([title, run]);
test('Statischer Vaillant-Reiter umfasst Pro und Plus; Wolf bytegleich', () => {
  const before = setup(baseline),
    after = setup(ref);
  assert.equal(after.output('Wolf'), before.output('Wolf'));
  assert.equal(name(after.output('Vaillant')), 'Vaillant aroTHERM');
});
for (const [mode, rows] of Object.entries({ marker: marked, altvertrag: raw, ausfall: null })) {
  test('Reiter und Markenminimum nach Abruf und Markenwechsel: ' + mode, async () => {
    const before = setup(baseline),
      after = setup(ref);
    await load(before, rows);
    await load(after, rows);
    for (const brand of ['vaillant', 'wolf', 'vaillant']) {
      render(before, brand);
      render(after, brand);
      assert.equal(after.output('Wolf'), before.output('Wolf'), 'Wolf-Reiter bytegleich');
      assert.equal(name(after.output('Vaillant')), 'Vaillant aroTHERM');
      assert.equal(price(after.output('Vaillant')), price(before.output('Vaillant')));
    }
    if (rows) {
      const offered =
        rows === raw
          ? keys.map((key) => raw.vaillant.filter((r) => r.klasse === key).at(-1))
          : selected.vaillant;
      const min = Math.min(...offered.map((r) => r.eigen));
      assert.equal(
        price(after.output('Vaillant')),
        'ab ' + min.toLocaleString('de-DE') + ' € Eigenanteil*'
      );
    } else assert.equal(price(after.output('Vaillant')), 'ab … dein Anteil*');
    console.log(mode + ': ' + after.output('Vaillant'));
  });
}
test('Folgeabrufe behalten den Bestandsvertrag einschließlich bekanntem Rücksetzbefund', async () => {
  const before = setup(baseline),
    after = setup(ref);
  for (const rows of [marked, null, raw, marked]) {
    await load(before, rows);
    await load(after, rows);
    assert.equal(after.output('Wolf'), before.output('Wolf'));
    assert.equal(name(after.output('Vaillant')), 'Vaillant aroTHERM');
    assert.equal(price(after.output('Vaillant')), price(before.output('Vaillant')));
    if (!rows) {
      assert.match(render(after, 'vaillant').cardsHtml, /Auf Anfrage/);
      assert.notEqual(price(after.output('Vaillant')), 'ab … dein Anteil*');
    }
  }
});
(async () => {
  let passed = 0;
  for (const [title, run] of cases) {
    try {
      await run();
      passed++;
      console.log('PASS ' + title);
    } catch (error) {
      console.error('FAIL ' + title + ': ' + error.message);
    }
  }
  console.log(
    JSON.stringify({
      ref: ref || 'Arbeitsbaum',
      bestanden: passed,
      fehlgeschlagen: cases.length - passed,
    })
  );
  if (passed !== cases.length) process.exitCode = 1;
})();
