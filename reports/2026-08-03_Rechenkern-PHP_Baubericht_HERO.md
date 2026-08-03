---
typ: reference
datum: 2026-08-03
status: abgeschlossen
quelle: agent
tags:
  - domain/web
  - domain/tech
  - severity/kritisch
tldr: 'PHP-Rechenkern, IONOS-Testpfad, 506er-Gleichlauf, Laufzeit-, Ausfall-, Schutz-, Raten- und Bildnachweise sind vollständig grün; der Testpfad ist auf die ursprüngliche Protokollfassung zurückgesetzt.'
---

# Rechenkern nach PHP, Baubericht

## Stand dieser Übergabe

Der Bau und alle rechnerischen, lokalen und IONOS-seitigen Funktionsnachweise sind grün. `api/rechner.php` wurde auf dem Produktivserver nicht ersetzt; Besucher nutzen weiterhin die bisherige Google-Durchreichestrecke. Der neue Kern lief ausschließlich unter `api/rechner-test.php`. Dieser Testpfad ist wieder auf den echten Google-Upstream, 300 Sekunden Vorhaltedauer und den Raten-Protokollmodus zurückgesetzt. Codex führte selbst keine Bereitstellung aus.

## Live-Stand gegen Repo-Spiegel

Quelle des Live-Abrufs: Apps-Script-Projekt `1n4qidc_cFjcuE2-KS2pzH9m-z9w8jADkkXsM6LDbDhJkq-e-62ZSNQap`, ausschließlich `clasp pull` mit Version 3.3.0.

1. `kv_engine.js` live gegen `apps-script/rechner-backend/kv_engine.gs`: bytegleich, `cmp` Rückgabewert 0.
2. `Code.js` live gegen `Code.gs`: Nach Entfernung genau der bekannten Dispatcherzeile `action === 'wizard'` ist der Live-Stand bis zum vollständigen Ende des Repo-Spiegels bytegleich, `cmp` Rückgabewert 0.
3. Der zusätzliche Live-Inhalt beginnt erst nach dem Ende des Repo-Spiegels und enthält den internen Konfigurator-Anbau.
4. Die sechs Leserouten und ihre im Repo enthaltenen Hilfsfunktionen sind damit zeichengleich zum produktiven Stand.

Ergebnis: Stoppkriterium 9 ist nicht eingetreten.

## Gemessene Verbraucherfelder

Geprüfte Produktionskonsumenten:

1. `js/site.js`
2. `kostenvergleich-waermepumpe.html`
3. `docs/intern/kostenvergleich-berater.html`
4. zusätzlicher repo-weiter Aufrufscan für `action=preise` und `action=kv_bootstrap`

### `preise`

Benötigt werden:

1. Oberste Ebene: `wolf`, `vaillant`
2. Je Preiszeile: `klasse`, `modell`, `kw`, `brutto`, `eigen`

Nicht gelesen werden `hausgroesse` und `proklima`. Diese beiden Felder dürfen in der späteren öffentlichen PHP-Antwort entfallen. Die neue interne Sammelroute liefert weiterhin die vollständigen Rohzeilen der Preistabellen.

### `kv_bootstrap`

Benötigt werden:

1. Oberste Ebene: `service`, `perioden`, `defaults`, `kredit`, `etaMatrix`, `schaetzung`, `aktivePeriode`
2. Je Periode: `key`, `label`
3. Defaults: `heizart`, `bedarf`, `eta`, `invWP`, `jaz`, `laufzeit`, `neuFossilTog`, `vglBrennstoff`, `gasInvest`, `oelInvest`, `gaspreis`, `gasStg`, `oelpreis`, `oelStg`, `strompreis`, `stromEntw`, `co2preis`, `co2Pfad`, `bioTog`, `bioAufpreis`, `fHalbjahr`, `fGrund`, `fEU`, `fKlima`, `fAlt20`, `fEinkSlider`, `fKind`, `finanzTog`, `kredLZ`, `kredZins`, `immoTog`, `hausW`, `immoP`, `dynTarifTog`, `dynAnteil`, `dynSpread`
4. Kredit: `zins358Eff`, `zins359Eff`, `zveGrenze`, `bereitstellungProv`, `stand`, `quelle`
5. `etaMatrix`: `regeln` mit `rohr`, `kbj`, `heizart`, `wert`, `label`, `text`; `fallback` mit `wert`, `label`, `text`; außerdem `textVorbelegt` und `quelle`
6. `schaetzung`: `einheitFaktor`

Nicht gelesen werden:

1. Oberstes Feld `hinweise`
2. Periodenfelder `klimaPct`, `grenze`, `euDifferenzierung`, `cap`
3. Defaults `fEffizienz` und `modus`
4. `etaMatrix.textEigen`
5. Alle `schaetzung`-Felder außer `einheitFaktor`

Diese Felder dürfen ausschließlich in der späteren öffentlichen PHP-Antwort entfallen. Die Sammelroute bleibt roh und vollständig.

## Gebaute Sammelroute

`action=werte_snapshot` liest ausschließlich:

1. `KV_Parameter`
2. `KV_FoerderPerioden`
3. `Förder_Parameter`
4. `Dimensionierung`
5. `Preise_Wolf`
6. `Preise_Vaillant`
7. `Geräte_Katalog`
8. `Klima_PLZ`
9. `Fördervorschuss`

Der Payload trägt `service: werte_snapshot`, `schemaVersion: 1` und die unveränderten Rohzeilen unter `sheets`. Der vollständige JSON-Stand wird in Blöcke von höchstens 30.000 Zeichen geteilt und über CacheService exakt 300 Sekunden vorgehalten.

Ohne Schlüssel, mit falschem Schlüssel oder solange der Platzhalter im Code steht, fällt die Anfrage unverändert auf die Antwort einer unbekannten Route zurück. Ein echter Schlüssel ist nicht im Repo enthalten.

## Chirurgischer Controller-Deploy

Der Controller verwendet den produktiven Live-Stand mit dem Konfigurator-Anbau und setzt ausschließlich drei additive Blöcke aus `apps-script/rechner-backend/Code.gs` ein:

1. Direkt nach `const ALLOWED_ORIGIN_RE = /(^|\.)herowerk\.de$/i;`: Kommentar, `WERTE_SNAPSHOT_KEY` und `WERTE_SNAPSHOT_SHEETS`. Nur hier wird der Platzhalter durch den echten Schlüssel ersetzt.
2. Direkt nach `if (action === 'fv_plaetze') return json_(fvPlaetze_());` und vor `return json_(health_());`: die einzelne Dispatcherzeile für `werte_snapshot`.
3. Direkt nach der schließenden Klammer von `preise_` und vor `function isAllowedOrigin_(p)`: `werteSnapshot_`, `werteSnapshotKeyValid_`, `werteSnapshotCacheRead_` und `werteSnapshotCacheWrite_`.

Der vorhandene `wizard`-Dispatcher und der Konfigurator-Anbau bleiben bytegleich. Kein anderer Block wird ersetzt. Codex führt weder `clasp push`, `create-version` noch `update-deployment` aus.

Nach dem Controller-Deploy sind zwei Gegenproben Pflicht:

1. `action=werte_snapshot` ohne gültigen Schlüssel liefert exakt dieselbe Antwort wie eine unbekannte Aktion.
2. Der serverseitige Abruf mit gültigem Schlüssel liefert `service=werte_snapshot`, `schemaVersion=1` und genau neun Tabellen.

## Lokale Prüfungen der Sammelroute

1. Neue Sammelroutenprüfung: 11 von 11 bestanden.
2. Bestehende Verdrahtungsprüfung: 17 von 17 bestanden.
3. Bestehende Förderperiodenprüfung: 33 von 33 bestanden, Delta exakt 0.
4. `kv_engine.gs`: keine Änderung.
5. Kein Commit, kein Push, kein Apps-Script-Deploy.

## Blocker nach Apps-Script-Version 18

Der Controller-Deploy wurde als Version 18 produktiv bestätigt und anschließend read-only gegengeprüft. Die lokale Rückleseprobe ist nach Redaktion des echten Schlüssels bytegleich zum Repo-Block, `kv_engine` bleibt bytegleich. Der gültige Snapshot umfasst 13.184 Byte und genau die sieben vereinbarten Tabellen.

Damit wurde eine noch offene Datenlücke sichtbar:

1. `dimensionierung_` liest über `getAllParameters_().dimensionierung` das Blatt `Dimensionierung` (`Code.gs` Zeilen 43 bis 44 sowie 897 bis 904).
2. `foerderung_` liest über `getAllParameters_().foerder` das Blatt `Förder_Parameter` (`Code.gs` Zeilen 423 bis 424 sowie 897 bis 904).
3. Beide Tabellen fehlen in `werte_snapshot`.

Ohne diese Werte kann PHP die zwei Routen nicht sheet-live und ziffergleich nachbilden. Fest eingebaute Seeds würden die Google-Tabelle als führende Quelle umgehen; zusätzliche Einzelabfragen würden die festgelegte Sammelarchitektur brechen.

Erforderliche Korrektur: `WERTE_SNAPSHOT_SHEETS` additiv um `Förder_Parameter` und `Dimensionierung` erweitern, danach die Sammelroute erneut chirurgisch bereitstellen. Erwartete Tabellenzahl ist dann neun. Erst anschließend ist der PHP-Bau freigabefähig.

## Auflösung durch Apps-Script-Version 19

Der Controller ergänzte ausschließlich `Förder_Parameter` und `Dimensionierung`. Version 19 wurde mit HTTP 200, 17.462 Byte und genau neun Tabellen bestätigt. Ohne Schlüssel bleibt die Antwort identisch zu einer unbekannten Aktion. Die sechs Förderstufen blieben unverändert. Der Repo-Spiegel enthält dieselben zwei additiven Listeneinträge; weder `clasp push`, Versionierung noch Apps-Script-Deploy wurden von Codex ausgeführt.

## PHP-Architektur

1. `api/rechner.php`: Herkunftsprüfung, 60 Aufrufe je Minute und Adresse, Protokollmodus, Umschaltkonstante, Routing und Kaltstart-Rückfall.
2. `api/rechner-values.php`: Schlüsseldatei mit zwingendem `trim()`, Neun-Tabellen-Abruf, 300-Sekunden-Vorhaltung, atomarer Schreibvorgang und unbegrenzter Altstand.
3. `api/rechner-engine.php`: funktionsgleicher Port der sechs Leserouten und der Health-Antwort; JavaScript-Halbwegrundung wird über `floor(x + 0,5)` nachgebildet.
4. Privater Laufzeitpfad: `rechner-runtime` als Geschwisterordner von `/website`; Schlüssel und Snapshot liegen außerhalb des Repos. Das Paket-Skript schließt `rechner-runtime/` zusätzlich ausdrücklich aus.
5. Fehlt die Schlüsseldatei, ist sie unlesbar oder nach `trim()` leer, antwortet PHP mit einem benannten Konfigurationsfehler. Es wird nie ein leerer Schlüssel gesendet.
6. Ist der Snapshot älter als 24 Stunden und kann nicht erneuert werden, bleibt er nutzbar. Jeder Aufruf schreibt beispielsweise: `HeroWerk Rechner: snapshot_older_than_24h age_hours=25.0`.

## Lokaler Beweislauf

Der Lauf begann und endete am Berliner Kalendertag 03.08.2026. Das Vergleichsskript sendete den Referer `https://www.herowerk.de/foerderrechner-waermepumpe.html`; die Herkunftsprüfung enthält weder Ausnahme noch Testmodus.

Ergebnis: **506 von 506 Vergleichen ziffer-, text-, typen- und feldreihenfolgegleich; 15 Google-Fehlschläge wiederholt.** Fördervorschuss blieb in der Schlussgegenprobe bei 3 von 12 freien Plätzen. Die einzige angewandte Formreduktion entspricht der gemessenen Freigabe für `preise` und `kv_bootstrap`.

Kontrollwerte:

1. Mit Klimabonus: 12.880 / 11.445 / 10.070 / 8.755 / 7.500 / 7.275 Euro.
2. Ohne Klimabonus: 8.400 / 8.175 / 7.950 / 7.725 / 7.500 / 7.275 Euro.
3. Unter Periodengrenze, Preis 12.000 Euro: Bemessungsbasis 12.000 Euro, Zuschuss 5.520 Euro, Eigenanteil 6.480 Euro.
4. Sieben Wohneinheiten, zwei selbstgenutzt, Einkommensbonus mit Kind, Preis 82.223 Euro: Satz 80 Prozent, gestaffelte Bemessungsbasis 78.476,85714285714 Euro, Zuschuss 35.289 Euro, Eigenanteil 46.934 Euro.

Zusätzliche lokale Betriebsprüfungen: 11 von 11 bestanden. Enthalten sind Schlüssel mit Zeilenumbruch, fehlender Schlüssel, leerer Schlüssel, Kaltstart ohne Snapshot, Altstand bei gescheitertem Snapshot-Abruf, 25 Stunden alter Stand, Origin, Referer, `Sec-Fetch-Site: same-origin`, fremde Herkunft und der Nachweis, dass der Query-Parameter `origin` allein nicht trägt.

## Browseränderungen

Beide öffentlichen Rechner verwenden drei Versuche mit 15 Sekunden je Versuch und Abständen von einer und drei Sekunden. Die vorhandene Sequenzsicherung im Kostenvergleich bleibt erhalten; der Förderrechner besitzt nun ebenfalls eine Sequenznummer. Dessen bestehende Punkteanzeige bleibt unverändert, nach zwei Sekunden erscheint ergänzend „Wir rechnen deine Förderung, einen Moment.“. Im öffentlichen Kostenvergleich wurden ausschließlich die zwei freigegebenen Zustandstexte geduzt.

## IONOS-Testpfad

Die neue PHP-Strecke wurde inaktiv für Besucher unter `https://www.herowerk.de/api/rechner-test.php` geprüft. Der produktive Endpunkt `api/rechner.php` blieb während sämtlicher Nachweise unverändert.

### Laufzeit und Ausfallquote

1. Unabhängige Gegenmessung durch Benjamin: neue Strecke 8 von 8 erfolgreich, 0,050 bis 0,103 Sekunden; alte Strecke im selben Zeitraum 5 von 8 erfolgreich, bis 43 Sekunden.
2. Codex-Messung mit gültigem Referer: 24 von 24 erfolgreich, Ausfallquote 0 Prozent, Minimum 0,045 Sekunden, Median 0,053 Sekunden, 95. Perzentil 0,099 Sekunden, Maximum 0,204 Sekunden und Mittelwert 0,062 Sekunden.
3. Antwortgröße bei `action=preise`: in allen 24 Aufrufen 971 Byte.

### Herkunft und privater Laufzeitordner

1. Gültiger Referer: HTTP 200.
2. Gültiger Origin: HTTP 200.
3. Ausschließlich `Sec-Fetch-Site: same-origin`: HTTP 200.
4. Fremder Origin: HTTP 403 mit `origin_not_allowed`.
5. Ohne alle drei Herkunftsmerkmale: HTTP 403 mit `origin_not_allowed`.
6. Nur behaupteter Query-Parameter `origin`: HTTP 403 mit `origin_not_allowed`.
7. `/rechner-runtime/werte_snapshot.json`: HTTP 404.
8. `/rechner-runtime/werte_snapshot_key.txt`: HTTP 404.
9. Pfad-Umweg: ebenfalls keine Datei ausgeliefert; Benjamin bestätigte HTTP 404, die unabhängige Codex-Gegenprobe wurde bereits vor PHP mit HTTP 400 abgewiesen.

### Getrennter Upstream-Ausfall

Für die Ausfallprobe zeigte ausschließlich `api/rechner-test.php` auf den absichtlich unerreichbaren lokalen Gegenpart `127.0.0.1:1`; die Vorhaltedauer wurde für diese Probe auf null gesetzt. Der produktive Endpunkt und die Module blieben unverändert. Benjamin bestätigte trotz unerreichbarem Gegenpart HTTP 200 in 0,099 Sekunden sowie die sechs Stufen 12.880 / 11.445 / 10.070 / 8.755 / 7.500 / 7.275 Euro. Damit rechnete IONOS nachweislich aus dem dauerhaft gespeicherten Altstand weiter.

### Ratenbegrenzung

1. Protokollmodus: Codex sendete zunächst 61 Aufrufe innerhalb von 3,8 Sekunden; 61 von 61 antworteten HTTP 200. Nach der endgültigen Rücksetzung sendete Benjamin 70 Aufrufe hintereinander; 70 von 70 antworteten HTTP 200, null wurden gesperrt. Die IONOS-Fehlerprotokolle sind bei diesem Vertrag nicht per SFTP erreichbar. Benjamin hat deshalb den wiederholbaren Wirknachweis ausdrücklich als stärkeren Abschlussbeleg freigegeben; eine Protokolldateizeile wird nicht weiter gesucht.
2. Sperrmodus: Benjamin bestätigte HTTP 429 mit ausschließlich `rate_limit_exceeded` und ohne Rechenfelder.
3. In einer 65er-Serie waren 59 Antworten erfolgreich und 6 gesperrt. Die notwendige Korrektur um eins betrifft die Testzählung, nicht die Sperrgrenze: Der unmittelbar davor ausgeführte Altstand-Aufruf war bereits Zählerstand 1 derselben Minute. Serienaufrufe 1 bis 59 ergaben damit Gesamtzähler 2 bis 60; Serienaufruf 60 war Gesamtzähler 61 und wurde korrekt gesperrt. Die Quellbedingung bleibt `count > 60` und lässt damit exakt 60 Gesamtaufrufe je Minute durch. `count > 61` wäre fachlich falsch, weil dann 61 Aufrufe erlaubt würden.

## Acht Bildnachweise

Ordner: `reports/2026-08-03_Rechenkern-PHP_Bilder/`. Das Manifest enthält für jedes Bild einen SHA-256-Hash und für die drei verwendeten, eingefrorenen API-Antworten ebenfalls einen SHA-256-Hash.

1. Förderrechner: schmal und breit, jeweils hell und dunkel.
2. Kostenvergleich: schmal und breit, jeweils hell und dunkel.
3. Alle vier Förderbilder zeigen laufende Punkte und nach zwei Sekunden den Zusatztext „Wir rechnen deine Förderung, einen Moment.“.
4. Alle vier Kostenvergleichsbilder zeigen „Deine Berechnung wird aktualisiert. Einen Moment bitte.“.
5. Die Seiten stammen aus dem geänderten lokalen Quellstand; sämtliche Rechnerantworten kamen mit gültigem Referer vom live geschalteten IONOS-Testpfad. Gleiche Anfrageparameter wurden aus derselben eingefrorenen Antwort bedient.

## Elf Hauptprüfungen nach letztem Code-Edit

1. `lint`: Formatierung, ESLint, Typprüfung, 74 Asset-Fingerabdrücke, 30 gestempelte HTML-Seiten, Paket-Selbsttest, Consent, 240 Rasteransichten, 112 Mobilansichten, Strukturdaten und Seitenbausteine grün.
2. `resolve-preview`: lokale Vorschau für Startseite, Förderrechner und Kostenvergleich jeweils HTTP 200.
3. `content-fidelity`: 8 Seiten geprüft, Schwelle 30 Prozent, grün.
4. `playwright-smoke`: 12 bestanden, 1 ausschließlich für Vercel vorgesehener Fall regelkonform übersprungen.
5. `axe-accessibility`: 32 von 32 bestanden.
6. `seo-basics`: grün.
7. `schema-validation`: grün, ein JSON-LD-Block geprüft.
8. `secret-scan`: Gitleaks 8.30.1 über den exakten Änderungscommit, 304.207 Byte, keine neuen Geheimnisse.
9. `csp-headers`: Mozilla Observatory, B+ und 80 Punkte; Schwelle mindestens B.
10. `hubspot-mapping`: 24 Eigenschaften geprüft, grün.
11. `lead-only-gate`: kein verbotener Vertragsabschluss-Aufruf, grün.

## Apps-Script-Änderungsnachweis

`git diff --numstat -- apps-script/` ergibt ausschließlich `71 0 apps-script/rechner-backend/Code.gs`: 71 additive Zeilen, null entfernte. `kv_engine.gs` hat null Diff-Zeilen. Die 71 Zeilen bestehen aus den freigegebenen 69 Zeilen der Sammelroute plus den zwei nachträglich freigegebenen Tabelleneinträgen `Förder_Parameter` und `Dimensionierung`. Codex führte keinen Apps-Script-Push, keine Version und keine Bereitstellung aus.

## Abschlussstand

Benjamin spielte ausschließlich die ursprüngliche `api/rechner-test.php` zurück: echter Google-Upstream, 300 Sekunden Vorhaltedauer und Ratenbegrenzung im Protokollmodus. Sein erster Kontrollaufruf antwortete nach abgelaufener Vorhaltung erwartungsgemäß erst nach 7,2 Sekunden, weil der Stand frisch von Google geholt wurde; Ergebnis HTTP 200 und `zuschussGesamt` 12.880 Euro. Die abschließende Codex-Gegenprobe antwortete HTTP 200 in 0,050 Sekunden und lieferte ziffergenau 12.880 / 11.445 / 10.070 / 8.755 / 7.500 / 7.275 Euro.

Der Bauauftrag ist damit bis zur ausdrücklich separaten Auslieferungsentscheidung abgeschlossen. `api/rechner.php` ist produktiv unverändert, es wurde nicht umgeschaltet. Es gibt keinen Commit, keinen Push, keinen Prüf-PR und keinen Merge nach `main`.
