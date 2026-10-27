---
typ: agent-draft
tldr: 'T1245 Schritt 1 gebaut. Konfigurator 275/275 und Goldsatz grün, PHP/JS 625 Fälle Delta 0. Gesamtabnahme wegen Browser-Sandbox und sauberem Versionsstand offen. Keine Einbuchung oder Auslieferung.'
datum: 2026-10-27
status: wartet_abnahme
quelle: agent
tags: [domain/angebot, domain/website-rechner]
---

# T1245 Schritt 1: Baubericht und Nachweise

## Stand und offene Abnahme

**Arbeitsdateien gebaut; die vollständige Abnahme ist noch nicht erfüllt.** Konfigurator: 275 grün, 0 rot; Angebots-Goldsatz unverändert und grün. PHP/JS: 625 feste Fälle, größtes Float-Delta 0. Alle Referenzziele getroffen. Website: 20 von 27 `verify:`-Einträgen grün, fünf Browserstarts durch die macOS-Sandbox gesperrt, Versionslauf sperrt den uneingebuchten Arbeitsbaum; der einzige Live-Lauf bleibt gemäß Auftrag unausgeführt. Kein Angebot weicht außerhalb des freigegebenen Kostenvergleichs/Bootstraps ab.

Offen für die Steuerung: Browserprüfungen in einer Umgebung mit startfähigem Chromium/WebKit ausführen; nach eigener Nachmessung getrennt je Ablage einbuchen und dann `verify:version` wiederholen. `verify:stelle-live` ruft die echte Website/HubSpot auf und ist mit dem Verbot von Live-Aufrufen in diesem Bau unvereinbar. Die Grenzen wurden eingehalten; keine Prüfung wurde für eine grüne Meldung umgangen.

Kein `git add`, `git commit`, `git switch`, Push, Pull Request, Upload oder `clasp push`. Keine Live-Website, kein Live-Apps-Script und keine Google-Tabelle aufgerufen oder beschrieben. Ausschließlich synthetische Testdaten. Der Website-Hauptarbeitsbaum bleibt unberührt.

HZV: Rechenkern „Ihr Nutzen“ für Website und Angebot · Bau und Nachweise Schritt 1 · keine Wartejahre, Einheiten-Vorbelegung, Ansprache, Verbrauchshochrechnung oder Konfigurator-/Vertragsabläufe.

## Auftrag, Quellen und Arbeitsstände

Website: `/Users/benjaminbendler/code/herowerk-website-rechenkern-t1245`, vorhandener Zweig `codex/t1245-kern-nutzen`, Basis `945916d`. Konfigurator: `/Users/benjaminbendler/code/herowerk-konfigurator`, vorhandener gleicher Zweig, Basis `e612bfa`. Keine Änderung an `main` oder am Website-Hauptarbeitsbaum auf `t901/zwei-geraete-grenze`.

Pflichtquellen unter `HeroPlan/_Agent-Work/2026-10-26_Konzept-Amortisationsblatt/`: `BAUPLAN_Amortisationsblatt_HERO.md`, `JAZ/WERTE_JAZ_PORTFOLIO.json`, `JAZ/BERICHT_JAZ_PORTFOLIO_HERO.md`, `GESETZ_BIO_HERO.md`, `ABSTIMMUNG_RECHENKERN_T402_HERO.md`, `Entwurf/nachrechnung_bio_treppe.js`, `Entwurf/jahreswerte_erzeugen.js`. Recht und Preisannahmen wurden entsprechend diesen freigegebenen Quellen umgesetzt. Keine eigene neue Rechtsauslegung.

Goldsatz-Ausnahme: `_Entscheidungen/2026-10-26_Amortisationsblatt-Platz-nach-Uebersicht-Bio-mitrechnen-Kostenlinie_HERO.md`, Nachtrag 13, GF 27.10.2026 09:01, Antwort „1a“. Sie ersetzt für diesen Bau ausschließlich die ansonsten sperrende Goldsatzregel 5 des Konfigurator-AGENTS.md. Die übrigen Prüfungen bleiben wirksam. Die unabhängige Nachmessung der Steuerung ist mit diesem Baubericht nicht ersetzt.

Vor-Schreib-Archiv des Codes: `/private/tmp/t1245-original/herowerk-website-rechenkern-t1245` und `/private/tmp/t1245-original/herowerk-konfigurator`. Frühere Stoppfassung des Berichts: `/private/tmp/t1245-fortsetzung/STOPPBERICHT-vorher.md`. Vor-Schreib-Vermerk: `Codex/T1245_PREWRITE.md` im Arbeitsordner dieses Auftrags.

## Umsetzung, Funktionen und Parameter

`kv_engine.js` und `apps-script/rechner-backend/kv_engine.gs` sind bytegleich. `kvCalculate`/`hw_kv_calculate` verwenden eine gemeinsame Jahreskostenfunktion je Sprache (`kvJahreskosten`/`hw_kv_jahreskosten`) für Hauptrechnung, Spanne und Drei-Wege-Betriebssummen. Damit wirken alle neuen Posten in den Jahressummen, Diagrammen, Gesamtkosten und Sensitivitäten. Die Sensitivitätsbasis ist exakt der Hauptwert. Geld-Rohwerte bleiben ungerundet; Anzeige und ausdrücklich gerundete Bestandsfelder runden erst danach.

Neue Helfer: `kvBioStand`, `kvNutzenEingaben`, `kvJazAuswahl`, `kvNetzentgeltPruefen`, `kvNutzenParameter`, `kvJazAusZeilen`, `KV_JAZ_ROWS_`, `kvNutzenRequest` und PHP-Gegenstücke. `Code.gs`/`Code.js`: `kvMapRequest_`, `kvGetParams_`/direkter Leser, `kvJazParameterLaden_`, `KV_PARAMETER_ROWS_`, vorbereitete JAZ-Seedfunktion und gezielte Cache-Fassung. Kein Seed wurde gegen ein Live-Sheet ausgeführt.

| Eingabe                                                        | Vorgabe / Verhalten                                                                                                                                                                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| heizsystem                                                     | Ohne Angabe Heizkörper, im Ergebnis als Annahme gekennzeichnet; fbh, heizkoerper; gemischt wird Heizkörper.                                                                                                                                                  |
| geraet                                                         | Leer: vollständiges Portfolio-Minimum je Heizsystem, Heizkörper 3,86 / FBH 4,47. Bekannter Gerätealias/BWP-ID: Tabellenwert. Unbekannt oder ohne belegten Wert: gesperrt.                                                                                    |
| jaz (alt)                                                      | Weiter angenommen, aber nicht als frei wählbarer Kostenwert verwendet. Tabellen-JAZ gewinnt.                                                                                                                                                                 |
| pvTog / pvAnteil / pvKosten                                    | aus / 30 Prozent / 7 ct/kWh; PV-Kosten bleiben nominal konstant. Dynamischer Tarif wirkt auf den restlichen Netzstrom.                                                                                                                                       |
| foerderBetragExtern                                            | leer/null: bisherige Förderrechnung. 0: ausdrücklich kein Zuschuss; Betrag wird in Nettoinvestition und allen Folgesummen verwendet.                                                                                                                         |
| startJahr                                                      | Abrufjahr Europe/Berlin im Parameterleser; Kern selbst ohne Uhr. Explizites 2027 wird übernommen. CO₂-Ziel bleibt kalenderfest 2045.                                                                                                                         |
| grundpreisGas                                                  | 250,38 Euro/Jahr; ausschließlich wenn heutiger Energieträger und betrachteter Brennstoff Gas sind, bei Öl nie.                                                                                                                                               |
| wpZaehler / wpArbeitspreis / wpGrundpreis                      | aus / leer / leer. Bei eigenem Zähler Arbeitspreis und Grundpreis verpflichtend, Grundpreis 0 ist gültig; dieser Tarif ersetzt Haushaltsstrom.                                                                                                               |
| modul14a                                                       | modul1. Vorteil 156,22 Euro/Jahr nur ohne eigenen WP-Zähler und nur Modul 1. Modul 2 setzt eigenen Zähler voraus.                                                                                                                                            |
| netzentgeltTog                                                 | aus; eingeschaltet ohne vollständige belegte Jahresreihe: klare Sperrmeldung, kein Ersatzwert.                                                                                                                                                               |
| warmwasserBisherZentral / warmwasserKuenftigZentral / personen | true / true / leer. Wechsel nein → ja verlangt Personen: Personen × Parameter 700 kWh Nutzwärme für WP und heutiger Boilerstrom im Bestand. Beim neuen Kessel ist Warmwasser bereits im Brennstoffbedarf enthalten und wird nicht doppelt als Strom addiert. |
| wartung_fossil / wartung_wp                                    | Gemeinsame 250 Euro/Jahr auf beiden Seiten. Ein alter wartung_wp-Wert 350 erzeugt keinen einseitigen Aufschlag mehr.                                                                                                                                         |
| schornsteinfeger                                               | 39 Euro/Jahr fossil; eigenständiger Ergebnisposten.                                                                                                                                                                                                          |

Fixkosten sind nominal konstant. Die Quellen für Modul 1 und Netzpfad laufen im Ergebnis mit. Nicht-Amortisation ist `null`, sofortige Amortisation bei Mehrpreis ≤ 0 ist Jahr 0 und ausdrücklich gekennzeichnet.

Netzentgelt-Parameterblock in Seed, PHP, beiden Code-Lesern und `KV_PARAMETER_ROWS_`: `netzentgelt_basisjahr` leer, `netzentgelt_einheit` = `ct/kWh Aufschlag gegenüber heute`, `netzentgelt_jahreswerte` = `[]`, `netzentgelt_quelle` leer, `netzentgelt_abrufdatum` leer. Es wird nur der Anstieg über den heutigen Arbeitspreis addiert. Einschalten verlangt Quelle, Abrufdatum, eindeutige Jahreswerte mit Basiswert 0 und Abdeckung aller Rechenjahre; keine Interpolation oder Fortschreibung aus erfundenen Werten. Die Steuerung liefert die echte Reihe später. Kein produktiver Zielwert mit Schalter an.

### Vier Bio-Stufen und alter Live-Parameterstand

Gesetzeswerte: 2029/10 %, 2030/15 %, 2035/30 %, 2040/60 %. Jeder Seed-Schlüssel `bio_stufe_1..4_jahr/_anteil` nennt „GModG § 43 Abs. 1, BGBl. 2026 I Nr. 226“. Preisfaktor 2,5 ist getrennt als BDEW Januar 2026/Preisannahme ausgewiesen. Bio wirkt nur im Neuanlagenvergleich, mit eigenem Bruttoaufschlag, CO₂-Entlastung und Nettoeffekt.

Ein exakt erkannter alter vollständiger Dreiersatz 2029/15 %, 2035/30 %, 2040/60 % wird im Leser und direkt im Kern atomar durch den vollständigen Vierersatz ersetzt. `bioHinweis` zeigt diese Migration sichtbar. Teilweise ergänzte, gemischte oder unbekannte Treppen sperren. Die vierte Zeile wird deshalb niemals still mit drei alten Zeilen zusammengesetzt. Alte Parameter-Caches werden durch T1245-Schlüssel getrennt, einschließlich des Konfigurator-Gruppencaches.

### JAZ-Erzeugung und spätere Veröffentlichung

`data/kv-jaz-portfolio.json` ist die unveränderte Kopie der freigegebenen BWP-Rohquelle. `scripts/generate-kv-jaz.mjs` liest maschinell Satz A Heizkörper 55/45 und Satz B FBH 35/28, Feld `jazTotalWithSupplementaryHeater`. 30 Originalzeilen bilden auch die Spannungsvarianten der 13 Verkaufsgeräte ab, dazu 18 explizite Kaskadenzeilen. Keine Gebäudebaujahr-JAZ, kein Systemabschlag und kein zusätzlicher Hilfsstrom.

Der Generator schreibt die markierten JS-/PHP-Tabellenblöcke, `api/kv-jaz.json`, JAZ-Spezifikationen in `produkte_HERO.json` und `js/site.js` sowie Quellenmetadaten der Preistafel. Preise, SCOP und übrige Gerätespezifikationen bleiben unverändert. `api/kv-jaz.json` ist ein Prüf-/Erzeugungsartefakt; PHP braucht keine zusätzliche Laufzeitdatei, weil es den generierten Tabellenblock enthält. Bericht und Roh-/Prüfartefakte sind im Bündelskript ausdrücklich ausgeschlossen.

`KV_JAZ` hat Gerät, Heizsystem, Wert, Quelle, Abrufdatum sowie Randbedingungen, Aliase und Kaskadenkennzeichen. Noch vor der Sheet-Veröffentlichung rechnet der vorbereitete Code mit dem exakt gebündelten, datierten Tabellenstand und zeigt diesen an. Sobald `jaz_tabellenstand=2026-10-26` veröffentlicht ist, muss die gültige Tabelle vorliegen; fehlende, leere oder unvollständige Tabellen sperren. Zuerst KV_JAZ bereitstellen, erst danach Parameterstand veröffentlichen. Dieser Bau schreibt keinen dieser Live-Stände. Snapshot-Exporter/Leser akzeptieren gezielt das optionale letzte Blatt KV_JAZ; beliebige zusätzliche Tabellen bleiben ungültig.

### Website

Neue Heizsystemfrage, schreibgeschützte Tabellen-JAZ, Geräteempfehlung per Request/URL übernommen; JAZ-Schieberegler entfernt. Anzeige von BWP-JAZ-Rechner/VDI 4650, Hannover, Vorlauf/Rücklauf, Warmwasser 18 %, Speicher 50 °C, angenommener Gesamtlast und Abrufdatum. Kaskade und fehlende Gerätewahl tragen ihre Annahme. Hinweis auf notwendige Inbetriebnahme mit diesen Temperaturen; das Inbetriebnahmeprotokoll selbst ist Folgeaufgabe.

Fixposten, PV, Bio und Netzpfad erscheinen einzeln in Ergebnis und Diagrammreihen. Netzentgeltquelle steht am Schalter. Fehler räumen den letzten erfolgreichen Wert ab und zeigen die konkrete Sperrursache; eine leere Netzreihe lässt keinen alten Erfolgswert stehen. Preistafel: alle betroffenen Wolf-Heizkörper- und FBH-Werte samt Randbedingungen nachgezogen. Asset-Referenzen wurden ausschließlich mit dem vorhandenen Versionierungsskript erneuert; dadurch ändern sich zusätzlich HTML-Seiten ohne Inhaltsänderung.

## Referenzfall: Ist gegen Soll

Synthetischer Planfall: Startjahr 2026, Gas 18.000 kWh, eta 80 %, Gas 11,5 ct/kWh, Strom 30 ct/kWh, Investition 34.500 Euro, Zuschuss 12.880 Euro, VWL 75/8.1 / BWP 5078 Heizkörper JAZ 3,90, Grundpreis 250,38 Euro, Netzpfad aus. Quelle Ist: `tests/t1245-kv-nutzen.mjs`, finale Rohwerte `/private/tmp/t1245-fortsetzung/referenz-final.json`.

| Größe                                | Ist                             | Soll        | Ergebnis |
| ------------------------------------ | ------------------------------- | ----------- | -------- |
| WP-Strom kWh/Jahr                    | 3.692 (roh 3692.3076923076924)  | 3.692       | grün     |
| Stufe 1 fossil erstes Jahr Euro      | 2.609 (roh 2609.38)             | 2.609       | grün     |
| WP erstes Jahr mit PV Euro           | 947 (roh 946.7030769230769)     | 947         | grün     |
| Stufe 1 PV: Jahr / Vorteil Euro      | 11 / 27.077                     | 11 / 27.077 | grün     |
| Stufe 1 ohne PV: Jahr / Vorteil Euro | 12 / 20.944                     | 12 / 20.944 | grün     |
| Stufe 2 Mehrpreis Euro               | 9.620                           | 9.620       | grün     |
| Stufe 2 PV: Jahr / Vorteil Euro      | 6 / 49.301                      | 6 / 49.301  | grün     |
| Stufe 2 ohne PV: Jahr / Vorteil Euro | 7 / 43.167                      | 7 / 43.167  | grün     |
| Bio-Netto Euro                       | 19.581 (roh 19581.483724475525) | 19.581      | grün     |

Bio wird aus dem Rohposten gerundet. Die Differenz zweier gerundeter Gesamtsummen ist dafür ausdrücklich nicht die Rechengrundlage. Rohvorteile:

| Stufe | PV  | Rohvorteil Euro    |
| ----- | --- | ------------------ |
| 1     | an  | 27077.13630207273  |
| 1     | aus | 20943.73308004073  |
| 2     | an  | 49300.88719664644  |
| 2     | aus | 43167.483974614435 |

## Gewollte Abweichungen gegenüber dem alten Kern

Archivierter Kern gegen Bau, Plan-Referenzfall, PV an, bisherige JAZ 3,8 versus Gerätewert 3,9. Quelle `/private/tmp/t1245-differenzen.json`; Beiträge werden ungerundet summiert.

| Posten Euro            | Stufe 1 roh           | Stufe 2 roh         |
| ---------------------- | --------------------- | ------------------- |
| Altwert                | 9357.682864882718     | 31717.976036291613  |
| Arbeitszahl 3,8 → 3,9  | 674.050215158004      | 674.0502151580004   |
| Gas-Grundpreis         | 5007.600000000001     | 5007.600000000001   |
| Schornsteinfeger       | 780                   | 780                 |
| Modul 1                | 3124.3999999999987    | 3124.3999999999987  |
| Wartung gleich 250     | 2000                  | 2000                |
| PV 30 % zu 7 ct        | 6133.403222032003     | 6133.403222032003   |
| Bio-Treppe vier Stufen | 3.637978807091713e-12 | -136.54227683517456 |
| Neuer Vorteil          | 27077.13630207273     | 49300.88719664644   |

Der Bio-Beitrag der Stufe 1 beträgt fachlich 0; der gespeicherte Rest 0,000000000003638 Euro entsteht aus den binären Additionen. Netzpfad, WP-Zähler, Warmwasserwechsel, Startjahr und externe Förderung sind in diesem Referenzfall neutral. Alte Aufrufe bleiben syntaktisch gültig, verwenden aber absichtlich die neuen Fixkosten und die nicht frei veränderbare Tabellen-JAZ; Altaufrufe ohne Heizsystem verwenden ausdrücklich Heizkörper-Minimum 3,86. Die gesetzliche Treppe ist die weitere beschlossene Fachänderung im Neuanlagenvergleich.

## Beleg 1: Goldsatz-Abgrenzung je Weg und Fall

Erzeugung ausschließlich mit der vorhandenen Funktion `websiteAntwort` aus `tools/pruefstand_matrixweg/abnahme.js`, eingefrorenem Ordner `test/gold/daten_2026-10-16` und aus dem unveränderten Goldtest gelesenem Stichtag 2026-10-19. Keine Handwerte, Versionsweiche oder Toleranzänderung. Einmaliger Erzeugungsbefehl im Konfigurator:

```bash
node tools/t1245-goldsatz.js \
  --archiv=/private/tmp/t1245-fortsetzung/website-archiviert-vor-erzeugung.json \
  --altkern=/private/tmp/t1245-original/herowerk-konfigurator \
  --beleg=/private/tmp/t1245-fortsetzung/gold-beleg.json
```

```text
GRÜN nur kostenvergleich und kv_bootstrap erneuert; 60 Weg-/Fall-Zuordnungen geprüft.
```

Das Werkzeug archiviert vor dem Schreiben exklusiv mit `wx` und verweigert ein schon vorhandenes Archiv. Nicht nochmals auf demselben Archivpfad ausführen. Dauerhafte bytegleiche Archivkopie im Website-Zweig: `tests/fixtures/t1245/website-vorher.json`. Vollständiger maschineller Beleg einschließlich ungerundeter Zahlen und Schutz-Hashes: `tests/fixtures/t1245/goldsatz-beleg.json`. Originale Einmalbelege außerdem in `/private/tmp/t1245-fortsetzung/`.

Die tatsächliche Datenstruktur von `website.json` enthält sechs gemeinsame Website-Antworten, keine separaten Antwortsätze pro F1–F10. Alle zehn Angebotsfälle referenzieren dieselben Website-Wege. Die folgende Tabelle macht diese Zuordnung ausdrücklich und erfindet keine zehn verschiedenen Web-Eingaben. „gleich“ bedeutet bytegleiche Antwort und unveränderte Parameter; nur die zwei freigegebenen Antwortstrings wurden neu erzeugt.

| Fall | dimensionierung | foerderung | preise | kostenvergleich | kv_bootstrap | fv_plaetze |
| ---- | --------------- | ---------- | ------ | --------------- | ------------ | ---------- |
| F1   | gleich          | gleich     | gleich | neu             | neu          | gleich     |
| F2   | gleich          | gleich     | gleich | neu             | neu          | gleich     |
| F3   | gleich          | gleich     | gleich | neu             | neu          | gleich     |
| F4   | gleich          | gleich     | gleich | neu             | neu          | gleich     |
| F5   | gleich          | gleich     | gleich | neu             | neu          | gleich     |
| F6   | gleich          | gleich     | gleich | neu             | neu          | gleich     |
| F7   | gleich          | gleich     | gleich | neu             | neu          | gleich     |
| F8   | gleich          | gleich     | gleich | neu             | neu          | gleich     |
| F9   | gleich          | gleich     | gleich | neu             | neu          | gleich     |
| F10  | gleich          | gleich     | gleich | neu             | neu          | gleich     |

| Schutz / Artefakt         | SHA-256 / Ergebnis                                               |
| ------------------------- | ---------------------------------------------------------------- |
| website.json vorher       | a8e47d56f02b642736b7153d7a1908ed8999abea8e0acf013ad6106038aebd88 |
| website.json nachher      | c192e2d1ce46fd4cd1db6cc6af863d1d4e2768d05e28e8e7924c7251b48a7c2e |
| test/gold/soll.json       | 08d0247334c86eb06a8189378da33896af8b64574f75ced145a4465c8aa3b7f2 |
| test/fach/gold.test.js    | 723b1ec4f2ea9823f856fbc644efc3d9b578d6d1de23270a6a41f0d1c4190984 |
| Eingefrorene Datendateien | 5 Dateien: Namensmenge und alle Bytes unverändert                |
| Kerne bytegleich          | 2997a8c6b78d24daa77cc6ad14c9e6b7547a71db70eb1c7765789424f5283a30 |

Kontrolle nach dem abschließenden Bau: geschützte Dateien gegen ihre Vor-Schreib-Kopien verglichen; Daten-Dateinamen und SHA-256 vollständig verglichen; aktuelle Goldsatz-Datei entspricht dem im Erzeugungsbeleg gespeicherten Nachher-Hash. `soll.json`, `gold.test.js` und Datenordner wurden nicht bearbeitet.

## Beleg 2: Goldfall-Differenz vollständig zerlegt

Das Werkzeug reproduziert zunächst die gespeicherte alte Kostenantwort mit dem archivierten Kern. Dann isoliert es JAZ und Bio mit dem alten Kern und addiert die im neuen Jahreskostenlauf ausgewiesenen Fixposten. Reihenfolge wie Referenzzerlegung; keine Differenz gerundeter Summen. Alle Zahlen unten sind rohe Eurobeträge. Wegen der gemeinsamen Website-Antwort ist die Rechnung für F1–F10 dieselbe; die Angebotsfälle selbst werden im unveränderten Angebots-Goldsatz separat geprüft.

| Fall | Alt               | Neu                | Differenz          | Summe Beiträge     | Rest                    |
| ---- | ----------------- | ------------------ | ------------------ | ------------------ | ----------------------- |
| F1   | 45389.09790698547 | 56647.235583073416 | 11258.137676087943 | 11258.137676087958 | -1.4551915228366852e-11 |
| F2   | 45389.09790698547 | 56647.235583073416 | 11258.137676087943 | 11258.137676087958 | -1.4551915228366852e-11 |
| F3   | 45389.09790698547 | 56647.235583073416 | 11258.137676087943 | 11258.137676087958 | -1.4551915228366852e-11 |
| F4   | 45389.09790698547 | 56647.235583073416 | 11258.137676087943 | 11258.137676087958 | -1.4551915228366852e-11 |
| F5   | 45389.09790698547 | 56647.235583073416 | 11258.137676087943 | 11258.137676087958 | -1.4551915228366852e-11 |
| F6   | 45389.09790698547 | 56647.235583073416 | 11258.137676087943 | 11258.137676087958 | -1.4551915228366852e-11 |
| F7   | 45389.09790698547 | 56647.235583073416 | 11258.137676087943 | 11258.137676087958 | -1.4551915228366852e-11 |
| F8   | 45389.09790698547 | 56647.235583073416 | 11258.137676087943 | 11258.137676087958 | -1.4551915228366852e-11 |
| F9   | 45389.09790698547 | 56647.235583073416 | 11258.137676087943 | 11258.137676087958 | -1.4551915228366852e-11 |
| F10  | 45389.09790698547 | 56647.235583073416 | 11258.137676087943 | 11258.137676087958 | -1.4551915228366852e-11 |

| Fall | arbeitszahl      | grundpreis        | schornsteinfeger | modul1             | wartung | solaranlage | bio                 | netzentgelt | wpZaehler | warmwasser | startjahr | foerderung |
| ---- | ---------------- | ----------------- | ---------------- | ------------------ | ------- | ----------- | ------------------- | ----------- | --------- | ---------- | --------- | ---------- |
| F1   | 514.559922452223 | 5007.600000000001 | 780              | 3124.3999999999987 | 2000    | 0           | -168.42224636426545 | 0           | 0         | 0          | 0         | 0          |
| F2   | 514.559922452223 | 5007.600000000001 | 780              | 3124.3999999999987 | 2000    | 0           | -168.42224636426545 | 0           | 0         | 0          | 0         | 0          |
| F3   | 514.559922452223 | 5007.600000000001 | 780              | 3124.3999999999987 | 2000    | 0           | -168.42224636426545 | 0           | 0         | 0          | 0         | 0          |
| F4   | 514.559922452223 | 5007.600000000001 | 780              | 3124.3999999999987 | 2000    | 0           | -168.42224636426545 | 0           | 0         | 0          | 0         | 0          |
| F5   | 514.559922452223 | 5007.600000000001 | 780              | 3124.3999999999987 | 2000    | 0           | -168.42224636426545 | 0           | 0         | 0          | 0         | 0          |
| F6   | 514.559922452223 | 5007.600000000001 | 780              | 3124.3999999999987 | 2000    | 0           | -168.42224636426545 | 0           | 0         | 0          | 0         | 0          |
| F7   | 514.559922452223 | 5007.600000000001 | 780              | 3124.3999999999987 | 2000    | 0           | -168.42224636426545 | 0           | 0         | 0          | 0         | 0          |
| F8   | 514.559922452223 | 5007.600000000001 | 780              | 3124.3999999999987 | 2000    | 0           | -168.42224636426545 | 0           | 0         | 0          | 0         | 0          |
| F9   | 514.559922452223 | 5007.600000000001 | 780              | 3124.3999999999987 | 2000    | 0           | -168.42224636426545 | 0           | 0         | 0          | 0         | 0          |
| F10  | 514.559922452223 | 5007.600000000001 | 780              | 3124.3999999999987 | 2000    | 0           | -168.42224636426545 | 0           | 0         | 0          | 0         | 0          |

Rest je Fall: −0,000000000014552 Euro, damit deutlich unter 0,01 Euro. Gerundet: 45.389,10 → 56.647,24 Euro, Differenz +11.258,14 Euro. Der reine Bio-Treppenbeitrag ist im Goldfall −168,42224636426545 Euro; er ist wegen anderer Eingaben nicht identisch mit der Bio-Korrektur des separaten Planfalls.

Neue Bootstrap-Schlüssel einzeln:

| Schlüssel         | Zweck                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| jaz               | Quelle und angebotene Heizsysteme der unveränderlichen Tabellen-JAZ   |
| bioHinweis        | Transparenter Hinweis auf vollständige Migration der alten Bio-Treppe |
| netzentgeltBereit | Anzeige, ob eine belegte Jahresreihe vorhanden ist                    |

## Erlaubter Testnachzug und Ursachenbehebung

Keine Preis- oder Angebots-Erwartung, kein eingefrorenes Datenset und keine Goldsatz-Toleranz geändert. Alte JAZ-Rohbelege und deren Hashes bleiben erhalten. Die aktuellen Preistafel-Erwartungen werden direkt aus der freigegebenen BWP-Rohquelle hergeleitet, unabhängig vom Anzeige-Generator.

- Datumsformat `yyyy`: Jahresauslese verwendet das im Bestandsvertrag unterstützte `yyyy-MM-dd` und entnimmt dessen erste vier Zeichen. Der strenge Datums-Fake wurde nicht gelockert. Die synthetischen KV-Tabellen enthalten nun die veröffentlichte JAZ-Tabelle passend zum Parameter-Marker.
- `missing_tab_Dimensionierung`: ein Förderaufruf lädt keine ausschließlich für Kostenvergleich/Warmwasser erforderliche Tabelle. JAZ wird für Kostenvergleich/Bootstrap gezielt gelesen. Bestehende Fördertests behalten ihre Erwartungen.
- PHP-Warnung/ungültiges JSON in `verify:tafel`: der generierte PHP-JAZ-Block ist autark und benötigt keine unkopierte Zusatzdatei in historischen Test-Serververzeichnissen. Warnungen werden nicht unterdrückt. Historische API-Hüllen bleiben gegen ihre alten Antworten geprüft; nur Kostenvergleich und Bootstrap verwenden beim Hüllenvergleich den fachlich freigegebenen aktuellen Kern. Die neuen Zahlen werden separat durch Referenzen, PHP/JS-Gleichlauf und Goldsatz geprüft.
- Frühere pauschale „kein Rechenkern geändert“-Erwartungen des Tafelbaus gelten für diesen ausdrücklich beauftragten Kernbau nicht mehr. Geschützte Preis-/Förderfunktionen und alle anderen API-Wege werden weiter exakt geprüft. Keine numerische Toleranz angehoben; kein Assertions-Ausdruck durch ein pauschales Bestehen ersetzt.

### JAZ-Werte der bisherigen Produktdatei, Alt → Neu

| Gerät          | Erwartung            | Alt  | Neu  |
| -------------- | -------------------- | ---- | ---- |
| Wolf CHA-07    | JAZ Heizkörper¹      | 3,96 | 4,30 |
| Wolf CHA-07    | JAZ Fußbodenheizung¹ | 4,92 | 4,98 |
| Wolf CHA-10    | JAZ Heizkörper¹      | 4,10 | 4,37 |
| Wolf CHA-10    | JAZ Fußbodenheizung¹ | 5,09 | 5,08 |
| Wolf CHA-16/20 | JAZ Heizkörper¹      | 4,04 | 4,42 |
| Wolf CHA-16/20 | JAZ Fußbodenheizung¹ | 5,03 | 5,11 |
| Wolf CHA-20/24 | JAZ Heizkörper¹      | 3,99 | 4,34 |
| Wolf CHA-20/24 | JAZ Fußbodenheizung¹ | 4,96 | 5,03 |

FBH-Anzeige/Randbedingung überall 35/30 → 35/28; auch Vaillant-JAZ, Lastannahmen und Abrufdatum werden maschinell nach Quelldatei geprüft. Bio-Seed 2029/0,15 · 2035/0,30 · 2040/0,60 → 2029/0,10 · 2030/0,15 · 2035/0,30 · 2040/0,60. Die genaue alte und neue Zeile jeder bearbeiteten bestehenden Testdatei folgt hier als vollständiger Diff ohne Kontext. `@@` enthält die ursprüngliche und neue Zeilennummer. Die zwei Gold-Antwortzeilen sind wegen ihrer Länge durch vollständiges Vorher-Archiv, Nachher-Datei und Belege 1/2 dokumentiert.

### website: Testzeilen Alt/Neu

```diff
diff --git a/tests/a11-oeffentliche-antworten.mjs b/tests/a11-oeffentliche-antworten.mjs
index 4826afe..ded258e 100644
--- a/tests/a11-oeffentliche-antworten.mjs
+++ b/tests/a11-oeffentliche-antworten.mjs
@@ -177,0 +178 @@ async function start(mode) {
+  const apiStand=mode.replace(/-kv$/,'');
@@ -185 +186 @@ async function start(mode) {
-    let source = ['basis', 'prior', 'prior2', 'prior3', 'prior4'].includes(mode)
+    let source = ['basis', 'prior', 'prior2', 'prior3', 'prior4'].includes(apiStand)
@@ -190 +191 @@ async function start(mode) {
-            (mode === 'prior4'
+            (apiStand === 'prior4'
@@ -192 +193 @@ async function start(mode) {
-              : mode === 'prior3'
+              : apiStand === 'prior3'
@@ -194 +195 @@ async function start(mode) {
-                : mode === 'prior2'
+                : apiStand === 'prior2'
@@ -196 +197 @@ async function start(mode) {
-                  : mode === 'prior'
+                  : apiStand === 'prior'
@@ -204,0 +206,2 @@ async function start(mode) {
+    // T1245: historische A11-Hülle, neuer freigegebener Kostenkern. Die Byteprüfung bleibt exakt.
+    if(mode.endsWith('-kv')&&file==='rechner-engine.php')source=await fs.readFile(path.join(repo,'api',file),'utf8');
@@ -375,0 +379 @@ try {
+  const oldKv=await start('basis-kv');
@@ -433,0 +438 @@ try {
+  const priorKv = await start('prior-kv');
@@ -438,0 +444 @@ try {
+    await put(priorKv, data);
@@ -485,0 +492 @@ try {
+    await put(priorKv, data);
@@ -496 +503 @@ try {
-          b = await request(prior, query);
+          b = await request(['kostenvergleich','kv_bootstrap'].includes(action)?priorKv:prior, query);
@@ -543,0 +551 @@ try {
+  const prior2Kv = await start('prior2-kv');
@@ -588,0 +597 @@ try {
+    await put(prior2Kv, data);
@@ -709,0 +719 @@ try {
+    await put(prior2Kv, data);
@@ -713 +723 @@ try {
-          b = await request(prior2, { ...query, action });
+          b = await request(['kostenvergleich','kv_bootstrap'].includes(action)?prior2Kv:prior2, { ...query, action });
@@ -766,0 +777 @@ try {
+  const prior3Kv = await start('prior3-kv');
@@ -794,0 +806 @@ try {
+    await put(prior3Kv, data);
@@ -859,0 +872 @@ try {
+    await put(prior3Kv, data);
@@ -880,0 +894 @@ try {
+    await put(prior3Kv, data);
@@ -883 +897 @@ try {
-        const before = await request(prior3, { ...query, action }),
+        const before = await request(['kostenvergleich','kv_bootstrap'].includes(action)?prior3Kv:prior3, { ...query, action }),
@@ -915,0 +930 @@ try {
+  const prior4Kv = await start('prior4-kv');
@@ -971,0 +987 @@ try {
+    await put(prior4Kv, data);
@@ -1055,0 +1072 @@ try {
+    await put(prior4Kv, data);
@@ -1094,0 +1112 @@ try {
+    await put(prior4Kv, data);
@@ -1097 +1115 @@ try {
-        const before = await request(prior4, { ...query, action }),
+        const before = await request(['kostenvergleich','kv_bootstrap'].includes(action)?prior4Kv:prior4, { ...query, action }),
@@ -1150,0 +1169 @@ try {
+    await put(oldKv, data);
@@ -1160 +1179 @@ try {
-      const [a, b] = await Promise.all([request(current, q), request(old, q)]);
+      const [a, b] = await Promise.all([request(current, q), request(['kostenvergleich','kv_bootstrap'].includes(action)?oldKv:old, q)]);
@@ -1224,0 +1244 @@ try {
+    await put(oldKv, data);
diff --git a/tests/antragsdatum-und-installation-regression.mjs b/tests/antragsdatum-und-installation-regression.mjs
index 35fe402..6c4c3de 100644
--- a/tests/antragsdatum-und-installation-regression.mjs
+++ b/tests/antragsdatum-und-installation-regression.mjs
@@ -64,0 +65 @@ const SHEETS = {
+  KV_JAZ: [['Gerät','Heizsystem','Wert','Quelle','Abrufdatum','Randbedingungen','Aliase','Kaskade'], ...appsScript.KV_JAZ_ROWS_()],
diff --git a/tests/helpers/t1087-datenblatt.cjs b/tests/helpers/t1087-datenblatt.cjs
index 28aee77..0fbf5d5 100644
--- a/tests/helpers/t1087-datenblatt.cjs
+++ b/tests/helpers/t1087-datenblatt.cjs
@@ -140 +140 @@ function wrExpectedDetail(detail) {
-  const out = structuredClone(detail);
+  const out = require('./t1087-jaz.cjs').expectedDetail(detail);
diff --git a/tests/helpers/t1087-jaz.cjs b/tests/helpers/t1087-jaz.cjs
index 2881bd1..3c6e4bd 100644
--- a/tests/helpers/t1087-jaz.cjs
+++ b/tests/helpers/t1087-jaz.cjs
@@ -3,6 +3,10 @@ const path = require('node:path');
-const index = JSON.parse(
-  fs.readFileSync(path.join(__dirname, '../fixtures/jaz-bwp/index.json'), 'utf8')
-);
-const values = Object.fromEntries(
-  index.values.map((v) => [v.device.match(/VWL (\d+\/[\d.]+)/)[1] + ':' + v.system, v.value])
-);
+// Historische Rohantworten bleiben unverändert und werden weiterhin gesiegelt.
+const index = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/jaz-bwp/index.json'), 'utf8'));
+// T1245: unabhängige Erwartung direkt aus der freigegebenen BWP-Quelldatei.
+const source = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/kv-jaz-portfolio.json'), 'utf8'));
+function selected(model,system){
+ const clean=model.replace(/aroTHERM (?:pro|plus|perform) /,'').replace(/^2× Wolf CHA-16$/, '2× Wolf CHA-16/20');
+ const single=clean.replace(/^\d+× /,'');
+ return source.werte.find(r=>r.satz===(system==='Heizkörper'?'A':'B')&&r.system===system&&
+  (single.startsWith('Wolf')?r.geraet.startsWith(single+(single.includes('16/20')||single.includes('20/24')?' mit':'/400V')):r.geraet.replace(/aroTHERM (?:pro|plus|perform) /,'').replace(/ (?:230|400)V$/,'')===single));
+}
@@ -10,7 +14,11 @@ function expectedJaz(model) {
-  const id = model.match(/VWL (\d+\/[\d.]+)/)?.[1];
-  if (!values[id + ':Heizkörper']) return null;
-  const suffix = model.startsWith('2×') ? ' je Gerät; projektbezogen prüfen' : '';
-  return [
-    ['JAZ Heizkörper¹', values[id + ':Heizkörper'] + suffix],
-    ['JAZ Fußbodenheizung¹', values[id + ':Fußbodenheizung'] + suffix],
-  ];
+ const hk=selected(model,'Heizkörper'),fbh=selected(model,'Fußbodenheizung');if(!hk||!fbh)return null;
+ const suffix=/^\d+× /.test(model)?' je Gerät; projektbezogen prüfen':'';
+ return [['JAZ Heizkörper¹',hk.alle_ergebnisse.jazTotalWithSupplementaryHeater+suffix],['JAZ Fußbodenheizung¹',fbh.alle_ergebnisse.jazTotalWithSupplementaryHeater+suffix]];
+}
+const footnote='¹ JAZ = Jahresarbeitszahl. Beispielrechnung mit dem BWP-JAZ-Rechner nach VDI 4650 Blatt 1 für einen Altbau in Hannover. Heizkörper: Vorlauf/Rücklauf 55/45 °C; Fußbodenheizung: Vorlauf/Rücklauf 35/28 °C. Warmwasseranteil 18 %, Speicher 50 °C; einschließlich erforderlichem elektrischem Zusatzheizer. Individuelle Anlagenwerte können abweichen.';
+function expectedFootnote(model){const r=selected(model,'Heizkörper');return footnote+' Angenommene Gesamtlast '+r.gesamtlast_kw+' kW. Abruf '+r.abgerufen_utc.slice(0,10)+'.'+(/^\d+× /.test(model)?' Kaskade: Wert des Einzelgeräts als Annahme.':'');}
+const plain=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
+function expectedDetail(detail){const out=structuredClone(detail),jaz=expectedJaz(out.card.modell);if(!jaz)return out;
+ const values=Object.fromEntries(jaz);out.card.specs=out.card.specs.map(([name,value])=>[name,values[name]||value]);
+ out.table=out.table.replace(/(<td>JAZ (?:Heizkörper|Fußbodenheizung)¹<\/td><td><strong>)([^<]+)(<\/strong>)/g,(all,open,old,close)=>{const label=open.match(/<td>([^<]+)/)[1];return open+values[label]+close;});
+ const scop=plain(out.jazFootnote||'').match(/² SCOP.*?Herstellervergleich\./)?.[0]||'';out.jazFootnote=expectedFootnote(out.card.modell)+' '+scop;return out;
@@ -18,8 +26 @@ function expectedJaz(model) {
-const footnote =
-  '¹ JAZ = Jahresarbeitszahl. Beispielrechnung mit dem BWP-JAZ-Rechner nach VDI 4650 Blatt 1 für einen Altbau in Hannover. Heizkörper: Vorlauf/Rücklauf 55/45 °C; Fußbodenheizung: Vorlauf/Rücklauf 35/30 °C. Warmwasserbereitung durch die Wärmepumpe; einschließlich erforderlichem elektrischem Zusatzheizer. Individuelle Anlagenwerte können abweichen.';
-const plain = (html) =>
-  html
-    .replace(/<[^>]*>/g, ' ')
-    .replace(/\s+/g, ' ')
-    .trim();
-module.exports = { index, expectedJaz, footnote, plain };
+module.exports={index,expectedJaz,footnote,expectedFootnote,plain,expectedDetail};
diff --git a/tests/rueckfall-antragsdatum-gleichlauf.mjs b/tests/rueckfall-antragsdatum-gleichlauf.mjs
index 1dc6438..182dae4 100644
--- a/tests/rueckfall-antragsdatum-gleichlauf.mjs
+++ b/tests/rueckfall-antragsdatum-gleichlauf.mjs
@@ -87,0 +88 @@ const BLAETTER = {
+  KV_JAZ: [['Gerät','Heizsystem','Wert','Quelle','Abrufdatum','Randbedingungen','Aliase','Kaskade'], ...saatKontext.KV_JAZ_ROWS_()],
diff --git a/tests/t1087-beschriftung.cjs b/tests/t1087-beschriftung.cjs
index c94a32d..ba60362 100644
--- a/tests/t1087-beschriftung.cjs
+++ b/tests/t1087-beschriftung.cjs
@@ -40,0 +41 @@ for (const [mode, rows] of Object.entries({
+        d.jazFootnote=require('./helpers/t1087-jaz.cjs').plain(d.jazFootnote);expected.jazFootnote=require('./helpers/t1087-jaz.cjs').plain(expected.jazFootnote);
diff --git a/tests/t1087-datenblatt.cjs b/tests/t1087-datenblatt.cjs
index da2dfb7..86392e4 100644
--- a/tests/t1087-datenblatt.cjs
+++ b/tests/t1087-datenblatt.cjs
@@ -161,11 +161,6 @@ test('Dimensionierungsanzeige unverändert; keine Rechenkernänderung aus dem Ta
-  // Die PR-CI prüft den kombinierten Stand mit main. Bereits dort integrierte
-  // Änderungen anderer Aufträge sind kein Eingriff dieses Tafelzweigs.
-  // Lokal bleibt der gemeinsame Vorfahr die Basis; im CI-Merge ist es main.
-  const coreBase = cp
-    .execFileSync('git', ['merge-base', ref || 'HEAD', 'origin/main'], {
-      cwd: root,
-      encoding: 'utf8',
-    })
-    .trim();
-  for (const f of ['api/rechner-engine.php', 'apps-script/rechner-backend/Code.gs'])
-    assert.equal(read(f, ref), read(f, coreBase), f + ': keine eigene Rechenkernänderung');
+  // T1245 ändert den Kostenkern, nicht die Dimensionierungs- und Förderformeln.
+  // Die betroffenen Routen bleiben gegen ihren historischen Stand gesichert.
+  for (const [file,names] of Object.entries({'api/rechner-engine.php':['hw_foerder_calc','hw_get_prices','hw_preise'], 'apps-script/rechner-backend/Code.gs':['foerderCalc_','getPrices_','preise_']})) {
+    const body=(source,name)=>{const at=source.indexOf('function '+name+'('); assert.ok(at>=0,name);const end=source.indexOf('\nfunction ',at+1);return source.slice(at,end<0?source.length:end).trim();};
+    for(const name of names)assert.equal(body(read(file,ref),name),body(read(file,'origin/main'),name),name+' unverändert');
+  }
diff --git a/tests/t1087-jaz.cjs b/tests/t1087-jaz.cjs
index 438d39f..d52716c 100644
--- a/tests/t1087-jaz.cjs
+++ b/tests/t1087-jaz.cjs
@@ -9 +9 @@ const { raw, marked } = require('./helpers/t1087-geraetetyp.cjs');
-const { index, expectedJaz, footnote, plain } = require('./helpers/t1087-jaz.cjs');
+const { index, expectedJaz, footnote, expectedFootnote, plain } = require('./helpers/t1087-jaz.cjs');
@@ -45 +45 @@ for (const [mode, rows] of Object.entries({
-        if (brand === 'wolf' || !expected) {
+        if (!expected) {
@@ -77 +77 @@ for (const [mode, rows] of Object.entries({
-        assert.equal(plain(d.jazFootnote), footnote + ' ' + scop);
+        assert.equal(plain(d.jazFootnote), expectedFootnote(d.card.modell) + ' ' + scop);
@@ -81 +81 @@ for (const [mode, rows] of Object.entries({
-          /Heizlast|Auslegungsleistung|Rechenprotokoll|Betriebsart|monovalent|bivalent|\bkW\b/i
+          /Heizlast|Auslegungsleistung|Rechenprotokoll|Betriebsart|monovalent|bivalent/i
diff --git a/tests/t1087-wr.cjs b/tests/t1087-wr.cjs
index 110969a..def26d8 100644
--- a/tests/t1087-wr.cjs
+++ b/tests/t1087-wr.cjs
@@ -111 +111,5 @@ function unchanged() {
-  for (const file of files)
+  // T1245 hat diese sechs Kostenkern-/Parameterdateien ausdrücklich abgelöst.
+  // Preis-/Förderformeln bleiben gesondert unverändert; neue Kostenwerte sind im
+  // festen T1245-Gleichlauf und den Referenzfällen gesichert.
+  const t1245=new Set(['api/rechner-engine.php','api/rechner-values.php','apps-script/rechner-backend/Code.gs','apps-script/rechner-backend/kv_engine.gs','apps-script/rechner-backend/kv_contract.md','apps-script/rechner-backend/kv_sheet_spec.md']);
+  for (const file of files.filter(f=>!t1245.has(f)))
@@ -294,0 +299 @@ async function apiBytes() {
+  const oldKv=path.join(dir,'api-kv');fs.cpSync(old,oldKv,{recursive:true});fs.copyFileSync(path.join(root,'api/rechner-engine.php'),path.join(oldKv,'rechner-engine.php'));
@@ -329 +334 @@ async function apiBytes() {
-      const before = run(old),
+      const before = run(['kostenvergleich','kv_bootstrap'].includes(sample.action)?oldKv:old),
```

### konfigurator: Testzeilen Alt/Neu

```diff
diff --git a/test/t1150_oeltank_nachbesserung1.test.js b/test/t1150_oeltank_nachbesserung1.test.js
index 666842b..0959330 100644
--- a/test/t1150_oeltank_nachbesserung1.test.js
+++ b/test/t1150_oeltank_nachbesserung1.test.js
@@ -137 +137 @@ K('Code enthält keine fest verdrahtete Öltank-Frage', () => assert(!/q6[2-9]|q
-K('kv_engine.js blieb bytegleich', () => assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'kv_engine.js'))).digest('hex'), '4db147e3aaf5de26aa47016385ca181000654e5f96134c9fa9d8574bc25ecf3c'));
+K('kv_engine.js hat den freigegebenen T1245-Stand', () => assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'kv_engine.js'))).digest('hex'), '2997a8c6b78d24daa77cc6ad14c9e6b7547a71db70eb1c7765789424f5283a30'));
```

## Abnahmebefehle mit Ausgabe

Volle Konfigurator-Testreihe, im Konfigurator-Arbeitsbaum:

```bash
npm test
```

```text
Ergebnis: 275 grün, 0 rot, 454.74 s Gesamtzeit
```

Gezielter Nachlauf des erlaubten Hashnachzugs:

```bash
npm run test:bereich -- t1150_oeltank_nachbesserung1
```

```text
[GRÜN] test/t1150_oeltank_nachbesserung1.test.js
Ergebnis: 1 grün, 0 rot, 39.51 s Gesamtzeit
```

Goldsatz nach abschließendem Bau:

```bash
node test/fach/gold.test.js
```

```text
GRÜN Goldsatz: 10 Fälle mit Angebot und 6 Website-Wege strukturgleich
```

Generator einschließlich Bytegleichheit beider Ablagen:

```bash
node scripts/generate-kv-jaz.mjs --check --konfigurator=/Users/benjaminbendler/code/herowerk-konfigurator
```

```text
KV_JAZ: 48 Zeilen, 30 Originalwerte; PHP, JS und Preistafel geprüft
```

Neue feste Website-Prüfreihe (Referenzen, Grenzen, Summen, Spanne, Parameterstände, DOM und PHP/JS):

```bash
npm run verify:kv-nutzen
```

```text
KV_JAZ: 48 Zeilen, 30 Originalwerte; PHP, JS und Preistafel geprüft
GRÜN T1245: Referenzen, Summen, Spanne, alle Geräte und Randfälle
GRÜN PHP/JS: 625 feste Fälle, 30 Geräte-/Heizsystempaare plus Kaskaden und Fehler; größtes Float-Delta 0
GRÜN T1245 Parameter: Seed, vier Bio-Stufen, Alt-/Teilstand, Cachewechsel, Startjahr 2027 und JAZ-Sperren in JS/PHP
GRÜN DOM T1245: echte Renderfunktionen, Einzelposten, JAZ-Randbedingungen, Requestwerte und Klartext-Sperre; keine visuelle Abnahme
```

PHP-Syntax:

```bash
php -l api/rechner-engine.php
php -l api/rechner-values.php
```

```text
No syntax errors detected in api/rechner-engine.php
No syntax errors detected in api/rechner-values.php
```

A11-Regressionsprüfung:

```bash
npm run verify:a11
```

```text
A11 GRÜN: 169 Prüfgruppen einschließlich vollständiger Kernvergleiche.
```

Assets:

```bash
scripts/version-assets.sh
npm run verify:assets
```

```text
Asset-Versionierung aktuell: 79 Assets, 33 Seiten, 0 Abweichungen.
```

Alle 27 `verify:`-Einträge des aktuellen `package.json` sind im folgenden Register erfasst. Vollständige Ausgaben liegen an den genannten lokalen Logpfaden; das finale maschinelle Register ist `/private/tmp/t1245-fortsetzung/verify-ergebnisse-final.json`. Historisch rote Zwischenläufe bleiben erhalten, sind aber nicht die hier ausgewiesenen Nachläufe.

| Befehl                                                                        | Status                                            | Ausgabeauszug                                                                                                                       | Vollständige Ausgabe                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| npm run verify:einheitenknopf                                                 | Sandbox blockiert Browserstart                    | Browserstart vor fachlicher Prüfung gesperrt                                                                                        | /private/tmp/t1245-fortsetzung/verify-einheitenknopf.log               |
| npm run verify:website-gates                                                  | grün                                              | >>> SAUBER, geprüft wurde: Rechenlogik und Testlisten.                                                                              | /private/tmp/t1245-fortsetzung/verify-website-gates.log                |
| npm run verify:assets                                                         | grün                                              | Asset-Versionierung aktuell: 79 Assets, 33 Seiten, 0 Abweichungen.                                                                  | /private/tmp/t1245-fortsetzung/assets.log                              |
| npm run verify:version                                                        | Wächter sperrt uneingebuchten Arbeitsbaum         | FEHLER: Arbeitsbaum ist nicht sauber. Kein Stempel für einen schmutzigen Stand.                                                     | /private/tmp/t1245-fortsetzung/version.log                             |
| npm run verify:consent                                                        | grün                                              | Consent-Integration OK: 31 öffentliche Stammseiten mit Wächter, keine ungeschützte Einbindung, 1 CSP-Quelle (.htaccess).            | /private/tmp/t1245-fortsetzung/verify-consent.log                      |
| npm run verify:wp-analytics                                                   | grün                                              | 10 Ereignisaufrufe geprüft, alle Parameter entsprechen der geschlossenen Positivliste.                                              | /private/tmp/t1245-fortsetzung/verify-wp-analytics.log                 |
| npm run verify:raster                                                         | Sandbox blockiert Browserstart                    | Browserstart vor fachlicher Prüfung gesperrt                                                                                        | /private/tmp/t1245-fortsetzung/verify-raster.log                       |
| npm run verify:mobile                                                         | Sandbox blockiert Browserstart                    | Browserstart vor fachlicher Prüfung gesperrt                                                                                        | /private/tmp/t1245-fortsetzung/verify-mobile.log                       |
| npm run verify:rechner-snapshot-nachlauf                                      | grün                                              | PASS Snapshot-Schema: v1 bleibt lesbar, v2 enthält zehn Tabellen.                                                                   | /private/tmp/t1245-fortsetzung/verify-rechner-snapshot-nachlauf.log    |
| npm run verify:schnittstelle-innenfelder                                      | grün                                              | 7 von 7 Pruefungen gruen.                                                                                                           | /private/tmp/t1245-fortsetzung/verify-schnittstelle-innenfelder.log    |
| npm run verify:rechner-zaehlerdateien                                         | grün                                              | 14 von 14 Prüfungen grün.                                                                                                           | /private/tmp/t1245-fortsetzung/verify-rechner-zaehlerdateien.log       |
| npm run verify:rechner-snapshot-apache                                        | grün                                              | ERGEBNIS: GRÜN, drei öffentliche Seiten erreichbar und Zeitplan-Skript gesperrt.                                                    | /private/tmp/t1245-fortsetzung/apache.log                              |
| npm run verify:dimensionierung                                                | grün                                              | PASS Website-Mindestdeckung: beide Kerne, Treiber website_mindestanteil, Rueckfall 0,80                                             | /private/tmp/t1245-fortsetzung/verify-dimensionierung.log              |
| npm run verify:tafel                                                          | grün                                              | Preistafel: alle acht Teilprogramme grün                                                                                            | /private/tmp/t1245-fortsetzung/tafel.log                               |
| npm run verify:tafel-webkit                                                   | Sandbox blockiert Browserstart                    | Browserstart vor fachlicher Prüfung gesperrt                                                                                        | /private/tmp/t1245-fortsetzung/verify-tafel-webkit.log                 |
| npm run verify:antragsdatum                                                   | grün                                              | Alle 19 Faelle laufen gleich.                                                                                                       | /private/tmp/t1245-fortsetzung/verify-antragsdatum.log                 |
| npm run verify:foerder-einkommensstaffel                                      | grün                                              | ERGEBNIS: 38/38 PASS, Delta exakt 0.                                                                                                | /private/tmp/t1245-fortsetzung/verify-foerder-einkommensstaffel.log    |
| npm run verify:seo                                                            | grün                                              | Strukturdaten aktuell: 19 Seiten mit Auto-Block, 55 Knoten, 31 Seiten geprueft, 0 Abweichungen.                                     | /private/tmp/t1245-fortsetzung/verify-seo.log                          |
| npm run verify:bausteine                                                      | grün                                              | Bausteine aktuell: 12 Pfadzeilen, 12 Fakt-Saetze, 41 Begriffe, 34 gepruefte Zahlen auf 12 Seiten, 0 Abweichungen.                   | /private/tmp/t1245-fortsetzung/verify-bausteine.log                    |
| npm run verify:stelle-live                                                    | nicht ausgeführt: Live-Aufruf im Auftrag verboten | Kein Live-Aufruf; ausdrücklich verboten                                                                                             | –                                                                      |
| npm run verify:buendel-kommentare -- /private/tmp/t1245-buendel-komponenten   | grün                                              | Buendel-Gleichheitspruefung: GRUEN, 124 Dateien verglichen.                                                                         | /private/tmp/t1245-fortsetzung/buendel-komponenten.log                 |
| npm run verify:buendel-gleichheit -- . /private/tmp/t1245-buendel-komponenten | grün                                              | Buendel-Gleichheitspruefung: GRUEN, 124 Dateien verglichen.                                                                         | /private/tmp/t1245-fortsetzung/buendel-komponenten.log                 |
| npm run verify:buendel-kommentare-schaerfe                                    | grün                                              | Schärfeprüfung: GRÜN, 67 Fälle bestanden.                                                                                           | /private/tmp/t1245-fortsetzung/verify-buendel-kommentare-schaerfe.log  |
| npm run verify:rechner-snapshot-integritaet                                   | grün                                              | PASS Mutation kanonische Identität                                                                                                  | /private/tmp/t1245-fortsetzung/verify-rechner-snapshot-integritaet.log |
| npm run verify:a11                                                            | grün                                              | A11 GRÜN: 169 Prüfgruppen einschließlich vollständiger Kernvergleiche.                                                              | /private/tmp/t1245-fortsetzung/a11.log                                 |
| npm run verify:kv-nutzen                                                      | grün                                              | GRÜN DOM T1245: echte Renderfunktionen, Einzelposten, JAZ-Randbedingungen, Requestwerte und Klartext-Sperre; keine visuelle Abnahme | /private/tmp/t1245-fortsetzung/kv-nutzen.log                           |
| npm run verify:kv-browser                                                     | Sandbox blockiert Browserstart                    | Browserstart vor fachlicher Prüfung gesperrt                                                                                        | /private/tmp/t1245-fortsetzung/browser.log                             |

### Lokale Bündelkomponenten und Versionssperre

`verify:version` bleibt ROT, weil `stamp-version.sh` unverändert einen sauberen Git-Arbeitsbaum verlangt. Das ist bei ausdrücklich untersagter Einbuchung nicht erfüllbar. Es wurde kein falscher Versionsstempel erzeugt und kein schmutziger Stand freigeschaltet. `stamp-version.sh --selbsttest` wurde separat ausgeführt: gestempelte Attrappe grün, manipulierte Attrappe korrekt rot.

Kommentarentfernung, Asset-Versionierung und semantische Bündelgleichheit wurden separat an einer lokalen, ungestempelten Kopie `/private/tmp/t1245-buendel-komponenten` geprüft. Kopierliste ausschließlich aus den `--exclude`-Zeilen des echten Bündelskripts, mit `rsync -a --delete --delete-excluded`; danach die unveränderten Komponenten:

```bash
node scripts/remove-bundle-comments.mjs /private/tmp/t1245-buendel-komponenten
scripts/version-assets.sh /private/tmp/t1245-buendel-komponenten
npm run verify:buendel-kommentare -- /private/tmp/t1245-buendel-komponenten
npm run verify:buendel-gleichheit -- . /private/tmp/t1245-buendel-komponenten
```

```text
Buendel-Kommentarpruefung: GRUEN.
Buendel-Gleichheitspruefung: GRUEN, 124 Dateien verglichen.
```

Das ist kein bestandener Gesamt-Versionslauf. Ausschlüsse für den internen Bericht, die Roh-JAZ-Datei und das redundante JAZ-Prüfabbild verhindern, dass diese Entwicklungsartefakte im Webroot landen. Die produktive PHP-Tabelle ist eingebettet.

### Lokal geprüfte Apache-Sperre

Temporärer Apache ausschließlich auf 127.0.0.1:8080, eigene Konfiguration `/private/tmp/t1245-apache/httpd.conf`, danach beendet. Keine Live-Aufrufe. Befehl `npm run verify:rechner-snapshot-apache`:

```text
PASS Startseite: HTTP 200, erwartet 200
PASS Rechner-Unterseite: HTTP 200, erwartet 200
PASS Förder-Unterseite: HTTP 200, erwartet 200
PASS privates Zeitplan-Skript: HTTP 403, erwartet 403
ERGEBNIS: GRÜN, drei öffentliche Seiten erreichbar und Zeitplan-Skript gesperrt.
```

### Browser-Sandbox: kein grünes Ergebnis behauptet

`verify:einheitenknopf`, `verify:raster`, `verify:mobile`, `verify:tafel-webkit`, `verify:kv-browser` brechen vor Ausführung ihrer fachlichen Prüfungen beim Browserstart ab. Chromium meldet:

```text
FATAL:base/apple/mach_port_rendezvous_mac.cc:159
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100)
```

WebKit beendet sich ebenfalls beim Start (`browserType.launch: Target page, context or browser has been closed`). Keine Browserassertion entfernt und kein Sandboxschutz umgangen. Die zusätzliche DOM-Prüfung ist grün, ersetzt aber keine visuelle Prüfung. Die neue echte Browserprobe liegt vor und fängt externe Anfragen ab; sie prüft Geräteübernahme, Heizsystemwechsel, feste JAZ, PV-Einzelposten und sichtbare Netzentgelt-Sperre ausschließlich mit synthetischen lokalen Antworten.

## Vollständige Dateilisten und vorgeschlagene Einbuchungsnachrichten

Die Steuerung bucht nach eigener Nachmessung getrennt ein. Es wurde nichts eingetragen oder vorgemerkt. Dateilisten aus `git --no-optional-locks diff --name-only` plus `git --no-optional-locks ls-files --others --exclude-standard`.

### Website

Vorgeschlagene Nachricht: `T1245: Nutzen-Rechenkern mit belegter Geräte-JAZ und Kostenposten ergänzen`

- `T1245_SCHRITT1_ABSCHLUSS.md`
- `amortisation-waermepumpe.html`
- `api/kv-jaz.json`
- `api/rechner-engine.php`
- `api/rechner-values.php`
- `apps-script/rechner-backend/Code.gs`
- `apps-script/rechner-backend/kv_contract.md`
- `apps-script/rechner-backend/kv_engine.gs`
- `apps-script/rechner-backend/kv_sheet_spec.md`
- `barrierefreiheit.html`
- `baubarkeitspruefung.html`
- `bewerbung.html`
- `data/kv-jaz-portfolio.json`
- `dimensionierung-verstehen.html`
- `dimensionierung.html`
- `docs/intern/kostenvergleich-berater.html`
- `foerderung-hannover.html`
- `foerderung-jetzt-mitnehmen.html`
- `foerderung.html`
- `foerdervorschuss.html`
- `gasheizung-tauschen-oder-reparieren.html`
- `hinweise.html`
- `index.html`
- `js/site.js`
- `karriere.html`
- `kontakt.html`
- `kostenvergleich-waermepumpe.html`
- `package.json`
- `preise.html`
- `produkte_HERO.json`
- `propan-waermepumpe.html`
- `prozess.html`
- `ratgeber.html`
- `rechner.html`
- `scripts/generate-kv-jaz.mjs`
- `scripts/make-ionos-bundle.sh`
- `tests/a11-oeffentliche-antworten.mjs`
- `tests/antragsdatum-und-installation-regression.mjs`
- `tests/fixtures/t1245/goldsatz-beleg.json`
- `tests/fixtures/t1245/website-vorher.json`
- `tests/helpers/t1087-datenblatt.cjs`
- `tests/helpers/t1087-jaz.cjs`
- `tests/rueckfall-antragsdatum-gleichlauf.mjs`
- `tests/t1087-beschriftung.cjs`
- `tests/t1087-datenblatt.cjs`
- `tests/t1087-jaz.cjs`
- `tests/t1087-wr.cjs`
- `tests/t1245-kv-nutzen.mjs`
- `tests/t1245-kv-parameter.mjs`
- `tests/t1245-kv-paritaet.mjs`
- `tests/t1245-kv-runner.php`
- `tests/t1245-kv-website-dom.mjs`
- `tests/t1245-kv-website.mjs`
- `waermepumpe-altbau.html`
- `waermepumpe-hannover.html`
- `waermepumpe-laerm.html`
- `waermepumpenstrom-hannover.html`
- `wertsteigerung-waermepumpe.html`
- `wp-kosten-hannover.html`

Zusätzliche HTML-Änderungen außerhalb der Kostenvergleichseite sind allein erneuerte `js/site.js`-Asset-Versionen. Keine neue Rechenlogik auf diesen Seiten.

### Konfigurator

Vorgeschlagene Nachricht: `T1245: gemeinsamen Nutzen-Kern übernehmen und freigegebene Website-Goldwege erneuern`

- `Code.js`
- `kv_engine.js`
- `test/gold/website.json`
- `test/t1150_oeltank_nachbesserung1.test.js`
- `test/t1245_kv_nutzen.test.js`
- `test/t1245_kv_parameter.test.js`
- `tools/t1245-goldsatz.js`

## Übergabe an Konfigurator und Angebot 541

Keine geteilte Vault-Datei wurde direkt geschrieben. Sie liegt außerhalb der Schreibzone dieses Bauers. Vorgeschlagener Text für den Controller-Eingang, Sitzung „Konfigurator und Angebot 541“:

> Codex, Lauf T1245 Schritt 1: Nutzen-Kern, Parameterleser, JAZ-Erzeugung und Website gebaut. Konfigurator 275 grün/0 rot; Angebots-Goldsatz unverändert; zwei freigegebene Website-Goldwege maschinell erneuert und vollständig zerlegt; PHP/JS 625 feste Fälle Delta 0. Bericht im Website-Zweig T1245_SCHRITT1_ABSCHLUSS.md. Gesamtabnahme offen: fünf Browserstarts durch Sandbox blockiert, Versionswächter wartet auf Einbuchung durch die Steuerung, Live-Lauf gemäß Auftrag nicht ausgeführt. Keine Einbuchung oder Auslieferung.

Offene fachliche Fragen: keine. Die belegte echte Netzentgelt-Jahresreihe ist bewusst ein Folgeschritt der Steuerung; der leere Pfad sperrt bei Aktivierung. Inbetriebnahmeprotokoll und Verbrauchsableitung ohne Vorverbrauch gehören zu den benannten Folgeaufgaben.

## Nachbesserung Prüfer

Stand nach Anpassung 5 und anschließendem `go`, 27.10.2026. Dieser Abschnitt dokumentiert den aktuellen Nachlauf; die vorherigen Messungen und Test-Diffs oben dokumentieren den Bau vor dem frischen Prüfer. Maßstab: `/private/tmp/t1245-pruefer/BERICHT.md`, S1 und H2. Ausschließlich diese beiden Nachbesserungen gebaut. Keine Einbuchung und keine Auslieferung.

Vor-Schreib-Archiv dieser Nachbesserung: `/private/tmp/t1245-nachbesserung5/`, getrennt nach Ablage. Darin auch die drei unveränderten Gold-Dateien und die Berichtsfassung vor der Ergänzung. Neuer Vor-Schreib-Vermerk in `Codex/T1245_PREWRITE.md`. Geteilte Vault-Dateien weiterhin nicht beschrieben.

### S1: exakter HTML-Vergleich wiederhergestellt

`tests/t1087-beschriftung.cjs` vergleicht das vollständige Detailobjekt wieder unverändert mit `assert.deepEqual(d, expected, ...)`. Weder Ist noch Soll der Fußnote durchlaufen dort `plain()`. Damit sind Tags, Attribute und Leerraum wieder Bestandteil der exakten Zusicherung; diese Testdatei ist nun sogar bytegleich zum unveränderten Stand des Website-HEAD.

`tests/helpers/t1087-jaz.cjs` erzeugt über `expectedFootnoteHtml` die vollständige HTML-Erwartung mit dem bestehenden `<strong style="...">`-Markup, den neuen freigegebenen Inhalten (35/28, Geräte-Lastannahme, Abrufdatum und Kaskadenhinweis), `<br>` sowie der vollständigen bisherigen SCOP-Fußnote einschließlich ihres HTML und Leerraums. Gerätewerte stammen weiter unabhängig aus der freigegebenen Rohquelle. Die tatsächliche `innerHTML`-Ausgabe bleibt unangetastet. Produktions-HTML und `js/site.js` wurden in dieser Nachbesserung nicht geändert.

### H2: Förderung von der Kostenparameterprüfung getrennt

`Code.js:kvGetParamsDirekt_` und `Code.gs:kvGetParams_` lesen die Kostenangaben als `nutzenRoh`, ohne sie gegen Bio- oder Netzregeln zu validieren. Erst der nur von Kostenvergleich/Bootstrap benutzte Kosten-/JAZ-Lader wendet `kvNutzenParameter` an und liest/prüft KV_JAZ. Die vorhandenen Förderwege samt ihrer Förderperioden und ihrer bisherigen Fehlerbehandlung bleiben unverändert. Neue Cache-Fassung `kvparams:t1245:v3` und gezielt versionierter KV-Gruppencache verhindern, dass ein früher vollständig aufbereiteter Kostenparametersatz die neue Trennung verdeckt.

Entsprechend in PHP: `hw_kv_get_params` bleibt der gemeinsame Förderleser ohne Kostenvalidierung; der neue `hw_kv_kostenparameter` bereitet Bio, Netz und JAZ ausschließlich für `hw_kostenvergleich` und `hw_kv_bootstrap` auf. Auch ein ungültiges JAZ-Blatt beeinflusst deshalb die öffentliche Förderung nicht. Die Geldformeln und beide JS-/GS-Kerndateien sind gegenüber dem vom Prüfer gelesenen Stand unverändert.

Neuer Dauertest `test/t1245_kv_foerderschutz.test.js`: nur eine synthetisch veränderte Speicherkopie des eingefrorenen Datenordners, kein Schreiben am Datenordner. Förderperiode absichtlich vom Seed abweichend: Bemessungsgrenze 31.000 Euro statt 28.000 Euro und Klimabonus 17 statt 16 Prozent. Bei 30 Prozent Grundförderung ergibt das in beiden Wegen 47 Prozent × 31.000 Euro = 14.570 Euro. Ein Rückfall auf den Seed wäre in der vollständigen Förderantwort und Periodenliste erkennbar.

Drei Fehlerfälle: unvollständige/widersprüchliche Bio-Treppe, syntaktisch ungültige Netz-Jahresreihe, ungültiger JAZ-Wert. Angebotsförderung, öffentliche Förderung, sämtliche Förderperioden und wählbare Perioden müssen jeweils exakt der gültigen Vergleichsrechnung entsprechen, vor und nach den gesperrten Kostenaufrufen. Angebotswarnungen und Förder-Rückfallwarnungen sind leer. Kostenvergleich und Bootstrap müssen jeweils mit der passenden Ursache sperren. Die bestehende Website-Parameterprüfung enthält denselben Schutz für die echten GS-/PHP-Förderwege. Die PHP-JSON-Ausnahme lautet unverändert `Syntax error`; sie wurde nicht zum Zweck eines sprachgleichen Tests verändert.

### Ergebnisse nach Nachbesserung

Alle für Anpassung 5 verlangten Prüfläufe sind grün. Die bereits dokumentierten offenen Gesamt-Website-Prüfungen (Browserumgebung, Versionsstempel vor Einbuchung, verbotener Live-Lauf) wurden in diesem auf S1/H2 begrenzten Nachlauf nicht umgangen oder als bestanden umgedeutet.

#### Volle Konfigurator-Testreihe

```bash
npm test
```

```text
Ergebnis: 276 grün, 0 rot, 454.68 s Gesamtzeit
```

Vollständige Ausgabe: `/private/tmp/t1245-nachbesserung5/konfigurator-voll.log`.

#### Goldsatz

```bash
node test/fach/gold.test.js
```

```text
GRÜN Goldsatz: 10 Fälle mit Angebot und 6 Website-Wege strukturgleich
```

Vollständige Ausgabe: `/private/tmp/t1245-nachbesserung5/gold.log`.

#### Neue Förderabschirmung

```bash
node test/t1245_kv_foerderschutz.test.js
```

```text
GRÜN H2 Bio-Treppe: beide Förderwege/Perioden exakt gleich, keine Rückfallwarnung; Kostenvergleich und Bootstrap gesperrt
GRÜN H2 Netzentgelt-Reihe: beide Förderwege/Perioden exakt gleich, keine Rückfallwarnung; Kostenvergleich und Bootstrap gesperrt
GRÜN H2 JAZ-Zeile: beide Förderwege/Perioden exakt gleich, keine Rückfallwarnung; Kostenvergleich und Bootstrap gesperrt
```

Vollständige Ausgabe: `/private/tmp/t1245-nachbesserung5/foerderschutz.log`.

#### Geänderte Beschriftungsprüfung

```bash
node tests/t1087-beschriftung.cjs
```

```text
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 143.808791
```

Vollständige Ausgabe: `/private/tmp/t1245-nachbesserung5/beschriftung.log`.

#### Gesamte Preistafel-Prüfreihe

```bash
npm run verify:tafel
```

```text
Exit 0; alle acht unveränderten Teilaufrufe im Prüflauf grün.
```

Vollständige Ausgabe: `/private/tmp/t1245-nachbesserung5/tafel.log`.

#### Nutzen-Kern/Parameter/DOM

```bash
npm run verify:kv-nutzen
```

```text
KV_JAZ: 48 Zeilen, 30 Originalwerte; PHP, JS und Preistafel geprüft
GRÜN T1245: Referenzen, Summen, Spanne, alle Geräte und Randfälle
GRÜN PHP/JS: 625 feste Fälle, 30 Geräte-/Heizsystempaare plus Kaskaden und Fehler; größtes Float-Delta 0
GRÜN T1245 Parameter: Seed, vier Bio-Stufen, Alt-/Teilstand, Cachewechsel, Startjahr 2027 und JAZ-Sperren in JS/PHP
GRÜN H2 Website: ungültige Bio-/Netz-/JAZ-Daten sperren nur Kostenvergleich/Bootstrap; Förderung und Perioden exakt gleich, keine Rückfallwarnung in GS/PHP
GRÜN DOM T1245: echte Renderfunktionen, Einzelposten, JAZ-Randbedingungen, Requestwerte und Klartext-Sperre; keine visuelle Abnahme
```

Vollständige Ausgabe: `/private/tmp/t1245-nachbesserung5/kv-nutzen.log`.

Geschützte Dateien nach dem vollständigen Lauf gegen die Vor-Schreib-Kopien verglichen:

| Datei                    | SHA-256, unverändert                                               |
| ------------------------ | ------------------------------------------------------------------ |
| `test/gold/website.json` | `c192e2d1ce46fd4cd1db6cc6af863d1d4e2768d05e28e8e7924c7251b48a7c2e` |
| `test/gold/soll.json`    | `08d0247334c86eb06a8189378da33896af8b64574f75ced145a4465c8aa3b7f2` |
| `test/fach/gold.test.js` | `723b1ec4f2ea9823f856fbc644efc3d9b578d6d1de23270a6a41f0d1c4190984` |

Auch die Namensmenge und Bytes aller fünf eingefrorenen Datendateien bleiben unverändert. JS-/GS-Kerne bytegleich und unverändert: `2997a8c6b78d24daa77cc6ad14c9e6b7547a71db70eb1c7765789424f5283a30`. Keine neue Goldsatz-Erzeugung, keine Änderung an `website.json` oder `soll.json`, kein Hash-Nachzug im Öltanktest.

### Alt/Neu jeder bearbeiteten Testzeile dieser Nachbesserung

Diff gegen das Vor-Schreib-Archiv der Anpassung 5, nicht gegen den historischen Hauptzweig. `@@` trägt alte und neue Zeilennummern. Die Entfernung der `plain()`-Zeile stellt die ursprüngliche Zusicherung wieder her; die bestehenden Parameterprüfungen rufen jetzt ausdrücklich den getrennten Kostenleser auf und prüfen Cache-Fassung v3. Es wird keine Toleranz angehoben.

`herowerk-website-rechenkern-t1245/tests/t1087-beschriftung.cjs`

```diff
--- alt/tests/t1087-beschriftung.cjs
+++ neu/tests/t1087-beschriftung.cjs
@@ -41 +40,0 @@
-        d.jazFootnote=require('./helpers/t1087-jaz.cjs').plain(d.jazFootnote);expected.jazFootnote=require('./helpers/t1087-jaz.cjs').plain(expected.jazFootnote);
```

`herowerk-website-rechenkern-t1245/tests/helpers/t1087-jaz.cjs`

```diff
--- alt/tests/helpers/t1087-jaz.cjs
+++ neu/tests/helpers/t1087-jaz.cjs
@@ -19,0 +20,5 @@
+function expectedFootnoteHtml(model){
+ const heading='<strong style="color:var(--green);font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">¹ JAZ</strong>';
+ const scop='\n              <strong style="color:var(--green);font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">² SCOP</strong> = Seasonal Coefficient of Performance. Norm-Effizienz nach EN 14825, marktüblicher Herstellervergleich.\n            ';
+ return expectedFootnote(model).replace('¹ JAZ',heading)+'<br>'+scop;
+}
@@ -24 +29 @@
- const scop=plain(out.jazFootnote||'').match(/² SCOP.*?Herstellervergleich\./)?.[0]||'';out.jazFootnote=expectedFootnote(out.card.modell)+' '+scop;return out;
+ out.jazFootnote=expectedFootnoteHtml(out.card.modell);return out;
@@ -26 +31 @@
-module.exports={index,expectedJaz,footnote,expectedFootnote,plain,expectedDetail};
+module.exports={index,expectedJaz,footnote,expectedFootnote,expectedFootnoteHtml,plain,expectedDetail};
```

`herowerk-website-rechenkern-t1245/tests/t1245-kv-parameter.mjs`

```diff
--- alt/tests/t1245-kv-parameter.mjs
+++ neu/tests/t1245-kv-parameter.mjs
@@ -8 +8 @@
-function read(t){sheets=t;cache.clear();return c.kvGetParams_();}
+function read(t){sheets=t;cache.clear();const p=c.kvGetParams_();c.kvJazParameterLaden_(p);return p;}
@@ -11 +11 @@
-cache.set('kvparams:v1',JSON.stringify({falsch:true}));assert.equal(c.kvGetParams_().falsch,undefined);assert.ok(cache.has('kvparams:t1245:v2'));
+cache.set('kvparams:v1',JSON.stringify({falsch:true}));assert.equal(c.kvGetParams_().falsch,undefined);assert.ok(cache.has('kvparams:t1245:v3'));
@@ -13,2 +13,2 @@
-const missing=make();delete missing.KV_JAZ;assert.throws(()=>c.kvJazParameterLaden_(read(missing)),/fehlt/);
-const invalid=make();invalid.KV_JAZ[1][2]='';assert.throws(()=>c.kvJazParameterLaden_(read(invalid)),/ungültig/);
+const missing=make();delete missing.KV_JAZ;assert.throws(()=>read(missing),/fehlt/);
+const invalid=make();invalid.KV_JAZ[1][2]='';assert.throws(()=>read(invalid),/ungültig/);
@@ -18,0 +19,17 @@
+// H2: Auch der öffentliche Apps-Script-/PHP-Förderweg liest keine Kostenvalidierung.
+const foerderFrage={we:'1',selbstWE:'1',heizung:'oel',heizungsalter:'25',einkommen:'ueber90',preisManuell:'34500',fHalbjahr:'h2-2026'};
+const foerderTabs=make();foerderTabs['Förder_Parameter']=[['schluessel','wert'],...plain(c.FOERDER_ROWS_())];foerderTabs.Preise_Wolf=[['Klasse','Endpreis_brutto'],['m',34500]];
+const pruefPeriode=foerderTabs.KV_FoerderPerioden.find(r=>r[0]==='h2-2026');pruefPeriode[3]='Synthetische Prüfförderperiode T1245';pruefPeriode[4]=17;pruefPeriode[5]=31000;
+const kaputt=[structuredClone(foerderTabs),structuredClone(foerderTabs),structuredClone(foerderTabs)];
+kaputt[0].KV_Parameter.find(r=>r[0]==='bio_stufe_4_anteil')[1]=.7;
+kaputt[1].KV_Parameter.find(r=>r[0]==='netzentgelt_jahreswerte')[1]='[kaputt';
+kaputt[2].KV_JAZ[1][2]='';
+const sperren=[/Bio-Parameter/,/Netzentgelt-Jahresreihe/,/KV_JAZ/],warnungen=[];c.console={...console,warn:(...v)=>warnungen.push(v.join(' '))};
+const foerderAusgabe=t=>{sheets=t;cache.clear();const foerder=c.foerderung_(foerderFrage),p=c.kvGetParams_();assert.equal(p.perioden['h2-2026'].grenze,31000);return JSON.stringify({foerder,perioden:c.foerderPeriodenAusKv_(p),waehlbar:c.foerderPeriodenWaehlbar_(p)});};
+const foerderSoll=foerderAusgabe(foerderTabs);
+kaputt.forEach((t,j)=>{assert.equal(foerderAusgabe(t),foerderSoll);assert.throws(()=>c.kostenvergleich_({}),sperren[j]);assert.throws(()=>c.kvBootstrap_({}),sperren[j]);assert.equal(foerderAusgabe(t),foerderSoll);});assert.deepEqual(warnungen,[]);
+const phpJobs=[foerderTabs,...kaputt].flatMap(sheets=>[{mode:'foerderung',query:foerderFrage,sheets},{mode:'kostenvergleich',query:{},sheets},{mode:'bootstrap',sheets}]);
+const phpRun=spawnSync('php',['tests/t1245-kv-runner.php'],{encoding:'utf8',input:JSON.stringify(phpJobs),maxBuffer:5e6});assert.equal(phpRun.status,0,phpRun.stderr);assert.equal(phpRun.stderr,'','keine Förder-Rückfallwarnung');const phpAntwort=JSON.parse(phpRun.stdout);assert.ok(phpAntwort[0].value);assert.ok(phpAntwort[1].value);assert.ok(phpAntwort[2].value);
+const phpSperren=[/Bio-Parameter/,/^Syntax error$/,/KV_JAZ/];
+kaputt.forEach((t,j)=>{assert.deepEqual(phpAntwort[(j+1)*3].value,phpAntwort[0].value);assert.match(phpAntwort[(j+1)*3+1].error,phpSperren[j]);assert.match(phpAntwort[(j+1)*3+2].error,phpSperren[j]);});
+console.log('GRÜN H2 Website: ungültige Bio-/Netz-/JAZ-Daten sperren nur Kostenvergleich/Bootstrap; Förderung und Perioden exakt gleich, keine Rückfallwarnung in GS/PHP');
```

`herowerk-website-rechenkern-t1245/tests/t1245-kv-runner.php`

```diff
--- alt/tests/t1245-kv-runner.php
+++ neu/tests/t1245-kv-runner.php
@@ -5 +5 @@
-foreach($jobs as $job){try{$mode=$job['mode']??'core';$value=match($mode){'parameter'=>hw_kv_get_params($job['sheets']),'bio'=>hw_kv_bio_stand($job['stufen']),'map'=>hw_kv_map_request($job['query'],$job['params']),'bootstrap'=>hw_kv_bootstrap($job['sheets']),default=>hw_kv_calculate($job['inputs'],$job['params'])};$out[]=['value'=>$value];}catch(Throwable $e){$out[]=['error'=>$e->getMessage()];}}
+foreach($jobs as $job){try{$mode=$job['mode']??'core';$value=match($mode){'foerderung'=>hw_foerderung($job['query'],$job['sheets']),'kostenvergleich'=>hw_kostenvergleich($job['query'],$job['sheets']),'parameter'=>hw_kv_kostenparameter($job['sheets']),'bio'=>hw_kv_bio_stand($job['stufen']),'map'=>hw_kv_map_request($job['query'],$job['params']),'bootstrap'=>hw_kv_bootstrap($job['sheets']),default=>hw_kv_calculate($job['inputs'],$job['params'])};$out[]=['value'=>$value];}catch(Throwable $e){$out[]=['error'=>$e->getMessage()];}}
```

`herowerk-konfigurator/test/t1245_kv_parameter.test.js`

```diff
--- alt/test/t1245_kv_parameter.test.js
+++ neu/test/t1245_kv_parameter.test.js
@@ -9 +9 @@
-assert.ok(cache.has('kvparams:t1245:v2'));assert.equal(p.wartungWp,p.wartungFossil);
+assert.ok(cache.has('kvparams:t1245:v3'));assert.equal(p.wartungWp,p.wartungFossil);
```

Neue Testdatei vollständig, Alt: nicht vorhanden.

```diff
--- /dev/null
+++ test/t1245_kv_foerderschutz.test.js
@@ -0,0 +1,54 @@
+'use strict';
+// Betriebsfall H2: fehlerhafte Kostentabellen dürfen die Angebotsförderung nicht verändern.
+const assert = require('node:assert/strict');
+const path = require('node:path');
+const { datenLaden, kontext } = require('../tools/pruefstand_matrixweg/abnahme.js');
+const kern = require('../kv_engine.js');
+const root = path.resolve(__dirname, '..');
+const basis = datenLaden(path.join(root, 'test/gold/daten_2026-10-16')).daten;
+const tabs = Object.values(basis).find(t => t.KV_Parameter);
+const set = (t, key, value) => { const row = t.KV_Parameter.find(r => r[0] === key); if (row) row[1] = value; else t.KV_Parameter.push([key, value]); };
+// Absichtlich andere Förderwerte als im Seed: ein Rückfall muss auffallen.
+const periode = tabs.KV_FoerderPerioden.find(r => r[0] === 'h2-2026');
+periode[3] = 'Synthetische Prüfförderperiode T1245'; periode[4] = 17; periode[5] = 31000;
+set(tabs, 'jaz_tabellenstand', '2026-10-26');
+tabs.KV_JAZ = [['Gerät','Heizsystem','Wert','Quelle','Abrufdatum','Randbedingungen','Aliase','Kaskade'], ...kern.KV_JAZ_ROWS_()];
+const frage = { we: '1', selbstWE: '1', heizung: 'oel', heizungsalter: '25', einkommen: 'ueber90', preisManuell: '34500', fHalbjahr: 'h2-2026' };
+const antworten = { q78_eigentuemer: 'ja', q80_selbstnutzung: 'ja', q24_we_gesamt: 1, q02_energietraeger: 'oel', q13_einbaujahr: 1990, q14_probleme: 'nein', q76_einkommen_klasse: 'ueber90', q77_kind_minderjaehrig: 'nein', q91_foerderantrag_ab: 'h2-2026' };
+function lauf(data, fehler) {
+  const { ctx: c } = kontext(data, root, '2026-10-19', { nurSoll: true });
+  const logs = [];
+  c.console = { ...console, warn: (...v) => logs.push(v.join(' ')) };
+  const foerderung = () => {
+    const warn = [];
+    const angebot = c.konfFoerderung_(antworten, [{ foerderfaehig: true, vk: 34500 / 1.19, menge: 1 }], warn);
+    const website = c.foerderung_(frage);
+    const p = c.kvGetParams_();
+    return { angebot, website, perioden: c.foerderPeriodenAusKv_(p), waehlbar: c.foerderPeriodenWaehlbar_(p), warn };
+  };
+  const vor = JSON.stringify(foerderung());
+  if (fehler) {
+    assert.throws(() => c.kostenvergleich_({}), fehler, 'Kostenvergleich muss sperren');
+    assert.throws(() => c.kvBootstrap_({}), fehler, 'Bootstrap muss sperren');
+  } else {
+    assert.equal(c.kostenvergleich_({}).service, 'kostenvergleich');
+    assert.equal(c.kvBootstrap_({}).service, 'kv_bootstrap');
+  }
+  assert.equal(JSON.stringify(foerderung()), vor, 'Förderung bleibt auch nach dem Kostenaufruf exakt gleich');
+  const out = JSON.parse(vor);
+  assert.deepEqual(out.warn, [], 'keine Angebots-Rückfallwarnung');
+  assert.deepEqual(logs, [], 'keine Förder-Rückfallwarnung im öffentlichen Weg');
+  assert.equal(out.perioden.find(p => p.id === 'h2-2026').grenze, 31000, 'Sheet-Periode, kein Seed');
+  return vor;
+}
+const soll = lauf(structuredClone(basis));
+const fehlerfaelle = [
+  ['Bio-Treppe', /Bio-Parameter/, t => set(t, 'bio_stufe_4_jahr', 2040)],
+  ['Netzentgelt-Reihe', /Netzentgelt-Jahresreihe/, t => set(t, 'netzentgelt_jahreswerte', '[kaputt')],
+  ['JAZ-Zeile', /KV_JAZ/, t => { t.KV_JAZ[1][2] = ''; }],
+];
+for (const [name, fehler, aendern] of fehlerfaelle) {
+  const data = structuredClone(basis); aendern(Object.values(data).find(t => t.KV_Parameter));
+  assert.equal(lauf(data, fehler), soll, name + ': Angebotsförderung, öffentliche Förderung und Förderperioden exakt unverändert');
+  console.log('GRÜN H2 ' + name + ': beide Förderwege/Perioden exakt gleich, keine Rückfallwarnung; Kostenvergleich und Bootstrap gesperrt');
+}
```

### Dateiliste dieser Nachbesserung

Website:

- `api/rechner-engine.php`
- `apps-script/rechner-backend/Code.gs`
- `tests/helpers/t1087-jaz.cjs`
- `tests/t1087-beschriftung.cjs` (Zusicherung wiederhergestellt; nun ohne Unterschied zum Website-HEAD)
- `tests/t1245-kv-parameter.mjs`
- `tests/t1245-kv-runner.php`
- `T1245_SCHRITT1_ABSCHLUSS.md`

Konfigurator:

- `Code.js`
- `test/t1245_kv_parameter.test.js`
- `test/t1245_kv_foerderschutz.test.js` (neu)

### Vollständiger Einbuchungsvorschlag nach dem Nachlauf

Die vorgeschlagenen Einbuchungsnachrichten weiter oben gelten weiter. Vollständige Dateimengen des Bauzweigs nach Nachbesserung; die Steuerung misst nach und bucht getrennt je Ablage ein. `tests/t1087-beschriftung.cjs` erscheint im Website-Einbuchungsvorschlag nicht mehr, weil sein Inhalt wieder genau dem Website-HEAD entspricht.

Website:

- `T1245_SCHRITT1_ABSCHLUSS.md`
- `amortisation-waermepumpe.html`
- `api/kv-jaz.json`
- `api/rechner-engine.php`
- `api/rechner-values.php`
- `apps-script/rechner-backend/Code.gs`
- `apps-script/rechner-backend/kv_contract.md`
- `apps-script/rechner-backend/kv_engine.gs`
- `apps-script/rechner-backend/kv_sheet_spec.md`
- `barrierefreiheit.html`
- `baubarkeitspruefung.html`
- `bewerbung.html`
- `data/kv-jaz-portfolio.json`
- `dimensionierung-verstehen.html`
- `dimensionierung.html`
- `docs/intern/kostenvergleich-berater.html`
- `foerderung-hannover.html`
- `foerderung-jetzt-mitnehmen.html`
- `foerderung.html`
- `foerdervorschuss.html`
- `gasheizung-tauschen-oder-reparieren.html`
- `hinweise.html`
- `index.html`
- `js/site.js`
- `karriere.html`
- `kontakt.html`
- `kostenvergleich-waermepumpe.html`
- `package.json`
- `preise.html`
- `produkte_HERO.json`
- `propan-waermepumpe.html`
- `prozess.html`
- `ratgeber.html`
- `rechner.html`
- `scripts/generate-kv-jaz.mjs`
- `scripts/make-ionos-bundle.sh`
- `tests/a11-oeffentliche-antworten.mjs`
- `tests/antragsdatum-und-installation-regression.mjs`
- `tests/fixtures/t1245/goldsatz-beleg.json`
- `tests/fixtures/t1245/website-vorher.json`
- `tests/helpers/t1087-datenblatt.cjs`
- `tests/helpers/t1087-jaz.cjs`
- `tests/rueckfall-antragsdatum-gleichlauf.mjs`
- `tests/t1087-datenblatt.cjs`
- `tests/t1087-jaz.cjs`
- `tests/t1087-wr.cjs`
- `tests/t1245-kv-nutzen.mjs`
- `tests/t1245-kv-parameter.mjs`
- `tests/t1245-kv-paritaet.mjs`
- `tests/t1245-kv-runner.php`
- `tests/t1245-kv-website-dom.mjs`
- `tests/t1245-kv-website.mjs`
- `waermepumpe-altbau.html`
- `waermepumpe-hannover.html`
- `waermepumpe-laerm.html`
- `waermepumpenstrom-hannover.html`
- `wertsteigerung-waermepumpe.html`
- `wp-kosten-hannover.html`

Konfigurator:

- `Code.js`
- `kv_engine.js`
- `test/gold/website.json`
- `test/t1150_oeltank_nachbesserung1.test.js`
- `test/t1245_kv_foerderschutz.test.js`
- `test/t1245_kv_nutzen.test.js`
- `test/t1245_kv_parameter.test.js`
- `tools/t1245-goldsatz.js`

Die bereits vorgefundenen lokalen Prüferartefakte `reports/2026-10-27_Mobile-Verifikation_HERO.md` und `reports/2026-10-27_Raster-Befund_HERO.md` wurden in dieser Nachbesserung nicht angefasst und sind nicht Teil des Einbuchungsvorschlags. Keine fremden lokalen Änderungen entfernt.

Offene fachliche Fragen aus Anpassung 5: keine. Keine weitere Angebotsabweichung festgestellt. Nichts vorgemerkt oder eingebucht.
