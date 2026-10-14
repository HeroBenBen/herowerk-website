<?php

declare(strict_types=1);

/** Gemeinsamer Schema-3-Vertrag für Prüfer und Verbraucher, keine Präfixsuche. */
function rechner_schema3_katalog_koepfe(): array
{
    return array_merge(rechner_katalog_spalten(), [
        'WP NAT W35' => ['WP NAT W35'],
        'WP NAT W55' => ['WP NAT W55'],
        'nutzb. Heizstab W35' => ['nutzb. Heizstab W35'],
        'nutzb. Heizstab W55' => ['nutzb. Heizstab W55'],
        'Auslegungsgrenze W35 (WP÷0,80)' => ['Auslegungsgrenze W35 (WP÷0,80)'],
        'Auslegungsgrenze W55 (WP÷0,80)' => ['Auslegungsgrenze W55 (WP÷0,80)'],
        'Reserve mit Heizstab W55 (techn. Max, NICHT Auslegung)' => ['Reserve mit Heizstab W55 (techn. Max, NICHT Auslegung)'],
        'Stand' => ['Stand'],
        'Auslegungsgrenze W35 @A-10' => ['Auslegungsgrenze W35 @A-10', 'Auslegungsgrenze W35 @A-10 (WP÷0,80)'],
        'Auslegungsgrenze W55 @A-10' => ['Auslegungsgrenze W55 @A-10', 'Auslegungsgrenze W55 @A-10 (WP÷0,80)'],
        'WP NAT W35 @A-10' => ['WP NAT W35 @A-10', 'WP NAT W35 @A-10 (Treiber)'],
        'WP NAT W55 @A-10' => ['WP NAT W55 @A-10', 'WP NAT W55 @A-10 (Treiber)'],
        'Mindest-Leistungsanteil' => ['Mindest-Leistungsanteil', 'Mindest-Leistungsanteil (Auswahlkriterium; 1,00 = monovalent ohne Heizstab)'],
        'Puffer (' => ['Puffer (', 'Puffer (Vaillant-Werkzeug, gemessen 17.08.2026)'],
        'Puffer Liter' => ['Puffer Liter'],
        'Puffer, groessere Variante' => ['Puffer, groessere Variante'],
        'ohne Puffer moeglich' => ['ohne Puffer moeglich', 'ohne Puffer moeglich (nur bei Flaechenheizung)'],
        'Art der Leistungszahl in D, E, Q, R (T546, 19.08.2026)' => ['Art der Leistungszahl in D, E, Q, R (T546, 19.08.2026)'],
        'Betriebspunkt der Leistungszahl (T546, 19.08.2026)' => ['Betriebspunkt der Leistungszahl (T546, 19.08.2026)'],
        'Beleg der Leistungszahl, Dokument und Fundstelle (T546, 19.08.2026)' => ['Beleg der Leistungszahl, Dokument und Fundstelle (T546, 19.08.2026)'],
        'Mindest-Modulationsleistung W35 bei minus 11 Grad, kW (T463, 19.08.2026)' => ['Mindest-Modulationsleistung W35 bei minus 11 Grad, kW (T463, 19.08.2026)'],
        'Mindest-Modulationsleistung W55 bei minus 11 Grad, kW (T463, 19.08.2026)' => ['Mindest-Modulationsleistung W55 bei minus 11 Grad, kW (T463, 19.08.2026)'],
        'Beleg der Modulationsangabe (T463, 19.08.2026); bei Kaskaden gilt der Wert EINES Geraetes' => ['Beleg der Modulationsangabe (T463, 19.08.2026); bei Kaskaden gilt der Wert EINES Geraetes'],
        'Urspruenglicher Werkzeugwert W55 bei minus 11 Grad vor der konservativen Kappung (T428, 20.08.2026)' => ['Urspruenglicher Werkzeugwert W55 bei minus 11 Grad vor der konservativen Kappung (T428, 20.08.2026)'],
        'Urspruenglicher Werkzeugwert W55 bei minus 10 Grad vor der konservativen Kappung (T428, 20.08.2026)' => ['Urspruenglicher Werkzeugwert W55 bei minus 10 Grad vor der konservativen Kappung (T428, 20.08.2026)'],
        'Empfehlung bis kW W55' => ['Empfehlung bis kW W55'],
        'Empfehlung bis kW W35' => ['Empfehlung bis kW W35'],
        'Herstellerfreigabe bis kW W55' => ['Herstellerfreigabe bis kW W55'],
        'Herstellerfreigabe bis kW W35' => ['Herstellerfreigabe bis kW W35'],
    ]);
}

function rechner_spalten_ohne_alias(array $names): array
{
    return array_combine($names, array_map(static fn (string $name): array => [$name], $names));
}

function rechner_zeile_leer(array $row): bool
{
    foreach ($row as $cell) {
        if ($cell !== null && (!is_string($cell) || rechner_kanonische_zelle($cell) !== '')) {
            return false;
        }
    }
    return true;
}

/** Fehlende Schlusszellen auffüllen, niemals vorhandene Zellindizes umnummerieren. */
function rechner_schema3_zeile_auffuellen(array $row, int $width): array
{
    if (!array_is_list($row)) {
        throw new RechnerValuesException('snapshot_zeile_ungueltig');
    }
    return array_pad($row, max(count($row), $width), null);
}

function rechner_schema3_auswahl(mixed $value): bool
{
    return strtolower(rechner_kanonische_zelle($value, true)) === 'ja';
}

/** Kein Parsen von Text: exakt dieser numerische Wert wird gehasht und gerechnet. */
function rechner_schema3_zahl(mixed $value, bool $nullable = false): int|float|null
{
    if ($nullable && ($value === null || $value === '')) {
        return null;
    }
    if ((!is_int($value) && !is_float($value)) || !is_finite((float) $value)) {
        throw new RechnerValuesException('snapshot_zahltyp_ungueltig');
    }
    // Die geprüfte kanonische JSON-Zahl bestimmt den Typ, auch an Integergrenzen.
    // Kein Eingabetext wird geparst: dessen Typ wurde oben bereits abgewiesen.
    $normalized = json_decode(rechner_dezimal($value), true, 512, JSON_THROW_ON_ERROR);
    return $normalized;
}

/** Historische Parameterzeilen sind keine Geräte, nur diese Schlüssel sind zulässig. */
function rechner_schema3_vorspann(array $row): bool
{
    $filled = array_filter($row, static fn ($v): bool => $v !== null && $v !== '');
    if (count($filled) === 1 && is_string(reset($filled))) {
        return true;
    }
    return in_array($row[0] ?? null, ['nat_c', 'auslegungsfaktor', 'heizstab_jahresanteil_max',
        'heizstab_wolf', 'heizstab_vaillant', 'sollband_unten'], true)
        && count(array_filter(array_slice($row, 4), static fn ($v): bool => $v !== null && $v !== '')) === 0;
}

/** Eindeutiger Kopf und vollständige Zeilenmenge einschließlich Prüfung vor dem Kopf. */
function rechner_schema3_tabelle(array $rows, array $columns, array $required, bool $catalog = false): array
{
    if (!array_is_list($rows)) {
        throw new RechnerValuesException('snapshot_zeile_ungueltig');
    }
    $aliases = [];
    foreach ($columns as $name => $names) {
        foreach ($names as $alias) {
            $aliases[$alias] = $name;
        }
    }
    $table = null;
    foreach ($rows as $number => $row) {
        if (!is_array($row) || !array_is_list($row)) {
            throw new RechnerValuesException('snapshot_zeile_ungueltig');
        }
        if (rechner_zeile_leer($row)) {
            continue;
        }
        $map = [];
        $duplicate = false;
        foreach ($row as $index => $cell) {
            $text = is_string($cell) ? rechner_kanonische_zelle($cell) : '';
            if (isset($aliases[$text])) {
                $name = $aliases[$text];
                if (isset($map[$name])) {
                    $duplicate = true;
                }
                $map[$name] = $index;
            }
        }
        $completeHeader = count(array_diff($required, array_keys($map))) === 0;
        if ($completeHeader) {
            if ($table !== null || $duplicate) {
                throw new RechnerValuesException('snapshot_kopfzeile_mehrdeutig');
            }
            foreach ($row as $cell) {
                $text = rechner_kanonische_zelle($cell, true);
                if (!$catalog && $text !== '' && !isset($aliases[$text])) {
                    throw new RechnerValuesException('snapshot_kopfzeile_unbekannt');
                }
            }
            $table = ['headerRow' => $number, 'headerWidth' => count($row), 'columns' => $map, 'rows' => [], 'sourceRows' => []];
        } elseif ($table === null) {
            if (!$catalog || !rechner_schema3_vorspann($row)) {
                throw new RechnerValuesException('snapshot_kopfzeile_fehlt');
            }
        } else {
            foreach ($row as $index => $cell) {
                if (!$catalog && !in_array($index, $table['columns'], true) && rechner_kanonische_zelle($cell) !== '') {
                    throw new RechnerValuesException('snapshot_spalte_ohne_kopf');
                }
            }
            // Schlüssel erhalten den Abstand zum Kopf für unveränderte Gleichstandsauswahl.
            $table['rows'][$number - $table['headerRow'] - 1] = $row;
            $table['sourceRows'][$number - $table['headerRow'] - 1] = $number;
        }
    }
    if ($table === null) {
        throw new RechnerValuesException('snapshot_kopfzeile_fehlt');
    }
    return $table;
}

/** Gebundene Zellidentitäten, die Verbraucher als Text oder Textschlüssel nutzen. */
function rechner_schema3_textverbraucher(string $sheet): array
{
    return match ($sheet) {
        'Preise_Wolf', 'Preise_Vaillant' => ['Klasse', 'Modell', 'Hausgroesse', 'kW'],
        'Geräte_Katalog' => ['Marke', 'Modell', 'Baureihe'],
        default => [],
    };
}

/** Einziger Schema-3-Auflöser. Wird vor der Annahme und im Rechenkern verwendet. */
function rechner_schema3_tabellen_aufloesen(array $sheets): array
{
    if (!class_exists('Normalizer')) {
        throw new RechnerValuesException('nfc_nicht_verfuegbar');
    }
    $tables = [];
    foreach (['Preise_Wolf', 'Preise_Vaillant', 'Geräte_Katalog', 'Referenz_Laeufe'] as $sheet) {
        $catalog = $sheet === 'Geräte_Katalog';
        $reference = $sheet === 'Referenz_Laeufe';
        $names = $reference ? ['lauf_id', 'laufart', 'status', 'aktiv', 'inhalt_sha256', 'veroeffentlicht_am']
            : ($catalog ? array_keys(rechner_katalog_spalten()) : rechner_preis_spalten());
        $columns = $catalog ? rechner_schema3_katalog_koepfe() : rechner_spalten_ohne_alias($names);
        $required = $catalog ? array_merge($names, ['WP NAT W35', 'WP NAT W55',
            'Auslegungsgrenze W35 (WP÷0,80)', 'Auslegungsgrenze W55 (WP÷0,80)',
            'Auslegungsgrenze W35 @A-10', 'Auslegungsgrenze W55 @A-10',
            'WP NAT W35 @A-10', 'WP NAT W55 @A-10', 'Mindest-Leistungsanteil', 'Stand']) : $names;
        $table = rechner_schema3_tabelle($sheets[$sheet], $columns, $required, $catalog);
        foreach ($table['rows'] as &$row) {
            $width = $table['headerWidth'];
            $row = rechner_schema3_zeile_auffuellen($row, $width);
            $map = $table['columns'];
            if ($catalog) {
                $selected = rechner_schema3_auswahl($row[$map['Auswahl']] ?? null);
            }
            foreach ($names as $name) {
                $index = $map[$name];
                $value = $row[$index] ?? null;
                $money = $catalog ? $name === 'Brutto €'
                    : in_array($name, ['Endpreis_brutto', 'Eigenanteil', 'Endpreis_brutto_ohne_Warmwasser'], true);
                if ($money && (!$catalog || $selected)) {
                    $row[$index] = rechner_schema3_zahl($value, true);
                } elseif (in_array($name, rechner_schema3_textverbraucher($sheet), true) && (!$catalog || $selected)) {
                    // Gleicher Hashtext wird auch vor Gerätewahl und Antwortaufbau konsumiert.
                    $row[$index] = rechner_kanonische_zelle($value);
                } elseif (is_string($value)) {
                    $row[$index] = rechner_kanonische_zelle($value);
                }
            }
        }
        unset($row);
        $tables[$sheet] = $table;
    }
    return $tables;
}

/** Nach erfolgreicher Integritätsprüfung: dieselben Geldwerte speichern und rechnen. */
function rechner_schema3_geld_normalisieren(array $snapshot): array
{
    foreach (rechner_schema3_tabellen_aufloesen($snapshot['sheets']) as $sheet => $table) {
        $catalog = $sheet === 'Geräte_Katalog';
        if ($sheet === 'Referenz_Laeufe') {
            continue;
        }
        $names = $catalog ? ['Brutto €'] : ['Endpreis_brutto', 'Eigenanteil', 'Endpreis_brutto_ohne_Warmwasser'];
        foreach ($table['rows'] as $offset => $row) {
            if ($catalog && !rechner_schema3_auswahl($row[$table['columns']['Auswahl']] ?? null)) {
                continue;
            }
            $sourceRow = $table['sourceRows'][$offset];
            $original = $snapshot['sheets'][$sheet][$sourceRow];
            $original = rechner_schema3_zeile_auffuellen($original, $table['headerWidth']);
            foreach ($names as $name) {
                $column = $table['columns'][$name];
                $original[$column] = $row[$column];
            }
            $snapshot['sheets'][$sheet][$sourceRow] = $original;
        }
    }
    return $snapshot;
}
