<?php
/**
 * PHP-Port der sechs lesenden Apps-Script-Routen.
 * Fachlogik: apps-script/rechner-backend/Code.gs und kv_engine.gs.
 */

declare(strict_types=1);

function hw_js_round(float|int $value): int
{
    // JavaScript Math.round: halbe Werte gehen in Richtung +∞.
    return (int) floor((float) $value + 0.5);
}

function hw_js_string(mixed $value): string
{
    if ($value === null) {
        return '';
    }
    if ($value === true) {
        return 'true';
    }
    if ($value === false) {
        return 'false';
    }
    return (string) $value;
}

function hw_query_string(array $query, string $key, string $fallback = ''): string
{
    if (!array_key_exists($key, $query)) {
        return $fallback;
    }
    $value = hw_js_string($query[$key]);
    return trim($value) === '' ? $fallback : $value;
}

function hw_parse_float_prefix(string $value): ?float
{
    if (!preg_match('/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/', ltrim($value), $match)) {
        return null;
    }
    return (float) $match[0];
}

function hw_num(mixed $value, float|int $fallback): float|int
{
    if (is_int($value) || is_float($value)) {
        return $value;
    }
    $normalized = str_replace(',', '.', str_replace('.', '', hw_js_string($value)));
    $number = hw_parse_float_prefix($normalized);
    return $number ?? $fallback;
}

function hw_int(mixed $value, int $fallback): int
{
    $normalized = str_replace('.', '', hw_js_string($value));
    if (!preg_match('/^[\s]*([+-]?\d+)/', $normalized, $match)) {
        return $fallback;
    }
    return (int) $match[1];
}

function hw_kv_num(mixed $value, float|int $fallback): float|int
{
    if (is_int($value) || is_float($value)) {
        return $value;
    }
    $normalized = str_replace(',', '.', trim(hw_js_string($value)));
    if ($normalized === '') {
        return $fallback;
    }
    return hw_parse_float_prefix($normalized) ?? $fallback;
}

function hw_kv_bool(mixed $value, bool $fallback): bool
{
    if ($value === null || $value === '') {
        return $fallback;
    }
    return in_array(strtolower(trim(hw_js_string($value))), ['1', 'true', 'ja'], true);
}

/** @param list<string> $allowed */
function hw_kv_enum(mixed $value, array $allowed, string $fallback): string
{
    $candidate = trim(hw_js_string($value));
    return in_array($candidate, $allowed, true) ? $candidate : $fallback;
}

function hw_get_num(array $map, string $key, float|int $fallback): float|int
{
    return hw_num($map[$key] ?? null, $fallback);
}

function hw_round1(float|int $value): float|int
{
    return hw_js_round($value * 10) / 10;
}

function hw_key(string $value): string
{
    return str_replace('-', '_', $value);
}

/**
 * Gebaeudefaktor je Bauform. Der Rueckfall ist typabhaengig, nicht 1.0 fuer alles:
 * fehlt der Schluessel im Blatt, wuerde sonst jede Bauform wie das freistehende
 * Einfamilienhaus gerechnet. Genau das ist am 14.08.2026 beim Reihenmittelhaus passiert,
 * das ueberhaupt keinen Blatt-Eintrag hatte und dadurch rund 18 Prozent zu gross auslegte.
 * Das Reihenmittelhaus traegt bewusst denselben Wert wie die uebrige Reihenhaus-Familie;
 * ein eigener, kleinerer Wert waere eine neue Annahme und braucht eine Quelle.
 *
 * @param array<string,mixed> $d
 */
function hw_gebaeude_faktor(array $d, string $gebaeude): float|int
{
    $rueckfall = [
        'efh' => 1.0, 'dhh' => 0.9, 'rh' => 0.85, 'rh_end' => 0.85,
        'rh_mitte' => 0.85, 'zfh' => 0.95, 'mfh' => 0.85,
    ];
    $key = hw_key($gebaeude);
    return hw_get_num($d, 'gebaeudef_' . $key, $rueckfall[$key] ?? 1.0);
}

/**
 * BAUTEILWEISES VERFAHREN DES BUNDESVERBANDS WAERMEPUMPE, Bauwerte in W/(m²·K).
 *
 * Ratifiziert am 12.08.2026 (_Entscheidungen/2026-08-12_Flaechenpfad-auf-das-bauteilweise-BWP-
 * Verfahren_HERO.md): massgeblich ist der bauteilweise Wert, nicht der einfache
 * Baualtersklassen-Rechner. Vollstaendig vermessen am 09.09.2026, Messreihe und Gegenprobe in
 * 11_Produkt/reference_bwp_bauteilweise_basiswerte_HERO.md.
 *
 * WARUM W/(m²·K) UND NICHT W/m²: der Wert des Verbands ist ortsgebunden. Er ist linear in der
 * Differenz aus 20 Grad Innentemperatur und der Normaussentemperatur; ueber acht Postleitzahlen
 * von Flensburg bis Oberstdorf steht der Quotient konstant bei 4,373 bis 4,400 fuer die Klasse
 * 1958 bis 1968. Die im Werkzeug ANGEZEIGTE Standortkorrektur in Prozent wird dabei NICHT
 * angewandt: Hamburg und Flensburg tragen beide 84 Prozent und liefern 124 gegen 121 W/m².
 * Die frueher vermutete Umrechnung ueber diese Prozentzahl ist damit widerlegt.
 *
 * ELF KLASSEN, NICHT NEUN: die Tabelle des Verbands endet entgegen der bisherigen Annahme nicht
 * bei 1994, sie hat danach die Schnitte 2001, 2009 und 2015. Die neun Karten der Fragestrecke
 * bilden darauf ab; wer sein Baujahr frei eingibt, trifft die Klasse genau.
 *
 * NICHT MONOTON, und das ist kein Fehler: 1919 bis 1948 traegt weniger als 1949 bis 1957, und
 * 1979 bis 1983 weniger als 1984 bis 1994. Ursache sind verschiedene Referenzgebaeude je Klasse.
 * Uebernommen wie gemessen, nicht geglaettet.
 */
function hw_bwp_basis(): array
{
    return [
        'bis1918' => 4.9196, '1919-1948' => 3.6977, '1949-1957' => 4.6624,
        '1958-1968' => 4.3730, '1969-1978' => 3.1511, '1979-1983' => 1.9936,
        '1984-1994' => 2.4116, '1995-2001' => 1.8006, '2002-2009' => 1.3826,
        '2010-2015' => 1.5113, 'ab2016' => 1.2219,
    ];
}

/**
 * Ersparnis je Bauteil und Sanierungsstufe, ebenfalls in W/(m²·K), gemessen als Differenz zum
 * unsanierten Basiswert derselben Klasse und durch 31,1 Kelvin geteilt.
 * Reihenfolge je Bauteil: [uebliche Sanierung, tiefgreifende Sanierung].
 * Die Haustuer wird nicht abgefragt; sie traegt ueber alle Klassen null bis ein Watt.
 * Wo das Referenzgebaeude Bodenplatte UND Kellerdecke fuehrt, sind beide addiert, weil die
 * Fragestrecke dazu nur eine Frage stellt.
 */
function hw_bwp_ersparnis(): array
{
    return [
        //                 Dach              Fenster           Wand              Boden
        'bis1918'   => ['dach' => [0.5466, 0.6752], 'fenster' => [0.1929, 0.3215], 'wand' => [2.4759, 2.7010], 'boden' => [0.1608, 0.1929]],
        '1919-1948' => ['dach' => [0.6752, 0.8682], 'fenster' => [0.2572, 0.3215], 'wand' => [1.4148, 1.5113], 'boden' => [0.0643, 0.0643]],
        '1949-1957' => ['dach' => [1.1254, 1.4148], 'fenster' => [0.2572, 0.3215], 'wand' => [1.3183, 1.6720], 'boden' => [0.1608, 0.1608]],
        '1958-1968' => ['dach' => [0.5466, 0.9003], 'fenster' => [0.3215, 0.4502], 'wand' => [1.4148, 1.5434], 'boden' => [0.2251, 0.2251]],
        '1969-1978' => ['dach' => [0.3215, 0.4180], 'fenster' => [0.2894, 0.3859], 'wand' => [0.9968, 1.1254], 'boden' => [0.1929, 0.2251]],
        '1979-1983' => ['dach' => [0.0322, 0.1608], 'fenster' => [0.3537, 0.4180], 'wand' => [0.5466, 0.6109], 'boden' => [0.0322, 0.0322]],
        '1984-1994' => ['dach' => [0.0000, 0.2251], 'fenster' => [0.3859, 0.4823], 'wand' => [0.4823, 0.7074], 'boden' => [0.0643, 0.0643]],
        '1995-2001' => ['dach' => [0.0000, 0.1929], 'fenster' => [0.1608, 0.2894], 'wand' => [0.1929, 0.2251], 'boden' => [0.0322, 0.0643]],
        '2002-2009' => ['dach' => [0.0000, 0.0643], 'fenster' => [0.0000, 0.0965], 'wand' => [0.2251, 0.2572], 'boden' => [0.0000, 0.0000]],
        '2010-2015' => ['dach' => [0.0322, 0.0643], 'fenster' => [0.0000, 0.1286], 'wand' => [0.1286, 0.2251], 'boden' => [0.0000, 0.0322]],
        'ab2016'    => ['dach' => [0.0000, 0.0322], 'fenster' => [0.0322, 0.0643], 'wand' => [0.0322, 0.0643], 'boden' => [0.0000, 0.0000]],
    ];
}

/**
 * Vertraeglichkeit mit den beiden abgeloesten Karten.
 *
 * Seit dem GF-Entscheid vom 09.09.2026 fragt die Fragestrecke elf Klassen, alle vom
 * Bundesverband. Die frueheren Karten `1995-2010` und `nach2010` waren unsere eigenen und
 * schnitten quer durch drei Klassen der Quelle; die Karte `1995-2010` umspannte 56, 43 und 47
 * Watt je Quadratmeter, also 30 Prozent.
 *
 * Diese Abbildung bleibt, weil die Werte weiter hereinkommen: aus der Lead-Strecke und aus
 * zwischengespeicherten Sitzungen. Sie tragen den unguenstigsten Wert ihrer Spanne, weil eine
 * zu klein ausgelegte Waermepumpe teurer ist als eine zu grosse. Wer sie entfernt, laesst
 * genau diese Aufrufe auf den Rueckfall laufen.
 */
function hw_bwp_klasse(string $klasse): string
{
    $abgeloest = ['1995-2010' => '1995-2001', 'nach2010' => '2010-2015'];
    return $abgeloest[$klasse] ?? $klasse;
}

/**
 * Der Flaechenweg: die Gebaeudeheizlast aus Baualtersklasse, vier Bauteilangaben, Wohnflaeche
 * und Normaussentemperatur. Ergebnis in Kilowatt.
 *
 * Der frueher benutzte Weg ueber Jahresbedarf geteilt durch 1.800 Vollbenutzungsstunden ist
 * AUFGEHOBEN (Entscheid 13.08.2026): seine Kennwerte sind Endenergie nach VDI 3807, also
 * eingekaufter Brennstoff, und wurden ohne Kesselverlust als Waermeleistung behandelt. Sie
 * bleiben unveraendert im Kostenvergleich, wo es um Geld geht, und tragen die Heizlast nicht mehr.
 *
 * @param array<string,int> $bauteile Stufe je Bauteil, 1 keine, 2 uebliche, 3 tiefgreifende Sanierung
 */
function hw_flaechen_heizlast(string $klasse, array $bauteile, float $flaeche, float $nat, float $gebaeudeFaktor): float
{
    $key = hw_bwp_klasse($klasse);
    $basis = hw_bwp_basis()[$key] ?? hw_bwp_basis()['1958-1968'];
    $tabelle = hw_bwp_ersparnis()[$key] ?? [];
    $ersparnis = 0.0;
    foreach (['dach', 'fenster', 'wand', 'boden'] as $teil) {
        $stufe = (int) ($bauteile[$teil] ?? 1);
        if ($stufe < 2 || $stufe > 3 || !isset($tabelle[$teil])) {
            continue;
        }
        // Klemme bei null: die Quelle liefert stellenweise eine NEGATIVE Ersparnis, weil ihr
        // Referenzgebaeude schon besser gedaemmt ist als die angebotene uebliche Sanierung
        // (gemessen 1998 Dach 56 gegen 58, 2002 bis 2009 Dach 43 gegen 46). Eine Sanierung darf
        // die Heizlast nicht erhoehen.
        $ersparnis += max(0.0, $tabelle[$teil][$stufe - 2]);
    }
    $uSpez = max(0.0, $basis - $ersparnis);
    $spez = $uSpez * (20.0 - $nat);
    return $spez * $flaeche * $gebaeudeFaktor / 1000.0;
}

function hw_baujahr_klasse(mixed $value): string
{
    $raw = trim(hw_js_string($value));
    if (preg_match('/^\d{4}$/', $raw)) {
        $year = (int) $raw;
        if ($year >= 1800 && $year <= 2026) {
            return match (true) {
                $year <= 1918 => 'bis1918',
                $year <= 1948 => '1919-1948',
                $year <= 1957 => '1949-1957',
                $year <= 1968 => '1958-1968',
                $year <= 1978 => '1969-1978',
                $year <= 1983 => '1979-1983',
                $year <= 1994 => '1984-1994',
                // Seit dem GF-Entscheid vom 09.09.2026 folgen auch die Klassen nach 1994 dem
                // Bundesverband. Die Annahme, seine Tabelle ende bei 1994, ist am selben Tag
                // Jahr fuer Jahr widerlegt worden: sie hat die Schnitte 2001, 2009 und 2015.
                $year <= 2001 => '1995-2001',
                $year <= 2009 => '2002-2009',
                $year <= 2015 => '2010-2015',
                default => 'ab2016',
            };
        }
    }
    $classes = [
        'bis1918', '1919-1948', '1949-1957', '1958-1968', '1969-1978',
        '1979-1983', '1984-1994', '1995-2001', '2002-2009', '2010-2015', 'ab2016',
        // Die beiden abgeloesten Karten bleiben gueltige Eingaben: die Lead-Strecke und
        // zwischengespeicherte Sitzungen schicken sie weiter. hw_bwp_klasse() bildet sie ab.
        '1995-2010', 'nach2010',
    ];
    return in_array($raw, $classes, true) ? $raw : '1978-1994';
}

/** @return array<int,array<int,mixed>> */
function hw_sheet(array $sheets, string $name): array
{
    if (!isset($sheets[$name]) || !is_array($sheets[$name])) {
        throw new RuntimeException('missing_tab_' . $name);
    }
    return $sheets[$name];
}

/** @return array<string,mixed> */
function hw_read_kv(array $sheets, string $name): array
{
    $values = hw_sheet($sheets, $name);
    $out = [];
    for ($index = 1, $count = count($values); $index < $count; $index++) {
        $row = $values[$index];
        if (($row[0] ?? '') !== '') {
            $out[hw_js_string($row[0])] = $row[1] ?? '';
        }
    }
    return $out;
}

function hw_normalisiere_kopf(mixed $value): string
{
    return strtolower(trim(hw_js_string($value)));
}

/** @return array{header:list<string>,rows:list<array<int,mixed>>} */
function hw_finde_tabelle(array $values, array $requiredHeaders): array
{
    foreach ($values as $rowIndex => $row) {
        $header = array_map('hw_normalisiere_kopf', $row);
        $found = true;
        foreach ($requiredHeaders as $name) {
            if (!in_array(hw_normalisiere_kopf($name), $header, true)) {
                $found = false;
                break;
            }
        }
        if ($found) {
            return ['header' => $header, 'rows' => array_values(array_slice($values, $rowIndex + 1))];
        }
    }
    throw new RuntimeException('missing_table_headers_' . implode('_', $requiredHeaders));
}

function hw_kopf_index(array $table, string $name, bool $optional = false): int
{
    if (isset($table['columns'])) {
        if (isset($table['columns'][$name])) {
            return $table['columns'][$name];
        }
        if (!$optional) {
            throw new RuntimeException('missing_header_' . $name);
        }
        return -1;
    }
    $needle = hw_normalisiere_kopf($name);
    foreach ($table['header'] as $index => $header) {
        if ($header === $needle || str_starts_with($header, $needle)) {
            return $index;
        }
    }
    if (!$optional) {
        throw new RuntimeException('missing_header_' . $name);
    }
    return -1;
}

function hw_tabellen_wert(array $row, int $index): mixed
{
    return $index < 0 ? '' : ($row[$index] ?? '');
}

/** Klassenwahl nach tafel; Rohleser für Dimensionierung bleiben vollständig. */
function hw_tafel_rows(array $table): array
{
    $tafel = array_search('tafel', $table['header'], true);
    if ($tafel === false) {
        return $table['rows'];
    }
    $klasse = hw_kopf_index($table, 'Klasse');
    $brutto = hw_kopf_index($table, 'Endpreis_brutto');
    $classes = ['s', 'm', 'l', 'xl', 'xxl'];
    $found = [];
    $selected = [];
    foreach ($table['rows'] as $row) {
        $marker = trim(hw_js_string(hw_tabellen_wert($row, $tafel)));
        if ($marker !== '' && $marker !== 'ja') {
            throw new RuntimeException('invalid_tafel_marker');
        }
        if ($marker !== 'ja') {
            continue;
        }
        $key = strtolower(trim(hw_js_string(hw_tabellen_wert($row, $klasse))));
        if (!in_array($key, $classes, true) || isset($found[$key])) {
            throw new RuntimeException('invalid_tafel_class_' . $key);
        }
        $price = hw_num(hw_tabellen_wert($row, $brutto), 0);
        if (!is_finite((float) $price) || $price <= 0) {
            throw new RuntimeException('invalid_tafel_price_' . $key);
        }
        $found[$key] = true;
        $selected[] = $row;
    }
    foreach ($classes as $key) {
        if (!isset($found[$key])) {
            throw new RuntimeException('missing_tafel_class_' . $key);
        }
    }
    return $selected;
}

/** Fehlend ist nicht kostenlos: nur vollständige Zahlen, kein parseFloat-Präfix. */
function hw_price_eigen(mixed $value): float|int|null
{
    if (is_int($value) || is_float($value)) {
        return is_finite((float) $value) ? $value : null;
    }
    if (!is_string($value) || !preg_match('/^[+-]?(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)(?:,[0-9]+)?$/D', trim($value))) {
        return null;
    }
    $number = hw_num(trim($value), 0);
    return is_finite((float) $number) ? $number : null;
}

/** @return list<array<string,mixed>> */
function hw_read_price_table(array $sheets, string $name, ?array $tables = null, bool $tafelOnly = false): array
{
    $table = $tables[$name] ?? hw_finde_tabelle(hw_sheet($sheets, $name), ['Klasse', 'Modell', 'Endpreis_brutto']);
    $columns = [
        'klasse' => hw_kopf_index($table, 'Klasse'),
        'modell' => hw_kopf_index($table, 'Modell'),
        'hausgroesse' => hw_kopf_index($table, 'Hausgroesse', true),
        'kw' => hw_kopf_index($table, 'kW', true),
        'brutto' => hw_kopf_index($table, 'Endpreis_brutto'),
        'eigen' => hw_kopf_index($table, 'Eigenanteil', true),
        'proklima' => hw_kopf_index($table, 'proKlima_Eigenanteil', true),
    ];
    // PR 148 gilt für Schema 1/2; Schema 3 behält den geprüften P3a-Vertrag.
    $tafel = $tables === null ? array_search('tafel', $table['header'], true) : false;
    $rows = $tables === null && $tafelOnly ? hw_tafel_rows($table) : $table['rows'];
    $out = [];
    foreach ($rows as $row) {
        if (hw_tabellen_wert($row, $columns['klasse']) === '') {
            continue;
        }
        $brutto = $tables !== null ? rechner_schema3_zahl(hw_tabellen_wert($row, $columns['brutto']), true)
            : hw_num(hw_tabellen_wert($row, $columns['brutto']), 0);
        if ($brutto <= 0) {
            continue;
        }
        $out[] = [
            'klasse' => strtolower($tafel !== false ? trim(hw_js_string(hw_tabellen_wert($row, $columns['klasse']))) : hw_js_string(hw_tabellen_wert($row, $columns['klasse']))),
            'modell' => hw_js_string(hw_tabellen_wert($row, $columns['modell'])),
            'hausgroesse' => hw_js_string(hw_tabellen_wert($row, $columns['hausgroesse'])),
            'kw' => hw_js_string(hw_tabellen_wert($row, $columns['kw'])),
            'brutto' => $brutto,
            'eigen' => $tables !== null ? rechner_schema3_zahl(hw_tabellen_wert($row, $columns['eigen']), true)
                : hw_price_eigen(hw_tabellen_wert($row, $columns['eigen'])),
            'proklima' => hw_num(hw_tabellen_wert($row, $columns['proklima']), 0),
        ];
        if ($tafel !== false) {
            $out[count($out) - 1]['tafel'] = trim(hw_js_string(hw_tabellen_wert($row, $tafel)));
        }
    }
    return $out;
}

/** @return array<string,float|int> */
function hw_get_prices(array $sheets, string $brand, ?array $tables = null): array
{
    $table = $tables[$brand === 'vaillant' ? 'Preise_Vaillant' : 'Preise_Wolf'] ?? hw_finde_tabelle(
        hw_sheet($sheets, $brand === 'vaillant' ? 'Preise_Vaillant' : 'Preise_Wolf'),
        ['Klasse', 'Endpreis_brutto']
    );
    $klasse = hw_kopf_index($table, 'Klasse');
    $brutto = hw_kopf_index($table, 'Endpreis_brutto');
    // PR 148 gilt für Schema 1/2; Schema 3 behält den geprüften P3a-Vertrag.
    $tafel = $tables === null ? array_search('tafel', $table['header'], true) : false;
    $out = [];
    foreach ($tables === null ? hw_tafel_rows($table) : $table['rows'] as $row) {
        if (hw_tabellen_wert($row, $klasse) !== '') {
            $out[strtolower($tafel !== false ? trim(hw_js_string(hw_tabellen_wert($row, $klasse))) : hw_js_string(hw_tabellen_wert($row, $klasse)))] = $tables !== null ? rechner_schema3_zahl(hw_tabellen_wert($row, $brutto), true)
                : hw_num(hw_tabellen_wert($row, $brutto), 0);
        }
    }
    return $out;
}

/** @return list<array<string,mixed>> */
function hw_get_catalog(array $sheets, ?array $tables = null): array
{
    $table = $tables['Geräte_Katalog'] ?? hw_finde_tabelle(hw_sheet($sheets, 'Geräte_Katalog'), ['Marke', 'Modell', 'Kaskade']);
    $columns = [
        'marke' => hw_kopf_index($table, 'Marke'),
        'modell' => hw_kopf_index($table, 'Modell'),
        'kaskade' => hw_kopf_index($table, 'Kaskade'),
        'leistungW35' => hw_kopf_index($table, 'WP NAT W35'),
        'leistungW55' => hw_kopf_index($table, 'WP NAT W55'),
        'grenzeW35' => hw_kopf_index($table, 'Auslegungsgrenze W35 (WP÷0,80)'),
        'grenzeW55' => hw_kopf_index($table, 'Auslegungsgrenze W55 (WP÷0,80)'),
        'grenzeW35a10' => hw_kopf_index($table, 'Auslegungsgrenze W35 @A-10'),
        'grenzeW55a10' => hw_kopf_index($table, 'Auslegungsgrenze W55 @A-10'),
        'leistungW35a10' => hw_kopf_index($table, 'WP NAT W35 @A-10'),
        'leistungW55a10' => hw_kopf_index($table, 'WP NAT W55 @A-10'),
        'baureihe' => hw_kopf_index($table, 'Baureihe'),
        'mindestAnteil' => hw_kopf_index($table, 'Mindest-Leistungsanteil'),
        'empfehlungW55' => hw_kopf_index($table, 'Empfehlung bis kW W55', true),
        'empfehlungW35' => hw_kopf_index($table, 'Empfehlung bis kW W35', true),
        'herstellerfreigabeW55' => hw_kopf_index($table, 'Herstellerfreigabe bis kW W55', true),
        'herstellerfreigabeW35' => hw_kopf_index($table, 'Herstellerfreigabe bis kW W35', true),
        'brutto' => hw_kopf_index($table, 'Brutto €'),
        'stand' => hw_kopf_index($table, 'Stand'),
        'puffer' => hw_kopf_index($table, 'Puffer (', true),
        'pufferLiter' => hw_kopf_index($table, 'Puffer Liter', true),
        'pufferGroesser' => hw_kopf_index($table, 'Puffer, groessere Variante', true),
        'pufferOhne' => hw_kopf_index($table, 'ohne Puffer moeglich', true),
        // T901 (03.09.2026): Kennzeichnung der Zwei-Geraete-Grenze, Entscheid 01.09.2026 (hoechstens zwei Aussengeraete). Das Blatt
        // traegt sie seit dem 01.09.2026 in Spalte AH 'Auswahl (...)': 'ja' = waehlbar, jeder andere Text = Sonderplanung. Spalte
        // optional: fehlt sie, wird gewarnt, nicht gefiltert. Massgeblich: Vault 11_Produkt/Auslegungsmechanik_Konfigurator-und-Website_HERO.md.
        'auswahl' => hw_kopf_index($table, 'Auswahl', true),
    ];
    $out = [];
    foreach ($table['rows'] as $rowIndex => $row) {
        if (hw_tabellen_wert($row, $columns['marke']) === '' || hw_tabellen_wert($row, $columns['modell']) === '') {
            continue;
        }
        $pufferLiterRaw = hw_tabellen_wert($row, $columns['pufferLiter']);
        $empfehlungW55 = hw_tabellen_wert($row, $columns['empfehlungW55']);
        $empfehlungW35 = hw_tabellen_wert($row, $columns['empfehlungW35']);
        $herstellerfreigabeW55 = hw_tabellen_wert($row, $columns['herstellerfreigabeW55']);
        $herstellerfreigabeW35 = hw_tabellen_wert($row, $columns['herstellerfreigabeW35']);
        $out[] = [
            'marke' => strtolower(hw_js_string(hw_tabellen_wert($row, $columns['marke']))),
            'modell' => hw_js_string(hw_tabellen_wert($row, $columns['modell'])),
            'kaskade' => strtoupper(hw_js_string(hw_tabellen_wert($row, $columns['kaskade']))) === 'J',
            'leistungW35' => hw_num(hw_tabellen_wert($row, $columns['leistungW35']), 0),
            'leistungW55' => hw_num(hw_tabellen_wert($row, $columns['leistungW55']), 0),
            'grenzeW35' => hw_num(hw_tabellen_wert($row, $columns['grenzeW35']), 0),
            'grenzeW55' => hw_num(hw_tabellen_wert($row, $columns['grenzeW55']), 0),
            'grenzeW35a10' => hw_num(hw_tabellen_wert($row, $columns['grenzeW35a10']), 0),
            'grenzeW55a10' => hw_num(hw_tabellen_wert($row, $columns['grenzeW55a10']), 0),
            'leistungW35a10' => hw_num(hw_tabellen_wert($row, $columns['leistungW35a10']), 0),
            'leistungW55a10' => hw_num(hw_tabellen_wert($row, $columns['leistungW55a10']), 0),
            'baureihe' => hw_js_string(hw_tabellen_wert($row, $columns['baureihe'])),
            'mindestAnteil' => hw_num(hw_tabellen_wert($row, $columns['mindestAnteil']), 0.7),
            'empfehlungW55' => $empfehlungW55 === '' || !is_numeric($empfehlungW55)
                ? null
                : hw_num($empfehlungW55, 0),
            'empfehlungW35' => $empfehlungW35 === '' || !is_numeric($empfehlungW35)
                ? null
                : hw_num($empfehlungW35, 0),
            'herstellerfreigabeW55' => $herstellerfreigabeW55 === '' || !is_numeric($herstellerfreigabeW55)
                ? null
                : hw_num($herstellerfreigabeW55, 0),
            'herstellerfreigabeW35' => $herstellerfreigabeW35 === '' || !is_numeric($herstellerfreigabeW35)
                ? null
                : hw_num($herstellerfreigabeW35, 0),
            'brutto' => $tables !== null && rechner_schema3_auswahl(hw_tabellen_wert($row, $columns['auswahl']))
                ? rechner_schema3_zahl(hw_tabellen_wert($row, $columns['brutto']), true)
                : hw_num(hw_tabellen_wert($row, $columns['brutto']), 0),
            'stand' => hw_js_string(hw_tabellen_wert($row, $columns['stand'])),
            'puffer' => hw_js_string(hw_tabellen_wert($row, $columns['puffer'])),
            'pufferLiter' => $pufferLiterRaw === '' || !is_numeric($pufferLiterRaw) ? null : hw_num($pufferLiterRaw, 0),
            'pufferGroesser' => hw_js_string(hw_tabellen_wert($row, $columns['pufferGroesser'])),
            'sonderplanung' => $columns['auswahl'] < 0
                ? null
                : ($tables !== null ? !rechner_schema3_auswahl(hw_tabellen_wert($row, $columns['auswahl']))
                    : strtolower(trim(hw_js_string(hw_tabellen_wert($row, $columns['auswahl'])))) !== 'ja'),
            'pufferOhne' => hw_tabellen_wert($row, $columns['pufferOhne']) === ''
                ? null
                : strtolower(hw_js_string(hw_tabellen_wert($row, $columns['pufferOhne']))) === 'ja',
            'reihenfolge' => $rowIndex,
        ];
    }
    return $out;
}

/** @return array<string,array<string,list<array{temperatur:float|int,volllast:float|int,mindest:float|int|null}>>> */
function hw_get_kennlinien(array $sheets): array
{
    if (!isset($sheets['Geraete_Kennlinien'])) {
        return [];
    }
    $table = hw_finde_tabelle($sheets['Geraete_Kennlinien'], [
        'geraete_kennung', 'vorlauf_C', 'aussentemperatur_C', 'heizleistung_volllast_kW',
    ]);
    $columns = [
        'geraet' => hw_kopf_index($table, 'geraete_kennung'),
        'vorlauf' => hw_kopf_index($table, 'vorlauf_C'),
        'temperatur' => hw_kopf_index($table, 'aussentemperatur_C'),
        'volllast' => hw_kopf_index($table, 'heizleistung_volllast_kW'),
        'mindest' => hw_kopf_index($table, 'heizleistung_mindest_kW', true),
    ];
    $out = [];
    foreach ($table['rows'] as $row) {
        $key = hw_kennlinien_key(hw_tabellen_wert($row, $columns['geraet']));
        $vorlauf = hw_js_string(hw_num(hw_tabellen_wert($row, $columns['vorlauf']), 0));
        $temperaturRaw = hw_tabellen_wert($row, $columns['temperatur']);
        $volllastRaw = hw_tabellen_wert($row, $columns['volllast']);
        if ($key === '' || $vorlauf === '0' || !is_numeric($temperaturRaw) || !is_numeric($volllastRaw)) {
            continue;
        }
        $mindestRaw = hw_tabellen_wert($row, $columns['mindest']);
        $out[$key][$vorlauf][] = [
            'temperatur' => hw_num($temperaturRaw, 0),
            'volllast' => hw_num($volllastRaw, 0),
            'mindest' => $mindestRaw === '' || !is_numeric($mindestRaw) ? null : hw_num($mindestRaw, 0),
        ];
    }
    return $out;
}

/** @return array<string,array{nat:float|int,volllast:float|int}> */
function hw_get_klima_plz(array $sheets): array
{
    $rows = hw_sheet($sheets, 'Klima_PLZ');
    $out = [];
    for ($index = 1, $count = count($rows); $index < $count; $index++) {
        $plz = trim(hw_js_string($rows[$index][0] ?? ''));
        if ($plz === '') {
            continue;
        }
        $out[$plz] = [
            'nat' => hw_num($rows[$index][2] ?? null, -11),
            'volllast' => hw_num($rows[$index][3] ?? null, 1800),
        ];
    }
    return $out;
}

/** @return array{gefunden:bool,nat?:float|int} */
function hw_klima(array $query, array $sheets): array
{
    $plz = substr((string) preg_replace('/\D/', '', hw_query_string($query, 'plz')), 0, 5);
    if (strlen($plz) !== 5) {
        return ['gefunden' => false];
    }
    $klima = hw_get_klima_plz($sheets);
    if (!array_key_exists($plz, $klima)) {
        return ['gefunden' => false];
    }
    return ['gefunden' => true, 'nat' => $klima[$plz]['nat']];
}

/** @return array<string,mixed> */
/** T1245: Parameter und Eingaben werden auch bei direktem Kernaufruf geprüft. */
function hw_kv_bio_stand(array $stufen): array
{
    $neu=[['y'=>2029,'p'=>0.10],['y'=>2030,'p'=>0.15],['y'=>2035,'p'=>0.30],['y'=>2040,'p'=>0.60]];
    $alt=[['y'=>2029,'p'=>0.15],['y'=>2035,'p'=>0.30],['y'=>2040,'p'=>0.60]];
    if ($stufen==$neu) return ['stufen'=>$neu,'hinweis'=>null];
    if ($stufen==$alt) return ['stufen'=>$neu,'hinweis'=>'Altes Bio-Sheet erkannt; vollständig auf GModG § 43 Abs. 1, BGBl. 2026 I Nr. 226 umgestellt.'];
    throw new RuntimeException('Bio-Parameter unvollständig oder widersprüchlich. Erforderlich: 2029/10 %, 2030/15 %, 2035/30 %, 2040/60 %.');
}
// BEGIN KV_JAZ_PHP_GENERATED
function hw_kv_jaz_seed(): array { return json_decode(<<<'KV_JAZ_JSON'
[{"geraet":"5535","heizsystem":"heizkoerper","wert":4.3,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha07-A-hk/response.json","abrufdatum":"2026-10-26T12:52:42.322492+00:00","alias":["Wolf CHA-07/400V","Wolf CHA-07"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5535","heizsystem":"fbh","wert":4.98,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha07-B-fbh/response.json","abrufdatum":"2026-10-26T12:52:56.841036+00:00","alias":["Wolf CHA-07/400V","Wolf CHA-07"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5536","heizsystem":"heizkoerper","wert":4.37,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha10-A-hk/response.json","abrufdatum":"2026-10-26T12:53:01.354268+00:00","alias":["Wolf CHA-10/400V","Wolf CHA-10"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":false},{"geraet":"5536","heizsystem":"fbh","wert":5.08,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha10-B-fbh/response.json","abrufdatum":"2026-10-26T12:53:15.467071+00:00","alias":["Wolf CHA-10/400V","Wolf CHA-10"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":false},{"geraet":"5540","heizsystem":"heizkoerper","wert":4.42,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-e9-A-hk/response.json","abrufdatum":"2026-10-26T12:53:21.711331+00:00","alias":["Wolf CHA-16/20 mit Heizstab (CS-e9-C2)","Wolf CHA-16/20"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":false},{"geraet":"5540","heizsystem":"fbh","wert":5.11,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-e9-B-fbh/response.json","abrufdatum":"2026-10-26T12:53:36.179320+00:00","alias":["Wolf CHA-16/20 mit Heizstab (CS-e9-C2)","Wolf CHA-16/20"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":false},{"geraet":"5539","heizsystem":"heizkoerper","wert":4.42,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-A-hk/response.json","abrufdatum":"2026-10-26T12:53:40.716481+00:00","alias":["Wolf CHA-16/20 ohne Heizstab (CS-C2)"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":false},{"geraet":"5539","heizsystem":"fbh","wert":5.11,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-B-fbh/response.json","abrufdatum":"2026-10-26T12:53:54.346775+00:00","alias":["Wolf CHA-16/20 ohne Heizstab (CS-C2)"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":false},{"geraet":"5558","heizsystem":"heizkoerper","wert":4.34,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha2024-e9-A-hk/response.json","abrufdatum":"2026-10-26T12:53:58.913774+00:00","alias":["Wolf CHA-20/24 mit Heizstab (CS-e9-D2)","Wolf CHA-20/24"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"5558","heizsystem":"fbh","wert":5.03,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha2024-e9-B-fbh/response.json","abrufdatum":"2026-10-26T12:54:13.002790+00:00","alias":["Wolf CHA-20/24 mit Heizstab (CS-e9-D2)","Wolf CHA-20/24"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"5559","heizsystem":"heizkoerper","wert":4.34,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha2024-A-hk/response.json","abrufdatum":"2026-10-26T12:54:17.600629+00:00","alias":["Wolf CHA-20/24 ohne Heizstab (CS-D2)"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"5559","heizsystem":"fbh","wert":5.03,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha2024-B-fbh/response.json","abrufdatum":"2026-10-26T12:54:31.533734+00:00","alias":["Wolf CHA-20/24 ohne Heizstab (CS-D2)"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"5080","heizsystem":"heizkoerper","wert":3.88,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl35-81-A-hk/response.json","abrufdatum":"2026-10-26T12:54:36.260376+00:00","alias":["Vaillant aroTHERM plus VWL 35/8.1 A 230V","Vaillant VWL 35/8.1 A","Vaillant aroTHERM plus VWL 35/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":3},"kaskade":false},{"geraet":"5080","heizsystem":"fbh","wert":4.49,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl35-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:54:50.064033+00:00","alias":["Vaillant aroTHERM plus VWL 35/8.1 A 230V","Vaillant VWL 35/8.1 A","Vaillant aroTHERM plus VWL 35/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":3},"kaskade":false},{"geraet":"5081","heizsystem":"heizkoerper","wert":3.86,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl55-81-A-hk/response.json","abrufdatum":"2026-10-26T12:54:54.629091+00:00","alias":["Vaillant aroTHERM plus VWL 55/8.1 A 230V","Vaillant VWL 55/8.1 A","Vaillant aroTHERM plus VWL 55/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":5},"kaskade":false},{"geraet":"5081","heizsystem":"fbh","wert":4.47,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl55-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:10.192588+00:00","alias":["Vaillant aroTHERM plus VWL 55/8.1 A 230V","Vaillant VWL 55/8.1 A","Vaillant aroTHERM plus VWL 55/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":5},"kaskade":false},{"geraet":"5078","heizsystem":"heizkoerper","wert":3.9,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:14.949227+00:00","alias":["Vaillant aroTHERM plus VWL 75/8.1 A 230V","Vaillant VWL 75/8.1 A","Vaillant aroTHERM plus VWL 75/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5078","heizsystem":"fbh","wert":4.51,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:30.884345+00:00","alias":["Vaillant aroTHERM plus VWL 75/8.1 A 230V","Vaillant VWL 75/8.1 A","Vaillant aroTHERM plus VWL 75/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5079","heizsystem":"heizkoerper","wert":4.18,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:40.137148+00:00","alias":["Vaillant aroTHERM plus VWL 105/8.1 A 400V","Vaillant VWL 105/8.1 A","Vaillant aroTHERM plus VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":false},{"geraet":"5079","heizsystem":"fbh","wert":4.83,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:54.295390+00:00","alias":["Vaillant aroTHERM plus VWL 105/8.1 A 400V","Vaillant VWL 105/8.1 A","Vaillant aroTHERM plus VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":false},{"geraet":"5077","heizsystem":"heizkoerper","wert":4.21,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl125-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:58.988822+00:00","alias":["Vaillant aroTHERM plus VWL 125/8.1 A 400V","Vaillant VWL 125/8.1 A","Vaillant aroTHERM plus VWL 125/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":12},"kaskade":false},{"geraet":"5077","heizsystem":"fbh","wert":4.87,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl125-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:56:14.589132+00:00","alias":["Vaillant aroTHERM plus VWL 125/8.1 A 400V","Vaillant VWL 125/8.1 A","Vaillant aroTHERM plus VWL 125/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":12},"kaskade":false},{"geraet":"5082","heizsystem":"heizkoerper","wert":3.94,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl55-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:19.393112+00:00","alias":["Vaillant aroTHERM pro VWL 55/7.1 A 230V","Vaillant VWL 55/7.1 A","Vaillant aroTHERM pro VWL 55/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":5},"kaskade":false},{"geraet":"5082","heizsystem":"fbh","wert":4.56,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl55-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:56:34.569053+00:00","alias":["Vaillant aroTHERM pro VWL 55/7.1 A 230V","Vaillant VWL 55/7.1 A","Vaillant aroTHERM pro VWL 55/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":5},"kaskade":false},{"geraet":"5083","heizsystem":"heizkoerper","wert":3.86,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:39.168445+00:00","alias":["Vaillant aroTHERM pro VWL 75/7.1 A 230V","Vaillant VWL 75/7.1 A","Vaillant aroTHERM pro VWL 75/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5083","heizsystem":"fbh","wert":4.47,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:56:53.485421+00:00","alias":["Vaillant aroTHERM pro VWL 75/7.1 A 230V","Vaillant VWL 75/7.1 A","Vaillant aroTHERM pro VWL 75/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":false},{"geraet":"5085","heizsystem":"heizkoerper","wert":3.95,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:58.061418+00:00","alias":["Vaillant aroTHERM pro VWL 115/7.1 A 400V","Vaillant VWL 115/7.1 A","Vaillant aroTHERM pro VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":false},{"geraet":"5085","heizsystem":"fbh","wert":4.57,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:57:12.583875+00:00","alias":["Vaillant aroTHERM pro VWL 115/7.1 A 400V","Vaillant VWL 115/7.1 A","Vaillant aroTHERM pro VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":false},{"geraet":"5084","heizsystem":"heizkoerper","wert":4.42,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl205-81-A-hk/response.json","abrufdatum":"2026-10-26T12:57:17.194542+00:00","alias":["Vaillant aroTHERM perform VWL 205/8.1 A S2 Q","Vaillant VWL 205/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"5084","heizsystem":"fbh","wert":5.11,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl205-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:57:31.672241+00:00","alias":["Vaillant aroTHERM perform VWL 205/8.1 A S2 Q","Vaillant VWL 205/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":20},"kaskade":false},{"geraet":"2x:5540","heizsystem":"heizkoerper","wert":4.42,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-e9-A-hk/response.json","abrufdatum":"2026-10-26T12:53:21.711331+00:00","alias":["2× Wolf CHA-16/20","2× Wolf CHA-16/20 (Kaskade)","2x Wolf CHA-16/20","2× Wolf CHA-16"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":true},{"geraet":"2x:5540","heizsystem":"fbh","wert":5.11,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/cha1620-e9-B-fbh/response.json","abrufdatum":"2026-10-26T12:53:36.179320+00:00","alias":["2× Wolf CHA-16/20","2× Wolf CHA-16/20 (Kaskade)","2x Wolf CHA-16/20","2× Wolf CHA-16"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":16},"kaskade":true},{"geraet":"2x:5078","heizsystem":"heizkoerper","wert":3.9,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:14.949227+00:00","alias":["2× Vaillant VWL 75/8.1 A","2× Vaillant VWL 75/8.1 A (Kaskade)","2x Vaillant VWL 75/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":true},{"geraet":"2x:5078","heizsystem":"fbh","wert":4.51,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:30.884345+00:00","alias":["2× Vaillant VWL 75/8.1 A","2× Vaillant VWL 75/8.1 A (Kaskade)","2x Vaillant VWL 75/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":true},{"geraet":"2x:5079","heizsystem":"heizkoerper","wert":4.18,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:40.137148+00:00","alias":["2× Vaillant VWL 105/8.1 A","2× Vaillant VWL 105/8.1 A (Kaskade)","2x Vaillant VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":true},{"geraet":"2x:5079","heizsystem":"fbh","wert":4.83,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:54.295390+00:00","alias":["2× Vaillant VWL 105/8.1 A","2× Vaillant VWL 105/8.1 A (Kaskade)","2x Vaillant VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":true},{"geraet":"3x:5079","heizsystem":"heizkoerper","wert":4.18,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:40.137148+00:00","alias":["3× Vaillant VWL 105/8.1 A","3× Vaillant VWL 105/8.1 A (Kaskade)","3x Vaillant VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":true},{"geraet":"3x:5079","heizsystem":"fbh","wert":4.83,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl105-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:55:54.295390+00:00","alias":["3× Vaillant VWL 105/8.1 A","3× Vaillant VWL 105/8.1 A (Kaskade)","3x Vaillant VWL 105/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":10},"kaskade":true},{"geraet":"2x:5077","heizsystem":"heizkoerper","wert":4.21,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl125-81-A-hk/response.json","abrufdatum":"2026-10-26T12:55:58.988822+00:00","alias":["2× Vaillant VWL 125/8.1 A","2× Vaillant VWL 125/8.1 A (Kaskade)","2x Vaillant VWL 125/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":12},"kaskade":true},{"geraet":"2x:5077","heizsystem":"fbh","wert":4.87,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl125-81-B-fbh/response.json","abrufdatum":"2026-10-26T12:56:14.589132+00:00","alias":["2× Vaillant VWL 125/8.1 A","2× Vaillant VWL 125/8.1 A (Kaskade)","2x Vaillant VWL 125/8.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":12},"kaskade":true},{"geraet":"2x:5083","heizsystem":"heizkoerper","wert":3.86,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:39.168445+00:00","alias":["2× Vaillant VWL 75/7.1 A","2× Vaillant VWL 75/7.1 A (Kaskade)","2x Vaillant VWL 75/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":true},{"geraet":"2x:5083","heizsystem":"fbh","wert":4.47,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl75-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:56:53.485421+00:00","alias":["2× Vaillant VWL 75/7.1 A","2× Vaillant VWL 75/7.1 A (Kaskade)","2x Vaillant VWL 75/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":7},"kaskade":true},{"geraet":"2x:5085","heizsystem":"heizkoerper","wert":3.95,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:58.061418+00:00","alias":["2× Vaillant VWL 115/7.1 A","2× Vaillant VWL 115/7.1 A (Kaskade)","2x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true},{"geraet":"2x:5085","heizsystem":"fbh","wert":4.57,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:57:12.583875+00:00","alias":["2× Vaillant VWL 115/7.1 A","2× Vaillant VWL 115/7.1 A (Kaskade)","2x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true},{"geraet":"3x:5085","heizsystem":"heizkoerper","wert":3.95,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:58.061418+00:00","alias":["3× Vaillant VWL 115/7.1 A","3× Vaillant VWL 115/7.1 A (Kaskade)","3x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true},{"geraet":"3x:5085","heizsystem":"fbh","wert":4.57,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:57:12.583875+00:00","alias":["3× Vaillant VWL 115/7.1 A","3× Vaillant VWL 115/7.1 A (Kaskade)","3x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true},{"geraet":"4x:5085","heizsystem":"heizkoerper","wert":3.95,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-A-hk/response.json","abrufdatum":"2026-10-26T12:56:58.061418+00:00","alias":["4× Vaillant VWL 115/7.1 A","4× Vaillant VWL 115/7.1 A (Kaskade)","4x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":55,"ruecklauf":45,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true},{"geraet":"4x:5085","heizsystem":"fbh","wert":4.57,"quelle":"BWP-JAZ-Rechner https://www.waermepumpe.de/werkzeuge/jaz-rechner/; VDI 4650 Blatt 1: 2024-02; laeufe/vwl115-71-B-fbh/response.json","abrufdatum":"2026-10-26T12:57:12.583875+00:00","alias":["4× Vaillant VWL 115/7.1 A","4× Vaillant VWL 115/7.1 A (Kaskade)","4x Vaillant VWL 115/7.1 A"],"randbedingungen":{"standort":"Hannover, PLZ 30159","norm":"VDI 4650 Blatt 1: 2024-02","vorlauf":35,"ruecklauf":28,"warmwasserAnteil":18,"speicher":50,"gesamtlast":11},"kaskade":true}]
KV_JAZ_JSON, true, 512, JSON_THROW_ON_ERROR); }
// END KV_JAZ_PHP_GENERATED
function hw_kv_jaz_aus_zeilen(array $rows): array
{
    if (($rows[0]??null)!==['Gerät','Heizsystem','Wert','Quelle','Abrufdatum','Randbedingungen','Aliase','Kaskade']) throw new RuntimeException('KV_JAZ: Tabellenkopf ungültig.');
    $result=[];
    foreach(array_slice($rows,1) as $r) {if(empty($r[0]))continue;
        $bed=json_decode($r[5]??'',true,512,JSON_THROW_ON_ERROR);$ali=json_decode($r[6]??'[]',true,512,JSON_THROW_ON_ERROR);
        $wert=(float)str_replace(',','.',(string)($r[2]??''));
        if(!in_array($r[1],['fbh','heizkoerper'],true)||$wert<=0||empty($r[3])||empty($r[4])||!$bed||!is_array($ali))throw new RuntimeException('KV_JAZ: Zeile ungültig.');
        $result[]=['geraet'=>(string)$r[0],'heizsystem'=>$r[1],'wert'=>$wert,'quelle'=>$r[3],'abrufdatum'=>$r[4],'randbedingungen'=>$bed,'alias'=>$ali,'kaskade'=>in_array($r[7]??false,[true,'J'],true)];
    }return $result;
}
function hw_kv_jaz_auswahl(array $i,array $tabelle): array
{
    if(!$tabelle)throw new RuntimeException('Arbeitszahltabelle KV_JAZ fehlt oder ist leer.');
    $seen=[];
    foreach($tabelle as $row){$key=$row['geraet'].':'.$row['heizsystem'];$b=$row['randbedingungen']??[];
        if(isset($seen[$key])||empty($b['standort'])||empty($b['norm'])||!is_numeric($b['gesamtlast']??null)||$b['gesamtlast']<=0||!is_numeric($b['vorlauf']??null)||!is_numeric($b['ruecklauf']??null)||!is_numeric($b['warmwasserAnteil']??null)||!is_numeric($b['speicher']??null)||!is_numeric($row['wert']??null)||!is_finite((float)$row['wert'])||$row['wert']<=0||empty($row['quelle'])||empty($row['abrufdatum']))throw new RuntimeException('Ungültige oder doppelte Zeile in KV_JAZ.');$seen[$key]=true;
    }
    if(!$i['geraet'])foreach(hw_kv_jaz_seed()as$row){if(!$row['kaskade']&&$row['heizsystem']===$i['heizsystem']&&!isset($seen[$row['geraet'].':'.$row['heizsystem']]))throw new RuntimeException('KV_JAZ ist für das Portfolio-Minimum unvollständig.');}
    $aus=array_values(array_filter($tabelle,static fn($r)=>$r['heizsystem']===$i['heizsystem']&&(!$i['geraet']||(string)$r['geraet']===$i['geraet']||in_array($i['geraet'],$r['alias']??[],true))));
    if(!$aus)throw new RuntimeException('Für das Gerät und Heizsystem fehlt eine belegte Arbeitszahl. Berechnung gesperrt.');
    $r=$aus[0];foreach($aus as $x){if(!is_numeric($x['wert'])||$x['wert']<=0||!$x['quelle']||!$x['abrufdatum'])throw new RuntimeException('Ungültige Zeile in KV_JAZ.');if($x['wert']<$r['wert'])$r=$x;}
    if($i['geraet']&&count($aus)!==1)throw new RuntimeException('Gerätezuordnung in KV_JAZ ist nicht eindeutig.');
    return ['wert'=>(float)$r['wert'],'geraet'=>$r['geraet'],'heizsystem'=>$i['heizsystem'],'quelle'=>$r['quelle'],'abrufdatum'=>$r['abrufdatum'],'randbedingungen'=>$r['randbedingungen'],'annahme'=>!$i['geraet']?'Portfolio-Minimum; Gerät noch nicht gewählt.':(!empty($r['kaskade'])?'Kaskade: Arbeitszahl des Einzelgeräts als Annahme.':null),'heizsystemAnnahme'=>$i['heizsystemAnnahme']];
}
function hw_kv_nutzen_eingaben(array $raw): array
{
    $i=array_replace(hw_kv_defaults(),$raw);
    $zahl=static function($name,$min,$max,$leer)use(&$i){$v=$i[$name]??null;if($v===null||$v===''){if($leer)return null;throw new RuntimeException('Bitte '.$name.' angeben.');}$v=is_string($v)?str_replace(',','.',$v):$v;if(!is_numeric($v)||!is_finite((float)$v)||$v<$min||$v>$max)throw new RuntimeException('Ungültiger Wert für '.$name.'.');return 0+$v;};
    foreach(['pvTog','wpZaehler','netzentgeltTog','warmwasserBisherZentral','warmwasserKuenftigZentral']as$k)$i[$k]=hw_kv_bool($i[$k],false);
    $i['heizsystemAnnahme']=empty($raw['heizsystem']);$i['heizsystem']=(string)($i['heizsystem']?:'heizkoerper');
    if($i['heizsystem']==='gemischt')$i['heizsystem']='heizkoerper';if(in_array($i['heizsystem'],['fussboden','fussbodenheizung'],true))$i['heizsystem']='fbh';
    if(!in_array($i['heizsystem'],['fbh','heizkoerper'],true))throw new RuntimeException('Ungültiges Heizsystem.');
    if(!in_array($i['heizart'],['gas','oel'],true)||!in_array($i['vglBrennstoff'],['gas','oel'],true))throw new RuntimeException('Kostenvergleich nur für Gas und Öl.');
    $i['geraet']=trim((string)$i['geraet']);$i['modul14a']=(string)($i['modul14a']?:'modul1');
    if(!in_array($i['modul14a'],['modul1','modul2','kein'],true))throw new RuntimeException('Ungültiges Modul nach Paragraf 14a.');
    $i['pvAnteil']=$zahl('pvAnteil',0,100,false);$i['pvKosten']=$zahl('pvKosten',0,1000,false);$i['grundpreisGas']=$zahl('grundpreisGas',0,100000,false);
    $i['foerderBetragExtern']=$zahl('foerderBetragExtern',0,$i['invWP'],true);$i['wpArbeitspreis']=$zahl('wpArbeitspreis',0,1000,!$i['wpZaehler']);$i['wpGrundpreis']=$zahl('wpGrundpreis',0,100000,!$i['wpZaehler']);
    if($i['modul14a']==='modul2'&&!$i['wpZaehler'])throw new RuntimeException('Modul 2 erfordert einen eigenen Wärmepumpenzähler und dessen Tarif.');
    $i['startJahr']=$zahl('startJahr',1900,2200,true);if($i['startJahr']!==null&&floor($i['startJahr'])!=$i['startJahr'])throw new RuntimeException('Startjahr muss ganzzahlig sein.');
    $i['personen']=$zahl('personen',0,1000,true);if(!$i['warmwasserBisherZentral']&&$i['warmwasserKuenftigZentral']&&!($i['personen']>0))throw new RuntimeException('Bitte die Personenzahl für den Warmwasserwechsel angeben.');
    if(!($i['bedarf']>0)||!($i['eta']>0&&$i['eta']<=100)||!($i['laufzeit']>=1&&$i['laufzeit']<=100&&$i['laufzeit']==floor($i['laufzeit'])))throw new RuntimeException('Verbrauch, Nutzungsgrad oder Laufzeit ungültig.');
    return $i;
}
function hw_kv_netzentgelt_pruefen(array $n,bool $an): void
{
    if(!$an)return;
    if(!is_array($n['jahreswerte']??null)||!$n['jahreswerte'])throw new RuntimeException('Netzentgeltpfad eingeschaltet, aber keine belegte Jahresreihe hinterlegt. Bitte ausschalten.');
    if(!is_numeric($n['basisjahr'])||floor($n['basisjahr'])!=$n['basisjahr']||$n['einheit']!=='ct/kWh Aufschlag gegenüber heute'||!$n['quelle']||!$n['abrufdatum'])throw new RuntimeException('Netzentgeltpfad: Basisjahr, Einheit, Quelle oder Abrufdatum fehlen.');
    $gesehen=[];$basis=false;foreach($n['jahreswerte']as$r){if(!is_int($r['jahr'])||!is_numeric($r['wert'])||!is_finite((float)$r['wert'])||$r['wert']<0||isset($gesehen[$r['jahr']]))throw new RuntimeException('Netzentgeltpfad enthält ungültige oder doppelte Jahreswerte.');$gesehen[$r['jahr']]=true;if($r['jahr']==$n['basisjahr']&&$r['wert']==0)$basis=true;}
    if(!$basis)throw new RuntimeException('Netzentgeltpfad muss im Basisjahr mit Aufschlag 0 beginnen.');
}
function hw_kv_nutzen_parameter(array $kv): array
{
    $n=static function($k,$d)use($kv){$v=$kv[$k]??null;if($v===null||$v==='')return$d;$v=str_replace(',','.',(string)$v);if(!is_numeric($v))throw new RuntimeException('Ungültiger Parameter '.$k);return 0+$v;};
    $st=[];$vorhanden=false;for($j=1;$j<=4;$j++){if(array_key_exists('bio_stufe_'.$j.'_jahr',$kv)||array_key_exists('bio_stufe_'.$j.'_anteil',$kv)){$vorhanden=true;$st[]=['y'=>$n('bio_stufe_'.$j.'_jahr',NAN),'p'=>$n('bio_stufe_'.$j.'_anteil',NAN)];}}
    $b=hw_kv_bio_stand($vorhanden?$st:[['y'=>2029,'p'=>.10],['y'=>2030,'p'=>.15],['y'=>2035,'p'=>.30],['y'=>2040,'p'=>.60]]);
    $reihe=json_decode((string)($kv['netzentgelt_jahreswerte']??'[]'),true,512,JSON_THROW_ON_ERROR);
    return ['bioStufen'=>$b['stufen'],'bioHinweis'=>$b['hinweis'],'wartungWp'=>$n('wartung_fossil',250),'wartungFossil'=>$n('wartung_fossil',250),'grundpreisGas'=>$n('grundpreis_gas',250.38),'schornsteinfeger'=>$n('schornsteinfeger',39),'modul14aVorteil'=>$n('modul14a_vorteil',156.22),'pvAnteil'=>$n('pv_anteil',30),'pvKosten'=>$n('pv_kosten',7),'wwKwhProPerson'=>$n('ww_abzug_kwh_pro_person_jahr',700),'co2ZielJahr'=>$n('co2_ziel_jahr',2045),'netzentgelt'=>['basisjahr'=>$n('netzentgelt_basisjahr',null),'einheit'=>(string)($kv['netzentgelt_einheit']??'ct/kWh Aufschlag gegenüber heute'),'jahreswerte'=>$reihe,'quelle'=>(string)($kv['netzentgelt_quelle']??''),'abrufdatum'=>(string)($kv['netzentgelt_abrufdatum']??'')]];
}
function hw_kv_jahreskosten(int $j,string $fuel,array $i,array $p,array $s,float $fossilDelta,float $stromDelta): array
{
    $cY=$s['startY']+$j-1;$neu=(bool)$i['neuFossilTog'];$bio=$neu&&(bool)$i['bioTog'];$bA=$bio?hw_kv_bio_anteil($cY,$p):0;
    $preis=$fuel==='gas'?$i['gaspreis']:$i['oelpreis'];$stg=($fuel==='gas'?$i['gasStg']:$i['oelStg'])/100;
    $vb=$neu?$s['nutzwaerme']/$p['etaNeu'][$fuel]:$i['bedarf'];$bp=$preis*pow(1+$stg+$fossilDelta,$j-1);$ep=$bp*(1+$bA*(($bio?$i['bioAufpreis']:1)-1));
    $fossilK=$vb*$ep/100;$co2Preis=$s['zielSchritte']<=0||$j-1>=$s['zielSchritte']?$i['co2Pfad']:$i['co2preis']+($i['co2Pfad']-$i['co2preis'])*($j-1)/$s['zielSchritte'];
    $co2Basis=$vb*$p['co2f'][$fuel]/1000*($co2Preis-$i['co2preis']);$co2St=$co2Basis*(1-$bA);$grundpreisGas=$fuel==='gas'&&$i['heizart']==='gas'?$i['grundpreisGas']:0;$netzentgelt=0;
    if($i['netzentgeltTog']&&$fuel==='gas'){$treffer=array_values(array_filter($p['netzentgelt']['jahreswerte'],static fn($r)=>$r['jahr']===$cY));if(count($treffer)!==1)throw new RuntimeException('Netzentgeltpfad: Jahreswert für '.$cY.' fehlt.');$netzentgelt=$vb*$treffer[0]['wert']/100;}
    $wwStromK=($neu?0:$s['wwZuschlag'])*$i['strompreis']*pow(1+$i['stromEntw']/100+$stromDelta,$j-1)/100;
    $fossilW=$p['wartungFossil'];$fossilG=$fossilK+$co2St+$fossilW+$grundpreisGas+$p['schornsteinfeger']+$netzentgelt+$wwStromK;
    $stromPJ=($i['wpZaehler']?$i['wpArbeitspreis']:$i['strompreis'])*pow(1+$i['stromEntw']/100+$stromDelta,$j-1);
    $pvAnteil=$i['pvTog']?$i['pvAnteil']/100:0;$pvStrom=$s['wpStrom']*$pvAnteil;$netzStrom=$s['wpStrom']-$pvStrom;
    $wpStromK=$s['wpStrom']*$stromPJ/100;$pvKosten=$pvStrom*$i['pvKosten']/100;$pvSav=$pvStrom*$stromPJ/100-$pvKosten;
    $dynSav=$i['dynTarifTog']?$netzStrom*$i['dynAnteil']/100*$i['dynSpread']/100:0;$wpGrundpreis=$i['wpZaehler']?$i['wpGrundpreis']:0;
    $modul14a=!$i['wpZaehler']&&$i['modul14a']==='modul1'?$p['modul14aVorteil']:0;$wpW=$p['wartungFossil'];$wpGes=$wpStromK+$wpW-$pvSav-$dynSav+$wpGrundpreis-$modul14a;
    return ['j'=>$j,'cY'=>$cY,'fossilBP'=>$bp,'fossilEP'=>$ep,'bioP'=>$bA*100,'fossilK'=>$fossilK,'co2St'=>$co2St,'fossilW'=>$fossilW,'fossilG'=>$fossilG,'wpStromK'=>$wpStromK,'pvSav'=>$pvSav,'dynSav'=>$dynSav,'wpW'=>$wpW,'wpGes'=>$wpGes,'grundpreisGas'=>$grundpreisGas,'schornsteinfeger'=>$p['schornsteinfeger'],'netzentgelt'=>$netzentgelt,'wwStromK'=>$wwStromK,'wpGrundpreis'=>$wpGrundpreis,'modul14a'=>$modul14a,'pvStrom'=>$pvStrom,'pvKosten'=>$pvKosten,'netzStrom'=>$netzStrom,'netzStromK'=>$netzStrom*$stromPJ/100,'bioAufschlag'=>$fossilK-$vb*$bp/100,'bioCo2Entlastung'=>$co2Basis-$co2St,'bioNetto'=>$fossilK-$vb*$bp/100+$co2St-$co2Basis,'co2Preis'=>$co2Preis];
}

function hw_kv_defaults(): array
{
    return [
        'heizart' => 'gas', 'bedarf' => 20000, 'eta' => 85, 'invWP' => 30000,
        'jaz' => 3.8, 'laufzeit' => 20, 'neuFossilTog' => true,
        'vglBrennstoff' => 'gas', 'gasInvest' => 12000, 'oelInvest' => 17500,
        'gaspreis' => 12, 'gasStg' => 2.5, 'oelpreis' => 11, 'oelStg' => 2.5,
        'strompreis' => 32, 'stromEntw' => 1.5, 'co2preis' => 55, 'co2Pfad' => 250,
        'bioTog' => true, 'bioAufpreis' => 2.5, 'fHalbjahr' => 'h2-2026',
        'fGrund' => true, 'fEU' => true, 'fKlima' => true, 'fAlt20' => true,
        'fEinkSlider' => 60000, 'fKind' => false, 'proklimaTog' => false,
        'fEffizienz' => false, 'finanzTog' => false, 'kredLZ' => 10, 'kredZins' => 0.98,
        'immoTog' => false, 'hausW' => 350000, 'immoP' => 7,
        'dynTarifTog' => false, 'dynAnteil' => 40, 'dynSpread' => 10,
        'heizsystem'=>null,'geraet'=>'','startJahr'=>null,'pvTog'=>false,'pvAnteil'=>30,'pvKosten'=>7,'foerderBetragExtern'=>null,'grundpreisGas'=>250.38,'wpZaehler'=>false,'wpArbeitspreis'=>null,'wpGrundpreis'=>null,'netzentgeltTog'=>false,'modul14a'=>'modul1','warmwasserBisherZentral'=>true,'warmwasserKuenftigZentral'=>true,'personen'=>null,
        'modus' => 'kunde',
    ];
}

/** @return array<string,mixed> */
function hw_eta_matrix(): array
{
    return [
        'fallback' => [
            'wert' => 85,
            'label' => null,
            'text' => 'Wir rechnen mit einem marktüblichen Mittelwert von 85 %. Sie können den Regler jederzeit selbst anpassen.',
        ],
        'regeln' => [
            ['rohr' => 'unklar', 'kbj' => null, 'heizart' => null, 'wert' => 85, 'label' => null],
            ['rohr' => 'metall', 'kbj' => 'vor1990', 'heizart' => null, 'wert' => 70, 'label' => 'ältere Heizung ohne Brennwerttechnik (vor 1990)'],
            ['rohr' => 'metall', 'kbj' => '*', 'heizart' => null, 'wert' => 80, 'label' => 'Heizung ohne Brennwerttechnik (Niedertemperaturkessel)'],
            ['rohr' => 'kunststoff', 'kbj' => 'nach2010', 'heizart' => null, 'wert' => 93, 'label' => 'Brennwert-Heizung junger Generation (nach 2010)'],
            ['rohr' => 'kunststoff', 'kbj' => '*', 'heizart' => 'gas', 'wert' => 86, 'label' => 'Brennwert-Heizung älterer Generation'],
            ['rohr' => 'kunststoff', 'kbj' => '*', 'heizart' => 'oel', 'wert' => 90, 'label' => 'Brennwert-Heizung älterer Generation'],
        ],
        'quelle' => 'Verbraucherzentrale NRW 2020, BEE/ECONSULT-Feldstudien 2018, Stand 15.07.2026',
        'textVorbelegt' => 'Vorbelegt aus Ihren Angaben: {label}, typisch rund {wert} % der abgerechneten Energie (Quellen: Verbraucherzentrale NRW 2020, BEE/ECONSULT-Feldstudien 2018, Stand 15.07.2026). Sie können den Regler jederzeit selbst anpassen.',
        'textEigen' => 'Sie haben den Wert selbst eingestellt. Typisch für {label}: rund {wert} % der abgerechneten Energie.',
    ];
}

/** @return array<string,mixed> */
function hw_schaetzung_seed(): array
{
    return [
        'spezVerbrauch' => ['vor1978' => 180, '1978-1994' => 140, '1995-2010' => 100, 'nach2010' => 60],
        'stufen' => ['vor1978', '1978-1994', '1995-2010', 'nach2010'],
        'gebaeudeFaktor' => ['efh' => 1.0, 'dhh' => 0.9, 'rh' => 0.85, 'zfh' => 0.95, 'mfh' => 0.85],
        'sanierungSprung' => ['nein' => 0, 'teilweise' => 1, 'umfassend' => 2],
        'einheitFaktor' => 10, 'rundungKwh' => 500, 'bedarfMin' => 5000,
        'bedarfMax' => 80000, 'bedarfStep' => 500, 'flaecheDefault' => 140,
        'quelle' => 'N2-Schätzkonstanten, belegt aus herowerk-website apps-script/rechner-backend/Code.gs (Dimensionierungsrechner)',
    ];
}

/** @return array<string,mixed> */
function hw_kv_get_params(array $sheets): array
{
    $kv = [];
    $parameterRows = hw_sheet($sheets, 'KV_Parameter');
    for ($index = 1, $count = count($parameterRows); $index < $count; $index++) {
        $row = $parameterRows[$index];
        if (!empty($row[0])) {
            $kv[hw_js_string($row[0])] = $row[1] ?? '';
        }
    }

    $perioden = [];
    $reihenfolge = [];
    $periodRows = hw_sheet($sheets, 'KV_FoerderPerioden');
    for ($index = 1, $count = count($periodRows); $index < $count; $index++) {
        $row = $periodRows[$index];
        if (empty($row[0])) {
            continue;
        }
        $key = hw_js_string($row[0]);
        $einkStufen = [];
        foreach (array_filter(explode(';', hw_js_string($row[10] ?? '')), static fn (string $value): bool => $value !== '') as $stufe) {
            $teile = explode(':', $stufe);
            $einkStufen[] = [
                'maxAnr' => hw_kv_num($teile[0] ?? null, 0),
                'pct' => hw_kv_num($teile[1] ?? null, 0),
            ];
        }
        $perioden[$key] = [
            'label' => hw_js_string($row[3] ?? ''),
            'klima' => hw_kv_num($row[4] ?? null, 0),
            'grenze' => hw_kv_num($row[5] ?? null, 0),
            'eu' => strtoupper(hw_js_string($row[6] ?? '')) === 'J',
            'cap' => array_key_exists(7, $row) && $row[7] !== '' ? hw_kv_num($row[7], 80) : null,
            'effizienzPct' => array_key_exists(8, $row) && $row[8] !== '' ? hw_kv_num($row[8], 0) : null,
            'kindFreibetrag' => array_key_exists(9, $row) && $row[9] !== '' ? hw_kv_num($row[9], 0) : null,
            'einkStufen' => $einkStufen,
            'proKlimaErlaubt' => strtoupper(hw_js_string($row[11] ?? '')) === 'J',
            'gueltigAb' => hw_js_string($row[1] ?? ''),
            'gueltigBis' => hw_js_string($row[2] ?? ''),
        ];
        if ($key !== 'alt') {
            $reihenfolge[] = $key;
        }
    }

    $schaetzung = hw_schaetzung_seed();
    $schaetzung['spezVerbrauch'] = [
        'vor1978' => hw_kv_num($kv['wz_spez_vor1978'] ?? null, 180),
        '1978-1994' => hw_kv_num($kv['wz_spez_1978_1994'] ?? null, 140),
        '1995-2010' => hw_kv_num($kv['wz_spez_1995_2010'] ?? null, 100),
        'nach2010' => hw_kv_num($kv['wz_spez_nach2010'] ?? null, 60),
    ];
    $schaetzung['gebaeudeFaktor'] = [
        'efh' => hw_kv_num($kv['wz_gebf_efh'] ?? null, 1.0),
        'dhh' => hw_kv_num($kv['wz_gebf_dhh'] ?? null, 0.9),
        'rh' => hw_kv_num($kv['wz_gebf_rh'] ?? null, 0.85),
        'zfh' => hw_kv_num($kv['wz_gebf_zfh'] ?? null, 0.95),
        'mfh' => hw_kv_num($kv['wz_gebf_mfh'] ?? null, 0.85),
    ];
    $schaetzung['einheitFaktor'] = hw_kv_num($kv['wz_unit_faktor'] ?? null, 10);

    $p = [
        'perioden' => $perioden,
        'periodenReihenfolge' => $reihenfolge,
        'grundPctEu' => hw_kv_num($kv['grund_pct_eu'] ?? null, 30),
        'grundPctNichtEu' => hw_kv_num($kv['grund_pct_nicht_eu'] ?? null, 15),
        'proKlimaAktiv' => strtoupper(hw_js_string($kv['proklima_aktiv'] ?? 'N')) === 'J',
        'proKlimaPct' => hw_kv_num($kv['proklima_pct'] ?? null, 0.05),
        'proKlimaMax' => hw_kv_num($kv['proklima_max'] ?? null, 1500),
        'kumCapPct' => hw_kv_num($kv['kum_cap_pct'] ?? null, 0.6),
        'co2f' => [
            'gas' => hw_kv_num($kv['co2f_gas'] ?? null, 0.182),
            'oel' => hw_kv_num($kv['co2f_oel'] ?? null, 0.266),
        ],
        'bioStufen' => hw_kv_nutzen_parameter([])['bioStufen'],
        'etaNeu' => [
            'gas' => hw_kv_num($kv['eta_neu_gas'] ?? null, 0.95),
            'oel' => hw_kv_num($kv['eta_neu_oel'] ?? null, 0.93),
        ],
        'strommix' => [
            'startY' => hw_kv_num($kv['strommix_start_jahr'] ?? null, 2026),
            'startG' => hw_kv_num($kv['strommix_start_g'] ?? null, 350),
            'endY' => hw_kv_num($kv['strommix_end_jahr'] ?? null, 2040),
            'endG' => hw_kv_num($kv['strommix_end_g'] ?? null, 100),
        ],
        'wartungWp' => hw_kv_num($kv['wartung_wp'] ?? null, 350),
        'wartungFossil' => hw_kv_num($kv['wartung_fossil'] ?? null, 250),
        'startY' => hw_kv_num($kv['start_jahr'] ?? null, 2026),
        'co2ZielSchritte' => hw_kv_num($kv['co2_ziel_schritte'] ?? null, 19),
        'kredLZDefault' => hw_kv_num($kv['kred_lz_default'] ?? null, 10),
        'kredZinsDefault' => hw_kv_num($kv['kred_zins_default'] ?? null, 0.035),
        'kredZins358Eff' => hw_kv_num($kv['kred_zins_358_eff'] ?? null, 0.98),
        'kredZins359Eff' => hw_kv_num($kv['kred_zins_359_eff'] ?? null, 4.10),
        'kredZinsZveGrenze' => hw_kv_num($kv['kred_zins_zve_grenze'] ?? null, 90000),
        'kredBereitstellungProv' => hw_kv_num($kv['kred_bereitstellung_prov'] ?? null, 0.15),
        'kredZinsStand' => hw_js_string($kv['kred_zins_stand'] ?? ''),
        'kredZinsQuelle' => hw_js_string($kv['kred_zins_quelle'] ?? ''),
        'sensi' => [
            'best' => ['fossil' => hw_kv_num($kv['sensi_best_fossil'] ?? null, 0.015), 'strom' => hw_kv_num($kv['sensi_best_strom'] ?? null, -0.01)],
            'base' => ['fossil' => 0, 'strom' => 0],
            'worst' => ['fossil' => hw_kv_num($kv['sensi_worst_fossil'] ?? null, -0.015), 'strom' => hw_kv_num($kv['sensi_worst_strom'] ?? null, 0.015)],
        ],
        'co2FlugT' => hw_kv_num($kv['co2_flug_t'] ?? null, 0.5),
        'co2BaumKg' => hw_kv_num($kv['co2_baum_kg'] ?? null, 12.5),
        'schaetzung' => $schaetzung,
    ];
    $p['nutzenRoh']=$kv;
    return $p;
}

// Ausschließlich Kostenvergleich und Bootstrap: Förderung bleibt von Kostentabellen unabhängig.
function hw_kv_kostenparameter(array $sheets): array
{
    $p=hw_kv_get_params($sheets);
    $kv=$p['nutzenRoh'];
    $p=array_replace($p,hw_kv_nutzen_parameter($kv));
    $p['jazLive']=($kv['jaz_tabellenstand']??'')==='2026-10-26';
    if(array_key_exists('KV_JAZ',$sheets)){$p['jazTabelle']=hw_kv_jaz_aus_zeilen($sheets['KV_JAZ']);$p['jazTabellenstand']='KV_JAZ';}
    else {$p['jazTabellenstand']='Gebündelter Tabellenstand 26.10.2026';}
    $dim=isset($sheets['Dimensionierung'])?hw_read_kv($sheets,'Dimensionierung'):[];
    if(isset($dim['ww_abzug_kwh_pro_person_jahr']))$p['wwKwhProPerson']=hw_kv_num($dim['ww_abzug_kwh_pro_person_jahr'],700);
    return $p;
}

function hw_grenze_interp(float|int $a11, float|int $a10, float|int $nat): float|int
{
    if (!$a10) {
        return $a11;
    }
    $factor = hw_num($nat, -11) + 11;
    // Nur die obere Grenze bleibt bestehen. Unterhalb von A-11 wird die Kennlinie extrapoliert.
    $factor = min(1, $factor);
    return $a11 + ($a10 - $a11) * $factor;
}

/** @param array<string,mixed> $item */
function hw_leistung_am_auslegungspunkt(array $item, string $heizsystem, float|int $nat): float|int
{
    return $heizsystem === 'heizkoerper'
        ? hw_grenze_interp($item['leistungW55'], $item['leistungW55a10'], $nat)
        : hw_grenze_interp($item['leistungW35'], $item['leistungW35a10'], $nat);
}

/** @param array<string,float|int|string> $d */
function hw_faktor_nutzwaerme(array $d, string $heizung, string $andereHeizung, string $abgasrohr, string $heizungsalter): float|int
{
    if (in_array($heizung, ['nachtspeicher', 'nacht'], true)) {
        return hw_get_num($d, 'eta_nachtspeicher', 0.97);
    }
    if (in_array($heizung, ['sonstige', 'sonst'], true)) {
        return match ($andereHeizung) {
            'fernwaerme' => hw_get_num($d, 'eta_fernwaerme', 0.98),
            'pellet' => hw_get_num($d, 'eta_pellet', 0.80),
            'waermepumpe' => hw_get_num($d, 'jaz_bestand_waermepumpe', 2.8),
            default => hw_get_num($d, 'eta_andere_unklar', 0.85),
        };
    }
    if ($abgasrohr === 'unklar') {
        return hw_get_num($d, 'eta_unklar', 0.85);
    }
    if ($abgasrohr === 'metall') {
        return $heizungsalter === 'vor1990'
            ? hw_get_num($d, 'eta_metall_vor1990', 0.70)
            : hw_get_num($d, 'eta_metall_sonst', 0.80);
    }
    if ($abgasrohr === 'kunststoff') {
        if ($heizungsalter === 'nach2010') {
            return hw_get_num($d, 'eta_kunststoff_nach2010', 0.93);
        }
        return in_array($heizung, ['oel', 'öl'], true)
            ? hw_get_num($d, 'eta_kunststoff_oel', 0.90)
            : hw_get_num($d, 'eta_kunststoff_gas', 0.86);
    }
    return hw_get_num($d, 'eta_unklar', 0.85);
}

/** @param array<string,float|int|string> $d */
function hw_warmwasser_leistung(array $d, int $personen, int $duschen, int $wannen, string $duschgroesse, string $wannengroesse): float|int
{
    $personenFaktor = $personen <= 2
        ? hw_get_num($d, 'ww_f_1_2', 1.0)
        : ($personen <= 5 ? hw_get_num($d, 'ww_f_3_5', 1.5) : hw_get_num($d, 'ww_f_6plus', 2.0));
    $duschenwerte = [
        '0' => hw_get_num($d, 'ww_dusche_sparsam', 0.6250),
        'sparsam' => hw_get_num($d, 'ww_dusche_sparsam', 0.6250),
        '1' => hw_get_num($d, 'ww_dusche_normal', 0.9375),
        'normal' => hw_get_num($d, 'ww_dusche_normal', 0.9375),
        '2' => hw_get_num($d, 'ww_dusche_massage', 1.4075),
        'massage' => hw_get_num($d, 'ww_dusche_massage', 1.4075),
        '3' => hw_get_num($d, 'ww_dusche_regen', 1.9550),
        'regen' => hw_get_num($d, 'ww_dusche_regen', 1.9550),
    ];
    $wannenwerte = [
        '0' => hw_get_num($d, 'ww_wanne_klein', 1.7200),
        'klein' => hw_get_num($d, 'ww_wanne_klein', 1.7200),
        '1' => hw_get_num($d, 'ww_wanne_normal', 2.4700),
        'normal' => hw_get_num($d, 'ww_wanne_normal', 2.4700),
        '2' => hw_get_num($d, 'ww_wanne_gross', 3.1250),
        'gross' => hw_get_num($d, 'ww_wanne_gross', 3.1250),
        '3' => hw_get_num($d, 'ww_wanne_sehrgross', 5.4700),
        'sehrgross' => hw_get_num($d, 'ww_wanne_sehrgross', 5.4700),
    ];
    $zapflast = ($wannenwerte[$wannengroesse] ?? $wannenwerte['1']) * $wannen
        + ($duschenwerte[$duschgroesse] ?? $duschenwerte['1']) * max(0, $duschen - $wannen);
    $temperatur = hw_get_num($d, 'ww_temperatur_grad', 55);
    return $personenFaktor * $zapflast * 50 / ($temperatur - 10) + hw_get_num($d, 'ww_sockel_kw', 0.70);
}

// ==========================================================================================================
// AUSLEGUNGSMECHANIK, MASSGEBLICHE BESCHREIBUNG (Mensch und Maschine, Stand 03.09.2026):
//   Vault 11_Produkt/Auslegungsmechanik_Konfigurator-und-Website_HERO.md
// Entscheide: 12.08.2026 (Warmwasser als Fuehrungsgroesse, Kaskaden-Deckungsgrad), 14.08.2026 (Auswahlregel: kleinste
// Leistung ab Mindest-Leistungsanteil, Kaskade je Baureihe), 16.08.2026 (Obergrenze anzeigen statt filtern),
// 17.08.2026 (Kennzahlen in den Konfigurator, Website zeigt nur den Geraetetyp), 01.09.2026 (Zwei-Geraete-Grenze).
// 14.10.2026 (nur Website: Mindestdeckung website_mindestanteil, Rueckfall 0,80; der Konfigurator-Zwilling bleibt ohne).
// Stellraeder: HeroWerk_Website_Daten, Blatt Dimensionierung, Schluessel sollband_unten, sollband_oben und
// kaskaden_toleranz_kw (ueber den Schluessel in Spalte A gefunden, nie ueber eine Zeilennummer); Marken-Heizstab
// Geraete_Katalog, Schluessel heizstab_wolf und heizstab_vaillant; Zwei-Geraete-Grenze ueber den Kopftext Auswahl.
// Zwillinge: apps-script/rechner-backend/Code.gs matchCatalogVarianten_ und herowerk-konfigurator Code.js
// matchCatalogVarianten_. Wer die Regel aendert: zuerst der Entscheid, dann die Vault-Datei, dann ALLE Kerne
// zeichengleich, dann die Erklaerzellen der Blaetter.
// ==========================================================================================================
/** @return list<array<string,mixed>> */
function hw_match_catalog_varianten(
    array $sheets,
    string $brand,
    float|int $auslegung,
    string $heizsystem,
    float|int $nat,
    float|int $markenHeizstab,
    float|int $kaskadenToleranz,
    float|int $websiteMindestanteil = 0,
    ?array $tables = null
): array
{
    $grenze = static fn (array $item): float|int => $heizsystem === 'heizkoerper'
        ? hw_grenze_interp($item['grenzeW55'], $item['grenzeW55a10'], $nat)
        : hw_grenze_interp($item['grenzeW35'], $item['grenzeW35a10'], $nat);
    $items = array_values(array_filter(hw_get_catalog($sheets, $tables), static fn (array $item): bool => $item['marke'] === $brand));

    $groessteEinzelgrenze = [];
    foreach ($items as $item) {
        if ($item['kaskade']) {
            continue;
        }
        $baureihe = $item['baureihe'];
        $itemGrenze = $grenze($item);
        if (!array_key_exists($baureihe, $groessteEinzelgrenze) || $itemGrenze > $groessteEinzelgrenze[$baureihe]) {
            $groessteEinzelgrenze[$baureihe] = $itemGrenze;
        }
    }

    $picks = [];
    foreach ($items as $item) {
        if ($item['sonderplanung'] === true) {
            continue; // T901: als Sonderplanung gekennzeichnete Zeile ist kein Kandidat des Rechners
        }
        $leistung = hw_leistung_am_auslegungspunkt($item, $heizsystem, $nat);
        $mindestAnteil = $item['mindestAnteil'];
        $heizstab = $mindestAnteil >= 1 ? 0 : $markenHeizstab;
        $empfehlungsgrenze = $heizsystem === 'heizkoerper' ? $item['empfehlungW55'] : $item['empfehlungW35'];
        $anteilErfuellt = ($leistung >= $mindestAnteil * $auslegung
            || ($empfehlungsgrenze !== null && $auslegung <= $empfehlungsgrenze))
            // GF 14.10.2026: die Website zeigt kein Geraet unter der Website-Mindestdeckung, auch nicht ueber die
            // Empfehlungsgrenze des Konfigurators; der Kunde soll nicht mit zu knapper Erwartung anfragen.
            && $leistung >= $websiteMindestanteil * $auslegung;
        if (!$anteilErfuellt || $leistung + $heizstab < $auslegung) {
            continue;
        }
        if ($item['kaskade']) {
            $baureihe = $item['baureihe'];
            if (
                !array_key_exists($baureihe, $groessteEinzelgrenze)
                || $auslegung <= $groessteEinzelgrenze[$baureihe] + $kaskadenToleranz
            ) {
                continue;
            }
        }
        $baureihe = $item['baureihe'];
        if (!isset($picks[$baureihe]) || $leistung < $picks[$baureihe]['leistungAuslegung']) {
            $item['leistungAuslegung'] = $leistung;
            $picks[$baureihe] = $item;
        }
    }
    $out = array_values($picks);
    usort($out, static function (array $left, array $right): int {
        $leistung = $left['leistungAuslegung'] <=> $right['leistungAuslegung'];
        return $leistung !== 0 ? $leistung : $left['reihenfolge'] <=> $right['reihenfolge'];
    });
    return $out;
}

/** @return array<string,mixed>|null */
function hw_match_catalog(
    array $sheets,
    string $brand,
    float|int $auslegung,
    string $heizsystem,
    float|int $nat,
    float|int $markenHeizstab,
    float|int $kaskadenToleranz,
    ?array $tables = null
): ?array {
    return hw_match_catalog_varianten(
        $sheets, $brand, $auslegung, $heizsystem, $nat, $markenHeizstab, $kaskadenToleranz, 0, $tables
    )[0] ?? null;
}

// T901: traegt das Blatt Geraete_Katalog die Spalte Sonderplanung? Ohne sie bleiben Kaskaden ueber zwei Geraete waehlbar, und die
// Antwort sagt das ausdruecklich (sonderplanung_kennzeichnung 'fehlt' plus Hinweis), statt still zu filtern oder still zu schweigen.
function hw_sonderplanung_gekennzeichnet(array $sheets, ?array $tables = null): bool
{
    $katalog = hw_get_catalog($sheets, $tables);
    return $katalog !== [] && $katalog[0]['sonderplanung'] !== null;
}

/** @return list<string> */
function hw_sonderplanung_hinweise(bool $gekennzeichnet): array
{
    return $gekennzeichnet ? [] : ['Kennzeichnung Sonderplanung fehlt im Blatt Geräte_Katalog (Spalte "Auswahl", ja gleich wählbar, sonst Sonderplanung; Entscheid 01.09.2026): Kaskaden mit drei und mehr Außengeräten bleiben wählbar.'];
}

function hw_geraete_anzahl(mixed $modell): int
{
    return preg_match('/^\s*(\d+)\s*[×x]\s*/iu', hw_js_string($modell), $match)
        ? max(1, (int) $match[1])
        : 1;
}

function hw_kennlinien_key(mixed $modell): string
{
    $key = preg_replace('/^\s*\d+\s*[×x]\s*/iu', '', hw_js_string($modell));
    $key = preg_replace('/\s*\(Kaskade\)\s*$/iu', '', $key ?? '');
    $key = preg_replace('/^\s*(?:Vaillant|Wolf)\s+/iu', '', $key ?? '');
    return strtolower(trim($key ?? ''));
}

function hw_gebaeude_leistung(float|int $auslegung, float|int $nat, float|int $heizgrenze, float|int $temperatur): ?float
{
    $spanne = $heizgrenze - $nat;
    return $spanne > 0 ? $auslegung * ($heizgrenze - $temperatur) / $spanne : null;
}

function hw_kennlinien_schnittpunkt(
    array $punkte,
    string $feld,
    int $faktor,
    float|int $auslegung,
    float|int $nat,
    float|int $heizgrenze
): float|int|null {
    $werte = [];
    foreach ($punkte as $punkt) {
        if (!is_numeric($punkt['temperatur'] ?? null)
            || !is_numeric($punkt[$feld] ?? null)
            || $punkt['temperatur'] > $heizgrenze) {
            continue;
        }
        $gebaeude = hw_gebaeude_leistung($auslegung, $nat, $heizgrenze, $punkt['temperatur']);
        if ($gebaeude === null) {
            return null;
        }
        $werte[] = [
            'temperatur' => $punkt['temperatur'],
            'differenz' => $punkt[$feld] * $faktor - $gebaeude,
        ];
    }
    usort($werte, static fn (array $left, array $right): int => $left['temperatur'] <=> $right['temperatur']);
    for ($index = 0, $count = count($werte) - 1; $index < $count; $index++) {
        $links = $werte[$index];
        $rechts = $werte[$index + 1];
        if ($links['differenz'] == 0) {
            return hw_round1($links['temperatur']);
        }
        if ($links['differenz'] * $rechts['differenz'] > 0) {
            continue;
        }
        $nenner = $rechts['differenz'] - $links['differenz'];
        if ($nenner == 0) {
            return null;
        }
        return hw_round1(
            $links['temperatur']
            - $links['differenz'] * ($rechts['temperatur'] - $links['temperatur']) / $nenner
        );
    }
    if ($werte !== [] && $werte[array_key_last($werte)]['differenz'] == 0) {
        return hw_round1($werte[array_key_last($werte)]['temperatur']);
    }
    return null;
}

function hw_kaskaden_mindestleistung(array $item, array $punkte): ?float
{
    // T505: Kaskaden-Mindestleistung gegen die Vaillant-Taktpunkte kalibrieren.
    // Messgrundlage: Vaillant, Median 11 °C bei Zweier-Kaskaden (n=174) gegen 8 °C bei Einzelgeräten (n=163).
    // Bis zur Fachentscheidung wird weder n-fach skaliert noch ein aktives Einzelgerät unterstellt.
    return null;
}

function hw_bivalenzpunkt(array $item, array $context, float|int $auslegung): float|int|null
{
    $key = hw_kennlinien_key($item['modell']);
    $vorlauf = $context['heizsystem'] === 'heizkoerper' ? '55' : '35';
    $punkte = $context['kennlinien'][$key][$vorlauf] ?? [];
    return hw_kennlinien_schnittpunkt(
        $punkte, 'volllast', hw_geraete_anzahl($item['modell']), $auslegung, $context['nat'], $context['heizgrenze']
    );
}

function hw_taktpunkt(array $item, array $context, float|int $auslegung): float|int|null
{
    $key = hw_kennlinien_key($item['modell']);
    $vorlauf = $context['heizsystem'] === 'heizkoerper' ? '55' : '35';
    $punkte = $context['kennlinien'][$key][$vorlauf] ?? [];
    if ($item['kaskade']) {
        return hw_kaskaden_mindestleistung($item, $punkte);
    }
    return hw_kennlinien_schnittpunkt(
        $punkte, 'mindest', 1, $auslegung, $context['nat'], $context['heizgrenze']
    );
}

/** @return array<string,mixed> */
function hw_catalog_result(
    array $item,
    array $priceRows,
    float|int $auslegung,
    float|int $sollbandOben,
    ?array $context = null
): array
{
    $price = null;
    if ($item['brutto'] > 0) {
        foreach ($priceRows as $row) {
            if ($row['brutto'] === $item['brutto']) {
                $price = $row;
                break;
            }
        }
    }
    $eigen = $price !== null ? $price['eigen'] : null;
    $eigenProklima = $price !== null && $price['proklima'] > 0 && $price['proklima'] < $price['eigen']
        ? $price['proklima']
        : null;
    return [
        'deckt' => true,
        'baureihe' => $item['baureihe'] !== '' ? $item['baureihe'] : null,
        'modell' => $item['modell'],
        'anzahl' => hw_geraete_anzahl($item['modell']),
        'kaskade' => $item['kaskade'],
        'leistung_kw' => hw_round1($item['leistungAuslegung']),
        'leistungsanteil_prozent' => hw_round1($item['leistungAuslegung'] / $auslegung * 100),
        'taktpunkt_c' => $context === null ? null : hw_taktpunkt($item, $context, $auslegung),
        'bivalenzpunkt_c' => $context === null ? null : hw_bivalenzpunkt($item, $context, $auslegung),
        'puffer' => $item['puffer'] !== '' ? [
            'bezeichnung' => $item['puffer'],
            'liter' => $item['pufferLiter'],
            'groessere_variante' => $item['pufferGroesser'] !== '' ? $item['pufferGroesser'] : null,
            'ohne_puffer_moeglich' => $item['pufferOhne'],
        ] : null,
        'brutto' => $item['brutto'] > 0 ? $item['brutto'] : null,
        'preis_hinterlegt' => $item['brutto'] > 0,
        'empfohlen' => false,
        'eigenanteil' => $eigen,
        'eigenanteilProklima' => $eigenProklima,
        'vorlaeufig' => strtolower(hw_js_string($item['stand'])) !== 'belegt',
        'ueberSollband' => $item['leistungAuslegung'] > $sollbandOben * $auslegung,
    ];
}

/** @return array<string,mixed> */
function hw_dimensionierung(array $query, array $sheets, ?array $tables = null): array
{
    $d = hw_read_kv($sheets, 'Dimensionierung');
    // Grenzen der Bedienoberflaeche serverseitig durchsetzen: der Schieberegler fuer die
    // Wohnflaeche laesst 60 bis 800 Quadratmeter zu, der fuer den Verbrauch 500 bis 12.000
    // der gewaehlten Einheit. Ohne diese Klemme nimmt der Kern jeden Aufrufwert an und
    // liefert offensichtlich falsche Auslegungen (gemessen: 20.000 Liter Heizoel -> 93,7 kW).
    $flaeche = hw_num($query['flaeche'] ?? null, 0);
    if ($flaeche > 0) {
        $flaeche = min(hw_get_num($d, 'flaeche_max', 800), max(hw_get_num($d, 'flaeche_min', 60), $flaeche));
    }
    $baujahr = hw_baujahr_klasse(hw_query_string($query, 'baujahr', '1978-1994'));
    $gebaeude = hw_query_string($query, 'gebaeude', 'efh');
    $sanierung = hw_query_string($query, 'sanierung', 'nein');
    $warmwasser = strtolower(hw_query_string($query, 'warmwasser', 'ja'));
    $heizsystem = strtolower(hw_query_string($query, 'heizsystem', 'heizkoerper'));
    $knownValue = strtolower(hw_query_string($query, 'verbrauchKnown'));
    $verbrauchKnown = in_array($knownValue, ['known', 'true', 'ja'], true);
    $verbrauch = hw_num($query['verbrauch'] ?? null, 0);
    $einheit = strtolower(hw_query_string($query, 'einheit', 'kwh'));
    if ($einheit === 'liter') {
        $verbrauch *= hw_get_num($d, 'oel_faktor', 10);
    }
    if ($einheit === 'm3') {
        $verbrauch *= hw_get_num($d, 'gas_faktor', 10);
    }
    // Klemme in Kilowattstunden, NACH der Umrechnung: alle drei Einheiten der Bedienoberflaeche
    // spannen denselben Bereich auf (5.000 bis 120.000 kWh, also 500 bis 12.000 Liter bzw. Kubikmeter).
    // Ohne sie nimmt der Kern jeden Aufrufwert an; gemessen: 20.000 Liter Heizoel ergaben 93,7 kW.
    if ($verbrauch > 0) {
        $verbrauch = min(hw_get_num($d, 'verbrauch_max_kwh', 120000), max(hw_get_num($d, 'verbrauch_min_kwh', 5000), $verbrauch));
    }

    // AUFGEHOBEN AM 09.09.2026: dies war bis zum Bau von Teil A eine ÜBERGANGSLÖSUNG, die neun
    // Baujahresklassen auf vier abbildete und damit die Heizlast an vier Klassen aufhängte,
    // obwohl der Kunde neun beantwortet. Das ist behoben: die HEIZLAST kommt jetzt aus
    // hw_flaechen_heizlast() und kennt elf Klassen.
    // Diese Abbildung bleibt und ist KEINE Übergangslösung mehr: sie bedient allein die
    // Endenergie-Richtwerte nach VDI 3807, die es nur in vier Klassen gibt und die nach dem
    // Entscheid vom 13.08.2026 ausschließlich noch die Stromschätzung und den Kostenvergleich
    // tragen, also die Geldseite. Wer sie wieder in die Heizlast zieht, dreht den Entscheid um.
    $baujahrMapping = [
        'bis1918' => 'vor1978', '1919-1948' => 'vor1978', '1949-1957' => 'vor1978',
        '1958-1968' => 'vor1978', '1969-1978' => 'vor1978',
        '1979-1983' => '1978-1994', '1984-1994' => '1978-1994',
        '1995-2001' => '1995-2010', '2002-2009' => '1995-2010',
        '2010-2015' => 'nach2010', 'ab2016' => 'nach2010',
        '1995-2010' => '1995-2010', 'nach2010' => 'nach2010',
    ];
    $bedarfStufen = ['vor1978', '1978-1994', '1995-2010', 'nach2010'];
    $effBaujahr = $baujahrMapping[$baujahr] ?? $baujahr;
    $index = array_search($effBaujahr, $bedarfStufen, true);
    if ($sanierung === 'teilweise' && $index !== false) {
        $effBaujahr = $bedarfStufen[min($index + 1, count($bedarfStufen) - 1)];
    }
    if ($sanierung === 'umfassend' && $index !== false) {
        $effBaujahr = $bedarfStufen[min($index + 2, count($bedarfStufen) - 1)];
    }
    $bedarfKwh = $verbrauchKnown
        ? $verbrauch
        : hw_js_round($flaeche * hw_get_num($d, 'spez_bedarf_' . hw_key($effBaujahr), 140) * hw_gebaeude_faktor($d, $gebaeude));

    $klima = hw_get_klima_plz($sheets);
    $plzKey = substr((string) preg_replace('/\D/', '', hw_query_string($query, 'plz')), 0, 5);
    $zone = $klima[$plzKey] ?? $klima['*'] ?? ['nat' => -11, 'volllast' => 1800];

    // Die vier Bauteilangaben der Fragestrecke, Stufe 1 keine, 2 übliche, 3 tiefgreifende
    // Sanierung. Sie werden seit dem 09.09.2026 EINZELN gerechnet; bis dahin hat die
    // Bedienoberfläche sie zu einer Summe addiert und auf drei Sanierungsstufen verdichtet.
    // Fehlen sie im Aufruf, greift Stufe 1, also unsaniert, und der Fall rechnet konservativ.
    // Absichtlich vier einzelne, literal ausgeschriebene Lesevorgaenge und keine Schleife ueber
    // eine Namensliste: der Feldpruefer (_tools/feldpruefer_rechner.py) findet nur, was literal
    // dasteht. Wer hier eine Schleife baut, macht die Felder fuer ihn unsichtbar.
    $bauteile = [
        'dach' => max(1, min(3, hw_int($query['dach'] ?? null, 1))),
        'fenster' => max(1, min(3, hw_int($query['fenster'] ?? null, 1))),
        'wand' => max(1, min(3, hw_int($query['wand'] ?? null, 1))),
        'boden' => max(1, min(3, hw_int($query['boden'] ?? null, 1))),
    ];
    $personen = max(1, min(8, hw_int($query['personen'] ?? null, 2)));
    $heizung = strtolower(hw_query_string($query, 'heizung', 'gas'));
    $andereHeizung = strtolower(hw_query_string($query, 'andere_heizung', 'fernwaerme'));
    $abgasrohr = strtolower(hw_query_string($query, 'abgasrohr', 'unklar'));
    $heizungsalter = strtolower(hw_query_string($query, 'heizungsalter', 'unklar'));
    $faktorNutzwaerme = hw_faktor_nutzwaerme($d, $heizung, $andereHeizung, $abgasrohr, $heizungsalter);
    $bestandMitWarmwasser = in_array($heizung, ['gas', 'gas-old', 'gas-new', 'gas-etage', 'gasetage', 'oel', 'öl'], true)
        || (in_array($heizung, ['sonstige', 'sonst'], true) && in_array($andereHeizung, ['fernwaerme', 'pellet', 'waermepumpe', 'unklar'], true));
    $nutzwaerme = $verbrauchKnown ? $bedarfKwh * $faktorNutzwaerme : $bedarfKwh;
    $warmwasserWaerme = $personen * hw_get_num($d, 'ww_abzug_kwh_pro_person', 700);
    $raumwaerme = max(0, $nutzwaerme - ($verbrauchKnown && $bestandMitWarmwasser ? $warmwasserWaerme : 0));
    // VERBRAUCHSPFAD AN VAILLANT ANGEGLICHEN, GF-Entscheid vom 19.08.2026, 11:54 Uhr
    // (_Entscheidungen/2026-08-19_Heizlast-an-Vaillant-angleichen_HERO.md, Vorgang T555).
    // Kennt der Kunde seinen Jahresverbrauch, wird die Heizlast aus dem ROHEN Verbrauch gerechnet,
    // also OHNE Kesselwirkungsgrad und OHNE Warmwasser-Abzug, genau wie es die Vaillant-Auslegung
    // tut. Vorher lagen wir dadurch 16,9 bis 24,4 Prozent unter Vaillant.
    // Der FLAECHENPFAD bleibt unveraendert; er ist ausdruecklich NICHT mitentschieden (Vorgang T320).
    // $raumwaerme bleibt die Nutzwaerme und traegt weiterhin die Stromverbrauchs-Schaetzung; nur die
    // Heizlast bekommt ihre eigene Bezugsgroesse.
    // EINE AUSNAHME, abgeleitet und nicht erfunden: der Entscheid spricht vom rohen GASverbrauch,
    // und die Messung der Abweichung lief ueber zwoelf Gas-Szenarien. Bei einer BESTEHENDEN
    // WAERMEPUMPE ist der abgelesene Wert aber Strom und der Faktor keine Verlustzahl, sondern eine
    // Jahresarbeitszahl ueber 1 (jaz_bestand_waermepumpe = 2,8). Wer ihn dort weglaesst, rechnet
    // Strom als Waerme und legt das Haus um den Faktor 2,8 zu klein aus. Ein Faktor ueber 1 bleibt
    // deshalb erhalten; der Warmwasser-Abzug entfaellt auch dort.
    $heizlastWaerme = $verbrauchKnown
        ? ($faktorNutzwaerme > 1 ? $nutzwaerme : $bedarfKwh)
        : $raumwaerme;
    // ZWEI WEGE, ZWEI RECHNUNGEN. Kennt der Kunde seinen Jahresverbrauch, bleibt es beim
    // Verbrauchsweg über die Vollbenutzungsstunden, angeglichen an Vaillant (Entscheid
    // 19.08.2026). Kennt er ihn nicht, rechnet der Flächenweg seit dem 09.09.2026 bauteilweise
    // nach dem Verfahren des Bundesverbands (Entscheid 12.08.2026) und teilt NICHT mehr durch
    // 1.800 Stunden: sein Ergebnis ist bereits eine Leistung, keine Jahresarbeit.
    $heizlast = $verbrauchKnown
        ? $heizlastWaerme / hw_get_num($d, 'volllaststunden', 1800)
        : hw_flaechen_heizlast($baujahr, $bauteile, $flaeche, (float) $zone['nat'], hw_gebaeude_faktor($d, $gebaeude));
    $wwLeistung = $warmwasser === 'ja'
        ? hw_warmwasser_leistung(
            $d,
            $personen,
            max(0, min(6, hw_int($query['duschen'] ?? null, 1))),
            max(0, min(3, hw_int($query['wannen'] ?? null, 1))),
            strtolower(hw_query_string($query, 'duschgroesse', '1')),
            strtolower(hw_query_string($query, 'wannengroesse', '1'))
        )
        : 0;
    $auslegungRoh = max($heizlast, $wwLeistung);
    $auslegung = hw_round1($auslegungRoh);
    $stromverbrauch = hw_js_round(
        $raumwaerme / hw_get_num($d, 'jaz_heizung', 3.8)
        + ($warmwasser === 'ja' ? $warmwasserWaerme / hw_get_num($d, 'jaz_warmwasser', 2.7) : 0)
    );
    $marken = [];
    $catalogParameters = hw_read_kv($sheets, 'Geräte_Katalog');
    $kennlinien = hw_get_kennlinien($sheets);
    $heizgrenze = hw_get_num($d, 'heizgrenze_c', 15);
    foreach (['wolf', 'vaillant'] as $brand) {
        $heizstabKey = 'heizstab_' . $brand;
        $markenHeizstab = hw_kv_num($catalogParameters[$heizstabKey] ?? null, NAN);
        if (is_nan($markenHeizstab)) {
            throw new RuntimeException('missing_parameter_' . $heizstabKey);
        }
        $matches = hw_match_catalog_varianten(
            $sheets,
            $brand,
            $auslegung,
            $heizsystem,
            $zone['nat'],
            $markenHeizstab,
            hw_get_num($d, 'kaskaden_toleranz_kw', 0.5),
            // Treiber im Blatt Dimensionierung, Schluessel website_mindestanteil; Rueckfall 0,80 (GF 14.10.2026).
            hw_get_num($d, 'website_mindestanteil', 0.8),
            $tables
        );
        $varianten = [];
        foreach ($matches as $index => $match) {
            $result = hw_catalog_result(
                $match,
                hw_read_price_table($sheets, $brand === 'vaillant' ? 'Preise_Vaillant' : 'Preise_Wolf', $tables),
                $auslegung,
                hw_get_num($d, 'sollband_oben', 0.8),
                [
                    'kennlinien' => $kennlinien,
                    'nat' => $zone['nat'],
                    'heizgrenze' => $heizgrenze,
                    'heizsystem' => $heizsystem,
                ]
            );
            $result['empfohlen'] = $index === 0;
            $varianten[] = $result;
        }
        if ($varianten !== []) {
            $marken[$brand] = $varianten[0];
            $marken[$brand]['varianten'] = $varianten;
        } else {
            $marken[$brand] = ['deckt' => false, 'varianten' => []];
        }
    }
    $sonderplanungGekennzeichnet = hw_sonderplanung_gekennzeichnet($sheets, $tables);
    return [
        'bedarf' => $auslegung,
        'fuehrung' => $wwLeistung > $heizlast ? 'warmwasser' : 'heizung',
        'stromverbrauch_kwh' => $stromverbrauch,
        'strom_hinweis' => 'Geschätzt aus deinem Wärmebedarf. Wie viel Strom deine Wärmepumpe wirklich braucht, hängt an Gebäude, Vorlauftemperatur und Gerät und wird vor Ort genauer bestimmt. Warmwasser braucht dabei mehr Strom je Kilowattstunde Wärme als die Heizung.',
        'taktpunkt_grenze_c' => $d['taktpunkt_grenze_c'] ?? null,
        'taktpunkt_grenze_wirksam' => false,
        'sonderplanung_kennzeichnung' => $sonderplanungGekennzeichnet ? 'vorhanden' : 'fehlt', // T901, Innenfeld, wird vor der Ausgabe entfernt
        'hinweise' => hw_sonderplanung_hinweise($sonderplanungGekennzeichnet),
        'marken' => $marken,
    ];
}

/** @return list<array<string,mixed>> */
function hw_foerder_perioden_aus_kv(array $params): array
{
    $out = [];
    foreach (array_merge(['alt'], $params['periodenReihenfolge'] ?? []) as $id) {
        $period = $params['perioden'][$id];
        $von = str_replace('-', '', hw_js_string($period['gueltigAb'] ?? ''));
        $bis = str_replace('-', '', hw_js_string($period['gueltigBis'] ?? ''));
        $out[] = [
            'id' => $id,
            'von' => $von !== '' ? hw_kv_num($von, 0) : 0,
            'bis' => $bis !== '' ? hw_kv_num($bis, 99991231) : 99991231,
            'reform' => $id !== 'alt',
            'klima' => hw_kv_num($period['klima'] ?? null, 0),
            'grenze' => hw_kv_num($period['grenze'] ?? null, 0),
            'eu' => (bool) ($period['eu'] ?? false),
            'cap' => $period['cap'] ?? null,
            'effizienzPct' => $period['effizienzPct'] ?? null,
            'kindFreibetrag' => $period['kindFreibetrag'] ?? null,
            'einkStufen' => $period['einkStufen'] ?? [],
            'label' => $id === 'alt' ? 'Anträge bis 20.07.2026' : hw_js_string(($period['label'] ?? '') ?: ''),
        ];
    }
    return $out;
}

/** @return array<string,mixed> */
function hw_periode_fuer(string $date, array $perioden): array
{
    $ymd = (int) str_replace('-', '', substr($date, 0, 10));
    foreach ($perioden as $period) {
        if ($ymd >= $period['von'] && $ymd <= $period['bis']) {
            return $period;
        }
    }
    $last = $perioden[count($perioden) - 1];
    $last['ueberHorizont'] = true;
    return $last;
}

/**
 * Einkommensklassen des Foerderrechners. Die Staffel ist nach oben GESCHLOSSEN:
 * bis30 | bis40 | bis50 | bis60 | bis90 | ueber90.
 * Alt-Werte bleiben lesbar, damit eine im Browser zwischengespeicherte Seite weiter rechnet:
 *   'unter40' -> 'bis40', 'ueber40' -> 'ueber50', 'ueber50' -> bleibt (offen nach oben).
 * Herkunft der Grenzen: Foerderrichtlinie BEG Einzelmassnahmen vom 17.07.2026, Nr. 8.4.5 Abs. 3
 * (Bonusstaffel und einmaliger Kinderabzug) und Nr. 8.1 / 8.5.2 Buchst. a (Zinsgrenze 90.000 Euro).
 */
const HW_EINKOMMEN_KLASSEN = ['bis30', 'bis40', 'bis50', 'bis60', 'bis90', 'ueber90', 'ueber50'];

function hw_einkommen_norm(mixed $value): string
{
    $normalized = strtolower(hw_js_string($value ?: ''));
    if ($normalized === 'unter40') {
        return 'bis40';
    }
    if ($normalized === 'ueber40') {
        return 'ueber50';
    }
    return in_array($normalized, HW_EINKOMMEN_KLASSEN, true) ? $normalized : 'unbekannt';
}

/**
 * Obergrenze des zu versteuernden Haushaltsjahreseinkommens je Klasse.
 * Nach oben offene Klassen tragen ausdruecklich INF und laufen damit durch dieselbe Staffel wie
 * jede andere Klasse. Genau das fehlte bis zum 19.08.2026: 'ueber50' fiel aus dem Grenzen-Feld
 * heraus und lieferte deshalb IMMER null Prozent, auch mit Kind, obwohl 55.000 minus 10.000
 * Kinderabzug auf der Zehn-Prozent-Stufe liegt.
 *
 * @return array<string,float|int>
 */
function hw_einkommen_grenzen(array $f): array
{
    return [
        'bis30' => hw_get_num($f, 'reform_eink_grenze_bis30', 30000),
        'bis40' => hw_get_num($f, 'reform_eink_grenze_bis40', 40000),
        'bis50' => hw_get_num($f, 'reform_eink_grenze_bis50', 50000),
        'bis60' => hw_get_num($f, 'reform_eink_grenze_bis60', 60000),
        'bis90' => hw_get_num($f, 'reform_eink_grenze_bis90', 90000),
        'ueber90' => INF,
        'ueber50' => INF,
    ];
}

function hw_foerder_rueckfall(
    array $period,
    string $field,
    string $fallbackKey,
    mixed $fallbackValue,
    ?callable $onFallback = null
): mixed {
    $value = $period[$field] ?? null;
    $missing = $value === null || $value === ''
        || ($field === 'einkStufen' && (!is_array($value) || $value === []));
    if (!$missing) {
        return $value;
    }
    if ($onFallback !== null) {
        $onFallback(hw_js_string($period['id'] ?? 'unbekannt'), $field, $fallbackKey);
    }
    return $fallbackValue;
}

/** @return array{cap:float|int,effizienzPct:float|int,kindFreibetrag:float|int,einkStufen:list<array{maxAnr:float|int,pct:float|int}>} */
function hw_foerder_periodenwerte(array $period, array $f, ?callable $onFallback = null): array
{
    $reform = (bool) ($period['reform'] ?? false);
    $grenzen = hw_einkommen_grenzen($f);
    $stufenFallback = $reform
        ? [
            ['maxAnr' => $grenzen['bis30'], 'pct' => hw_get_num($f, 'reform_eink_pct_bis30', 40)],
            ['maxAnr' => $grenzen['bis40'], 'pct' => hw_get_num($f, 'reform_eink_pct_bis40', 30)],
            ['maxAnr' => $grenzen['bis50'], 'pct' => hw_get_num($f, 'reform_eink_pct_bis50', 10)],
        ]
        : [['maxAnr' => $grenzen['bis40'], 'pct' => hw_get_num($f, 'einkommensbonus_pct', 30)]];
    return [
        'cap' => hw_foerder_rueckfall(
            $period,
            'cap',
            $reform ? 'reform_deckel_pct' : 'deckel_selbst_pct',
            hw_get_num($f, $reform ? 'reform_deckel_pct' : 'deckel_selbst_pct', $reform ? 80 : 70),
            $onFallback
        ),
        'effizienzPct' => hw_foerder_rueckfall(
            $period,
            'effizienzPct',
            $reform ? 'Reformregel:0' : 'effizienzbonus_pct',
            $reform ? 0 : hw_get_num($f, 'effizienzbonus_pct', 5),
            $onFallback
        ),
        'kindFreibetrag' => hw_foerder_rueckfall(
            $period,
            'kindFreibetrag',
            $reform ? 'reform_kind_abzug_eur' : 'Altregel:0',
            $reform ? hw_get_num($f, 'reform_kind_abzug_eur', 10000) : 0,
            $onFallback
        ),
        'einkStufen' => hw_foerder_rueckfall(
            $period,
            'einkStufen',
            $reform ? 'reform_eink_pct_bis30/40/50' : 'einkommensbonus_pct',
            $stufenFallback,
            $onFallback
        ),
    ];
}

// T1170 (RL 17.08.2026 Nr. 8.4.5 Abs. 3): anrechenbares Einkommen = Klassenobergrenze minus Kinderabzug; null bei
// 'unbekannt'. Gemeinsame Grundlage für die Bonusstufe und für die Obergrenze des Gesamtsatzes (Nr. 8.4.1).
function hw_einkommen_anrechenbar(string $income, bool $kind, array $f, ?array $periodenWerte = null): float|int|null
{
    $grenzen = hw_einkommen_grenzen($f);
    if (!array_key_exists($income, $grenzen)) {
        return null;
    }
    $werte = $periodenWerte ?? hw_foerder_periodenwerte(['id' => 'legacy', 'reform' => true], $f);
    return max(0, $grenzen[$income] - ($kind ? $werte['kindFreibetrag'] : 0));
}

function hw_einkommensbonus_pct(string $income, bool $kind, array $f, ?array $periodenWerte = null): float|int
{
    $grenzen = hw_einkommen_grenzen($f);
    if (!array_key_exists($income, $grenzen)) {
        return 0;
    }
    // Gerechnet wird mit der KLASSENOBERGRENZE minus einmaligem Kinderabzug, also systematisch
    // konservativ: wer in seiner Klasse unter der Obergrenze liegt, bekommt hoechstens mehr.
    $werte = $periodenWerte ?? hw_foerder_periodenwerte(['id' => 'legacy', 'reform' => true], $f);
    $anrechenbar = max(0, $grenzen[$income] - ($kind ? $werte['kindFreibetrag'] : 0));
    foreach ($werte['einkStufen'] as $stufe) {
        if ($anrechenbar <= $stufe['maxAnr']) {
            return $stufe['pct'];
        }
    }
    return 0;
}

function hw_foerderfaehige_kosten(int $we, array $f, float|int|null $ersteWe = null): float|int
{
    $g1 = $ersteWe ?? hw_get_num($f, 'foerderfaehig_we1', 30000);
    if ($we <= 1) {
        return $g1;
    }
    if ($we <= 6) {
        return $g1 + ($we - 1) * hw_get_num($f, 'foerderfaehig_we2bis6', 15000);
    }
    return $g1 + 5 * hw_get_num($f, 'foerderfaehig_we2bis6', 15000)
        + ($we - 6) * hw_get_num($f, 'foerderfaehig_we7plus', 8000);
}

// T1170 (Festlegung 3.7; Wortlaut des Geschäftsführers vom 09.10.2026 10:38, Frage 78 Weg C, Nachtrag zum Entscheid 30.09.2026,
// Kennung [20261009ae]): der Hinweis bei mehreren Wohneinheiten
// steht genau einmal, wortgleich mit FOERDER_HINWEIS_MEHRERE_WE_ im Apps-Script-Kern.
const HW_FOERDER_HINWEIS_MEHRERE_WE = 'Bei Gebäuden mit mehreren Wohneinheiten wird der Höchstbetrag der förderfähigen Gebäudekosten zu gleichen Teilen auf die Wohneinheiten verteilt. Für selbstgenutzte Wohneinheiten werden zusätzlich die jeweils verfügbaren persönlichen Förderboni berücksichtigt. Bei Wohnungseigentümergemeinschaften (WEG) erfolgt die Antragstellung für eine gemeinsame Heizungsanlage über einen gemeinschaftlichen Basisantrag. Selbstnutzende Eigentümer beantragen einen möglichen Klimageschwindigkeitsbonus und/oder Einkommensbonus jeweils über einen persönlichen Zusatzantrag.';
// T1170 (RL 17.08.2026 Nr. 8.4.1): Obergrenze des Gesamtsatzes 70 Prozent, 80 Prozent nur bei anrechenbarem Einkommen bis
// 30.000 Euro. Die Website hat keine Tabelle, deshalb steht der Standarddeckel hier als Konstante; trägt Förder_Parameter den
// Schlüssel reform_deckel_pct_standard, gewinnt die Tabelle (wortgleich zum Apps-Script-Kern, Rückfall 70).
const HW_REFORM_DECKEL_PCT_STANDARD = 70;

/** @return array<string,mixed> */
function hw_foerder_calc(array $query, array $f, string $date, array $perioden, ?callable $onFallback = null, int|float|null $snapshotPreis = null): array
{
    $period = hw_periode_fuer($date, $perioden);
    $periodenWerte = hw_foerder_periodenwerte($period, $f, $onFallback);
    $we = hw_int($query['we'] ?? null, 1);
    $selbstWe = hw_int($query['selbstWE'] ?? null, 1);
    // T1170 (RL 17.08.2026 Nr. 8.3.1 Abs. 2): nur die betroffenen Wohneinheiten zählen; fehlt der Wert, das ganze Gebäude.
    $weBetroffen = min($we, max(1, hw_int($query['weBetroffen'] ?? null, $we)));
    // T1170 (RL 17.08.2026 Nr. 8.4.4): Funktionstüchtigkeit ist Voraussetzung für JEDE Bonus-Heizung. Fehlt die Angabe, gilt ja.
    $funktionstuechtig = strtolower(hw_query_string($query, 'funktionstuechtig', 'ja')) !== 'nein';
    $heizung = hw_query_string($query, 'heizung', 'gas');
    $einkommen = hw_einkommen_norm(array_key_exists('einkommen', $query) ? $query['einkommen'] : 'ueber40');
    $kindValue = strtolower(hw_query_string($query, 'kind'));
    $kind = $kindValue === 'ja' || $kindValue === 'true';
    $euOk = strtolower(hw_query_string($query, 'eu', 'ja')) !== 'nein';
    $gemeinde = strtolower(hw_query_string($query, 'gemeinde'));
    // Gebundene Schema-3-Zahl nicht erneut als lokalisierten Ganzzahltext lesen.
    $preis = $snapshotPreis ?? hw_int($query['preis'] ?? null, 34510);
    $hinweise = [];

    $klimaBonus = in_array($heizung, ['oel', 'kohle', 'nachtspeicher', 'gas-etage'], true);
    if (!$klimaBonus && in_array($heizung, ['gas', 'biomasse'], true)) {
        $klimaBonus = hw_int($query['heizungsalter'] ?? null, 20) >= hw_get_num($f, 'gas_klimabonus_min_alter', 20);
    }

    if (!$period['reform']) {
        $grundPct = hw_get_num($f, 'grundfoerderung_pct', 30);
        $klimaPct = hw_get_num($f, 'klimabonus_pct', 20);
        $altEinkOk = $einkommen === 'bis30' || $einkommen === 'bis40';
        $einkommensbonusPct = $altEinkOk ? hw_get_num($f, 'einkommensbonus_pct', 30) : 0;
        $satzSelbst = $grundPct;
        if ($selbstWe > 0 && $klimaBonus) {
            $satzSelbst += $klimaPct;
        }
        if ($selbstWe > 0 && $altEinkOk) {
            $satzSelbst += $einkommensbonusPct;
        }
        $satzSelbst += $periodenWerte['effizienzPct'];
        $satzSelbst = min($satzSelbst, $periodenWerte['cap']);
        $satzVermietet = min(hw_get_num($f, 'deckel_vermietet_pct', 35), $grundPct + $periodenWerte['effizienzPct']);
        $foerderFaehigGesamt = hw_foerderfaehige_kosten($we, $f);
        $bausteine = ['Grundförderung ' . $grundPct . '%'];
        if ($periodenWerte['effizienzPct'] > 0) {
            $bausteine[] = 'Effizienzbonus (R290) +' . $periodenWerte['effizienzPct'] . '%';
        }
        if ($selbstWe > 0 && $klimaBonus) {
            array_splice($bausteine, 1, 0, ['Klimageschwindigkeitsbonus +' . $klimaPct . '%']);
        }
        if ($selbstWe > 0 && $altEinkOk) {
            array_splice($bausteine, 1, 0, ['Einkommensbonus +' . $einkommensbonusPct . '%']);
        }
    } else {
        $grundPct = ($period['eu'] && !$euOk)
            ? hw_get_num($f, 'reform_grund_pct_nicht_eu', 15)
            : hw_get_num($f, 'reform_grund_pct', 30);
        $klimaPct = $period['klima'];
        // T1170 (RL 17.08.2026 Nr. 8.4.4): nur eine funktionstüchtige Heizung bringt den Klimabonus, bei jeder Heizungsart.
        if (!$funktionstuechtig) {
            $klimaBonus = false;
        }
        $einkommensbonusPct = hw_einkommensbonus_pct($einkommen, $kind, $f, $periodenWerte);
        $satzSelbst = $grundPct;
        if ($selbstWe > 0 && $klimaBonus) {
            $satzSelbst += $klimaPct;
        }
        if ($selbstWe > 0) {
            $satzSelbst += $einkommensbonusPct;
        }
        $satzSelbst += $periodenWerte['effizienzPct'];
        // T1170 (RL 17.08.2026 Nr. 8.4.1): Obergrenze 80 Prozent nur bei anrechenbarem Einkommen bis 30.000 Euro (Klasse bis30,
        // oder bis40 mit Kind), sonst 70 Prozent. cap der Periode bleibt der Höchstdeckel.
        $anrechenbar = hw_einkommen_anrechenbar($einkommen, $kind, $f, $periodenWerte);
        $deckelHoch = $anrechenbar !== null && $anrechenbar <= hw_get_num($f, 'reform_eink_grenze_bis30', 30000);
        $deckel = $deckelHoch
            ? $periodenWerte['cap']
            : min($periodenWerte['cap'], hw_get_num($f, 'reform_deckel_pct_standard', HW_REFORM_DECKEL_PCT_STANDARD));
        $satzSelbst = min($satzSelbst, $deckel);
        $satzVermietet = $grundPct + $periodenWerte['effizienzPct'];
        // E1 vom 23.07.2026 abgelöst durch Entscheid 30.09.2026 (T1170): die Staffel ist der Höchstbetrag des GEBÄUDES
        // (RL 17.08.2026 Nr. 8.3 und 8.3.1 Buchst. a); betrifft die Maßnahme nicht alle Wohneinheiten, gilt er anteilig
        // (Höchstbetrag geteilt durch alle Wohneinheiten mal betroffene), auf Cent.
        $hoechstbetragGebaeude = hw_foerderfaehige_kosten($we, $f, $period['grenze']);
        $foerderFaehigGesamt = hw_js_round($hoechstbetragGebaeude / $we * $weBetroffen * 100) / 100;
        if ($we > 1) {
            $hinweise[] = HW_FOERDER_HINWEIS_MEHRERE_WE;
        }
        if (!empty($period['ueberHorizont'])) {
            $hinweise[] = 'Für Anträge nach dem 31.07.2029 stehen die Fördersätze noch nicht fest. Wir rechnen dein Projekt genau durch.';
        }
        $bausteine = ['Grundförderung ' . $grundPct . '%'];
        if ($periodenWerte['effizienzPct'] > 0) {
            $bausteine[] = 'Effizienzbonus (R290) +' . $periodenWerte['effizienzPct'] . '%';
        }
        if ($selbstWe > 0 && $klimaBonus && $klimaPct > 0) {
            array_splice($bausteine, 1, 0, ['Klimageschwindigkeitsbonus +' . $klimaPct . '%']);
        }
        if ($selbstWe > 0 && $einkommensbonusPct > 0) {
            array_splice($bausteine, 1, 0, ['Einkommensbonus +' . $einkommensbonusPct . '%']);
        }
    }

    $vermieteteWe = $we - $selbstWe;
    if ($period['reform']) {
        // T1170 (RL 17.08.2026 Nr. 8.3.1 Buchst. a, Merkblatt 458 S. 4): Bemessung = min(Kosten, anteiliger Höchstbetrag),
        // zu gleichen Teilen auf die betroffenen Wohneinheiten; die selbstgenutzte trägt ihren Satz, jede weitere betroffene
        // die Grundförderung (Klimabonus damit "nur anteilig", RL Nr. 8.4.4). Zuschuss je Topf auf Cent wie die KfW-Beispiele.
        $bemessungsBasis = min($preis, $foerderFaehigGesamt);
        $basisJeWe = $bemessungsBasis / $weBetroffen;
        $selbstBetroffen = min($selbstWe, $weBetroffen);
        $vermietetBetroffen = $weBetroffen - $selbstBetroffen;
        $zuschussSelbst = $selbstBetroffen > 0 ? hw_js_round($basisJeWe * $selbstBetroffen * ($satzSelbst / 100) * 100) / 100 : 0;
        $zuschussVermietet = $vermietetBetroffen > 0 ? hw_js_round($basisJeWe * $vermietetBetroffen * ($satzVermietet / 100) * 100) / 100 : 0;
    } else {
        $foerderProWe = $foerderFaehigGesamt / $we;
        $kostenProWe = min($foerderProWe, $preis / $we);
        $bemessungsBasis = $kostenProWe * $we;
        $zuschussSelbst = $selbstWe > 0 ? hw_js_round($kostenProWe * ($satzSelbst / 100)) : 0;
        $zuschussVermietet = $vermieteteWe > 0 ? hw_js_round($kostenProWe * ($satzVermietet / 100) * $vermieteteWe) : 0;
    }
    $zuschussGesamt = hw_js_round(($zuschussSelbst + $zuschussVermietet) * 100) / 100;

    $proGemeinden = array_map('trim', explode(',', hw_js_string(($f['proklima_gemeinden'] ?? '') ?: '')));
    $imFoerdergebiet = in_array($gemeinde, $proGemeinden, true);
    $proklimaAktiv = strtoupper(trim(hw_js_string(($f['proklima_aktiv'] ?? '') ?: 'N'))) === 'J';
    $optin = $proklimaAktiv && hw_js_string($query['proklimaOptin'] ?? null) === 'ja';
    $ymd = (int) str_replace('-', '', substr($date, 0, 10));
    $pkFrist = hw_int($f['proklima_frist_ymd'] ?? null, 20261031);
    $pkFristOk = $ymd <= $pkFrist;
    $basisDefault = $period['reform'] ? 'preis' : 'foerderfaehig';
    $pkBasis = hw_js_string(($f['proklima_basis'] ?? '') ?: $basisDefault) === 'preis' ? $preis : $foerderFaehigGesamt;
    $pkRoh = $imFoerdergebiet && $optin && $pkFristOk
        ? min(hw_js_round($pkBasis * hw_get_num($f, 'proklima_pct', 5) / 100), hw_get_num($f, 'proklima_max_eur', 1500))
        : 0;
    if ($imFoerdergebiet && $optin && !$pkFristOk) {
        $hinweise[] = 'Die proKlima-Förderung gilt nur für Anträge bis zum 31.10.2026 und ist deshalb nicht eingerechnet.';
    }
    $kumCap = $preis * hw_get_num($f, 'kumulierung_max_pct', 60) / 100;
    $totalFoerd = $zuschussGesamt + $pkRoh;
    if ($pkRoh > 0) {
        $totalFoerd = max($zuschussGesamt, min($totalFoerd, $kumCap));
    }
    $proklimaZuschuss = hw_js_round(max(0, $totalFoerd - $zuschussGesamt) * 100) / 100;
    $proklimaGekappt = $pkRoh > 0 && $proklimaZuschuss < $pkRoh;
    if ($proklimaGekappt) {
        $hinweise[] = 'KfW-Zuschuss und proKlima zusammen sind auf 60 Prozent derselben Kosten begrenzt. Der KfW-Zuschuss allein darf darüber liegen.';
    }
    $eigenanteil = hw_js_round(max(0, $preis - $zuschussGesamt - $proklimaZuschuss) * 100) / 100;
    $kfwSatz = $selbstWe > 0 ? $satzSelbst : $satzVermietet;
    $effektivSatz = $preis > 0 ? hw_js_round((($zuschussGesamt + $proklimaZuschuss) / $preis) * 100) : 0;
    if ($proklimaZuschuss > 0) {
        $bausteine[] = 'proKlima Zuschuss ' . $proklimaZuschuss . ' €';
    }
    return [
        'kfwSatz' => $kfwSatz,
        'zuschussGesamt' => $zuschussGesamt,
        'proklimaZuschuss' => $proklimaZuschuss,
        'eigenanteil' => $eigenanteil,
        'effektivSatz' => $effektivSatz,
        'preis' => $preis,
        'klimaBonus' => $klimaBonus,
        'bausteine' => $bausteine,
        'periode' => $period['id'],
        'periodeLabel' => $period['label'],
        'grenze' => $foerderFaehigGesamt,
        'bemessungsBasis' => $bemessungsBasis,
        'einkommensbonusPct' => $selbstWe > 0 ? $einkommensbonusPct : 0,
        'hinweis' => implode(' ', $hinweise),
        'proklimaGekappt' => $proklimaGekappt,
    ];
}

function hw_reform_stichtag_iso(array $params): string
{
    foreach ($params['periodenReihenfolge'] ?? [] as $id) {
        $period = $params['perioden'][$id] ?? null;
        if (is_array($period) && !empty($period['gueltigAb'])) {
            return hw_js_string($period['gueltigAb']);
        }
    }
    return '2026-07-21';
}

function hw_heute_ab_stichtag_iso(array $params): string
{
    $today = date('Y-m-d');
    $stichtag = hw_reform_stichtag_iso($params);
    return $today < $stichtag ? $stichtag : $today;
}

/**
 * ANTRAGSZEITPUNKT UND INSTALLATIONSBEGINN, die Fachregel an EINER Stelle.
 *
 * Der Geschaeftsfuehrer hat am 19.08.2026 zwei Dinge getrennt, die die Website bis dahin in einem
 * Feld gefuehrt hat: der ANTRAGSZEITPUNKT bestimmt die Foerderhoehe, weil der Klimabonus
 * halbjaehrlich sinkt und die Bemessungsgrenze mit ihm. Der INSTALLATIONSTERMIN bestimmt sie
 * NICHT, er ist Kapazitaet und Terminzusage.
 *
 * Die Regel ist nicht neu erfunden, sondern woertlich uebernommen aus dem Konfigurator des
 * Aussendienstes (Vorgang T578, gebaut 19.08.2026, eingespielt als Fassung 23): zwei Klemmungen
 * des Antragsdatums und eine Reihenfolge-Warnung. So rechnen Website und Aussendienst dieselbe
 * Sache gleich, statt zwei Fassungen derselben Regel zu fuehren.
 */

/**
 * Ein Datum aus sechs Schreibweisen als 'JJJJ-MM-TT', sonst ''.
 * Gelesen werden 'JJJJ-MM-TT', 'TT.MM.JJJJ', 'TT.MM.JJ', 'MM.JJJJ', 'MM/JJJJ' und 'JJJJ-MM'.
 * Ein Datum ohne Tag ist der Normalfall, sowohl im Verkaufsgespraech ("irgendwann im Maerz") als
 * auch im Monatsfeld des Browsers (<input type="month"> liefert 'JJJJ-MM'); es gilt der Monatserste.
 */
function hw_datum_iso(mixed $eingabe): string
{
    $text = trim(hw_js_string($eingabe ?? ''));
    if ($text === '') {
        return '';
    }
    $treffer = [];
    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $text, $treffer)) {
        return hw_datum_bauen($treffer[1], $treffer[2], $treffer[3]);
    }
    if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', $text, $treffer)) {
        return hw_datum_bauen($treffer[3], $treffer[2], $treffer[1]);
    }
    if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/', $text, $treffer)) {
        return hw_datum_bauen('20' . $treffer[3], $treffer[2], $treffer[1]);
    }
    if (preg_match('/^(\d{1,2})[.\/](\d{4})$/', $text, $treffer)) {
        return hw_datum_bauen($treffer[2], $treffer[1], 1);
    }
    if (preg_match('/^(\d{4})-(\d{1,2})$/', $text, $treffer)) {
        return hw_datum_bauen($treffer[1], $treffer[2], 1);
    }
    return '';
}

function hw_datum_bauen(string|int $jahr, string|int $monat, string|int $tag): string
{
    $j = (int) $jahr;
    $m = (int) $monat;
    $t = (int) $tag;
    // Untergrenze 2026 wie im Konfigurator: fruehere Jahreszahlen sind hier immer Tippfehler,
    // ein Foerderantrag von 1999 existiert nicht.
    if ($j < 2026 || $j > 2099 || $m < 1 || $m > 12 || $t < 1 || $t > 31) {
        return '';
    }
    return sprintf('%04d-%02d-%02d', $j, $m, $t);
}

function hw_datum_deutsch(string $iso): string
{
    return preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $iso, $t) === 1
        ? $t[3] . '.' . $t[2] . '.' . $t[1]
        : $iso;
}

/**
 * Die waehlbaren Antragszeitraeume: alle Reform-Perioden, deren Ende NICHT in der Vergangenheit
 * liegt. Zwei Klemmungen, beide bewusst und beide aus der Konfigurator-Regel:
 *   nach unten auf HEUTE            - rueckwirkend beantragt niemand. Ein abgelaufener Zeitraum
 *                                     verspraeche eine Foerderung, die es nicht mehr gibt.
 *   nach unten auf den Reform-Stichtag - Option B (GF-Entscheid 19.07.2026): 'alt' steht nicht
 *                                     zur Wahl, weil danach niemand mehr beantragen kann.
 * Das Feld 'ab' ist das FRUEHESTE Antragsdatum, das in diesem Zeitraum noch moeglich ist.
 *
 * @return list<array{key:string,label:string,ab:string,bis:string}>
 */
function hw_foerder_perioden_waehlbar(array $params): array
{
    $heute = hw_heute_ab_stichtag_iso($params);
    $out = [];
    foreach ($params['periodenReihenfolge'] ?? [] as $key) {
        $period = $params['perioden'][$key] ?? null;
        if (!is_array($period)) {
            continue;
        }
        $bis = hw_js_string($period['gueltigBis'] ?? '');
        if ($bis !== '' && $bis < $heute) {
            continue;
        }
        $ab = hw_js_string($period['gueltigAb'] ?? '');
        $out[] = [
            'key' => $key,
            'label' => hw_js_string(($period['label'] ?? '') ?: ''),
            'ab' => ($ab === '' || $ab < $heute) ? $heute : $ab,
            'bis' => $bis,
        ];
    }
    return $out;
}

/**
 * Der Antragszeitpunkt, auf den gerechnet wird.
 * 'quelle' ist 'angabe' oder 'heute' und gehoert in die Anzeige, damit ein Leser sieht, worauf die
 * Foerderzahl beruht. 'ab' ist das fruehestmoegliche Antragsdatum des gewaehlten Zeitraums.
 *
 * @return array{key:string,ab:string,quelle:string,hinweis:string}
 */
function hw_antragszeitraum(array $query, array $params): array
{
    $heute = hw_heute_ab_stichtag_iso($params);
    $gewuenscht = trim(hw_query_string($query, 'fHalbjahr'));
    foreach (hw_foerder_perioden_waehlbar($params) as $period) {
        if ($period['key'] === $gewuenscht) {
            return ['key' => $period['key'], 'ab' => $period['ab'], 'quelle' => 'angabe', 'hinweis' => ''];
        }
    }
    $hinweis = '';
    if ($gewuenscht !== '' && isset($params['perioden'][$gewuenscht])) {
        $hinweis = 'Der gewählte Antragszeitraum ist vorbei. Gerechnet ist der heute geltende '
            . 'Zeitraum, weil rückwirkend kein Förderantrag gestellt werden kann.';
    }
    return ['key' => hw_kv_periode_heute($params), 'ab' => $heute, 'quelle' => 'heute', 'hinweis' => $hinweis];
}

/**
 * Reihenfolge-Pruefung Antrag vor Installation. Der Foerderantrag muss VOR dem Vorhabensbeginn
 * stehen (BEG EM, Antrag vor Vorhabensbeginn). Liegt der Installationsbeginn davor, entfaellt die
 * Foerderung GANZ, nicht nur ein paar Prozentpunkte. Deshalb ist das eine Warnung und keine
 * Fussnote.
 * Verglichen wird gegen das FRUEHESTE Antragsdatum des gewaehlten Zeitraums: nur dann ist die
 * Reihenfolge sicher verletzt, egal wann innerhalb des Zeitraums der Antrag wirklich gestellt wird.
 *
 * @return array{iso:string,hinweis:string}
 *
 * SEIT DEM 21.08.2026 RUFT KEINE OEFFENTLICHE SEITE DIESE PRUEFUNG (GF-Entscheid): der
 * Installationstermin gehoert nicht auf eine Kundenseite, sondern in den Angebotskonfigurator und
 * die Datenaufnahme. Die Regel bleibt hier stehen, weil sie geprueft ist und der Rueckfall sie
 * zeichengleich fuehrt; wer sie braucht, schickt installBeginn mit.
 */
function hw_installationsbeginn(mixed $eingabe, string $antragAbIso): array
{
    $iso = hw_datum_iso($eingabe);
    if ($iso === '' || $antragAbIso === '' || $iso >= $antragAbIso) {
        return ['iso' => $iso, 'hinweis' => ''];
    }
    return [
        'iso' => $iso,
        'hinweis' => 'Der geplante Installationsbeginn (' . hw_datum_deutsch($iso) . ') liegt vor dem '
            . 'frühesten Förderantrag dieses Zeitraums (' . hw_datum_deutsch($antragAbIso) . '). Der Antrag '
            . 'muss vor dem Vorhabensbeginn stehen, sonst entfällt die Förderung vollständig. '
            . 'Bitte einen der beiden Termine anpassen.',
    ];
}

function hw_foerder_rueckfall_logger(): Closure
{
    $gesehen = [];
    return static function (string $periode, string $feld, string $fallbackSchluessel) use (&$gesehen): void {
        $key = $periode . ':' . $feld;
        if (isset($gesehen[$key])) {
            return;
        }
        $gesehen[$key] = true;
        error_log(
            'FOERDER_PERIODEN_RUECKFALL periode=' . $periode
            . ' feld=' . $feld
            . ' fallback=' . $fallbackSchluessel
        );
    };
}

/** @return array<string,mixed> */
function hw_foerder_params_mit_rueckfall(array $params, array $f, ?callable $onFallback = null): array
{
    $out = $params;
    $out['perioden'] = [];
    foreach ($params['perioden'] as $id => $raw) {
        $period = $raw;
        $period['id'] = $id;
        $period['reform'] = $id !== 'alt';
        $werte = hw_foerder_periodenwerte($period, $f, $onFallback);
        $period['cap'] = $werte['cap'];
        $period['effizienzPct'] = $werte['effizienzPct'];
        $period['kindFreibetrag'] = $werte['kindFreibetrag'];
        $period['einkStufen'] = $werte['einkStufen'];
        $out['perioden'][$id] = $period;
    }
    return $out;
}

/** @return array<string,mixed> */
function hw_foerderung(array $query, array $sheets, ?array $tables = null): array
{
    $f = hw_read_kv($sheets, 'Förder_Parameter');
    $onFallback = hw_foerder_rueckfall_logger();
    $params = hw_foerder_params_mit_rueckfall(hw_kv_get_params($sheets), $f, $onFallback);
    $brand = strtolower(hw_query_string($query, 'marke', 'wolf'));
    $prices = hw_get_prices($sheets, $brand, $tables);
    $wpTyp = strtolower(hw_query_string($query, 'wpTyp', 'm'));
    $manual = array_key_exists('preisManuell', $query) && $query['preisManuell'] !== '';
    if ($tables !== null && !$manual && ($prices[$wpTyp] ?? null) === null) {
        throw new RuntimeException('snapshot_preis_fehlt');
    }
    $preis = $tables !== null && !$manual ? $prices[$wpTyp]
        : ($manual ? hw_int($query['preisManuell'], 34510) : (($prices[$wpTyp] ?? 0) ?: 34510));
    $args = $query;
    $args['preis'] = $preis;
    $snapshotPreis = $tables !== null && !$manual ? rechner_schema3_zahl($preis) : null;
    $perioden = hw_foerder_perioden_aus_kv($params);
    // Der Antragszeitpunkt kommt jetzt aus der Anfrage, nicht mehr fest von der Serveruhr. Bis zum
    // 20.08.2026 rechnete diese Seite IMMER auf heute und versprach damit jedem, der spaeter
    // beantragt, zu viel: der Kostenvergleich liess den Zeitraum schon waehlen, diese Seite nicht.
    $antrag = hw_antragszeitraum($query, $params);
    $install = hw_installationsbeginn($query['installBeginn'] ?? null, $antrag['ab']);
    $out = hw_foerder_calc($args, $f, $antrag['ab'] . 'T12:00:00', $perioden, $onFallback, $snapshotPreis);
    if ($brand === 'vaillant') {
        $out['vorlaeufig'] = true;
    }
    $out['perioden'] = hw_foerder_perioden_waehlbar($params);
    $out['aktivePeriode'] = hw_kv_periode_heute($params);
    $out['antragPeriode'] = $antrag['key'];
    $out['antragAb'] = $antrag['ab'];
    $out['antragAutomatik'] = $antrag['quelle'] === 'heute';
    $out['antragHinweis'] = $antrag['hinweis'];
    $out['installBeginn'] = $install['iso'];
    $out['installHinweis'] = $install['hinweis'];
    $treppe = [];
    foreach ($params['periodenReihenfolge'] ?? [] as $id) {
        $period = $params['perioden'][$id];
        $stufe = hw_foerder_calc($args, $f, hw_js_string($period['gueltigAb']) . 'T12:00:00', $perioden, $onFallback, $snapshotPreis);
        $treppe[] = [
            'periode' => $id,
            'label' => $stufe['periodeLabel'],
            'quote' => $stufe['kfwSatz'],
            'betrag' => $stufe['zuschussGesamt'],
        ];
    }
    $out['treppe'] = $treppe;
    return $out;
}

function hw_kv_periode_fuer_datum(string $today, array $params): string
{
    foreach ($params['perioden'] as $key => $period) {
        $from = $period['gueltigAb'] ?? '';
        $until = $period['gueltigBis'] ?? '';
        if ($from === '' && $until === '') {
            continue;
        }
        if (($from === '' || $today >= $from) && ($until === '' || $today <= $until)) {
            return $key;
        }
    }
    $order = $params['periodenReihenfolge'];
    return $order[count($order) - 1];
}

function hw_kv_periode_heute(array $params): string
{
    return hw_kv_periode_fuer_datum(hw_heute_ab_stichtag_iso($params), $params);
}

/** @return array<string,mixed> */
function hw_kv_map_request(array $query, array $params): array
{
    $defaults = hw_kv_defaults();
    $periodeServer = hw_kv_periode_heute($params);
    $periodenKeys = array_keys($params['perioden']);
    $periodeReq = trim(hw_query_string($query, 'fHalbjahr'));
    $periodeValid = in_array($periodeReq, $periodenKeys, true);
    $mapped = [
        '_periodeAutomatik' => !$periodeValid,
        'modus' => hw_kv_enum($query['modus'] ?? null, ['kunde', 'berater'], $defaults['modus']),
        'heizart' => hw_kv_enum($query['heizart'] ?? null, ['gas', 'oel'], $defaults['heizart']),
        'bedarf' => hw_kv_num($query['bedarf'] ?? null, $defaults['bedarf']),
        'eta' => hw_kv_num($query['eta'] ?? null, $defaults['eta']),
        'invWP' => hw_kv_num($query['invWP'] ?? null, $defaults['invWP']),
        'jaz' => hw_kv_num($query['jaz'] ?? null, $defaults['jaz']),
        'laufzeit' => hw_js_round(hw_kv_num($query['laufzeit'] ?? null, $defaults['laufzeit'])),
        'neuFossilTog' => hw_kv_bool($query['neuFossilTog'] ?? null, $defaults['neuFossilTog']),
        'vglBrennstoff' => hw_kv_enum($query['vglBrennstoff'] ?? null, ['gas', 'oel'], $defaults['vglBrennstoff']),
        'gasInvest' => hw_kv_num($query['gasInvest'] ?? null, $defaults['gasInvest']),
        'oelInvest' => hw_kv_num($query['oelInvest'] ?? null, $defaults['oelInvest']),
        'gaspreis' => hw_kv_num($query['gaspreis'] ?? null, $defaults['gaspreis']),
        'gasStg' => hw_kv_num($query['gasStg'] ?? null, $defaults['gasStg']),
        'oelpreis' => hw_kv_num($query['oelpreis'] ?? null, $defaults['oelpreis']),
        'oelStg' => hw_kv_num($query['oelStg'] ?? null, $defaults['oelStg']),
        'strompreis' => hw_kv_num($query['strompreis'] ?? null, $defaults['strompreis']),
        'stromEntw' => hw_kv_num($query['stromEntw'] ?? null, $defaults['stromEntw']),
        'co2preis' => hw_kv_num($query['co2preis'] ?? null, $defaults['co2preis']),
        'co2Pfad' => hw_kv_num($query['co2Pfad'] ?? null, $defaults['co2Pfad']),
        'bioTog' => hw_kv_bool($query['bioTog'] ?? null, $defaults['bioTog']),
        'bioAufpreis' => hw_kv_num($query['bioAufpreis'] ?? null, $defaults['bioAufpreis']),
        'fHalbjahr' => $periodeValid ? $periodeReq : $periodeServer,
        'fGrund' => hw_kv_bool($query['fGrund'] ?? null, $defaults['fGrund']),
        'fEU' => hw_kv_bool($query['fEU'] ?? null, $defaults['fEU']),
        'fKlima' => hw_kv_bool($query['fKlima'] ?? null, $defaults['fKlima']),
        'fAlt20' => hw_kv_bool($query['fAlt20'] ?? null, $defaults['fAlt20']),
        'fEinkSlider' => hw_kv_num($query['fEinkSlider'] ?? null, $defaults['fEinkSlider']),
        'fKind' => hw_kv_bool($query['fKind'] ?? null, $defaults['fKind']),
        'proklimaTog' => false,
        'fEffizienz' => hw_kv_bool($query['fEffizienz'] ?? null, $defaults['fEffizienz']),
        'finanzTog' => hw_kv_bool($query['finanzTog'] ?? null, $defaults['finanzTog']),
        'kredLZ' => hw_js_round(hw_kv_num($query['kredLZ'] ?? null, $defaults['kredLZ'])),
        'kredZins' => hw_kv_num($query['kredZins'] ?? null, $params['kredZins358Eff']),
        'immoTog' => hw_kv_bool($query['immoTog'] ?? null, $defaults['immoTog']),
        'hausW' => hw_kv_num($query['hausW'] ?? null, $defaults['hausW']),
        'immoP' => hw_kv_num($query['immoP'] ?? null, $defaults['immoP']),
        'dynTarifTog' => hw_kv_bool($query['dynTarifTog'] ?? null, $defaults['dynTarifTog']),
        'dynAnteil' => hw_kv_num($query['dynAnteil'] ?? null, $defaults['dynAnteil']),
        'dynSpread' => hw_kv_num($query['dynSpread'] ?? null, $defaults['dynSpread']),
    ];
    foreach(['heizsystem','geraet','pvTog','pvAnteil','pvKosten','foerderBetragExtern','grundpreisGas','wpZaehler','wpArbeitspreis','wpGrundpreis','netzentgeltTog','modul14a','warmwasserBisherZentral','warmwasserKuenftigZentral','personen'] as $k) {
        if(array_key_exists($k,$query))$mapped[$k]=$query[$k];
    }
    $mapped['grundpreisGas']=$query['grundpreisGas']??$params['grundpreisGas'];$mapped['pvAnteil']=$query['pvAnteil']??$params['pvAnteil'];$mapped['pvKosten']=$query['pvKosten']??$params['pvKosten'];
    $mapped['startJahr']=isset($query['startJahr'])&&$query['startJahr']!==''?$query['startJahr']:(int)(new DateTimeImmutable('now',new DateTimeZone('Europe/Berlin')))->format('Y');
    return $mapped;
}

function hw_kv_schaetze_bedarf(string $geb, string $bj, string $san, float|int $flaeche, array $params): ?float
{
    $s = $params['schaetzung'] ?? hw_schaetzung_seed();
    $index = array_search($bj, $s['stufen'], true);
    if ($index === false) {
        return null;
    }
    $sprung = $s['sanierungSprung'][$san] ?? 0;
    $index = min($index + $sprung, count($s['stufen']) - 1);
    $kwh = hw_js_round($flaeche * $s['spezVerbrauch'][$s['stufen'][$index]] * $s['gebaeudeFaktor'][$geb] / $s['rundungKwh']) * $s['rundungKwh'];
    return min($s['bedarfMax'], max($s['bedarfMin'], hw_js_round($kwh / $s['bedarfStep']) * $s['bedarfStep']));
}

function hw_kv_bio_anteil(float|int $year, array $params): float|int
{
    $out = 0;
    foreach ($params['bioStufen'] as $stufe) {
        if ($year >= $stufe['y']) {
            $out = $stufe['p'];
        }
    }
    return $out;
}

function hw_kv_mix_g(float|int $year, array $params): float|int
{
    $mix = $params['strommix'];
    if ($year <= $mix['startY']) {
        return $mix['startG'];
    }
    if ($year >= $mix['endY']) {
        return $mix['endG'];
    }
    return $mix['startG'] + ($mix['endG'] - $mix['startG']) * ($year - $mix['startY']) / ($mix['endY'] - $mix['startY']);
}

/** @return array<string,mixed> */
function hw_kv_foerder(array $inputs, array $params): array
{
    $period = $params['perioden'][$inputs['fHalbjahr']] ?? null;
    if ($period === null) {
        throw new RuntimeException('Unbekannte Förderperiode: ' . $inputs['fHalbjahr']);
    }
    $grundPct = ($period['eu'] && !$inputs['fEU']) ? $params['grundPctNichtEu'] : $params['grundPctEu'];
    $grund = $inputs['fGrund'] ? $grundPct : 0;
    $klima = $inputs['fKlima'] ? $period['klima'] : 0;
    $zve = $inputs['fEinkSlider'];
    $anrechenbar = max(0, $zve - ($inputs['fKind'] ? $period['kindFreibetrag'] : 0));
    $einkommen = 0;
    foreach ($period['einkStufen'] as $stufe) {
        if ($anrechenbar <= $stufe['maxAnr']) {
            $einkommen = $stufe['pct'];
            break;
        }
    }
    $klimaEffektiv = $inputs['fAlt20'] ? $klima : 0;
    $effizienz = $period['effizienzPct'] > 0 && $inputs['fEffizienz'] ? $period['effizienzPct'] : 0;
    $summe = $grund + $klimaEffektiv + $einkommen + $effizienz;
    return [
        'periode' => $inputs['fHalbjahr'], 'label' => $period['label'],
        'g' => $grund, 'grundPct' => $grundPct, 'klimaPct' => $period['klima'],
        'k' => $klimaEffektiv, 'e' => $einkommen, 'eff' => $effizienz,
        'sum' => $summe, 'q' => min($summe, $period['cap']), 'cap' => $period['cap'],
        'grenze' => $period['grenze'], 'zvE' => $zve, 'anr' => $anrechenbar,
        'eu' => $period['eu'], 'proKlimaErlaubt' => $period['proKlimaErlaubt'],
    ];
}

/** @return array<string,mixed> */
function hw_kv_bootstrap(array $sheets): array
{
    $params = hw_kv_kostenparameter($sheets);
    // Nur Zeitraeume, die noch beantragbar sind: ein abgelaufener Zeitraum in der Auswahl waere
    // ein Versprechen auf eine Foerderung, die es nicht mehr gibt (Klemmung nach unten auf heute).
    $perioden = [];
    foreach (hw_foerder_perioden_waehlbar($params) as $period) {
        $perioden[] = ['key' => $period['key'], 'label' => $period['label']];
    }
    $defaults = hw_kv_defaults();
    unset($defaults['proklimaTog'], $defaults['fEffizienz'], $defaults['modus']);
    $defaults['kredZins'] = $params['kredZins358Eff'];
    $defaults['grundpreisGas']=$params['grundpreisGas'];$defaults['pvAnteil']=$params['pvAnteil'];$defaults['pvKosten']=$params['pvKosten'];$defaults['startJahr']=(int)(new DateTimeImmutable('now',new DateTimeZone('Europe/Berlin')))->format('Y');
    $eta = hw_eta_matrix();
    unset($eta['textEigen']);
    return [
        'service' => 'kv_bootstrap',
        'jaz'=>['quelle'=>'BWP-JAZ-Rechner nach VDI 4650 Blatt 1:2024-02','heizsysteme'=>['heizkoerper','fbh']],
        'bioHinweis'=>$params['bioHinweis']??null,'netzentgeltBereit'=>!empty($params['netzentgelt']['jahreswerte']),
        'perioden' => $perioden,
        'defaults' => $defaults,
        'kredit' => [
            'zins358Eff' => $params['kredZins358Eff'],
            'zins359Eff' => $params['kredZins359Eff'],
            'zveGrenze' => $params['kredZinsZveGrenze'],
            'bereitstellungProv' => $params['kredBereitstellungProv'],
            'stand' => $params['kredZinsStand'],
            'quelle' => $params['kredZinsQuelle'],
        ],
        'etaMatrix' => $eta,
        'schaetzung' => ['einheitFaktor' => $params['schaetzung']['einheitFaktor']],
        'aktivePeriode' => hw_kv_periode_heute($params),
    ];
}

/** @return array<string,mixed> */
function hw_preise(array $sheets, ?array $tables = null): array
{
    $filter = static function (array $rows): array {
        return array_map(static fn (array $row): array => [
            'klasse' => $row['klasse'], 'modell' => $row['modell'], 'kw' => $row['kw'],
            'brutto' => $row['brutto'], 'eigen' => $row['eigen'],
        ] + (array_key_exists('tafel', $row) ? ['tafel' => $row['tafel']] : []), $rows);
    };
    return [
        'wolf' => $filter(hw_read_price_table($sheets, 'Preise_Wolf', $tables, true)),
        'vaillant' => $filter(hw_read_price_table($sheets, 'Preise_Vaillant', $tables, true)),
    ];
}

/** @return array{gesamt:float|int|null,frei:float|int|null} */
function hw_fv_plaetze(array $sheets): array
{
    $out = ['gesamt' => null, 'frei' => null];
    $values = hw_read_kv($sheets, 'Fördervorschuss');
    $gesamt = hw_num($values['gesamt'] ?? null, NAN);
    $belegt = hw_num($values['belegt'] ?? null, NAN);
    if (is_finite((float) $gesamt) && is_finite((float) $belegt) && $gesamt > 0 && $belegt >= 0 && $belegt <= $gesamt) {
        $out['gesamt'] = $gesamt;
        $out['frei'] = $gesamt - $belegt;
    }
    return $out;
}

/** @return array<string,mixed> */
function hw_kv_calculate(array $inputs, array $params): array
{
    $params=array_replace(hw_kv_nutzen_parameter([]),$params);
    if(!empty($params['jazLive'])&&!array_key_exists('jazTabelle',$params))throw new RuntimeException('KV_JAZ wurde als veröffentlicht markiert, fehlt aber.');
    $bioStand=hw_kv_bio_stand($params['bioStufen']);$params['bioStufen']=$bioStand['stufen'];
    $inputs=hw_kv_nutzen_eingaben($inputs);$jazInfo=hw_kv_jaz_auswahl($inputs,$params['jazTabelle']??hw_kv_jaz_seed());$inputs['jaz']=$jazInfo['wert'];
    hw_kv_netzentgelt_pruefen($params['netzentgelt'],$inputs['netzentgeltTog']);
    $heizart = $inputs['heizart'];
    $bedarf = $inputs['bedarf'];
    $eta = $inputs['eta'] / 100;
    $investWp = $inputs['invWP'];
    $jaz = $inputs['jaz'];
    $laufzeit = $inputs['laufzeit'];
    $bioOn = (bool) $inputs['bioTog'] && (bool) $inputs['neuFossilTog'];
    $bioFak = $bioOn ? $inputs['bioAufpreis'] : 1;
    $dynTarifOn = (bool) $inputs['dynTarifTog'];
    $dynAnteil = $dynTarifOn ? $inputs['dynAnteil'] : 0;
    $dynSpread = $dynTarifOn ? $inputs['dynSpread'] : 0;
    $finanzOn = (bool) $inputs['finanzTog'];
    $kredLz = $finanzOn ? $inputs['kredLZ'] : $params['kredLZDefault'];
    $kredZins = $finanzOn ? $inputs['kredZins'] / 100 : $params['kredZinsDefault'];
    $immoOn = (bool) $inputs['immoTog'];
    $hausW = $immoOn ? $inputs['hausW'] : 0;
    $immoP = $immoOn ? $inputs['immoP'] / 100 : 0;
    $neuFossilOn = (bool) $inputs['neuFossilTog'];
    $vglFuel = $neuFossilOn ? $inputs['vglBrennstoff'] : $heizart;
    $fossilP0 = $vglFuel === 'gas' ? $inputs['gaspreis'] : $inputs['oelpreis'];
    $fossilStg = $vglFuel === 'gas' ? $inputs['gasStg'] / 100 : $inputs['oelStg'] / 100;
    $stromP0 = $inputs['strompreis'];
    $stromE = $inputs['stromEntw'] / 100;
    $co2P0 = $inputs['co2preis'];
    $co2Ziel = $inputs['co2Pfad'];
    $gasP0 = $inputs['gaspreis'];
    $gasStgV = $inputs['gasStg'] / 100;
    $oelP0 = $inputs['oelpreis'];
    $oelStgV = $inputs['oelStg'] / 100;
    $gasInvest = $inputs['gasInvest'];
    $oelInvest = $inputs['oelInvest'];

    $fInfo = hw_kv_foerder($inputs, $params);
    $fq = $fInfo['q'] / 100;
    $fBasis = min($investWp, $fInfo['grenze']);
    $fBetrag = $fBasis * $fq;
    $pkAllowed = $fInfo['proKlimaErlaubt'];
    $pkWp = $inputs['proklimaTog'] && $pkAllowed
        ? min(hw_js_round($params['proKlimaPct'] * $investWp), $params['proKlimaMax'])
        : 0;
    $kumCap = $params['kumCapPct'] * $investWp;
    $totalFoerd = $fBetrag + $pkWp;
    if ($pkWp > 0) {
        $totalFoerd = max($fBetrag, min($totalFoerd, $kumCap));
    }
    $extern=$inputs['foerderBetragExtern']!==null;
    if($extern){$totalFoerd=$inputs['foerderBetragExtern'];$fBetrag=$totalFoerd;$pkWp=0;}
    $nettoInvest = max(0, $investWp - $totalFoerd);
    $fossilInvest = $vglFuel === 'gas' ? $gasInvest : $oelInvest;
    $mehrInvest = $nettoInvest - $fossilInvest;
    $wwZuschlag=!$inputs['warmwasserBisherZentral']&&$inputs['warmwasserKuenftigZentral']?$inputs['personen']*$params['wwKwhProPerson']:0;
    $nutzwaerme=$bedarf*$eta+$wwZuschlag;
    $wpStrom = $nutzwaerme / $jaz;
    $fossilVerbrauch = $neuFossilOn ? $nutzwaerme / $params['etaNeu'][$vglFuel] : $bedarf;
    $co2Fac = $params['co2f'][$vglFuel];
    $co2Tpj = $fossilVerbrauch * $co2Fac / 1000;
    $startY = $inputs['startJahr']??$params['startY'];
    $zielSchritte = max(0,$params['co2ZielJahr']-$startY);
    $rechenSystem=['startY'=>$startY,'zielSchritte'=>$zielSchritte,'nutzwaerme'=>$nutzwaerme,'wpStrom'=>$wpStrom,'wwZuschlag'=>$wwZuschlag];
    $co2Pj = static fn (float|int $step): float|int => $step >= $zielSchritte
        ? $co2Ziel
        : $co2P0 + ($co2Ziel - $co2P0) * $step / $zielSchritte;

    $data = [];
    $cumSav = 0;
    $cumFossil = 0;
    $cumMehr = 0;
    $cumWpKosten = 0;
    $co2SavedMix = 0;
    $co2FossilSum = 0;
    for ($yearIndex = 1; $yearIndex <= $laufzeit; $yearIndex++) {
        $d=hw_kv_jahreskosten($yearIndex,$vglFuel,$inputs,$params,$rechenSystem,0,0);
        $cumSav+=$d['fossilG']-$d['wpGes'];$cumFossil+=$d['fossilG'];$cumWpKosten+=$d['wpGes'];$cumMehr=$cumSav;
        $co2FossilSum+=$co2Tpj*(1-$d['bioP']/100);$co2SavedMix+=$co2Tpj*(1-$d['bioP']/100)-$wpStrom*hw_kv_mix_g($d['cY'],$params)/1e6;
        $d['jSav']=$d['fossilG']-$d['wpGes'];$d['mehrK']=$d['jSav'];$d['cumSav']=$cumSav;$d['cumMehr']=$cumMehr;$d['cumFossil']=$cumFossil;$d['cumWPKosten']=$cumWpKosten;
        $data[]=$d;
    }
    $last = $data[count($data) - 1];
    $investDelta = $neuFossilOn ? $mehrInvest : $nettoInvest;
    $breakEven = $investDelta<=0?0:null;
    foreach ($data as $row) {
        if ($breakEven===null && $row['cumSav'] >= $investDelta) {
            $breakEven = $row['j'];
            break;
        }
    }
    $breakEvenSofort = $investDelta <= 0;

    $fossilOpSum=static function(string $fuel)use($laufzeit,$vglFuel,$inputs,$params,$rechenSystem){$sum=0;for($j=1;$j<=$laufzeit;$j++)$sum+=hw_kv_jahreskosten($j,$fuel,$inputs,$params,$rechenSystem,0,0)['fossilG'];return $sum;};
    $opGas = $fossilOpSum('gas');
    $opOel = $fossilOpSum('oel');
    $opWp = $last['cumWPKosten'];
    $tcoGas = $gasInvest + $opGas;
    $tcoOel = $oelInvest + $opOel;
    $tcoWp = $nettoInvest + $opWp;
    $bestFossil = min($tcoGas, $tcoOel);
    $dreiWegeVorteil = $bestFossil - $tcoWp;
    $wpNg = $last['cumSav'] - $investDelta;
    $kredN = $kredLz * 12;
    $annuity = static function (float|int $amount) use ($kredZins, $kredN): float|int {
        $rate = $kredZins / 12;
        return $rate > 0
            ? $amount * ($rate * pow(1 + $rate, $kredN)) / (pow(1 + $rate, $kredN) - 1)
            : $amount / $kredN;
    };
    $kreditBetrag = $nettoInvest;
    $monRate = $annuity($nettoInvest);
    $monRateFossil = $annuity($fossilInvest);
    $monWpStrom = $data[0]['wpGes'] / 12;
    $monFossil = $data[0]['fossilG'] / 12;
    $monGesWp = $monRate + $monWpStrom;
    $monDiff = $monFossil - $monGesWp;
    $zinsKosten = $finanzOn ? $monRate * $kredN - $kreditBetrag : 0;
    $zinsFossil = $finanzOn && $neuFossilOn ? $monRateFossil * $kredN - $fossilInvest : 0;
    $zinsDelta = $zinsKosten - $zinsFossil;
    $wpMon = $monRate + $monWpStrom;
    $fossMon = $monRateFossil + $monFossil;
    $differenceCashflow = $fossMon - $wpMon;
    $immoWert = $immoOn ? hw_js_round($hausW * $immoP) : 0;
    $co2Total = hw_js_round($co2SavedMix * 10) / 10;
    $co2Oeko = hw_js_round($co2FossilSum * 10) / 10;
    $co2ProJahr = hw_js_round($co2SavedMix / $laufzeit * 10) / 10;
    $fluege = hw_js_round($co2Total / $params['co2FlugT']);
    $baeume = hw_js_round($co2Total * 1000 / $params['co2BaumKg']);

    $runScenario=static function(float $gasDelta,float $stromDelta)use($laufzeit,$vglFuel,$inputs,$params,$rechenSystem,$investDelta){$sum=0;for($j=1;$j<=$laufzeit;$j++){$d=hw_kv_jahreskosten($j,$vglFuel,$inputs,$params,$rechenSystem,$gasDelta,$stromDelta);$sum+=$d['fossilG']-$d['wpGes'];}return ['wpNG'=>$sum-$investDelta];};
    $sBest = $runScenario($params['sensi']['best']['fossil'], $params['sensi']['best']['strom']);
    $sBase = $runScenario($params['sensi']['base']['fossil'], $params['sensi']['base']['strom']);
    $sWorst = $runScenario($params['sensi']['worst']['fossil'], $params['sensi']['worst']['strom']);

    $foerderTreppe = [];
    foreach ($params['periodenReihenfolge'] as $key) {
        $alternative = $inputs;
        $alternative['fHalbjahr'] = $key;
        $step = hw_kv_foerder($alternative, $params);
        $basisStep = min($investWp, $step['grenze']);
        $foerderTreppe[] = [
            'periode' => $key, 'quote' => $step['q'], 'label' => $step['label'],
            'grenze' => $step['grenze'], 'basis' => $basisStep,
            'betrag' => hw_js_round($basisStep * $step['q'] / 100),
        ];
    }
    $anzeigeBetrag = $extern?$totalFoerd:hw_js_round($fBasis * $fInfo['q'] / 100);
    $pkOn = (bool) $inputs['proklimaTog'];
    $liveZuschuss = $pkWp > 0
        ? max($anzeigeBetrag, min($anzeigeBetrag + $pkWp, hw_js_round($params['kumCapPct'] * $investWp)))
        : $anzeigeBetrag;
    $liveEigen = $investWp - $liveZuschuss;
    $quoteOhneEink = min($fInfo['g'] + $fInfo['k'] + $fInfo['eff'], $fInfo['cap']);
    $zuschussOhneEink = hw_js_round($fBasis * $quoteOhneEink / 100);
    $endIndex = min($kredLz, $laufzeit) - 1;

    return [
        'service' => 'kostenvergleich',
        'inputsEcho' => $inputs,
        'foerder' => [
            'extern'=>$extern,
            'periode' => $fInfo['periode'], 'label' => $fInfo['label'],
            'euDifferenzierung' => $fInfo['eu'],
            'grundPct' => $fInfo['grundPct'], 'grund' => $fInfo['g'],
            'klimaPct' => $fInfo['klimaPct'], 'klima' => $fInfo['k'],
            'einkommen' => $fInfo['e'], 'effizienz' => $fInfo['eff'],
            'zvE' => $fInfo['zvE'], 'anrechenbar' => $fInfo['anr'],
            'summe' => $fInfo['sum'], 'quote' => $fInfo['q'], 'cap' => $fInfo['cap'],
            'gekappt' => $fInfo['sum'] > $fInfo['cap'],
            'grenze' => $fInfo['grenze'], 'basis' => $fBasis,
            'betrag' => $fBetrag, 'anzeigeBetrag' => $anzeigeBetrag,
            'netto' => $investWp - $anzeigeBetrag,
            'proKlima' => $pkWp, 'proKlimaErlaubt' => $pkAllowed, 'proKlimaOptIn' => $pkOn,
            'proKlimaEffektiv' => $liveZuschuss - $anzeigeBetrag,
            'liveZuschuss' => $liveZuschuss, 'liveEigenanteil' => $liveEigen,
            'kumCap' => $kumCap, 'totalFoerderung' => $totalFoerd,
            'treppe' => $foerderTreppe,
            'quoteOhneEinkommen' => $quoteOhneEink,
            'zuschussOhneEinkommen' => $zuschussOhneEink,
            'eigenanteilOhneEinkommen' => $investWp - $zuschussOhneEink,
        ],
        'invest' => [
            'brutto' => $investWp, 'netto' => $nettoInvest,
            'fossilInvest' => $fossilInvest, 'mehrInvest' => $mehrInvest, 'investDelta' => $investDelta,
            'gasInvest' => $gasInvest, 'oelInvest' => $oelInvest,
        ],
        'system' => [
            'vglFuel' => $vglFuel, 'heizart' => $heizart,
            'heizLabel' => $vglFuel === 'gas' ? 'Gas' : 'Öl',
            'heizLabelBestand' => $heizart === 'gas' ? 'Gas' : 'Öl',
            'wpStrom' => $wpStrom, 'fossilVerbrauch' => $fossilVerbrauch,
            'jazInfo'=>$jazInfo,'jazTabellenstand'=>$params['jazTabellenstand']??'Gebündelter Tabellenstand 26.10.2026','wwZuschlag'=>$wwZuschlag,'startJahr'=>$startY,
            'nutzwaerme' => $nutzwaerme, 'etaProzent' => $inputs['eta'],
            'jaz' => $jaz, 'laufzeit' => $laufzeit,
            'neuFossilOn' => $neuFossilOn, 'bioOn' => $bioOn, 'bioFak' => $bioFak,
        ],
        'ergebnis' => [
            'cumSav' => $last['cumSav'], 'wpNG' => $wpNg, 'wpNGFinanziert' => $wpNg - $zinsDelta,
            'breakEven' => $breakEven, 'breakEvenSofort' => $breakEvenSofort,
            'totFossil' => $last['cumFossil'], 'totWPK' => $last['cumWPKosten'],
            'totMehr' => $last['cumMehr'], 'sparProJahr' => $last['cumSav'] / $laufzeit,
        ],
        'dreiWege' => [
            'aktiv' => $neuFossilOn,
            'oel' => ['invest' => $oelInvest, 'betrieb' => $opOel, 'gesamt' => $tcoOel],
            'gas' => ['invest' => $gasInvest, 'betrieb' => $opGas, 'gesamt' => $tcoGas],
            'wp' => ['invest' => $nettoInvest, 'betrieb' => $opWp, 'gesamt' => $tcoWp],
            'bestFossil' => $bestFossil, 'vorteil' => $dreiWegeVorteil,
        ],
        'finanzierung' => [
            'aktiv' => $finanzOn, 'kreditBetrag' => $finanzOn ? $kreditBetrag : null,
            'kredLZ' => $kredLz, 'kredZinsProzent' => $finanzOn ? $kredZins * 100 : null,
            'kredN' => $finanzOn ? $kredN : null,
            'monRate' => $finanzOn ? $monRate : null,
            'monRateFossil' => $finanzOn ? $monRateFossil : null,
            'monWPStrom' => $monWpStrom, 'monFossil' => $monFossil,
            'monGesWP' => $finanzOn ? $monGesWp : null,
            'monDiff' => $finanzOn ? $monDiff : null,
            'wpMon' => $finanzOn ? $wpMon : null,
            'fossMon' => $finanzOn ? $fossMon : null,
            'monVorteil' => $finanzOn ? $differenceCashflow : null,
            'zinsKosten' => $zinsKosten, 'zinsFossil' => $zinsFossil, 'zinsDelta' => $zinsDelta,
            'gesamtkostenKredit' => $finanzOn ? $monRate * $kredN : null,
            'endJahrIndex' => $endIndex,
            'endWpMon' => isset($data[$endIndex]) ? $data[$endIndex]['wpGes'] / 12 : 0,
            'endFossilMon' => isset($data[$endIndex]) ? $data[$endIndex]['fossilG'] / 12 : 0,
        ],
        'immo' => ['aktiv' => $immoOn, 'hausWert' => $hausW, 'prozent' => $immoP * 100, 'wertzuwachs' => $immoWert],
        'dynTarif' => [
            'aktiv' => $dynTarifOn, 'anteil' => $dynAnteil, 'spread' => $dynSpread,
            'ersparnisProJahr' => hw_js_round($data[0]['dynSav']),
        ],
        'co2' => [
            'gesamt' => $co2Total, 'oeko' => $co2Oeko, 'proJahr' => $co2ProJahr,
            'fluege' => $fluege, 'baeume' => $baeume, 'faktor' => $co2Fac, 'tonnenProJahr' => $co2Tpj,
        ],
        'sensi' => [
            'best' => $sBest['wpNG'], 'basis' => $sBase['wpNG'], 'worst' => $sWorst['wpNG'],
            'bestFossilStg' => ($fossilStg + $params['sensi']['best']['fossil']) * 100,
            'bestStromStg' => ($stromE + $params['sensi']['best']['strom']) * 100,
            'worstFossilStg' => ($fossilStg + $params['sensi']['worst']['fossil']) * 100,
            'worstStromStg' => ($stromE + $params['sensi']['worst']['strom']) * 100,
        ],
        'posten'=>array_combine(['grundpreisGas','schornsteinfeger','netzentgelt','modul14a','wpGrundpreis','pvSav','bioAufschlag','bioCo2Entlastung','bioNetto','wwStromK'],array_map(static fn($k)=>array_sum(array_column($data,$k)),['grundpreisGas','schornsteinfeger','netzentgelt','modul14a','wpGrundpreis','pvSav','bioAufschlag','bioCo2Entlastung','bioNetto','wwStromK'])),
        'quellen'=>['bio'=>'GModG § 43 Abs. 1, BGBl. 2026 I Nr. 226','bioPreis'=>'BDEW Januar 2026; Preisannahme, kein Gesetz','bioHinweis'=>$params['bioHinweis']??$bioStand['hinweis'],'netzentgelt'=>$params['netzentgelt']['quelle'],'netzentgeltAbrufdatum'=>$params['netzentgelt']['abrufdatum'],'modul14a'=>'enercity Netz, Preisblatt 2026; außerhalb des Netzgebiets Annahme'],
        'annahmen' => [
            'bedarf' => $bedarf, 'fossilP0' => $fossilP0, 'fossilStgProzent' => $fossilStg * 100,
            'stromP0' => $inputs['wpZaehler']?$inputs['wpArbeitspreis']:$stromP0, 'stromEProzent' => $stromE * 100,
            'co2P0' => $co2P0, 'co2Ziel' => $co2Ziel, 'co2ZielJahr'=>$params['co2ZielJahr'],
            'etaNeuGas' => $params['etaNeu']['gas'] * 100,
            'etaNeuOel' => $params['etaNeu']['oel'] * 100,
            'wartungWp' => $params['wartungFossil'], 'wartungFossil' => $params['wartungFossil'],
        ],
        'jahre' => $data,
        'charts' => [
            'labels' => array_map(static fn (array $row): string => hw_js_string($row['cY']), $data),
            'vermoegen' => array_map(static fn (array $row): int => hw_js_round($row['cumSav'] - $investDelta), $data),
            'nullLinie' => array_fill(0, count($data), 0),
            'sparEnergieCo2' => array_map(static fn (array $row): float|int => $fossilVerbrauch * $row['fossilBP'] / 100 + $row['co2St'] + $row['bioCo2Entlastung'] - $row['wpStromK'], $data),
            'grundpreisGas'=>array_column($data,'grundpreisGas'),'schornsteinfeger'=>array_column($data,'schornsteinfeger'),'netzentgelt'=>array_column($data,'netzentgelt'),'modul14a'=>array_column($data,'modul14a'),'wpGrundpreis'=>array_map(static fn($d)=>-$d['wpGrundpreis'],$data),'pv'=>array_column($data,'pvSav'),'warmwasser'=>array_column($data,'wwStromK'),'bioNetto'=>array_column($data,'bioNetto'),
            'sparDyn' => array_map(static fn (array $row): float|int => $row['dynSav'], $data),
            'bioAufschlag' => array_map(static fn (array $row): float|int => $row['fossilK'] - $fossilVerbrauch * $row['fossilBP'] / 100, $data),
            'wartungDelta' => array_map(static fn (array $row): float|int => -($row['wpW'] - $row['fossilW']), $data),
            'heizFossil' => array_map(static fn (array $row): int => hw_js_round($row['fossilG']), $data),
            'heizWp' => array_map(static fn (array $row): int => hw_js_round($row['wpGes']), $data),
            'heizDiff' => array_map(static fn (array $row): int => hw_js_round($row['mehrK']), $data),
        ],
    ];
}

/** @return array<string,mixed> */
function hw_kostenvergleich(array $query, array $sheets): array
{
    $f = hw_read_kv($sheets, 'Förder_Parameter');
    $params = hw_foerder_params_mit_rueckfall(
        hw_kv_kostenparameter($sheets),
        $f,
        hw_foerder_rueckfall_logger()
    );
    $inputs = hw_kv_map_request($query, $params);
    if (hw_query_string($query, 'bedarfModus') === 'schaetzung') {
        $geb = hw_kv_enum($query['geb'] ?? null, ['efh', 'dhh', 'rh', 'zfh', 'mfh'], '');
        $bj = hw_kv_enum($query['bj'] ?? null, ['vor1978', '1978-1994', '1995-2010', 'nach2010'], '');
        $san = hw_kv_enum($query['san'] ?? null, ['nein', 'teilweise', 'umfassend'], '');
        $flaeche = hw_kv_num($query['flaeche'] ?? null, 0);
        if ($geb === '' || $bj === '' || $san === '' || $flaeche < 60 || $flaeche > 800) {
            throw new RuntimeException('Ungültige Angaben für die Verbrauchsschätzung.');
        }
        $inputs['bedarf'] = hw_kv_schaetze_bedarf($geb, $bj, $san, $flaeche, $params);
    }
    $out = hw_kv_calculate($inputs, $params);
    $out['periodeAutomatik'] = $inputs['_periodeAutomatik'];
    // Antrag und Installation sind zwei verschiedene Termine (GF-Entscheid 19.08.2026). Der
    // Installationsbeginn geht NICHT in die Foerderrechnung ein, er wird nur gegen die Reihenfolge
    // geprueft: Antrag vor Vorhabensbeginn.
    $periodeGewaehlt = $params['perioden'][$inputs['fHalbjahr']] ?? [];
    $heute = hw_heute_ab_stichtag_iso($params);
    $antragAb = hw_js_string($periodeGewaehlt['gueltigAb'] ?? '');
    if ($antragAb === '' || $antragAb < $heute) {
        $antragAb = $heute;
    }
    $install = hw_installationsbeginn($query['installBeginn'] ?? null, $antragAb);
    $out['antragAb'] = $antragAb;
    $out['installBeginn'] = $install['iso'];
    $out['installHinweis'] = $install['hinweis'];
    return $out;
}

/** @return array<string,mixed> */
function hw_health(array $sheets): array
{
    return [
        'status' => 'ok',
        'service' => 'HeroWerk Rechner Backend',
        'ready' => hw_read_kv($sheets, 'Förder_Parameter') !== [] && hw_read_kv($sheets, 'Dimensionierung') !== [],
    ];
}

/** @return array<string,mixed> */
function hw_rechner_route(string $action, array $query, array $sheets, int $schemaVersion = 2): array
{
    $tables = $schemaVersion === 3 ? rechner_schema3_tabellen_aufloesen($sheets) : null;
    return match ($action) {
        'dimensionierung' => hw_dimensionierung($query, $sheets, $tables),
        'klima' => hw_klima($query, $sheets),
        'foerderung' => hw_foerderung($query, $sheets, $tables),
        'preise' => hw_preise($sheets, $tables),
        'kostenvergleich' => hw_kostenvergleich($query, $sheets),
        'kv_bootstrap' => hw_kv_bootstrap($sheets),
        'fv_plaetze' => hw_fv_plaetze($sheets),
        default => hw_health($sheets),
    };
}
