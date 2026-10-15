// Nachauftrag JAZ: gleicher Prüfsatz am alten Kopf und am Bau.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { browser, load, render, read, root, internal } = require('./helpers/t1087-datenblatt.cjs');
const { raw, marked } = require('./helpers/t1087-geraetetyp.cjs');
const { index, expectedJaz, footnote, plain } = require('./helpers/t1087-jaz.cjs');
const baseline = 'b4e5df1b8385cf32c94e7af42735882579961604';
const ref = process.argv.includes('--ref') ? process.argv[process.argv.indexOf('--ref') + 1] : '';
const cases = [];
const test = (name, fn) => cases.push([name, fn]);
test('Originalantworten: jedes Ergebnisfeld und jede Prüfsumme unverändert', () => {
  assert.equal(index.values.length, 8);
  for (const v of index.values) {
    const bytes = fs.readFileSync(path.join(root, 'tests/fixtures/jaz-bwp', v.response));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), v.sha256);
    assert.equal(JSON.parse(bytes)[index.result_field], v.value);
  }
});
for (const [mode, rows] of Object.entries({
  marker: marked,
  altvertrag: raw,
  plusAlt: { wolf: raw.wolf, vaillant: raw.vaillant.slice(0, 5) },
  ausfall: null,
})) {
  test(mode + ': ausschließlich freigegebene JAZ-Differenzen, Wolf bytegleich', async () => {
    const before = browser(baseline),
      after = browser(ref);
    await load(before, rows);
    await load(after, rows);
    // Der Rückweg zu Wolf und erneut zu Vaillant darf keine fremde Fußnote behalten.
    for (const brand of ['wolf', 'vaillant', 'wolf', 'vaillant']) {
      const a = render(before, brand),
        b = render(after, brand);
      assert.equal(b.cardsHtml, a.cardsHtml, 'Karten einschließlich Preis bytegleich');
      b.details.forEach((d, i) => {
        const old = a.details[i],
          expected = expectedJaz(d.card.modell);
        if (brand === 'wolf' || !expected) {
          assert.deepEqual(d, old, 'Wolf und alte Plus-Geräte vollständig bytegleich');
          return;
        }
        const noJaz = (specs) => specs.filter(([name]) => !name.startsWith('JAZ'));
        assert.deepEqual(noJaz(d.card.specs), noJaz(old.card.specs));
        assert.deepEqual({ ...d.card, specs: [] }, { ...old.card, specs: [] });
        for (const field of ['title', 'sub', 'cta', 'image']) assert.equal(d[field], old[field]);
        assert.deepEqual(
          d.card.specs.filter(([name]) => name.startsWith('JAZ')),
          expected
        );
        const at = d.card.specs.findIndex(([name]) => name.startsWith('SCOP'));
        assert.deepEqual(d.card.specs.slice(at + 1, at + 3), expected);
        for (const [name, value] of expected)
          assert.ok(
            d.table.includes('<td>' + name + '</td><td><strong>' + value + '</strong></td>')
          );
        assert.equal(d.jazDisplay, 'block');
        const scop = plain(before.nodes.paScopFootnote.innerHTML);
        assert.equal(plain(d.jazFootnote), footnote + ' ' + scop);
        assert.doesNotMatch(d.sub + d.table + d.jazFootnote, internal);
        assert.doesNotMatch(
          d.jazFootnote,
          /Heizlast|Auslegungsleistung|Rechenprotokoll|Betriebsart|monovalent|bivalent|\bkW\b/i
        );
      });
    }
  });
}
test('Wolf-Reiter, Förderseite und statischer Bestandsfußtext bytegleich', () => {
  // Ausschließlich die notwendigen Inhalts-Hashes der geänderten Assets ausnehmen.
  const withoutAssetHashes = (html) =>
    html.replace(/((?:css\/site\.css|js\/site\.js)\?v=)[a-f0-9]+/g, '$1HASH');
  assert.equal(
    withoutAssetHashes(read('foerderung.html', ref)),
    withoutAssetHashes(read('foerderung.html', baseline))
  );
  for (const regex of [
    /<button[^>]*id="manufacturerWolf"[\s\S]*?<\/button>/,
    /<div id="paJazFootnote"[\s\S]*?<\/div>/,
    /<div id="paScopFootnote"[\s\S]*?<\/div>/,
  ]) {
    assert.ok(read('preise.html', ref).match(regex));
    assert.equal(
      read('preise.html', ref).match(regex)[0],
      read('preise.html', baseline).match(regex)[0]
    );
  }
});
(async () => {
  let failed = 0;
  for (const [name, fn] of cases) {
    try {
      await fn();
      console.log('PASS ' + name);
    } catch (e) {
      failed++;
      console.log('FAIL ' + name + ': ' + e.message.slice(0, 600));
    }
  }
  console.log(
    JSON.stringify({
      ref: ref || 'Arbeitsbaum',
      bestanden: cases.length - failed,
      fehlgeschlagen: failed,
    })
  );
  process.exitCode = failed ? 1 : 0;
})();
