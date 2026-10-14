# Preistafel: Quellen der aroTHERM-pro-Daten und Bildzuordnung

Bauauftrag TAFEL, Anpassung 1, Freigabe im Chat am 15.10.2026. Herstellerdaten für Pro ergänzen; Wolf und Plus technisch exakt wie Git-Stand `7840681dd2c7eb88b3a53f85c7e2da92fab2c4dc` wiederherstellen. Kein Blattwrite und keine Änderung von Preisen, Eigenanteilen oder Gerätebindung. Die Förderauswahl bleibt ausschließlich Gerätetyp und Preis. Die Dimensionierungsanzeige bleibt unverändert.

## Primärquellen

Alle Onlinequellen abgerufen am 15.10.2026. PDF-Seiten zählen ab der ersten Dateiseite. Werte werden nicht aus Typbezeichnungen abgeleitet.

- V-INST: lokale Vaillant-Datei `/Users/benjaminbendler/Library/CloudStorage/GoogleDrive-b.bendler@herowerk.de/Meine Ablage/HeroPlan/11_Produkt/Vaillant/aroTHERM pro/installationsanleitung_arotherm-pro_1500353.pdf`, Dokument `8000026880_02`; [offizieller Download](https://www.vaillant.de/api/download/product/de/installationsanleitung_arotherm-pro_1500353.pdf).
- V-ERP: [ErP-Datenblatt](https://www.vaillant.de/api/download/product/de/erp-datenblatt_arotherm-pro_794700.pdf), Dokument `8000044664_01`.
- V-INFO: [Produktinformation](https://www.vaillant.de/api/download/product/de/flyer_produktinfo-arotherm-pro_1511399.pdf).
- V-WEB: [deutsche Vaillant-Produktseite](https://www.vaillant.de/produkte/arothermpro/), ErP sowie Leistung und Wirkungsgrad.
- N: `7840681dd2c7eb88b3a53f85c7e2da92fab2c4dc`, `js/site.js` und `preise.html`. Nur Bestandswiederherstellung für Wolf und Plus, keine neue fachliche Prüfung dieser Werte.

## Pro-Daten

| Feld                          | VWL 55/7.1 A                | VWL 75/7.1 A                | VWL 115/7.1 A               | Primärquelle                                                                                                                                                                               |
| ----------------------------- | --------------------------- | --------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kartenzeile                   | A-7/W35: 4,84 kW            | A-7/W35: 6,37 kW            | A-7/W35: 11,12 kW           | V-INST, S. 53, Zeile „Heizleistung, A-7/W35“; V-INFO S. 2 bestätigt.                                                                                                                       |
| Heizleistung A-7/W35 samt COP | 4,84 kW (COP 2,91)          | 6,37 kW (COP 2,66)          | 11,12 kW (COP 2,55)         | V-INST S. 53; V-INFO S. 2 bestätigt.                                                                                                                                                       |
| Heizleistung Pdesignh         | 5 kW                        | 7 kW                        | 11 kW                       | V-ERP S. 1, Prated und Fußnote zur Gleichsetzung mit Pdesignh; durchschnittliches Klima, W55. Diese Bedingung im Zeilentitel oder Quellenhinweis nennen. Kein unbelegtes W35 unterstellen. |
| Kältemittel                   | R290 (natürlich)            | R290 (natürlich)            | R290 (natürlich)            | V-INST S. 53; V-WEB bestätigt natürliches Kältemittel.                                                                                                                                     |
| Bauart                        | Monoblock, Außenaufstellung | Monoblock, Außenaufstellung | Monoblock, Außenaufstellung | V-INST S. 9, Produktbeschreibung. Keine Tower- oder Speicherbauart.                                                                                                                        |
| Vorlauftemperatur             | bis 70 °C                   | bis 70 °C                   | bis 70 °C                   | V-INST S. 52, Heizwassertemperatur.                                                                                                                                                        |
| Schallleistung ErP außen      | 49,0 dB(A)                  | 49,0 dB(A)                  | 54,8 dB(A)                  | V-INST S. 54, ausdrücklich ErP; V-INFO S. 2 bestätigt.                                                                                                                                     |
| Effizienzklasse 35 / 55 °C    | A+++ / A++                  | A+++ / A++                  | A+++ / A++                  | V-INFO S. 2, visuell gelesene Klassenpfeile; W55 zusätzlich V-ERP S. 1.                                                                                                                    |
| ηs 35 / 55 °C                 | 198 % / 145 %               | 192 % / 142 %               | 194 % / 143 %               | W35: V-INFO S. 2 und V-WEB; W55: V-ERP S. 1 und V-WEB. Quellenkonflikt bei L unten dokumentiert.                                                                                           |
| SCOP 35 / 55 °C               | 5,01 / 3,70                 | 4,87 / 3,62                 | 4,93 / 3,66                 | V-WEB, „Leistung und Wirkungsgrad“, Zeilen niedrige/mittlere Temperatur. Keine Umrechnung aus ηs.                                                                                          |
| JAZ Heizkörper                | nicht anzeigen              | nicht anzeigen              | nicht anzeigen              | Anpassung 1: vorerst keine Werte und keine Zeile; später ausschließlich durch belegte Daten ergänzen.                                                                                      |
| JAZ Fußbodenheizung           | nicht anzeigen              | nicht anzeigen              | nicht anzeigen              | Anpassung 1: dieselbe Ausnahme. Kein SCOP als JAZ, kein Platzhalter.                                                                                                                       |
| Abmessung B × T × H           | 1.104 × 454 × 750 mm        | 1.104 × 454 × 750 mm        | 1.169 × 454 × 1.103 mm      | V-INST S. 52; nur Reihenfolge der eindeutig benannten Maße umgestellt.                                                                                                                     |
| Hersteller                    | Vaillant GmbH               | Vaillant GmbH               | Vaillant GmbH               | V-ERP S. 2, Herstelleranschrift. Die Vertriebsfirma in der bisherigen Plus-Zeile ist kein Anlass, die Herstellerangabe des Pro-Datenblatts zu überschreiben.                               |

### Quellenkonflikte und JAZ-Lücke

- **L-Leistung:** V-INST S. 53 unterscheidet „Heizleistung A-7/W35“ mit **11,12 kW** von „Heizleistung maximal“ mit **11,08 kW**. Geplant ist die erste, zum COP gehörende Datenblattzeile; V-INFO S. 2 und V-WEB bestätigen sie. Nicht aus den Tabellen das jeweils größere oder scheinbar passendere Feld zusammensuchen.
- **L-Effizienz:** V-INFO S. 2 nennt bei W55 **145 %**, V-ERP S. 1 und V-WEB nennen **143 %**. Für den ErP-Wert gilt im Plan **143 %** aus dem ausdrücklich maßgeblichen ErP-Datenblatt. Den Widerspruch im Quellenprotokoll erhalten.
- **L-Schall:** V-ERP S. 1 rundet auf **55 dB(A)**; V-INST S. 54 und V-INFO S. 2 nennen **54,8 dB(A)**. Geplant ist der präzise ErP-Schallwert aus der Anleitung, kein Schalldruck und kein Maximalbetrieb.
- **JAZ:** Die bisherigen Plus-Werte stehen als Literale im Repo. Der Einführungscommit `211e940babdd01be29dcb1eacfd3cdaa921635a7` beschreibt „geeichte JAZ“ und eine korrigierte Klimabasis, enthält aber weder den zugehörigen Rechenlauf noch vollständige Eingangsparameter. Konkreter Befund: damaliges `js/site.js:1115` und `:1116` enthält **4,05 / 4,80** für das große Plus-Gerät; N übernimmt diese Werte. Repo-Suche nach JAZ, VDI und Quellen sowie Historie der Fußnote liefern keine reproduzierbare Geräteberechnung. Die JAZ-Eingabe im Kostenvergleich ist keine solche Methode. `produkte_HERO.json` enthält weitere feste Wolf-Werte und ebenfalls keinen Rechenweg.

**Gemäß Anpassung 1 gesondert zu klären:** Die Pro-JAZ wird vom Leitstand dem Geschäftsführer vorgelegt. In diesem Bau keine JAZ-Werte recherchieren, berechnen, erfinden oder aus Plus-Geräten übernehmen. Die Pro-Daten erhalten optionale JAZ-Felder; ohne belegten Wert wird die zugehörige Zeile vollständig ausgelassen. Später müssen ausschließlich die Werte ergänzt werden können. Die dokumentierte Methodenlücke ist kein Abnahmehindernis im angepassten Umfang. Bestehende Wolf-/Plus-JAZ bleibt exakt wie N.

Fußtext für die Bestandsgeräte: Wortlaut aus N wiederherstellen und ausschließlich „ · −11 °C“ entfernen. Keine neue Formulierung, kein zusätzlicher Nachweisvorbehalt in der Kundenanzeige. Pro zeigt vorerst die SCOP-Erklärung; keine sichtbaren JAZ-Platzhalter und keine Behauptung eines bereits durchgeführten Pro-JAZ-Laufs. Die vorhandene JAZ-Erklärung und der Bestandsfußtext werden für Pro bei später tatsächlich ergänzten JAZ-Werten über die optionale Datendarstellung verfügbar.

## Implementierte Darstellung

Die veröffentlichte Pdesignh-Zeile benennt W55 und mittleres Klima. Pro zeigt vorerst keine JAZ-Zeilen und ausschließlich die SCOP-Fußnote. Später genügen die belegten Stringwerte `jaz.heizkoerper` und `jaz.fussboden` im jeweiligen Eintrag von `PA_PRO_TECHNIK`, im Dezimalkommaformat. Die Zeilen und Fußnote erscheinen datenabhängig. Testwerte der Gegenprobe sind keine Produktwerte.

Die Bestandsfußnote wird unverändert aus N übernommen, ausschließlich der interne Temperaturzusatz entfällt. Wolf-Karten, Tabellen und Bildausgabe sowie Plus-Karten und Tabellen werden mit identischen Eingaben byteweise gegen N geprüft. Der Preisabruf liefert keine öffentlich verwendeten Technikwerte; diese folgen ausschließlich dem gebundenen bekannten Modell.

## Bildquellen und Bearbeitung

Originalordner: `/Users/benjaminbendler/Library/CloudStorage/GoogleDrive-b.bendler@herowerk.de/Meine Ablage/HeroPlan/04_Marketing_Vertrieb/Website/Vaillant Werbebilder/`.

Je Original rein geometrischer Zuschnitt `(0, 0, 2126, 1417)` aus `2126 × 1535` Pixeln; anschließend `1280 × 853` Pixel, JPEG. Quelle der Originalmaße: jeweilige Bilddatei; Zielmaße und Schnitt: freigegebener Bildplan. Keine Retusche. Die eingebrannte Adresse liegt ausschließlich im abgeschnittenen unteren Streifen. Wolf-Dateien bleiben bytegleich.

| Ziel                | Original relativ zum Herstellerordner                                               | Verwendung                                              | SHA-256 des Originals                                              | SHA-256 des Exports                                                |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `vwl-pro-s-m.jpg`   | `aroTHERM pro - Printbilder/HP25_000462_01_300dpi.jpg`                              | Pro S/M                                                 | `e9e83017f31b030baecfda4749bb8cffcd9b5e0961411a161c1492023745aa2a` | `9f19c50eeb774221b5f2e1efe00fa308371f6d059e2dbf01ef39bfb77d22e749` |
| `vwl-pro-l.jpg`     | `aroTHERM pro - Printbilder/aroTHERM pro 11 kW freigestellt mit Blende_300 dpi.jpg` | Pro L                                                   | `b68e66e7425c86d0b1500aa4a62a11d136d41f0adb127473cb8bd27e97e60344` | `ce768c07866b89ef7acd206ee0ab6a825bb535e28dc5cde01f9713de8a8f24b1` |
| `vwl-plus-s-m.jpg`  | `aroTHERM plus - Printbilder/aroTHERMplus_13x18_quer_300dpi1.jpg`                   | Plus S/M im Altvertrag                                  | `b1095473c62d4c1ba3b7bd8ca5e1eec7c987f10ce5238706c584481bdf09e2a7` | `8c3eaaf4bfbedd2c81f78e580213b329a73641d36f99466340226cf1d829ae46` |
| `vwl-plus-l-xl.jpg` | `aroTHERM plus - Printbilder/aroTHERMplus_13x18_quer_300dpi7.jpg`                   | Plus L/XL/XXL, bei XXL Bild eines einzelnen Außengeräts | `7565155ccd5c16f896cb43b5e01590c7c7bf1155e2075e98d0008068ca198cc1` | `df3ac8c5159ccc444a66c5962dbf4b640c3e74744b99975d8ff30c0b4c0417c1` |
