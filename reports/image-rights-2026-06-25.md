# Bildrechte-Register HeroWerk Website

Stand: 2026-06-25  
Scope: Website-Repo `/Users/benjaminbendler/herowerk-website`, Branch `codex/image-rights-docs`  
Ziel: belastbare Dokumentation der aktuell verwendeten Website-Bilder. Keine Bildwechsel, keine Code-Änderung.

## Kurzurteil

Die WOLF-Bilder sind nicht gemeinfrei, aber nach der öffentlich zugänglichen WOLF-Mediacenter-Nutzungsbedingung für HeroWerk-Webwerbung grundsätzlich nutzbar: WOLF räumt ein einfaches, nicht übertragbares, unentgeltliches Nutzungsrecht für private, journalistische oder Werbezwecke innerhalb der EU ein. Das reicht für die Website-Nutzung, solange die Bedingungen eingehalten werden.

Die übrigen Stock-/Vaillant-nahen Bilder werden als iStock-lizenziert dokumentiert, gestützt auf Benjamins Bestätigung vom 2026-06-25 und den Drive-Quellordner `04_Marketing_Vertrieb/Website/SVG und iStock Bilder/iStock-2026-06-16/`. Für einen externen Legal-Audit sollten die konkrete iStock-Asset-ID und der Kauf-/Downloadbeleg je Live-Bild ergänzt werden.

## Quellenlage

### WOLF Mediacenter

Öffentliche Quelle: `https://mediacenter.wolf.eu/de-de/downloads/downloads`

Belegt am 2026-06-25:

- Das WOLF Mediacenter stellt Logos, Bilder und Informationsmaterial zum Download bereit.
- Die Kategorie `Wärmepumpe` enthält CHA-Monoblock-, CHA-Sanierungs-, CHA-Neubau-, CHA-Kaskaden- und MFH-Bilder.
- Die Kategorie `Shootingmaterial WOLF` enthält die Motive `WOLF Beratung Wärmepumpe`, `WOLF Service Wärmepumpe`, `WOLF Fachpartner x Endkunde` und `WOLF Wärmepumpe Endkunden Liegestuhl`.
- Die Nutzungsbedingungen sagen: einfaches, nicht übertragbares, unentgeltliches Nutzungsrecht für private Zwecke, journalistische Zwecke oder Werbezwecke innerhalb der EU.

Wichtige Auflagen:

- keine Unterlizenzierung an Dritte
- kein Bereitstellen der Dateien in einem eigenen Downloadbereich
- keine Umgestaltung/Bearbeitung, außer notwendige Größenänderungen oder Ausschnitte, sofern die Darstellung nicht qualitativ oder sinnhaft entstellt wird
- physische Werbeträger wie Werbeschilder, Magnettafeln oder Banner nur nach vorheriger schriftlicher Zustimmung von WOLF
- kein Einsatz in Onlineauktionen
- kein rufschädigender oder sinnentstellender Kontext
- WOLF kann das Nutzungsrecht widerrufen; Nutzung wäre dann in der Regel binnen 3 Werktagen einzustellen

Bewertung: Für die aktuelle HeroWerk-Website-Nutzung als digitale Werbung in der EU tragfähig. Nicht tragfähig wäre die Aussage „free to use“ ohne diese Bedingungen.

### iStock

Öffentliche Quelle: `https://www.istockphoto.com/help/licenses` und `https://www.istockphoto.com/legal/license-agreement`

Belegt am 2026-06-25:

- iStock Standard-Lizenzen erlauben persönliche, geschäftliche und kommerzielle Nutzung, unter anderem für Websites, Werbung, Marketing, Social Media und Präsentationen, soweit keine Lizenzbeschränkung greift.
- Für kommerzielle Nutzung ist laut iStock grundsätzlich kein Foto-Credit nötig; bei editorial use gelten gesonderte Credit-Pflichten.
- Verboten bzw. gesondert lizenzpflichtig sind u. a. Einsatz in Logo/Trademark, standalone redistribution, Nutzung von `editorial use only`-Material für Werbung, digitale Templates/Produkte zum Weiterverkauf und bestimmte große Druck-/Resale-Szenarien.
- Standardlizenzen sind nicht übertragbar und nicht unterlizenzierbar; Rohdateizugriff ist nutzer-/sitzplatzbezogen.

Interner Beleg:

- Benutzerbestätigung Benjamin, 2026-06-25: „die anderen Bilder habe ich bei iStock gekauft“
- Drive-Quellordner: `04_Marketing_Vertrieb/Website/SVG und iStock Bilder/iStock-2026-06-16/`
- Vorhandene iStock-Dateien im Drive u. a. `iStock-1648473214.jpg`, `iStock-2152174173.jpg`, `iStock-2274925416.jpg`, `iStock-2022836075.jpg`, `iStock-1648357260.jpg`, `iStock-2173505376.jpg`, `iStock-1437929864.jpg`, `iStock-2207035738.jpg`, `iStock-2180737770.jpg`

Bewertung: Für Website-Werbung grundsätzlich tragfähig, sofern es keine `editorial use only`-Assets sind und die gekauften iStock-Asset-IDs zu den Live-Dateien gematcht werden. Dieser Match ist noch nicht vollständig im Repo dokumentiert.

## Asset-Register

### WOLF-Mediacenter / WOLF-Shootingmaterial

| Repo-Datei                                                    | Live-Verwendung                   | Quellenzuordnung                                             | Status               | Auflage/Risiko                                                                             |
| ------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------ |
| `logo-wolf.svg`                                               | Trust-/Partner-Logo               | WOLF Mediacenter `Logo WOLF GmbH`, Web                       | nutzbar mit Auflagen | Marken- und Nutzungsbedingungen einhalten; keine falsche Exklusivpartnerschaft suggerieren |
| `hero-beratung.jpg`                                           | `prozess.html`                    | WOLF Shootingmaterial `WOLF Beratung Wärmepumpe`             | nutzbar mit Auflagen | digitale Website-Werbung ok; keine sinnentstellende Bearbeitung                            |
| `hero-service.png`                                            | `prozess.html`                    | WOLF Shootingmaterial `WOLF Service Wärmepumpe`              | nutzbar mit Auflagen | PNG und daraus erzeugte WebP-Derivate nur als Größen-/Formatoptimierung                    |
| `hero-service-800.webp`, `hero-service-1600.webp`             | `index.html`                      | Derivate von `hero-service.png`                              | nutzbar mit Auflagen | reine Größen-/Formatoptimierung dokumentiert                                               |
| `hero-fachpartner.png`                                        | `kontakt.html`, `anfrage.html` OG | WOLF Shootingmaterial `WOLF Fachpartner x Endkunde`          | nutzbar mit Auflagen | hohe Sichtbarkeit; Widerrufsrisiko beachten                                                |
| `hero-paar-terrasse.png`                                      | OG-Image, Hero-Hintergrund        | WOLF Shootingmaterial `WOLF Wärmepumpe Endkunden Liegestuhl` | nutzbar mit Auflagen | hohe Sichtbarkeit; kein eigener Downloadbereich                                            |
| `hero-paar-terrasse-800.webp`                                 | CSS-Hero-Hintergrund              | Derivat von `hero-paar-terrasse.png`                         | nutzbar mit Auflagen | reine Größen-/Formatoptimierung dokumentiert                                               |
| `cha-sanierung.jpg`                                           | Preiskarte / Produktdetail        | WOLF Mediacenter Wärmepumpe, CHA Sanierung/Bestand           | nutzbar mit Auflagen | Cropping/Resize ok, sofern nicht sinnentstellend                                           |
| `cha-neubau-dunkel.jpg`                                       | Preiskarte / Startseite           | WOLF Mediacenter Wärmepumpe, CHA Neubau                      | nutzbar mit Auflagen | dito                                                                                       |
| `cha-neubau-dunkel-800.webp`, `cha-neubau-dunkel-1600.webp`   | responsive Startseite             | Derivate von `cha-neubau-dunkel.jpg`                         | nutzbar mit Auflagen | reine Größen-/Formatoptimierung dokumentiert                                               |
| `cha-komfort-neubau.jpg`                                      | Preiskarte / Startseite           | WOLF Mediacenter Wärmepumpe, CHA Ambiente/Neubau             | nutzbar mit Auflagen | dito                                                                                       |
| `cha-komfort-neubau-800.webp`, `cha-komfort-neubau-1600.webp` | responsive Startseite             | Derivate von `cha-komfort-neubau.jpg`                        | nutzbar mit Auflagen | reine Größen-/Formatoptimierung dokumentiert                                               |
| `cha-mfh-saniert.jpg`                                         | Preiskarte / Startseite           | WOLF Mediacenter Wärmepumpe, CHA Sanierung MFH               | nutzbar mit Auflagen | dito                                                                                       |
| `cha-mfh-saniert-800.webp`, `cha-mfh-saniert-1600.webp`       | responsive Startseite             | Derivate von `cha-mfh-saniert.jpg`                           | nutzbar mit Auflagen | reine Größen-/Formatoptimierung dokumentiert                                               |
| `cha-kaskade-mfh.jpg`                                         | Preiskarte Kaskade                | WOLF Mediacenter Wärmepumpe, CHA Kaskade MFH                 | nutzbar mit Auflagen | Kaskade nicht als HeroWerk-eigenes Foto darstellen                                         |

### iStock / gekaufte Stockbilder

| Repo-Datei                                                    | Live-Verwendung                   | Belegstand                                                                              | Status                                 | Auflage/Risiko                                                          |
| ------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| `vwl-s-m.jpg`                                                 | Vaillant Preiskarten S/M          | Benjamin: iStock gekauft; Metadaten wirken wie Stockfoto; Drive-iStock-Ordner vorhanden | nutzbar, Kauf-Match offen              | iStock-Asset-ID/Rechnung nachtragen; prüfen: nicht `editorial use only` |
| `vwl-l.jpg`                                                   | Vaillant Preiskarte L             | dito                                                                                    | nutzbar, Kauf-Match offen              | dito                                                                    |
| `vwl-xl.jpg`                                                  | Vaillant Preiskarte XL            | dito                                                                                    | nutzbar, Kauf-Match offen              | dito                                                                    |
| `vwl-xxl.jpg`                                                 | Vaillant Kaskade                  | dito                                                                                    | nutzbar, Kauf-Match offen              | dito                                                                    |
| `paar-winter-balkon.jpg`                                      | Quellbild für responsive Derivate | früher als Pexels dokumentiert; aktuelle Benutzerangabe: iStock-Bilder gekauft          | nicht kritisch, aber Provenance klären | Asset-ID oder Pexels-ID final festlegen                                 |
| `paar-winter-balkon-800.webp`, `paar-winter-balkon-1600.webp` | `index.html` responsive Bild      | Derivate von `paar-winter-balkon.jpg`                                                   | abhängig vom Quellbeleg                | Quelllizenz eindeutig nachziehen                                        |

### Eigene / institutionelle / technische Assets

| Repo-Datei                                                                    | Einordnung                            | Status                     | Hinweis                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------- | -------------------------- | ------------------------------------------------------------------- |
| `herowerk-logo-stacked.png`, `herowerk-logo-stacked-light.png`, `favicon.ico` | HeroWerk-Marke                        | ok                         | eigene Marke / eigenes Branding                                     |
| `logo-vaillant.svg`                                                           | Herstellermarke                       | separat zu behandeln       | Markenhinweis nur sachlich; keine falsche Partnerschaft suggerieren |
| `logo-kfw.svg`                                                                | Förderinstitut                        | separat zu behandeln       | nur in sachlich korrektem Förderkontext                             |
| `logo-proklima.svg`                                                           | Förderfonds / enercity proKlima       | separat zu behandeln       | nur in sachlich korrektem Regionalförderkontext                     |
| `ratgeber-icons-*.svg`, `funnel-icons/*.svg`                                  | technische/illustrative Website-Icons | ok im aktuellen Repo-Scope | Ursprung aus internem SVG/iStock-Extraktionsordner dokumentiert     |

## Compliance-Entscheid für Go-live-Bildblock

Controller-Einschätzung: **ready for Controller-Recheck mit zwei Auflagen**.

1. WOLF-Bilder dürfen auf der Website bleiben, wenn die Mediacenter-Bedingungen eingehalten werden. Die Doku darf sie nicht als „gemeinfrei“ oder „bedingungslos free to use“ bezeichnen.
2. iStock-/Stockbilder dürfen auf der Website bleiben, aber für eine belastbare Legal-Akte muss je Live-Datei der finale Kauf-/Downloadbeleg oder die iStock-Asset-ID ergänzt werden. Der Drive-Ordner und Benjamins Bestätigung reichen für den operativen Recheck, aber nicht für einen externen Rechte-Audit.

Nicht Teil dieser Dokumentation:

- kein Bildtausch
- keine Prüfung von Print-/Fahrzeug-/Workwear-Nutzung
- keine Production-Freigabe
- keine Aussage zu zukünftigen physischen Werbeträgern; dafür braucht WOLF laut Bedingungen vorab schriftliche Zustimmung

## Verweise

- WOLF Mediacenter: `https://mediacenter.wolf.eu/de-de`
- WOLF Downloads/Nutzungsbedingungen: `https://mediacenter.wolf.eu/de-de/downloads/downloads`
- iStock Lizenz-FAQ: `https://www.istockphoto.com/help/licenses`
- iStock Content License Agreement: `https://www.istockphoto.com/legal/license-agreement`
- Interne Vorprüfung: `04_Marketing_Vertrieb/Website/WebDev2/_Klaerungen/2026-06-13_Bild-Lizenz-Audit_HERO.md`
- Interner iStock-Quellordner: `04_Marketing_Vertrieb/Website/SVG und iStock Bilder/iStock-2026-06-16/`
