import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const bridgeUrl = process.env.HERO_BRIDGE_URL;
const bridgeKey = process.env.HERO_BRIDGE_KEY;
if (!bridgeUrl || !bridgeKey) {
  throw new Error('HERO_BRIDGE_URL und HERO_BRIDGE_KEY müssen gesetzt sein.');
}

const spreadsheetId = '176a2khhd3eIJJwe23JXfuEaTTjY-qrkccxb-F52yoVA';
const ranges = {
  Dimensionierung: 'A1:E100',
  Preise_Wolf: 'A1:Z120',
  Preise_Vaillant: 'A1:Z120',
  Geräte_Katalog: 'A1:X40',
  Geraete_Kennlinien: 'A1:E1000',
  Klima_PLZ: 'A1:F500',
};

async function readSheet(sheet, range) {
  const url = new URL(bridgeUrl);
  for (const [key, value] of Object.entries({
    action: 'getRange',
    spreadsheetId,
    sheet,
    range,
    key: bridgeKey,
  })) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${sheet}: HTTP ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body.values)) throw new Error(`${sheet}: keine Werte erhalten`);
  return body.values;
}

const sheets = {};
for (const [sheet, range] of Object.entries(ranges)) {
  sheets[sheet] = await readSheet(sheet, range);
}

const scenarios = [
  ['S1', 'efh', 1960, 140, 'nein', 'heizkoerper', 3200, []],
  ['S2', 'efh', 1960, 140, 'teilweise', 'heizkoerper', 2400, ['Dach', 'Fenster']],
  ['S3', 'efh', 1960, 200, 'nein', 'heizkoerper', 4600, []],
  ['S4', 'efh', 1975, 160, 'nein', 'heizkoerper', 3400, []],
  ['S5', 'efh', 1975, 160, 'teilweise', 'heizkoerper', 2200, ['Dach', 'Fenster']],
  ['S6', 'efh', 1990, 150, 'nein', 'heizkoerper', 2600, []],
  ['S7', 'efh', 2000, 150, 'nein', 'fussboden', 2100, []],
  ['S8', 'efh', 2015, 160, 'nein', 'fussboden', 1400, []],
  ['S9', 'dhh', 1970, 120, 'nein', 'heizkoerper', 2600, []],
  ['S10', 'rh', 1970, 110, 'nein', 'heizkoerper', 2100, []],
  ['S11', 'zfh', 1965, 220, 'nein', 'heizkoerper', 5200, []],
  ['S12', 'efh', 1930, 180, 'teilweise', 'heizkoerper', 4800, ['Dach', 'Fenster']],
].map(([nummer, gebaeude, baujahr, flaeche, sanierung, heizsystem, verbrauch, bauteile]) => ({
  nummer,
  gebaeude,
  baujahr,
  flaeche,
  sanierung,
  heizsystem,
  verbrauch,
  bauteile,
}));

const phpProgram = String.raw`
require 'api/rechner-engine.php';
$input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$sheets = $input['sheets'];
$loads = [5, 7, 9, 11, 13, 15, 17, 20, 23, 26];
$aScenarios = [];
foreach ([['heizkoerper', 55, 'panel'], ['fussboden', 35, 'underfloor']] as $streckeIndex => $strecke) {
    [$heizsystem, $vorlauf, $uebergabe] = $strecke;
    foreach ($loads as $loadIndex => $heizlast) {
        $aScenarios[] = [
            'nummer' => 'A' . ($streckeIndex * count($loads) + $loadIndex + 1),
            'heizlast_kW' => $heizlast,
            'heizsystem' => $heizsystem,
            'vorlauf_C' => $vorlauf,
            'uebergabe' => $uebergabe,
            'warmwasser_ueber_wp' => 'nein',
            'personen' => 0,
        ];
    }
}
foreach ([['heizkoerper', 55, 'panel'], ['fussboden', 35, 'underfloor']] as $streckeIndex => $strecke) {
    [$heizsystem, $vorlauf, $uebergabe] = $strecke;
    foreach ([9, 15, 23] as $loadIndex => $heizlast) {
        $aScenarios[] = [
            'nummer' => 'A' . (21 + $streckeIndex * 3 + $loadIndex),
            'heizlast_kW' => $heizlast,
            'heizsystem' => $heizsystem,
            'vorlauf_C' => $vorlauf,
            'uebergabe' => $uebergabe,
            'warmwasser_ueber_wp' => 'ja',
            'personen' => 4,
        ];
    }
}
$a = [];
$d = hw_read_kv($sheets, 'Dimensionierung');
$catalogParameters = hw_read_kv($sheets, 'Geräte_Katalog');
$wwLeistungVierPersonen = hw_warmwasser_leistung($d, 4, 1, 1, '1', '1');
foreach ($aScenarios as $scenario) {
    $auslegung = hw_round1(max(
        $scenario['heizlast_kW'],
        $scenario['warmwasser_ueber_wp'] === 'ja' ? $wwLeistungVierPersonen : 0
    ));
    foreach (['wolf', 'vaillant'] as $brand) {
        $heizstab = hw_kv_num($catalogParameters['heizstab_' . $brand] ?? null, NAN);
        $match = hw_match_catalog(
            $sheets, $brand, $auslegung, $scenario['heizsystem'], -11.1, $heizstab,
            hw_get_num($d, 'kaskaden_toleranz_kw', 0.5)
        );
        $a[] = [
            'nummer' => $scenario['nummer'],
            'heizlast_kW' => $scenario['heizlast_kW'],
            'auslegung_kW' => $auslegung,
            'vorlauf_C' => $scenario['vorlauf_C'],
            'uebergabe' => $scenario['uebergabe'],
            'norm_AT_C' => -11.1,
            'warmwasser_ueber_wp' => $scenario['warmwasser_ueber_wp'],
            'personen' => $scenario['personen'],
            'marke' => $brand,
            'baureihe' => $match['baureihe'] ?? null,
            'modell' => $match['modell'] ?? null,
            'anzahl' => $match !== null
                ? (preg_match('/^(\d+)×/u', $match['modell'], $anzahlTreffer) ? (int) $anzahlTreffer[1] : 1)
                : null,
            'leistung_kW' => $match !== null ? hw_round1($match['leistungAuslegung']) : null,
            'leistungsanteil' => $match !== null ? hw_round1($match['leistungAuslegung'] / $auslegung * 100) : null,
            'kaskade' => $match['kaskade'] ?? null,
            'markentreiber_heizstab_kW' => $heizstab,
        ];
    }
}
$b = [];
$c = [];
foreach ($input['scenarios'] as $scenario) {
    $base = [
        'flaeche' => $scenario['flaeche'],
        'baujahr' => (string) $scenario['baujahr'],
        'gebaeude' => $scenario['gebaeude'],
        'sanierung' => $scenario['sanierung'],
        'warmwasser' => 'nein',
        'heizsystem' => $scenario['heizsystem'],
        'plz' => '30419',
        'personen' => 2,
        'heizung' => 'gas',
        'andere_heizung' => 'fernwaerme',
        'abgasrohr' => 'kunststoff',
        'heizungsalter' => '1990-2010',
        'duschen' => 0,
        'wannen' => 0,
        'duschgroesse' => '0',
        'wannengroesse' => '0',
    ];
    $known = hw_dimensionierung(array_merge($base, [
        'verbrauchKnown' => 'known',
        'verbrauch' => $scenario['verbrauch'],
        'einheit' => 'm3',
    ]), $sheets);
    $unknown = hw_dimensionierung(array_merge($base, [
        'verbrauchKnown' => 'unknown',
        'verbrauch' => 0,
        'einheit' => 'm3',
    ]), $sheets);
    $b[] = ['nummer' => $scenario['nummer'], 'ergebnis' => $known];
    $c[] = ['nummer' => $scenario['nummer'], 'ergebnis' => $unknown];
}
echo json_encode(['a' => $a, 'b' => $b, 'c' => $c], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
`;

const execution = spawnSync('php', ['-r', phpProgram], {
  cwd: path.resolve(import.meta.dirname, '..'),
  input: JSON.stringify({ sheets, scenarios }),
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
if (execution.status !== 0) throw new Error(execution.stderr || `PHP ${execution.status}`);

const output = {
  erhoben_am: new Date().toISOString(),
  commit: process.env.HERO_COMMIT || null,
  spreadsheetId,
  annahmen: {
    norm_AT_C: -11.1,
    warmwasser_neue_waermepumpe: 'nein',
    personen: 2,
    bestehende_heizung: 'Gas-Brennwert, Kunststoff-Abgasrohr, Baujahr 1990 bis 2010',
    wirkungsgrad_prozent: 86,
    warmwasserabzug_kWh_pro_jahr: 1400,
    gas_umrechnung_kWh_je_m3: 10,
    sanierung_abbildung: 'unsaniert = kein Bauteil; teilweise = genau Dach und Fenster',
    heizstab_leseweg:
      'Rechenkern verwendet den Markentreiber heizstab_vaillant, nicht die Zeilenspalten F/G.',
    warmwasser_a21_bis_a26:
      '4 Personen; Standardwerte des Rechenkerns: 1 Dusche, 1 Wanne, Größenstufe 1',
  },
  scenarios,
  ...JSON.parse(execution.stdout),
};

const reportDir = path.resolve(
  import.meta.dirname,
  '..',
  'reports',
  '2026-08-18_Doppellauf-drei-Strecken'
);
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'herowerk_roh.json'), `${JSON.stringify(output, null, 2)}\n`);

const vaillantRaw55Path = process.env.VAILLANT_RAW_55;
const vaillantRaw35Path = process.env.VAILLANT_RAW_35;
if (vaillantRaw55Path && vaillantRaw35Path) {
  const vaillantRaw = {
    panel: JSON.parse(fs.readFileSync(vaillantRaw55Path, 'utf8')),
    underfloor: JSON.parse(fs.readFileSync(vaillantRaw35Path, 'utf8')),
  };
  const csvCell = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const round1 = (value) => Math.round((Number(value) + Number.EPSILON) * 10) / 10;
  const vaillantRecommendation = (entry) => {
    const raw = vaillantRaw[entry.uebergabe];
    const run = raw.laeufe.find((item) => Number(item.heizlast_kW) === Number(entry.heizlast_kW));
    const series = run?.antwort?.recommendations_by_type_series?.find(
      (item) => item.type_series_name === entry.baureihe
    );
    const selection = series?.selections?.find((item) => item.type === 'recommended');
    const cascade = selection?.system?.cascade;
    if (!cascade?.heat_pumps?.length) return null;
    const devices = cascade.heat_pumps.map((item) => ({
      count: Number(item.count),
      model: item.heat_pump?.sname ?? '',
    }));
    const totalCount = Number(
      cascade.total_device_count ?? devices.reduce((sum, item) => sum + item.count, 0)
    );
    const model =
      devices.length === 1 && totalCount > 1
        ? `${totalCount}× ${devices[0].model}`
        : devices.map((item) => `${item.count}× ${item.model}`).join(' + ');
    return {
      model: totalCount === 1 && devices.length === 1 ? devices[0].model : model,
      count: totalCount,
      power: round1(cascade.total_actual_power),
      share: round1(Number(cascade.total_power_share) * 100),
    };
  };
  const normalizeModel = (value) =>
    String(value ?? '')
      .replace(/\bVaillant\s+/u, '')
      .replace(/\s+\(Kaskade\)$/u, '')
      .trim();
  const rowsA = output.a.map((entry) => {
    const foreign = entry.marke === 'vaillant' ? vaillantRecommendation(entry) : null;
    const same =
      foreign !== null &&
      normalizeModel(foreign.model) === normalizeModel(entry.modell) &&
      Number(foreign.count) === Number(entry.anzahl);
    let deviation = 'nur_herowerk';
    if (same) deviation = 'gleich';
    else if (foreign !== null && foreign.power > entry.leistung_kW) deviation = 'wir_kleiner';
    else if (foreign !== null && foreign.power < entry.leistung_kW) deviation = 'wir_groesser';
    else if (foreign !== null) deviation = 'andere_baureihe';
    return [
      entry.nummer,
      entry.heizlast_kW,
      entry.vorlauf_C,
      entry.uebergabe === 'panel' ? 'Heizkörper' : 'Flächenheizung',
      entry.norm_AT_C,
      entry.warmwasser_ueber_wp,
      entry.personen,
      entry.marke === 'vaillant' ? 'Vaillant' : 'Wolf',
      entry.baureihe,
      entry.marke === 'vaillant' ? 'vaillant_schnellauslegung' : 'kein_fremdvergleich',
      foreign?.model,
      foreign?.count,
      foreign?.power,
      foreign?.share,
      entry.modell,
      entry.anzahl,
      entry.leistung_kW,
      entry.leistungsanteil,
      same ? 'ja' : 'nein',
      deviation,
    ];
  });
  const headerA = [
    'nummer',
    'heizlast_kW',
    'vorlauf_C',
    'uebergabe',
    'norm_AT_C',
    'warmwasser_ueber_wp',
    'personen',
    'marke',
    'baureihe',
    'fremd_werkzeug',
    'fremd_modell',
    'fremd_anzahl',
    'fremd_leistung_kW',
    'fremd_leistungsanteil',
    'herowerk_modell',
    'herowerk_anzahl',
    'herowerk_leistung_kW',
    'herowerk_leistungsanteil',
    'deckung',
    'abweichungsart',
  ];
  const csvA = `${[headerA, ...rowsA].map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
  fs.writeFileSync(path.join(reportDir, 'A_geraeteauswahl.csv'), csvA);
  if (process.env.HERO_VAULT_REPORT_DIR) {
    fs.mkdirSync(process.env.HERO_VAULT_REPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(process.env.HERO_VAULT_REPORT_DIR, 'A_geraeteauswahl.csv'), csvA);
  }
}
console.log(
  JSON.stringify(
    {
      output: path.join(reportDir, 'herowerk_roh.json'),
      aZeilen: output.a.length,
      bSzenarien: output.b.length,
      cSzenarien: output.c.length,
      bHeizlasten: output.b.map((entry) => [entry.nummer, entry.ergebnis.bedarf]),
      cHeizlasten: output.c.map((entry) => [entry.nummer, entry.ergebnis.bedarf]),
    },
    null,
    2
  )
);
