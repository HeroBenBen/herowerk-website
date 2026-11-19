# T1302: interne Prüfer der Website

## Umfang

Ein gemeinsamer Node-Kern T1302.1 führt 14 vorhandene pull_request-Aufgaben mit 66 run- und 27 uses-Schritten lokal aus. Jeder Auftrag bekommt eine eigene Arbeitskopie. Die Abdeckungsliste bindet jeden Originalschritt mit Strukturhash, lokaler Umsetzung oder begründetem Entfall. Workflowdateien bleiben unverändert. Änderungen an reiner Berichtsdokumentation wählen keine Browsermessungen; Geheimnisscans berücksichtigen weiter sämtliche Dateipfade.

Prüfumgebung: Node 20.19.3, PHP 8.1.33 mit intl, Python 3.12.12, Playwright 1.60.0 mit den offiziellen Browsern, Gitleaks 8.30.1, LHCI 0.15.1. Die öffentlichen Basisabbilder sind mit Digest in abdeckung.json festgelegt. Der lokale Eigenbau wird nicht hochgeladen.

## Bewusste Grenzen

Lighthouse und Consent sind vorhandene nicht sperrende Berichte. Consent liest Live-Ziele nur im Vollauf ohne Wiederholungsversuch. Der Bildvergleich erfordert ratifizierte PNG. Der lokale Läufer erzeugt keine neuen Sollbilder, ändert keine Schwelle und schreibt nichts nach GitHub. Die vorhandene bedingte Grundlinienaktualisierung bleibt deshalb bis auf ihre lesende 16-PNG-Strukturprüfung ausdrücklich als entfallen dokumentiert.

release.yml bleibt unverändert. Der lokale Prüfer lädt keine Sentry-Quellkarten hoch. Ein späterer gesonderter Entscheid könnte die vorhandene Prüfdatei auf manuellen Auslöser umstellen; automatische PR-Prüfungen würden entfallen und der lokale Beleg müsste am Antrag stehen. Dieser Vorschlag wird nicht umgesetzt. Die Entwurfsantragseröffnung kann vorhandene GitHub-Auslöser aktivieren.

## Hauptstanderhebung

Hauptstand a6fcd7db6f8108d53e495fe3a02cdec43c2e6b00: ein Vollauf, 881,03 Sekunden einschließlich Abbildbau. Raster, Mobile, Consent-Livebericht, mehrere Fachprüfungen und die vorhandene 16-PNG-Strukturprüfung waren grün. Die Liste enthält drei strukturierte Einzelbefunde: eine TS2339-Diagnose und zwei redigierte Gitleaks-Funde, jeweils mit Datei, Regel, Inhaltshash und Vorkommenszahl. 27 nicht vollständig gemessene oder unstrukturierte Schritte stehen ohne Freistellung unter unresolved. Die Erhebung war rot und belegt keine vollständige fachliche Freigabe.

Einrichtungskorrekturen aus dieser Messung: rsync für den bestehenden Bündelbau ergänzt, Fachprozesse mit Host-UID statt root, Laufanpassungen nur in der Wegwerf-Kopie eingebucht, Serverbündel außerhalb von Git. Der frische lesende Prüfer fand außerdem fehlende direkte Eingabepfade und eine Imagekennung ohne kopierte Paketmanifeste. Beides ist behoben und gezielt nachgelesen. Keiner dieser Einrichtungsfehler wurde freigestellt.

Ergebnis der Hauptstanderhebung: /Users/benjaminbendler/.herowerk-pruefung/herowerk-website/laeufe/2026-11-19T16-22-53-467Z-25179/ergebnis.json.

## Einmaliger Rot-Nachweis

Acht Beobachtungen sind bestanden: Lint-Fehler, gebrochenes vorhandenes Prüfskript, unmöglicher Titel im echten Chromium, synthetisches GitHub-Geheimnis, dritter roter Lauf gesperrt, zweiter Vollauf desselben SHA verweigert, Zeitdeckel samt Container-/Prozessgruppenabbruch, rechnerweite Sperre ohne Warten. Nach Fehlern liefen unabhängige vorhandene Schritte weiter.

Die erste Browserprobe war durch interne Prüferdateien im Bündel blockiert. Ausschließlich tools/interne-pruefer/ ist deshalb jetzt vom Auslieferungsbündel ausgeschlossen; die vorhandene Gleichheitsprüfung übernimmt diese Liste direkt. Ein breiter Browser-Nachtrag nahm unnötig die gesamte bereits fehlerhafte Smoke-Sammlung mit und wurde ausdrücklich beendet. Die abschließende Wegwerf-Probe beschränkt die Testauswahl allein dort auf den injizierten Browserfall. Der reguläre Vollauf behält die vollständige Sammlung, mit zwei Arbeitern und null Wiederholungen. Bestandene Proben wurden nicht wiederholt. Beide Fehlbelege und die gezielten Nachträge bleiben außerhalb von Git erhalten.

Beleg: /Users/benjaminbendler/.herowerk-pruefung/herowerk-website/rot-nachweis/ergebnis.json. Der frische lesende Prüfer bestätigte sämtliche Einrichtungskorrekturen einschließlich des Bündelausschlusses.
