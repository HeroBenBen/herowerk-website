# WR – kleine Website-Runde nach A11

Baufreigabe: genau `go` im Auftragschat. Baubasis: `40951542b4903adde7cc1e694a96fa81a41a7197`, beim Klonen aktuelles `origin/main`. PR 150 am 15.10.2026 14:10:24 UTC zusammengeführt. Eigener Klon `WR/website`, Zweig `codex/t1087-wr-kleine-runde`. Entwurfs-PR, kein Zusammenführen, keine Auslieferung.

## Rot/Grün und Vorher/Nachher

`node tests/t1087-wr.cjs` führt dieselben sieben Zusicherungen gegen die feste Baubasis und den Bau aus. Ergebnis: siebenmal Basis ROT, siebenmal Bau GRÜN. Diese lokalen Nachweise prüfen DOM-Ausgaben und Funktionen; sie ersetzen keine gerenderte Geometriemessung.

| Punkt | Vorher an der Basis                                                                                                                                         | Nachher / Zusicherung                                                                                                                                                                                                                                                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Mobile native Vaillant-Auswahl schneidet den nachgestellten Preis ab.                                                                                       | Vollständiger Gerätetyp und Preis, etwa „Vaillant aroTHERM pro VWL 55/7.1 A · 29.944 €“. Nur bei maximal 600 px erhält Vaillant eine umbrechende, nicht interaktive Textschicht; der Preis steht zusammenhängend auf der Folgezeile. Native Auswahl, Fokus und Optionen bleiben; Wolf und 1440 px unverändert. |
| 2     | `A-7/W35` kann in Untertitel und erster Tabellenzeile am Minus umbrechen.                                                                                   | Nur der Kennwert bekommt `white-space: nowrap`. Identische Textzeichen, insbesondere ASCII-Minus U+002D. 1440 px wortgleich.                                                                                                                                                                                   |
| 3     | Unbegrenzte Pfeilposition erzeugt mobilen Panelüberlauf; feste 1600-px-Grenze schneidet Wolf-XXL-Link ab.                                                   | Mobil Pfeil innerhalb des Panels; geöffnetes Panel ohne feste Höhenkappe. Beide Links vollständig innerhalb des Inhalts. Desktop unverändert. Browser-Gegenprobe blendet ausschließlich den Pfeil aus, um den Ursachenbefund zu prüfen.                                                                        |
| 4     | Vaillant-Panel heißt für Assistenztechnik weiterhin Wolf.                                                                                                   | `aria-labelledby` folgt dem aktiven Herstellerreiter und wechselt zurück. Sichtwirkung bei beiden Breiten null.                                                                                                                                                                                                |
| 5     | Nach Erfolg und Folgeabruffehler bleibt etwa „ab 7.626 € Eigenanteil\*“ stehen.                                                                             | Beide Marken zeigen „ab … dein Anteil\*“. Neuer Erfolg stellt den berechneten Mindestpreis wieder her. Netzwerk-, HTTP-, Form- und Leerantwortfall vorgesehen.                                                                                                                                                 |
| 6     | Fünf Plus-/Kaskadenzeilen nennen den Lieferanten „Vaillant Deutschland GmbH & Co. KG“.                                                                      | Hersteller einheitlich „Vaillant GmbH“, Feldbeschriftung bleibt „Hersteller“. Primärquelle 8000035176_05, PDF-S. 152, „Publisher/manufacturer“ / „Vaillant GmbH“; kleinere Geräte zusätzlich 8000041775_03 S. 152. Siehe Quellenblatt.                                                                         |
| 7     | Antwortwerte `A&#45;11`, `A<span>-</span>11`, `Heizleistung <12 kW bei A<span>&minus;</span>11/W55` werden als „A-11“ beziehungsweise „A−11“ interpretiert. | Alle Zeichen erscheinen wörtlich. Antwort-/Katalogwerte werden an der HTML-Ausgabestelle escaped oder als DOM-Text gesetzt. Eigenes Markup bleibt. Regelfall bei 375 und 1440 px wortgleich, abgesehen von den ausdrücklich freigegebenen Punkten 1–6.                                                         |

## Prüfstand

- TAFEL-Vertragsprüfungen einschließlich Rot-/Grünvergleich WR lokal grün. Historische Erwartungen erlauben ausschließlich die freigegebenen Hersteller-/Kennwert-Markupänderungen und die gleich sichtbare Entity-Kodierung von `&`; Wolf-Fußtext und statische Förderauswahl bleiben bytegleich.
- A11: 169 Prüfgruppen lokal grün, einschließlich der vollständigen Kernvergleiche. Keine Änderung am A11-Schutz oder seinen Prüfungen.
- 74 API-, Rechenkern- und Fixture-Dateien bytegleich zur Baubasis; zusätzlich 18 öffentliche Antwortkörper aller action-Routen und zehn Förder-Paketfälle mit identischen lokalen Tabellen direkt bytegleich verglichen; keine Änderung an Preisen, Eigenanteilen, Förderbeträgen, Katalogbindung oder API.
- Chromium und WebKit lokal durch die Sandbox beim Start blockiert. Chromium: `bootstrap_check_in … Permission denied (1100)`, WebKit beendet beim Start. Kein lokaler Sichtlauf behauptet. Leitstand übernimmt die lokale Sichtabnahme.
- `tests/t1087-wr.spec.js` prüft Chromium/WebKit bei 375/1440 px: Geometrie, beide Reiter und sämtliche Datenblätter, Förderauswahl, Dimensionierung, beide Kostenvergleichsseiten; Basis/Bau mit identischen Antwortbytes. Screenshots und Messungen unter `artifacts/tafel-sicht/wr/`, im vorhandenen CI-Artefakt `tafel-sicht`.
- CI am endgültigen Kopf: **noch ausstehend**. Dieser Arbeitsstand wird vor Abschluss um Lauf und Ergebnis ergänzt.

## Dateiliste und Überschneidung

Die Planung nannte 32 HTML-Kandidaten. Nachmessung: vier Treffer stehen nur in Kommentaren (`anfrage.html`, `datenschutz.html`, `impressum.html`, `stelle.html`) und laden die geänderten Assets nicht. Sie bleiben unverändert. Notwendig sind **56 Hashverweise in 28 HTML-Dateien**, damit der einjährige Asset-Cache die Korrekturen erhält. Davon ändern 26 ausschließlich Versionsverweise; die zwei Kostenvergleichsseiten schließen zusätzlich die geplanten Inline-Textsenken.

Überschneidung mit den neun Dateien aus PR 150: ausschließlich `package.json`. WR ergänzt dort seine Prüfung in `verify:tafel`; `verify:a11` bleibt unverändert.

| Datei                                      | Zweck                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `BERICHT_WR.md`                            | Quellenbeleg beziehungsweise Baunachweis                                 |
| `amortisation-waermepumpe.html`            | Nur zwei Asset-Hashes                                                    |
| `barrierefreiheit.html`                    | Nur zwei Asset-Hashes                                                    |
| `baubarkeitspruefung.html`                 | Nur zwei Asset-Hashes                                                    |
| `bewerbung.html`                           | Nur zwei Asset-Hashes                                                    |
| `css/site.css`                             | Punkte 1–3: eng begrenzte Darstellung                                    |
| `dimensionierung-verstehen.html`           | Nur zwei Asset-Hashes                                                    |
| `dimensionierung.html`                     | Nur zwei Asset-Hashes                                                    |
| `docs/intern/kostenvergleich-berater.html` | HTML-Textsenken und zwei Asset-Hashes                                    |
| `docs/tafel-vaillant-quellen.md`           | Quellenbeleg beziehungsweise Baunachweis                                 |
| `foerderung-hannover.html`                 | Nur zwei Asset-Hashes                                                    |
| `foerderung-jetzt-mitnehmen.html`          | Nur zwei Asset-Hashes                                                    |
| `foerderung.html`                          | Nur zwei Asset-Hashes                                                    |
| `foerdervorschuss.html`                    | Nur zwei Asset-Hashes                                                    |
| `gasheizung-tauschen-oder-reparieren.html` | Nur zwei Asset-Hashes                                                    |
| `hinweise.html`                            | Nur zwei Asset-Hashes                                                    |
| `index.html`                               | Nur zwei Asset-Hashes                                                    |
| `js/site.js`                               | Punkte 1–7: Browserausgabe                                               |
| `karriere.html`                            | Nur zwei Asset-Hashes                                                    |
| `kontakt.html`                             | Nur zwei Asset-Hashes                                                    |
| `kostenvergleich-waermepumpe.html`         | HTML-Textsenken und zwei Asset-Hashes                                    |
| `package.json`                             | WR-Vertragsprüfung im bestehenden TAFEL-Gate                             |
| `preise.html`                              | Nur zwei Asset-Hashes                                                    |
| `propan-waermepumpe.html`                  | Nur zwei Asset-Hashes                                                    |
| `prozess.html`                             | Nur zwei Asset-Hashes                                                    |
| `ratgeber.html`                            | Nur zwei Asset-Hashes                                                    |
| `rechner.html`                             | Nur zwei Asset-Hashes                                                    |
| `tests/helpers/t1087-datenblatt.cjs`       | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung |
| `tests/t1087-beschriftung.cjs`             | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung |
| `tests/t1087-datenblatt.cjs`               | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung |
| `tests/t1087-geraetetyp.cjs`               | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung |
| `tests/t1087-herstellerreiter.cjs`         | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung |
| `tests/t1087-jaz.cjs`                      | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung |
| `tests/t1087-wr.cjs`                       | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung |
| `tests/t1087-wr.spec.js`                   | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung |
| `waermepumpe-altbau.html`                  | Nur zwei Asset-Hashes                                                    |
| `waermepumpe-hannover.html`                | Nur zwei Asset-Hashes                                                    |
| `waermepumpe-laerm.html`                   | Nur zwei Asset-Hashes                                                    |
| `waermepumpenstrom-hannover.html`          | Nur zwei Asset-Hashes                                                    |
| `wertsteigerung-waermepumpe.html`          | Nur zwei Asset-Hashes                                                    |
| `wp-kosten-hannover.html`                  | Nur zwei Asset-Hashes                                                    |

Gesamt: 42 Dateien. Kein API-, Tabellen-, Preis- oder Workflow-Eingriff. `scripts/make-ionos-bundle.sh` schließt ausschließlich den neu angelegten internen `BERICHT_WR.md` aus dem öffentlichen Bündel aus; der erste CI-Lauf hatte ihn ansonsten korrekt als unbekannte Laufzeit-Datei zurückgewiesen.

Zusätzliche Datei: `scripts/make-ionos-bundle.sh`, eine konkrete Ausschlusszeile für den internen Baunachweis.
