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

## Vollauf vor dem Antrag

Einbuchung 8fb3d55: genau ein Vollauf, vollständig beendet nach 2593,72 Sekunden (43 Minuten 13,72 Sekunden), kein Zeitabbruch, Bereinigung bestätigt. Rot bleiben vier vorhandene Aufgaben: Zählerdateien, SEO-Inhalte, vollständige Smoke-Sammlung und Bildvergleich. Die Smoke-Sammlung meldete 111 bestandene Tests und einen Fehler in 11,1 Minuten. Die übrigen Fach-, Browser-, Kopfzeilen-, SEO- und Schemaprüfungen sowie beide Lighthouse-Themen und der Consent-Livebericht waren grün; die bekannte Typdiagnose und zwei Gitleaks-Funde wurden einzeln als Altlast erkannt. Keine Schwelle gesenkt und keine Sollbilder ersetzt.

Ergebnis: /Users/benjaminbendler/.herowerk-pruefung/herowerk-website/laeufe/2026-11-19T16-47-48-681Z-48963/ergebnis.json.

Anschließend wurde allein die Meldung über Altlastabbau abgesichert: Unstrukturierte Abbrüche dürfen keinen angeblichen Rückgang melden. Vier isolierte Fälle mit der tatsächlichen gemeinsamen Funktion bestanden. Prüfkommandos, Auswahl und Ausführung blieben dabei gleich; der volle Fachlauf wurde nicht wiederholt. Diese Meldekorrektur wird bytegleich in alle Ablagen übernommen.


## Kernkorrektur T1302.2 vom 20.11.2026

Laufkennzeichen werden ausschließlich mit docker build --label herowerk.lauf=<runId> am Endabbild gesetzt. Der Kern übernimmt den Dockerfile-Inhalt unverändert. Auch der lokale Portal-Druckdienst enthält kein wechselndes Laufkennzeichen mehr im Dockerfile. Damit ist die Ursache der Zwischenspeicherentwertung entfernt; der tatsächliche Cache-Nachweis bleibt bis zum Rechenfenster offen.

Vor jedem vorgesehenen Bau misst der Kern den verfügbaren Speicher über die bestehende Docker-Verbindung. Das vorhandene öffentliche Node-Messabbild läuft ohne Download, ohne Netz und mit schreibgeschütztem Wurzeldateisystem; df misst schreibgeschützt eingebundene Docker-/containerd-Speicherpfade. Unter 6.000.000.000 Byte wird ohne Bau rot gemeldet, einschließlich des Messwerts. Eine nicht mögliche Messung sperrt ebenfalls.

Bei fehlgeschlagenem Bau werden nur neue, aus seiner Legacy-Bauausgabe belegte Zwischenabbilder berücksichtigt. Vorher vorhandene, aus dem Cache verwendete oder inzwischen benannte Abbilder bleiben geschützt. Gelöscht wird ohne force, ohne prune und ohne automatische Elternlöschung. Ein inzwischen anderweitig verwendetes Abbild wird nicht erzwungen entfernt; ein unvollständiger Bereinigungsvorgang steht im Ergebnis. Die Kennungen eigener Zwischencontainer und Abbilder werden auch dem Zeitwächter übergeben; er hält dafür 12 Sekunden Abbruchreserve vor. Vorhandene Zwischenabbilder früherer Läufe wurden nicht gelöscht.

Wache 3 wurde einmal am 20.11.2026 um 19:28:44 Uhr (Europe/Berlin) belegt: 5.835.186.176 Byte frei, entsprechend 5,835 GB, unter der Grenze von 6 GB. Erwartetes Ergebnis rot, Nachweis bestanden, buildStarted=false und buildCalls=0. Gemeinsamer Beleg: /Users/benjaminbendler/.herowerk-pruefung/bau-nachweise/T1302.2/wache-3/ergebnis.json. Es gab keinen Abbildbau und keinen vollen Lauf.

Wachen 1 und 2 sind als getrennte einmalige Aufrufe von tools/interne-pruefer/bau-nachweis.mjs vorbereitet, aber nicht ausgeführt: gleicher mehrstufiger Dockerfile-Inhalt bei unterschiedlichen CLI-Laufkennzeichen muss den Cache verwenden; ein gezielt fehlgeschlagener Bau muss seine neuen Zwischenabbilder entfernen und den vorherigen Abbildbestand erhalten. Die Freigabe dafür erfolgt erst im zugeteilten Rechenfenster. Kein frischer Prüfer des Prüfers gemäß ausdrücklicher Kostenanweisung. Bestehende Fachbelege früherer Kernstände bleiben historische Belege, sie sind kein Vollauf dieses neuen Kernstands.
