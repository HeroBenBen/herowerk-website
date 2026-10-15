<?php

declare(strict_types=1);

// Die beiden freigegebenen Verträge müssen im selben Rechenkern bestehen.
$source = $argv[1] ?? dirname(__DIR__) . '/api';
require $source . '/rechner-values.php';
require $source . '/rechner-engine.php';

function integration_equal(mixed $actual, mixed $expected, string $case): void
{
    if ($actual !== $expected) {
        throw new RuntimeException($case . ': ' . json_encode($actual, JSON_UNESCAPED_UNICODE));
    }
    echo 'PASS ' . $case . "\n";
}

$classes = ['s', 'm', 'l', 'xl', 'xxl'];
$table = [['Klasse', 'Modell', 'Hausgroesse', 'kW', 'Endpreis_brutto', 'Eigenanteil', 'tafel']];
foreach ($classes as $i => $class) {
    $table[] = [$class, 'Anker ' . $class, '', '', 90000 + $i, 40000, ''];
    $table[] = [$class, 'Tafel ' . $class, '', '', 30000 + $i, $i === 0 ? '' : 0, 'ja'];
}
foreach ([1, 2] as $schema) {
    $sheets = ['Preise_Wolf' => $table, 'Preise_Vaillant' => $table];
    $prices = hw_rechner_route('preise', [], $sheets, $schema);
    foreach (['wolf', 'vaillant'] as $brand) {
        integration_equal(array_column($prices[$brand], 'modell'), array_map(static fn ($c) => 'Tafel ' . $c, $classes), "Schema $schema $brand Tafelauswahl");
        integration_equal(array_column($prices[$brand], 'eigen'), [null, 0, 0, 0, 0], "Schema $schema $brand leer und echte Null");
        integration_equal(array_column($prices[$brand], 'tafel'), array_fill(0, 5, 'ja'), "Schema $schema $brand Markerantwort");
        integration_equal(hw_get_prices($sheets, $brand), array_combine($classes, range(30000, 30004)), "Schema $schema $brand Förderpreise");
    }
    integration_equal(count(hw_read_price_table($sheets, 'Preise_Wolf')), 10, "Schema $schema vollständiger Rohleser");
    $without = array_map(static fn ($row) => array_slice($row, 0, 6), $table);
    $withoutSheets = ['Preise_Wolf' => $without, 'Preise_Vaillant' => $without];
    integration_equal(count(hw_rechner_route('preise', [], $withoutSheets, $schema)['wolf']), 10, "Schema $schema ohne Tafelkopf");
    foreach (['fehlend', 'doppelt', 'marker', 'preislos'] as $case) {
        $bad = $sheets;
        if ($case === 'fehlend') { $bad['Preise_Wolf'][2][6] = ''; }
        if ($case === 'doppelt') { $bad['Preise_Wolf'][1][6] = 'ja'; }
        if ($case === 'marker') { $bad['Preise_Wolf'][1][6] = 'nein'; }
        if ($case === 'preislos') { $bad['Preise_Wolf'][2][4] = 0; }
        $error = '';
        try { hw_rechner_route('preise', [], $bad, $schema); }
        catch (RuntimeException $e) { $error = $e->getMessage(); }
        integration_equal(str_contains($error, 'tafel'), true, "Schema $schema Tafelprüfung $case");
    }
}

$contract = json_decode(file_get_contents(__DIR__ . '/fixtures/rechner-snapshot-vertrag.json'), true, 512, JSON_THROW_ON_ERROR);
$snapshot = rechner_validate_snapshot(json_encode($contract['snapshot'], JSON_THROW_ON_ERROR));
$tables = rechner_schema3_tabellen_aufloesen($snapshot['sheets']);
$prices = hw_rechner_route('preise', [], $snapshot['sheets'], 3);
foreach (['wolf' => 'Preise_Wolf', 'vaillant' => 'Preise_Vaillant'] as $brand => $sheet) {
    integration_equal(count($prices[$brand]), 1, "Schema 3 $brand kleiner gültiger Bestand");
    integration_equal(array_key_exists('tafel', $prices[$brand][0]), false, "Schema 3 $brand bisherige Antwortform");
    integration_equal(hw_read_price_table($snapshot['sheets'], $sheet, $tables, true), hw_read_price_table($snapshot['sheets'], $sheet, $tables), "Schema 3 $brand keine Tafelverengung");
    integration_equal(array_values(hw_get_prices($snapshot['sheets'], $brand, $tables)), array_column($prices[$brand], 'brutto'), "Schema 3 $brand gemeinsame Förderpreise");
}
