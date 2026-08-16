<?php

declare(strict_types=1);

require_once __DIR__ . '/../api/rechner-values.php';

if (!is_file(RECHNER_SNAPSHOT_FILE)) {
    echo 'ÜBERSPRUNGEN Geräte-Katalog-Struktur: ' . RECHNER_SNAPSHOT_FILE . " liegt nicht vor.\n";
    exit(0);
}

$body = file_get_contents(RECHNER_SNAPSHOT_FILE);
if ($body === false) {
    fwrite(STDERR, "FEHLER Geräte-Katalog-Struktur: Wertevorrat ist nicht lesbar.\n");
    exit(1);
}

try {
    $snapshot = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $error) {
    fwrite(STDERR, 'FEHLER Geräte-Katalog-Struktur: ungültiges JSON: ' . $error->getMessage() . "\n");
    exit(1);
}

$rows = $snapshot['sheets']['Geräte_Katalog'] ?? null;
if (!is_array($rows)) {
    fwrite(STDERR, "FEHLER Geräte-Katalog-Struktur: Blatt Geräte_Katalog fehlt im Wertevorrat.\n");
    exit(1);
}

$devices = [];
foreach (array_slice($rows, 8) as $offset => $row) {
    if (!is_array($row) || empty($row[0]) || empty($row[1])) {
        continue;
    }
    $devices[] = ['sheetRow' => $offset + 9, 'row' => $row];
}

if (count($devices) < 22) {
    fwrite(STDERR, 'FEHLER Geräte-Katalog-Struktur: nur ' . count($devices) . " Gerätezeilen ab Zeile 9, erwartet mindestens 22.\n");
    exit(1);
}

foreach ($devices as $device) {
    $value = $device['row'][19] ?? null;
    if ($value === null || trim((string) $value) === '') {
        fwrite(STDERR, 'FEHLER Geräte-Katalog-Struktur: Spalte T ist in Zeile ' . $device['sheetRow'] . " leer.\n");
        exit(1);
    }
}

echo 'PASS Geräte-Katalog-Struktur: ' . count($devices) . " Gerätezeilen, Spalte T vollständig.\n";
