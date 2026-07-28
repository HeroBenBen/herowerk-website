import fs from 'node:fs';

const files = ['kostenvergleich-waermepumpe.html', 'anfrage.html'];
const expected = new Map([
  ['rechner_start', []],
  ['wz_step_view', ['schritt']],
  ['wz_step_complete', ['schritt']],
  [
    'wz_ergebnis_erreicht',
    ['eigenanteil_ohne_einkommen', 'quote_ohne_einkommen', 'verbrauch_herkunft'],
  ],
  ['wz_cta_klick', ['position']],
  ['wz_details_geoeffnet', ['bereich']],
  ['wz_angaben_aendern', []],
  ['wz_zeitraum_gewechselt', ['zeitraum']],
  ['lead_handoff_erkannt', ['sitzung']],
  ['lead_abgeschickt', ['sitzung']],
]);
const eventPattern = /gtag\(\s*'event'\s*,\s*'([^']+)'(?:\s*,\s*\{([\s\S]*?)\})?\s*\);/g;
const calls = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(eventPattern)) {
    const body = match[2] || '';
    const parameters = [...body.matchAll(/(?:^|,)\s*([a-z_]+)\s*:/g)].map((item) => item[1]).sort();
    calls.push({ file, name: match[1], parameters, source: match[0] });
  }
}

const errors = [];
if (calls.length !== expected.size)
  errors.push(`Erwartet: ${expected.size} Ereignisaufrufe, gefunden: ${calls.length}.`);

for (const [name, allowed] of expected) {
  const matches = calls.filter((call) => call.name === name);
  if (matches.length !== 1) {
    errors.push(`${name}: erwartet einmal, gefunden ${matches.length}.`);
    continue;
  }
  if (matches[0].parameters.join(',') !== [...allowed].sort().join(',')) {
    errors.push(
      `${name}: Parameter ${matches[0].parameters.join(', ') || 'keine'} statt ${allowed.join(', ') || 'keine'}.`
    );
  }
}

for (const call of calls) {
  if (!expected.has(call.name)) errors.push(`${call.name}: nicht in der Positivliste.`);
  if (/fEink|foerderquote|totalFoerderung|netto|vorteil_eur/i.test(call.source)) {
    errors.push(`${call.name}: verbotener Einkommens- oder Ergebnisparameter in ${call.file}.`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(
  '10 Ereignisaufrufe geprüft, alle Parameter entsprechen der geschlossenen Positivliste.'
);
