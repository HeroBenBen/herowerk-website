const fs = require('node:fs');
const path = require('node:path');
const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/t1087-preise.json'), 'utf8')
);
const clone = (v) => JSON.parse(JSON.stringify(v));
const keys = ['s', 'm', 'l', 'xl', 'xxl'];
const marked = {
  wolf: raw.wolf.map((r) => ({ ...r, tafel: 'ja' })),
  vaillant: raw.vaillant.map((r, i) => ({
    ...r,
    ...(i >= 5 ? { brutto: raw.vaillant[i - 5].brutto, eigen: raw.vaillant[i - 5].eigen } : {}),
    tafel: i >= 3 ? 'ja' : '',
  })),
};
const selected = Object.fromEntries(
  Object.entries(marked).map(([brand, rows]) => [
    brand,
    keys.map((key) => rows.find((r) => r.klasse === key && r.tafel === 'ja')),
  ])
);
// Modellkennung /7.1 ist erlaubt. Betriebspunkte mit anderen Temperaturen/Minuszeichen nicht.
const forbidden = /\bk\s*w\b|\bW\s*[+−–-]?\s*\d+(?:[.,]\d+)?\b|\bA\s*[+−–-]\s*\d+(?:[.,]\d+)?\b/i;
const conditioned =
  /SCOP|JAZ|VDI\s*4650|EN\s*14825|\bA\s*[+−–-]?\s*\d+(?:[.,]\d+)?\s*\/\s*W\s*\d+|\bW\s*\d+/i;
function model(row) {
  return row.modell.includes('Vaillant')
    ? row.modell.replace(
        'Vaillant ',
        'Vaillant aroTHERM ' + (row.modell.includes('/7.1') ? 'pro ' : 'plus ')
      )
    : row.modell;
}
function label(row) {
  return model(row) + ' · ' + row.brutto.toLocaleString('de-DE') + ' €';
}

module.exports = { raw, clone, keys, marked, selected, forbidden, conditioned, model, label };
