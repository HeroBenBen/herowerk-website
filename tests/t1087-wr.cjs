// WR: gemeinsame, deterministische Browser-Antworten und unveränderter Rechenkern.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const base = '40951542b4903adde7cc1e694a96fa81a41a7197';
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/a11-oeffentliche-antworten.json'), 'utf8')
);
const engine = require('../apps-script/rechner-backend/kv_engine.gs');
function responses() {
  const cost = engine.kvCalculate({ ...engine.KV_DEFAULTS }, engine.KV_PARAMS_SEED);
  return structuredClone({
    preise: fixture.preise,
    dimensionierung: fixture.dimensionierung,
    kv_bootstrap: engine.kvBootstrapPayload(engine.KV_PARAMS_SEED),
    kostenvergleich: cost,
    foerderung: {
      preis: 35349,
      zuschussGesamt: 22400,
      eigenanteil: 12949,
      kfwSatz: 80,
      effektivSatz: 63,
      bausteine: ['Grundförderung 30 %', 'Klimabonus 16 %', 'Einkommensbonus 40 %'],
      perioden: [
        { key: 'h2-2026', ab: '2026-07-21', label: 'Juli 2026 – Januar 2027' },
        { key: 'h1-2027', ab: '2027-02-01', label: 'Februar – Juli 2027' },
      ],
      periode: 'h2-2026',
      antragPeriode: 'h2-2026',
      aktivePeriode: 'h2-2026',
      treppe: [
        { periode: 'h2-2026', label: 'Juli 2026 – Januar 2027', betrag: 22400, quote: 80 },
        { periode: 'h1-2027', label: 'Februar – Juli 2027', betrag: 20800, quote: 80 },
      ],
    },
    klima: {},
    fv_plaetze: { belegt: 3, gesamt: 20 },
  });
}
async function serve(ref = '') {
  const cache = new Map();
  const server = http.createServer((req, res) => {
    let file =
      decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
    if (!path.extname(file)) file += '.html';
    if (file.split('/').includes('..') || file.startsWith('api/') || file.startsWith('.')) {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      let body;
      if (ref) {
        if (!cache.has(file))
          cache.set(
            file,
            cp.execFileSync('git', ['show', ref + ':' + file], {
              cwd: root,
              maxBuffer: 30 * 1024 * 1024,
              stdio: ['ignore', 'pipe', 'ignore'],
            })
          );
        body = cache.get(file);
      } else body = fs.readFileSync(path.join(root, file));
      res.setHeader(
        'Content-Type',
        {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.svg': 'image/svg+xml',
          '.woff2': 'font/woff2',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.jpg': 'image/jpeg',
        }[path.extname(file)] || 'application/octet-stream'
      );
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(null)));
  return {
    url: 'http://127.0.0.1:' + /** @type {import('net').AddressInfo} */ (server.address()).port,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
function unchanged() {
  // Gesamte API und Rechentabellen, keine Normalisierung und keine ausgeschlossenen Zahlenfelder.
  const files = cp
    .execFileSync(
      'git',
      [
        'ls-tree',
        '-r',
        '--name-only',
        base,
        'api',
        'apps-script/rechner-backend',
        'tests/fixtures',
      ],
      { cwd: root, encoding: 'utf8' }
    )
    .trim()
    .split('\n');
  for (const file of files)
    assert.deepEqual(
      fs.readFileSync(path.join(root, file)),
      cp.execFileSync('git', ['show', base + ':' + file], {
        cwd: root,
        maxBuffer: 30 * 1024 * 1024,
      }),
      file + ' bytegleich'
    );
  console.log(
    'WR: ' + files.length + ' API-, Rechenkern- und Fixture-Dateien bytegleich zu ' + base
  );
}
async function contracts(ref) {
  const vm = require('node:vm');
  const { parse } = require('acorn');
  const { parseDocument, DomUtils } = require('htmlparser2');
  const { browser, load, render, element, read } = require('./helpers/t1087-datenblatt.cjs');
  const source = read('js/site.js', ref),
    b = browser(ref);
  const text = (html) => DomUtils.textContent(parseDocument(html));
  const result = {};
  await load(b, fixture.preise);
  b.ctx.foerderSelectPackage('vaillant', 'xxl');
  const label = b.nodes.foerderWpTyp.wrapper?.children[1];
  result[1] =
    !!label &&
    label.children.map((n) => n.textContent).join('') ===
      '2× Vaillant aroTHERM plus VWL 125/8.1 A · 85.604 €';
  const view = render(b, 'vaillant');
  result[2] = view.details.every((d) =>
    d.table.includes('<span class="pa-kennwert">A-7/W35</span>')
  );
  const arrow = element();
  b.nodes.paDetailArrow = arrow;
  b.nodes.paDetail.clientWidth = 327;
  b.nodes.paCards.getBoundingClientRect = () => ({ left: 24, width: 327 });
  b.ctx.document.querySelectorAll = () => [
    { getBoundingClientRect: () => ({ left: 650, width: 134 }) },
  ];
  b.ctx.window.matchMedia = () => ({ matches: true });
  b.ctx.paPositionArrow(0);
  result[3] =
    parseFloat(arrow.style.left) + 25 <= 327 &&
    /@media \(max-width: 600px\)[\s\S]*\.pa-detail\.open\s*\{\s*max-height: none/.test(
      read('css/site.css', ref)
    );
  b.nodes.wolfPricePanel = element();
  b.ctx.document.querySelectorAll = () => [];
  b.ctx.paSelectManufacturer('vaillant');
  result[4] = b.nodes.wolfPricePanel['aria-labelledby'] === 'manufacturerVaillant';
  b.nodes.wolfMinEigen = element();
  b.nodes.vaillantMinEigen = element();
  await load(b, fixture.preise);
  await load(b, null);
  result[5] =
    b.nodes.wolfMinEigen.textContent === 'ab … dein Anteil*' &&
    b.nodes.vaillantMinEigen.textContent === 'ab … dein Anteil*';
  result[6] = ['55', '75', '105', '125'].every(
    (n) =>
      b.ctx
        .paDeviceIdentity({ modell: 'Vaillant VWL ' + n + '/8.1 A' })
        .specs.find((s) => s[0] === 'Hersteller')[1] === 'Vaillant GmbH'
  );
  const functions = parse(source, { ecmaVersion: 'latest' }).body.filter(
    (n) => n.type === 'FunctionDeclaration'
  );
  const names = [
    'renderWizServerResult',
    'renderBrandCard',
    'brandLogo',
    'modellZweizeilig',
    'formatKw',
    'formatEuro',
    'paEscapeHtml',
  ];
  const nodes = { wizResultTitle: element(), wizResultSub: element(), wizResultCards: element() };
  const ctx = vm.createContext({
    wizSelectedMarke: 'wolf',
    document: { getElementById: (id) => nodes[id] },
  });
  vm.runInContext(
    functions
      .filter((n) => names.includes(n.id.name))
      .map((n) => source.slice(n.start, n.end))
      .join('\n'),
    ctx
  );
  const payloads = [
    'A&#45;11',
    'A<span>-</span>11',
    'Heizleistung <12 kW bei A<span>&minus;</span>11/W55',
  ];
  const literal = [];
  for (const payload of payloads) {
    const data = structuredClone(fixture.dimensionierung);
    data.strom_hinweis = payload;
    for (const brand of Object.values(data.marken)) {
      brand.modell = payload;
      brand.baureihe = payload;
      for (const v of brand.varianten || []) {
        v.modell = payload;
        v.baureihe = payload;
      }
    }
    ctx.renderWizServerResult(data);
    const doc = parseDocument(nodes.wizResultCards.innerHTML);
    const devices = DomUtils.findAll(
      (n) => n.attribs?.class === 'wiz-variant-device',
      doc.children
    );
    const visible = devices.map((n) => DomUtils.textContent(n));
    literal.push({ input: payload, visible });
    if (!visible.length || !visible.every((v) => v === payload)) continue;
    assert(
      text(ctx.modellZweizeilig(payload)) === payload,
      'unbenutzter Modellhelfer bleibt texttreu'
    );
  }
  result[7] = literal.every(
    (row) => row.visible.length === 2 && row.visible.every((v) => v === row.input)
  );
  return { result, literal };
}
async function apiBytes() {
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-api-'));
  const old = path.join(dir, 'api');
  fs.mkdirSync(old);
  const files = cp
    .execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'api'], {
      cwd: root,
      encoding: 'utf8',
    })
    .trim()
    .split('\n')
    .filter((f) => f.endsWith('.php'));
  for (const file of files)
    fs.writeFileSync(
      path.join(old, path.basename(file)),
      cp.execFileSync('git', ['show', base + ':' + file], { cwd: root })
    );
  const contract = JSON.parse(
    fs.readFileSync(path.join(root, 'tests/fixtures/rechner-snapshot-vertrag.json'), 'utf8')
  );
  const context = JSON.parse(
    fs.readFileSync(path.join(root, 'tests/fixtures/rechner-schema3-rechenkontext.json'), 'utf8')
  );
  const sheets = { ...contract.snapshot.sheets, ...context.sheets };
  for (const brand of ['wolf', 'vaillant']) {
    const name = brand === 'wolf' ? 'Preise_Wolf' : 'Preise_Vaillant';
    const [header, template] = sheets[name];
    sheets[name] = [
      header,
      ...fixture.preise[brand].map((item, index) => {
        const row = [...template];
        for (const [key, value] of Object.entries({
          Klasse: item.klasse,
          Modell: item.modell,
          kW: item.kw,
          Endpreis_brutto: item.brutto,
          Eigenanteil: item.eigen,
          geraet_id: brand + index,
        }))
          row[header.indexOf(key)] = value;
        return row;
      }),
    ];
  }

  const { geraeteKatalogZeilen } = await import('./fixtures/geraete-katalog-2026-08-14.mjs');
  sheets.Geräte_Katalog = [
    ['Vorspann'],
    ['heizstab_wolf', 9],
    ['heizstab_vaillant', 8.54],
    contract.snapshot.sheets.Geräte_Katalog[1],
    ...geraeteKatalogZeilen.map((row, index) => {
      const r = [...row];
      r[33] = 'ja';
      r[38] = 'katalog' + index;
      r[39] = 'lauf-test';
      return r;
    }),
  ];
  const program = `date_default_timezone_set('Europe/Berlin'); require $argv[1].'/rechner-values.php'; require $argv[1].'/rechner-engine.php'; $source=file_get_contents($argv[1].'/rechner.php'); $start=strpos($source,'const RECHNER_INNENFELDER_SPERREN'); $end=strpos($source,'$rawQuery ='); eval(substr($source,$start,$end-$start)); $in=json_decode(stream_get_contents(STDIN),true); $out=hw_rechner_route($in['action'],$in['query'],$in['sheets'],2); if($in['action']==='preise')$out=hw_oeffentliche_preistexte($out); $out=rechner_innenfelder_entfernen($out); echo json_encode($out,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);`;
  let count = 0;
  try {
    /** @type {Array<{action:string, query:Record<string,string>}>} */
    const cases = [
      'preise',
      'dimensionierung',
      'klima',
      'foerderung',
      'kostenvergleich',
      'kv_bootstrap',
      'fv_plaetze',
      'health',
    ].map((action) => ({
      action,
      query: { plz: '30159', verbrauchKnown: 'nein', fHalbjahr: 'h2-2026' },
    }));
    for (const marke of ['wolf', 'vaillant'])
      for (const wpTyp of ['s', 'm', 'l', 'xl', 'xxl'])
        cases.push({
          action: 'foerderung',
          query: {
            marke,
            wpTyp,
            fHalbjahr: 'h2-2026',
            einkommen: 'bis30',
            selbstnutzung: '1',
            wohneinheiten: '1',
          },
        });
    for (const sample of cases) {
      const input = JSON.stringify({ ...sample, sheets });
      const run = (api) =>
        cp.execFileSync('php', ['-r', program, api], { input, stdio: ['pipe', 'pipe', 'pipe'] });
      const before = run(old),
        after = run(path.join(root, 'api'));
      assert.deepEqual(after, before, 'API-Antwortbytes ' + JSON.stringify(sample));
      assert(
        !JSON.parse(after.toString()).error,
        'Kein Fehlerantwort-Platzhalter ' + sample.action
      );
      count++;
    }
    console.log(
      'WR: ' +
        count +
        ' öffentliche Antwortkörper aller action-Routen bytegleich (identische lokale Tabellen; keine entfernten/normalisierten Felder).'
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function verify() {
  unchanged();
  await apiBytes();
  const red = await contracts(base),
    green = await contracts('');
  for (let i = 1; i <= 7; i++) {
    assert.equal(red.result[i], false, 'P' + i + ' muss an der Baubasis rot sein');
    assert.equal(green.result[i], true, 'P' + i + ' muss am Bau grün sein');
    console.log('P' + i + ': Basis ROT / Bau GRÜN (DOM/Funktion; Geometrie zusätzlich im Browser)');
  }
  console.log(JSON.stringify({ basis: base, rot: red, gruen: green }, null, 2));
}

if (require.main === module)
  verify().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
module.exports = { base, root, responses, serve, unchanged };
