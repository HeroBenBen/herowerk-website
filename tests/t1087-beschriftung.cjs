// Nachauftrag 3: identischer Rot-/Grünvergleich, nur die freigegebenen Pro-Texte.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { browser, load, render } = require('./helpers/t1087-datenblatt.cjs');
const { raw, marked } = require('./helpers/t1087-geraetetyp.cjs');
const baseline = '672fd9d524d8441694db7118a26832b0b0eec95b';
const ref = process.argv.includes('--ref') ? process.argv[process.argv.indexOf('--ref') + 1] : '';
for (const [mode, rows] of Object.entries({
  marker: marked,
  altvertrag: raw,
  plusAlt: { wolf: raw.wolf, vaillant: raw.vaillant.slice(0, 5) },
  ausfall: null,
})) {
  test(mode + ': Pro-Wortlaut, Hersteller-Ausnahme und übrige Ausgaben bytegleich', async () => {
    const before = browser(baseline);
    const after = browser(ref);
    await load(before, rows);
    await load(after, rows);
    for (const brand of ['wolf', 'vaillant', 'wolf', 'vaillant']) {
      const a = render(before, brand);
      const b = render(after, brand);
      assert.equal(b.cardsHtml, a.cardsHtml, 'sämtliche Karten bytegleich');
      assert.equal(b.details.length, a.details.length);
      b.details.forEach((d, i) => {
        const expected = structuredClone(a.details[i]);
        if (/VWL (?:55|75|115)\/7\.1 A$/.test(d.card.modell)) {
          assert.deepEqual(expected.card.specs[2], ['Kältemittel', 'R290 (natürlich)']);
          assert.equal(expected.card.specs[1][0], 'Heizleistung Pdesignh (W55, mittleres Klima)');
          expected.card.specs[1][0] = 'Heizleistung (Pdesignh)';
          expected.card.specs[2][1] = 'R290 (Propan, natürlich)';
          expected.table = expected.table
            .replace('Heizleistung Pdesignh (W55, mittleres Klima)', 'Heizleistung (Pdesignh)')
            .replace('R290 (natürlich)', 'R290 (Propan, natürlich)');
          assert.deepEqual(d.card.specs.at(-1), ['Hersteller', 'Vaillant GmbH']);
        }
        assert.deepEqual(d, expected, d.card.modell + ': nur genehmigte Textdifferenzen');
      });
    }
  });
}
