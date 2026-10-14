<?php

declare(strict_types=1);

// Ausschließlich CLI-Prüfumgebung, kein Zugriff auf Produktionslaufzeiten.
$runtime = getenv('P3A_RUNTIME_DIR') ?: sys_get_temp_dir() . '/p3a-' . bin2hex(random_bytes(8));
if (!is_dir($runtime)) {
    mkdir($runtime, 0700, true);
}
define('RECHNER_RUNTIME_DIR', $runtime);
require __DIR__ . '/../api/rechner-values.php';
$fixture = json_decode(file_get_contents(__DIR__ . '/fixtures/rechner-snapshot-vertrag.json'), true, 512, JSON_THROW_ON_ERROR);
$base = $fixture['snapshot'];
function check(bool $ok, string $name): void
{
    if (!$ok) {
        throw new RuntimeException('ROT: ' . $name);
    }
    echo 'PASS ' . $name . "\n";
}
function encoded(array $snapshot): string
{
    return json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}
function rejected(array $snapshot, string $code, string $name): void
{
    try {
        rechner_validate_snapshot(encoded($snapshot));
    } catch (RechnerValuesException $error) {
        check($error->publicCode === $code, $name . ' grund=' . $error->publicCode);
        return;
    }
    throw new RuntimeException('ROT: ' . $name . ' wurde angenommen');
}
foreach ([1, 2] as $version) {
    $old = ['service' => 'werte_snapshot', 'schemaVersion' => $version, 'sheets' => []];
    foreach (rechner_snapshot_sheet_names($version) as $sheet) {
        $old['sheets'][$sheet] = [[$sheet]];
    }
    check(rechner_validate_snapshot(encoded($old)) === $old, 'Schema ' . $version . ' unverändert');
}
if (in_array('--ohne-nfc', $argv, true)) {
    check(!class_exists('Normalizer'), 'Normalizer tatsächlich nicht verfügbar');
    rejected($base, 'nfc_nicht_verfuegbar', 'Schema 3 geschlossen ohne NFC');
    exit;
}
check(rechner_snapshot_sheet_names(3) === $fixture['schema3_blattfolge'], 'gemeinsame Blattfolge');
check(rechner_preis_spalten() === $fixture['preis_spalten'], 'gemeinsame Preisköpfe');
check(rechner_validate_snapshot(encoded($base)) === $base, 'Schema 3 gültig');
check(rechner_inhaltsbytes($base['sheets'], 'lauf-test') === $fixture['kanonische_bytes'], 'unabhängige Referenzbytes');
check(hash('sha256', $fixture['kanonische_bytes']) === $fixture['inhalt_sha256'], 'fest eingebuchter Sollhash');
foreach ($fixture['zellfaelle'] as $case) {
    check(rechner_kanonische_zelle($case['eingabe']) === $case['soll'], 'Zellkanonisierung ' . $case['soll']);
}
foreach (['Preise_Wolf', 'Preise_Vaillant', 'Geräte_Katalog'] as $sheet) {
    $s = $base;
    $row = $sheet === 'Geräte_Katalog' ? 2 : 1;
    $col = $sheet === 'Geräte_Katalog' ? 39 : 9;
    $s['sheets'][$sheet][$row][$col] = 'fremder-lauf';
    rejected($s, 'snapshot_lauf_abweichend', 'gemischte Laufkennung ' . $sheet);
}
$s = $base;
$s['sheets']['Preise_Wolf'][1][4] += 0.01;
rejected($s, 'snapshot_inhalt_abweichend', 'Preisänderung 0,01 Euro bei gleicher Laufkennung');
$s = $base;
$s['sheets']['Geräte_Katalog'][2][1] .= ' geändert';
rejected($s, 'snapshot_inhalt_abweichend', 'Modellbezeichnung geändert');
$s = $base;
$s['sheets']['Preise_Vaillant'][1][1] .= ' geändert';
rejected($s, 'snapshot_inhalt_abweichend', 'Modellbezeichnung im Preisblatt geändert');
$s = $base;
$s['sheets'] = array_reverse($s['sheets'], true);
rejected($s, 'snapshot_schema_invalid', 'falsche Blattreihenfolge');
$s = $base;
$s['sheets']['Geräte_Katalog'][2][3] = 123.45;
$s['sheets']['Geräte_Katalog'][3][1] = 'Ignorierte Sonderplanung';
check(rechner_validate_snapshot(encoded($s)) === $s, 'Technik und Auswahl nein ungebunden');
$s = $base;
$s['sheets']['Preise_Wolf'][1][7] = '';
rejected($s, 'snapshot_geraet_id_fehlt', 'Preiszeile ohne Gerätekennung');
$s = $base;
$s['sheets']['Preise_Wolf'][0][7] = 'falscher_kopf';
rejected($s, 'snapshot_kopfzeile_fehlt', 'fehlender Pflichtkopf');
$s = $base;
$s['sheets']['Geräte_Katalog'][1][] = 'Modell';
rejected($s, 'snapshot_kopfzeile_mehrdeutig', 'doppelter Pflichtkopf');
$s = $base;
$s['sheets']['Referenz_Laeufe'][1][3] = '';
rejected($s, 'snapshot_aktiver_lauf_uneindeutig', 'kein aktiver Lauf');
$s = $base;
$s['sheets']['Referenz_Laeufe'][] = $s['sheets']['Referenz_Laeufe'][1];
rejected($s, 'snapshot_aktiver_lauf_uneindeutig', 'mehrere aktive Läufe');
$s = $base;
$s['sheets']['Referenz_Laeufe'][1][3] = 'true';
rejected($s, 'snapshot_aktiv_ungueltig', 'ungültiges Aktivmerkmal');
// Verschieben statt Buchstabenlesen: gleiche Inhalte ergeben weiterhin gleichen Hash.
$s = $base;
foreach (['Preise_Wolf', 'Preise_Vaillant'] as $sheet) {
    $s['sheets'][$sheet] = array_map('array_reverse', $s['sheets'][$sheet]);
}
$s['sheets']['Geräte_Katalog'] = array_map('array_reverse', $s['sheets']['Geräte_Katalog']);
$s['sheets']['Referenz_Laeufe'] = array_map('array_reverse', $s['sheets']['Referenz_Laeufe']);
check(rechner_validate_snapshot(encoded($s)) === $s, 'Spaltenpositionen beliebig, Köpfe maßgeblich');
$s = $base;
$s['sheets']['Geräte_Katalog'][2][2] = false;
rejected($s, 'snapshot_zelltyp_ungueltig', 'Kaskade bleibt Text');
$s = $base;
$s['sheets']['Preise_Wolf'][1][1] = 'Wärmepumpe';
check(rechner_validate_snapshot(encoded($s)) === $s, 'NFC und Rand-Leerzeichen gleichwertig');
