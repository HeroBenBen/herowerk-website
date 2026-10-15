// Bauauftrag TAFEL, Anpassung 1. --ref prüft denselben Vertrag an alten Git-Objekten.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const vm = require('node:vm');
const {
  root,
  baseline,
  read,
  internal,
  browser,
  load,
  render,
} = require('./helpers/t1087-datenblatt.cjs');
const {
  raw,
  marked,
  clone,
  forbidden,
  label,
  selected,
} = require('./helpers/t1087-geraetetyp.cjs');
const ref = process.argv.includes('--ref') ? process.argv[process.argv.indexOf('--ref') + 1] : '';
const mutate = (s) => {
  if (process.argv.includes('--mutation-bild'))
    return s.replaceAll('vwl-pro-s-m.jpg', 'vwl-plus-s-m.jpg');
  if (process.argv.includes('--mutation-wolf')) return s.replace('2,4-6,8 kW', '2,4-9,9 kW');
  return s;
};
const cases = [];
const test = (n, f) => cases.push([n, f]);
// Primärquellen und Bedingungen: docs/tafel-vaillant-quellen.md, Tabelle Pro.
const pro = [
  [
    '4,84',
    '2,91',
    '5',
    '49,0',
    '198 % / 145 %',
    '5,01 / 3,70',
    '1.104 × 454 × 750 mm',
    'vwl-pro-s-m.jpg',
  ],
  [
    '6,37',
    '2,66',
    '7',
    '49,0',
    '192 % / 142 %',
    '4,87 / 3,62',
    '1.104 × 454 × 750 mm',
    'vwl-pro-s-m.jpg',
  ],
  [
    '11,12',
    '2,55',
    '11',
    '54,8',
    '194 % / 143 %',
    '4,93 / 3,66',
    '1.169 × 454 × 1.103 mm',
    'vwl-pro-l.jpg',
  ],
];
function expectedSpecs(p) {
  return [
    ['Heizleistung A-7/W35', `${p[0]} kW (COP ${p[1]})`],
    ['Heizleistung Pdesignh (W55, mittleres Klima)', p[2] + ' kW'],
    ['Kältemittel', 'R290 (natürlich)'],
    ['Bauart', 'Monoblock (Außenaufstellung)'],
    ['Vorlauftemp.', 'bis 70 °C'],
    ['Schallleistung ErP außen', p[3] + ' dB(A)'],
    ['Effizienzklasse (35 / 55 °C)', 'A+++ / A++'],
    ['ηs (35 / 55 °C)', p[4]],
    ['SCOP (35 / 55 °C)²', p[5]],
    ['Abmessung (BxTxH)', p[6]],
    ['Hersteller', 'Vaillant GmbH'],
  ];
}
const modes = {
  marker: marked,
  altvertrag: raw,
  plusAlt: { wolf: raw.wolf, vaillant: raw.vaillant.slice(0, 5) },
  ausfall: null,
};
for (const [mode, rows] of Object.entries(modes)) {
  for (const brand of ['wolf', 'vaillant'])
    test(`${mode}: ${brand} Daten, Ausgabe und Bilder`, async () => {
      const before = browser(baseline),
        after = browser(ref, mutate);
      await load(before, rows);
      await load(after, rows);
      const a = render(before, brand),
        b = render(after, brand);
      if (brand === 'wolf' || mode === 'plusAlt')
        assert.equal(b.cardsHtml, a.cardsHtml, 'Karten bytegleich');
      b.details.forEach((d, i) => {
        const old = a.details[i],
          isPro = brand === 'vaillant' && i < 3 && mode !== 'plusAlt';
        assert.deepEqual(
          [d.card.preis, d.card.eigen],
          [old.card.preis, old.card.eigen],
          'Preis-/Eigenanteilpaar'
        );
        assert.doesNotMatch(d.sub + d.table, internal);
        if (isPro) {
          assert.deepEqual(d.card.specs, expectedSpecs(pro[i]));
          assert.equal(d.card.kw, 'A-7/W35: ' + pro[i][0] + ' kW');
          assert.equal(d.sub, d.card.modell + ' · ' + d.card.kw);
          assert.equal(d.card.img, pro[i][7]);
          assert.doesNotMatch(d.table, /JAZ|offen|Platzhalter/);
          assert.match(d.table, /<strong>.*<\/strong>/);
        } else {
          for (const field of ['title', 'sub', 'table', 'cta'])
            assert.equal(d[field], old[field], field + ' bytegleich');
          assert.deepEqual(d.card.specs, old.card.specs);
          if (brand === 'wolf') {
            assert.deepEqual(d.card, old.card);
            assert.equal(d.image, old.image, 'Wolf-Bild-HTML bytegleich');
          } else assert.equal(d.card.img, i < 2 ? 'vwl-plus-s-m.jpg' : 'vwl-plus-l-xl.jpg');
        }
        assert.match(d.image, new RegExp(d.card.img.replaceAll('.', '\\.')));
      });
    });
}
test('Fußtext und statischer Untertitel aus N, nur Temperaturzusatz entfällt', () => {
  const old = read('preise.html', baseline),
    html = read('preise.html', ref);
  const sub = (s) => s.match(/id="paSpecsSub">([^<]*)</)[1];
  const foot = (s) => s.match(/<div id="paJazFootnote"[\s\S]*?<\/div>/)?.[0];
  assert.equal(sub(html), sub(old));
  assert.equal(foot(html), foot(old).replace(' · −11 °C', ''));
  assert.doesNotMatch(html, internal);
});
test('Dimensionierungsanzeige unverändert; keine Rechenkernänderung aus dem Tafelzweig', () => {
  const block = (s) =>
    s.slice(s.indexOf('function formatNormaussentemperatur'), s.indexOf('function checkPlz'));
  assert.equal(block(read('js/site.js', ref)), block(read('js/site.js', baseline)));
  // Die PR-CI prüft den kombinierten Stand mit main. Bereits dort integrierte
  // Änderungen anderer Aufträge sind kein Eingriff dieses Tafelzweigs.
  // Lokal bleibt der gemeinsame Vorfahr die Basis; im CI-Merge ist es main.
  const coreBase = cp
    .execFileSync('git', ['merge-base', ref || 'HEAD', 'origin/main'], {
      cwd: root,
      encoding: 'utf8',
    })
    .trim();
  for (const f of ['api/rechner-engine.php', 'apps-script/rechner-backend/Code.gs'])
    assert.equal(read(f, ref), read(f, coreBase), f + ': keine eigene Rechenkernänderung');
});
test('Wolf-Bilddateien bytegleich', () => {
  for (const f of [
    'cha-sanierung.jpg',
    'cha-neubau-dunkel.jpg',
    'cha-komfort-neubau.jpg',
    'cha-mfh-saniert.jpg',
    'cha-kaskade-mfh.jpg',
  ]) {
    const a = cp.execFileSync('git', ['show', baseline + ':' + f], { cwd: root });
    const b = ref
      ? cp.execFileSync('git', ['show', ref + ':' + f], { cwd: root })
      : fs.readFileSync(path.join(root, f));
    assert.deepEqual(a, b, f);
  }
});
test('Neue Vaillant-Bilder vorhanden und JPEG', () => {
  for (const f of ['vwl-pro-s-m.jpg', 'vwl-pro-l.jpg', 'vwl-plus-s-m.jpg', 'vwl-plus-l-xl.jpg']) {
    const b = ref
      ? cp.execFileSync('git', ['show', ref + ':' + f], {
          cwd: root,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      : fs.readFileSync(path.join(root, f));
    assert.equal(b.readUInt16BE(0), 0xffd8);
    assert.ok(b.length > 10000);
  }
});
test('Interne Werte aus Rohzeilen und manipulierten Darstellungsdaten werden nicht ausgegeben', async () => {
  const b = browser(ref, mutate),
    rows = clone(marked);
  Object.values(rows)
    .flat()
    .forEach((r) => {
      r.kw = 'A − 11 / W 55: 99 kW';
      r.specs = [['Bivalenzpunkt', '−11 °C']];
    });
  for (const data of [rows, null, rows]) {
    await load(b, data);
    for (const brand of ['wolf', 'vaillant']) {
      b.ctx.paApplyBrand(brand);
      vm.runInContext(
        "paData.forEach(d=>{d.kw='A-11/W55: 99 kW';d.specs.push(['Bivalenzpunkt','−11 °C']);})",
        b.ctx
      );
      b.ctx.paRenderCards();
      assert.doesNotMatch(b.nodes.paCards.innerHTML, internal);
      for (const d of vm.runInContext('paData', b.ctx)) {
        b.ctx.paUpdateDetail(d);
        assert.doesNotMatch(
          b.nodes.paSpecsTable.innerHTML + b.nodes.paSpecsSub.textContent,
          internal
        );
      }
    }
    assert.deepEqual(
      b.nodes.foerderWpTyp.options.map((o) => o.textContent),
      Object.values(selected).flat().map(label)
    );
    b.nodes.foerderWpTyp.options.forEach((o) => assert.doesNotMatch(o.textContent, forbidden));
  }
});
test('Pro-JAZ später nur durch Daten ergänzen; aktuell ausschließlich SCOP-Fußnote', async () => {
  const b = browser(ref, mutate);
  await load(b, marked);
  let d = render(b, 'vaillant').details[0];
  assert.doesNotMatch(d.table, /JAZ/);
  b.ctx.paUpdateDetail(d.card);
  assert.equal(b.nodes.paJazFootnote.style.display, 'none');
  assert.equal(b.nodes.paScopFootnote.style.display, 'block');
  vm.runInContext(
    "PA_PRO_TECHNIK['Vaillant VWL 55/7.1 A'].jaz={heizkoerper:'3,01',fussboden:'4,02'}",
    b.ctx
  );
  d = render(b, 'vaillant').details[0];
  assert.match(d.table, /JAZ Heizkörper¹.*3,01/);
  assert.match(d.table, /JAZ Fußbodenheizung¹.*4,02/);
  b.ctx.paUpdateDetail(d.card);
  assert.equal(b.nodes.paJazFootnote.style.display, 'block');
  assert.equal(b.nodes.paScopFootnote.style.display, 'none');
  vm.runInContext("delete PA_PRO_TECHNIK['Vaillant VWL 55/7.1 A'].jaz", b.ctx);
  assert.doesNotMatch(render(b, 'vaillant').details[0].table, /JAZ/);
});
test('Unbekannte Geräte erben weder fremde Technik noch fremdes Bild', () => {
  const b = browser(ref, mutate);
  const d = b.ctx.paDeviceIdentity({ modell: 'Vaillant unbekannt' });
  assert.equal(d.kw, '');
  assert.deepEqual(JSON.parse(JSON.stringify(d.specs)), []);
  assert.equal(d.img, '');
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
