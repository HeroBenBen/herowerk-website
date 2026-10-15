<?php

declare(strict_types=1);

$runtime = getenv('P3A_RUNTIME_DIR') ?: sys_get_temp_dir() . '/p3a-mail-' . bin2hex(random_bytes(8));
if (!is_dir($runtime)) {
    mkdir($runtime, 0700, true);
}
define('RECHNER_RUNTIME_DIR', $runtime);
require __DIR__ . '/../api/rechner-values.php';
function assert_mail(bool $ok, string $name): void
{
    if (!$ok) {
        throw new RuntimeException('ROT ' . $name);
    }
    echo 'PASS ' . $name . "\n";
}
$prefix = $runtime . '/pruefmail-' . bin2hex(random_bytes(6));
$capture = $prefix . '.jsonl';
$adapter = $prefix . '.php';
$log = $prefix . '.log';
ini_set('error_log', $log);
$configFile = $runtime . '/rechner-config.json';
$previous = is_file($configFile) ? file_get_contents($configFile) : null;
$code = bin2hex(random_bytes(8));
$day = strtotime('2026-10-14 12:00:00 Europe/Berlin');
try {
    if (is_file($configFile)) {
        rename($configFile, $prefix . '.config-beleg');
    }
    assert_mail(rechner_apps_script_url() === APPS_SCRIPT_URL, 'Vorgabe ohne Konfigurationsdatei');
    file_put_contents($configFile, '{}');
    assert_mail(rechner_apps_script_url() === APPS_SCRIPT_URL, 'Vorgabe ohne URL-Eintrag');
    rechner_snapshot_melden('kein_adapter_' . $code, $day);
    assert_mail(str_contains(file_get_contents($log), 'meldung_nicht_zugestellt'), 'fehlender Adapter protokolliert');
    file_put_contents($adapter, '<?php return static function (array $m): bool { file_put_contents('
        . var_export($capture, true) . ', json_encode($m) . "\\n", FILE_APPEND | LOCK_EX); return true; };');
    file_put_contents($configFile, json_encode(['mail_adapter' => $adapter, 'apps_script_url' => 'http://127.0.0.1:12345/exec']));
    assert_mail(rechner_apps_script_url() === 'http://127.0.0.1:12345/exec', 'Prüfadresse aus Konfiguration');
    foreach (range(1, 4) as $_) {
        rechner_snapshot_melden('inhalt_' . $code, $day);
    }
    assert_mail(count(file($capture)) === 1, 'höchstens einmal je Grund und Tag');
    rechner_snapshot_melden('lauf_' . $code, $day);
    rechner_snapshot_melden('inhalt_' . $code, $day + 86400);
    assert_mail(count(file($capture)) === 3, 'anderer Grund und Folgetag getrennt');
    // Frischer Prozess verwendet dieselbe dauerhafte Sperre.
    $snippet = 'define("RECHNER_RUNTIME_DIR", ' . var_export($runtime, true) . '); require '
        . var_export(__DIR__ . '/../api/rechner-values.php', true) . '; rechner_snapshot_melden('
        . var_export('inhalt_' . $code, true) . ', ' . $day . ');';
    $processes = [];
    foreach (range(1, 4) as $_) {
        $processes[] = proc_open([PHP_BINARY, '-r', $snippet], [0 => ['pipe', 'r'], 1 => ['file', $log, 'a'], 2 => ['file', $log, 'a']], $pipes);
        fclose($pipes[0]);
    }
    foreach ($processes as $process) {
        assert_mail(proc_close($process) === 0, 'Prozessneustart ohne Doppelversand');
    }
    assert_mail(count(file($capture)) === 3, 'dauerhafte Drosselung über Prozesse');
    // Gleichzeitige Erstversuche, noch keine Reservierung vorhanden.
    $snippet = str_replace('inhalt_' . $code, 'parallel_' . $code, $snippet);
    $processes = [];
    foreach (range(1, 6) as $_) {
        $processes[] = proc_open([PHP_BINARY, '-r', $snippet], [0 => ['pipe', 'r'], 1 => ['file', $log, 'a'], 2 => ['file', $log, 'a']], $pipes);
        fclose($pipes[0]);
    }
    foreach ($processes as $process) {
        assert_mail(proc_close($process) === 0, 'paralleler Erstversuch beendet');
    }
    assert_mail(count(file($capture)) === 4, 'parallele Erstversuche senden nur einmal');
    file_put_contents($adapter, '<?php return static function (array $m): bool { file_put_contents('
        . var_export($capture, true) . ', "fehlgeschlagen\\n", FILE_APPEND | LOCK_EX); return false; };');
    rechner_snapshot_melden('fehler_' . $code, $day);
    rechner_snapshot_melden('fehler_' . $code, $day);
    assert_mail(count(file($capture)) === 5, 'ungewisser Versand nicht wiederholt');
    file_put_contents($configFile, '{kaputt');
    try {
        rechner_apps_script_url();
        throw new RuntimeException('ROT ungültige Konfiguration angenommen');
    } catch (RechnerValuesException $error) {
        assert_mail($error->publicCode === 'snapshot_config_invalid', 'ungültige Konfiguration geschlossen');
    }
} finally {
    file_put_contents($configFile, $previous ?? '{}');
}
