const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const vm = require('node:vm');
const { parseDocument, DomUtils } = require('htmlparser2');
const root = path.resolve(__dirname, '../..');
const baseline = '7840681dd2c7eb88b3a53f85c7e2da92fab2c4dc';
const read = (file, ref = '') =>
  ref
    ? cp.execFileSync('git', ['show', ref + ':' + file], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(path.join(root, file), 'utf8');
const internal =
  /\bA\s*[−–-]\s*(?!7\b)\d+(?:[.,]\d+)?\s*\/\s*W\s*\d+|[−–-]\s*11(?:[.,]0)?\s*°|minus\s*(?:11|elf)|Bivalenz|Taktpunkt|Leistungsanteil|Auslegungstemperatur/i;
function element() {
  return {
    dataset: {},
    style: {},
    children: [],
    _text: '',
    set textContent(value) {
      this._text = value;
      this._html = '';
    },
    get textContent() {
      return this._html ? DomUtils.textContent(parseDocument(this._html)) : this._text;
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    before(node) {
      this.wrapper = node;
    },
    closest() {
      return this.wrapper || null;
    },
    replaceChildren(...nodes) {
      this.children = nodes;
      this._html = '';
    },
    append(...nodes) {
      nodes.forEach((node) => this.appendChild(node));
    },
    _html: '',
    value: 'wolf:m',
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild(child) {
      this.children.push(child);
    },
    set innerHTML(value) {
      this._html = value;
      this.children = [];
    },
    get innerHTML() {
      return this._html;
    },
    get options() {
      return this.children.flatMap((g) => g.children);
    },
    get selectedOptions() {
      return this.options.filter((o) => o.value === this.value);
    },
    querySelector(selector) {
      return this.children.find((child) => selector === '.' + child.className) || this;
    },
  };
}
function browser(ref = '', mutate = (s) => s) {
  const nodes = Object.fromEntries(
    [
      'foerderWpTyp',
      'paCards',
      'paSpecsTitle',
      'paSpecsSub',
      'paSpecsTable',
      'paDetailCta',
      'paJazFootnote',
      'paScopFootnote',
      'paDetail',
      'paImg',
    ].map((id) => [id, element()])
  );
  const html = read('preise.html', ref);
  for (const id of ['paJazFootnote', 'paScopFootnote'])
    nodes[id].innerHTML =
      html.match(new RegExp('<div id="' + id + '"[^>]*>([\\s\\S]*?)</div>'))?.[1] || '';
  const image = element();
  const ctx = vm.createContext({
    console: { info() {} },
    document: {
      getElementById: (id) => nodes[id] || null,
      createElement: element,
      querySelector: (selector) => (selector === '.pa-detail-img' ? image : null),
      querySelectorAll: () => Array.from({ length: 5 }, element),
    },
    window: {},
    setTimeout,
    clearTimeout,
    requestAnimationFrame() {},
    RECHNER_API: '/api/rechner',
    foerderMarke: 'wolf',
  });
  const source = mutate(read('js/site.js', ref));
  vm.runInContext(
    source.slice(source.indexOf('let paData = []'), source.indexOf('// Klick außerhalb')),
    ctx
  );
  return { ctx, nodes, image };
}
async function load(b, rows) {
  b.ctx.rechnerFetch = async () =>
    rows
      ? { ok: true, json: async () => JSON.parse(JSON.stringify(rows)) }
      : { ok: false, status: 503 };
  await b.ctx.paLoadData();
}
function render(b, brand) {
  b.ctx.paApplyBrand(brand);
  b.ctx.paRenderCards();
  const cards = vm.runInContext('paData', b.ctx);
  return {
    cardsHtml: b.nodes.paCards.innerHTML,
    details: cards.map((card, i) => {
      vm.runInContext('paOpenIdx = -1', b.ctx);
      b.ctx.paZoom(i);
      return {
        card: JSON.parse(JSON.stringify(card)),
        title: b.nodes.paSpecsTitle.textContent,
        sub: b.nodes.paSpecsSub.textContent,
        table: b.nodes.paSpecsTable.innerHTML,
        cta: b.nodes.paDetailCta.innerHTML,
        image: b.image.innerHTML,
        jazFootnote: b.nodes.paJazFootnote.innerHTML,
        jazDisplay: b.nodes.paJazFootnote.style.display,
      };
    }),
  };
}
// Ausschließlich WR-Freigaben 2 und 6 in historischen Vergleichserwartungen.
function wrExpectedDetail(detail) {
  const out = structuredClone(detail);
  if (!out.card.modell.includes('Vaillant')) return out;
  out.card.specs = out.card.specs.map(([name, value]) => [
    name,
    name === 'Hersteller' ? 'Vaillant GmbH' : value,
  ]);
  out.table = out.table
    .replace('Vaillant Deutschland GmbH & Co. KG', 'Vaillant GmbH')
    .replaceAll('A-7/W35', '<span class="pa-kennwert">A-7/W35</span>');
  return out;
}
module.exports = {
  root,
  baseline,
  read,
  internal,
  browser,
  load,
  render,
  element,
  wrExpectedDetail,
};
