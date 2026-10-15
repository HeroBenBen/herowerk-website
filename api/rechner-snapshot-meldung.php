<?php

declare(strict_types=1);

/** Nie Fehlerdetails oder Zugangsdaten aus fremden Exceptions weiterreichen. */
function rechner_snapshot_melden(string $reason, ?int $now = null): void
{
    $reason = preg_replace('/[^a-z0-9_]/', '_', $reason);
    error_log('HeroWerk Rechner: snapshot_abgelehnt grund=' . $reason);
    $handle = false;
    try {
        $config = rechner_config();
        $adapter = $config['mail_adapter'] ?? '';
        if ($adapter === '') {
            error_log('HeroWerk Rechner: meldung_nicht_zugestellt grund=' . $reason . ' ursache=mail_adapter_fehlt');
            return;
        }
        $day = (new DateTimeImmutable('@' . ($now ?? time())))
            ->setTimezone(new DateTimeZone('Europe/Berlin'))->format('Y-m-d');
        $reservation = hash('sha256', $day . ':' . $reason);
        $path = RECHNER_RUNTIME_DIR . '/snapshot-meldungen.log';
        $handle = @fopen($path, 'c+');
        if ($handle === false || !@flock($handle, LOCK_EX)) {
            throw new RuntimeException('reservation_unavailable');
        }
        @chmod($path, 0600);
        $contents = stream_get_contents($handle);
        if ($contents === false || ($contents !== '' && !str_ends_with($contents, "\n"))) {
            throw new RuntimeException('reservation_invalid');
        }
        if (in_array($reservation, explode("\n", $contents), true)) {
            error_log('HeroWerk Rechner: meldung_unterdrueckt grund=' . $reason);
            return;
        }
        // Vor Versand dauerhaft reservieren. Ungewisser Versand wird nicht wiederholt.
        $entry = $reservation . "\n";
        if (fwrite($handle, $entry) !== strlen($entry) || !fflush($handle)
            || (function_exists('fsync') && !fsync($handle))) {
            throw new RuntimeException('reservation_write_failed');
        }
        flock($handle, LOCK_UN);
        fclose($handle);
        $handle = false;
        if (!is_file($adapter) || !is_readable($adapter)) {
            throw new RuntimeException('adapter_unavailable');
        }
        // Vertrag: private PHP-Datei liefert callable(array $meldung): bool.
        $send = require $adapter;
        if (!is_callable($send) || $send([
            'grund' => $reason,
            'tag' => $day,
            'betreff' => 'HeroWerk: Werte-Abzug abgewiesen',
            'text' => 'Der neue Werte-Abzug wurde abgewiesen. Grund: ' . $reason
                . '. Der vorhandene Stand bleibt erhalten; ohne gültigen Stand ist der Rechner nicht verfügbar.',
        ]) !== true) {
            throw new RuntimeException('transport_failed');
        }
        error_log('HeroWerk Rechner: meldung_zugestellt grund=' . $reason);
    } catch (Throwable $error) {
        error_log('HeroWerk Rechner: meldung_nicht_zugestellt grund=' . $reason);
    } finally {
        if (is_resource($handle)) {
            @flock($handle, LOCK_UN);
            fclose($handle);
        }
    }
}
