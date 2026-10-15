// GF 14.10.2026: die Website zeigt kein Geraet unter der Website-Mindestdeckung (Treiber website_mindestanteil,
// Rueckfall 0,80), auch nicht ueber die Empfehlungsgrenze des Konfigurators. Beide Website-Kerne gleich.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const php = fs.readFileSync('api/rechner-engine.php', 'utf8');
const gs = fs.readFileSync('apps-script/rechner-backend/Code.gs', 'utf8');

assert.match(
  php,
  /float\|int \$websiteMindestanteil = 0(?:,\n    \?array \$tables = null)?\n\): array/
);
assert.match(php, /&& \$leistung >= \$websiteMindestanteil \* \$auslegung;/);
assert.match(php, /hw_get_num\(\$d, 'website_mindestanteil', 0\.8\)/);
assert.match(gs, /function matchCatalogVarianten_\([^)]*websiteMindestanteil\)/);
assert.match(gs, /&& leistung >= websiteMin \* auslegung;/);
assert.match(gs, /getNum_\(d, 'website_mindestanteil', 0\.8\)/);
console.log(
  'PASS Website-Mindestdeckung: beide Kerne, Treiber website_mindestanteil, Rueckfall 0,80'
);
