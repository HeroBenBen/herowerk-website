<?php
/**
 * Dauerhafte Werte-Versorgung für den PHP-Rechenkern.
 *
 * Der Snapshot und der Schlüssel liegen im privaten Laufzeitordner neben /website.
 * Keine Datei dieses Moduls enthält einen echten Schlüssel.
 */

declare(strict_types=1);

final class RechnerValuesException extends RuntimeException
{
    public function __construct(public readonly string $publicCode, string $detail = '')
    {
        parent::__construct($detail !== '' ? $detail : $publicCode);
    }
}

/** @return list<string> */
function rechner_snapshot_sheet_names(): array
{
    return [
        'KV_Parameter',
        'KV_FoerderPerioden',
        'Förder_Parameter',
        'Dimensionierung',
        'Preise_Wolf',
        'Preise_Vaillant',
        'Geräte_Katalog',
        'Klima_PLZ',
        'Fördervorschuss',
    ];
}

function rechner_snapshot_key(): string
{
    if (!is_file(RECHNER_SNAPSHOT_KEY_FILE)) {
        throw new RechnerValuesException('snapshot_key_file_missing');
    }

    $raw = file_get_contents(RECHNER_SNAPSHOT_KEY_FILE);
    if ($raw === false) {
        throw new RechnerValuesException('snapshot_key_file_unreadable');
    }

    // Die Serverdatei endet absichtlich mit einem Zeilenumbruch.
    $key = trim($raw);
    if ($key === '') {
        throw new RechnerValuesException('snapshot_key_empty');
    }

    return $key;
}

/** @return array{service:string,schemaVersion:int,sheets:array<string,array<int,array<int,mixed>>>} */
function rechner_validate_snapshot(string $body): array
{
    try {
        $snapshot = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new RechnerValuesException('snapshot_json_invalid', $error->getMessage());
    }

    if (!is_array($snapshot)
        || ($snapshot['service'] ?? null) !== 'werte_snapshot'
        || ($snapshot['schemaVersion'] ?? null) !== 1
        || !is_array($snapshot['sheets'] ?? null)
        || array_keys($snapshot['sheets']) !== rechner_snapshot_sheet_names()) {
        throw new RechnerValuesException('snapshot_schema_invalid');
    }

    foreach ($snapshot['sheets'] as $rows) {
        if (!is_array($rows)) {
            throw new RechnerValuesException('snapshot_schema_invalid');
        }
    }

    return $snapshot;
}

/** @return array{body:string,status:int,errno:int,error:string} */
function rechner_curl_get(string $url, int $timeoutSeconds): array
{
    if (!function_exists('curl_init')) {
        throw new RechnerValuesException('curl_unavailable');
    }

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_HTTPGET => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_CONNECTTIMEOUT => min(5, $timeoutSeconds),
        CURLOPT_TIMEOUT => $timeoutSeconds,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_USERAGENT => 'HeroWerk-Rechner-PHP/1.0',
        CURLOPT_HEADER => false,
    ]);

    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    return [
        'body' => is_string($body) ? $body : '',
        'status' => $status,
        'errno' => $errno,
        'error' => $error,
    ];
}

/** @return array{service:string,schemaVersion:int,sheets:array<string,array<int,array<int,mixed>>>} */
function rechner_fetch_snapshot(string $key): array
{
    $query = http_build_query([
        'action' => 'werte_snapshot',
        'key' => $key,
        'origin' => 'https://herowerk.de',
    ], '', '&', PHP_QUERY_RFC3986);
    $response = rechner_curl_get(APPS_SCRIPT_URL . '?' . $query, RECHNER_SNAPSHOT_FETCH_TIMEOUT_SECONDS);

    if ($response['errno'] !== 0) {
        throw new RechnerValuesException('snapshot_upstream_unreachable', $response['error']);
    }
    if ($response['status'] < 200 || $response['status'] >= 400) {
        throw new RechnerValuesException('snapshot_upstream_http_' . $response['status']);
    }

    return rechner_validate_snapshot($response['body']);
}

/** @param array<string,mixed> $snapshot */
function rechner_write_snapshot_atomic(array $snapshot): void
{
    if (!is_dir(RECHNER_RUNTIME_DIR) || !is_writable(RECHNER_RUNTIME_DIR)) {
        throw new RechnerValuesException('snapshot_runtime_not_writable');
    }

    try {
        $body = json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new RechnerValuesException('snapshot_encode_failed', $error->getMessage());
    }

    $temporary = tempnam(RECHNER_RUNTIME_DIR, '.werte_snapshot.');
    if ($temporary === false) {
        throw new RechnerValuesException('snapshot_tempfile_failed');
    }

    $handle = fopen($temporary, 'wb');
    if ($handle === false) {
        @unlink($temporary);
        throw new RechnerValuesException('snapshot_tempfile_failed');
    }

    $written = fwrite($handle, $body);
    if ($written !== strlen($body)) {
        fclose($handle);
        @unlink($temporary);
        throw new RechnerValuesException('snapshot_write_failed');
    }
    fflush($handle);
    if (function_exists('fsync')) {
        fsync($handle);
    }
    fclose($handle);
    chmod($temporary, 0600);

    if (!rename($temporary, RECHNER_SNAPSHOT_FILE)) {
        @unlink($temporary);
        throw new RechnerValuesException('snapshot_rename_failed');
    }
}

/** @return array{service:string,schemaVersion:int,sheets:array<string,array<int,array<int,mixed>>>}|null */
function rechner_read_snapshot_file(): ?array
{
    if (!is_file(RECHNER_SNAPSHOT_FILE)) {
        return null;
    }

    $body = file_get_contents(RECHNER_SNAPSHOT_FILE);
    if ($body === false) {
        error_log('HeroWerk Rechner: snapshot_read_failed');
        return null;
    }

    try {
        return rechner_validate_snapshot($body);
    } catch (RechnerValuesException $error) {
        error_log('HeroWerk Rechner: snapshot_file_invalid code=' . $error->publicCode);
        return null;
    }
}

function rechner_log_snapshot_age(int $modifiedAt): void
{
    $ageSeconds = max(0, time() - $modifiedAt);
    if ($ageSeconds > RECHNER_SNAPSHOT_MAX_QUIET_AGE_SECONDS) {
        $ageHours = $ageSeconds / 3600;
        error_log(sprintf('HeroWerk Rechner: snapshot_older_than_24h age_hours=%.1f', $ageHours));
    }
}

/**
 * @return array{service:string,schemaVersion:int,sheets:array<string,array<int,array<int,mixed>>>}
 */
function rechner_load_snapshot(): array
{
    // Immer zuerst lesen: fehlende oder leere Konfiguration muss sichtbar bleiben,
    // auch wenn zufällig noch eine Snapshot-Datei vorhanden ist.
    $key = rechner_snapshot_key();
    $cached = rechner_read_snapshot_file();
    $modifiedAt = $cached !== null ? (int) (filemtime(RECHNER_SNAPSHOT_FILE) ?: 0) : 0;
    $ageSeconds = $modifiedAt > 0 ? max(0, time() - $modifiedAt) : PHP_INT_MAX;

    if ($cached !== null && $ageSeconds < RECHNER_SNAPSHOT_TTL_SECONDS) {
        rechner_log_snapshot_age($modifiedAt);
        return $cached;
    }

    try {
        $fresh = rechner_fetch_snapshot($key);
        rechner_write_snapshot_atomic($fresh);
        return $fresh;
    } catch (RechnerValuesException $error) {
        error_log('HeroWerk Rechner: snapshot_refresh_failed code=' . $error->publicCode);
        if ($cached !== null) {
            rechner_log_snapshot_age($modifiedAt);
            return $cached;
        }
        throw new RechnerValuesException('snapshot_cold_start_failed', $error->publicCode);
    }
}

/** @return array{body:string,status:int} */
function rechner_forward_google(string $rawQuery): array
{
    $target = APPS_SCRIPT_URL . ($rawQuery !== '' ? '?' . $rawQuery : '');
    $response = rechner_curl_get($target, RECHNER_GOOGLE_FORWARD_TIMEOUT_SECONDS);
    if ($response['errno'] !== 0) {
        throw new RechnerValuesException('upstream_unreachable', $response['error']);
    }
    if ($response['status'] < 200 || $response['status'] >= 400) {
        throw new RechnerValuesException('upstream_http_' . $response['status']);
    }

    return ['body' => $response['body'], 'status' => $response['status']];
}
