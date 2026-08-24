<?php
/**
 * HeroWerk-Rechner: Herkunft, Ratenbegrenzung, PHP-Rechenkern und Google-Rückfall.
 */

declare(strict_types=1);

if (!ob_start()) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"error":true,"message":"calculator_temporarily_unavailable"}';
    exit;
}
ini_set('display_errors', '0');
register_shutdown_function(static function (): void {
    rechner_shutdown();
});

date_default_timezone_set('Europe/Berlin');

// Einzige Umschaltung zwischen PHP und dem bisherigen Google-Durchreichepfad.
//
// WARNUNG, GF-Entscheid vom 21.08.2026 (Vorgang T583): dieser Handschalter ist der Notnagel fuer
// einen Ausfall des PHP-Kerns und sonst NICHTS. Wer ihn auf false legt, rechnet ab diesem Moment
// mit dem Google-Rechenwerk, und das ist eine ganze Generation aelter: bei einer bestehenden
// Waermepumpe liefert es 3,3 statt 7,8 kW. Der automatische Rueckfall beim Kaltstart ist am
// 21.08.2026 aus genau diesem Grund stillgelegt worden. Vor dem Umlegen bitte den Entscheid lesen:
// _Entscheidungen/2026-08-21_Google-Rueckfall-des-Website-Rechners-stilllegen_HERO.md
const RECHNER_PHP_ENGINE_ENABLED = true;

// SCHARF seit 24.08.2026 (GF-Entscheid, Vorgang T652). HTTP 429 ab Aufruf 61 je Minute.
// Davor stand hier false mit dem Vermerk "die ersten zwei Wochen nur protokollieren"; die
// Beobachtungsfrist lief ab dem Umzug auf PHP am 03.08.2026 und endete am 17.08.2026. In
// diesen drei Wochen hat KEIN Besucher die Grenze erreicht: 241 gezaehlte Adressen unter
// /rechner-runtime/rate-limit, jede Zaehlerdatei einstellig. Ein echter Kunde loest selbst
// bei zuegigem Reglerschieben hoechstens wenige Aufrufe je Minute aus, weil die Seite ihre
// Anfragen um 350 ms verzoegert. Wer 60 Aufrufe je Minute braucht, vermisst uns.
const RECHNER_RATE_LIMIT_ENFORCED = true;

const RECHNER_RATE_LIMIT_PER_MINUTE = 60;
const RECHNER_GOOGLE_FORWARD_TIMEOUT_SECONDS = 15;

require_once __DIR__ . '/rechner-values.php';
require_once __DIR__ . '/rechner-engine.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function rechner_ausgabepuffer_leeren(): void
{
    while (ob_get_level() > 0) {
        if (!ob_end_flush()) {
            break;
        }
    }
    flush();
}

function rechner_schwerwiegender_abbruch(): bool
{
    $error = error_get_last();
    if (!is_array($error)) {
        return false;
    }

    return in_array((int) ($error['type'] ?? 0), [
        E_ERROR,
        E_PARSE,
        E_CORE_ERROR,
        E_COMPILE_ERROR,
        E_USER_ERROR,
        E_RECOVERABLE_ERROR,
    ], true);
}

function rechner_leere_fehlerantwort_absichern(): void
{
    if (!rechner_schwerwiegender_abbruch() || ob_get_length() !== 0) {
        return;
    }

    http_response_code(500);
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store');
    }
    echo '{"error":true,"message":"calculator_temporarily_unavailable"}';
}

function rechner_antwort_abschliessen(): string
{
    if (function_exists('fastcgi_finish_request')) {
        rechner_ausgabepuffer_leeren();
        fastcgi_finish_request();
        return 'fastcgi';
    }

    $bodyLength = ob_get_length();
    if ($bodyLength !== false && !headers_sent()) {
        header('Content-Length: ' . $bodyLength);
    }
    rechner_ausgabepuffer_leeren();
    return 'puffer';
}

function rechner_shutdown(): void
{
    rechner_leere_fehlerantwort_absichern();
    if (!function_exists('rechner_auffrischung_faellig') || !rechner_auffrischung_faellig()) {
        rechner_ausgabepuffer_leeren();
        return;
    }

    ignore_user_abort(true);
    // Drei Sekunden Reserve halten Sperrverwaltung und atomisches Schreiben
    // innerhalb einer festen Grenze, obwohl der Google-Abruf selbst zwölf Sekunden hat.
    if (function_exists('set_time_limit') && !@set_time_limit(15)) {
        error_log('HeroWerk Rechner: nachlauf_zeitgrenze_konnte_nicht_gesetzt_werden');
    }

    $abschlussweg = rechner_antwort_abschliessen();
    rechner_nachlauf_abschlussweg($abschlussweg);
    rechner_auffrischen_im_nachlauf();
}

function rechner_fail(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['error' => true, 'message' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function rechner_origin_header_allowed(string $value): bool
{
    $parts = parse_url(trim($value));
    if (!is_array($parts)
        || strtolower((string) ($parts['scheme'] ?? '')) !== 'https'
        || isset($parts['port'])
        || isset($parts['user'])
        || isset($parts['pass'])) {
        return false;
    }
    $host = strtolower((string) ($parts['host'] ?? ''));
    return $host === 'herowerk.de' || $host === 'www.herowerk.de';
}

function rechner_request_origin_allowed(array $server): bool
{
    $origin = trim((string) ($server['HTTP_ORIGIN'] ?? ''));
    if ($origin !== '' && rechner_origin_header_allowed($origin)) {
        return true;
    }
    $referer = trim((string) ($server['HTTP_REFERER'] ?? ''));
    if ($referer !== '' && rechner_origin_header_allowed($referer)) {
        return true;
    }
    return strtolower(trim((string) ($server['HTTP_SEC_FETCH_SITE'] ?? ''))) === 'same-origin';
}

/** @return array{count:int,limited:bool} */
function rechner_rate_limit(string $remoteAddress): array
{
    $directory = RECHNER_RUNTIME_DIR . '/rate-limit';
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('rate_limit_directory_unavailable');
    }
    $file = $directory . '/' . hash('sha256', $remoteAddress !== '' ? $remoteAddress : 'unknown') . '.json';
    $handle = fopen($file, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) {
            fclose($handle);
        }
        throw new RuntimeException('rate_limit_storage_unavailable');
    }
    $raw = stream_get_contents($handle);
    $state = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
    $bucket = intdiv(time(), 60);
    $count = is_array($state) && ($state['bucket'] ?? null) === $bucket
        ? (int) ($state['count'] ?? 0) + 1
        : 1;
    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode(['bucket' => $bucket, 'count' => $count], JSON_THROW_ON_ERROR));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    chmod($file, 0600);

    $limited = $count > RECHNER_RATE_LIMIT_PER_MINUTE;
    if ($limited) {
        error_log(sprintf(
            'HeroWerk Rechner: rate_limit_exceeded remote_hash=%s count=%d mode=%s',
            substr(hash('sha256', $remoteAddress), 0, 16),
            $count,
            RECHNER_RATE_LIMIT_ENFORCED ? 'enforce' : 'log'
        ));
    }
    return ['count' => $count, 'limited' => $limited];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    header('Allow: GET');
    rechner_fail(405, 'method_not_allowed');
}

if (!rechner_request_origin_allowed($_SERVER)) {
    rechner_fail(403, 'origin_not_allowed');
}

try {
    $rate = rechner_rate_limit((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
} catch (Throwable $error) {
    error_log('HeroWerk Rechner: ' . $error->getMessage());
    rechner_fail(500, 'rate_limit_unavailable');
}
if ($rate['limited'] && RECHNER_RATE_LIMIT_ENFORCED) {
    rechner_fail(429, 'rate_limit_exceeded');
}

/**
 * INNENFELDER DER AUSLEGUNG: VORHANDEN, ABER NICHT AUSGELIEFERT.
 *
 * GF-Entscheid vom 24.08.2026, Vorgang T652. Volltext und Begruendung:
 * _Entscheidungen/2026-08-24_Auslegungs-Innenfelder-nicht-ausliefern-und-Rechner-Bremse-scharf_HERO.md
 * Faehigkeitskarte mit jedem Feld, seiner Bedeutung und dem Weg zurueck:
 * _Learnings/web/reference_rechner_schnittstelle_faehigkeiten_und_bewusste_sperren_2026-08-24.md
 *
 * WICHTIG FUER JEDEN SPAETEREN AGENTEN: Diese Werte EXISTIEREN und werden vom Rechenkern
 * weiterhin vollstaendig berechnet. Sie werden ausschliesslich HIER, an der letzten Stelle
 * vor der Ausgabe, aus der Antwort genommen. Wer einen davon anzeigen will, loescht nichts
 * und baut nichts nach, sondern nimmt ihn unten aus der Liste heraus. Eine Auslieferung ist
 * damit jederzeit wieder moeglich.
 *
 * WARUM SIE GESPERRT SIND: Am 24.08.2026 ist gemessen worden, dass zehn Abfragen an diese
 * Schnittstelle genuegen, um die vollstaendige Auslegungstreppe zu kartieren, also Heizlast
 * je Quadratmeter, jeden Geraetewechsel und die Kaskadenschwelle. Diese Felder sind der
 * wertvollste Teil davon, weil sie die Auslegungsentscheidung selbst offenlegen statt nur
 * ihr Ergebnis. Die Website zeigt KEINEN von ihnen an; zum Stichtag hatte jedes der sieben
 * Felder null Treffer in js/site.js und in allen HTML-Seiten, und auch das interne
 * Vertriebswerkzeug unter intern/assets/leadstrecke.js im Portal nutzt keines davon. Sie
 * gingen also nur deshalb hinaus, weil sie in der Antwort standen.
 *
 * NICHT gesperrt sind die Felder, welche die Seite anzeigt: bedarf, stromverbrauch_kwh,
 * modell, baureihe, anzahl, leistung_kw, brutto, eigenanteil, empfohlen, puffer, kaskade.
 */
const RECHNER_INNENFELDER_SPERREN = true;

/**
 * Die gesperrten Felder, je Feld die Bedeutung und was seine Freigabe dem Kunden brachte.
 * Diese Liste ist zugleich das Verzeichnis unserer Faehigkeiten an dieser Stelle.
 */
const RECHNER_INNENFELDER = [
    // Aussentemperatur, ab der das Geraet taktet, also unter Teillast schaltet.
    // Freigabe wuerde erlauben, dem Kunden die Taktgrenze seines Geraets zu zeigen.
    'taktpunkt_c',
    // Dieselbe Groesse als gepruefte Grenze der Auswahlregel.
    'taktpunkt_grenze_c',
    'taktpunkt_grenze_wirksam',
    // Aussentemperatur, ab der der Heizstab zuschaltet. Fachlich stark, verraet aber die
    // Auslegungsphilosophie vollstaendig.
    'bivalenzpunkt_c',
    // Deckungsgrad des Geraets am Normpunkt in Prozent. Das ist der KERN unserer
    // Auswahlregel, kleinste Maschine ueber der Mindestdeckung. Nie freigeben.
    'leistungsanteil_prozent',
    // Kennzeichnet, dass ein Geraet ueber dem hinterlegten Sollband liegt. Verraet, dass es
    // ein Sollband gibt und wo es steht.
    'ueberSollband',
    // Sagt, ob zu diesem Geraet ein echter Preis hinterlegt ist oder ein Platzhalter greift.
    // Verraet die Luecken unseres Preisstamms.
    'preis_hinterlegt',
    // Eigenanteil in der ProKlima-Variante. Eigene Foerderrechnung, gehoert nicht nach aussen.
    'eigenanteilProklima',
    'vorlaeufig',
];

/**
 * Nimmt die Innenfelder rekursiv aus der Antwort, ueber alle Marken und Varianten hinweg.
 * Beruehrt die Berechnung nicht, nur die Ausgabe.
 */
function rechner_innenfelder_entfernen($wert)
{
    if (!RECHNER_INNENFELDER_SPERREN) {
        return $wert;
    }

    if (is_array($wert)) {
        $gefiltert = [];
        foreach ($wert as $schluessel => $inhalt) {
            if (is_string($schluessel) && in_array($schluessel, RECHNER_INNENFELDER, true)) {
                continue;
            }
            $gefiltert[$schluessel] = rechner_innenfelder_entfernen($inhalt);
        }

        return $gefiltert;
    }

    return $wert;
}

$rawQuery = (string) ($_SERVER['QUERY_STRING'] ?? '');
if (!RECHNER_PHP_ENGINE_ENABLED) {
    try {
        echo rechner_forward_google($rawQuery)['body'];
        exit;
    } catch (RechnerValuesException $error) {
        rechner_fail(502, $error->publicCode);
    }
}

try {
    $snapshot = rechner_load_snapshot();
} catch (RechnerValuesException $error) {
    // GOOGLE-RUECKFALL STILLGELEGT, GF-Entscheid vom 21.08.2026 (Vorgang T583):
    // _Entscheidungen/2026-08-21_Google-Rueckfall-des-Website-Rechners-stilllegen_HERO.md
    //
    // Bis hierher hat der Kaltstart-Sonderfall ohne Wertevorrat einmal auf das Google-Programm
    // umgeleitet. Dessen Rechenwerk ist eine GANZE GENERATION aelter als dieser Kern; mit
    // denselben Eingaben gemessen am 20.08.2026: bei einer bestehenden Waermepumpe liefert es
    // 3,3 statt 7,8 kW, legt das Haus also um mehr als die Haelfte zu klein aus. Eine falsche
    // Zahl geht als Zahl zum Kunden und faellt niemandem auf; eine Fehlermeldung kostet einen
    // Lead in einem seltenen Moment und rechnet nichts falsch.
    //
    // Der Aufruf endet deshalb hier mit der regulaeren Fehlerantwort.
    if ($error->publicCode !== 'snapshot_cold_start_failed') {
        rechner_fail(500, $error->publicCode);
    }

    rechner_fail(503, 'calculator_temporarily_unavailable');
}

$action = strtolower((string) ($_GET['action'] ?? 'health'));
try {
    $result = hw_rechner_route($action, $_GET, $snapshot['sheets']);
    $result = rechner_innenfelder_entfernen($result);
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    error_log('HeroWerk Rechner: calculation_failed action=' . $action . ' message=' . $error->getMessage());
    rechner_fail(500, 'calculator_temporarily_unavailable');
}
