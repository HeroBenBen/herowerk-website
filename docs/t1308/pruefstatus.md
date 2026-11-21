# T1308: Website-Prüfstatus

25 identische Hauptnavigationen mit Portalblock, beide Portal-Fußzeilenlinks auf allen 34 Stammseiten und acht wörtlich übernommene Stationen auf `/kundenportal` und `/bewerberportal`. Diese Erklärseiten laden weder `site.js` noch CMP, Consent oder Analytics und tragen eigene Canonicals und soziale Metadaten.

## Übernahme und Verarbeitung

`vorschau/` enthält sechs HTML-Dokumente, 14 Bilder/Fonts und das unveränderte Produzentenmanifest. Produzentencommit `6479c8bce1e967f39d29988198c4ab231b9f46ca` und Manifest-Hash stehen in `uebernahme.json`; der Importstatus ist `eingebucht`. Die Abschlussübernahme erfolgt ausschließlich aus dem sauber eingebuchten Portalstand:

```bash
node scripts/import-t1308-preview.mjs --quelle ../portal
node scripts/import-t1308-preview.mjs --check --quelle ../portal
```

Nur für vorläufige lokale Kopien ist `--arbeitsstand` zulässig. Importdateien sind von Versionsumschreibung und Kommentarentfernung ausgenommen. `tests/t1308-import-processing.mjs` prüft alle 21 Dateien nach beiden Verarbeitungsschritten mit Positivkontrollen außerhalb der Vorschau. Dabei entsteht kein Auslieferungsbündel.

## Controller und Node-Nachweise

Controller-Lauf grün, alle zehn Teilläufe und Exit 0: `/Users/benjaminbendler/code/_t1308/belege/controller-2026-11-21T03-20-32-838Z`. Darin: vollständiger Headervergleich, öffentliche Matrix mit 48 Stationsstarts und sechs Export-Bootstraps, sieben bestehende Smoke-/A11y-Prüfungen, interne HTTP-Prüfung sowie 24 interne Browserprüfungen. Kopien des Ergebnisses und der Website-Belege: `nachweise/controller-*.json`. Die Bilder ohne Zusatz `vor-laststopp` stammen aus diesem Lauf, vor der folgenden Nachbesserung.

**Nach dem Controller-Lauf korrigiert:**

- Bewegungsschalter auf den Erklärseiten gleichwertig zur Originalfunktion: Speicher `hero-motion` mit `an`/`aus`, Systemeinstellung `prefers-reduced-motion: reduce`, Beschriftung „Aus / An“, Rolle `switch`, Zustandsangabe und folgenloser Klick auf das aktive Feld. Die Seite bleibt ohne `site.js`.
- Alle weiteren Kopf-/Menüelemente auf dieselbe Initialisierungslücke geprüft. Theme-Schalter funktionieren über das unveränderte `theme.js`. Hamburger, Tastatur, Escape und Menülinks sind eingerichtet; Wischgeste, Scrollzustand und dynamischer Reserveplatz der mobilen Aktionsleiste sind auf den Erklärseiten ergänzt.
- Bedienhinweis ausschließlich nach `public-notice` aus vertrauenswürdiger Nutzerbedienung. Die interne Tokenprüfung sendet beim Start `action`; diese Meldung bleibt jetzt stumm. Synthetische Eingaben erzeugen keinen Hinweis. Gleichzeitig ist höchstens ein Bedienhinweis sichtbar.

Nachweis ohne Browser: `tests/t1308-bedienung-node.mjs` führt die tatsächlichen Laufzeiten mit einem DOM-/Ereignis-Testdouble aus. 16 Kombinationen aus Systemeinstellung, gespeicherter Wahl und gesperrtem Speicher werden gegen `heroVideoSteuerung()` aus dem echten `site.js` verglichen. Auf beiden Erklärseiten sind die übrigen Bedienelemente erfasst. Startmeldungen, synthetische und vertrauenswürdige Nutzerereignisse sowie die Einzelanzeige des Hinweises werden gegengeprüft. Das ist kein Layout- oder Browserbeleg. **Der Controller sieht die Nachbesserungen im Browser nach.** Es wurde dafür kein weiterer Container-, Browser- oder Apache-Lauf gestartet.

```bash
node scripts/pruefe-t1308-offline.mjs
```

Dieser Aufruf startet keinen Browser, Server oder Container. Er prüft Erzeuger, Quellen, acht öffentliche Rotfälle, Import und Verarbeitung, Navigations-/Fußzeileninventar, Wortlaut, Header-Hashes, Bedienlogik, Consent-Abgrenzung, SEO, Bausteine, Syntax, Format und den lesenden Bewerberbaum. Belege liegen unter `../belege/offline-<Zeitstempel>/`.

Der Portal-Gesamtlint hat unverändert 37 Altfehler gegenüber main, keine neuen. Der Website-Lint ist grün. Beide PRs nennen diese Altlast, den grünen Controller-Lauf mit Belegpfad und die danach erfolgten Korrekturen.

## Abweichungen und Sicherheitsgrenzen

Sandbox exakt `allow-scripts`, eindeutige Rahmentitel, keine echte Formularabsendung und keine neuen Fremdherkünfte. CORS ausschließlich für neue Fonts und SVG-Masken mit Inhaltsnamen unter `/vorschau/assets/`; ohne SVG-Freigabe war im Apache-Lauf ein CORS-Fehler aus Origin `null` gemessen worden. Gezielte Kontrastfarben sichern neue Hinweisflächen im Hellmodus gegen vorhandene breite Regeln ab; die Token-Dateien bleiben unverändert.

Technischer Fehlerwortlaut zur Freigabe: „Die Vorschau konnte nicht gestartet werden.“ Reguläre Menü- und Stationstexte sind aus dem Entwurf. Die historischen Dateien `*vor-laststopp*` bleiben als ältere Belege gekennzeichnet.

Ein erneuter schwerer Prüfaufruf ist nur nach ausdrücklicher Freigabe zulässig:

```bash
bash scripts/pruefe-t1308-controller.sh --freigegeben
```

Freigabeflag, exklusive Laufsperre, sequenzielle Phasen und Servergrenzen verhindern einen versehentlichen Parallelstart dieses Programms. Höchstens zwei eigene Servercontainer mit je 1 CPU, 768 MiB RAM und 128 Prozessen. Normales Host-Chromium ist damit nicht hart lastbegrenzt. Keine automatische Installation, kein Bündel und keine Veröffentlichung. Codex führt den Aufruf in diesem Abschlussabschnitt nicht aus.
