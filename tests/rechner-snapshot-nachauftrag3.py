"""Speicherbytes, Tabellenstruktur und Preisantwort über sämtliche Abzugswege."""
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
ROOT = Path(tempfile.mkdtemp(prefix='p3a-nachauftrag3-', dir=os.environ.get('P3A_TEST_ROOT')))
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
        # Fehler erst nach erfolgreicher Eingangsprüfung und Serialisierung einschleusen.
        needle = "    $temporary = tempnam(RECHNER_RUNTIME_DIR, '.werte_snapshot.');"
        assert needle in text
        text = text.replace(needle, f"    if (@file_get_contents('{FAULT}') === 'bytes') {{ $body = '{{kaputt'; }}\n" + needle)
        needle = '    $written = fwrite($handle, $body);'
        assert needle in text
        text = text.replace(needle, needle + f"\n    if (@file_get_contents('{FAULT}') === 'disk') {{ ftruncate($handle, 0); rewind($handle); fwrite($handle, '{{}}'); }}")
    (API / file.name).write_text(text)

mutation = os.environ.get('P3A_N3_MUTATION')
if mutation:
    changes = {
        'speicher': ('rechner-values.php', '$stored = rechner_read_snapshot_path($temporary, $body);', '$stored = $snapshot;'),
        'position': ('rechner-snapshot-tabellen.php', 'return array_pad($row, max(count($row), $width), null);', 'return $row;'),
        'kopfzelle': ('rechner-snapshot-tabellen.php', 'if ($completeHeader) {', 'if ($completeHeader || $map !== []) {'),
        'praezision': ('rechner-snapshot-integritaet.php', "ini_set('serialize_precision', '-1');", "// Präzision gezielt nicht festgelegt"),
        'drahtformat': ('rechner-values.php', 'rechner_schema3_listen_pruefen($body);', '// Drahtformatprüfung ausgeschaltet'),
        'rueckgabe': ('rechner-values.php', "return $fresh['schemaVersion'] === 3 ? $stored : $fresh;", 'return $fresh;'),
    }
    name, needle, replacement = changes[mutation]
    file = API / name
    text = file.read_text()
    assert needle in text, mutation
    file.write_text(text.replace(needle, replacement))
    if mutation == 'rueckgabe':
        # Die kanonische Identität schließt nun auch die frühere Float-Text-Lücke.
        # Beide Schutzstellen in den damaligen Zustand versetzen, um deren
        # ursprünglichen Kaltstartfehler weiterhin am Ergebnis nachzuweisen.
        table_file = API / 'rechner-snapshot-tabellen.php'
        table_text = table_file.read_text()
        guard = "in_array($name, rechner_schema3_textverbraucher($sheet), true) && (!$catalog || $selected)"
        assert guard in table_text
        table_file.write_text(table_text.replace(guard, 'false'))

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
    try {
        $s = rechner_validate_snapshot(file_get_contents(RECHNER_SNAPSHOT_FILE));
        echo json_encode(['schema'=>$s['schemaVersion'], 'normal'=>$s], JSON_THROW_ON_ERROR);
    } catch (Throwable $e) { fwrite(STDERR, $e->getMessage()); exit(2); }
} else { require __DIR__.'/website/api/werte-auffrischen.php'; }
""")


def start_server(precision):
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    log = (ROOT / f'server-{precision}.log').open('w')
    process = subprocess.Popen(PHP + ['-d', f'serialize_precision={precision}', '-S', f'127.0.0.1:{port}',
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
            'gespeicherter_katalog': stored['sheets']['Geräte_Katalog'], 'folgeabruf_gesperrt': True}


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


try:
    for kind in ['vollstaendig', 'gekuerzt', 'umgekehrt', 'technikzelle', 'nicht-ausgewaehlt',
                 'technikkopf', 'technik-ohne-kopf', 'preis-hinweis', 'referenz-text', 'praezision',
                 'zeilenabstand', 'kaltstart-darstellung']:
        for way in WAYS:
            def positive(kind=kind, way=way):
                s = copy.deepcopy(BASE)
                if kind in ['vollstaendig', 'gekuerzt', 'umgekehrt', 'zeilenabstand']:
                    rows = s['sheets']['Preise_Wolf']
                    order = [i for i in range(len(rows[0])) if i not in [5, 8]] + ([5, 8] if kind == 'umgekehrt' else [8, 5])
                    rows[1][5] = ''
                    for i, row in enumerate(rows):
                        rows[i] = [row[j] for j in order]
                    if kind != 'vollstaendig':
                        rows[1] = rows[1][:-2]
                catalog = s['sheets']['Geräte_Katalog']
                if kind == 'technikzelle':
                    catalog[4][26] = 'Stand'
                if kind == 'nicht-ausgewaehlt':
                    catalog[5][1] = 'Modell'
                if kind == 'technikkopf':
                    catalog[3].append('Schallleistung dB(A)')
                    catalog[4].append(50)
                if kind == 'technik-ohne-kopf':
                    catalog[4][12] = 'Stand'
                if kind == 'preis-hinweis':
                    s['sheets']['Preise_Wolf'][1][6] = 'Modell'
                if kind == 'referenz-text':
                    s['sheets']['Referenz_Laeufe'][1][1] = 'status'
                if kind == 'kaltstart-darstellung':
                    s['sheets']['Preise_Wolf'][1][1] = 1000000000000000.0
                    catalog[4][1] = 1000000000000000.0
                if kind == 'zeilenabstand':
                    catalog.insert(4, [])
                    catalog.insert(6, [])
                    s['sheets']['Preise_Wolf'].insert(1, [])
                detail = accepted(s, way, 4 if kind == 'praezision' else -1)
                wolf = detail['dimensionierung'][1]['marken']['wolf']
                assert wolf['brutto'] == 30026.01, wolf
                assert 'preis_hinterlegt' not in wolf, 'Innenfeld in tatsächlicher HTTP-Antwort'
                assert detail['preise'][1]['wolf'][0]['brutto'] == 30026.01
                assert wolf['eigenanteil'] == (None if kind in ['vollstaendig', 'gekuerzt', 'umgekehrt', 'zeilenabstand'] else 7626)
                if kind == 'technikzelle':
                    assert detail['gespeicherter_katalog'][4][26] == 'Stand'
                if kind == 'nicht-ausgewaehlt':
                    assert detail['gespeicherter_katalog'][5][1] == 'Modell'
                if kind == 'technikkopf':
                    assert detail['gespeicherter_katalog'][4][-1] == 50
                if kind == 'zeilenabstand':
                    assert detail['gespeicherter_katalog'][4] == [] and detail['gespeicherte_preiszeile'] == []
                if kind == 'kaltstart-darstellung':
                    assert wolf['modell'] == '1000000000000000', wolf
                return detail
            record(f'{kind}/{way}', positive)
    for kind in ['speicherbytes', 'tempdatei', 'objekt-zeile', 'objekt-blatt']:
        for way in WAYS:
            def negative(kind=kind, way=way):
                s = copy.deepcopy(BASE)
                before = prepare(s, way)
                if kind in ['speicherbytes', 'tempdatei']:
                    FAULT.write_text('bytes' if kind == 'speicherbytes' else 'disk')
                else:
                    value = s['sheets']['Preise_Wolf']
                    if kind == 'objekt-zeile':
                        value[1] = {str(i): x for i, x in enumerate(value[1])}
                    else:
                        s['sheets']['Preise_Wolf'] = {str(i): x for i, x in enumerate(value)}
                    put(INPUT, s)
                operation = trigger(way, -1)
                BLOCK.write_text('Folgeabruf gesperrt')
                assert fingerprint() == before, ('Altbestand ersetzt oder ungültige Datei angelegt', operation)
                if way == 'zeitplan':
                    assert operation['exit'] != 0, operation
                if way == 'kaltstart':
                    assert operation['http'][0] == 503, operation
                else:
                    response = http('preise')
                    assert response[0] == 200 and response[1]['wolf'][0]['brutto'] == 30026.01, response
                return {'operation': operation, 'vorher': before, 'nachher': fingerprint()}
            record(f'{kind}/{way}', negative)
    def notification():
        adapter, messages = ROOT / 'adapter.php', ROOT / 'messages.jsonl'
        adapter.write_text("<?php return static function (array $m): bool { file_put_contents('"
                           + str(messages) + "', json_encode($m).\"\\n\", FILE_APPEND); return true; };")
        archive(CONFIG)
        archive(RUNTIME / 'snapshot-meldungen.log')
        put(CONFIG, {'apps_script_url': 'http://127.0.0.1:1/abgefangen', 'mail_adapter': str(adapter)})
        for _ in range(2):
            before = prepare(BASE, 'zeitplan')
            FAULT.write_text('disk')
            result = trigger('zeitplan', -1)
            assert result['exit'] != 0 and fingerprint() == before, result
        captured = [json.loads(line) for line in messages.read_text().splitlines()]
        assert len(captured) == 1 and captured[0]['grund'] == 'snapshot_written_bytes_differ', captured
        return {'meldungen': captured, 'altbestand_erhalten': True}
    record('meldung/speicherfehler-tagessperre', notification)
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
expected = os.environ.get('P3A_EXPECT_RED')
if expected:
    assert any(expected in name for name in failures), (expected, failures)
    print('PASS scharfer Rotnachweis: ' + expected)
else:
    assert not failures, failures
