// Ergänzende DOM-Prüfung der echten Renderfunktionen; ersetzt keine Sichtabnahme.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { run, plain } from './t1245-kv-nutzen.mjs';
const html = fs.readFileSync('kostenvergleich-waermepumpe.html', 'utf8');
const blocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const source = blocks.find((s) => s.includes('function kvRender('));
const ast = parse(source, { ecmaVersion: 'latest' });
const functions = ast.body.filter((n) => n.type === 'FunctionDeclaration');
const fields = new Map();
function element(id) {
  if (!fields.has(id)) {
    const classes = new Set();
    fields.set(id, {
      id,
      type: 'number',
      value: '',
      textContent: '',
      innerHTML: '',
      options: [],
      style: {},
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
      },
      setAttribute() {},
      removeAttribute() {},
      addEventListener() {},
      querySelector() {
        return null;
      },
    });
  }
  return fields.get(id);
}
const i = plain(run().inputsEcho);
for (const [id, value] of Object.entries(i)) {
  const e = element(id);
  e.type = typeof value === 'boolean' ? 'checkbox' : 'number';
  if (e.type === 'checkbox') e.checked = value;
  else e.value = value === null ? '' : String(value);
}
const ctx = vm.createContext({
  console,
  URLSearchParams,
  AbortController,
  DOMException,
  Event,
  setTimeout,
  clearTimeout,
  KV_INPUT_IDS: Object.keys(i),
  KV_STATE: { last: null },
  window: {},
  document: {
    getElementById: element,
    querySelector: () => null,
    documentElement: {},
    createElement: () => element('new'),
  },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
});
for (const n of functions)
  if (
    [
      'eur',
      'eurSigned',
      'fix',
      'pct',
      'kvText',
      'kvLine',
      'kvCard',
      'kvMobileCard',
      'kvMobileYearAnswer',
      'kvMobileYearContent',
      'kvMobileYearDetails',
      'kvReadInputs',
      'kvRender',
      'kvSetStatus',
    ].includes(n.id.name)
  )
    vm.runInContext(source.slice(n.start, n.end), ctx);
ctx.renderFoerderTreppe = () => {};
ctx.kvStatusHost = () => element('status');
const r = plain(run({ pvTog: true }));
ctx.kvRender(r, true);
assert.match(
  element('pathSummary').innerHTML,
  /Gas-Grundpreis.*Schornsteinfeger.*Gas-Netzentgeltpfad.*Modul-1-Vorteil.*Photovoltaik.*Bio-Mehrkosten/s
);
assert.match(element('jazGrundlagen').textContent, /55\/45.*18.*50.*7 kW/);
assert.equal(element('results').classList.contains('visible'), true);
assert.equal(ctx.kvReadInputs().get('pvTog'), '0');
element('pvTog').checked = true;
assert.equal(ctx.kvReadInputs().get('pvTog'), '1');
element('wpArbeitspreis').value = '';
assert.equal(ctx.kvReadInputs().has('wpArbeitspreis'), false);
ctx.kvSetStatus(
  'error',
  'Netzentgeltpfad eingeschaltet, aber keine belegte Jahresreihe hinterlegt. Bitte ausschalten.'
);
assert.match(element('status').innerHTML, /keine belegte Jahresreihe/);
assert.equal((html.match(/id="jaz"/g) || []).length, 0);
assert.match(html, /kvEmpfehlung\.has\(id\)/);
for (const script of blocks) new vm.Script(script);
console.log(
  'GRÜN DOM T1245: echte Renderfunktionen, Einzelposten, JAZ-Randbedingungen, Requestwerte und Klartext-Sperre; keine visuelle Abnahme'
);
