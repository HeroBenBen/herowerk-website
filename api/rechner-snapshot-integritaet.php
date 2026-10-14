<?php

declare(strict_types=1);

/** Vertragsfestlegung T1087, gemeinsamer Gegenbeleg: tests/fixtures/rechner-snapshot-vertrag.json. */
function rechner_preis_spalten(): array
{
    return ['Klasse', 'Modell', 'Hausgroesse', 'kW', 'Endpreis_brutto', 'Eigenanteil',
        'Hinweis', 'geraet_id', 'Endpreis_brutto_ohne_Warmwasser', 'lauf_id',
        'veroeffentlicht_am', 'technik_l', 'technik_m', 'technik_n', 'technik_o',
        'technik_p', 'technik_q', 'tafel'];
}

function rechner_katalog_spalten(): array
{
    return [
        'Marke' => ['Marke'],
        'Modell' => ['Modell'],
        'Kaskade' => ['Kaskade'],
        'Baureihe' => ['Baureihe', 'Baureihe (Kaskaden-Untergrenze gilt je Baureihe, GF 14.08.2026)'],
        'Aussengeraete' => ['Aussengeraete', 'Aussengeraete (Anzahl je Katalogzeile; Traeger der Zwei-Geraete-Grenze)'],
        'Auswahl' => ['Auswahl', 'Auswahl (ja gleich vom Konfigurator waehlbar; sonst Sonderplanung. GF-Entscheid 01.09.2026, Entscheid 3)'],
        'Brutto €' => ['Brutto €'],
        'geraet_id' => ['geraet_id'],
        'lauf_id' => ['lauf_id'],
    ];
}

/** Dezimaldarstellung ohne Exponent, ohne Rundung auf Geldstellen. */
function rechner_dezimal(int|float $value): string
{
    if (is_float($value) && !is_finite($value)) {
        throw new RechnerValuesException('snapshot_zelltyp_ungueltig');
    }
    $previous = ini_get('serialize_precision');
    ini_set('serialize_precision', '-1');
    try {
        $raw = strtolower(json_encode($value, JSON_THROW_ON_ERROR));
    } finally {
        ini_set('serialize_precision', (string) $previous);
    }
    $negative = str_starts_with($raw, '-');
    $raw = ltrim($raw, '-');
    $parts = explode('e', $raw);
    $mantissa = $parts[0];
    $exponent = isset($parts[1]) ? (int) $parts[1] : 0;
    $point = strpos($mantissa, '.');
    $position = ($point === false ? strlen($mantissa) : $point) + $exponent;
    $digits = str_replace('.', '', $mantissa);
    if ($position <= 0) {
        $decimal = '0.' . str_repeat('0', -$position) . $digits;
    } elseif ($position >= strlen($digits)) {
        $decimal = $digits . str_repeat('0', $position - strlen($digits));
    } else {
        $decimal = substr($digits, 0, $position) . '.' . substr($digits, $position);
    }
    if (str_contains($decimal, '.')) {
        $decimal = rtrim(rtrim($decimal, '0'), '.');
    }
    return ($negative && $decimal !== '0' ? '-' : '') . $decimal;
}

function rechner_kanonische_zelle(mixed $value, bool $textOnly = false): string
{
    if ($value === null || $value === '') {
        return '';
    }
    if (!$textOnly && (is_int($value) || is_float($value))) {
        return rechner_dezimal($value);
    }
    if (!is_string($value)) {
        throw new RechnerValuesException('snapshot_zelltyp_ungueltig');
    }
    $normal = Normalizer::normalize($value, Normalizer::FORM_C);
    if ($normal === false) {
        throw new RechnerValuesException('snapshot_text_ungueltig');
    }
    $trimmed = preg_replace('/\A[\s\p{Z}]+|[\s\p{Z}]+\z/u', '', $normal);
    if ($trimmed === null) {
        throw new RechnerValuesException('snapshot_text_ungueltig');
    }
    return $trimmed;
}

require_once __DIR__ . '/rechner-snapshot-tabellen.php';

/** Liefert exakt die gemeinsamen Hashbytes, keine Referenz-Lauf-Metadaten. */
function rechner_inhaltsbytes(array $sheets, string $activeId): string
{
    $document = [];
    $tables = rechner_schema3_tabellen_aufloesen($sheets);
    foreach (['Preise_Wolf', 'Preise_Vaillant', 'Geräte_Katalog'] as $sheet) {
        $catalog = $sheet === 'Geräte_Katalog';
        $table = $tables[$sheet];
        $names = $catalog ? array_keys(rechner_katalog_spalten()) : rechner_preis_spalten();
        $canonicalRows = [];
        foreach ($table['rows'] as $row) {
            $map = $table['columns'];
            if ($catalog && !rechner_schema3_auswahl($row[$map['Auswahl']] ?? null)) {
                continue;
            }
            $id = rechner_kanonische_zelle($row[$map['geraet_id']] ?? null, true);
            $run = rechner_kanonische_zelle($row[$map['lauf_id']] ?? null, true);
            if ($id === '') {
                throw new RechnerValuesException('snapshot_geraet_id_fehlt');
            }
            if ($run !== $activeId) {
                throw new RechnerValuesException('snapshot_lauf_abweichend');
            }
            $canonical = [];
            foreach ($names as $name) {
                $canonical[] = rechner_kanonische_zelle($row[$map[$name]] ?? null,
                    in_array($name, ['Kaskade', 'Auswahl', 'geraet_id', 'lauf_id'], true));
            }
            $canonicalRows[] = $canonical;
        }
        if ($canonicalRows === []) {
            throw new RechnerValuesException('snapshot_preisbestand_leer');
        }
        $document[] = [$sheet, $canonicalRows];
    }
    return json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR);
}

function rechner_pruefe_integritaet(array $snapshot): void
{
    if (!class_exists('Normalizer')) {
        throw new RechnerValuesException('nfc_nicht_verfuegbar');
    }
    foreach ($snapshot['sheets'] as $rows) {
        if (!array_is_list($rows)) {
            throw new RechnerValuesException('snapshot_zeile_ungueltig');
        }
    }
    $table = rechner_schema3_tabellen_aufloesen($snapshot['sheets'])['Referenz_Laeufe'];
    $map = $table['columns'];
    $active = [];
    foreach ($table['rows'] as $row) {
        $flag = rechner_kanonische_zelle($row[$map['aktiv']] ?? null, true);
        if ($flag !== '' && $flag !== 'ja') {
            throw new RechnerValuesException('snapshot_aktiv_ungueltig');
        }
        if ($flag === 'ja') {
            $active[] = $row;
        }
    }
    if (count($active) !== 1) {
        throw new RechnerValuesException('snapshot_aktiver_lauf_uneindeutig');
    }
    $id = rechner_kanonische_zelle($active[0][$map['lauf_id']] ?? null, true);
    $expected = rechner_kanonische_zelle($active[0][$map['inhalt_sha256']] ?? null, true);
    if ($id === '' || preg_match('/\A[0-9a-f]{64}\z/', $expected) !== 1) {
        throw new RechnerValuesException('snapshot_laufkopf_ungueltig');
    }
    $actual = hash('sha256', rechner_inhaltsbytes($snapshot['sheets'], $id));
    if (!hash_equals($expected, $actual)) {
        throw new RechnerValuesException('snapshot_inhalt_abweichend');
    }
}
