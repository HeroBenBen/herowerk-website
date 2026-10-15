// Echte PHP-HTTP-Grenze, eingefrorene Basis und isolierte Gegenproben. Keine Netz-/Blattwrites.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { snapshotTestEnvironment } from './helpers/snapshot-isolation.mjs';
import { geraeteKatalogZeilen } from './fixtures/geraete-katalog-2026-08-14.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const basis = '99a95ae9b386dd76763e60577b9cde6172c27598';
const fixture = JSON.parse(
  await fs.readFile(path.join(repo, 'tests/fixtures/a11-oeffentliche-antworten.json'), 'utf8')
);
const contract = JSON.parse(
  await fs.readFile(path.join(repo, 'tests/fixtures/rechner-snapshot-vertrag.json'), 'utf8')
);
const context = JSON.parse(
  await fs.readFile(path.join(repo, 'tests/fixtures/rechner-schema3-rechenkontext.json'), 'utf8')
);
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'a11-http-'));
const servers = [];
let assertions = 0;
const ok = (name) => {
  assertions++;
  console.log('PASS ' + name);
};
const forbidden = /\bA\s*[-−–—]\s*11\b/i;
const errorContract = { error: true, message: 'calculator_temporarily_unavailable' };
const quote = (s) => "'" + s.replaceAll('\\', '\\\\').replaceAll("'", "\\'") + "'";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function clean(v) {
  if (typeof v === 'string') assert.doesNotMatch(v, forbidden);
  if (Array.isArray(v)) v.forEach(clean);
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) {
      assert.notEqual(k, 'leistung_kw');
      assert.doesNotMatch(k, forbidden);
      clean(x);
    }
}
function withoutPower(v) {
  if (Array.isArray(v)) return v.map(withoutPower);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .filter(([k]) => k !== 'leistung_kw')
        .map(([k, x]) => [k, withoutPower(x)])
    );
  return v;
}
function expectedPrices(v) {
  const out = structuredClone(v);
  for (const row of out.vaillant)
    if (fixture.herstellerwerte[row.modell]) row.kw = fixture.herstellerwerte[row.modell];
  return out;
}
function snapshot(version, marked = true) {
  const out = structuredClone(contract.snapshot);
  Object.assign(out.sheets, context.sheets);
  out.schemaVersion = version;
  for (const brand of ['wolf', 'vaillant']) {
    const name = brand === 'wolf' ? 'Preise_Wolf' : 'Preise_Vaillant';
    const [head, template] = out.sheets[name];
    out.sheets[name] = [
      head,
      ...fixture.preise[brand].map((p, i) => {
        const row = [...template];
        for (const [key, value] of Object.entries({
          Klasse: p.klasse,
          Modell: p.modell,
          kW: p.kw,
          Endpreis_brutto: p.brutto,
          Eigenanteil: p.eigen,
          geraet_id: brand + i,
        }))
          row[head.indexOf(key)] = value;
        return row;
      }),
    ];
    if (!marked) out.sheets[name] = out.sheets[name].map((r) => r.slice(0, 17));
  }
  const header = contract.snapshot.sheets.Geräte_Katalog[1];
  out.sheets.Geräte_Katalog = [
    ['Vorspann'],
    ['heizstab_wolf', 9],
    ['heizstab_vaillant', 8.54],
    header,
    ...geraeteKatalogZeilen.map((row, i) => {
      const r = [...row];
      r[33] = 'ja';
      r[38] = 'katalog' + i;
      r[39] = 'lauf-test';
      return r;
    }),
  ];
  if (version === 2) delete out.sheets.Referenz_Laeufe;
  return out;
}
function seal(s) {
  if (s.schemaVersion !== 3) return s;
  return JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import sys,json\nsys.path.insert(0,${JSON.stringify(path.join(repo, 'tests'))})\nfrom helpers.snapshot_contract import seal\ns=json.load(sys.stdin)\nc=json.load(open(${JSON.stringify(path.join(repo, 'tests/fixtures/rechner-snapshot-vertrag.json'))}))\nseal(s,c)\nprint(json.dumps(s,ensure_ascii=False))`,
      ],
      { input: JSON.stringify(s), encoding: 'utf8' }
    )
  );
}
async function start(mode) {
  const dir = path.join(root, mode),
    api = path.join(dir, 'website/api'),
    runtime = path.join(dir, 'rechner-runtime');
  await fs.mkdir(api, { recursive: true });
  await fs.mkdir(runtime, { recursive: true });
  for (const file of await fs.readdir(path.join(repo, 'api'))) {
    if (!file.endsWith('.php')) continue;
    let source =
      mode === 'basis'
        ? execFileSync('git', ['show', basis + ':api/' + file], { cwd: repo, encoding: 'utf8' })
        : await fs.readFile(path.join(repo, 'api', file), 'utf8');
    if (file === 'rechner-values.php') {
      // Kein echter Transport, auch nicht beim Nachlauf eines absichtlich alten Abzugs.
      const start = source.indexOf('function rechner_curl_get('),
        end = source.indexOf('\n/**', start);
      assert(start > 0 && end > start);
      source =
        source.slice(0, start) +
        `function rechner_curl_get(string $url, int $timeoutSeconds): array { return ['body'=>file_get_contents(${quote(path.join(dir, 'upstream.json'))}), 'status'=>200, 'errno'=>0, 'error'=>'']; }\n` +
        source.slice(end);
    }
    if (file === 'rechner.php') {
      if (mode === 'forward')
        source = source.replace(
          'const RECHNER_PHP_ENGINE_ENABLED = true;',
          'const RECHNER_PHP_ENGINE_ENABLED = false;'
        );
      if (mode === 'sabotage')
        source = source.replace(
          'const RECHNER_INNENFELDER_SPERREN = true;',
          'const RECHNER_INNENFELDER_SPERREN = false;'
        );
      const needle =
        "$result = hw_rechner_route($action, $_GET, $snapshot['sheets'], $snapshot['schemaVersion']);";
      assert(source.includes(needle));
      source = source.replace(
        needle,
        needle +
          `\nif (is_file(${quote(path.join(dir, 'override.json'))})) { $result = json_decode(file_get_contents(${quote(path.join(dir, 'override.json'))}), true, 512, JSON_THROW_ON_ERROR); }`
      );
    }
    await fs.writeFile(path.join(api, file), source);
  }
  await fs.writeFile(
    path.join(runtime, 'rechner-config.json'),
    JSON.stringify({ apps_script_url: 'http://127.0.0.1:1/isoliert' })
  );
  await fs.writeFile(path.join(runtime, 'werte_snapshot_key.txt'), 'UNECHTER-A11-TESTSCHLUESSEL');
  await fs.writeFile(
    path.join(dir, 'core.php'),
    `<?php date_default_timezone_set('Europe/Berlin'); require __DIR__.'/website/api/rechner-values.php'; require __DIR__.'/website/api/rechner-engine.php'; $in=json_decode(stream_get_contents(STDIN),true); $s=rechner_validate_snapshot(json_encode($in['snapshot'])); $tables=$s['schemaVersion']===3 ? rechner_schema3_tabellen_aufloesen($s['sheets']) : null; echo rechner_json_encode_verlustfrei(['dimensionierung'=>hw_dimensionierung($in['query'],$s['sheets'],$tables), 'wolf'=>hw_read_price_table($s['sheets'],'Preise_Wolf',$tables), 'vaillant'=>hw_read_price_table($s['sheets'],'Preise_Vaillant',$tables), 'anker'=>hw_get_prices($s['sheets'],'vaillant',$tables), 'katalog'=>hw_get_catalog($s['sheets'],$tables)], JSON_THROW_ON_ERROR);`
  );
  const socket = net.createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const phpOptions = [
    '-d',
    'open_basedir=' + dir,
    '-d',
    'include_path=' + dir,
    '-d',
    'disable_functions=mail',
    '-d',
    'sendmail_path=/usr/bin/false',
  ];
  const child = spawn(
    'php',
    [
      ...phpOptions,
      '-d',
      'serialize_precision=4',
      '-S',
      '127.0.0.1:' + port,
      '-t',
      path.join(dir, 'website'),
    ],
    { env: snapshotTestEnvironment() }
  );
  const server = { dir, runtime, child, url: 'http://127.0.0.1:' + port, log: '', phpOptions };
  servers.push(server);
  child.stdout.on('data', (v) => {
    server.log += v;
  });
  child.stderr.on('data', (v) => {
    server.log += v;
  });
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(server.url + '/absichtlich-fehlt');
      return server;
    } catch {
      await delay(30);
    }
  }
  throw new Error('Prüfserver fehlt: ' + server.log);
}
async function put(s, value) {
  await fs.writeFile(path.join(s.runtime, 'werte_snapshot.json'), JSON.stringify(value));
  await fs.writeFile(path.join(s.dir, 'upstream.json'), JSON.stringify(value));
}
async function request(s, query = {}, options = {}) {
  if (!options.keepRate)
    await fs.rm(path.join(s.runtime, 'rate-limit'), { recursive: true, force: true });
  const response = await fetch(s.url + '/api/rechner.php?' + new URLSearchParams(query), {
    method: options.method || 'GET',
    headers: { Origin: options.origin || 'https://www.herowerk.de' },
  });
  const raw = await response.text();
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(raw + '\n' + s.log.slice(-1500));
  }
  return { status: response.status, value, raw };
}
async function inject(s, value, action = 'health') {
  await fs.writeFile(path.join(s.dir, 'override.json'), JSON.stringify(value));
  return request(s, { action });
}
function mustFail(r) {
  assert.equal(r.status, 503);
  assert.deepEqual(r.value, errorContract);
  clean(r.value);
}

try {
  const current = await start('current'),
    old = await start('basis');
  const actions = [
    'preise',
    'dimensionierung',
    'klima',
    'foerderung',
    'kostenvergleich',
    'kv_bootstrap',
    'fv_plaetze',
    'health',
    'werte_snapshot',
    'unbekannt',
    '',
  ];
  for (const version of [2, 3]) {
    const data = seal(snapshot(version));
    await put(current, data);
    await put(old, data);
    for (const action of actions) {
      const q = {
        action,
        flaeche: '150',
        baujahr: '1978-1994',
        heizsystem: 'heizkoerper',
        plz: '00000',
        preis: '29944',
      };
      const [a, b] = await Promise.all([request(current, q), request(old, q)]);
      assert.equal(a.status, 200, JSON.stringify(a));
      assert.equal(b.status, 200, JSON.stringify(b));
      clean(a.value);
      assert.deepEqual(
        a.value,
        action === 'preise' ? expectedPrices(b.value) : withoutPower(b.value)
      );
      ok(`Schema ${version}/${action || 'ohne Aktion'}: nur erlaubte Differenzen`);
    }
    for (const flaeche of [60, 150, 420, 800])
      for (const heizsystem of ['heizkoerper', 'fussboden'])
        for (const plz of ['30159', '00000']) {
          const query = {
            action: 'dimensionierung',
            flaeche: String(flaeche),
            heizsystem,
            plz,
            baujahr: '1978-1994',
            warmwasser: 'ja',
            personen: '4',
          };
          const a = await request(current, query),
            b = await request(old, query);
          assert.equal(a.status, 200);
          clean(a.value);
          assert.deepEqual(a.value, withoutPower(b.value));
          const core = (s) =>
            JSON.parse(
              execFileSync('php', [...s.phpOptions, path.join(s.dir, 'core.php')], {
                input: JSON.stringify({ snapshot: data, query }),
                encoding: 'utf8',
                env: snapshotTestEnvironment(),
              })
            );
          assert.deepEqual(core(current), core(old));
        }
    ok(`Schema ${version}: 16 Dimensionierungsfälle, vollständiger Kern und interne Leser gleich`);
    const precise = structuredClone(data);
    precise.sheets.Preise_Wolf[1][4] = 30026.0123456789;
    await put(current, seal(precise));
    await put(old, seal(precise));
    assert.deepEqual(
      (await request(current, { action: 'preise' })).value,
      expectedPrices((await request(old, { action: 'preise' })).value)
    );
    ok(`Schema ${version}: Preispräzision bleibt erhalten`);
    await put(current, data);
    await fs.utimes(
      path.join(current.runtime, 'werte_snapshot.json'),
      new Date(Date.now() - 4000000),
      new Date(Date.now() - 4000000)
    );
    clean((await request(current, { action: 'preise' })).value);
    await request(current, { action: 'health' }); // Vor dem nächsten Fixture-Write den Nachlauf abschließen lassen.
    ok(`Schema ${version}: gültiger Cachealtstand bereinigt`);
  }
  for (const marked of [true, false]) {
    const data = snapshot(2, marked);
    // Die Leistung folgt dem Modell, auch wenn S und L vertauscht und Zeilen umgeordnet sind.
    const rows = data.sheets.Preise_Vaillant;
    [rows[3][0], rows[5][0]] = [rows[5][0], rows[3][0]];
    rows.splice(1, rows.length - 1, ...rows.slice(1).reverse());
    await put(current, data);
    await put(old, data);
    assert.deepEqual(
      (await request(current, { action: 'preise' })).value,
      expectedPrices((await request(old, { action: 'preise' })).value)
    );
    ok(`Modellbindung bei vertauschten Klassen und Zeilen, Marker ${marked}`);
  }
  const unknown = snapshot(2);
  unknown.sheets.Preise_Vaillant[3][1] = 'Vaillant unbekanntes Modell';
  await put(current, unknown);
  await put(old, unknown);
  const unknownExpected = expectedPrices((await request(old, { action: 'preise' })).value);
  delete unknownExpected.vaillant[2].kw;
  const unknownActual = await request(current, { action: 'preise' });
  assert.equal(unknownActual.status, 200);
  assert.deepEqual(unknownActual.value, unknownExpected);
  clean(unknownActual.value);
  ok('Unbekanntes Modell: nur kw fehlt, Preise und Marker identisch');
  await put(current, snapshot(2));
  const forms = [
    'A-11/W35',
    'A-11/W55',
    'a − 11 / W 55',
    'A – 11/W35',
    'A—11/W55',
    'A\u00a0−\u00a011 / W35',
  ];
  const texts = [
    'kw',
    'hinweis',
    'hinweise',
    'beschreibung',
    'beschreibungen',
    'description',
    'descriptions',
    'strom_hinweis',
    'antragHinweis',
    'installHinweis',
  ];
  const carrying = [
    'modell',
    'brutto',
    'eigen',
    'eigenanteil',
    'tafel',
    'zuschussGesamt',
    'anzeigeBetrag',
    'unbekannteBedeutung',
  ];
  for (const action of actions) {
    for (const field of texts) {
      const original = {
        nat: -11,
        marken: {
          vaillant: {
            modell: 'Unbekannt',
            brutto: 29944,
            eigen: 7544,
            tafel: 'ja',
            [field]: '4 kW (' + forms[assertions % forms.length] + ')',
          },
        },
      };
      const wanted = structuredClone(original);
      delete wanted.marken.vaillant[field];
      const r = await inject(current, original, action);
      assert.equal(r.status, 200);
      assert.deepEqual(r.value, wanted);
      clean(r.value);
      ok(`${action || 'ohne Aktion'}/${field}: Feld fehlt, Rest unverändert`);
    }
    for (const field of carrying)
      mustFail(
        await inject(
          current,
          { marken: { vaillant: { varianten: [{ [field]: forms[assertions % forms.length] }] } } },
          action
        )
      );
    ok(`${action || 'ohne Aktion'}: alle acht tragenden/unsicheren Felder neutral abgewiesen`);
    const r = await inject(
      current,
      {
        marken: { wolf: { leistung_kw: 17.9, varianten: [{ leistung_kw: 18.9, brutto: 40000 }] } },
      },
      action
    );
    assert.equal(r.status, 200);
    assert.deepEqual(r.value, { marken: { wolf: { varianten: [{ brutto: 40000 }] } } });
  }
  for (const form of forms) {
    const r = await inject(current, { kw: form, nat: -11 });
    assert.equal(r.status, 200);
    assert.deepEqual(r.value, { nat: -11 });
    mustFail(await inject(current, { modell: form }));
  }
  assert.deepEqual((await inject(current, { kw: 'A-11, interner Wert', brutto: 1 })).value, {
    brutto: 1,
  });
  mustFail(
    await inject(
      current,
      { wolf: [], vaillant: [{ modell: 'Vaillant VWL 55/7.1 A', kw: { modell: 'A-11/W55' } }] },
      'preise'
    )
  );
  mustFail(await inject(current, { hinweise: [{ modell: 'A-11/W55' }] }));
  mustFail(await inject(current, { 'A-11/W35': 'Text' }));
  const list = await inject(current, { beschreibung: ['gut', ['A-11/W35']], brutto: 12 });
  assert.deepEqual(list.value, { brutto: 12 });
  const safe = {
    kw: 'A-7/W35: 4,84 kW',
    beschreibung: 'sicher',
    nat: -11,
    bedarf: 11,
    modell: 'VWL 115/7.1 A',
    info: 'A-110',
  };
  assert.deepEqual((await inject(current, safe)).value, safe);
  assert.match(current.log, /public_field_removed/);
  assert.match(current.log, /internal_power/);
  assert.match(current.log, /a11_text/);
  ok('Unicode, Textlisten, tragende Verschachtelung, Schlüssel und serverseitige Protokollierung');
  await fs.rm(path.join(current.dir, 'override.json'));
  assert.equal((await request(current, {}, { method: 'POST' })).status, 405);
  assert.equal((await request(current, {}, { origin: 'https://fremd.example' })).status, 403);
  await fs.rm(path.join(current.runtime, 'rate-limit'), { recursive: true, force: true });
  let rate;
  for (let i = 0; i < 61; i++)
    rate = await request(current, { action: 'health' }, { keepRate: true });
  assert.equal(rate.status, 429);
  clean(rate.value);
  ok('Methode, Herkunft und echte Ratenbegrenzung erhalten');
  const forward = await start('forward');
  for (const payload of [
    fixture.preise,
    { vaillant: [{ modell: 'unbekannt', kw: 'A-11/W55', brutto: 1 }], wolf: [] },
  ]) {
    await fs.writeFile(path.join(forward.dir, 'upstream.json'), JSON.stringify(payload));
    const r = await request(forward, { action: 'preise' });
    assert.equal(r.status, 200);
    clean(r.value);
    const want = expectedPrices(payload);
    if (want.vaillant[0]?.modell === 'unbekannt') delete want.vaillant[0].kw;
    assert.deepEqual(r.value, want);
  }
  for (const payload of [
    '{kaputt',
    'null',
    '[]',
    '{"wolf":[],"vaillant":[null]}',
    JSON.stringify({
      wolf: [],
      vaillant: [{ modell: 'Vaillant VWL 55/7.1 A', kw: { modell: 'A-11/W55' } }],
    }),
    '{"modell":"A-11/W55"}',
  ]) {
    await fs.writeFile(path.join(forward.dir, 'upstream.json'), payload);
    mustFail(
      await request(forward, { action: payload.includes('vaillant') ? 'preise' : 'health' })
    );
  }
  ok(
    'Deaktivierter Google-Zweig: Projektion, Entfernung, unsichere Form und tragende Fehler geprüft'
  );
  const sabotage = await start('sabotage');
  await put(sabotage, snapshot(2));
  for (const payload of [{ kw: 'A-11/W55' }, { leistung_kw: 18.9 }, { modell: 'A-11/W35' }]) {
    const r = await inject(sabotage, payload);
    assert.throws(() => clean(r.value));
    assert.equal(r.status, 200); // Der fehlende Schutz muss auch den erwarteten 503-Vertrag verletzen.
  }
  ok('Rotgegenprobe: ausgeschalteter Schutz lässt alle drei Fehlerarten durch');
  console.log(`A11 GRÜN: ${assertions} Prüfgruppen einschließlich vollständiger Kernvergleiche.`);
} finally {
  for (const s of servers) {
    s.child.kill('SIGTERM');
    await fs.writeFile(path.join(s.dir, 'server.log'), s.log);
  }
  if (process.env.A11_KEEP_ARTIFACTS === '1') console.log('A11-Belege: ' + root);
  else await fs.rm(root, { recursive: true, force: true });
}
