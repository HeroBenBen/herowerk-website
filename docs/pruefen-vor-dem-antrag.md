# Vor dem Antrag prüfen

Auftrag T1302, Fassung T1302.1. Die GitHub-Workflows bleiben unverändert.

## Einrichtung

Benötigt werden Node ab 22 für den gemeinsamen Skriptläufer, Git, Docker über Colima und Python 3 mit PyYAML 6.0.3 für das Lesen der Workflowstruktur. Der Läufer startet keinen Agenten und keinen GitHub-Auftrag. Die vorhandenen Webprüfungen laufen unter Node 20.19.3, PHP 8.1.33 und Playwright 1.60.0 im lokalen Docker-Abbild. Basis-Digest und Einrichtung stehen in tools/interne-pruefer/abdeckung.json. Öffentliche Grundlagen dürfen heruntergeladen werden; eigene Abbilder werden nie hochgeladen.

Colima-Socket: unix:///Users/benjaminbendler/.colima/default/docker.sock. Rechnerweite Sperre, Vollauf-Datensätze, Rot-Zähler und Ergebnisse liegen unter /Users/benjaminbendler/.herowerk-pruefung/. Ein zweiter Aufruf wartet nicht. Eine verwaiste Sperre erst nach Prüfung von PID und zugehörigen Containern entfernen.

## Arbeitsrunde und Vollauf

    npm run pruefe -- --geaendert
    npm run pruefe -- --voll

Die Arbeitsrunde wählt Prüfungen anhand der Änderungen seit dem gemeinsamen Vorfahren mit origin/main einschließlich des Arbeitsbaums. Änderungen am Prüfer wählen alle vorhandenen Prüfungen. Der Vollauf verlangt einen sauberen eingebuchten Stand. Zeitgrenzen: 15 und 45 Minuten einschließlich Einrichtung. Keine Wiederholungen. Zweiter Vollauf desselben SHA wird verweigert, auch nach Abbruch. Nach zwei roten Läufen desselben Zweigs ohne neue Einbuchung lautet die Sperre: anhalten, beheben, melden.

origin/main wird nicht automatisch aktualisiert. Vor der Arbeitsrunde dessen Aktualität bewusst herstellen. Fehlende Quellen, Werkzeuge oder historische Einbuchungen sind Fehler. Der Prüfer öffnet keinen Antrag und führt nicht aus.

## Abdeckung und Altlast

Die Abdeckungsliste ordnet jeden Schritt eines aktuell vorhandenen pull_request-Ablaufs zu. Neue oder geänderte Schritte ohne passende Zuordnung ergeben rot. Entfernte oder ausschließlich manuell auslösbare Workflows sperren nicht. Vorhandene Zusatzprüfungen werden nicht erfunden. Alle 93 vorhandenen Schritte werden abgedeckt. Jeder Workflowauftrag erhält eine eigene Arbeitskopie. Hochladeaktionen sichern Belege lokal.

Eine Bestandsliste wird ausschließlich ausdrücklich mit --bestand-neu erhoben, wenn HEAD dem dokumentierten origin/main entspricht. Der Läufer verwendet dafür die unveränderte lokale Einbuchung in einer Wegwerf-Kopie und übernimmt keine Arbeitsbaumänderungen. Alle zugeordneten Prüfungen werden gewählt. Bei Abbruch bleibt die Liste unverändert. Nach vollständig beendeter Erhebung werden nur vollständig strukturierte Einzelbefunde übernommen; unstrukturierte Abbrüche stehen ohne Freistellung unter unresolved. Bereits bekannte Einträge solcher offenen Schritte bleiben erhalten. Der Schalter umgeht weder Zeitgrenze noch Zähler. Die Bestandsliste enthält ausschließlich einzeln erkannte Befunde; ein Fachtestabsturz wird nicht freigestellt.

Fingerabdrücke enthalten Aufgabe, Datei, Regel, Meldung und Vorkommenszahl. Nur vollständig erkannte Diagnosen werden freigestellt; Abstürze nicht. Entfallene Altbefunde werden zur Bereinigung gemeldet, niemals still gelöscht. Änderungen der Liste müssen im Antrag sichtbar sein.

## Ergebnis und Antrag

Jeder Aufruf schreibt eine Ergebnisdatei mit Einbuchung, Basis, Stufe, Versionen, Zeiten und Einzelstatus außerhalb von Git. Dort liegt auch die redigierte Ausgabe der Schritte. Die Zusammenfassung gehört an den Entwurfsantrag: SHA, gemessene Dauer, grün/rot/Altlast, verbleibende Lücken und einmaliger Rot-Nachweis. Vor dem Antrag erfolgt ein frischer lesender Prüfer. Zusammenführung und Auslieferung erfolgen nicht durch den Läufer.

## Einmaliger Baunachweis

    node tools/interne-pruefer/rot-nachweis.mjs

Nur beim Bau ausführen. Er erzeugt lokale Wegwerf-Kopien und keine Pushes. Der Nachweis injiziert einen Lint-Fehler, ein gebrochenes vorhandenes Prüfskript, einen echten Browserfehler und ein synthetisches Geheimnis. Zusätzlich prüft er die Kostenregeln. Geheimnisse werden vollständig redigiert. Der persistente Beginn verhindert eine stille Wiederholung. Ergebnisse werden außerhalb von Git abgelegt.

## Gemeinsamer Kern

pruefe.mjs und rot-nachweis.mjs werden unverändert in allen fünf Ablagen verwendet. Ablagespezifische Anweisungen stehen ausschließlich in abdeckung.json. Version und SHA-256 des Läufers werden im Ergebnis festgehalten. Änderungen am Kern müssen bytegleich übertragen werden.

## Grenzen und Bestandsübernahme

Fehlende PNG-Sollbilder sind keine erfolgreiche Bildprüfung. Der Prüfer meldet diese Lücke ausdrücklich rot. Lighthouse führt die drei im Workflow vorgesehenen Messpunkte je Thema ohne Wiederholung aus. Unstrukturierte Chromium-Abbrüche bleiben rot. Release-Quellkarten aus release.yml werden nicht hochgeladen.

Eine vorhandene Hauptstandmessung lässt sich ausdrücklich mit --bestand-neu --ergebnis <Ergebnisdatei> übernehmen. Erforderlich sind vollständige Aufgabenausführung, unveränderte erhaltene Hauptstandkopie sowie identische Konfigurations- und Abdeckungsfingerabdrücke. Ein beendeter Teillauf reicht nicht aus. Historische Geheimnisfunde werden aus ihrer jeweiligen Git-Fassung gehasht; Rohwerte stehen niemals im Bericht.

## Berichte und Grundlinien

Lighthouse und Consent sind wie im vorhandenen Workflow ausgewiesene Berichte. Der Consent-Bericht liest ausschließlich Live-Ziele in --voll, ohne Wiederholung, und sperrt nicht. In --geaendert entfällt er mit Vermerk. Die bedingt aktivierte Grundlinien-Aktualisierung wird nicht nachgebildet: kein Erzeugen neuer Sollbilder, kein Einbuchen und kein Hochladen. Ihre vorhandene Prüfung auf genau 16 erwartete PNG bleibt erhalten. Schreib- und Hochladeschritte sind mit Begründung als entfallen zugeordnet.
