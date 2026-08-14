<?php
// Vorschau-Router: bildet die .htaccess-Umschreibungen des Webservers nach.
$pfad = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$karte = ['/api/rechner' => '/api/rechner.php', '/api/jobs' => '/api/jobs.php'];
if (isset($karte[$pfad])) { $_SERVER['SCRIPT_NAME'] = $karte[$pfad]; require __DIR__ . $karte[$pfad]; return true; }
if ($pfad !== '/' && !preg_match('/\.[a-z0-9]+$/i', $pfad) && file_exists(__DIR__ . $pfad . '.html')) { return require __DIR__ . $pfad . '.html'; }
return false;
