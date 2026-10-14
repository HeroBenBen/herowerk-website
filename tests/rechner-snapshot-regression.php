<?php

declare(strict_types=1);

// Vergleich gegen unveränderten Basiscode in eigenem Prozess; keine fetch/load-Aufrufe.
$module = $argv[1];
$fixture = $argv[2];
require $module . '/rechner-values.php';
require $module . '/rechner-engine.php';
$snapshot = rechner_validate_snapshot(file_get_contents($fixture));
$answers = [];
foreach (['health', 'preise', 'klima', 'foerderung', 'dimensionierung', 'kv_bootstrap', 'kostenvergleich', 'fv_plaetze'] as $action) {
    $answers[$action] = hw_rechner_route($action, ['plz' => '30159', 'flaeche' => '150', 'geb' => 'efh',
        'bj' => 'vor1978', 'san' => 'nein', 'verbrauch' => '20000', 'heizung' => 'gas'], $snapshot['sheets']);
}
echo json_encode(['snapshot' => $snapshot, 'antworten' => $answers], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
