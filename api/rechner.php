<?php
/**
 * HeroWerk — Server-seitiger Proxy fuer den Rechner (Dimensionierung / Foerderung / Preise).
 * ============================================================================================
 *
 * Zweck:
 *   Der Browser ruft NUR noch /api/rechner auf unserer eigenen Domain auf. Dieser Proxy holt
 *   die Zahlen server-seitig vom Google-Apps-Script-Endpunkt und gibt sie unveraendert zurueck.
 *
 * Wirkung:
 *   - Der Apps-Script-Endpunkt ist nicht mehr im Browser-Quelltext sichtbar/direkt aufrufbar
 *     (er steht nur noch hier als server-seitige Konstante).
 *   - Die Besucher-IP geht an UNSEREN Server, nicht mehr an Google.
 *   - Same-Origin: der Aufruf bleibt auf herowerk.de, daher KEIN CORS noetig.
 *
 * Live-aus-Sheet bleibt erhalten:
 *   Es wird NICHT gecached. Jeder eingehende Request loest pro Aufruf einen frischen
 *   server-seitigen Aufruf des Apps-Scripts aus -> jede Sheet-Aenderung ist sofort wirksam,
 *   genau wie beim bisherigen Direkt-Aufruf aus dem Browser. (Optionaler Kurz-Cache ist unten
 *   nur AUSKOMMENTIERT vorbereitet und absichtlich NICHT aktiv.)
 *
 * Sicherer Weg / Funktion bleibt erhalten:
 *   Der komplette eingehende Query-String wird VERBATIM (1:1, unveraendert) weitergereicht.
 *   Dadurch funktionieren alle bestehenden Aufrufmuster aus js/site.js ohne Logik-Aenderung:
 *     - ?action=dimensionierung&flaeche=...&...&origin=https://herowerk.de
 *     - ?action=foerderung&we=...&...&origin=https://herowerk.de
 *     - ?action=preise&origin=https://herowerk.de
 *
 * Nur GET wird zugelassen (der Rechner nutzt ausschliesslich GET).
 */

declare(strict_types=1);

// --- Server-seitige Konstante: Apps-Script-Endpunkt (NICHT im Browser sichtbar) ---
// Exakt uebernommen aus js/site.js (Konstante RECHNER_API). Nicht erfinden/aendern.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsvoC0ZBtpZq8WY_hNS-BPN1gcTK5G1JAMfxSc5FpjWxQ2SbRLI9VqCnX8SRLO4meF/exec';

// Antwort ist immer JSON.
header('Content-Type: application/json; charset=utf-8');
// Same-Origin-Endpunkt: niemals von Dritt-Seiten einbettbar/cachebar machen.
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

/**
 * Saubere JSON-Fehlerausgabe (gleiches Schema wie das Apps-Script: { error, message }).
 */
function rechner_fail(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(['error' => true, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// --- Nur GET zulassen ---
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    header('Allow: GET');
    rechner_fail(405, 'method_not_allowed');
}

// --- Eingehenden Query-String VERBATIM weiterreichen ---
// $_SERVER['QUERY_STRING'] enthaelt den Roh-Query-String genau so, wie der Browser ihn
// gesendet hat (bereits URL-encodet). Wir haengen ihn unveraendert an den Apps-Script-URL an,
// damit jedes bestehende Aufrufmuster 1:1 erhalten bleibt und nichts bricht.
$query = $_SERVER['QUERY_STRING'] ?? '';
$target = APPS_SCRIPT_URL . ($query !== '' ? '?' . $query : '');

if (!function_exists('curl_init')) {
    rechner_fail(500, 'curl_unavailable');
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $target,
    CURLOPT_HTTPGET        => true,
    CURLOPT_RETURNTRANSFER => true,
    // Apps-Script /exec antwortet mit 302 auf script.googleusercontent.com -> Redirects folgen.
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS      => 5,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT        => 25,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_USERAGENT      => 'HeroWerk-Rechner-Proxy/1.0',
    // Wir wollen nur den Body; der Content-Type setzen wir selbst (immer JSON).
    CURLOPT_HEADER         => false,
]);

$body     = curl_exec($ch);
$errno    = curl_errno($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// --- Transport-Fehler (DNS, TLS, Timeout) ---
if ($errno !== 0 || $body === false) {
    rechner_fail(502, 'upstream_unreachable');
}

// --- Upstream-HTTP-Fehler ---
if ($httpCode < 200 || $httpCode >= 400) {
    // Status durchreichen, Body (sofern vorhanden) ebenfalls — er ist i.d.R. schon JSON.
    http_response_code($httpCode >= 400 ? $httpCode : 502);
    echo ($body !== '' ? $body : json_encode(['error' => true, 'message' => 'upstream_error'], JSON_UNESCAPED_UNICODE));
    exit;
}

// --- Erfolg: Body 1:1 zurueckgeben (ist bereits JSON vom Apps-Script) ---
echo $body;

/*
 * ----------------------------------------------------------------------------------------------
 * OPTIONALER KURZ-CACHE (bewusst DEAKTIVIERT lassen, damit Live-aus-Sheet erhalten bleibt).
 * Nur aktivieren, falls spaeter Last/Quota ein Problem wird. Cache-Dauer bewusst kurz halten,
 * sonst sind Sheet-Aenderungen erst verzoegert sichtbar.
 * ----------------------------------------------------------------------------------------------
 *
 * $cacheKey  = sha1($query);
 * $cacheFile = sys_get_temp_dir() . '/hw_rechner_' . $cacheKey . '.json';
 * $cacheTtl  = 60; // Sekunden — kurz halten!
 * if (is_file($cacheFile) && (time() - filemtime($cacheFile) < $cacheTtl)) {
 *     echo file_get_contents($cacheFile);
 *     exit;
 * }
 * // ... nach erfolgreichem curl_exec:
 * // file_put_contents($cacheFile, $body, LOCK_EX);
 */
