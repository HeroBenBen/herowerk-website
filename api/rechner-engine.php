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
                $year <= 2010 => '1995-2010',
                default => 'nach2010',
            };
        }
    }
    $classes = [
        'bis1918', '1919-1948', '1949-1957', '1958-1968', '1969-1978',
        '1979-1983', '1984-1994', '1995-2010', 'nach2010',
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

/** @return list<array{klasse:string,modell:string,hausgroesse:string,kw:string,brutto:float|int,eigen:float|int,proklima:float|int}> */
function hw_read_price_table(array $sheets, string $name): array
{
    $table = hw_finde_tabelle(hw_sheet($sheets, $name), ['Klasse', 'Modell', 'Endpreis_brutto']);
    $columns = [
        'klasse' => hw_kopf_index($table, 'Klasse'),
        'modell' => hw_kopf_index($table, 'Modell'),
        'hausgroesse' => hw_kopf_index($table, 'Hausgroesse', true),
        'kw' => hw_kopf_index($table, 'kW', true),
        'brutto' => hw_kopf_index($table, 'Endpreis_brutto'),
        'eigen' => hw_kopf_index($table, 'Eigenanteil', true),
        'proklima' => hw_kopf_index($table, 'proKlima_Eigenanteil', true),
    ];
    $out = [];
    foreach ($table['rows'] as $row) {
        if (hw_tabellen_wert($row, $columns['klasse']) === '') {
            continue;
        }
        $brutto = hw_num(hw_tabellen_wert($row, $columns['brutto']), 0);
        if ($brutto <= 0) {
            continue;
        }
        $out[] = [
            'klasse' => strtolower(hw_js_string(hw_tabellen_wert($row, $columns['klasse']))),
            'modell' => hw_js_string(hw_tabellen_wert($row, $columns['modell'])),
            'hausgroesse' => hw_js_string(hw_tabellen_wert($row, $columns['hausgroesse'])),
            'kw' => hw_js_string(hw_tabellen_wert($row, $columns['kw'])),
            'brutto' => $brutto,
            'eigen' => hw_num(hw_tabellen_wert($row, $columns['eigen']), 0),
            'proklima' => hw_num(hw_tabellen_wert($row, $columns['proklima']), 0),
        ];
    }
    return $out;
}

/** @return array<string,float|int> */
function hw_get_prices(array $sheets, string $brand): array
{
    $table = hw_finde_tabelle(
        hw_sheet($sheets, $brand === 'vaillant' ? 'Preise_Vaillant' : 'Preise_Wolf'),
        ['Klasse', 'Endpreis_brutto']
    );
    $klasse = hw_kopf_index($table, 'Klasse');
    $brutto = hw_kopf_index($table, 'Endpreis_brutto');
    $out = [];
    foreach ($table['rows'] as $row) {
        if (hw_tabellen_wert($row, $klasse) !== '') {
            $out[strtolower(hw_js_string(hw_tabellen_wert($row, $klasse)))] = hw_num(hw_tabellen_wert($row, $brutto), 0);
        }
    }
    return $out;
}

/** @return list<array<string,mixed>> */
function hw_get_catalog(array $sheets): array
{
    $table = hw_finde_tabelle(hw_sheet($sheets, 'Geräte_Katalog'), ['Marke', 'Modell', 'Kaskade']);
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
        'brutto' => hw_kopf_index($table, 'Brutto €'),
        'stand' => hw_kopf_index($table, 'Stand'),
        'puffer' => hw_kopf_index($table, 'Puffer (', true),
        'pufferLiter' => hw_kopf_index($table, 'Puffer Liter', true),
        'pufferGroesser' => hw_kopf_index($table, 'Puffer, groessere Variante', true),
        'pufferOhne' => hw_kopf_index($table, 'ohne Puffer moeglich', true),
    ];
    $out = [];
    foreach ($table['rows'] as $rowIndex => $row) {
        if (hw_tabellen_wert($row, $columns['marke']) === '' || hw_tabellen_wert($row, $columns['modell']) === '') {
            continue;
        }
        $pufferLiterRaw = hw_tabellen_wert($row, $columns['pufferLiter']);
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
            'brutto' => hw_num(hw_tabellen_wert($row, $columns['brutto']), 0),
            'stand' => hw_js_string(hw_tabellen_wert($row, $columns['stand'])),
            'puffer' => hw_js_string(hw_tabellen_wert($row, $columns['puffer'])),
            'pufferLiter' => $pufferLiterRaw === '' || !is_numeric($pufferLiterRaw) ? null : hw_num($pufferLiterRaw, 0),
            'pufferGroesser' => hw_js_string(hw_tabellen_wert($row, $columns['pufferGroesser'])),
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
        'dynTarifTog' => false, 'dynAnteil' => 40, 'dynSpread' => 10, 'modus' => 'kunde',
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
            'cap' => hw_kv_num($row[7] ?? null, 80),
            'effizienzPct' => hw_kv_num($row[8] ?? null, 0),
            'kindFreibetrag' => hw_kv_num($row[9] ?? null, 0),
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

    return [
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
        'bioStufen' => [
            ['y' => hw_kv_num($kv['bio_stufe_1_jahr'] ?? null, 2029), 'p' => hw_kv_num($kv['bio_stufe_1_anteil'] ?? null, 0.15)],
            ['y' => hw_kv_num($kv['bio_stufe_2_jahr'] ?? null, 2035), 'p' => hw_kv_num($kv['bio_stufe_2_anteil'] ?? null, 0.30)],
            ['y' => hw_kv_num($kv['bio_stufe_3_jahr'] ?? null, 2040), 'p' => hw_kv_num($kv['bio_stufe_3_anteil'] ?? null, 0.60)],
        ],
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
            'waermepumpe' => hw_get_num($d, 'jaz_bestand_waermepumpe', 3.5),
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

/** @return list<array<string,mixed>> */
function hw_match_catalog_varianten(
    array $sheets,
    string $brand,
    float|int $auslegung,
    string $heizsystem,
    float|int $nat,
    float|int $markenHeizstab,
    float|int $kaskadenToleranz
): array
{
    $grenze = static fn (array $item): float|int => $heizsystem === 'heizkoerper'
        ? hw_grenze_interp($item['grenzeW55'], $item['grenzeW55a10'], $nat)
        : hw_grenze_interp($item['grenzeW35'], $item['grenzeW35a10'], $nat);
    $items = array_values(array_filter(hw_get_catalog($sheets), static fn (array $item): bool => $item['marke'] === $brand));

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
        $leistung = hw_leistung_am_auslegungspunkt($item, $heizsystem, $nat);
        $mindestAnteil = $item['mindestAnteil'];
        $heizstab = $mindestAnteil >= 1 ? 0 : $markenHeizstab;
        if ($leistung < $mindestAnteil * $auslegung || $leistung + $heizstab < $auslegung) {
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
    float|int $kaskadenToleranz
): ?array {
    return hw_match_catalog_varianten(
        $sheets, $brand, $auslegung, $heizsystem, $nat, $markenHeizstab, $kaskadenToleranz
    )[0] ?? null;
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
function hw_dimensionierung(array $query, array $sheets): array
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

    // ÜBERGANGSLÖSUNG: Die neun Baujahresklassen werden bis zum Bau von Teil A des zweiten
    // Bauauftrags auf die vier alten Klassen des weiterhin blockierten Flächenwegs abgebildet.
    // Mit Teil A entfällt dieses Mapping vollständig.
    $baujahrMapping = [
        'bis1918' => 'vor1978', '1919-1948' => 'vor1978', '1949-1957' => 'vor1978',
        '1958-1968' => 'vor1978', '1969-1978' => 'vor1978',
        '1979-1983' => '1978-1994', '1984-1994' => '1978-1994',
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
    // Jahresarbeitszahl ueber 1 (jaz_bestand_waermepumpe = 3,5). Wer ihn dort weglaesst, rechnet
    // Strom als Waerme und legt das Haus um den Faktor 3,5 zu klein aus. Ein Faktor ueber 1 bleibt
    // deshalb erhalten; der Warmwasser-Abzug entfaellt auch dort.
    $heizlastWaerme = $verbrauchKnown
        ? ($faktorNutzwaerme > 1 ? $nutzwaerme : $bedarfKwh)
        : $raumwaerme;
    $heizlast = $heizlastWaerme / hw_get_num($d, 'volllaststunden', 1800);
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
            hw_get_num($d, 'kaskaden_toleranz_kw', 0.5)
        );
        $varianten = [];
        foreach ($matches as $index => $match) {
            $result = hw_catalog_result(
                $match,
                hw_read_price_table($sheets, $brand === 'vaillant' ? 'Preise_Vaillant' : 'Preise_Wolf'),
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
    return [
        'bedarf' => $auslegung,
        'fuehrung' => $wwLeistung > $heizlast ? 'warmwasser' : 'heizung',
        'stromverbrauch_kwh' => $stromverbrauch,
        'strom_hinweis' => 'Geschätzt aus deinem Wärmebedarf. Wie viel Strom deine Wärmepumpe wirklich braucht, hängt an Gebäude, Vorlauftemperatur und Gerät und wird vor Ort genauer bestimmt. Warmwasser braucht dabei mehr Strom je Kilowattstunde Wärme als die Heizung.',
        'taktpunkt_grenze_c' => $d['taktpunkt_grenze_c'] ?? null,
        'taktpunkt_grenze_wirksam' => false,
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

function hw_einkommen_norm(mixed $value): string
{
    $normalized = strtolower(hw_js_string($value ?: ''));
    if ($normalized === 'unter40') {
        return 'bis40';
    }
    if ($normalized === 'ueber40') {
        return 'ueber50';
    }
    return in_array($normalized, ['bis30', 'bis40', 'bis50', 'ueber50'], true) ? $normalized : 'unbekannt';
}

function hw_einkommensbonus_pct(string $income, bool $kind, array $f): float|int
{
    $grenzen = [
        'bis30' => hw_get_num($f, 'reform_eink_grenze_bis30', 30000),
        'bis40' => hw_get_num($f, 'reform_eink_grenze_bis40', 40000),
        'bis50' => hw_get_num($f, 'reform_eink_grenze_bis50', 50000),
    ];
    if (!array_key_exists($income, $grenzen)) {
        return 0;
    }
    $anrechenbar = max(0, $grenzen[$income] - ($kind ? hw_get_num($f, 'reform_kind_abzug_eur', 10000) : 0));
    if ($anrechenbar <= $grenzen['bis30']) {
        return hw_get_num($f, 'reform_eink_pct_bis30', 40);
    }
    if ($anrechenbar <= $grenzen['bis40']) {
        return hw_get_num($f, 'reform_eink_pct_bis40', 30);
    }
    if ($anrechenbar <= $grenzen['bis50']) {
        return hw_get_num($f, 'reform_eink_pct_bis50', 10);
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

/** @return array<string,mixed> */
function hw_foerder_calc(array $query, array $f, string $date, array $perioden): array
{
    $period = hw_periode_fuer($date, $perioden);
    $we = hw_int($query['we'] ?? null, 1);
    $selbstWe = hw_int($query['selbstWE'] ?? null, 1);
    $heizung = hw_query_string($query, 'heizung', 'gas');
    $einkommen = hw_einkommen_norm(array_key_exists('einkommen', $query) ? $query['einkommen'] : 'ueber40');
    $kindValue = strtolower(hw_query_string($query, 'kind'));
    $kind = $kindValue === 'ja' || $kindValue === 'true';
    $euOk = strtolower(hw_query_string($query, 'eu', 'ja')) !== 'nein';
    $gemeinde = strtolower(hw_query_string($query, 'gemeinde'));
    $preis = hw_int($query['preis'] ?? null, 34510);
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
        $satzSelbst += hw_get_num($f, 'effizienzbonus_pct', 5);
        $satzSelbst = min($satzSelbst, hw_get_num($f, 'deckel_selbst_pct', 70));
        $satzVermietet = min(hw_get_num($f, 'deckel_vermietet_pct', 35), $grundPct + hw_get_num($f, 'effizienzbonus_pct', 5));
        $foerderFaehigGesamt = hw_foerderfaehige_kosten($we, $f);
        $bausteine = [
            'Grundförderung ' . $grundPct . '%',
            'Effizienzbonus (R290) +' . hw_get_num($f, 'effizienzbonus_pct', 5) . '%',
        ];
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
        $einkommensbonusPct = hw_einkommensbonus_pct($einkommen, $kind, $f);
        $satzSelbst = $grundPct;
        if ($selbstWe > 0 && $klimaBonus) {
            $satzSelbst += $klimaPct;
        }
        if ($selbstWe > 0) {
            $satzSelbst += $einkommensbonusPct;
        }
        $satzSelbst = min($satzSelbst, hw_get_num($f, 'reform_deckel_pct', 80));
        $satzVermietet = $grundPct;
        $foerderFaehigGesamt = hw_foerderfaehige_kosten($we, $f, $period['grenze']);
        if ($we > 1) {
            $hinweise[] = 'Bei mehreren Wohneinheiten gelten gestaffelte Grenzen je Wohneinheit. Wir rechnen dein Projekt genau durch.';
        }
        if (!empty($period['ueberHorizont'])) {
            $hinweise[] = 'Für Anträge nach dem 31.07.2029 stehen die Fördersätze noch nicht fest. Wir rechnen dein Projekt genau durch.';
        }
        $bausteine = ['Grundförderung ' . $grundPct . '%'];
        if ($selbstWe > 0 && $klimaBonus && $klimaPct > 0) {
            array_splice($bausteine, 1, 0, ['Klimageschwindigkeitsbonus +' . $klimaPct . '%']);
        }
        if ($selbstWe > 0 && $einkommensbonusPct > 0) {
            array_splice($bausteine, 1, 0, ['Einkommensbonus +' . $einkommensbonusPct . '%']);
        }
    }

    $vermieteteWe = $we - $selbstWe;
    if ($period['reform']) {
        $grenze2bis6 = hw_get_num($f, 'foerderfaehig_we2bis6', 15000);
        $grenze7plus = hw_get_num($f, 'foerderfaehig_we7plus', 8000);
        $kostenJeWe = $preis / $we;
        $basisSelbst = 0;
        $basisVermietet = 0;
        for ($index = 0; $index < $we; $index++) {
            $grenzeWe = $index === 0 ? $period['grenze'] : ($index < 6 ? $grenze2bis6 : $grenze7plus);
            $basisWe = min($grenzeWe, $kostenJeWe);
            if ($index < $selbstWe) {
                $basisSelbst += $basisWe;
            } else {
                $basisVermietet += $basisWe;
            }
        }
        $bemessungsBasis = $basisSelbst + $basisVermietet;
        $zuschussSelbst = $selbstWe > 0 ? hw_js_round($basisSelbst * ($satzSelbst / 100)) : 0;
        $zuschussVermietet = $vermieteteWe > 0 ? hw_js_round($basisVermietet * ($satzVermietet / 100)) : 0;
    } else {
        $foerderProWe = $foerderFaehigGesamt / $we;
        $kostenProWe = min($foerderProWe, $preis / $we);
        $bemessungsBasis = $kostenProWe * $we;
        $zuschussSelbst = $selbstWe > 0 ? hw_js_round($kostenProWe * ($satzSelbst / 100)) : 0;
        $zuschussVermietet = $vermieteteWe > 0 ? hw_js_round($kostenProWe * ($satzVermietet / 100) * $vermieteteWe) : 0;
    }
    $zuschussGesamt = $zuschussSelbst + $zuschussVermietet;

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
    $proklimaZuschuss = max(0, $totalFoerd - $zuschussGesamt);
    $proklimaGekappt = $pkRoh > 0 && $proklimaZuschuss < $pkRoh;
    if ($proklimaGekappt) {
        $hinweise[] = 'KfW-Zuschuss und proKlima zusammen sind auf 60 Prozent derselben Kosten begrenzt. Der KfW-Zuschuss allein darf darüber liegen.';
    }
    $eigenanteil = max(0, $preis - $zuschussGesamt - $proklimaZuschuss);
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

/** @return array<string,mixed> */
function hw_foerderung(array $query, array $sheets): array
{
    $f = hw_read_kv($sheets, 'Förder_Parameter');
    $params = hw_kv_get_params($sheets);
    $brand = strtolower(hw_query_string($query, 'marke', 'wolf'));
    $prices = hw_get_prices($sheets, $brand);
    $wpTyp = strtolower(hw_query_string($query, 'wpTyp', 'm'));
    $manual = array_key_exists('preisManuell', $query) && $query['preisManuell'] !== '';
    $preis = $manual ? hw_int($query['preisManuell'], 34510) : (($prices[$wpTyp] ?? 0) ?: 34510);
    $args = $query;
    $args['preis'] = $preis;
    $perioden = hw_foerder_perioden_aus_kv($params);
    $out = hw_foerder_calc($args, $f, hw_heute_ab_stichtag_iso($params) . 'T12:00:00', $perioden);
    if ($brand === 'vaillant') {
        $out['vorlaeufig'] = true;
    }
    $treppe = [];
    foreach ($params['periodenReihenfolge'] ?? [] as $id) {
        $period = $params['perioden'][$id];
        $stufe = hw_foerder_calc($args, $f, hw_js_string($period['gueltigAb']) . 'T12:00:00', $perioden);
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
    return [
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
    $params = hw_kv_get_params($sheets);
    $perioden = [];
    foreach ($params['periodenReihenfolge'] as $key) {
        $perioden[] = ['key' => $key, 'label' => $params['perioden'][$key]['label']];
    }
    $defaults = hw_kv_defaults();
    unset($defaults['proklimaTog'], $defaults['fEffizienz'], $defaults['modus']);
    $defaults['kredZins'] = $params['kredZins358Eff'];
    $eta = hw_eta_matrix();
    unset($eta['textEigen']);
    return [
        'service' => 'kv_bootstrap',
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
function hw_preise(array $sheets): array
{
    $filter = static function (array $rows): array {
        return array_map(static fn (array $row): array => [
            'klasse' => $row['klasse'], 'modell' => $row['modell'], 'kw' => $row['kw'],
            'brutto' => $row['brutto'], 'eigen' => $row['eigen'],
        ], $rows);
    };
    return [
        'wolf' => $filter(hw_read_price_table($sheets, 'Preise_Wolf')),
        'vaillant' => $filter(hw_read_price_table($sheets, 'Preise_Vaillant')),
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
    $heizart = $inputs['heizart'];
    $bedarf = $inputs['bedarf'];
    $eta = $inputs['eta'] / 100;
    $investWp = $inputs['invWP'];
    $jaz = $inputs['jaz'];
    $laufzeit = $inputs['laufzeit'];
    $bioOn = (bool) $inputs['bioTog'];
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
    $nettoInvest = max(0, $investWp - $totalFoerd);
    $fossilInvest = $vglFuel === 'gas' ? $gasInvest : $oelInvest;
    $mehrInvest = $nettoInvest - $fossilInvest;
    $wpStrom = $bedarf * $eta / $jaz;
    $fossilVerbrauch = $neuFossilOn ? $bedarf * $eta / $params['etaNeu'][$vglFuel] : $bedarf;
    $co2Fac = $params['co2f'][$vglFuel];
    $co2Tpj = $fossilVerbrauch * $co2Fac / 1000;
    $startY = $params['startY'];
    $zielSchritte = $params['co2ZielSchritte'];
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
        $calendarYear = $startY + $yearIndex - 1;
        $fossilBp = $fossilP0 * pow(1 + $fossilStg, $yearIndex - 1);
        $fossilEp = $fossilBp;
        if ($bioOn) {
            $bioShare = hw_kv_bio_anteil($calendarYear, $params);
            $fossilEp = $fossilBp * (1 + $bioShare * ($bioFak - 1));
        }
        $fossilK = $fossilVerbrauch * $fossilEp / 100;
        $bioShareYear = $bioOn ? hw_kv_bio_anteil($calendarYear, $params) : 0;
        $co2St = $co2Tpj * (1 - $bioShareYear) * ($co2Pj($yearIndex - 1) - $co2P0);
        $fossilW = $params['wartungFossil'];
        $fossilG = $fossilK + $co2St + $fossilW;
        $cumFossil += $fossilG;
        $co2FossilSum += $co2Tpj * (1 - $bioShareYear);
        $co2SavedMix += $co2Tpj * (1 - $bioShareYear) - $wpStrom * hw_kv_mix_g($calendarYear, $params) / 1e6;
        $stromPj = $stromP0 * pow(1 + $stromE, $yearIndex - 1);
        $wpStromK = $wpStrom * $stromPj / 100;
        $wpW = $params['wartungWp'];
        $dynSav = $dynTarifOn ? $wpStrom * ($dynAnteil / 100) * ($dynSpread / 100) : 0;
        $wpGes = $wpStromK + $wpW - $dynSav;
        $cumWpKosten += $wpGes;
        $yearSaving = $fossilG - $wpGes;
        $cumSav += $yearSaving;
        $mehrK = $fossilG - $wpGes;
        $cumMehr += $mehrK;
        $data[] = [
            'j' => $yearIndex, 'cY' => $calendarYear,
            'fossilBP' => $fossilBp, 'fossilEP' => $fossilEp,
            'bioP' => $bioOn ? hw_kv_bio_anteil($calendarYear, $params) * 100 : 0,
            'fossilK' => $fossilK, 'co2St' => $co2St, 'fossilW' => $fossilW, 'fossilG' => $fossilG,
            'wpStromK' => $wpStromK, 'pvSav' => 0, 'dynSav' => $dynSav, 'wpW' => $wpW, 'wpGes' => $wpGes,
            'mehrK' => $mehrK, 'cumMehr' => $cumMehr, 'jSav' => $yearSaving, 'cumSav' => $cumSav,
            'cumFossil' => $cumFossil, 'cumWPKosten' => $cumWpKosten,
        ];
    }
    $last = $data[count($data) - 1];
    $investDelta = $neuFossilOn ? $mehrInvest : $nettoInvest;
    $breakEven = null;
    foreach ($data as $row) {
        if ($row['cumSav'] >= max(0, $investDelta)) {
            $breakEven = $row['j'];
            break;
        }
    }
    $breakEvenSofort = $neuFossilOn && $investDelta <= 0;

    $fossilOpSum = static function (string $fuel) use (
        $neuFossilOn, $bedarf, $eta, $params, $gasP0, $oelP0, $gasStgV, $oelStgV,
        $bioOn, $bioFak, $co2Pj, $co2P0, $startY, $laufzeit
    ): float|int {
        $verbrauch = $neuFossilOn ? $bedarf * $eta / $params['etaNeu'][$fuel] : $bedarf;
        $price = $fuel === 'gas' ? $gasP0 : $oelP0;
        $steigerung = $fuel === 'gas' ? $gasStgV : $oelStgV;
        $co2Factor = $params['co2f'][$fuel];
        $co2PerYear = $verbrauch * $co2Factor / 1000;
        $sum = 0;
        for ($index = 1; $index <= $laufzeit; $index++) {
            $year = $startY + $index - 1;
            $basePrice = $price * pow(1 + $steigerung, $index - 1);
            $bioShare = $bioOn ? hw_kv_bio_anteil($year, $params) : 0;
            $effectivePrice = $basePrice * (1 + $bioShare * ($bioFak - 1));
            $cost = $verbrauch * $effectivePrice / 100;
            $co2 = $co2PerYear * (1 - $bioShare) * ($co2Pj($index - 1) - $co2P0);
            $sum += $cost + $co2 + $params['wartungFossil'];
        }
        return $sum;
    };
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

    $runScenario = static function (float|int $gasDelta, float|int $stromDelta) use (
        $laufzeit, $fossilP0, $fossilStg, $bioOn, $bioFak, $startY, $params,
        $fossilVerbrauch, $co2Tpj, $co2Pj, $co2P0, $stromP0, $stromE,
        $wpStrom, $dynTarifOn, $dynAnteil, $dynSpread, $investDelta
    ): array {
        $saving = 0;
        for ($index = 1; $index <= $laufzeit; $index++) {
            $fossilBase = $fossilP0 * pow(1 + $fossilStg + $gasDelta, $index - 1);
            $bioShare = $bioOn ? hw_kv_bio_anteil($startY + $index - 1, $params) : 0;
            $fossilEffective = $fossilBase * (1 + $bioShare * ($bioFak - 1));
            $fossilCost = $fossilVerbrauch * $fossilEffective / 100;
            $co2 = $co2Tpj * (1 - $bioShare) * ($co2Pj($index - 1) - $co2P0);
            $fossilTotal = $fossilCost + $co2 + $params['wartungFossil'];
            $strom = $stromP0 * pow(1 + $stromE + $stromDelta, $index - 1);
            $wpStromCost = $wpStrom * $strom / 100;
            $dynamicSaving = $dynTarifOn ? $wpStrom * ($dynAnteil / 100) * ($dynSpread / 100) : 0;
            $wpTotal = $wpStromCost + $params['wartungWp'] - $dynamicSaving;
            $saving += $fossilTotal - $wpTotal;
        }
        return ['wpNG' => $saving - $investDelta];
    };
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
    $anzeigeBetrag = hw_js_round($fBasis * $fInfo['q'] / 100);
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
            'nutzwaerme' => $bedarf * $eta, 'etaProzent' => $inputs['eta'],
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
            'ersparnisProJahr' => hw_js_round($wpStrom * ($dynAnteil / 100) * ($dynSpread / 100)),
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
        'annahmen' => [
            'bedarf' => $bedarf, 'fossilP0' => $fossilP0, 'fossilStgProzent' => $fossilStg * 100,
            'stromP0' => $stromP0, 'stromEProzent' => $stromE * 100,
            'co2P0' => $co2P0, 'co2Ziel' => $co2Ziel,
            'etaNeuGas' => $params['etaNeu']['gas'] * 100,
            'etaNeuOel' => $params['etaNeu']['oel'] * 100,
            'wartungWp' => $params['wartungWp'], 'wartungFossil' => $params['wartungFossil'],
        ],
        'jahre' => $data,
        'charts' => [
            'labels' => array_map(static fn (array $row): string => hw_js_string($row['cY']), $data),
            'vermoegen' => array_map(static fn (array $row): int => hw_js_round($row['cumSav'] - $investDelta), $data),
            'nullLinie' => array_fill(0, count($data), 0),
            'sparEnergieCo2' => array_map(static fn (array $row): float|int => $fossilVerbrauch * $row['fossilBP'] / 100 + $row['co2St'] - $row['wpStromK'], $data),
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
    $params = hw_kv_get_params($sheets);
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
function hw_rechner_route(string $action, array $query, array $sheets): array
{
    return match ($action) {
        'dimensionierung' => hw_dimensionierung($query, $sheets),
        'klima' => hw_klima($query, $sheets),
        'foerderung' => hw_foerderung($query, $sheets),
        'preise' => hw_preise($sheets),
        'kostenvergleich' => hw_kostenvergleich($query, $sheets),
        'kv_bootstrap' => hw_kv_bootstrap($sheets),
        'fv_plaetze' => hw_fv_plaetze($sheets),
        default => hw_health($sheets),
    };
}
