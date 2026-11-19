# T1298 Bau- und Prüfbericht

Stand: 19. November 2026. Zweig `codex/t1298-aufstellabstaende`. Basiscommit `2cfa58955d7df40e75b30061e6939d41b54700f2`, unverändert auch `origin/main`.

Der Bau ist umgesetzt. Eine vollständige Abnahme und die Einbuchung sind offen. Die Sandbox verbietet das Schreiben des Git-Index, das Öffnen des lokalen Serverports und den Start von Chromium. Deshalb gibt es keinen neuen Commit. Push, Pull Request, Merge, Auslieferung und Auslieferungsbündel wurden nicht ausgeführt. Eine Pull-Request-Adresse existiert nicht.

Maßgeblich ist [freigabe_plan.md](freigabe_plan.md) zum [Plan](plan.md). Die gestrichene Bausteinregistrierung wurde nicht umgesetzt. `scripts/seiten-bausteine.json` und `scripts/build-bausteine.mjs` bleiben bytegleich zum Basisstand. Die Sollzahl der Bausteine bleibt 12.

## Geänderte Dateien

| Datei                                   | Ergebnis                                                                                                                                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `waermepumpe-abstand.html`              | Neue Seite unter `/waermepumpe-abstand`, freigegebenes Inhaltsfragment mit Inline-CSS und Inline-Skript, Icon-Ersetzung, Website-Hülle aus `waermepumpe-laerm.html`.                                                                                                   |
| `ratgeber.html`                         | Genau eine zusätzliche Karte im Cluster Technik & Planung. Titel und Beschreibung wörtlich aus dem freigegebenen Hauptinhalt. Bestehendes Wärmepumpen-Icon verwendet.                                                                                                  |
| `sitemap.xml`                           | Genau ein zusätzlicher Eintrag mit Datum `2026-11-19` und Priorität `0.6`.                                                                                                                                                                                             |
| `scripts/structured-data.config.json`   | Artikel mit `datePublished: 2026-11-19`.                                                                                                                                                                                                                               |
| `scripts/structured-data.state.json`    | Generatorzustand ausschließlich um den neuen Artikel ergänzt.                                                                                                                                                                                                          |
| `scripts/build-structured-data.mjs`     | Artikel-Sollwert von 12 auf 13 erhöht. Alle anderen Sollwerte unverändert.                                                                                                                                                                                             |
| `scripts/fidelity-pages.json`           | Neue Seite tatsächlich in der Prüfliste.                                                                                                                                                                                                                               |
| `baseline/v4-sections.json`             | Ausschließlich die neue Seite mit 2.930 Wörtern im erfassten Abschnitt ergänzt. Bestandswerte und Schwelle 30 Prozent unverändert.                                                                                                                                     |
| `tests/a11y.spec.js`                    | Neue Route in axe für Hell und Dunkel.                                                                                                                                                                                                                                 |
| `tests/smoke.spec.js`                   | Ladeprüfung und Navigation über die neue Ratgeberkarte.                                                                                                                                                                                                                |
| `lighthouserc.json`                     | Neue Route in beiden Modi ergänzt. Bisherige Ziele, Laufzahl und Schwellen unverändert.                                                                                                                                                                                |
| `scripts/verify-mobile.mjs`             | Neue Seite in `KERNSEITEN`.                                                                                                                                                                                                                                            |
| `tests/t1298-aufstellabstaende.spec.js` | 9 entdeckte Browsertests: 6 Kombinationen aus Breite und Modus, 2 Kartenansichten, 1 Originalvergleich. Einschließlich vier Klickfällen, Schalltabelle, Tastatur, axe in dynamischen Zuständen, Theme, mobiler Navigation, Zoom, Überstand, Fehlern und Fremddiensten. |
| `docs/t1298/bericht.md`                 | Dieser Bericht.                                                                                                                                                                                                                                                        |
| `docs/t1298/nachweise/`                 | Prüfwerte, Protokollauszüge und wiederholbarer Quellvergleich.                                                                                                                                                                                                         |

Die Vorlagen `waermepumpe-laerm.html` und `propan-waermepumpe.html` sind unverändert. Navigation, vollständiger Consent-Block einschließlich Domain-Wächter sowie der Fuß der neuen Seite stimmen bytegenau mit der Vorlage überein. Globale CSS- und JS-Dateien, HubSpot und `.htaccess` wurden nicht geändert. Die vorhandenen Plan- und Laufprotokolldateien wurden nicht bearbeitet.

## Inhalt und technische Abweichungen

Der [Quellnachweis](nachweise/quellvergleich.json) ergibt **gleich**. Nach genau einer erlaubten Ersetzung von `%%WP_ICON%%` ist das Hauptfragment sowohl mit der verbindlichen Freigabequelle als auch mit dem fertig gebauten Originalentwurf identisch. Nur der äußere Leerraum unmittelbar zwischen `<main>` und Fragment wurde beim Vergleich entfernt. Innerhalb des Fragments wurde nichts normalisiert.

| Gegenstand          | Nachweis                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Hauptfragment       | 106.762 Bytes, SHA-256 `4206b315f785e6d4d3e6a583fae33535aede6638c55b92f21c8147b5d908765d`              |
| Inline-CSS          | Unverändert, SHA-256 `e2304d586be17ec1d479fc7369484dc4560601428be1cece193ad414ec059b94`                |
| Inline-Skript       | Unverändert, SHA-256 `80e76bb145631c3aba1894b78f2edfb2527138f9751d2c0c84c4dcafe19a1aff`, Syntax gültig |
| Sichtbares Datum    | Weiterhin 18. November 2026 aus der Freigabequelle                                                     |
| Interne Hauptziele  | `/anfrage`, `/dimensionierung`, `/foerderung`, `/kostenvergleich-waermepumpe` vorhanden                |
| Anker               | 37 Ziele geprüft, 41 eindeutige IDs, keine fehlenden lokalen Ziele                                     |
| Metadaten           | Exakter Titel und Beschreibung, Canonical, Open Graph, Twitter sowie erzeugter Article geprüft         |
| Strukturierte Daten | Genau ein Article auf der neuen Seite, keine erfundene BreadcrumbList                                  |

Der geforderte Vergleich des **gerenderten sichtbaren Textes im Browser** ist **nicht gelaufen, Sandbox**. Es gibt dafür keine normalisierten Browsertexte und keine Screenshots. Der exakte Quellvergleich ist ein zusätzlicher Nachweis für die unveränderte Übernahme und ersetzt keine Browserabnahme. Auch der Vergleich der vier dynamischen Ergebnisse zwischen Original und neuer Seite ist nicht gelaufen.

Es gibt keine Text-, Zahlen-, CSS- oder Logikabweichung im freigegebenen Inhalt. Eine zusätzliche technische Anpassung außerhalb der ursprünglich genannten Dateiliste war erforderlich: `scripts/build-structured-data.mjs`, Konstante `SOLL`, ursprünglich `Article: 12`, jetzt `Article: 13`. Der erste Generatorlauf mit der neuen Seite brach ausdrücklich mit `Article: 13, erwartet 12` ab und verlangte die Anpassung. BreadcrumbList bleibt 12, FAQPage 11 und JobPosting 19. Dieser Generator ist unabhängig vom unverändert gebliebenen Bausteingenerator.

## Prüfergebnisse

Befehle, Exit-Codes und Basisbezug stehen maschinenlesbar in [prueflauf.json](nachweise/prueflauf.json). [pruefprotokoll.txt](nachweise/pruefprotokoll.txt) enthält die Ausgaben, bei den großen Browserprotokollen gekennzeichnete Auszüge. Vollständige Rohprotokolle liegen unter `/tmp/t1298-pruefung/logs/`.

| Befehl                                                                                                                                                                       | Exit | Ergebnis auf dem Bauzustand                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                                                                                                                               |    1 | ESLint erfolgreich. Prettier beanstandet ausschließlich die unveränderten, bereits vorher ungetrackten Dateien `docs/t1298/plan.md` und `docs/t1298/letzte_nachricht_plan.md`.                                                                        |
| `npm run verify:website-gates`                                                                                                                                               |    0 | 6 Selbsttests erfolgreich, Rechenlogikprüfung ohne Befund. Einschränkung der Erkennung neuer Seiten siehe unten.                                                                                                                                      |
| `npm run verify:assets`                                                                                                                                                      |    0 | Grün.                                                                                                                                                                                                                                                 |
| `npm run verify:js-versionsanhang`                                                                                                                                           |    0 | Grün.                                                                                                                                                                                                                                                 |
| `npm run verify:consent`                                                                                                                                                     |    0 | Statische Integration grün. Kein Nachweis eines tatsächlich geladenen externen Dialogs.                                                                                                                                                               |
| `npm run verify:seo`                                                                                                                                                         |    1 | Neue Datei wegen gesperrtem Git-Index noch nicht erfasst, deshalb zählt der normale Lauf erst 12 Artikel statt 13.                                                                                                                                    |
| `GIT_INDEX_FILE=/tmp/t1298-pruefung/generator.index npm run verify:seo`                                                                                                      |    0 | Mit temporärem Prüfindex einschließlich der neuen Seite grün: 20 Seiten mit Auto-Block, 56 Knoten, 0 Abweichungen.                                                                                                                                    |
| `npm run verify:bausteine`                                                                                                                                                   |    0 | Grün mit unverändert 12 registrierten Seiten.                                                                                                                                                                                                         |
| `node scripts/content-fidelity-check.js`                                                                                                                                     |    0 | 10 Seiten geprüft. Eine zusätzliche Ratgeberkarte wird regelkonform gemeldet.                                                                                                                                                                         |
| `MOBILE_BASE_URL=http://127.0.0.1:8080 npm run verify:mobile`                                                                                                                |    1 | **nicht gelaufen, Sandbox**. Chromium scheitert vor der ersten Messung.                                                                                                                                                                               |
| `PREVIEW_URL=http://127.0.0.1:8080 npm run test:a11y`                                                                                                                        |    1 | **nicht gelaufen, Sandbox**. 39 Testfehler beim Browserstart, keine axe-Abnahme.                                                                                                                                                                      |
| `PREVIEW_URL=http://127.0.0.1:8080 npm run test:smoke`                                                                                                                       |    1 | **nicht gelaufen, Sandbox** für die Browserabnahme. Ausgabe: 88 fehlgeschlagen, 23 nicht ausgeführt, 1 bestanden. Der einzelne Erfolg ist kein Nachweis für diese Seite.                                                                              |
| `T1298_ORIGINAL_URL=http://127.0.0.1:8080/__t1298-original PREVIEW_URL=http://127.0.0.1:8080 npx --no-install playwright test tests/t1298-aufstellabstaende.spec.js`         |    1 | **nicht gelaufen, Sandbox**. Alle 9 Tests scheitern beim Browserstart.                                                                                                                                                                                |
| `node scripts/seo-basics-check.js http://127.0.0.1:8080/waermepumpe-abstand`                                                                                                 |    1 | **nicht gelaufen, Sandbox**. Verbindung zum lokalen Server gesperrt. Dieses Skript liest grundsätzlich die Startseite des Origins und prüft auch bei einer Artikel-URL keinen Artikel. Die Artikelmetadaten wurden deshalb zusätzlich direkt geprüft. |
| `node scripts/rich-results-check.js http://127.0.0.1:8080/waermepumpe-abstand`                                                                                               |    1 | **nicht gelaufen, Sandbox**. Verbindung gesperrt. Article zusätzlich direkt aus der erzeugten Datei geprüft.                                                                                                                                          |
| `node scripts/header-check.js http://127.0.0.1:8080/waermepumpe-abstand`                                                                                                     |    1 | **nicht gelaufen, Sandbox**. Verbindung gesperrt. Ein statischer Node-Server würde außerdem keine Apache-Kopfzeilen beweisen.                                                                                                                         |
| `npm_config_offline=true npm exec --no -- lhci autorun --config=lighthouserc.json`                                                                                           |    1 | **nicht gelaufen, Sandbox**. Lighthouse CLI fehlt im installierten Bestand und im Offline-Cache. Keine Installation erfolgt.                                                                                                                          |
| `npx --no-install playwright test tests/t1298-aufstellabstaende.spec.js --list`                                                                                              |    0 | Alle 9 neuen Tests werden entdeckt. Keine Browserausführung.                                                                                                                                                                                          |
| `npx --no-install eslint tests/a11y.spec.js tests/smoke.spec.js tests/t1298-aufstellabstaende.spec.js`                                                                       |    0 | Geänderte Tests grün.                                                                                                                                                                                                                                 |
| `npx --no-install prettier --check tests/a11y.spec.js tests/smoke.spec.js tests/t1298-aufstellabstaende.spec.js scripts/build-structured-data.mjs scripts/verify-mobile.mjs` |    0 | Geänderte Programme formatiert.                                                                                                                                                                                                                       |
| `node docs/t1298/nachweise/quellvergleich.mjs`                                                                                                                               |    0 | Exakter Quellvergleich einschließlich Icon, CSS, Skript, Vorlagenhülle, Baseline und Testlisten grün. Benötigt die dokumentierten lokalen Quellen und die Basisdateien unter `/tmp/t1298-pruefung/basis`.                                             |
| `git diff --check`                                                                                                                                                           |    0 | Keine Leerraumfehler in den getrackten Unterschieden.                                                                                                                                                                                                 |

Der zusätzliche Aufruf der Funktion `gate_testlisten` ohne Git-Basis bestätigt die neue Seite unabhängig vom fehlenden Commit in allen vier Listen. Darüber hinaus sind die Einträge echte Prüfungen: axe-Schleife, Smoke-Navigation, Fidelity-Liste mit neuem Baseline-Eintrag und zwei Lighthouse-URLs. Der reguläre Gate-Lauf allein wäre vor dem Commit kein ausreichender Nachweis, weil er neue Seiten über eingecheckte Unterschiede zu `origin/main` erkennt. Der ausdrücklich verlangte erneute Lauf **nach dem Commit** ist nicht gelaufen, Sandbox, Befehl `npm run verify:website-gates`.

### Basisstand und Lint-Befund

Vor Änderungen am Bau wurden Assets, JS-Versionen, Consent, SEO, Bausteine, Website-Gates und Fidelity auf dem unveränderten getrackten Stand `2cfa589` ausgeführt, jeweils Exit 0. Bereits zu diesem Zeitpunkt meldete `npm run lint` die beiden oben genannten ungetrackten Planunterlagen und Exit 1.

Für eine saubere Trennung wurde `git archive HEAD` nach `/tmp/t1298-pruefung/basis` entpackt und das vorhandene `node_modules` nur verlinkt. `npm run lint` auf diesem reinen Basisstand ist grün, Exit 0. Der Lint-Befund ist daher **kein Fehler auf main**, sondern ein vor dem Bau vorhandener Befund der lokalen Planunterlagen. Diese Unterlagen wurden nicht umformatiert. Es wird kein roter Test als bestätigter Fehler auf main ausgegeben.

### Grenzen der Sandbox

Der temporäre lokale Node-Server unter `/tmp/t1298-pruefung/server.mjs` bildet die Artikelseite ohne Endung auf die HTML-Datei ab und stellt den Originalentwurf unter `/__t1298-original` bereit. Er ist keine Repository-Datei und kein Auslieferungsbündel. Der Start `node /tmp/t1298-pruefung/server.mjs` scheitert mit Exit 1:

```text
Error: listen EPERM: operation not permitted 127.0.0.1:8080
```

Chromium scheitert vor dem Laden einer Seite:

```text
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100)
```

Der Docker-Apache-Aufruf wurde gemäß Freigabe ersetzt und nicht gestartet. Status **nicht gelaufen, Sandbox**. Genauer nicht ausgeführter Befehl:

```sh
PRUEFSERVER_NAME=t1298-aufstellabstaende PRUEFSERVER_BUNDLE=/tmp/t1298-pruefung/apache scripts/start-pruefserver.sh 8080
```

Ein zunächst zur Werkzeugprüfung aufgerufener Befehl `npx --no-install lhci --version` scheiterte mit `ENOTFOUND registry.npmjs.org`. Danach wurde der eigentliche Lighthouse-Lauf ausdrücklich offline versucht und meldete `ENOTCACHED`. Es wurden keine Abhängigkeiten installiert und keine Quellen im Internet neu bewertet.

Der SEO-Generator liest ausschließlich `git ls-files`. Weil das reguläre Staging gesperrt ist, wurde für seine Ausführung ein separater temporärer Prüfindex mit dem Basisstand und ausschließlich `waermepumpe-abstand.html` verwendet. Die dabei erzeugten Objekte liegen unter `/tmp/t1298-pruefung/git-objects`, der eigentliche Repository-Index blieb unverändert. Der erfolgreiche Generatorlauf entspricht `GIT_INDEX_FILE=/tmp/t1298-pruefung/generator.index npm run build:seo`. Der normale SEO-Lauf muss nach regulärem Staging wiederholt werden.

## Vier geforderte Klickfälle

**Alle vier Browserfälle sind nicht gelaufen, Sandbox.** Die folgenden Texte sind die unverändert übernommenen Solltexte aus der Freigabequelle und die Erwartungen der neuen Tests. Sie sind keine gemessenen Klickergebnisse.

| Fall | Eingaben                                                                                               | Solltext aus der Freigabequelle                                                                | Gemessen       |
| ---- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------- |
| 1    | aroTHERM perform, am Boden, Hausecke, ab Werk, Sockelabdeckung ja, Tabelle bestätigt, alles weiter weg | „Passt voraussichtlich“                                                                        | Nicht gelaufen |
| 2    | aroTHERM pro, am Boden, vor Wand, ab Werk, ohne Abdeckung, ohne Bestätigung                            | Kein Urteil. „Schutzbereich steht. Prüfe die Tabelle zu deinem Wunschplatz und bestätige sie.“ | Nicht gelaufen |
| 3    | WOLF, Sockel, für den vollständigen Test zusätzlich vor Wand gewählt                                   | „Prüfen wir vor Ort“                                                                           | Nicht gelaufen |
| 4    | Freistehend bis 2 m, 1 bis unter 3 m, kein anderer Platz, nichts an der Grenze, Ausblas weg            | „Voraussichtlich zulässig mit verringertem Abstand“                                            | Nicht gelaufen |

Die Ansichten bei 390, 768 und 1440 Pixeln jeweils in Hell und Dunkel, die Ratgeberkarte, die dynamischen SVG-Grafiken, Seitenüberstand, Tastaturbedienung, mobile Navigation, Skizzenzoom, Schalltabelle und das tatsächliche Ausbleiben von Marketinganfragen bleiben ohne Browsernachweis. Für den externen Consent-Dialog ist zusätzlich eine geeignete Umgebung nötig; die Domain-Sperre ist unverändert erhalten.

## Einbuchung und offene Arbeit

`git add -- waermepumpe-abstand.html` scheiterte mit Exit 128:

```text
fatal: Unable to create '/Users/benjaminbendler/code/_t1298_website/.git/index.lock': Operation not permitted
```

Auch der abschließende Staging-Versuch mit allen 18 ausdrücklichen Pfaden einschließlich Bericht und Nachweisen scheiterte mit demselben Fehler. Der nachgeschaltete Commit-Befehl wurde daher nicht ausgeführt. Die genaue Pfadliste steht in `nachweise/prueflauf.json`, Feld `abschluss.staging`. Der tatsächliche Git-Index ist leer und HEAD bleibt auf `2cfa589`.

Es ist kein Commit angelegt. Die vorgesehene Botschaft lautet `T1298 Ratgeberseite Aufstellabstände Wärmepumpe`. Auch der Bericht konnte nicht eingebucht werden. Die vorhandenen Laufprotokolle, die Planfreigabe und sonstigen ungetrackten Planunterlagen gehören nicht zur vorgesehenen Staging-Liste dieses Baus.

Offen bleiben der reguläre SEO-Lauf nach Staging, die vollständigen Browser- und Lighthouse-Prüfungen einschließlich des sichtbaren Textvergleichs, der Gesamtlint-Befund der Planunterlagen sowie die Einbuchung mit anschließendem Website-Gate. Nicht gelaufen ist nicht grün. Es erfolgt keine Freigabe zur Auslieferung.

## Nachtrag Controller, 19. November 2026

Die in der Sandbox gesperrten Prüfungen liefen danach außerhalb der Sandbox gegen den Apache-Prüfserver der Ablage (Bündel aus `scripts/make-ionos-bundle.sh`, Container `t1298-aufstellabstaende`, Port 8937). Der Originalentwurf kam für den Vergleich von einem lokalen Node-Server.

| Prüfung                                                              | Ergebnis                                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `tests/t1298-aufstellabstaende.spec.js`, alle 9 Tests                | grün, einschließlich vier Klickfällen, 6 Kombinationen und Originalvergleich |
| `tests/a11y.spec.js` für `waermepumpe-abstand`, hell und dunkel      | grün                                                                         |
| `tests/smoke.spec.js`, neue Route und Ratgeberkarte                  | grün                                                                         |
| `npm run verify:mobile`                                              | neue Seite ohne Befund; 8 Befunde nur auf `/preise.html` (Bestand)           |
| `npm run verify:seo`, `npm run verify:website-gates` nach Einbuchung | grün                                                                         |
| `npm run lint`                                                       | grün                                                                         |

Zwei Korrekturen waren nötig:

1. Test: Der Theme-Umschalter ist ein Zwei-Feld-Schalter; ein Tipp auf das aktive Feld bleibt mit Absicht folgenlos (`js/theme.js`). Der Test wählt jetzt das inaktive Feld und öffnet bei schmalen Breiten zuerst das Klappmenü, wie `tests/website-additive.spec.js`.
2. Seite: axe meldete im hellen Modus zu wenig Kontrast für den Status „Prüfen wir vor Ort“ in der Seitenleiste (`#st1`, Orange `#c27c0e` auf hellgrüner Karte). Im hellen Modus hat der Status jetzt `#8a5a00`. Text, Zahlen und Logik bleiben unverändert; die Zeichnungsfarbe der Zone bleibt `#c27c0e`.
