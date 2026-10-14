"""Kanonische Identität: gleicher Hashtext muss dieselbe Verbraucheridentität bedeuten."""
import copy
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from helpers.snapshot_contract import canonical, seal

REPO = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get('P3A_RESULT_SOURCE', REPO))
ROOT = Path(tempfile.mkdtemp(prefix='p3a-nachauftrag4-', dir=os.environ.get('P3A_TEST_ROOT')))
RUNTIME = Path(os.environ.get('P3A_RUNTIME_DIR', ROOT / 'runtime'))
RUNTIME.mkdir(parents=True, exist_ok=True)
API = ROOT / 'website/api'
API.mkdir(parents=True)
INPUT, CALLS, BLOCK, FAULT = [ROOT / name for name in ['incoming.json', 'transport.jsonl', 'block', 'fault']]
SAVED, CONFIG = RUNTIME / 'werte_snapshot.json', RUNTIME / 'rechner-config.json'
PHP = ['php', '-d', f'open_basedir={REPO}:{ROOT}:{RUNTIME}', '-d', f'include_path={ROOT}',
       '-d', 'disable_functions=mail', '-d', 'sendmail_path=/usr/bin/false']
CONTRACT = json.loads((REPO / 'tests/fixtures/rechner-snapshot-vertrag.json').read_text())
BASE = copy.deepcopy(CONTRACT['snapshot'])
BASE['sheets'].update(json.loads((REPO / 'tests/fixtures/rechner-schema3-rechenkontext.json').read_text())['sheets'])
CATALOG = BASE['sheets']['Geräte_Katalog']
for col in [3, 4, 7, 8, 13, 14, 16, 17]:
    CATALOG[2][col] = 8
CATALOG[1:1] = [['heizstab_wolf', 9], ['heizstab_vaillant', 8.54]]
DIM = 'dimensionierung&flaeche=60&plz=30159&gebaeude=efh'
WAYS = ['zeitplan', 'nachlauf', 'kaltstart']
seal(BASE, CONTRACT)


def put(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')))


def archive(path):
    if path.exists() or path.is_symlink():
        path.rename(path.with_name(path.name + f'.{time.time_ns()}.beleg'))


for file in (SOURCE / 'api').glob('*.php'):
    text = file.read_text()
    if file.name == 'rechner-values.php':
        text = text.replace('declare(strict_types=1);', f"declare(strict_types=1);\ndefine('RECHNER_RUNTIME_DIR', '{RUNTIME}');")
        start = text.index('function rechner_curl_get(')
        end = text.index('\n/**', start)
        text = text[:start] + '''function rechner_curl_get(string $url, int $timeoutSeconds): array
{
    file_put_contents('CALLS', "abgefangen\\n", FILE_APPEND);
    if (is_file('BLOCK')) { return ['body'=>'', 'status'=>503, 'errno'=>0, 'error'=>'gesperrt']; }
    return ['body'=>file_get_contents('INPUT'), 'status'=>200, 'errno'=>0, 'error'=>''];
}
'''.replace('CALLS', str(CALLS)).replace('INPUT', str(INPUT)).replace('BLOCK', str(BLOCK)) + text[end:]
    (API / file.name).write_text(text)

if os.environ.get('P3A_N4_MUTATION'):
    file = API / 'rechner-snapshot-tabellen.php'
    text = file.read_text()
    needle = "} elseif (in_array($name, rechner_schema3_textverbraucher($sheet), true) && (!$catalog || $selected)) {"
    assert needle in text
    text = text.replace(needle, "} elseif (false) {")
    file.write_text(text)

isolation = subprocess.run(PHP + ['-r', '''echo json_encode(['include_path'=>get_include_path(),
'open_basedir'=>ini_get('open_basedir'), 'secret'=>@stream_resolve_include_path('secrets.local.php'),
'home'=>@is_readable('/Users/benjaminbendler/secrets.local.php'), 'mail'=>function_exists('mail')]);'''],
                           capture_output=True, text=True, check=True)
measured = json.loads(isolation.stdout)
assert not measured['secret'] and not measured['home'] and not measured['mail']
put(ROOT / 'isolation.json', measured)
archive(CONFIG)
put(CONFIG, {'apps_script_url': 'http://127.0.0.1:1/abgefangen'})
(RUNTIME / 'werte_snapshot_key.txt').write_text('UNECHTER-PRUEFSCHLUESSEL\n')
DRIVER = ROOT / 'driver.php'
DRIVER.write_text("""<?php
if (($argv[1] ?? '') === 'read') {
    require __DIR__.'/website/api/rechner-values.php';
    require __DIR__.'/website/api/rechner-engine.php';
    try {
        $s = rechner_validate_snapshot(file_get_contents(RECHNER_SNAPSHOT_FILE));
        echo json_encode(['schema'=>$s['schemaVersion'], 'normal'=>$s, 'preise'=>hw_read_price_table($s['sheets'], 'Preise_Wolf', rechner_schema3_tabellen_aufloesen($s['sheets'])), 'katalog'=>hw_get_catalog($s['sheets'], rechner_schema3_tabellen_aufloesen($s['sheets'])), 'foerderpreise'=>hw_get_prices($s['sheets'], 'wolf', rechner_schema3_tabellen_aufloesen($s['sheets']))], JSON_THROW_ON_ERROR);
    } catch (Throwable $e) { fwrite(STDERR, $e->getMessage()); exit(2); }
} else { require __DIR__.'/website/api/werte-auffrischen.php'; }
""")


def start_server(precision):
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    log = (ROOT / f'server-{precision}.log').open('w')
    process = subprocess.Popen(PHP + ['-d', f'serialize_precision={precision}', '-d', f'precision={4 if precision == 4 else 14}', '-S', f'127.0.0.1:{port}',
                                     '-t', str(API.parent)], cwd=API.parent, stdout=log, stderr=log)
    for _ in range(100):
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=.1):
                break
        except OSError:
            time.sleep(.03)
    return process, port, log


servers = {precision: start_server(precision) for precision in [-1, 4]}
(API.parent / 'bereit.txt').write_text('Lokale Prüfbarriere')


def http(action, precision=-1):
    request = urllib.request.Request(f'http://127.0.0.1:{servers[precision][1]}/api/rechner.php?action={action}',
                                     headers={'Origin': 'https://herowerk.de'})
    try:
        response = urllib.request.urlopen(request, timeout=25)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        answer = response.status, json.loads(response.read())
    # Der Einzelprozess bedient diese statische Anfrage erst nach dem PHP-Nachlauf.
    with urllib.request.urlopen(f'http://127.0.0.1:{servers[precision][1]}/bereit.txt', timeout=25) as barrier:
        barrier.read()
    return answer


def fingerprint():
    if not SAVED.exists():
        return None
    return {'sha256': hashlib.sha256(SAVED.read_bytes()).hexdigest(), 'mtime_ns': SAVED.stat().st_mtime_ns}


def prepare(s, way):
    for path in [SAVED, BLOCK, FAULT, CALLS, RUNTIME / 'rate-limit']:
        archive(path)
    put(INPUT, s)
    if way != 'kaltstart':
        put(SAVED, BASE)
        os.utime(SAVED, (0, 0))
    return fingerprint()


def trigger(way, precision):
    if way == 'zeitplan':
        result = subprocess.run(PHP + ['-d', f'serialize_precision={precision}', str(DRIVER)],
                                capture_output=True, text=True, timeout=25)
        return {'exit': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr}
    response = http(DIM, precision)
    # Nachlauf ist ein tatsächlicher HTTP-Nachlauf; auf Beendigung warten, auch bei Ablehnung.
    if way == 'nachlauf':
        for _ in range(120):
            if CALLS.exists():
                break
            time.sleep(.02)
        time.sleep(.08)
    return {'http': response}


def accepted(s, way, precision=-1):
    raw, digest = seal(s, CONTRACT)
    before = prepare(s, way)
    operation = trigger(way, precision)
    assert CALLS.exists(), 'Kein abgefangener Abruf'
    calls = CALLS.read_bytes()
    # Eine unlesbare gespeicherte Datei darf nicht durch erneuten Abruf kaschiert werden.
    BLOCK.write_text('Folgeabruf gesperrt')
    assert SAVED.exists() and SAVED.stat().st_mtime > 1, ('Neuer Abzug fehlt', operation)
    stored = json.loads(SAVED.read_text())
    for rows in stored['sheets'].values():
        assert isinstance(rows, list) and all(isinstance(row, list) for row in rows), 'Gespeicherte Zeile ist kein Array'
    expected = copy.deepcopy(s)
    for sheet in ['Preise_Wolf', 'Preise_Vaillant', 'Geräte_Katalog']:
        catalog = sheet == 'Geräte_Katalog'
        names = CONTRACT['katalog_identitaetskoepfe'] if catalog else CONTRACT['preis_spalten']
        rows = expected['sheets'][sheet]
        head = next(i for i, row in enumerate(rows) if all(name in row for name in names))
        money = ['Brutto €'] if catalog else ['Endpreis_brutto', 'Eigenanteil', 'Endpreis_brutto_ohne_Warmwasser']
        for row in rows[head + 1:]:
            if not any(value is not None and value != '' for value in row):
                continue
            if catalog and row[rows[head].index(names[5])].strip().lower() != 'ja':
                continue
            row.extend([None] * max(0, len(rows[head]) - len(row)))
            for name in money:
                column = rows[head].index(name)
                if row[column] == '':
                    row[column] = None
    assert stored == expected, 'Speicherung hat Zellpositionen oder ungebundene Inhalte verändert'
    assert canonical(stored, CONTRACT) == raw, 'Speicherbytes ändern den Inhaltsprüfwert'
    result = subprocess.run(PHP + [str(DRIVER), 'read'], capture_output=True, text=True, timeout=25)
    assert result.returncode == 0, ('Gespeicherte Bytes nicht lesbar', result.stderr)
    normalized = json.loads(result.stdout)['normal']
    assert normalized == stored, 'Normalisierung nach Dateilesung nicht idempotent'
    first, prices = http(DIM, precision), http('preise', precision)
    assert first[0] == prices[0] == 200, (first, prices)
    assert first == http(DIM, precision)
    if way == 'kaltstart':
        assert operation['http'] == first, ('Kaltstart ungleich Datei', operation, first)
    if way == 'zeitplan':
        assert operation['exit'] == 0, operation
    assert CALLS.read_bytes() == calls, 'Dateilesung hat erneut abgerufen'
    return {'hash': digest, 'bytes': raw, 'vorher': before, 'nachher': fingerprint(),
            'operation': operation, 'dimensionierung': first, 'preise': prices,
            'gespeicherte_preiszeile': stored['sheets']['Preise_Wolf'][1],
            'gespeicherter_katalog': stored['sheets']['Geräte_Katalog'], 'folgeabruf_gesperrt': True, 'kontext': json.loads(result.stdout), 'eingabe': copy.deepcopy(s)}


results = []
(ROOT / 'faelle').mkdir()


def record(name, work):
    try:
        details = work()
        results.append({'probe': name, 'status': 'PASS', 'details': details})
        print('PASS ' + name, flush=True)
    except (AssertionError, KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
        results.append({'probe': name, 'status': 'ROT', 'fehler': str(error)})
        print('ROT ' + name + ': ' + str(error), flush=True)
    finally:
        evidence = ROOT / 'faelle' / name.replace('/', '_')
        evidence.mkdir()
        for path, label in [(INPUT, 'eingabe.json'), (SAVED, 'gespeichert.json'), (CALLS, 'transport.log')]:
            if path.exists():
                (evidence / label).write_bytes(path.read_bytes())
        results[-1]['belegverzeichnis'] = str(evidence)


from helpers.snapshot_contract import cell

FIELDS = [
    ('modell', [('Preise_Wolf', 1, 'Modell'), ('Geräte_Katalog', 4, 'Modell')]),
    ('vaillant-modell', [('Preise_Vaillant', 1, 'Modell')]),
    ('baureihe', [('Geräte_Katalog', 4, CONTRACT['katalog_identitaetskoepfe'][3])]),
    ('kw-wolf', [('Preise_Wolf', 1, 'kW')]),
    ('kw-vaillant', [('Preise_Vaillant', 1, 'kW')]),
    ('klasse', [('Preise_Wolf', 1, 'Klasse')]),
    ('hausgroesse', [('Preise_Wolf', 1, 'Hausgroesse')]),
    ('marke', [('Geräte_Katalog', 4, 'Marke')]),
]


def identity(detail):
    # Der HTTP-Teil allein könnte bei unbekannter Marke eine leere Wahl verdecken.
    # Deshalb außerdem sämtliche tatsächlich konsumierten Textidentitäten vergleichen.
    return {'preise': detail['preise'], 'dimensionierung': detail['dimensionierung'],
            'preisleser': detail['kontext']['preise'], 'katalogleser': detail['kontext']['katalog'],
            'foerderpreise': detail['kontext']['foerderpreise']}


def pair(field, targets, way, value=1e19, precision=-1):
    details = []
    for variant, v in [('zahl', value), ('text', cell(value))]:
        s = copy.deepcopy(BASE)
        for sheet, row, name in targets:
            head = 3 if sheet == 'Geräte_Katalog' else 0
            s['sheets'][sheet][row][s['sheets'][sheet][head].index(name)] = v
        detail = accepted(s, way, precision)
        d = ROOT / 'paare' / f'{field}-{way}-{precision}' / variant
        d.mkdir(parents=True)
        for source, label in [(INPUT, 'eingabe.json'), (SAVED, 'gespeichert.json'), (CALLS, 'transport.log')]:
            (d / label).write_bytes(source.read_bytes())
        put(d / 'antworten.json', detail)
        details.append(detail)
    number, text = details
    assert number['bytes'] == text['bytes'] and number['hash'] == text['hash'], 'Sollhashpaar ungleich'
    if field == 'modell' and value == 1e19:
        assert number['hash'] == '7fde0ea413c4e369ab6de87f27910741749c012e4058b45e1c3d8acc20a374a8'
        for d in details:
            assert d['preise'][1]['wolf'][0]['modell'] == cell(value), d['preise']
            wolf = d['dimensionierung'][1]['marken']['wolf']
            assert wolf['modell'] == cell(value) and all(v['modell'] == cell(value) for v in wolf['varianten']), wolf
    assert identity(number) == identity(text), ('Hashgleiche Zellen verschieden konsumiert', field,
                                              identity(number), identity(text))
    return {'feld': field, 'ziele': targets, 'solltext': cell(value), 'zahl': number, 'text': text}


try:
    # Unabhängige Vertragswerte müssen sowohl zu Zahl als auch Text passen.
    for control in CONTRACT['identitaetsdarstellung']['kontrollpaare']:
        for value in [control['zahl'], control['text']]:
            snapshot = copy.deepcopy(BASE)
            for target in control['ziele']:
                snapshot['sheets'][target['blatt']][target['zeile'] - 1][target['spalte'] - 1] = value
            raw, digest = seal(snapshot, CONTRACT)
            assert raw == control['kanonische_bytes'] and digest == control['inhalt_sha256']
            assert cell(value) == control['antworttext']
    for name, targets in FIELDS:
        for way in WAYS:
            record(f'{name}/{way}', lambda n=name, t=targets, w=way: pair(n, t, w))
    for label, value in [('ganzzahldarstellung', 1000000000000000.0), ('dezimalpraezision', 1.2345678901234567),
                         ('null', 0), ('negativnull', -0.0), ('klein', 1e-7)]:
        for way in WAYS:
            record(f'{label}/{way}', lambda n=label, v=value, w=way: pair(n, FIELDS[0][1], w, v))
    for way in WAYS:
        record(f'prozesspraezision/{way}', lambda w=way: pair('prozesspraezision', FIELDS[0][1], w, 1.2345678901234567, 4))
    for label, model, expected in [('echtes-modell', 'Wolf CHA-07', 'Wolf CHA-07'),
                                   ('nfc-rand', ' \u00a0Wa\u0308rmepumpe\u00a0 ', 'Wärmepumpe'),
                                   ('kaskadenmodell', '2× Wolf CHA-16', '2× Wolf CHA-16')]:
        for way in WAYS:
            def real(model=model, expected=expected, way=way):
                s = copy.deepcopy(BASE)
                s['sheets']['Preise_Wolf'][1][1] = model
                s['sheets']['Geräte_Katalog'][4][1] = model
                d = accepted(s, way)
                assert d['preise'][1]['wolf'][0]['modell'] == expected
                wolf = d['dimensionierung'][1]['marken']['wolf']
                assert wolf['modell'] == expected
                assert wolf['anzahl'] == (2 if expected.startswith('2×') else 1)
                assert all(v['modell'] == expected for v in wolf['varianten'])
                return d
            record(f'{label}/{way}', real)
    for label in ['technik', 'nicht-gewaehlt']:
        for way in WAYS:
            def unbound(label=label, way=way):
                s = copy.deepcopy(BASE)
                if label == 'technik':
                    s['sheets']['Geräte_Katalog'][4][26] = True
                    s['sheets']['Geräte_Katalog'][3].append('Zusätzliche technische Notiz')
                    s['sheets']['Geräte_Katalog'][4].append('Modell')
                else:
                    s['sheets']['Geräte_Katalog'][5][1] = 1e19
                raw, digest = seal(s, CONTRACT)
                assert digest == seal(copy.deepcopy(BASE), CONTRACT)[1]
                d = accepted(s, way)
                assert d['dimensionierung'][1]['marken']['wolf']['modell'] == 'Wärmepumpe'
                return d
            record(f'{label}/{way}', unbound)
finally:
    for process, _, log in servers.values():
        process.terminate()
        process.wait(timeout=10)
        log.close()
    archive(CONFIG)
    put(CONFIG, {})
    put(ROOT / 'ergebnisse.json', results)
    print('BELEG ' + str(ROOT / 'ergebnisse.json'), flush=True)
failures = [r['probe'] for r in results if r['status'] == 'ROT']
if os.environ.get('P3A_EXPECT_RED'):
    assert all(any(f.startswith(n + '/') for f in failures) for n in ['modell', 'baureihe', 'kw-wolf', 'klasse', 'hausgroesse', 'marke']), failures
    print('PASS scharfer Identitäts-Rotnachweis')
else:
    assert not failures, failures
