<?php
/**
 * Zeitgesteuerte Auffrischung des Wertevorrats für den PHP-Rechenkern.
 */

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "FEHLER: Dieses Skript darf nur über die Kommandozeile ausgeführt werden.\n";
    exit(1);
}

require_once __DIR__ . '/rechner-values.php';

const RECHNER_ZEITPLAN_LOCK_WAIT_MILLISECONDS = 3000;

try {
    $ausgefuehrt = rechner_mit_snapshot_sperre(static function ($lockHandle): void {
        unset($lockHandle);
        $fresh = rechner_fetch_snapshot(rechner_snapshot_key());
        rechner_write_snapshot_atomic($fresh);
    }, RECHNER_ZEITPLAN_LOCK_WAIT_MILLISECONDS);

    if (!$ausgefuehrt) {
        echo "OK: Auffrischung übersprungen, ein anderer Lauf ist bereits aktiv.\n";
        exit(0);
    }

    echo "OK: Wertevorrat erfolgreich aufgefrischt.\n";
    exit(0);
} catch (Throwable $error) {
    $code = $error instanceof RechnerValuesException
        ? $error->publicCode
        : 'unexpected_' . get_class($error);
    fwrite(
        STDERR,
        'FEHLER: Wertevorrat nicht aufgefrischt (' . $code . "). Der vorhandene Stand bleibt erhalten.\n"
    );
    exit(1);
}
