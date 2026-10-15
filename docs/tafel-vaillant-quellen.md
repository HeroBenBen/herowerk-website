# Preistafel: Quellen der aroTHERM-pro-Daten und Bildzuordnung

Bauauftrag TAFEL, Anpassung 1, Freigabe im Chat am 15.10.2026. Herstellerdaten für Pro ergänzen; Wolf und Plus technisch wie Git-Stand `7840681dd2c7eb88b3a53f85c7e2da92fab2c4dc` wiederherstellen. Nachauftrag JAZ ergänzt die unten belegten Vaillant-Beispielwerte und ihren gerätebezogenen Fußtext. Kein Blattwrite und keine Änderung von Preisen, Eigenanteilen oder Gerätebindung. Die Förderauswahl bleibt ausschließlich Gerätetyp und Preis. Die Dimensionierungsanzeige bleibt unverändert.

## Primärquellen

Alle Onlinequellen abgerufen am 15.10.2026. PDF-Seiten zählen ab der ersten Dateiseite. Werte werden nicht aus Typbezeichnungen abgeleitet.

- V-INST: lokale Vaillant-Datei `/Users/benjaminbendler/Library/CloudStorage/GoogleDrive-b.bendler@herowerk.de/Meine Ablage/HeroPlan/11_Produkt/Vaillant/aroTHERM pro/installationsanleitung_arotherm-pro_1500353.pdf`, Dokument `8000026880_02`; [offizieller Download](https://www.vaillant.de/api/download/product/de/installationsanleitung_arotherm-pro_1500353.pdf).
- V-ERP: [ErP-Datenblatt](https://www.vaillant.de/api/download/product/de/erp-datenblatt_arotherm-pro_794700.pdf), Dokument `8000044664_01`.
- V-INFO: [Produktinformation](https://www.vaillant.de/api/download/product/de/flyer_produktinfo-arotherm-pro_1511399.pdf).
- V-WEB: [deutsche Vaillant-Produktseite](https://www.vaillant.de/produkte/arothermpro/), ErP sowie Leistung und Wirkungsgrad.
- N: `7840681dd2c7eb88b3a53f85c7e2da92fab2c4dc`, `js/site.js` und `preise.html`. Nur Bestandswiederherstellung für Wolf und Plus, keine neue fachliche Prüfung dieser Werte.

## Pro-Daten

| Feld                          | VWL 55/7.1 A                | VWL 75/7.1 A                | VWL 115/7.1 A               | Primärquelle                                                                                                                                                                                                                                               |
| ----------------------------- | --------------------------- | --------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kartenzeile                   | A-7/W35: 4,84 kW            | A-7/W35: 6,37 kW            | A-7/W35: 11,12 kW           | V-INST, S. 53, Zeile „Heizleistung, A-7/W35“; V-INFO S. 2 bestätigt.                                                                                                                                                                                       |
| Heizleistung A-7/W35 samt COP | 4,84 kW (COP 2,91)          | 6,37 kW (COP 2,66)          | 11,12 kW (COP 2,55)         | V-INST S. 53; V-INFO S. 2 bestätigt.                                                                                                                                                                                                                       |
| Heizleistung Pdesignh         | 5 kW                        | 7 kW                        | 11 kW                       | V-ERP S. 1, Prated und Fußnote zur Gleichsetzung mit Pdesignh; durchschnittliches Klima, W55. Beschriftung gemäß Nachauftrag 3: „Heizleistung (Pdesignh)“; die Prüfbedingung bleibt hier im Quellenhinweis dokumentiert. Kein unbelegtes W35 unterstellen. |
| Kältemittel                   | R290 (Propan, natürlich)    | R290 (Propan, natürlich)    | R290 (Propan, natürlich)    | V-INST S. 53; V-WEB bestätigt natürliches Kältemittel.                                                                                                                                                                                                     |
| Bauart                        | Monoblock, Außenaufstellung | Monoblock, Außenaufstellung | Monoblock, Außenaufstellung | V-INST S. 9, Produktbeschreibung. Keine Tower- oder Speicherbauart.                                                                                                                                                                                        |
| Vorlauftemperatur             | bis 70 °C                   | bis 70 °C                   | bis 70 °C                   | V-INST S. 52, Heizwassertemperatur.                                                                                                                                                                                                                        |
| Schallleistung ErP außen      | 49,0 dB(A)                  | 49,0 dB(A)                  | 54,8 dB(A)                  | V-INST S. 54, ausdrücklich ErP; V-INFO S. 2 bestätigt.                                                                                                                                                                                                     |
| Effizienzklasse 35 / 55 °C    | A+++ / A++                  | A+++ / A++                  | A+++ / A++                  | V-INFO S. 2, visuell gelesene Klassenpfeile; W55 zusätzlich V-ERP S. 1.                                                                                                                                                                                    |
| ηs 35 / 55 °C                 | 198 % / 145 %               | 192 % / 142 %               | 194 % / 143 %               | W35: V-INFO S. 2 und V-WEB; W55: V-ERP S. 1 und V-WEB. Quellenkonflikt bei L unten dokumentiert.                                                                                                                                                           |
| SCOP 35 / 55 °C               | 5,01 / 3,70                 | 4,87 / 3,62                 | 4,93 / 3,66                 | V-WEB, „Leistung und Wirkungsgrad“, Zeilen niedrige/mittlere Temperatur. Keine Umrechnung aus ηs.                                                                                                                                                          |
| JAZ Heizkörper                | 3,94                        | 3,86                        | 3,95                        | BWP-Rohantworten, Ergebnisfeld und Einzelquellen im Abschnitt „Freigegebene JAZ-Beispiele“.                                                                                                                                                                |
| JAZ Fußbodenheizung           | 4,49                        | 4,40                        | 4,50                        | BWP-Rohantworten, Ergebnisfeld und Einzelquellen im Abschnitt „Freigegebene JAZ-Beispiele“.                                                                                                                                                                |
| Abmessung B × T × H           | 1.104 × 454 × 750 mm        | 1.104 × 454 × 750 mm        | 1.169 × 454 × 1.103 mm      | V-INST S. 52; nur Reihenfolge der eindeutig benannten Maße umgestellt.                                                                                                                                                                                     |
| Hersteller                    | Vaillant GmbH               | Vaillant GmbH               | Vaillant GmbH               | V-ERP S. 2, Herstelleranschrift. Die Vertriebsfirma in der bisherigen Plus-Zeile ist kein Anlass, die Herstellerangabe des Pro-Datenblatts zu überschreiben.                                                                                               |

Nachauftrag 3 gleicht ausschließlich die Pdesignh-Beschriftung und die ausgeschriebene Kältemittelangabe an die Plus-Referenz an. Alle Zahlenwerte bleiben unverändert. Die Pro-Herstellerangabe bleibt bewusst „Vaillant GmbH“: V-ERP S. 2 nennt diese Firma als Herstelleranschrift; V-INST S. 60 unterscheidet sie als „Herausgeber/Hersteller“ vom „Lieferant“ Vaillant Deutschland GmbH & Co.KG. Diese sachliche Ausnahme ist im freigegebenen Plan begründet. Keine Änderung an Plus oder Wolf.

### Quellenkonflikte und JAZ-Lücke

- **L-Leistung:** V-INST S. 53 unterscheidet „Heizleistung A-7/W35“ mit **11,12 kW** von „Heizleistung maximal“ mit **11,08 kW**. Geplant ist die erste, zum COP gehörende Datenblattzeile; V-INFO S. 2 und V-WEB bestätigen sie. Nicht aus den Tabellen das jeweils größere oder scheinbar passendere Feld zusammensuchen.
- **L-Effizienz:** V-INFO S. 2 nennt bei W55 **145 %**, V-ERP S. 1 und V-WEB nennen **143 %**. Für den ErP-Wert gilt im Plan **143 %** aus dem ausdrücklich maßgeblichen ErP-Datenblatt. Den Widerspruch im Quellenprotokoll erhalten.
- **L-Schall:** V-ERP S. 1 rundet auf **55 dB(A)**; V-INST S. 54 und V-INFO S. 2 nennen **54,8 dB(A)**. Geplant ist der präzise ErP-Schallwert aus der Anleitung, kein Schalldruck und kein Maximalbetrieb.
- **JAZ:** Die bisherigen Plus-Werte stehen als Literale im Repo. Der Einführungscommit `211e940babdd01be29dcb1eacfd3cdaa921635a7` beschreibt „geeichte JAZ“ und eine korrigierte Klimabasis, enthält aber weder den zugehörigen Rechenlauf noch vollständige Eingangsparameter. Konkreter Befund: damaliges `js/site.js:1115` und `:1116` enthält **4,05 / 4,80** für das große Plus-Gerät; N übernimmt diese Werte. Repo-Suche nach JAZ, VDI und Quellen sowie Historie der Fußnote liefern keine reproduzierbare Geräteberechnung. Die JAZ-Eingabe im Kostenvergleich ist keine solche Methode. `produkte_HERO.json` enthält weitere feste Wolf-Werte und ebenfalls keinen Rechenweg.

## Freigegebene JAZ-Beispiele

Nachauftrag JAZ, Freigabe `go` am 15.10.2026. Die bisherige Zurückstellung der Pro-JAZ ist damit beendet. Quelle: [BWP-JAZ-Rechner](https://www.waermepumpe.de/werkzeuge/jaz-rechner/), Abruf 15.10.2026; Ergebnisfeld **`jazTotalWithSupplementaryHeater`**. Die unveränderten Originalantworten sind als Prüfquellen im Repository gesichert. [Index mit Gerätezuordnung und Prüfsummen](../tests/fixtures/jaz-bwp/index.json). Jede verlinkte Zahl steht in Dateizeile 1 im genannten Ergebnisfeld.

| Gerät         | Heizkörper                                           | Fußbodenheizung                                       |
| ------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| VWL 55/7.1 A  | [3,94](../tests/fixtures/jaz-bwp/final-5082-hk.json) | [4,49](../tests/fixtures/jaz-bwp/final-5082-fbh.json) |
| VWL 75/7.1 A  | [3,86](../tests/fixtures/jaz-bwp/final-5083-hk.json) | [4,40](../tests/fixtures/jaz-bwp/final-5083-fbh.json) |
| VWL 115/7.1 A | [3,95](../tests/fixtures/jaz-bwp/final-5085-hk.json) | [4,50](../tests/fixtures/jaz-bwp/final-5085-fbh.json) |
| VWL 125/8.1 A | [4,21](../tests/fixtures/jaz-bwp/final-5077-hk.json) | [4,80](../tests/fixtures/jaz-bwp/final-5077-fbh.json) |

Die Zuordnung wurde selbst gegen `/Users/benjaminbendler/code/_t1087_s94/JAZ/WERTE_JAZ.json` und die dort referenzierten Originalantworten gemessen. Die Werte sind berechnete Beispiele für Raumheizung und Warmwasser einschließlich erforderlichem elektrischem Zusatzheizer, keine Herstellerdatenblattwerte und keine gemessenen Anlagenwerte. Keine Umrechnung aus SCOP und keine zusätzliche Rundung. Für die Kaskadenkarte bleibt es ausdrücklich beim Einzelgerätewert mit „je Gerät; projektbezogen prüfen“; keine daraus abgeleitete Kaskaden-JAZ.

Der Kundenfußtext lautet:

> ¹ JAZ = Jahresarbeitszahl. Beispielrechnung mit dem BWP-JAZ-Rechner nach VDI 4650 Blatt 1 für einen Altbau in Hannover. Heizkörper: Vorlauf/Rücklauf 55/45 °C; Fußbodenheizung: Vorlauf/Rücklauf 35/30 °C. Warmwasserbereitung durch die Wärmepumpe; einschließlich erforderlichem elektrischem Zusatzheizer. Individuelle Anlagenwerte können abweichen.

Quellen für Norm und Annahmen: derselbe Wertesatz, Felder `standard`, `assumptions`, `values[].flow_c` und `values[].return_c`; freigegebener Wortlaut in `TAFEL/PLAN_TAFEL.md`, Abschnitt „Nachauftrag 2“. Die Website verlinkt kein internes Rechenprotokoll und nennt keine internen Auslegungsparameter. Die bestehende SCOP-Erklärung bleibt erhalten. Wolf und die alten Plus-Vorlagen anderer Gerätetypen behalten ihren ursprünglichen Fußtext; ihnen wird kein BWP-Nachweis aus diesen Läufen zugeschrieben.

## Implementierte Darstellung

Die Pro-JAZ wird ausschließlich als `jaz.heizkoerper` und `jaz.fussboden` im jeweiligen Eintrag von `PA_PRO_TECHNIK` ergänzt. Darstellung, Reihenfolge und Hervorhebung folgen dem bestehenden Renderer. Ohne Daten erscheint weiterhin keine leere JAZ-Zeile. Die Plus-Vorlagen desselben belegten Geräts erhalten den freigegebenen Heizkörperwert. Alle sonstigen Datenblattfelder und sämtliche Karten bleiben unverändert.

Der gerätebezogene Fußtext wird bei jedem Wechsel neu gewählt. Bei Wolf und den alten Plus-Geräten wird das ursprüngliche HTML unverändert wiederhergestellt. Die feste Höhenbegrenzung entfällt ausschließlich bei geöffneten Datenblättern mit dem neuen BWP-Fußtext, damit dieser auch mobil vollständig sichtbar bleibt. Wolf behält seine bisherige Höhenbegrenzung. Der Preisabruf liefert weiterhin keine öffentlich verwendeten Technikwerte.

## Bildquellen und Bearbeitung

Originalordner: `/Users/benjaminbendler/Library/CloudStorage/GoogleDrive-b.bendler@herowerk.de/Meine Ablage/HeroPlan/04_Marketing_Vertrieb/Website/Vaillant Werbebilder/`.

Je Original rein geometrischer Zuschnitt `(0, 0, 2126, 1417)` aus `2126 × 1535` Pixeln; anschließend `1280 × 853` Pixel, JPEG. Quelle der Originalmaße: jeweilige Bilddatei; Zielmaße und Schnitt: freigegebener Bildplan. Keine Retusche. Die eingebrannte Adresse liegt ausschließlich im abgeschnittenen unteren Streifen. Wolf-Dateien bleiben bytegleich.

| Ziel                | Original relativ zum Herstellerordner                                               | Verwendung                                              | SHA-256 des Originals                                              | SHA-256 des Exports                                                |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `vwl-pro-s-m.jpg`   | `aroTHERM pro - Printbilder/HP25_000462_01_300dpi.jpg`                              | Pro S/M                                                 | `e9e83017f31b030baecfda4749bb8cffcd9b5e0961411a161c1492023745aa2a` | `9f19c50eeb774221b5f2e1efe00fa308371f6d059e2dbf01ef39bfb77d22e749` |
| `vwl-pro-l.jpg`     | `aroTHERM pro - Printbilder/aroTHERM pro 11 kW freigestellt mit Blende_300 dpi.jpg` | Pro L                                                   | `b68e66e7425c86d0b1500aa4a62a11d136d41f0adb127473cb8bd27e97e60344` | `ce768c07866b89ef7acd206ee0ab6a825bb535e28dc5cde01f9713de8a8f24b1` |
| `vwl-plus-s-m.jpg`  | `aroTHERM plus - Printbilder/aroTHERMplus_13x18_quer_300dpi1.jpg`                   | Plus S/M im Altvertrag                                  | `b1095473c62d4c1ba3b7bd8ca5e1eec7c987f10ce5238706c584481bdf09e2a7` | `8c3eaaf4bfbedd2c81f78e580213b329a73641d36f99466340226cf1d829ae46` |
| `vwl-plus-l-xl.jpg` | `aroTHERM plus - Printbilder/aroTHERMplus_13x18_quer_300dpi7.jpg`                   | Plus L/XL/XXL, bei XXL Bild eines einzelnen Außengeräts | `7565155ccd5c16f896cb43b5e01590c7c7bf1155e2075e98d0008068ca198cc1` | `df3ac8c5159ccc444a66c5962dbf4b640c3e74744b99975d8ff30c0b4c0417c1` |
