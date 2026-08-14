import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const html = fs.readFileSync('dimensionierung.html', 'utf8');
const js = fs.readFileSync('js/site.js', 'utf8');
const css = fs.readFileSync('css/site.css', 'utf8');

const iconParity = spawnSync('node', ['scripts/sync-dimensionierung-icons.mjs', '--check'], {
  encoding: 'utf8',
});
assert.equal(iconParity.status, 0, iconParity.stderr || iconParity.stdout);
assert.match(iconParity.stdout, /26 von 45 Kartensymbolen und 2 Zählersymbole zeichengleich/);

assert.match(html, /id="wzBaujahrModus"[\s\S]*?data-mode="jahr"[\s\S]*?data-mode="spanne"/);
assert.match(html, /id="wzBaujahrEingabe"[^>]*value="1960"[^>]*min="1800"[^>]*max="2026"/);
assert.match(html, /id="wzBaujahrJahr"/);
assert.match(html, /id="wzBaujahrSpanne" hidden/);
assert.match(js, /baujahrModus: 'jahr'/);
assert.match(js, /Eingeordnet als:/);

const renovationTexts = [
  'Steildach mit 5 cm Dämmung',
  'Dämmung im Sparren-Zwischenraum, insgesamt etwa 12 cm',
  'Wie zuvor, plus zusätzliche Dämmlage, insgesamt etwa 30 cm',
  'Holzfenster mit Zweischeiben-Isolierverglasung',
  'Fenster mit Zweischeiben-Wärmeschutzverglasung',
  'Dreischeiben-Wärmeschutzverglasung mit gedämmtem Rahmen',
  'Mauerwerk ohne Dämmung',
  'Dämmung etwa 12 cm mit Verputz, alternativ hinterlüftete Fassade',
  'Dämmung etwa 24 cm mit Verputz',
  'Betondecke mit etwa 1 cm Dämmung',
  'Dämmung etwa 8 cm unter oder auf der Decke',
  'Dämmung etwa 12 cm',
];
for (const text of renovationTexts) assert.ok(js.includes(text), `Sanierungstext fehlt: ${text}`);

assert.ok(!html.includes('wzRhAbsage'), 'Absageblock für das Reihenmittelhaus ist noch vorhanden');
assert.ok(
  !js.includes('wzRhAbsage'),
  'Absageansteuerung für das Reihenmittelhaus ist noch vorhanden'
);
assert.match(js, /rhSel === 'rh-end' \? 'rh-end' : 'rh'/);

for (const id of [
  'wzPersonMinus',
  'wzPersonPlus',
  'wzDuschenMinus',
  'wzDuschenPlus',
  'wzWannenMinus',
  'wzWannenPlus',
]) {
  const button = html.match(new RegExp(`<button[^>]+class="([^"]+)"[^>]+id="${id}"`));
  assert.ok(button, `Zählerknopf fehlt: ${id}`);
  assert.match(
    button[1],
    /\bwz-counter-button\b/,
    `Zählerknopf nutzt nicht die eigene Klasse: ${id}`
  );
  assert.doesNotMatch(
    button[1],
    /\bwizard-btn-(?:back|next)\b/,
    `Zählerknopf nutzt die Navigation: ${id}`
  );
}
assert.match(css, /\.wz-counter-button\s*\{[\s\S]*?width:\s*38px;[\s\S]*?height:\s*38px;/);

const subtitles = [
  'Massives Mauerwerk, meist Vollziegel',
  'Vollziegel, oft schon schlanker gemauert',
  'Sparsame Bauweise, dünnere Außenwände',
  'Hohlblock- und Hochlochziegel, meist ungedämmt',
  'Erste Dämmungen, noch ohne Vorschrift',
  'Erste Dämmvorschrift',
  'Dämmvorschrift nachgeschärft',
  'Wärmeschutz deutlich verschärft',
  'Heutiger Dämmstandard',
];
for (const text of subtitles) assert.ok(html.includes(text), `Baujahresuntertitel fehlt: ${text}`);

console.log('PASS Fassung 7: Erklärtexte, Symbole, Zähler, Baujahre und Reihenmittelhaus');
