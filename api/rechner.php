<?php
/**
 * HeroWerk-Rechner: Herkunft, Ratenbegrenzung, PHP-Rechenkern und Google-Rückfall.
 */

declare(strict_types=1);

if (!ob_start()) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"error":true,"message":"calculator_temporarily_unavailable"}';
    exit;
}
ini_set('display_errors', '0');
register_shutdown_function(static function (): void {
    rechner_shutdown();
});

date_default_timezone_set('Europe/Berlin');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsvoC0ZBtpZq8WY_hNS-BPN1gcTK5G1JAMfxSc5FpjWxQ2SbRLI9VqCnX8SRLO4meF/exec';

// Einzige Umschaltung zwischen PHP und dem bisherigen Google-Durchreichepfad.
const RECHNER_PHP_ENGINE_ENABLED = true;

// Die ersten zwei Wochen nur protokollieren. true aktiviert HTTP 429 ab Aufruf 61.
const RECHNER_RATE_LIMIT_ENFORCED = false;

const RECHNER_RATE_LIMIT_PER_MINUTE = 60;
const RECHNER_SNAPSHOT_TTL_SECONDS = 300;
const RECHNER_SNAPSHOT_MAX_QUIET_AGE_SECONDS = 86400;
const RECHNER_SNAPSHOT_FETCH_TIMEOUT_SECONDS = 12;
const RECHNER_GOOGLE_FORWARD_TIMEOUT_SECONDS = 15;

// /website/api/rechner.php -> privater Geschwisterordner /rechner-runtime.
const RECHNER_RUNTIME_DIR = __DIR__ . '/../../rechner-runtime';
const RECHNER_SNAPSHOT_FILE = RECHNER_RUNTIME_DIR . '/werte_snapshot.json';
const RECHNER_SNAPSHOT_KEY_FILE = RECHNER_RUNTIME_DIR . '/werte_snapshot_key.txt';
const RECHNER_SNAPSHOT_LOCK_FILE = RECHNER_RUNTIME_DIR . '/werte_snapshot.lock';

require_once __DIR__ . '/rechner-values.php';
require_once __DIR__ . '/rechner-engine.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function rechner_ausgabepuffer_leeren(): void
{
    while (ob_get_level() > 0) {
        if (!ob_end_flush()) {
            break;
        }
    }
    flush();
}

function rechner_schwerwiegender_abbruch(): bool
{
    $error = error_get_last();
    if (!is_array($error)) {
        return false;
    }

    return in_array((int) ($error['type'] ?? 0), [
        E_ERROR,
        E_PARSE,
        E_CORE_ERROR,
        E_COMPILE_ERROR,
        E_USER_ERROR,
        E_RECOVERABLE_ERROR,
    ], true);
}

function rechner_leere_fehlerantwort_absichern(): void
{
    if (!rechner_schwerwiegender_abbruch() || ob_get_length() !== 0) {
        return;
    }

    http_response_code(500);
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store');
    }
    echo '{"error":true,"message":"calculator_temporarily_unavailable"}';
}

function rechner_antwort_abschliessen(): string
{
    if (function_exists('fastcgi_finish_request')) {
        rechner_ausgabepuffer_leeren();
        fastcgi_finish_request();
        return 'fastcgi';
    }

    $bodyLength = ob_get_length();
    if ($bodyLength !== false && !headers_sent()) {
        header('Content-Length: ' . $bodyLength);
    }
    rechner_ausgabepuffer_leeren();
    return 'puffer';
}

function rechner_shutdown(): void
{
    rechner_leere_fehlerantwort_absichern();
    if (!function_exists('rechner_auffrischung_faellig') || !rechner_auffrischung_faellig()) {
        rechner_ausgabepuffer_leeren();
        return;
    }

    ignore_user_abort(true);
    // Drei Sekunden Reserve halten Sperrverwaltung und atomisches Schreiben
    // innerhalb einer festen Grenze, obwohl der Google-Abruf selbst zwölf Sekunden hat.
    if (function_exists('set_time_limit') && !@set_time_limit(15)) {
        error_log('HeroWerk Rechner: nachlauf_zeitgrenze_konnte_nicht_gesetzt_werden');
    }

    $abschlussweg = rechner_antwort_abschliessen();
    rechner_nachlauf_abschlussweg($abschlussweg);
    rechner_auffrischen_im_nachlauf();
}

function rechner_fail(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['error' => true, 'message' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function rechner_origin_header_allowed(string $value): bool
{
    $parts = parse_url(trim($value));
    if (!is_array($parts)
        || strtolower((string) ($parts['scheme'] ?? '')) !== 'https'
        || isset($parts['port'])
        || isset($parts['user'])
        || isset($parts['pass'])) {
        return false;
    }
    $host = strtolower((string) ($parts['host'] ?? ''));
    return $host === 'herowerk.de' || $host === 'www.herowerk.de';
}

function rechner_request_origin_allowed(array $server): bool
{
    $origin = trim((string) ($server['HTTP_ORIGIN'] ?? ''));
    if ($origin !== '' && rechner_origin_header_allowed($origin)) {
        return true;
    }
    $referer = trim((string) ($server['HTTP_REFERER'] ?? ''));
    if ($referer !== '' && rechner_origin_header_allowed($referer)) {
        return true;
    }
    return strtolower(trim((string) ($server['HTTP_SEC_FETCH_SITE'] ?? ''))) === 'same-origin';
}

/** @return array{count:int,limited:bool} */
function rechner_rate_limit(string $remoteAddress): array
{
    $directory = RECHNER_RUNTIME_DIR . '/rate-limit';
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('rate_limit_directory_unavailable');
    }
    $file = $directory . '/' . hash('sha256', $remoteAddress !== '' ? $remoteAddress : 'unknown') . '.json';
    $handle = fopen($file, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) {
            fclose($handle);
        }
        throw new RuntimeException('rate_limit_storage_unavailable');
    }
    $raw = stream_get_contents($handle);
    $state = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
    $bucket = intdiv(time(), 60);
    $count = is_array($state) && ($state['bucket'] ?? null) === $bucket
        ? (int) ($state['count'] ?? 0) + 1
        : 1;
    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode(['bucket' => $bucket, 'count' => $count], JSON_THROW_ON_ERROR));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    chmod($file, 0600);

    $limited = $count > RECHNER_RATE_LIMIT_PER_MINUTE;
    if ($limited) {
        error_log(sprintf(
            'HeroWerk Rechner: rate_limit_exceeded remote_hash=%s count=%d mode=%s',
            substr(hash('sha256', $remoteAddress), 0, 16),
            $count,
            RECHNER_RATE_LIMIT_ENFORCED ? 'enforce' : 'log'
        ));
    }
    return ['count' => $count, 'limited' => $limited];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    header('Allow: GET');
    rechner_fail(405, 'method_not_allowed');
}

if (!rechner_request_origin_allowed($_SERVER)) {
    rechner_fail(403, 'origin_not_allowed');
}

try {
    $rate = rechner_rate_limit((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
} catch (Throwable $error) {
    error_log('HeroWerk Rechner: ' . $error->getMessage());
    rechner_fail(500, 'rate_limit_unavailable');
}
if ($rate['limited'] && RECHNER_RATE_LIMIT_ENFORCED) {
    rechner_fail(429, 'rate_limit_exceeded');
}

$rawQuery = (string) ($_SERVER['QUERY_STRING'] ?? '');
if (!RECHNER_PHP_ENGINE_ENABLED) {
    try {
        echo rechner_forward_google($rawQuery)['body'];
        exit;
    } catch (RechnerValuesException $error) {
        rechner_fail(502, $error->publicCode);
    }
}

try {
    $snapshot = rechner_load_snapshot();
} catch (RechnerValuesException $error) {
    if ($error->publicCode !== 'snapshot_cold_start_failed') {
        rechner_fail(500, $error->publicCode);
    }

    // Einziger Kaltstart-Sonderfall: ohne Snapshot einmal die konkrete Bestandsroute nutzen.
    try {
        echo rechner_forward_google($rawQuery)['body'];
        exit;
    } catch (RechnerValuesException $fallbackError) {
        rechner_fail(502, 'calculator_temporarily_unavailable');
    }
}

$action = strtolower((string) ($_GET['action'] ?? 'health'));
try {
    $result = hw_rechner_route($action, $_GET, $snapshot['sheets']);
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    error_log('HeroWerk Rechner: calculation_failed action=' . $action . ' message=' . $error->getMessage());
    rechner_fail(500, $error->getMessage());
}
