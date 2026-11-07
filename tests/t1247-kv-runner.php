<?php
/** Derselbe Runner funktioniert auf 6fdf74e: fehlende Funktionen führen zum alten Verhalten. */
declare(strict_types=1);
require_once __DIR__ . '/../api/rechner-engine.php';
if (is_file(__DIR__ . '/../api/rechner-kv-adapter.php')) require_once __DIR__ . '/../api/rechner-kv-adapter.php';
$jobs = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$out = [];
foreach ($jobs as $job) {
    try {
        if (($job['mode'] ?? '') === 'markt') {
            $value = function_exists('hw_kv_marktwerte') ? hw_kv_marktwerte($job['liste'] ?? null) : [];
        } else {
            $route = ($job['legacy'] ?? false) || !function_exists('hw_kv_adapter_route') ? 'hw_rechner_route' : 'hw_kv_adapter_route';
            $value = $route($job['action'] ?? 'kostenvergleich', $job['query'] ?? [], $job['sheets'] ?? [], 2);
        }
        $out[] = ['value' => $value];
    } catch (Throwable $e) {
        $out[] = ['value' => ['error' => true, 'message' => $e->getMessage()]];
    }
}
echo json_encode($out, JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION);
