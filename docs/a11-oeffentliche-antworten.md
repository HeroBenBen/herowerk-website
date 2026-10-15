# Öffentliche Rechnerantworten ohne interne Auslegungsleistung

A11, Freigabe einschließlich Nachauftrag 2 vom 15.10.2026. Die Änderung betrifft ausschließlich die PHP-Ausgabe der Website. Interne Rückgaben, Preisanker, Katalog, Tabellen und Apps Script bleiben unverändert.

## Herstellerleistung in der Preisantwort

Die öffentliche Ausgabe von `hw_preise` wird in `api/rechner.php` projiziert. Der Rechenkern einschließlich direkter Aufrufe bleibt bytegleich zur Basis. Die Projektion verwendet nur die folgenden exakten Modellnamen auf Herstellertexte. Klasse, Reihenfolge und ähnlich geschriebene Modelle beeinflussen die Zuordnung nicht. Wolf und Vaillant 8.1 behalten ihre vorhandenen Preistexte.

| Modell                 | Öffentliches `kw`  |
| ---------------------- | ------------------ |
| Vaillant VWL 55/7.1 A  | 4,84 kW (A-7/W35)  |
| Vaillant VWL 75/7.1 A  | 6,37 kW (A-7/W35)  |
| Vaillant VWL 115/7.1 A | 11,12 kW (A-7/W35) |

Primärquellen, am 15.10.2026 frisch geladen und visuell geprüft:

- [Vaillant-Produktinformation aroTHERM pro](https://www.vaillant.de/api/download/product/de/flyer_produktinfo-arotherm-pro_1511399.pdf), Stand 07/26, Seite 2. SHA-256: `8253b4204b1bb4b0ae3c29229410aae54dc548c3837fa6832f32db4e49e76811`.
- [Installations- und Wartungsanleitung](https://www.vaillant.de/api/download/product/de/installationsanleitung_arotherm-pro_1500353.pdf), `8000026880_02`, Seite 53, Heizleistung A-7/W35. SHA-256: `3ca4a13ae9fcd5a5c4e246e91cb0344e0649081444801cb34264fbd51b0721fb`.

Die gesonderte Maximalzeile mit 11,08 kW wird nicht verwendet. Die drei Zahlen stammen einheitlich aus derselben Herstellerzeile.

## Öffentliche Grenze

`leistung_kw` und `puffer` entfallen rekursiv, einschließlich aller Marken und Varianten. Auch zusätzliche Schlüssel mit Präfix `puffer` werden entfernt. Die Speicherempfehlung mit Bezeichnung, Litern, größerer Variante und ohne-Puffer-Kennung bleibt ausschließlich intern; öffentlich fehlt das Feld vollständig. Die interne Ausgabe von `hw_dimensionierung` behält das Feld und sämtliche übrigen Kennzahlen für den Vertrieb.

Vor der Serialisierung entfernt der öffentliche Filter zunächst rekursiv alle festgelegten Innenfelder und `puffer*` samt Unterbäumen. Erst danach prüft er den verbleibenden öffentlichen Inhalt auf Betriebspunkttexte bei A-11. Ein solcher Text innerhalb bereits entfernter Speicher- oder Leistungsdaten verursacht deshalb keinen Fehler der öffentlichen Antwort. Auch Unterstriche vor `A`, geschützte Bindestriche, Leerzeichen, unterschiedliche Schreibweisen des Minuszeichens und JSON-Escapes werden erfasst. Die Erkennung gilt ebenso für Feldnamen. `A-7/W35` und `A-110` bleiben zulässig. Die Zahl minus elf bleibt als Ortsklimawert zulässig.

Ein belastetes nicht tragendes Textfeld wird vollständig entfernt. Es wird kein leerer Text und kein Ersatzwert eingesetzt. Die explizite Liste umfasst `kw`, `leistung_kw`, `hinweis`, `hinweise`, `beschreibung`, `beschreibungen`, `description`, `descriptions`, `strom_hinweis`, `antragHinweis` und `installHinweis`. Reine Textlisten können als solches Feld entfallen. Eingebettete Objekte werden rekursiv geprüft, damit ein belastetes Modell oder ein Preis nicht durch das Entfernen eines übergeordneten Hinweisfeldes verdeckt wird. Eine Entfernung wird mit Route, Pfad und Grund serverseitig protokolliert, ohne den Feldinhalt zu protokollieren.

Bei A-11 in tragenden oder nicht sicher einordenbaren Feldern gilt HTTP 503 mit `{"error":true,"message":"calculator_temporarily_unavailable"}`. Dazu gehören Modell, Preis, Eigenanteil, Marker und Förderbetrag. Es werden keine internen Fehlerdetails ausgegeben.

Ein unbekanntes Modell mit A-11 ausschließlich in `kw` behält sein Modell, seinen Preis und seinen Eigenanteil. Nur `kw` fehlt. Die Website liest dieses API-Feld nicht für ihre Darstellung; sie verwendet modellgebundene Herstellerdaten. Deshalb bleiben Karte und Förderauswahl erhalten. Bei einem belasteten `strom_hinweis` verwendet der vorhandene Renderer seinen normalen Ersatztext.

Schema 2 und Schema 3 verwenden denselben Schutz. Der abgeschaltete Google-Durchreichezweig bleibt abgeschaltet und prüft bei einer späteren Aktivierung ebenfalls die dekodierte Antwort, einschließlich derselben Preisprojektion. Ungültiges JSON beziehungsweise eine unsichere Antwortstruktur wird neutral abgewiesen. Der interne Snapshot-Serialisierer wurde nicht verändert.

## Prüfung und Zuständigkeit

`npm run verify:a11` prüft den echten PHP-Einstieg über einen isolierten HTTP-Server. Zusätzliche Vorherbasis des Nachauftrags ist `e359ec7d28d462cd97ae6af78c4e262a40182d4d`: alle regulären Antworten werden bis auf die expliziten Feldentfernungen bytegleich verglichen, einschließlich Zahlenschreibweise und Reihenfolge. Die Einschleusungsfälle des Prüfers und eine gezielt ausgeschaltete Pufferentfernung sind enthalten. Das unabhängige Prüforakel normalisiert Zeichen vor der Suche. Vorherbasis der ursprünglichen A11-Prüfungen bleibt der unveränderte Merge-Commit von PR 149, `99a95ae9b386dd76763e60577b9cde6172c27598`. Die Testdaten kombinieren bereits versionierte synthetische Snapshot-/Katalogdaten und aufgezeichnete öffentliche Antworten. Geldwerte, Förderbeträge, Gerätebindung, Marker und vollständige interne Rückgaben werden gegen diese Basis verglichen. Schema 2/3, umgeordnete Klassen, Unicode-Varianten, tiefe Verschachtelung, Feldentfernung, Fehlerverträge, der stillgelegte Durchreicheweg und eine ausgeschaltete Schutzfunktion werden geprüft. Testtransporte sind lokal abgefangen, Mailversand und Zugriff außerhalb der eigenen temporären Laufzeitordner sind gesperrt.

`tests/a11-oeffentliche-antworten.spec.js` ergänzt die vorhandene Smoke-Kette um den tatsächlichen Browser: bekannte und unbekannte Modelle, erhaltene Preise und Förderoptionen, Dimensionierung, Hinweisersatz und neutrale Fehleranzeige. Die eingespeisten Nachherantworten werden mit den echten PHP-Projektions- und Filterfunktionen erzeugt; deren HTTP-Anbindung prüft die separate Vertragskette.

Der Konfigurator-`doGet` und der Website-Spiegel `apps-script/rechner-backend/Code.gs` gehören in einen gesonderten Auftrag der Steuerung Konfigurator. Der historische Vergleich `scripts/compare-rechner-php.mjs` liest `kw` und kann nach dieser absichtlichen Änderung keine vollständige öffentliche PHP-/Apps-Script-Gleichheit mehr behaupten. Die Google-Seite des Vergleichs wird zusätzlich ausschließlich um `leistung_kw` und `puffer` bereinigt. Alle anderen Vergleichszusicherungen bleiben erhalten. Die öffentlichen JSON-Erwartungsdaten verlieren ausschließlich ihre Pufferfelder; interne Snapshotverträge bleiben unverändert. Kein Blattwrite und keine Apps-Script-Auslieferung in A11.

Nachauftrag 2 vergleicht zusätzlich mit `2abe040f235b4fe50212518f599e0946b46da364`, ohne weitere Feld- oder Wertausnahmen. Eine einzelne geänderte interne Pufferzelle, Texte in Literangabe und größerer Variante sowie Puffer-/Leistungsdaten innerhalb von Varianten und Kaskaden müssen HTTP 200 mit identischer öffentlicher Antwort ergeben. Gleichzeitige belastete öffentliche Modelle, Preise, Förderbeträge oder Marker bleiben HTTP 503. Eine isoliert wiederhergestellte alte Prüfreihenfolge muss den neuen Test erneut rot werden lassen. Die interne Rechnung und die bestehende Protokollierung bleiben erhalten.
