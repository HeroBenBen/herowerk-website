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
- A11: 169 Prüfgruppen lokal grün, einschließlich der vollständigen Kernvergleiche. A11-API-Schutz und seine fachlichen Zusicherungen unverändert; zwei Browser-Erwartungen für Antworten des historischen Filters folgen ausdrücklich der neuen wörtlichen Textausgabe aus Punkt 7.
- 74 API-, Rechenkern- und Fixture-Dateien bytegleich zur Baubasis; zusätzlich 18 öffentliche Antwortkörper aller action-Routen und zehn Förder-Paketfälle mit identischen lokalen Tabellen direkt bytegleich verglichen; keine Änderung an Preisen, Eigenanteilen, Förderbeträgen, Katalogbindung oder API.
- Chromium und WebKit lokal durch die Sandbox beim Start blockiert. Chromium: `bootstrap_check_in … Permission denied (1100)`, WebKit beendet beim Start. Kein lokaler Sichtlauf behauptet. Leitstand übernimmt die lokale Sichtabnahme.
- `tests/t1087-wr.spec.js` prüft Chromium/WebKit bei 375/1440 px: Geometrie, beide Reiter und sämtliche Datenblätter, Förderauswahl, Dimensionierung, beide Kostenvergleichsseiten; Basis/Bau mit identischen Antwortbytes. Screenshots und Messungen unter `artifacts/tafel-sicht/wr/`, im vorhandenen CI-Artefakt `tafel-sicht`.
- Verbindlicher CI-Nachweis am endgültigen Kopf: [Checks des Entwurfs-PR 151](https://github.com/HeroBenBen/herowerk-website/pull/151/checks). Maßgeblich ist der neueste Kopf mit allen Checks auf SUCCESS; abgebrochene Zwischenläufe gelten nicht als Abschluss. Der Auftrag wird erst bei vollständig grünem Kopf abgeschlossen.

## Dateiliste und Überschneidung

Die Planung nannte 32 HTML-Kandidaten. Nachmessung: vier Treffer stehen nur in Kommentaren (`anfrage.html`, `datenschutz.html`, `impressum.html`, `stelle.html`) und laden die geänderten Assets nicht. Sie bleiben unverändert. Notwendig sind **56 Hashverweise in 28 HTML-Dateien**, damit der einjährige Asset-Cache die Korrekturen erhält. Davon ändern 26 ausschließlich Versionsverweise; die zwei Kostenvergleichsseiten schließen zusätzlich die geplanten Inline-Textsenken.

Überschneidung mit den neun Dateien aus PR 150: `package.json` und `tests/a11-oeffentliche-antworten.spec.js`. WR ergänzt `verify:tafel` und passt zwei Browser-Erwartungen für historische API-Antworten an Punkt 7 an. Der aktuelle API-Schutz, seine Fehlerantworten und `verify:a11` bleiben unverändert.

| Datei                                      | Zweck                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `BERICHT_WR.md`                            | Quellenbeleg beziehungsweise Baunachweis                                                            |
| `amortisation-waermepumpe.html`            | Nur zwei Asset-Hashes                                                                               |
| `barrierefreiheit.html`                    | Nur zwei Asset-Hashes                                                                               |
| `baubarkeitspruefung.html`                 | Nur zwei Asset-Hashes                                                                               |
| `bewerbung.html`                           | Nur zwei Asset-Hashes                                                                               |
| `css/site.css`                             | Punkte 1–3: eng begrenzte Darstellung                                                               |
| `dimensionierung-verstehen.html`           | Nur zwei Asset-Hashes                                                                               |
| `dimensionierung.html`                     | Nur zwei Asset-Hashes                                                                               |
| `docs/intern/kostenvergleich-berater.html` | HTML-Textsenken und zwei Asset-Hashes                                                               |
| `docs/tafel-vaillant-quellen.md`           | Quellenbeleg beziehungsweise Baunachweis                                                            |
| `foerderung-hannover.html`                 | Nur zwei Asset-Hashes                                                                               |
| `foerderung-jetzt-mitnehmen.html`          | Nur zwei Asset-Hashes                                                                               |
| `foerderung.html`                          | Nur zwei Asset-Hashes                                                                               |
| `foerdervorschuss.html`                    | Nur zwei Asset-Hashes                                                                               |
| `gasheizung-tauschen-oder-reparieren.html` | Nur zwei Asset-Hashes                                                                               |
| `hinweise.html`                            | Nur zwei Asset-Hashes                                                                               |
| `index.html`                               | Nur zwei Asset-Hashes                                                                               |
| `js/site.js`                               | Punkte 1–7: Browserausgabe                                                                          |
| `karriere.html`                            | Nur zwei Asset-Hashes                                                                               |
| `kontakt.html`                             | Nur zwei Asset-Hashes                                                                               |
| `kostenvergleich-waermepumpe.html`         | HTML-Textsenken und zwei Asset-Hashes                                                               |
| `package.json`                             | WR-Vertragsprüfung im bestehenden TAFEL-Gate                                                        |
| `preise.html`                              | Nur zwei Asset-Hashes                                                                               |
| `propan-waermepumpe.html`                  | Nur zwei Asset-Hashes                                                                               |
| `prozess.html`                             | Nur zwei Asset-Hashes                                                                               |
| `ratgeber.html`                            | Nur zwei Asset-Hashes                                                                               |
| `rechner.html`                             | Nur zwei Asset-Hashes                                                                               |
| `scripts/make-ionos-bundle.sh`             | Genau eine Ausschlusszeile für den internen Baunachweis                                             |
| `tests/a11-oeffentliche-antworten.spec.js` | Zwei historische Browser-Erwartungen auf wörtliche Antworttexte umstellen; API-Verträge unverändert |
| `tests/fixtures/t1087-wr-runde5.json`      | Unveränderter Original-Prüfbeleg aus A11 Runde 5                                                    |
| `tests/helpers/t1087-datenblatt.cjs`       | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung                            |
| `tests/t1087-beschriftung.cjs`             | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung                            |
| `tests/t1087-datenblatt.cjs`               | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung                            |
| `tests/t1087-geraetetyp.cjs`               | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung                            |
| `tests/t1087-geraetetyp.spec.js`           | Browsererwartung nach Folgeabruffehler auf den freigegebenen neutralen Mindestpreis aktualisieren   |
| `tests/t1087-herstellerreiter.cjs`         | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung                            |
| `tests/t1087-jaz.cjs`                      | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung                            |
| `tests/t1087-wr.cjs`                       | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung                            |
| `tests/t1087-wr.spec.js`                   | Rot/Grün, Sichtvergleich beziehungsweise gezielte Bestands-Testanpassung                            |
| `waermepumpe-altbau.html`                  | Nur zwei Asset-Hashes                                                                               |
| `waermepumpe-hannover.html`                | Nur zwei Asset-Hashes                                                                               |
| `waermepumpe-laerm.html`                   | Nur zwei Asset-Hashes                                                                               |
| `waermepumpenstrom-hannover.html`          | Nur zwei Asset-Hashes                                                                               |
| `wertsteigerung-waermepumpe.html`          | Nur zwei Asset-Hashes                                                                               |
| `wp-kosten-hannover.html`                  | Nur zwei Asset-Hashes                                                                               |

Gesamt: **45 Dateien**. Kein API-, Tabellen-, Preis- oder Workflow-Eingriff. Der Bündelwächter hatte den neuen internen `BERICHT_WR.md` im ersten CI-Lauf korrekt als unbekannte Laufzeit-Datei abgewiesen. Die konkrete Ausschlusszeile hält ihn aus dem öffentlichen Bündel heraus. Lokaler Bündelbau und Gleichheitsprüfung (124 Dateien) danach grün.

## Abschlussinventar der Textsenken

AST-Nachmessung aller fünf Dateien in `js/`: 36 HTML-Zuweisungen, davon 34 in `site.js`, zwei in `theme.js`. Keine `outerHTML`- oder `insertAdjacentHTML`-Ausgabe. Chart.js, Consent und Kurzbewerbung enthalten keine dieser Senken. Die zwei Theme-Ausgaben bestehen aus eigenen Symbolen und Beschriftungen.

`js/site.js` – sämtliche `innerHTML`-Zuweisungen am Produktstand `d961de2`: Zeilen 3, 437, 445, 454, 462, 980, 1037, 1050, 1479, 2055, 2110, 2113, 2127, 2159, 2166, 2251, 2255, 2451, 2460, 2464, 2475, 2482, 2537, 2541, 2593, 2599, 2657, 2715, 2717, 2760, 2829, 2853, 2857, 3273. `js/theme.js`: Zeilen 52 und 60. Die Datenflüsse J1–J10 und K1–K15 sind im freigegebenen `PLAN_WR.md`, Abschnitt 8, einzeln mit Basis-Fundstellen dokumentiert.

| Relevanter Weg                                                                                                                                                                                       | Absicherung am Bau                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Dimensionierung: Hinweis, Modell, Baureihe, Varianten/Fallback, latenter Modellhelfer                                                                                                                | `paEscapeHtml` an Textteilen; Empfehlungsabzeichen und Struktur separat                                                                        |
| Förderantragsoptionen: Schlüssel, Beginn, Beschriftung                                                                                                                                               | DOM-Optionen über `value`, `dataset.ab`, `textContent`                                                                                         |
| Fördertreppe: Zeiträume, Labels, Quote, Titel und ARIA                                                                                                                                               | Text-/Attributescaping; eigene Balkenstruktur und Fußnoten bleiben                                                                             |
| Förderbausteine                                                                                                                                                                                      | Textescaping vor Einsetzen in eigenes Zeilen-Markup                                                                                            |
| Preistafel: lokale Karten-/Datenblatttexte, Info, Bildattribute                                                                                                                                      | Text-/Attributescaping; bekannte SVG-Symbole bleiben eigenes Markup; Technik stammt weiter ausschließlich aus bekannten Herstellervorlagen     |
| Beide Kostenvergleiche: Bootstrap-Optionen, Treppe, Quote/Badges, Karten, Rechenweg, mobile Jahre, Datentabellen, Cashflow, CO₂, Annahmen, Liveförderung, Förderaufbau, Hero und latenter Chiphelfer | Eigenes Inline-`kvText` an jeder Textgrenze; Diagramme bekommen ihre ursprünglichen Rohlabels für Canvas; keine Vorabkodierung des API-Objekts |
| Klima und Vorschussplätze                                                                                                                                                                            | Bereits Text-DOM beziehungsweise validierte Zahlen; unverändert                                                                                |
| Health/fehlende/unbekannte action                                                                                                                                                                    | Kein Browser-HTML-Verbraucher; unverändert                                                                                                     |
| FAQ, feste PLZ-/Heizungs-/WEG-/Fehler-/Animationsbausteine                                                                                                                                           | Nur eigenes Seiten-Markup, lokale feste Wortlisten oder bereits validierte Zahlen, keine Rechnerantwortstücke                                  |

Der tatsächlich durchgelassene Prüfer-Antwortkörper aus `A11/pruef/runde5/belege/kleiner-vergleich-markup-s3.json` liegt bytegleich als `tests/fixtures/t1087-wr-runde5.json` vor (SHA-256 `408d27e27b85bd9ea07d8d0ebe012418eff7ccd6876482268564c1f5c683563a`). Die Browserprobe spielt dieselben Bytes an Basis und Bau ein und prüft die unterschiedlichen Textausgaben und die Zahl eingefügter `span`-Knoten. Zusätzliche harmlose Anführungszeichen-/Attributfälle prüfen, dass kein `data-wr-injected`-Attribut entsteht.

Die zusätzliche Fixture ist in der obigen Dateiliste enthalten. Die abschließend gemessene PR-150-Schnittmenge steht oben und umfasst zwei Dateien.

## Erste gerenderte WR-Nachweise und Nachbesserung der Prüfung

In CI-Lauf [38758139543](https://github.com/HeroBenBen/herowerk-website/actions/runs/38758139543) bestanden die acht gezielten WR-Gruppen (Punkte 1–6 und Textsenken, jeweils Chromium/WebKit bei 375/1440 px). Alle Vaillant-Kennwerte liegen auf einer Zeile. Mobil bei beiden Browsern und allen Klassen: `#paDetail` 327 px breit, `scrollWidth` 327 px. Wolf XXL: Chromium 1665,09 px, WebKit 1637,88 px Panelhöhe; beide Links vollständig innerhalb des Panels. Desktop: Panel 1100/1100 px. Screenshots und DOM-Protokolle wurden als Artefakt `tafel-sicht` gesichert und nach `WR/pruef/ci-50fc/` heruntergeladen.

Die Original-Runde-5-Probe bestand anschließend in Lauf 38759975551 ebenfalls in allen vier Browser-/Breitenkombinationen. Beide Läufe wurden wegen eines fehlerhaften zusätzlichen Regelfall-Prüfpfads beendet: Die interne Beraterseite hat fünf Reiter, keinen Kunden-Wizard. Der Test nutzt jetzt die tatsächlichen fünf Reiter beziehungsweise die fünf Kundenschritte. Zusätzlich war im bestehenden Browser-Vertrag noch der alte Mindestpreis nach einem Abruffehler vorgeschrieben; diese Erwartung folgt jetzt Punkt 5. Das ändert keine fachliche Berechnung.

Sichtkontrolle der ersten Feldaufnahmen: Vaillant-Gerät und Preis sind vollständig sichtbar. WebKit zählte jedoch den transparenten nativen Auswahltext als seitlichen Überstand (Gesamtaufnahme S 432 px, XXL 477 px statt 375 px; Wolf weiterhin 375 px). Deshalb wird ausschließlich dessen gemeinsame Feldfläche begrenzt; die umbrechende sichtbare Beschriftung passt weiterhin vollständig hinein. Eine zusätzliche Browser-Zusicherung verlangt nun auch für jede Vaillant-Auswahl eine Seitenbreite von höchstens 375 px. Keine globale Überlaufunterdrückung. Auswahlwechsel, Neuabruf und Fokus werden gesondert geprüft.

Der latente Chiphelfer der Beraterseite verwendet die Anrede „Ihre Angabe“ statt „Deine Angabe“. Auch seine Textgrenze ist jetzt ausdrücklich abgesichert; unabhängige lokale Rot/Grün-Proben prüfen die Texthelfer beider Dateien einschließlich dieser nicht aufgerufenen Funktion. Die folgenden Abschlussläufe prüfen diese Nachbesserungen am Kopf erneut.

## Abnahmeverweise

- [Entwurfs-PR 151 mit aktuellem Kopf](https://github.com/HeroBenBen/herowerk-website/pull/151)
- [CI-Checks genau dieses Kopfes](https://github.com/HeroBenBen/herowerk-website/pull/151/checks)
- Browsernachweise: Artefakt `tafel-sicht`, Unterverzeichnis `wr/gruen` im zugehörigen Lauf. Dateien mit `basis` im Namen zeigen ausdrücklich die unveränderte Baubasis; die Verzeichnisbezeichnung allein bezeichnet keine bestandene Basisprüfung.
- Lokaler Plan: `WR/PLAN_WR.md`. Lokale Prüfprotokolle, heruntergeladene CI-Aufnahmen und Analyse-Ausschnitte: `WR/pruef/`.

Keine automatische Zusammenführung eingerichtet. Kein Deployment ausgeführt. Die lokale Sichtabnahme durch den Leitstand bleibt wegen der Browser-Sandbox bestehen; die CI liefert zusätzlich echte Chromium-/WebKit-Aufnahmen und DOM-Messungen.

## Abschlusskorrektur der Browserverträge

Lauf 38766797325 bestand alle acht gezielten WR-Browsergruppen einschließlich WebKit-Seitenbreite sowie drei der vier vollständigen Regelfallvergleiche. Der vierte Vergleich zählte in WebKit bei 375 px die unsichtbaren nativen Optionslisten anders, sobald ihr Überlauf begrenzt war. Der Test vergleicht deshalb sämtliche Optionswerte und -texte sowie die ausgewählte Option separat vollständig und exakt; der übrige Seitenwortlaut wird ohne native Liste und ihre doppelte Textschicht verglichen. Kein Pakettext entfällt aus der Zusicherung.

Vier vorhandene A11-Browserfälle erwarteten noch, dass Antworten eines historischen API-Filters im aktuellen Browser als HTML dekodiert werden. Genau diese Senke schließt Punkt 7. Zwei Erwartungszeilen (je 375/1280 px) prüfen nun den wörtlichen Eingabetext. Die bestehenden Zusicherungen für die aktuelle 503-Antwort und den neutralen Fehlerzustand bleiben unverändert. Keine API-Änderung und kein Abschwächen des A11-Filters. Dateiliste abschließend 45, Schnittmenge mit PR 150: `package.json` und `tests/a11-oeffentliche-antworten.spec.js`.

Die heruntergeladenen Aufnahmen aus Lauf 38766797325 bestätigen die WebKit-Korrektur: Vaillant-XXL-Gesamtaufnahme exakt 375 px breit (ebenso Chromium), Gerätetyp und 85.604 € vollständig lesbar. In allen vier Browser-/Breitenkombinationen kein Panelüberlauf, alle Links innerhalb; mobil 327/327 px, Desktop 1100/1100 px. Artefakte lokal unter `WR/pruef/ci-ef087/`. Der identische Lauf am reinen Berichtskopf wurde nach dem bekannten Testvertragsbefund beendet; Abschlussnachweis bleibt der vollständig grüne neueste PR-Kopf.

Der ergänzende Bildvergleich zeigte außerdem zeitabhängige Positionen der festen Navigation und Seitenleiste nach weichem Wizard-Scrollen. Der Screenshot-Helfer fordert deshalb nach Bild-/Schriftladung in beiden Fassungen den Seitenanfang an und wartet zwei Renderframes. Eine zunächst verwendete starre Wartebedingung auf exakt `scrollY === 0` führte in Chromium zu Zeitüberschreitungen und wurde entfernt; solche Zwischenläufe gelten nicht als Abschlussnachweis. Das verändert ausschließlich die Aufnahmebedingungen, keine Website-Funktion. Wort- und Optionsvergleiche bleiben vollständig erhalten.

## Nachauftrag 1

Auftrag: `NACHAUFTRAG_1.md`, Leitstand Kundenportal und Web 98, 15.10.2026, 21:2x. Unmittelbare Korrekturbasis: `0ea2c8f0f970c11e8fd163e54c47af64ff4538c6`; ursprüngliche WR-Baubasis nach Zusammenführung von PR 150: `40951542b4903adde7cc1e694a96fa81a41a7197`. Derselbe eigene Klon, derselbe Zweig und Entwurfs-PR 151. Keine Änderung an Punkten 2–7.

### Ursachen und Änderungen

1. `css/site.css:7059`: Die spätere mobile Vaillant-Regel setzt `color: transparent !important`. Sie überstimmt damit die gleich spezifische, wichtige Hellmodus-Farbe aus Zeile 4858. Die Begrenzung auf höchstens 600 px und `.foerder-package-field.is-vaillant > select` bleibt bestehen. Die Optionsliste behält ihre eigenen Vorder- und Hintergrundfarben; Overlay, Feldgeometrie und Bedienung bleiben unverändert. Sichtbar bei 375 px vorher im Hellmodus: zwei überlagerte Gerätebeschriftungen. Nachher: genau einmal „Vaillant aroTHERM pro VWL 55/7.1 A“ mit vollständigem „29.944 €“ darunter. Dunkelmodus, Wolf und 1440 px behalten ihr Sollbild und ihren Wortlaut.
2. `tests/t1087-wr.spec.js:76`: `settleCostComparison` wartet auf geladene Schriften, den bereits eingeplanten Renderdurchlauf und die abgeschlossene Initialisierung aller mobilen Klappbereiche. Vor jedem Kostenvergleich-Wortabzug werden außerdem Kennung, Zusammenfassung und Offen-/Geschlossen-Zustand sämtlicher Klappbereiche erfasst und zwischen den Fassungen exakt verglichen. Die explizit geöffneten Ergebnisdetails werden erst nach der Aufbereitung geöffnet und auf ihren Zustand geprüft. Kein festes Zeitwarten hinzugefügt. Die Website selbst und ihre Kostenvergleichsberechnung ändern sich nicht.

Rot zu Punkt 2 ist im unabhängigen Prüferlauf an `0ea2c8f` dokumentiert: `WR/pruef/pruefer1/browser-produkttests.log:20`, WebKit 375, Schritt 5. Der alte Test verglich den noch offenen Text „So kommen wir auf diese Zahl:“ mit der bereits aufbereiteten geschlossenen Zusammenfassung „So entsteht dein Ergebnis“. Die neue Zusicherung verlangt gleiche Klappzustände und den gesamten gleichen Seitenwortlaut.

### Dateiliste dieses Nachauftrags

Gegen `0ea2c8f`: **31 Dateien**. Produktänderung ausschließlich die CSS-Deklaration samt erläuterndem Kommentar; zusätzlich Test und Bericht sowie 28 notwendige CSS-Versionsverweise. Das Versionsskript meldet 79 Assets, 33 geprüfte Seiten und genau 28 aktualisierte Referenzen. Ohne neuen Inhaltsfingerabdruck würden bereits besuchte Seiten die alte CSS-Datei aus dem Cache weiterverwenden. Keine Änderung der JS-Versionen und keine zusätzlichen Eingriffe in die früher diskutierten 32 Versionsstellen.

| Datei                                      | Änderung und Grund                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `css/site.css`                             | Nur mobile Vaillant-Transparenz auch gegen die wichtige Hellmodus-Regel durchsetzen. |
| `tests/t1087-wr.spec.js`                   | Zustandsabhängiger Wortvergleich, Themen-Rot/Grün und zehn WebKit-Wiederholungen.    |
| `BERICHT_WR.md`                            | Dieser Nachweisabschnitt.                                                            |
| `amortisation-waermepumpe.html`            | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `barrierefreiheit.html`                    | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `baubarkeitspruefung.html`                 | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `bewerbung.html`                           | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `dimensionierung-verstehen.html`           | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `dimensionierung.html`                     | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `docs/intern/kostenvergleich-berater.html` | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `foerderung-hannover.html`                 | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `foerderung-jetzt-mitnehmen.html`          | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `foerderung.html`                          | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `foerdervorschuss.html`                    | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `gasheizung-tauschen-oder-reparieren.html` | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `hinweise.html`                            | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `index.html`                               | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `karriere.html`                            | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `kontakt.html`                             | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `kostenvergleich-waermepumpe.html`         | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `preise.html`                              | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `propan-waermepumpe.html`                  | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `prozess.html`                             | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `ratgeber.html`                            | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `rechner.html`                             | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `waermepumpe-altbau.html`                  | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `waermepumpe-hannover.html`                | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `waermepumpe-laerm.html`                   | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `waermepumpenstrom-hannover.html`          | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `wertsteigerung-waermepumpe.html`          | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |
| `wp-kosten-hannover.html`                  | Ausschließlich Inhaltsfingerabdruck von `css/site.css`.                              |

### Browsernachweise und Aufnahmen

Die Ausführung erfolgt diesmal auch lokal mit echten Chromium-/WebKit-Browsern im vorhandenen Playwright-Container `mcr.microsoft.com/playwright:v1.60.0-noble`: kein Netz, schreibgeschützter Container und Repo-Mount, flüchtiges `/tmp`, eigener schreibbarer Belegordner. Die früher dokumentierte Einschränkung des direkten Browserstarts wird damit für diesen Nachauftrag durch echte lokale Browsernachweise ergänzt. Reproduktion und Protokolle: `WR/pruef/nachauftrag1/`.

Das Themenpaar startet jeweils direkt hell und direkt dunkel; anschließend wird über den vorhandenen Themenwechsel-Handler zweimal umgeschaltet. Gemessen werden native Schriftfarbe, Overlay-Farbe, Options-/Gruppenfarben, Feldmaße, Fokuszustand, sichtbare Outline, Rahmen und Schatten. Bei `outline-style: none` wird die nicht gezeichnete `currentColor` nicht als sichtbarer Fokusrahmen gewertet. Native Auswahlwechsel von S nach M prüfen die Bedienung und Synchronisierung der Beschriftung. Wolf und 1440 px werden mit denselben Messgrößen exakt gegen `0ea2c8f` verglichen.

Alle 24 Feldaufnahmen sowie die vollständigen Farbprotokolle liegen lokal unter `WR/pruef/nachauftrag1/browser/wr/nachauftrag1/`; in CI liegen dieselben Dateien im Artefakt `tafel-sicht` unter `wr/nachauftrag1/`. Beispielpaare für beide Browser:

| Browser / Thema bei 375 px | Vorher, `0ea2c8f`                                | Nachher, Korrektur                                |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| Chromium hell              | `chromium-vorher-375-light-0-light-vaillant.png` | `chromium-nachher-375-light-0-light-vaillant.png` |
| Chromium dunkel            | `chromium-vorher-375-dark-0-dark-vaillant.png`   | `chromium-nachher-375-dark-0-dark-vaillant.png`   |
| WebKit hell                | `webkit-vorher-375-light-0-light-vaillant.png`   | `webkit-nachher-375-light-0-light-vaillant.png`   |
| WebKit dunkel              | `webkit-vorher-375-dark-0-dark-vaillant.png`     | `webkit-nachher-375-dark-0-dark-vaillant.png`     |

Dateien mit `-1-` beziehungsweise `-2-` belegen die beiden anschließenden Themenwechsel. `chromium-farben.json` und `webkit-farben.json` enthalten alle Einzelmessungen, einschließlich Wolf und Desktop.

### Bytegleichheit und unveränderter Umfang

`WR/pruef/nachauftrag1/bytes-both-bases.log`: 74 API-, Rechenkern- und Fixture-Dateien bytegleich zu `4095154`; 75 bytegleich zu `0ea2c8f` (zusätzliche bereits freigegebene Runde-5-Fixture). Gegen **jede** Basis werden außerdem alle 18 öffentlichen Antwortkörper für sämtliche acht action-Routen und zehn Förderkombinationen byteweise verglichen, ohne entfernte Felder oder Zahlen-Normalisierung. Preise, Eigenanteile und Förderbeträge bleiben unverändert. Die zugehörige Probe `byte-probe.cjs` verwendet den vorhandenen API-Vertrag mit jeweils anderer Vergleichsbasis; sie verändert keinen Produktcode.

Alle 35 vorhandenen HTML-Dateien sind gegenüber `0ea2c8f` nach ausschließlich dem CSS-URL-Hash-Austausch bytegleich; alle fünf `js/`-Dateien sind vollständig bytegleich. Damit bleiben alle Produkttexte und die Implementierung der Punkte 2–7 gegenüber der Nachauftragsbasis unverändert. Die bereits genehmigte Herstellerkorrektur und wörtliche Textausgabe gegenüber der ursprünglichen WR-Basis bleiben Bestandteil der bestehenden Rot/Grün-Prüfung.

### Rot/Grün-Ergebnisse des Nachauftrags

| Zusicherung                                  | Rot / unveränderte Gegenprobe an `0ea2c8f`                                                                            | Grün an der Korrektur                                                                                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vaillant 375, Hellmodus, Chromium und WebKit | Native Schrift **und** Overlay `rgb(28, 43, 54)`: doppelte, überlagerte Beschriftung. Gilt auch nach Themenwechsel.   | Native Schrift `rgba(0, 0, 0, 0)`, Overlay weiterhin `rgb(28, 43, 54)`: eine lesbare Beschriftung, Preis vollständig.                                                                                                  |
| Vaillant 375, Dunkelmodus, beide Browser     | Bereits transparent; Overlay `rgb(255, 255, 255)`.                                                                    | Identische Farben, identische Feldgeometrie 297 × 96 px. Direkte Dunkelmodus-PNGs vorher/nachher bytegleich.                                                                                                           |
| Optionen, Fokus, Bedienung, Wolf und Desktop | Vergleichsgrößen an der unveränderten Basis erfasst.                                                                  | 96 Einzelmessungen über beide Browser/Fassungen, 375/1440 px, beide Startthemen und je zwei Themenwechsel. Optionsfarben sichtbar, Auswahlwechsel synchron, Rahmen/Schatten/Focus-visible-Zustand und Feldmaße gleich. |
| Kostenvergleich, WebKit 375, Schritt 5       | Unabhängiger Prüferlauf liest verschiedene Aufbereitungs-/Klappzustände und scheitert am vollständigen Wortvergleich. | **Zehn von zehn** separat ausgeführten Wiederholungen grün, ohne Retry und ohne festes Zeitwarten; gleiche Klappzustände und gesamter Seitenwortlaut.                                                                  |
| Bestehende WR-Regelfallvergleiche            | Ursprüngliche Basis `4095154` mit den genehmigten WR-Differenzen.                                                     | Alle vier vollständigen Vergleiche Chromium/WebKit × 375/1440 px grün, einschließlich der neuen Klappzustandsprüfung.                                                                                                  |

Lokale Ausführung: `wr-browser-final.log` enthält 23 bestandene Prüfungen und einen bestehenden WebKit-Transportfehler beim Seitenwechsel im P7-Test (`access control checks`), keinen fehlgeschlagenen Text- oder HTML-Senkenvertrag. Die unveränderte gezielte Wiederholung `webkit-antworttexte-nachpruefung.log` besteht ohne Retry (1/1). Sämtliche zwölf neuen Nachauftragsprüfungen bestehen im Gesamtlauf ohne Retry. Die ersten Versuche der Themen-Zusicherung verglichen noch die nicht gezeichnete Outline-Farbe bei `outline-style: none`; der korrigierte Vergleich prüft die sichtbare Outline sowie Rahmen und Schatten und verändert keine Fokusgestaltung im Produkt.

Weitere lokale Prüfungen grün: vollständiges Lint/Prettier, TypeScript ohne Ausgabe, TAFEL-Verträge einschließlich sieben Rot/Grün-Zusicherungen, Website-Gates, Asset-Versionen und beide API-Bytevergleiche. Protokolle und genaue Container-Befehle liegen unter `WR/pruef/nachauftrag1/BEFEHLE.md`.

Verbindlicher CI-Abschlussnachweis ist die [vollständige Checkliste des aktuellen PR-Kopfes](https://github.com/HeroBenBen/herowerk-website/pull/151/checks). Die neuen Prüfungen laufen dort als reguläre Smoke-Tests; die Aufnahmen werden im bestehenden Artefakt `tafel-sicht` gesichert. PR 151 bleibt Entwurf, ohne automatische Zusammenführung und ohne Auslieferung.
