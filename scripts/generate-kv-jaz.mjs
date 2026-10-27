#!/usr/bin/env node
// T1245: lokale BWP-Rohwerte sind die einzige JAZ-Quelle. Keine Netzabfrage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { format, resolveConfig } from 'prettier';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'data/kv-jaz-portfolio.json'), 'utf8'));
const rows = source.werte
  .filter(
    (r) =>
      (r.satz === 'A' && r.system === 'Heizkörper') ||
      (r.satz === 'B' && r.system === 'Fußbodenheizung')
  )
  .map((r) => {
    const wolf = r.geraet.startsWith('Wolf');
    const short = wolf
      ? 'Wolf ' + r.geraet.split(' ')[1].replace('/400V', '')
      : 'Vaillant ' + r.geraet.match(/VWL [\d/.]+/)[0] + ' A';
    const aliases = [r.geraet, short];
    if (!wolf) aliases.push(r.geraet.replace(/ (230V|400V)$/, ''));
    return {
      geraet: String(r.bwp_id),
      heizsystem: r.system === 'Heizkörper' ? 'heizkoerper' : 'fbh',
      wert: Number(r.alle_ergebnisse.jazTotalWithSupplementaryHeater.replace(',', '.')),
      quelle: source.werkzeug + '; ' + source.norm + '; ' + r.response,
      abrufdatum: r.abgerufen_utc,
      alias: [...new Set(aliases)],
      randbedingungen: {
        standort: source.annahmen.standort,
        norm: source.norm,
        vorlauf: r.vorlauf_c,
        ruecklauf: r.ruecklauf_c,
        warmwasserAnteil: source.annahmen.warmwasser_anteil_prozent,
        speicher: source.annahmen.speicher_c,
        gesamtlast: r.gesamtlast_kw,
      },
      kaskade: false,
    };
  });
for (const id of ['5539', '5559'])
  rows
    .filter((r) => r.geraet === id)
    .forEach((r) => (r.alias = r.alias.filter((a) => !/^Wolf CHA-[\d/]+$/.test(a))));
const cascades = {
  'Wolf CHA-16/20': [2],
  'Vaillant VWL 75/8.1 A': [2],
  'Vaillant VWL 105/8.1 A': [2, 3],
  'Vaillant VWL 125/8.1 A': [2],
  'Vaillant VWL 75/7.1 A': [2],
  'Vaillant VWL 115/7.1 A': [2, 3, 4],
};
for (const [base, counts] of Object.entries(cascades))
  for (const count of counts)
    for (const r of rows.filter((r) => r.alias.includes(base))) {
      const alias = count + '× ' + base;
      rows.push({
        ...r,
        geraet: count + 'x:' + r.geraet,
        kaskade: true,
        alias: [
          alias,
          alias + ' (Kaskade)',
          count + 'x ' + base,
          ...(base === 'Wolf CHA-16/20' ? [count + '× Wolf CHA-16'] : []),
        ],
      });
    }
if (rows.filter((r) => !r.kaskade).length !== 30)
  throw new Error('Portfolio-Auswahl muss 30 Originalwerte enthalten.');
for (const r of rows)
  if (!Number.isFinite(r.wert) || r.wert <= 0) throw new Error('JAZ fehlt: ' + r.geraet);
const check = process.argv.includes('--check');
let failed = false;
function write(rel, text) {
  const dest = path.resolve(root, rel);
  if (check) {
    if (fs.readFileSync(dest, 'utf8') !== text) {
      console.error('Veraltet: ' + rel);
      failed = true;
    }
  } else fs.writeFileSync(dest, text);
}
const compact = JSON.stringify(rows);
const block =
  '// BEGIN KV_JAZ_GENERATED\nvar KV_JAZ_SEED = ' + compact + ';\n// END KV_JAZ_GENERATED';
const engine = fs
  .readFileSync(path.join(root, 'apps-script/rechner-backend/kv_engine.gs'), 'utf8')
  .replace(/\/\/ BEGIN KV_JAZ_GENERATED[\s\S]*?\/\/ END KV_JAZ_GENERATED/, () => block);
write('apps-script/rechner-backend/kv_engine.gs', engine);
const sibling = process.argv.find((a) => a.startsWith('--konfigurator='));
if (sibling) {
  const dir = sibling.slice('--konfigurator='.length);
  if (check && fs.readFileSync(path.join(dir, 'kv_engine.js'), 'utf8') !== engine)
    throw new Error('Kerne unterscheiden sich');
  if (!check) fs.writeFileSync(path.join(dir, 'kv_engine.js'), engine);
}
write('api/kv-jaz.json', JSON.stringify(rows, null, 2) + '\n');
const php = fs
  .readFileSync(path.join(root, 'api/rechner-engine.php'), 'utf8')
  .replace(
    /\/\/ BEGIN KV_JAZ_PHP_GENERATED[\s\S]*?\/\/ END KV_JAZ_PHP_GENERATED/,
    () =>
      "// BEGIN KV_JAZ_PHP_GENERATED\nfunction hw_kv_jaz_seed(): array { return json_decode(<<<'KV_JAZ_JSON'\n" +
      compact +
      '\nKV_JAZ_JSON, true, 512, JSON_THROW_ON_ERROR); }\n// END KV_JAZ_PHP_GENERATED'
  );
write('api/rechner-engine.php', php);
const fmt = (n) => n.toFixed(2).replace('.', ',');
const matching = (model, system) =>
  rows.find((r) => r.heizsystem === system && (r.geraet === model || r.alias.includes(model)));
function specs(model, original) {
  return original.map((cell) => {
    if (!cell[0].startsWith('JAZ ')) return cell;
    const r = matching(model, cell[0].includes('Heizkörper') ? 'heizkoerper' : 'fbh');
    if (!r) throw new Error('Preistafel-Gerät nicht zugeordnet: ' + model);
    return [cell[0], fmt(r.wert) + (r.kaskade ? ' je Gerät; projektbezogen prüfen' : '')];
  });
}
const productFile = JSON.parse(fs.readFileSync(path.join(root, 'produkte_HERO.json'), 'utf8'));
for (const item of productFile) item.specs = specs(item.modell, item.specs);
write('produkte_HERO.json', JSON.stringify(productFile, null, 2) + '\n');
const details = Object.fromEntries(
  rows.flatMap((r) =>
    r.alias.map((a) => [
      a,
      {
        gesamtlast: r.randbedingungen.gesamtlast,
        abrufdatum: r.abrufdatum.slice(0, 10),
        kaskade: r.kaskade,
      },
    ])
  )
);
let site = fs.readFileSync(path.join(root, 'js/site.js'), 'utf8');
const ast = parse(site, { ecmaVersion: 'latest', sourceType: 'script' }),
  edits = [];
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'ObjectExpression') {
    const model = node.properties.find(
      (p) => p.key?.name === 'modell' && p.value.type === 'Literal'
    )?.value.value;
    const cells = node.properties.find(
      (p) => p.key?.name === 'specs' && p.value.type === 'ArrayExpression'
    )?.value;
    if (model && cells)
      for (const cell of cells.elements) {
        if (cell?.type !== 'ArrayExpression' || !cell.elements[0]?.value?.startsWith('JAZ '))
          continue;
        const r = matching(
          model,
          cell.elements[0].value.includes('Heizkörper') ? 'heizkoerper' : 'fbh'
        );
        if (!r) throw new Error('Preistafel-Gerät nicht zugeordnet: ' + model);
        edits.push([
          cell.elements[1].start,
          cell.elements[1].end,
          "'" + fmt(r.wert) + (r.kaskade ? ' je Gerät; projektbezogen prüfen' : '') + "'",
        ]);
      }
    for (const prop of node.properties) {
      if (prop.key?.type !== 'Literal' || !/^Vaillant VWL .*\/7\.1 A$/.test(prop.key.value))
        continue;
      const jaz = prop.value.properties.find((p) => p.key?.name === 'jaz')?.value;
      if (jaz)
        for (const p of jaz.properties) {
          const r = matching(prop.key.value, p.key.name === 'heizkoerper' ? 'heizkoerper' : 'fbh');
          edits.push([p.value.start, p.value.end, "'" + fmt(r.wert) + "'"]);
        }
    }
  }
  for (const [key, value] of Object.entries(node))
    if (key !== 'start' && key !== 'end') {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
}
walk(ast);
for (const [a, b, text] of edits.sort((a, b) => b[0] - a[0]))
  site = site.slice(0, a) + text + site.slice(b);
const sitePath = path.join(root, 'js/site.js');
const detailsBlock = await format('const PA_JAZ_GRUNDLAGEN = ' + JSON.stringify(details) + ';', {
  ...(await resolveConfig(sitePath)),
  filepath: sitePath,
});
site = site.replace(
  /\/\/ BEGIN PA_JAZ_GENERATED[\s\S]*?\/\/ END PA_JAZ_GENERATED/,
  () => '// BEGIN PA_JAZ_GENERATED\n' + detailsBlock + '// END PA_JAZ_GENERATED'
);
write('js/site.js', site);
console.log(
  'KV_JAZ: ' +
    rows.length +
    ' Zeilen, 30 Originalwerte; PHP, JS und Preistafel ' +
    (check ? 'geprüft' : 'erzeugt')
);
if (failed) process.exitCode = 1;
