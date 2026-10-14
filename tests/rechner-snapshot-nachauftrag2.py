"""Vertragsproben bis zur HTTP-Antwort: Leerpreise, Zahltypen, Textgroßschreibung."""
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
ROOT = Path(tempfile.mkdtemp(prefix='p3a-nachauftrag2-', dir=os.environ.get('P3A_TEST_ROOT')))
RUNTIME = Path(os.environ.get('P3A_RUNTIME_DIR', ROOT / 'runtime'))
RUNTIME.mkdir(parents=True, exist_ok=True)
API = ROOT / 'website/api'
API.mkdir(parents=True)
INPUT, CALLS = ROOT / 'incoming.json', ROOT / 'transport.jsonl'
SAVED, CONFIG = RUNTIME / 'werte_snapshot.json', RUNTIME / 'rechner-config.json'
PHP = ['php', '-d', f'open_basedir={REPO}:{ROOT}:{RUNTIME}', '-d', f'include_path={ROOT}',
       '-d', 'disable_functions=mail', '-d', 'sendmail_path=/usr/bin/false']
CONTRACT = json.loads((REPO / 'tests/fixtures/rechner-snapshot-vertrag.json').read_text())
BASE = copy.deepcopy(CONTRACT['snapshot'])
BASE['sheets'].update(json.loads((REPO / 'tests/fixtures/rechner-schema3-rechenkontext.json').read_text())['sheets'])
CATALOG = BASE['sheets']['Geräte_Katalog']
for col in [3, 4, 16, 17]:
    CATALOG[2][col] = 8
CATALOG[1:1] = [['heizstab_wolf', 9], ['heizstab_vaillant', 8.54]]
DIM = 'dimensionierung&flaeche=60&plz=30159&gebaeude=efh'


def put(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))


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
    return ['body'=>file_get_contents('INPUT'), 'status'=>200, 'errno'=>0, 'error'=>''];
}
'''.replace('CALLS', str(CALLS)).replace('INPUT', str(INPUT)) + text[end:]
    (API / file.name).write_text(text)
mutation = os.environ.get('P3A_N2_MUTATION')
if mutation:
    file = API / 'rechner-snapshot-tabellen.php'
    text = file.read_text()
    changes = {
        'leer': ("if ($nullable && ($value === null || $value === ''))", 'if (false)'),
        'zahl': ('return $normalized;', 'return $value;'),
        'gross': ('$selected = rechner_schema3_auswahl($row[$map[\'Auswahl\']] ?? null);',
                  "$row[$map['Auswahl']] = strtolower(rechner_kanonische_zelle($row[$map['Auswahl']] ?? null, true));\n                $selected = rechner_schema3_auswahl($row[$map['Auswahl']] ?? null);")}
    needle, replacement = changes[mutation]
    assert needle in text
    file.write_text(text.replace(needle, replacement))

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
DRIVER = ROOT / 'cron.php'
DRIVER.write_text("""<?php
if (($argv[1] ?? '') === 'raw') {
    require __DIR__.'/website/api/rechner-values.php';
    require __DIR__.'/website/api/rechner-engine.php';
    $s = rechner_validate_snapshot(file_get_contents(RECHNER_RUNTIME_DIR.'/werte_snapshot.json'));
    echo json_encode(hw_rechner_route('dimensionierung', ['flaeche'=>'60','plz'=>'30159','gebaeude'=>'efh'], $s['sheets'], 3));
} else { require __DIR__.'/website/api/werte-auffrischen.php'; }
""")
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
log = (ROOT / 'server.log').open('w')
server = subprocess.Popen(PHP + ['-S', f'127.0.0.1:{port}', '-t', str(API.parent)], cwd=API.parent, stdout=log, stderr=log)
for _ in range(100):
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=.1):
            break
    except OSError:
        time.sleep(.03)


def http(action):
    request = urllib.request.Request(f'http://127.0.0.1:{port}/api/rechner.php?action={action}', headers={'Origin': 'https://herowerk.de'})
    try:
        response = urllib.request.urlopen(request, timeout=25)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, json.loads(response.read())


def load(s, way):
    archive(SAVED)
    archive(RUNTIME / 'rate-limit')
    put(INPUT, s)
    if way != 'kaltstart':
        put(SAVED, BASE)
        os.utime(SAVED, (0, 0))
    if way == 'zeitplan':
        result = subprocess.run(PHP + [str(DRIVER)], capture_output=True, text=True, timeout=25)
        assert result.returncode == 0, result.stdout + result.stderr
    if way == 'nachlauf':
        assert http(DIM)[0] == 200
        for _ in range(150):
            if SAVED.stat().st_mtime > 1:
                break
            time.sleep(.02)
        assert SAVED.stat().st_mtime > 1, 'Nachlauf hat gültigen neuen Abzug nicht gespeichert'
    first = http(DIM)
    assert first[0] == 200, first
    saved = json.loads(SAVED.read_text())
    assert canonical(saved, CONTRACT) == canonical(s, CONTRACT), 'Speicherung verändert Inhaltsbytes'
    second = http(DIM)
    assert first == second, {'kaltstart': first, 'datei': second}
    return first[1], saved


results = []


def record(name, work):
    try:
        details = work()
        results.append({'probe': name, 'status': 'PASS', 'details': details})
        print('PASS ' + name, flush=True)
    except (AssertionError, KeyError, json.JSONDecodeError) as error:
        results.append({'probe': name, 'status': 'ROT', 'fehler': str(error)})
        print('ROT ' + name + ': ' + str(error), flush=True)


try:
    for field, sheet, row, col in [('I2', 'Preise_Wolf', 1, 8), ('K5', 'Geräte_Katalog', 4, 10),
                                  ('E2', 'Preise_Wolf', 1, 4), ('F2', 'Preise_Wolf', 1, 5)]:
        for empty in ['', None]:
            for way in ['zeitplan', 'nachlauf', 'kaltstart']:
                def missing(field=field, sheet=sheet, row=row, col=col, empty=empty, way=way):
                    s = copy.deepcopy(BASE)
                    s['sheets'][sheet][row][col] = empty
                    raw, digest = seal(s, CONTRACT)
                    answer, saved = load(s, way)
                    assert saved['sheets'][sheet][row][col] is None, 'Fehlpreis nicht einheitlich null gespeichert'
                    wolf = answer['marken']['wolf']
                    if field == 'K5':
                        assert wolf['brutto'] is None and 'preis_hinterlegt' not in wolf and wolf['eigenanteil'] is None, wolf
                    if field == 'K5':
                        raw_answer = subprocess.run(PHP + [str(DRIVER), 'raw'], capture_output=True, text=True, check=True)
                        assert json.loads(raw_answer.stdout)['marken']['wolf']['preis_hinterlegt'] is False
                    else:
                        assert wolf['brutto'] == 30026.01, wolf
                        assert wolf['eigenanteil'] == (7626 if field == 'I2' else None), wolf
                    code, prices = http('preise')
                    assert code == 200
                    if field == 'E2':
                        assert prices['wolf'] == [], prices
                        code, funding = http('foerderung&wpTyp=s&marke=wolf')
                        assert code >= 400 and funding.get('error') and 'preis' not in funding, funding
                        assert http('foerderung&wpTyp=s&marke=wolf&preisManuell=30026')[1]['preis'] == 30026
                    else:
                        assert prices['wolf'][0]['brutto'] == 30026.01
                        assert prices['wolf'][0]['eigen'] == (None if field == 'F2' else 7626)
                    browser = json.loads((REPO / 'tests/fixtures/rechner-schema3-fehlpreis-antwort.json').read_text())
                    if field == 'K5':
                        assert wolf == browser['geraet'], 'Browserprobe muss tatsächliche HTTP-Geräteantwort verwenden'
                    if field == 'E2':
                        assert prices == browser['preise'], 'Browserprobe muss tatsächliche HTTP-Preisantwort verwenden'
                    return {'weg': way, 'hash': digest, 'wolf': wolf, 'preise': prices,
                            'kaltstart_datei_identisch': True}
                record(f'leer/{field}/{repr(empty)}/{way}', missing)
    for field in ['K5', 'E2']:
        for number in [30026, 30026.0, 30026.01]:
            for way in ['zeitplan', 'nachlauf', 'kaltstart']:
                def numeric(field=field, number=number, way=way):
                    s = copy.deepcopy(BASE)
                    other = int(number) if number == int(number) else number
                    s['sheets']['Preise_Wolf'][1][4] = number if field == 'E2' else other
                    s['sheets']['Geräte_Katalog'][4][10] = number if field == 'K5' else other
                    _, digest = seal(s, CONTRACT)
                    answer, saved = load(s, way)
                    values = [saved['sheets']['Preise_Wolf'][1][4], saved['sheets']['Geräte_Katalog'][4][10]]
                    assert values == [number, number]
                    assert all(type(v) is (int if number == int(number) else float) for v in values), values
                    wolf = answer['marken']['wolf']
                    assert wolf['brutto'] == number and wolf['eigenanteil'] == 7626, wolf
                    code, funding = http('foerderung&wpTyp=s&marke=wolf')
                    assert code == 200 and funding['preis'] == number, funding
                    return {'hash': digest, 'wolf': wolf, 'förderung': funding, 'gespeichert': values, 'kaltstart_datei_identisch': True}
                record(f'zahl/{field}/{repr(number)}/{way}', numeric)
    for text in ['JA', 'Ja', ' \u00a0JA\u00a0 ']:
        for way in ['zeitplan', 'nachlauf', 'kaltstart']:
            def uppercase(text=text, way=way):
                s = copy.deepcopy(BASE)
                s['sheets']['Geräte_Katalog'][4][33] = text
                raw, digest = seal(s, CONTRACT)
                answer, saved = load(s, way)
                assert saved['sheets']['Geräte_Katalog'][4][33] == text
                assert answer['marken']['wolf']['brutto'] == 30026.01
                return {'hash': digest, 'bytes': raw, 'wolf': answer['marken']['wolf']}
            record(f'gross/{repr(text)}/{way}', uppercase)
    def zero_funding():
        s = copy.deepcopy(BASE)
        s['sheets']['Preise_Wolf'][1][4] = 0
        seal(s, CONTRACT)
        load(s, 'kaltstart')
        code, funding = http('foerderung&wpTyp=s&marke=wolf')
        assert code == 200 and funding['preis'] == 0, funding
        return funding
    record('zahl/nullbetrag-kein-ersatzpreis', zero_funding)
    # Ein falscher Hash und fremde Laufkennung dürfen auch mit Leerpreis nicht durchgehen.
    for kind in ['klein-hash', 'fremder-lauf', 'zahltext', 'leerzeichen']:
        def rejected(kind=kind):
            s = copy.deepcopy(BASE)
            s['sheets']['Geräte_Katalog'][4][33] = 'JA'
            if kind == 'fremder-lauf':
                s['sheets']['Geräte_Katalog'][4][39] = 'fremd'
                s['sheets']['Geräte_Katalog'][4][10] = None
                seal(s, CONTRACT)
            elif kind in ['zahltext', 'leerzeichen']:
                s['sheets']['Preise_Wolf'][1][4] = '30026.01' if kind == 'zahltext' else ' '
                seal(s, CONTRACT)
            archive(SAVED)
            archive(RUNTIME / 'rate-limit')
            put(INPUT, s)
            code, answer = http(DIM)
            assert code == 503 and not SAVED.exists(), (code, answer)
            return {'http': code, 'antwort': answer}
        record('abweisung/' + kind, rejected)
finally:
    server.terminate()
    server.wait(timeout=10)
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
