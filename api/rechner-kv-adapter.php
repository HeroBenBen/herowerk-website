<?php
/** T1247: Eingangsnormalisierung und Anzeigeprojektion, ohne Änderung des Rechenkerns. */
declare(strict_types=1);

function hw_kv_marktwerte(?array $liste = null): array
{
    $liste ??= require __DIR__ . '/../data/kv-marktwerte.php';
    $out = [];
    foreach ($liste as $feld => $eintrag) {
        if (!is_array($eintrag) || !isset($eintrag['wert']) || !is_numeric($eintrag['wert'])
            || !is_finite((float) $eintrag['wert']) || $eintrag['wert'] < 0) {
            continue;
        }
        foreach (['einheit', 'quelle', 'stand'] as $pflicht) {
            if (!is_string($eintrag[$pflicht] ?? null) || trim($eintrag[$pflicht]) === '') {
                continue 2;
            }
        }
        $out[$feld] = array_intersect_key($eintrag, array_flip(['wert', 'einheit', 'quelle', 'stand']));
    }
    return $out;
}

function hw_kv_euro_zahl(array $query, string $feld, string $label, bool $nullErlaubt = false): float
{
    $wert = $query[$feld] ?? null;
    if (!is_scalar($wert) || !is_numeric($wert) || !is_finite((float) $wert)
        || ($nullErlaubt ? (float) $wert < 0 : (float) $wert <= 0)) {
        if ($feld === 'jahreskosten') {
            throw new InvalidArgumentException('Bitte deine Jahreskosten größer als 0 eindeutig eingeben: 2.650,38 oder 2650,38; alternativ 2650.38 mit genau zwei Nachkommastellen oder 2650 ohne Cent.');
        }
        throw new InvalidArgumentException('Bitte ' . $label . ($nullErlaubt ? ' ab 0' : ' größer als 0') . ' eingeben.');
    }
    return (float) $wert;
}

function hw_kv_mengenanzeige(float $wert): string
{
    return rtrim(rtrim(number_format($wert, 3, ',', '.'), '0'), ',');
}

/** Ausschließlich die heutige Heizungsart führt die Umrechnung. Keine Regler-Rundung. */
function hw_kv_euro_normalisieren(array $query, float $oelFaktor = 10): array
{
    if (($query['bedarfModus'] ?? '') !== 'jahreskosten') {
        return [$query, null];
    }
    $heizart = $query['heizart'] ?? '';
    if (!in_array($heizart, ['gas', 'oel'], true)) {
        throw new InvalidArgumentException('Bitte deine heutige Heizungsart wählen.');
    }
    $betrag = hw_kv_euro_zahl($query, 'jahreskosten', 'deine Jahreskosten in Euro');
    $literpreis = $heizart === 'oel' && isset($query['n01_preis_oel']) ? hw_kv_euro_zahl($query, 'n01_preis_oel', 'den Ölpreis in Euro je Liter') : null;
    $preisfeld = $heizart === 'gas' ? 'gaspreis' : ($literpreis !== null ? 'n01_preis_oel' : 'oelpreis');
    $preis = hw_kv_euro_zahl($query, $preisfeld, $preisfeld === 'n01_preis_oel' ? 'den Ölpreis in Euro je Liter' : 'den Arbeitspreis in ct/kWh');
    $grundpreis = $heizart === 'gas' ? hw_kv_euro_zahl($query, 'grundpreisGas', 'den Gas-Grundpreis in Euro/Jahr', true) : 0;
    if ($betrag <= $grundpreis) {
        throw new InvalidArgumentException('Deine Gas-Jahreskosten müssen höher als der Gas-Grundpreis sein.');
    }
    $bedarf = $preisfeld === 'n01_preis_oel' ? $betrag * $oelFaktor / $preis : ($betrag - $grundpreis) / ($preis / 100);
    if (!is_finite($bedarf) || $bedarf < 5000 || $bedarf > 80000) {
        throw new InvalidArgumentException('Aus deiner Jahresrechnung ergibt sich ein Verbrauch außerhalb von 5.000 bis 80.000 kWh. Bitte prüfe Jahresbetrag und Preise oder nutze die Verbrauchseingabe.');
    }
    $herkunft = json_decode(is_string($query['preisHerkunft'] ?? null) ? $query['preisHerkunft'] : '{}', true);
    $herkunft = is_array($herkunft) ? $herkunft : [];
    $markt = hw_kv_marktwerte();
    $preise = [];
    foreach ([$preisfeld => $preis] + ($heizart === 'gas' ? ['grundpreisGas' => $grundpreis] : []) as $feld => $wert) {
        $origin = $herkunft[$feld] ?? 'annahme';
        $origin = in_array($origin, ['own', 'market'], true) ? $origin : 'annahme';
        // Eine Marktbehauptung gilt nur für den tatsächlich verwendeten Referenzwert.
        if ($origin === 'market' && (!isset($markt[$feld]) || (float) $markt[$feld]['wert'] !== $wert)) {
            $origin = 'annahme';
        }
        $preise[$feld] = ['wert' => $wert, 'herkunft' => $origin,
            'einheit' => $feld === 'grundpreisGas' ? 'Euro/Jahr' : ($feld === 'n01_preis_oel' ? 'Euro/Liter' : 'ct/kWh'),
            'referenz' => $origin === 'market' ? $markt[$feld] : null];
    }
    $preisHerkunft = [];
    foreach ($preise as $feld => $p) {
        $label = $feld === 'grundpreisGas' ? 'Grundpreis' : 'Arbeitspreis';
        $quelle = $p['herkunft'] === 'own' ? 'eigene Angabe' : ($p['herkunft'] === 'market'
            ? 'Marktwert ' . $p['referenz']['quelle'] . ', Stand ' . $p['referenz']['stand']
            : 'HeroWerk-Annahme');
        $preisHerkunft[] = $label . ' ' . $quelle;
    }
    $fmt = static fn (float $n): string => number_format($n, 2, ',', '.');
    $text = 'Aus deiner Jahresrechnung ergibt sich ein Verbrauch von ' . hw_kv_mengenanzeige($bedarf) . ' kWh. '
        . 'Deine Jahreskosten: ' . $fmt($betrag) . ' Euro. '
        . ($heizart === 'gas' ? 'Davon Gas-Grundpreis: ' . $fmt($grundpreis) . ' Euro/Jahr. ' : '')
        . 'Verwendeter Arbeitspreis: ' . $fmt($preis) . ($preisfeld === 'n01_preis_oel' ? ' Euro/Liter. ' : ' ct/kWh. ')
        . ($preisfeld === 'n01_preis_oel' ? 'Das entspricht ' . hw_kv_mengenanzeige($betrag / $preis) . ' Litern bei ' . hw_kv_mengenanzeige($oelFaktor) . ' kWh je Liter. ' : '')
        . 'Preisherkunft: ' . implode(', ', $preisHerkunft) . '. '
        . 'Dieser Rechnungsbetrag ist die Eingabe; die modellierten Heizkosten enthalten zusätzlich Wartung und Schornsteinfeger und gegebenenfalls den effizienteren neuen Kessel.';
    $query['bedarf'] = $bedarf;
    unset($query['bedarfModus']);
    return [$query, ['betrag' => $betrag, 'heizart' => $heizart, 'preise' => $preise,
        'bedarfKwh' => $bedarf, 'herkunft' => 'own', 'text' => $text]];
}

function hw_kv_nutzen_projektion(array $out): array
{
    $fossil = $out['system']['neuFossilOn'] ? $out['invest']['fossilInvest'] : 0;
    $wp = $out['invest']['netto'];
    $labels = [0];
    $fossilReihe = [$fossil];
    $wpReihe = [$wp];
    foreach ($out['jahre'] as $jahr) {
        $labels[] = $jahr['j'];
        $fossilReihe[] = $fossil + $jahr['cumFossil'];
        $wpReihe[] = $wp + $jahr['cumWPKosten'];
    }
    return ['labels' => $labels, 'fossil' => $fossilReihe, 'wp' => $wpReihe,
        'breakEven' => $out['ergebnis']['breakEven']];
}

function hw_kv_adapter_route(string $action, array $query, array $sheets, int $schemaVersion = 2): array
{
    $ableitung = null;
    if ($action === 'kostenvergleich') {
        try {
            $params = hw_kv_kostenparameter($sheets);
            $faktor = (float) $params['schaetzung']['einheitFaktor'];
            if (!is_finite($faktor) || $faktor <= 0) throw new InvalidArgumentException('Der Umrechnungsfaktor für Heizöl ist nicht verfügbar.');
            $normalisiert = $query;
            $defaults = hw_kv_defaults();
            $heizart = $query['heizart'] ?? $defaults['heizart'];
            $brennstoffe = [$heizart];
            if (hw_kv_bool($query['neuFossilTog'] ?? null, $defaults['neuFossilTog'])) {
                $brennstoffe[] = $query['vglBrennstoff'] ?? $defaults['vglBrennstoff'];
            }
            $gas = in_array('gas', $brennstoffe, true);
            $oel = in_array('oel', $brennstoffe, true);
            if (($query['kvAnsicht'] ?? '') === 'nutzen' && array_key_exists('strompreis', $query)) {
                hw_kv_euro_zahl($query, 'strompreis', 'deinen Haushaltsstrompreis in ct/kWh');
            }
            if (($query['kvAnsicht'] ?? '') === 'nutzen' && $gas) {
                if (array_key_exists('gaspreis', $query)) hw_kv_euro_zahl($query, 'gaspreis', 'deinen Gaspreis in ct/kWh');
                if (array_key_exists('grundpreisGas', $query)) hw_kv_euro_zahl($query, 'grundpreisGas', 'den Gas-Grundpreis in Euro/Jahr', true);
            }
            if (($query['kvAnsicht'] ?? '') === 'nutzen') {
                // Nicht verwendete Preise dürfen auch bei direktem API-Aufruf nicht sperren.
                if (!$gas) unset($normalisiert['gaspreis'], $normalisiert['grundpreisGas']);
                if (!$oel) unset($normalisiert['n01_preis_oel'], $normalisiert['oelpreis']);
                if (!hw_kv_bool($query['wpZaehler'] ?? null, false)) unset($normalisiert['wpArbeitspreis'], $normalisiert['wpGrundpreis']);
            }
            if ($oel && array_key_exists('n01_preis_oel', $query)) {
                $normalisiert['oelpreis'] = hw_kv_euro_zahl($query, 'n01_preis_oel', 'den Ölpreis in Euro je Liter') * (100 / $faktor);
            }
            [$normalisiert, $ableitung] = hw_kv_euro_normalisieren($normalisiert, $faktor);
        } catch (InvalidArgumentException $e) {
            return ['service' => $action, 'error' => true, 'message' => $e->getMessage()];
        }
    }
    $out = hw_rechner_route($action, $normalisiert ?? $query, $sheets, $schemaVersion);
    if ($action === 'kv_bootstrap' && ($query['kvAnsicht'] ?? '') === 'nutzen') {
        $out['marktwerte'] = hw_kv_marktwerte();
        $params = hw_kv_kostenparameter($sheets);
        $out['preisAnzeige'] = ['n01_preis_oel' => $out['defaults']['oelpreis'] / 100 * $params['schaetzung']['einheitFaktor']];
    }
    if ($action === 'kostenvergleich' && ($query['kvAnsicht'] ?? '') === 'nutzen') {
        $out['nutzenKosten'] = hw_kv_nutzen_projektion($out);
        $out['preisAnzeige'] = ['oelNebenangabe' => number_format((float) $out['inputsEcho']['oelpreis'], 2, ',', '.') . ' ct/kWh bei ' . hw_kv_mengenanzeige($faktor) . ' kWh je Liter'];
    }
    if ($ableitung !== null) {
        $out['verbrauchAbleitung'] = $ableitung;
    }
    return $out;
}
