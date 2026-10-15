"""Ergebnisprüfungen: echter HTTP-Endpunkt, abgefangener Transport, keine echten Dienste."""
import copy
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import unicodedata
import urllib.error
import urllib.request
from helpers.snapshot_contract import seal

REPO = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get('P3A_RESULT_SOURCE', REPO))
ROOT = Path(tempfile.mkdtemp(prefix='p3a-ergebnisse-', dir=os.environ.get('P3A_TEST_ROOT')))
RUNTIME = Path(os.environ.get('P3A_RUNTIME_DIR', ROOT / 'runtime'))
RUNTIME.mkdir(parents=True, exist_ok=True)
API = ROOT / 'website/api'
API.mkdir(parents=True)
CONTRACT = json.loads((REPO / 'tests/fixtures/rechner-snapshot-vertrag.json').read_text())
BASE = CONTRACT['snapshot']
INPUT = ROOT / 'incoming.json'
CALLS = ROOT / 'transport.jsonl'
SAVED = RUNTIME / 'werte_snapshot.json'
CONFIG = RUNTIME / 'rechner-config.json'
PHP = ['php', '-d', f'open_basedir={REPO}:{ROOT}:{RUNTIME}', '-d', f'include_path={ROOT}',
       '-d', 'disable_functions=mail', '-d', 'sendmail_path=/usr/bin/false']


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def put(path, value):
    path.write_text(encode(value))


def archive(path):
    if path.exists() or path.is_symlink():
        path.rename(path.with_name(path.name + f'.{time.time_ns()}.beleg'))


for file in (SOURCE / 'api').glob('*.php'):
    text = file.read_text()
    if file.name == 'rechner-values.php':
        text = text.replace('declare(strict_types=1);',
                            f"declare(strict_types=1);\ndefine('RECHNER_RUNTIME_DIR', '{RUNTIME}');")
        start = text.index('function rechner_curl_get(')
        end = text.index('\n/**', start)
        text = text[:start] + '''function rechner_curl_get(string $url, int $timeoutSeconds): array
{
    file_put_contents('CALLS', json_encode(['transport_versucht'=>true])."\\n", FILE_APPEND);
    return ['body'=>file_get_contents('INPUT'), 'status'=>200, 'errno'=>0, 'error'=>''];
}
'''.replace('CALLS', str(CALLS)).replace('INPUT', str(INPUT)) + text[end:]
    (API / file.name).write_text(text)
# Mutationen nur auf eigenen Testkopien; Preisantwort muss danach rot werden.
mutation = os.environ.get('P3A_RESULT_MUTATION')
if mutation:
    paths = {'kopf': 'rechner-engine.php', 'zahl': 'rechner-snapshot-tabellen.php',
             'auswahl': 'rechner-snapshot-integritaet.php', 'config': 'rechner-values.php',
             'foerderpreis': 'rechner-engine.php'}
    file = API / paths[mutation]
    text = file.read_text()
    if mutation == 'kopf':
        needle = "$tables[$name] ?? hw_finde_tabelle"
        replacement = 'hw_finde_tabelle'
    elif mutation == 'zahl':
        needle = 'function rechner_schema3_zahl(mixed $value, bool $nullable = false): int|float|null\n{'
        replacement = 'function rechner_schema3_zahl(mixed $value, bool $nullable = false): int|float|null\n{\n    if (is_string($value)) { return (float) str_replace(".", "", $value); }'
        # Hashwache separat ausschalten, damit der falsche Zahlenverbrauch beobachtbar wird.
        integrity = API / 'rechner-snapshot-integritaet.php'
        integrity.write_text(integrity.read_text().replace('if (!hash_equals($expected, $actual))', 'if (false)'))
    elif mutation == 'auswahl':
        needle = "if ($run !== $activeId)"
        replacement = "if ($run !== $activeId && $sheet !== 'Geräte_Katalog')"
        text = text.replace('if (!hash_equals($expected, $actual))', 'if (false)')
    elif mutation == 'foerderpreis':
        needle = '$preis = $snapshotPreis ?? hw_int'
        replacement = '$preis = hw_int'
    else:
        needle = '    clearstatcache(true, $file);'
        replacement = '    if (!file_exists($file)) { return []; }\n    clearstatcache(true, $file);'
    assert needle in text, mutation
    file.write_text(text.replace(needle, replacement))

DRIVER = ROOT / 'driver.php'
DRIVER.write_text('''<?php
require __DIR__.'/website/api/rechner-values.php';
require __DIR__.'/website/api/rechner-engine.php';
try {
    if ($argv[1] === 'cron') { require __DIR__.'/website/api/werte-auffrischen.php'; }
    elseif ($argv[1] === 'config') {
        if ($argv[2] === 'fetch') { rechner_fetch_snapshot('unecht'); }
        else { define('RECHNER_GOOGLE_FORWARD_TIMEOUT_SECONDS', 1); rechner_forward_google('action=health'); }
        echo json_encode(['fehler'=>null]);
    } elseif ($argv[1] === 'selection') {
        $s=rechner_validate_snapshot(file_get_contents(__DIR__.'/incoming.json'));
        $t=function_exists('rechner_schema3_tabellen_aufloesen') ? rechner_schema3_tabellen_aufloesen($s['sheets']) : null;
        echo json_encode(hw_match_catalog_varianten($s['sheets'],'wolf',5,'heizkoerper',-11,0,0,0.8,$t));
    } else {
        $s=rechner_validate_snapshot(file_get_contents(__DIR__.'/incoming.json'));
        echo json_encode(hw_rechner_route('preise', [], $s['sheets'], $s['schemaVersion']));
    }
} catch (RechnerValuesException $e) { echo json_encode(['fehler'=>$e->publicCode]); exit(2); }
''')


def cli(mode, *args):
    return subprocess.run(PHP + [str(DRIVER), mode, *args], capture_output=True, text=True, timeout=25)


def config():
    archive(CONFIG)
    put(CONFIG, {'apps_script_url': 'http://127.0.0.1:1/abgefangener-transport'})


def stamp():
    return (hashlib.sha256(SAVED.read_bytes()).hexdigest(), SAVED.stat().st_mtime_ns)


def calls():
    return len(CALLS.read_text().splitlines()) if CALLS.exists() else 0


def http(port, action="preise"):
    request = urllib.request.Request(f'http://127.0.0.1:{port}/api/rechner.php?action={action}',
                                    headers={'Origin': 'https://herowerk.de'})
    try:
        response = urllib.request.urlopen(request, timeout=25)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, json.loads(response.read())


def start():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    log = (ROOT / f'server-{port}.log').open('w')
    process = subprocess.Popen(PHP + ['-S', f'127.0.0.1:{port}', '-t', str(API.parent)],
                               cwd=API.parent, stdout=log, stderr=log)
    for _ in range(100):
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=.1):
                return process, port, log
        except OSError:
            time.sleep(.03)
    raise RuntimeError('Prüfserver startet nicht')


# Vor dem Serverstart aus genau derselben PHP-Konfiguration messen, ohne Geheimnisinhalt.
isolation = subprocess.run(PHP + ['-r', '''echo json_encode(['include_path'=>get_include_path(),
'open_basedir'=>ini_get('open_basedir'), 'secret_via_include'=>@stream_resolve_include_path('secrets.local.php'),
'home_secret_readable'=>@is_readable('/Users/benjaminbendler/secrets.local.php'), 'mail_enabled'=>function_exists('mail')]);'''],
                           capture_output=True, text=True, check=True)
measured = json.loads(isolation.stdout)
assert not measured['home_secret_readable'] and not measured['secret_via_include'] and not measured['mail_enabled']
put(ROOT / 'isolation.json', measured)
(RUNTIME / 'werte_snapshot_key.txt').write_text('UNECHTER-PRUEFSCHLUESSEL\n')
config()
archive(SAVED)
put(SAVED, BASE)
put(INPUT, BASE)
archive(RUNTIME / 'rate-limit')
server, port, server_log = start()
results = []
failures = []


def record(name, work):
    try:
        details = work()
        results.append({'probe': name, 'status': 'PASS', 'details': details})
        print('PASS ' + name, flush=True)
    except (AssertionError, json.JSONDecodeError) as error:
        failures.append(name)
        results.append({'probe': name, 'status': 'ROT', 'fehler': str(error)})
        print('ROT ' + name + ': ' + str(error), flush=True)


try:
    status, baseline = http(port)
    assert status == 200 and baseline['wolf'][0]['brutto'] == 30026.01, (status, baseline)
    assert baseline['vaillant'][0]['brutto'] == 29944
    variants = {}
    for sheet in ['Preise_Wolf', 'Preise_Vaillant']:
        for kind in ['verschoben', 'zusatzkopf', 'teilkopf', 'zahltext', 'doppelt', 'teilkopf-nachher', 'ohne-bindung']:
            s = copy.deepcopy(BASE)
            rows = s['sheets'][sheet]
            if kind == 'verschoben':
                for row in rows:
                    row.insert(4, row.pop(8))
            elif kind == 'zusatzkopf':
                rows[0].insert(4, 'Endpreis_brutto_TEST')
                rows[1].insert(4, 1)
            elif kind == 'teilkopf':
                rows[:0] = [['Klasse', 'Modell', 'Endpreis_brutto'], ['xxl', 'Ungebundenes Gerät', 1]]
            elif kind == 'zahltext':
                rows[1][4] = str(rows[1][4])
            elif kind == 'doppelt':
                rows[0].append('Modell')
            elif kind == 'teilkopf-nachher':
                rows.append(['Klasse', 'Modell', 'Endpreis_brutto'])
            else:
                rows[1][7] = ''
            variants[f'{sheet}/{kind}'] = (s, kind == 'verschoben')
    s = copy.deepcopy(BASE)
    s['sheets']['Geräte_Katalog'][3][33] = 'JA'
    s['sheets']['Geräte_Katalog'][3][10] = 1
    for col in [3, 4, 16, 17]:
        s['sheets']['Geräte_Katalog'][3][col] = 8
    variants['auswahl-JA-fremder-lauf'] = (s, False)
    for name, (s, valid) in variants.items():
        for way in ['zeitplan', 'nachlauf', 'kaltstart']:
            def probe(s=s, valid=valid, way=way):
                archive(RUNTIME / 'rate-limit')
                archive(SAVED)
                put(SAVED, BASE)
                os.utime(SAVED, (0, 0))
                before = stamp()
                put(INPUT, s)
                count = calls()
                if way == 'kaltstart':
                    archive(SAVED)
                if way == 'zeitplan':
                    cron = cli('cron')
                    after_cron = stamp()
                    # Frische Antwort aus dem Bestand, damit kein zusätzlicher Nachlauf erfolgt.
                    os.utime(SAVED, None)
                code, answer = http(port)
                for _ in range(100):
                    if calls() > count:
                        break
                    time.sleep(.02)
                assert calls() == count + 1, 'Prüfer nicht über Abzugsweg erreicht'
                if way == 'kaltstart' and not valid:
                    assert code == 503 and not SAVED.exists(), (code, answer)
                else:
                    assert code == 200 and answer == baseline, (code, answer)
                    if way != 'zeitplan':
                        # Nachlauf schreibt erst nach Antwortschluss, auf dessen Ende warten.
                        for _ in range(100):
                            if valid and stamp() != before:
                                break
                            time.sleep(.005)
                        if not valid:
                            assert stamp() == before, 'Altbestand geändert'
                    if way == 'zeitplan':
                        assert cron.returncode == (0 if valid else 1), cron.stdout + cron.stderr
                        if not valid:
                            assert after_cron == before, 'Altbestand geändert'
                    if valid:
                        assert json.loads(SAVED.read_text()) == s
                return {'http': code, 'antwort': answer, 'transportversuche': calls() - count}
            record(name + '/' + way, probe)
    # Auswahl mit Leistungsdaten: direkt der tatsächliche Auswahlverbraucher, keine Annahmeassertion allein.
    def selection():
        put(INPUT, variants['auswahl-JA-fremder-lauf'][0])
        selected = cli('selection')
        assert selected.returncode == 2 and json.loads(selected.stdout) == {'fehler': 'snapshot_lauf_abweichend'}, selected.stdout
        return json.loads(selected.stdout)
    record('gerätewahl-fremder-lauf', selection)
    def upper():
        s = copy.deepcopy(BASE)
        s['sheets']['Geräte_Katalog'][2][33] = ' \u00a0JA\u00a0 '
        seal(s, CONTRACT)
        put(INPUT, s)
        selected = cli('price')
        assert selected.returncode == 0 and json.loads(selected.stdout) == baseline, selected.stdout
        for col in [3, 4, 16, 17]:
            s['sheets']['Geräte_Katalog'][2][col] = 8
        put(INPUT, s)
        selected = cli('selection')
        picks = json.loads(selected.stdout)
        assert selected.returncode == 0 and len(picks) == 1 and picks[0]['brutto'] == 30026.01, selected.stdout
        return {'preisantwort': baseline, 'gerätewahl': picks}
    record('aktiver-lauf-normalisiertes-JA', upper)
    def calculation():
        context = json.loads((REPO / 'tests/fixtures/rechner-schema3-rechenkontext.json').read_text())
        s = copy.deepcopy(BASE)
        s['sheets'].update(context['sheets'])
        catalog = s['sheets']['Geräte_Katalog']
        for col in [3, 4, 16, 17]:
            catalog[2][col] = 8
        catalog[1:1] = [['heizstab_wolf', 9], ['heizstab_vaillant', 8.54]]
        # Nicht gebundene Technik ergänzt die Rechenprobe, Hashbytes bleiben gleich.
        answers = []
        for shifted in [False, True]:
            if shifted:
                for sheet in ['Preise_Wolf', 'Preise_Vaillant']:
                    for row in s['sheets'][sheet]:
                        row.insert(4, row.pop(8))
                for row in catalog[3:]:
                    row.reverse()
            archive(SAVED)
            archive(RUNTIME / 'rate-limit')
            put(SAVED, s)
            put(INPUT, s)
            answer = {}
            for brand, expected in [('wolf', 30026.01), ('vaillant', 29944)]:
                code, response = http(port, 'foerderung&wpTyp=s&marke=' + brand)
                assert code == 200 and response['preis'] == expected, (code, response)
                answer[brand] = response
            code, response = http(port, 'dimensionierung&flaeche=60&plz=30159&gebaeude=efh')
            assert code == 200 and response.get('marken', {}).get('wolf', {}).get('brutto') == 30026.01, (code, response)
            answer['dimensionierung'] = response
            answers.append(answer)
        assert answers[0] == answers[1], answers
        return {'vor_und_nach_umstellung_identisch': True, 'antworten': answers[0]}
    record('preis-in-foerderung-und-dimensionierung', calculation)
    put(INPUT, BASE)
    for kind in ['defekter-link', 'linkschleife', 'unlesbar', 'verzeichnis', 'json-kaputt']:
        def bad_config(kind=kind):
            archive(CONFIG)
            if kind == 'defekter-link':
                CONFIG.symlink_to(RUNTIME / 'existiert-absichtlich-nicht')
            elif kind == 'linkschleife':
                CONFIG.symlink_to(CONFIG)
            elif kind == 'verzeichnis':
                CONFIG.mkdir()
            elif kind == 'unlesbar':
                CONFIG.write_text('{}')
                CONFIG.chmod(0)
                readable = subprocess.run(PHP + ['-r', f"exit(is_readable('{CONFIG}') ? 1 : 0);"], capture_output=True)
                assert readable.returncode == 0, 'Unlesbarkeit nicht wirksam'
            else:
                CONFIG.write_text('{kaputt')
            count = calls()
            outcomes = []
            try:
                for consumer in ['fetch', 'forward']:
                    result = cli('config', consumer)
                    outcomes.append(result.stdout)
                    assert result.returncode == 2 and json.loads(result.stdout) == {'fehler': 'snapshot_config_invalid'}, result.stdout
                    assert calls() == count, 'Transport vor Konfigurationsfehler'
            finally:
                if kind == 'unlesbar':
                    CONFIG.chmod(0o600)
                config()
            return outcomes
        record('config/' + kind, bad_config)
finally:
    server.terminate()
    server.wait(timeout=10)
    server_log.close()
    archive(CONFIG)
    put(CONFIG, {})
    put(ROOT / 'ergebnisse.json', results)
    print('BELEG ' + str(ROOT / 'ergebnisse.json'), flush=True)

expected_red = os.environ.get('P3A_EXPECT_RED')
if expected_red:
    assert any(expected_red in failure for failure in failures), (expected_red, failures)
    print('PASS scharfer Rotnachweis: ' + expected_red)
else:
    assert not failures, failures
