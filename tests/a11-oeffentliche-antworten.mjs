// Echte PHP-HTTP-Grenze, eingefrorene Basis und isolierte Gegenproben. Keine Netz-/Blattwrites.
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { decodeHTML } from 'entities';
import { Parser } from 'htmlparser2';
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
const nachauftragBasis = 'e359ec7d28d462cd97ae6af78c4e262a40182d4d';
const nachauftrag4Basis = 'd67c975a4c92ab2bc6951a1497e24f21f166506d';
const nachauftrag3Basis = '5188c99c3005fb0a27d9482b924a8fba4c94fb3d';
const nachauftrag2Basis = '2abe040f235b4fe50212518f599e0946b46da364';
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
// Unabhängiges Prüforakel: zuerst Zeichen normalisieren, dann ohne Wortgrenze suchen.
const forbidden = /A-11(?![0-9])/;
const normalized = (v) =>
  v
    .replace(/[\p{Dash_Punctuation}\u2212]/gu, '-')
    .replace(/\s/gu, '')
    .toUpperCase();
// Eigenständiges Orakel mit JavaScript-HTML-Parser, ohne Produktfunktion.
function normalizedHTML(v) {
  let text = '';
  const parser = new Parser(
    {
      ontext: (part) => {
        text += part;
      },
    },
    { decodeEntities: false }
  );
  parser.end(v);
  return normalized(decodeHTML(text));
}
const errorContract = { error: true, message: 'calculator_temporarily_unavailable' };
const quote = (s) => "'" + s.replaceAll('\\', '\\\\').replaceAll("'", "\\'") + "'";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function clean(v) {
  if (typeof v === 'string') {
    assert.doesNotMatch(normalized(v), forbidden);
    assert.doesNotMatch(normalized(decodeHTML(v)), forbidden);
    assert.doesNotMatch(normalizedHTML(v), forbidden);
  }
  if (Array.isArray(v)) v.forEach(clean);
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) {
      assert.notEqual(k, 'leistung_kw');
      assert(!k.toLowerCase().startsWith('puffer'), 'Öffentliches Pufferfeld: ' + k);
      assert.doesNotMatch(normalized(k), forbidden);
      assert.doesNotMatch(normalized(decodeHTML(k)), forbidden);
      assert.doesNotMatch(normalizedHTML(k), forbidden);
      clean(x);
    }
}
function withoutPower(v) {
  if (Array.isArray(v)) return v.map(withoutPower);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .filter(([k]) => k !== 'leistung_kw' && k !== 'puffer')
        .map(([k, x]) => [k, withoutPower(x)])
    );
  return v;
}
// Bewahrt Zahlenschreibweise und Schlüsselreihenfolge des tatsächlichen JSON-Bodys.
function withoutPowerRaw(raw) {
  const tokens = raw.match(/"(?:[^"\\]|\\.)*"|[^\s{}\[\],:]+|[{}\[\],:]/g);
  let i = 0;
  function value() {
    const token = tokens[i++];
    if (token !== '{' && token !== '[') return token;
    const end = token === '{' ? '}' : ']';
    const entries = [];
    while (tokens[i] !== end) {
      if (entries.length || tokens[i] === ',') {
        if (tokens[i] === ',') i++;
      }
      if (token === '{') {
        const key = tokens[i++];
        assert.equal(tokens[i++], ':');
        const item = value();
        if (!['leistung_kw', 'puffer'].includes(JSON.parse(key))) entries.push(key + ':' + item);
      } else entries.push(value());
    }
    i++;
    return token + entries.join(',') + end;
  }
  const out = value();
  assert.equal(i, tokens.length);
  assert.deepEqual(JSON.parse(out), withoutPower(JSON.parse(raw)));
  return out;
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
    let source = ['basis', 'prior', 'prior2', 'prior3', 'prior4'].includes(mode)
      ? execFileSync(
          'git',
          [
            'show',
            (mode === 'prior4'
              ? nachauftrag4Basis
              : mode === 'prior3'
                ? nachauftrag3Basis
                : mode === 'prior2'
                  ? nachauftrag2Basis
                  : mode === 'prior'
                    ? nachauftragBasis
                    : basis) +
              ':api/' +
              file,
          ],
          { cwd: repo, encoding: 'utf8' }
        )
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
      if (mode.startsWith('fassung-sabotage-')) {
        const index = Number(mode.at(-1));
        const forms = [
          '$text',
          "html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8')",
          "html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8')",
        ];
        const begin = source.indexOf('    $prueftexte = ');
        const end = source.indexOf(';', begin);
        assert(begin > 0 && end > begin);
        source =
          source.slice(0, begin) +
          '    $prueftexte = [' +
          forms.filter((_, i) => i !== index).join(', ') +
          ']' +
          source.slice(end);
      }
      if (mode === 'html-sabotage') {
        const oldSource = execFileSync('git', ['show', nachauftrag3Basis + ':api/rechner.php'], {
          cwd: repo,
          encoding: 'utf8',
        });
        const begin = 'function rechner_a11_text(string $text): bool';
        const end = '/** Nur reine Texte/Textlisten';
        source =
          source.slice(0, source.indexOf(begin)) +
          oldSource.slice(oldSource.indexOf(begin), oldSource.indexOf(end)) +
          source.slice(source.indexOf(end));
      }
      if (mode === 'reihenfolge-sabotage') {
        const needle = "    return $pfad === '$' ? rechner_a11_rest_bereinigen($wert) : $wert;";
        assert(source.includes(needle));
        source = source
          .replace(needle, '    return $wert;')
          .replace(
            '    if (is_array($wert)) {\n        $gefiltert = [];',
            () =>
              "    if ($pfad === '$') $wert = rechner_a11_rest_bereinigen($wert);\n    if (is_array($wert)) {\n        $gefiltert = [];"
          );
      }
      if (mode === 'puffer-sabotage')
        source = source
          .replace("    'puffer',\n", '')
          .replace("str_starts_with(strtolower($schluessel), 'puffer')", 'false');
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
  await fs.writeFile(
    path.join(dir, 'router.php'),
    `<?php require __DIR__.'/website/api/rechner.php';`
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
      path.join(dir, 'router.php'),
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
  const response = await fetch(
    s.url + (options.route || '/api/rechner.php') + '?' + new URLSearchParams(query),
    {
      method: options.method || 'GET',
      headers: { Origin: options.origin || 'https://www.herowerk.de' },
    }
  );
  const raw = await response.text();
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(raw + '\n' + s.log.slice(-1500));
  }
  return { status: response.status, value, raw };
}
async function inject(s, value, action = 'health', route = '/api/rechner.php') {
  await fs.writeFile(path.join(s.dir, 'override.json'), JSON.stringify(value));
  return request(s, { action }, { route });
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
  const routes = ['/api/rechner', '/api/rechner/', '/api/rechner.php'];
  const failures = [];
  const checked = async (name, run) => {
    try {
      await run();
    } catch (error) {
      failures.push({ name, error: error.message });
    }
  };
  const buffer = {
    bezeichnung: 'VPS 300/3-5',
    liter: 303,
    groessere_variante: 'VPS 500/3-5, 491 l',
    ohne_puffer_moeglich: false,
  };
  const bufferInput = {
    wolf: [],
    vaillant: [],
    puffer: buffer,
    puffer_typ: 'VPS',
    marken: {
      vaillant: {
        modell: 'VWL',
        brutto: 29944,
        eigenanteil: 7544,
        tafel: 'ja',
        puffer: buffer,
        varianten: [{ puffer: buffer, PufferLiter: 303, anzahl: 1 }],
      },
    },
  };
  const bufferExpected = {
    wolf: [],
    vaillant: [],
    marken: {
      vaillant: {
        modell: 'VWL',
        brutto: 29944,
        eigenanteil: 7544,
        tafel: 'ja',
        varianten: [{ anzahl: 1 }],
      },
    },
  };
  const prior = await start('prior');
  const googleProbe = await start('forward');
  for (const version of [2, 3]) {
    const data = seal(snapshot(version));
    await put(current, data);
    await put(prior, data);
    for (const route of routes) {
      for (const action of actions) {
        await checked(`Puffer/Schema ${version}/${route}/${action}`, async () => {
          const r = await inject(current, bufferInput, action, route);
          assert.equal(r.status, 200);
          assert.deepEqual(r.value, bufferExpected);
          clean(r.value);
        });
        await checked(`A11/Schema ${version}/${route}/${action}`, async () => {
          mustFail(await inject(current, { modell: 'Typ_A-11/W35' }, action, route));
          mustFail(await inject(current, { 'leistung_A-11_W55': 9.5 }, action, route));
        });
      }
      for (const text of [
        '_A-11/W35',
        'Typ_A-11/W55',
        'A‑11/W35',
        'A−11/W55',
        'A  -  11 / W 35',
        'A	-	11/W55',
      ]) {
        await checked(`Schreibweise/${version}/${route}/${text}`, async () => {
          const r = await inject(current, { kw: text, nat: -11 }, 'health', route);
          assert.equal(r.status, 200);
          assert.deepEqual(r.value, { nat: -11 });
          mustFail(await inject(current, { modell: text }, 'health', route));
          mustFail(await inject(current, { [text]: 9.5 }, 'health', route));
        });
      }
    }
    await fs.rm(path.join(current.dir, 'override.json'), { force: true });
    // Prüferfall direkt im Tabellenwert, ohne Antwort-Hook.
    const contaminated = structuredClone(data);
    contaminated.sheets.Preise_Wolf[1][3] = 'Heizleistung_A-11/W35: 6,6 kW';
    await put(current, seal(contaminated));
    await put(prior, seal(contaminated));
    await checked(`Tabellenwert/Schema ${version}`, async () => {
      const a = await request(current, { action: 'preise' }),
        b = await request(prior, { action: 'preise' });
      assert.equal(b.value.wolf[0].kw, 'Heizleistung_A-11/W35: 6,6 kW');
      delete b.value.wolf[0].kw;
      assert.equal(a.status, 200);
      assert.deepEqual(a.value, b.value);
      clean(a.value);
    });
    await put(current, data);
    await put(prior, data);
    for (const action of actions)
      await checked(`Bytegleich/e359ec7/${version}/${action}`, async () => {
        const query = {
          action,
          flaeche: '150',
          plz: '00000',
          baujahr: '1978-1994',
          heizsystem: 'heizkoerper',
        };
        const a = await request(current, query),
          b = await request(prior, query);
        assert.equal(a.status, b.status);
        // Keine Rundung und keine Umsortierung im Vergleich.
        assert.equal(a.raw, withoutPowerRaw(b.raw));
        clean(a.value);
        if (process.env.A11_RESPONSE_DIR) {
          await fs.mkdir(process.env.A11_RESPONSE_DIR, { recursive: true });
          for (const [label, response] of [
            ['vorher', b],
            ['nachher', a],
          ])
            await fs.writeFile(
              path.join(
                process.env.A11_RESPONSE_DIR,
                `${label}-${version}-${action || 'ohne'}.json`
              ),
              response.raw
            );
        }
      });
  }
  for (const route of routes)
    for (const action of actions) {
      await checked(`Google/Puffer/${route}/${action}`, async () => {
        await fs.writeFile(
          path.join(googleProbe.dir, 'upstream.json'),
          JSON.stringify(bufferInput)
        );
        const r = await request(googleProbe, { action }, { route });
        assert.equal(r.status, 200);
        assert.deepEqual(r.value, bufferExpected);
        clean(r.value);
      });
      for (const extra of [{ modell: 'Typ_A-11/W55' }, { 'leistung_A-11_W55': 9.5 }])
        await checked(`Google/A11/${route}/${action}/${Object.keys(extra)}`, async () => {
          await fs.writeFile(
            path.join(googleProbe.dir, 'upstream.json'),
            JSON.stringify({ wolf: [], vaillant: [], ...extra })
          );
          mustFail(await request(googleProbe, { action }, { route }));
        });
    }
  console.log('Nachauftrag 1 Befunde: ' + JSON.stringify(failures));
  assert.equal(failures.length, 0, 'Nachauftrag 1: Restprüfung, Puffer und Bytegleichheit');
  ok(
    'Nachauftrag 1: alle Aktionen und URL-Wege, Schema 2/3, Google, Prüferfälle und Bytegleichheit zu e359ec7'
  );
  const prior2 = await start('prior2');
  const failures2 = [];
  const checked2 = async (name, run) => {
    try {
      await run();
    } catch (error) {
      failures2.push({ name, error: error.message });
    }
  };
  const internalForms = ['A-11/W35', 'Typ_A-11/W55', 'A‑11/W35', 'A−11/W55', 'A  -  11 / W55'];
  const baselinePublic = {
    wolf: [],
    vaillant: [],
    modell: 'VWL',
    brutto: 29944.0123456789,
    eigenanteil: 7544,
    tafel: 'ja',
    kaskade: true,
    anzahl: 2,
    varianten: [{ modell: 'VWL', brutto: 48815 }],
  };
  const inside = (text) => [
    { puffer: { bezeichnung: text } },
    { puffer: { liter: text } },
    { puffer: { groessere_variante: text } },
    { puffer: text },
    { puffer_A11: { modell: text } },
    { ['puffer_' + text]: 303 },
    { leistung_kw: text },
    { leistung_kw: { modell: text } },
    { bivalenzpunkt_c: { modell: text } },
    {
      varianten: [
        {
          modell: 'VWL',
          brutto: 48815,
          puffer: { bezeichnung: text, liter: text, groessere_variante: text },
          leistung_kw: text,
        },
      ],
    },
  ];
  for (const version of [2, 3]) {
    const data = seal(snapshot(version));
    await put(current, data);
    await put(prior2, data);
    for (const route of routes)
      for (const action of actions) {
        for (const server of [current, googleProbe]) {
          const send = async (payload) => {
            if (server === current) return inject(server, payload, action, route);
            await fs.writeFile(path.join(server.dir, 'upstream.json'), JSON.stringify(payload));
            return request(server, { action }, { route });
          };
          await checked2(
            `Innenfelder/${version}/${server === current ? 'PHP' : 'Google'}/${route}/${action}`,
            async () => {
              const normal = await send(baselinePublic);
              assert.equal(normal.status, 200);
              for (const extra of inside(
                internalForms[(version + actions.indexOf(action)) % internalForms.length]
              )) {
                const result = await send({ ...baselinePublic, ...extra });
                assert.equal(result.status, 200);
                assert.equal(result.raw, normal.raw);
                clean(result.value);
              }
              for (const field of [
                'modell',
                'brutto',
                'eigen',
                'eigenanteil',
                'zuschussGesamt',
                'tafel',
              ])
                mustFail(
                  await send({
                    ...baselinePublic,
                    puffer: { bezeichnung: 'Speicher für A-11/W55' },
                    [field]: 'Typ_A-11/W35',
                  })
                );
              mustFail(
                await send({
                  ...baselinePublic,
                  puffer: 'A-11/W55',
                  hinweis: { modell: 'Typ_A-11/W35' },
                })
              );
              const hint = await send({
                ...baselinePublic,
                puffer: 'A-11/W55',
                hinweis: 'A-11/W35',
              });
              assert.equal(hint.status, 200);
              assert.equal(hint.raw, normal.raw);
            }
          );
        }
      }
    await fs.rm(path.join(current.dir, 'override.json'), { force: true });
    const query = {
      action: 'dimensionierung',
      flaeche: '150',
      baujahr: '1978-1994',
      heizsystem: 'heizkoerper',
      warmwasser: 'ja',
      personen: '4',
      plz: '00000',
    };
    await checked2(`Katalogzelle U/${version}`, async () => {
      const normal = await request(current, query),
        original = await request(prior2, query);
      assert.equal(normal.status, 200);
      assert.equal(normal.raw, original.raw);
      const changed = structuredClone(data);
      const row = changed.sheets['Geräte_Katalog'].find(
        (row) => row[1] === normal.value.marken.vaillant.modell
      );
      assert(row && row.length > 20);
      row[20] = 'Speicher für A-11/W55';
      const sealed = seal(changed);
      await put(current, sealed);
      await put(prior2, sealed);
      const oldFailure = await request(prior2, query);
      mustFail(oldFailure);
      const result = await request(current, query);
      assert.equal(result.status, 200);
      assert.equal(result.raw, normal.raw);
      clean(result.value);
      const core = (snapshot) =>
        JSON.parse(
          execFileSync('php', [...current.phpOptions, path.join(current.dir, 'core.php')], {
            input: JSON.stringify({ snapshot, query }),
            encoding: 'utf8',
            env: snapshotTestEnvironment(),
          })
        ).dimensionierung;
      const before = core(data),
        after = core(sealed);
      assert.equal(after.marken.vaillant.puffer.bezeichnung, 'Speicher für A-11/W55');
      const removeBuffer = (v) =>
        Array.isArray(v)
          ? v.map(removeBuffer)
          : v && typeof v === 'object'
            ? Object.fromEntries(
                Object.entries(v)
                  .filter(([key]) => key !== 'puffer')
                  .map(([key, value]) => [key, removeBuffer(value)])
              )
            : v;
      assert.deepEqual(removeBuffer(before), removeBuffer(after));
      if (process.env.A11_RESPONSE_DIR) {
        await fs.mkdir(process.env.A11_RESPONSE_DIR, { recursive: true });
        for (const [label, response] of [
          ['unbelastet', normal],
          ['alter-fehler', oldFailure],
          ['belastet', result],
        ])
          await fs.writeFile(
            path.join(process.env.A11_RESPONSE_DIR, `na2-${label}-${version}.json`),
            response.raw
          );
      }
    });
    await put(current, data);
    await put(prior2, data);
    for (const action of actions)
      await checked2(`Bytegleich/2abe040/${version}/${action}`, async () => {
        const a = await request(current, { ...query, action }),
          b = await request(prior2, { ...query, action });
        assert.equal(a.status, 200);
        assert.equal(a.raw, b.raw);
        if (process.env.A11_RESPONSE_DIR) {
          await fs.mkdir(process.env.A11_RESPONSE_DIR, { recursive: true });
          for (const [label, response] of [
            ['vorher', b],
            ['nachher', a],
          ])
            await fs.writeFile(
              path.join(
                process.env.A11_RESPONSE_DIR,
                `na2-${label}-${version}-${action || 'ohne'}.json`
              ),
              response.raw
            );
        }
      });
  }
  console.log('Nachauftrag 2 Befunde: ' + JSON.stringify(failures2));
  assert.equal(
    failures2.length,
    0,
    'Nachauftrag 2: interne Texte dürfen öffentliche Antworten nicht sperren'
  );
  ok(
    'Nachauftrag 2: Innenfelder zuerst, gemischte Fehlerfälle, Katalogzelle und 22 unveränderte Antworten zu 2abe040'
  );

  const htmlForms = ['A&#45;11/W55', 'A&#x2D;11/W55', 'A&minus;11/W55', 'A<span>-</span>11/W55'];
  const previousTest = execFileSync(
    'git',
    ['show', nachauftrag3Basis + ':tests/a11-oeffentliche-antworten.mjs'],
    { cwd: repo, encoding: 'utf8' }
  );
  const oldOracle =
    previousTest.slice(
      previousTest.indexOf('const forbidden ='),
      previousTest.indexOf('const errorContract =')
    ) +
    previousTest.slice(
      previousTest.indexOf('function clean('),
      previousTest.indexOf('function withoutPower(')
    );
  for (const text of htmlForms) {
    const payload = { marken: { vaillant: { modell: 'VWL (' + text + ': 12 kW)' } } };
    assert.doesNotThrow(() => runInNewContext(oldOracle + 'clean(payload);', { assert, payload }));
    assert.throws(() => clean(payload), assert.AssertionError);
    assert.throws(() => clean({ [text]: 12 }), assert.AssertionError);
  }
  ok(
    'Nachauftrag 3: altes Orakel akzeptiert vier HTML-Lecks, unabhängiges neues Orakel lehnt Werte und Schlüssel ab'
  );
  const prior3 = await start('prior3');
  const failures3 = [];
  const checked3 = async (name, run) => {
    try {
      await run();
    } catch (error) {
      failures3.push({ name, error: error.message });
    }
  };
  const publicBase = {
    wolf: [],
    vaillant: [],
    modell: 'VWL',
    brutto: 29944.0123456789,
    eigenanteil: 7544,
    tafel: 'ja',
  };
  const export3 = async (name, result) => {
    if (!process.env.A11_RESPONSE_DIR) return;
    await fs.mkdir(process.env.A11_RESPONSE_DIR, { recursive: true });
    await fs.writeFile(
      path.join(process.env.A11_RESPONSE_DIR, 'na3-' + name + '.json'),
      result.raw
    );
  };
  for (const version of [2, 3]) {
    const data = seal(snapshot(version));
    await put(current, data);
    await put(prior3, data);
    for (const route of routes)
      for (const action of actions)
        for (const server of [current, googleProbe]) {
          const send = async (payload) => {
            if (server === current) return inject(server, payload, action, route);
            await fs.writeFile(path.join(server.dir, 'upstream.json'), JSON.stringify(payload));
            return request(server, { action }, { route });
          };
          const name = `${version}/${server === current ? 'PHP' : 'Google'}/${route}/${action}`;
          for (const text of htmlForms)
            await checked3(`HTML/${name}/${text}`, async () => {
              for (const field of ['modell', 'brutto', 'eigenanteil', 'zuschussGesamt', 'tafel'])
                mustFail(await send({ ...publicBase, [field]: text }));
              mustFail(await send({ ...publicBase, [text]: 12 }));
              mustFail(await send({ ...publicBase, varianten: [{ modell: text }] }));
              mustFail(await send({ ...publicBase, hinweis: { modell: text } }));
              const normal = await send(publicBase);
              assert.equal(normal.status, 200);
              for (const field of ['kw', 'hinweis', 'beschreibung']) {
                const result = await send({ ...publicBase, [field]: [text] });
                assert.equal(result.status, 200);
                assert.equal(result.raw, normal.raw);
                clean(result.value);
              }
              const internal = await send({
                ...publicBase,
                puffer: { bezeichnung: text },
                leistung_kw: text,
              });
              assert.equal(internal.status, 200);
              assert.equal(internal.raw, normal.raw);
            });
          await checked3(`Zulässig/${name}`, async () => {
            const safe = {
              ...publicBase,
              nat: -11,
              brutto: 1234,
              ortsklima: '&#45;11',
              klimaText: '<span>-</span>11',
              kw: 'A&#45;7/W35',
              beschreibung: 'A&#x2D;110',
              info: 'A&minus;7/W35',
              detail: 'A<span>-</span>110',
              'A&#45;110': 'zulässig',
            };
            const result = await send(safe);
            assert.equal(result.status, 200);
            assert.deepEqual(result.value, safe);
            clean(result.value);
          });
        }
    await fs.rm(path.join(current.dir, 'override.json'), { force: true });
    const query = {
      action: 'dimensionierung',
      flaeche: '150',
      baujahr: '1978-1994',
      heizsystem: 'heizkoerper',
      warmwasser: 'ja',
      personen: '4',
      plz: '00000',
    };
    for (const [index, text] of htmlForms.entries())
      await checked3(`Katalogmodell/${version}/${index}`, async () => {
        await put(current, data);
        await put(prior3, data);
        const normal = await request(prior3, query);
        assert.equal(normal.status, 200);
        const changed = structuredClone(data);
        const row = changed.sheets['Geräte_Katalog'].find(
          (row) => row[1] === normal.value.marken.vaillant.modell
        );
        assert(row);
        row[1] += ' (' + text + ': 12 kW)';
        const sealed = seal(changed);
        await put(current, sealed);
        await put(prior3, sealed);
        const before = await request(prior3, query),
          after = await request(current, query);
        assert.equal(before.status, 200);
        assert.throws(() => clean(before.value), assert.AssertionError);
        await export3(`html-vorher-${version}-${index}`, before);
        await export3(`html-nachher-${version}-${index}`, after);
        mustFail(after);
      });
    await put(current, data);
    await put(prior3, data);
    for (const action of actions)
      await checked3(`Bytegleich/5188c99/${version}/${action}`, async () => {
        const before = await request(prior3, { ...query, action }),
          after = await request(current, { ...query, action });
        assert.equal(before.status, 200);
        assert.equal(after.status, 200);
        assert.equal(after.raw, before.raw);
        clean(after.value);
        await export3(`vorher-${version}-${action || 'ohne'}`, before);
        await export3(`nachher-${version}-${action || 'ohne'}`, after);
      });
  }
  console.log('Nachauftrag 3 Befunde: ' + JSON.stringify(failures3));
  assert.equal(
    failures3.length,
    0,
    'Nachauftrag 3: HTML-Schreibweisen an allen öffentlichen Ausgabewegen'
  );
  ok(
    'Nachauftrag 3: vier HTML-Fälle, zulässige Gegenfälle, Katalogmodell und 22 bytegleiche Antworten zu 5188c99'
  );
  const htmlSabotage = await start('html-sabotage');
  await put(htmlSabotage, snapshot(2));
  for (const text of htmlForms) {
    const leak = await inject(htmlSabotage, { modell: text });
    assert.equal(leak.status, 200);
    assert.throws(() => clean(leak.value), assert.AssertionError);
    mustFail(await inject(htmlSabotage, { modell: 'A-11/W55' }));
  }
  ok(
    'Nachauftrag 3: ausschließlich HTML-Normalisierung ausgeschaltet, vier Lecks wieder rot; Klartextschutz erhalten'
  );

  // Nachauftrag 4: jede Form und jedes Feld separat, auch bei mehreren Befunden.
  const prior4 = await start('prior4');
  const failures4 = [];
  const checked4 = async (name, run) => {
    try {
      await run();
    } catch (error) {
      failures4.push({ name, error: error.message });
    }
  };
  const newHTMLForms = ['Heizleistung &lt;12 kW bei A&minus;11/W55', '&lt;A&minus;11/W55&gt;'];
  const witnesses = [
    'A-11&#48;/W55',
    'Heizleistung <12 kW bei A&minus;11/W55',
    'A<span>-</span>11/W55',
  ];
  const allHTMLForms = [...newHTMLForms, ...htmlForms, ...witnesses.slice(0, 2)];
  const previous4Test = execFileSync(
    'git',
    ['show', nachauftrag4Basis + ':tests/a11-oeffentliche-antworten.mjs'],
    { cwd: repo, encoding: 'utf8' }
  );
  const old4Oracle =
    previous4Test.slice(
      previous4Test.indexOf('const forbidden ='),
      previous4Test.indexOf('const errorContract =')
    ) +
    previous4Test.slice(
      previous4Test.indexOf('function clean('),
      previous4Test.indexOf('function withoutPower(')
    );
  assert.doesNotThrow(() =>
    runInNewContext(old4Oracle + 'clean(payload);', {
      assert,
      Parser,
      decodeHTML,
      payload: { modell: newHTMLForms[1] },
    })
  );
  for (const text of allHTMLForms) {
    assert.throws(() => clean({ modell: text }), assert.AssertionError);
    assert.throws(() => clean({ [text]: 12 }), assert.AssertionError);
  }
  ok(
    'Nachauftrag 4: unabhängiges Orakel prüft drei Fassungen, alte Winkelklammerlücke nachgewiesen'
  );
  const export4 = async (name, result) => {
    if (!process.env.A11_RESPONSE_DIR) return;
    await fs.mkdir(process.env.A11_RESPONSE_DIR, { recursive: true });
    await fs.writeFile(
      path.join(process.env.A11_RESPONSE_DIR, 'na4-' + name + '.json'),
      result.raw
    );
  };
  for (const version of [2, 3]) {
    const data = seal(snapshot(version));
    await put(current, data);
    await put(prior4, data);
    for (const route of routes)
      for (const action of actions)
        for (const server of [current, googleProbe]) {
          const send = async (payload) => {
            if (server === current) return inject(server, payload, action, route);
            await fs.writeFile(path.join(server.dir, 'upstream.json'), JSON.stringify(payload));
            return request(server, { action }, { route });
          };
          const name = `${version}/${server === current ? 'PHP' : 'Google'}/${route}/${action}`;
          const normal = await send(publicBase);
          assert.equal(normal.status, 200);
          for (const text of allHTMLForms) {
            for (const field of ['modell', 'brutto', 'eigenanteil', 'zuschussGesamt', 'tafel'])
              await checked4(`${name}/${text}/${field}`, async () =>
                mustFail(await send({ ...publicBase, [field]: text }))
              );
            await checked4(`${name}/${text}/Feldname`, async () =>
              mustFail(await send({ ...publicBase, [text]: 12 }))
            );
            await checked4(`${name}/${text}/Variante`, async () =>
              mustFail(await send({ ...publicBase, varianten: [{ modell: text }] }))
            );
            for (const field of ['kw', 'hinweis', 'beschreibung'])
              for (const value of [text, [text]])
                await checked4(
                  `${name}/${text}/${field}/${Array.isArray(value) ? 'Liste' : 'Text'}`,
                  async () => {
                    const result = await send({ ...publicBase, [field]: value });
                    assert.equal(result.status, 200);
                    assert.equal(result.raw, normal.raw);
                    clean(result.value);
                  }
                );
            await checked4(`${name}/${text}/Innenfelder`, async () => {
              const result = await send({
                ...publicBase,
                puffer: { bezeichnung: text },
                leistung_kw: text,
              });
              assert.equal(result.status, 200);
              assert.equal(result.raw, normal.raw);
            });
          }
          for (const text of [
            'nat: -11',
            'A-7/W35',
            'A-110',
            'nat: &minus;11',
            'A&#45;7/W35',
            'A&#x2D;110',
            '&lt;nat: &minus;11&gt;',
            '&lt;A&minus;7/W35&gt;',
            '&lt;A&minus;110&gt;',
            'Heizleistung &lt;12 kW bei A&minus;7/W35',
          ])
            await checked4(`${name}/Zulässig/${text}`, async () => {
              const safe = {
                wolf: [],
                vaillant: [],
                modell: text,
                kw: text,
                hinweis: text,
                nat: -11,
                [text]: 'zulässig',
              };
              const result = await send(safe);
              assert.equal(result.status, 200);
              assert.deepEqual(result.value, safe);
              clean(result.value);
            });
        }
    await fs.rm(path.join(current.dir, 'override.json'), { force: true });
    const query = {
      action: 'dimensionierung',
      flaeche: '150',
      baujahr: '1978-1994',
      heizsystem: 'heizkoerper',
      warmwasser: 'ja',
      personen: '4',
      plz: '00000',
    };
    for (const [index, text] of newHTMLForms.entries()) {
      await checked4(`Katalogmodell/${version}/${index}`, async () => {
        await put(prior4, data);
        const normal = await request(prior4, query);
        assert.equal(normal.status, 200);
        const changed = structuredClone(data);
        const row = changed.sheets['Geräte_Katalog'].find(
          (row) => row[1] === normal.value.marken.vaillant.modell
        );
        assert(row);
        row[1] += ' (' + text + ')';
        const sealed = seal(changed);
        await put(current, sealed);
        await put(prior4, sealed);
        const before = await request(prior4, query),
          after = await request(current, query);
        assert.equal(before.status, 200);
        assert.throws(() => clean(before.value), assert.AssertionError);
        await export4(`html-vorher-${version}-${index}`, before);
        await export4(`html-nachher-${version}-${index}`, after);
        mustFail(after);
      });
      await checked4(`Preisblatt/${version}/${index}`, async () => {
        const changed = structuredClone(data);
        const rows = changed.sheets.Preise_Wolf;
        rows[1][rows[0].indexOf('kW')] = text;
        const sealed = seal(changed);
        await put(current, sealed);
        await put(prior4, sealed);
        const before = await request(prior4, { action: 'preise' }),
          after = await request(current, { action: 'preise' });
        assert.equal(before.status, 200);
        assert.equal(after.status, 200);
        assert.equal(before.value.wolf[0].kw, text);
        const expected = structuredClone(before.value);
        delete expected.wolf[0].kw;
        assert.deepEqual(after.value, expected);
        clean(after.value);
      });
    }
    await put(current, data);
    await put(prior4, data);
    for (const action of actions)
      await checked4(`Bytegleich/d67c975/${version}/${action}`, async () => {
        const before = await request(prior4, { ...query, action }),
          after = await request(current, { ...query, action });
        assert.equal(before.status, 200);
        assert.equal(after.status, 200);
        assert.equal(after.raw, before.raw);
        clean(after.value);
        await export4(`vorher-${version}-${action || 'ohne'}`, before);
        await export4(`nachher-${version}-${action || 'ohne'}`, after);
      });
  }
  console.log('Nachauftrag 4 Befunde: ' + JSON.stringify(failures4));
  assert.equal(
    failures4.length,
    0,
    'Nachauftrag 4: drei Fassungen schließen kodierte Kleinerzeichen ein'
  );
  ok(
    'Nachauftrag 4: HTML-Felder einzeln, Gegenfälle, direkte Katalog-/Preisblattproben und 22 bytegleiche Antworten zu d67c975'
  );
  for (const [index, text] of witnesses.entries()) {
    const sabotaged = await start('fassung-sabotage-' + index);
    await put(sabotaged, snapshot(2));
    const leak = await inject(sabotaged, { modell: text });
    assert.equal(leak.status, 200);
    assert.throws(() => {
      mustFail(leak);
    }, assert.AssertionError);
    assert.throws(() => clean(leak.value), assert.AssertionError);
    mustFail(await inject(current, { modell: text }));
    for (const [other, witness] of witnesses.entries())
      if (other !== index) mustFail(await inject(sabotaged, { modell: witness }));
    ok(
      `Nachauftrag 4: Fassung ${index + 1} allein aus, Zeuge rot, beide übrigen Fassungen wirksam`
    );
  }

  const orderSabotage = await start('reihenfolge-sabotage');
  await put(orderSabotage, snapshot(2));
  mustFail(
    await inject(orderSabotage, {
      ...baselinePublic,
      puffer: { bezeichnung: 'Speicher für A-11/W55' },
    })
  );
  const scalar = await inject(current, 'Typ_A-11/W35');
  mustFail(scalar);
  await fs.rm(path.join(current.dir, 'override.json'), { force: true });
  ok(
    'Nachauftrag 2: alte Reihenfolge verwirft wieder interne Puffertexte; verbleibende skalare Texte weiter geschützt'
  );
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
    '_A-11/W35',
    'Typ_A-11/W55',
    'A\u201111/W35',
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
  // Nachauftrag 2: hinweise ist selbst ein Innenfeld; die öffentliche Gegenprobe bleibt streng.
  const internalHints = await inject(current, { hinweise: [{ modell: 'A-11/W55' }] });
  assert.equal(internalHints.status, 200);
  assert.deepEqual(internalHints.value, []);
  mustFail(await inject(current, { hinweis: [{ modell: 'A-11/W55' }] }));
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
  const forward = googleProbe;
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
  const bufferSabotage = await start('puffer-sabotage');
  for (const version of [2, 3]) {
    await put(bufferSabotage, seal(snapshot(version)));
    for (const route of routes)
      for (const action of actions) {
        const r = await inject(bufferSabotage, bufferInput, action, route);
        assert.equal(r.status, 200);
        assert.deepEqual(r.value, bufferInput);
        assert.throws(() => clean(r.value), /Öffentliches Pufferfeld/);
      }
    mustFail(await inject(bufferSabotage, { modell: 'Typ_A-11/W35' }));
  }
  ok(
    'Rotgegenprobe: nur Pufferentfernung ausgeschaltet, alle Aktionen/Wege rot, A11-Schutz weiter aktiv'
  );
  const compareSource = await fs.readFile(
    path.join(repo, 'scripts/compare-rechner-php.mjs'),
    'utf8'
  );
  const compare = new Function(
    compareSource.slice(
      compareSource.indexOf('function withoutInternalFields'),
      compareSource.indexOf('async function fetchWithTimeout')
    ) + '; return { publicGoogleShape, firstDifference };'
  )();
  const original = {
    puffer: buffer,
    leistung_kw: 8,
    puffer_unbekannt: 'bleibt im Vergleich',
    varianten: [{ puffer: buffer, leistung_kw: 12, brutto: 29944.0123456789, tafel: 'ja' }],
  };
  const wanted = {
    puffer_unbekannt: 'bleibt im Vergleich',
    varianten: [{ brutto: 29944.0123456789, tafel: 'ja' }],
  };
  assert.deepEqual(compare.publicGoogleShape('dimensionierung', original), wanted);
  assert.equal(compare.firstDifference(wanted, wanted), null);
  for (const field of ['brutto', 'tafel']) {
    const changed = structuredClone(wanted);
    changed.varianten[0][field] = 'abweichend';
    assert(compare.firstDifference(wanted, changed));
  }
  ok(
    'Google-Vergleich: ausschließlich zwei Innenfelder projiziert, Wert- und Markerabweichungen weiter rot'
  );
  const sabotage = await start('sabotage');
  await put(sabotage, snapshot(2));
  for (const payload of [
    { kw: 'A-11/W55' },
    { leistung_kw: 18.9 },
    { modell: 'A-11/W35' },
    { puffer: { liter: 303 } },
    { puffer_typ: 'VPS' },
  ]) {
    const r = await inject(sabotage, payload);
    assert.throws(() => clean(r.value));
    assert.equal(r.status, 200); // Der fehlende Schutz muss auch den erwarteten 503-Vertrag verletzen.
  }
  ok('Rotgegenprobe: ausgeschalteter Schutz lässt Auslegung, Innenleistung und Puffer durch');
  console.log(`A11 GRÜN: ${assertions} Prüfgruppen einschließlich vollständiger Kernvergleiche.`);
} finally {
  for (const s of servers) {
    s.child.kill('SIGTERM');
    await fs.writeFile(path.join(s.dir, 'server.log'), s.log);
  }
  if (process.env.A11_KEEP_ARTIFACTS === '1') console.log('A11-Belege: ' + root);
  else await fs.rm(root, { recursive: true, force: true });
}
