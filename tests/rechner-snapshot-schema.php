<?php

declare(strict_types=1);

require __DIR__ . '/../api/rechner-values.php';

function snapshot_fixture(int $version): array
{
    $sheets = [];
    foreach (rechner_snapshot_sheet_names($version) as $name) {
        $sheets[$name] = [[$name]];
    }
    return ['service' => 'werte_snapshot', 'schemaVersion' => $version, 'sheets' => $sheets];
}

foreach ([1, 2] as $version) {
    $body = json_encode(snapshot_fixture($version), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    $validated = rechner_validate_snapshot($body);
    if ($validated['schemaVersion'] !== $version) {
        throw new RuntimeException('Snapshot-Schema v' . $version . ' wurde nicht gelesen.');
    }
}

$invalid = snapshot_fixture(1);
$invalid['sheets']['Geraete_Kennlinien'] = [[]];
try {
    rechner_validate_snapshot(json_encode($invalid, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
    throw new RuntimeException('Schema v1 mit v2-Zusatz wurde nicht abgewiesen.');
} catch (RechnerValuesException $error) {
    if ($error->publicCode !== 'snapshot_schema_invalid') {
        throw $error;
    }
}

echo "PASS Snapshot-Schema: v1 bleibt lesbar, v2 enthält zehn Tabellen.\n";
