const fs = require('node:fs');
const path = require('node:path');
const index = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/jaz-bwp/index.json'), 'utf8')
);
const values = Object.fromEntries(
  index.values.map((v) => [v.device.match(/VWL (\d+\/[\d.]+)/)[1] + ':' + v.system, v.value])
);
function expectedJaz(model) {
  const id = model.match(/VWL (\d+\/[\d.]+)/)?.[1];
  if (!values[id + ':Heizkörper']) return null;
  const suffix = model.startsWith('2×') ? ' je Gerät; projektbezogen prüfen' : '';
  return [
    ['JAZ Heizkörper¹', values[id + ':Heizkörper'] + suffix],
    ['JAZ Fußbodenheizung¹', values[id + ':Fußbodenheizung'] + suffix],
  ];
}
const footnote =
  '¹ JAZ = Jahresarbeitszahl. Beispielrechnung mit dem BWP-JAZ-Rechner nach VDI 4650 Blatt 1 für einen Altbau in Hannover. Heizkörper: Vorlauf/Rücklauf 55/45 °C; Fußbodenheizung: Vorlauf/Rücklauf 35/30 °C. Warmwasserbereitung durch die Wärmepumpe; einschließlich erforderlichem elektrischem Zusatzheizer. Individuelle Anlagenwerte können abweichen.';
const plain = (html) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
module.exports = { index, expectedJaz, footnote, plain };
