// Rein lesend: vor Blattwrite mit --soll, danach gegen den neuen PHP-Abzug ohne --soll.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export function pruefeSmBruecke(input, soll = false) {
  const sheets = structuredClone(input.sheets || input);
  const models = {
    Preise_Vaillant: [
      'Vaillant VWL 55/7.1 A',
      'Vaillant VWL 75/7.1 A',
      'Vaillant VWL 115/7.1 A',
      'Vaillant VWL 125/8.1 A',
      '2× Vaillant VWL 125/8.1 A',
    ],
    Preise_Wolf: [
      'Wolf CHA-07',
      'Wolf CHA-10',
      'Wolf CHA-16/20',
      'Wolf CHA-20/24',
      '2× Wolf CHA-16',
    ],
  };
  const classes = ['s', 'm', 'l', 'xl', 'xxl'];
  const proof = [];
  for (const [name, expected] of Object.entries(models)) {
    const table = sheets[name];
    assert.ok(Array.isArray(table), 'Fehlendes Blatt ' + name);
    assert.equal(table[0][0], 'Klasse');
    assert.equal(table[0][1], 'Modell');
    assert.equal(table[0][4], 'Endpreis_brutto');
    assert.equal(table[0][5], 'Eigenanteil');
    if (soll) {
      assert.ok(
        table.every((row) => !row[17]),
        name + ': R ist bereits belegt'
      );
      table[0][17] = 'tafel';
      for (let i = 1; i < table.length; i++)
        table[i][17] = expected.includes(table[i][1]) ? 'ja' : '';
      if (name === 'Preise_Vaillant') {
        for (let i = 0; i < 3; i++) {
          assert.equal(table[i + 6][1], expected[i], name + ': Zielzeile verschoben');
          table[i + 6][4] = table[i + 1][4];
          table[i + 6][5] = table[i + 1][5];
        }
      }
    }
    assert.equal(table[0][17], 'tafel', name + '!R1 fehlt im Abzug');
    for (const row of table.slice(1))
      assert.ok(['', 'ja'].includes(row[17] || ''), name + ': ungültiger Marker');
    for (const [i, klasse] of classes.entries()) {
      const candidates = table
        .map((row, index) => ({ row, index }))
        .slice(1)
        .filter(
          ({ row }) =>
            String(row[0] || '')
              .trim()
              .toLowerCase() === klasse
        );
      const marked = candidates.filter(({ row }) => row[17] === 'ja');
      assert.equal(marked.length, 1, name + ': Markeranzahl ' + klasse);
      const chosen = marked[0];
      assert.equal(
        chosen.index,
        // Die noch unveränderte Apps-Script-Version verwendet kein trim().
        candidates.filter(({ row }) => String(row[0] || '').toLowerCase() === klasse).at(-1)?.index,
        name + ': markierte Zeile ist nicht letzter Klassentreffer ' + klasse
      );
      assert.equal(chosen.row[1], expected[i], name + ': falsches Gerät ' + klasse);
      const ref = table[i + 1];
      assert.ok(
        Number.isFinite(chosen.row[4]) && chosen.row[4] > 0,
        name + ': Brutto nicht numerisch'
      );
      assert.ok(Number.isFinite(chosen.row[5]), name + ': Eigenanteil nicht numerisch');
      assert.equal(chosen.row[4], ref[4], name + ': Brutto weicht ab ' + klasse);
      assert.equal(chosen.row[5], ref[5], name + ': Eigenanteil weicht ab ' + klasse);
      proof.push({
        blatt: name,
        klasse,
        zeile: chosen.index + 1,
        modell: chosen.row[1],
        brutto: chosen.row[4],
        eigen: chosen.row[5],
      });
    }
    assert.equal(
      table.slice(1).filter((r) => r[17] === 'ja').length,
      classes.length,
      name + ': zusätzliche Markierung'
    );
  }
  return {
    modus: soll ? 'lokaler Sollzustand, kein Write' : 'gelesener Abzug',
    bruecke: true,
    zeilen: proof,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv.slice(2).find((a) => a !== '--soll');
  if (!file) throw new Error('Aufruf: node scripts/verify-t1087-bruecke.mjs <Abzug.json> [--soll]');
  console.log(
    JSON.stringify(
      pruefeSmBruecke(JSON.parse(fs.readFileSync(file, 'utf8')), process.argv.includes('--soll')),
      null,
      2
    )
  );
}
