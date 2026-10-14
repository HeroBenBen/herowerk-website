# Zeitplan für den Wertevorrat des Rechenkerns

Der Zeitplan ruft alle 15 Minuten folgenden Befehl auf:

```text
/usr/bin/php /home/www/website/api/werte-auffrischen.php 2>&1
```

Der Takt begrenzt die regelmäßige Verzögerung einer Änderung im Sheet auf höchstens
15 Minuten plus Abrufzeit. Er verursacht 96 Abrufe täglich. Innerhalb der
Vorhaltedauer von einer Stunde gibt es vier planmäßige Versuche.

Das Skript schreibt genau eine Zeile ins Protokoll. `OK` bedeutet, dass der Snapshot
erneuert wurde oder ein anderer Lauf die gemeinsame Sperre bereits hält. `FEHLER`
bedeutet, dass keine neue gültige Fassung geschrieben wurde. In diesem Fall bleibt
der vorhandene Snapshot unverändert liegen.

## Schema und Integritätsvertrag

Der Leser nimmt weiterhin Schema 1 und 2 nach den bisherigen Regeln an. Nur Schema 3
prüft zusätzlich den aktiven Lauf und SHA-256 über die gebundenen Inhalte. Der Prüfer
sitzt in `rechner_validate_snapshot`; Zeitplan, Nachlauf, Kaltstart und das Lesen der
vorhandenen Datei verwenden dieselbe Prüfung. Ein ungültiger neuer Abzug wird nicht
geschrieben. Ohne gültige Datei bleibt der bestehende Fehlerpfad des Rechners aktiv.

Die gemeinsame Prüfdatei `tests/fixtures/rechner-snapshot-vertrag.json` ist der
Vertrag für PHP und die späteren Konfigurator-Pakete. Sie enthält Blattreihenfolge,
Kopfzeilen, unabhängige Referenzbytes und Sollhash. Neue Kopfzeilen sind ausdrücklich
Vertragsfestlegungen, keine Behauptung über den heutigen Live-Stand. Die Preisfelder
`technik_l` bis `technik_q` sind Vertragsnamen für die vorgesehenen Technikfelder;
deren fachliche Befüllung gehört nicht zu diesem Leserauftrag. Das Preisfeld G wird
als `Hinweis` gebunden. Die vorhandenen Köpfe A bis F bleiben erhalten.

Die Hashbytes haben die Form `[[Blattname, [[Zellstring, ...], ...]], ...]`, mit den
Blättern `Preise_Wolf`, `Preise_Vaillant`, `Geräte_Katalog` in dieser Reihenfolge.
Preisfelder folgen `preis_spalten`, Katalogfelder `katalog_identitaetskoepfe` der
Prüfdatei, unabhängig von ihrer tatsächlichen Spaltenposition. Zeilen bleiben in
Blattreihenfolge. JSON ist kompakt, UTF-8, ohne ASCII-Escapes für Unicode und Slash,
ohne abschließenden Zeilenumbruch. Zahlen werden als Dezimaltext ohne Exponent oder
überflüssige Nachkommastellen gebunden; Text wird NFC-normalisiert und an den
Rändern von Unicode-Leerraum befreit. Leere Zellen und `null` ergeben leeren Text.
Kaskade, Auswahl und Kennungen sind Text; boolesche Werte sind hierfür ungültig.

`Referenz_Laeufe` hat die Köpfe `lauf_id`, `laufart`, `status`, `aktiv`,
`inhalt_sha256`, `veroeffentlicht_am`. Genau ein Lauf muss `aktiv = ja` tragen,
sonst ist `aktiv` leer. Jede nichtleere Preis-Datenzeile und jede Katalogzeile mit
Auswahl `ja` braucht `geraet_id` und die aktive `lauf_id`. Katalogtechnik und
Auswahl-nein-Zeilen sind nicht im Hash gebunden.

Nachauftrag: Prüfung und Rechenkern verwenden `rechner_schema3_tabellen_aufloesen`
aus `api/rechner-snapshot-tabellen.php`. Die Schemafassung wird ausdrücklich vom
validierten Abzug an die Route übergeben. Die gemeinsame Zuordnung ersetzt im
neuen Schema die freie Kopf- und Präfixsuche. Unbekannte Preisköpfe, doppelte konsumierte Aliase,
alternative Teilköpfe und ungebundene Preiszeilen sind ungültig. Spalten dürfen gemeinsam mit
ihren Werten umgestellt werden; dadurch bleibt die Preisantwort identisch.
Erlaubte Katalogvorspänne und technische Kopf-Aliase stehen in `tabellenaufloesung`
der gemeinsamen Prüfdatei. Historische Parameterzeilen bleiben dort ausdrücklich
als Vorspann erlaubt.

Eine Kopfzeile benötigt den vollständigen Satz ihrer Pflichtköpfe. Einzelne
Datenwerte wie `Modell` oder `Stand` sind keine zusätzlichen Köpfe. Ungebundene
Katalogtechnik und nicht gewählte Katalogzeilen dürfen solche Texte enthalten.
Zusätzliche technische Katalogspalten sind zulässig und bekommen durch eine
Präfixähnlichkeit keine Bedeutung für den Rechenkern. Der Hashumfang bleibt gleich.
Quelle: gemeinsame Prüfdatei, `tabellenaufloesung`.

Geldfelder erlauben endliche JSON-Zahlen sowie Leertext und `null` für fehlende
Preise. Andere Texte bleiben unzulässig. Fehlpreise werden einheitlich als `null`
weitergegeben; preislose Geräte bleiben gebunden und wählbar. Die vorhandene
Oberfläche zeigt fehlende Preise als „auf Anfrage“. Der Förderweg berechnet ohne
manuelle Eingabe keinen Ersatzbetrag aus einem fehlenden Abzugspreis.
Nach erfolgreicher Prüfung werden die gebundenen Geldzellen vor Berechnung und
Speicherung gleich normalisiert. Numerisch gleichwertige ganze Zahlen haben
denselben Typ; Nachkommastellen bleiben erhalten. Der Inhaltsprüfwert ändert sich
dabei nicht. Kaltstart und anschließendes Dateilesen liefern dieselbe Antwort.
Manuelle Eingaben und ältere Schemas behalten ihren bisherigen Zahlenweg.

Nachauftrag zur Speicherung: Fehlende Schlusszellen werden vor Zuweisungen
positionsgetreu aufgefüllt. Blätter und Zeilen bleiben JSON-Listen; Objekte mit
Zahlenschlüsseln gelten im neuen Schema nicht als Listen. Der Schreiber liest die
tatsächlich geschriebene temporäre Datei zurück, vergleicht ihre Bytes und prüft
sie mit demselben Leser wie die endgültige Datei. Erst dann ersetzt er den
Altbestand. Schreib- und Lesefehler verhindern das Ersetzen. Der Kaltstart
verwendet den aus den Speicherbytes gelesenen Zustand. Zahlen werden bei Speicherung
und Ausgabe des neuen Schemas verlustfrei serialisiert, unabhängig von der
Prozessvorgabe für `serialize_precision`. Die vorherige Einstellung wird danach
wiederhergestellt. Quelle: gemeinsame Prüfdatei, `speichervertrag`, und
`tests/rechner-snapshot-nachauftrag3.py`.

Auswahlentscheidung und Hashtext sind getrennt: Die zentrale Auswahlfunktion
verwendet NFC, Randbeschnitt und Kleinschreibung. Der Hashtext erhält ausschließlich
NFC und Randbeschnitt, seine Großschreibung bleibt erhalten. Daher ist auch `JA`
gewählt und laufgebunden, hat aber andere Hashbytes als `ja`. Unabhängige Sollbytes
und Hashes stehen in `grossschreibungsfaelle` der gemeinsamen Prüfdatei.
Quellen: `tests/fixtures/rechner-snapshot-vertrag.json`, Felder `geldtypen`,
`tabellenaufloesung` und `auswahlregel` (Vertragsfestlegung Nachauftrag 2).

NFC verwendet ausschließlich PHP `Normalizer` aus `intl`. Ohne diese Erweiterung
endet Schema 3 mit `nfc_nicht_verfuegbar`; Schema 1 und 2 bleiben unabhängig davon
lesbar. Die Serververfügbarkeit von `intl` ist vor P2 zu prüfen.

## Private Konfiguration

Optional liegt im privaten Rechner-Laufzeitordner `rechner-config.json`:

```json
{
  "apps_script_url": "https://script.google.com/macros/s/PRUEFPROJEKT/exec",
  "mail_adapter": "/absoluter/privater/pfad/snapshot-mail-adapter.php"
}
```

Ohne Datei oder ohne `apps_script_url` bleibt die bisherige Produktionsadresse die
Vorgabe. Eine vorhandene ungültige oder unlesbare Datei, auch eine defekte Verknüpfung, führt zu `snapshot_config_invalid`. Dabei findet kein Transportversuch statt.
Abzug und manueller Google-Durchreicheweg lesen dieselbe Adresse. HTTP ist nur für
`127.0.0.1` als lokales Prüfziel erlaubt; sonst HTTPS. Keine Zugangsdaten, Query oder
Fragmente in der konfigurierten Basisadresse. Konfiguration kommt nie aus einer
Browseranfrage. `RECHNER_RUNTIME_DIR` kann vor dem Einbinden des Moduls durch einen
serverseitigen Bootstrap definiert werden; ohne diesen bleibt der bisherige private
Geschwisterordner die Vorgabe.

Der Mailadapter wird ausschließlich über `mail_adapter` gewählt. Es gibt weder
Pfadsuche noch Suche nach Zugangsdaten. Ohne Eintrag wird
`meldung_nicht_zugestellt` protokolliert. Der Adapter ist eine private PHP-Datei,
die einen `callable(array $meldung): bool` zurückgibt. Das Array enthält `grund`,
`tag`, `betreff` und `text`; der Adapter legt die vorhandene Betriebsadresse fest
und nutzt den vorhandenen Mailweg. Beispiel für die spätere private Einrichtung,
mit ausdrücklich auf die Installation anzupassendem Portalpfad:

```php
<?php
return static function (array $meldung): bool {
    require_once '/installierter/portalpfad/intern/lib/mailer.php';
    $config = intern_config();
    $recipient = $config['alert_recipient_local_part'] . '@' . $config['allowed_domain'];
    return intern_send_plain_mail($recipient, $meldung['betreff'], $meldung['text']);
};
```

Dieses Beispiel wird nicht im Test geladen. Lokale Prüfungen verwenden einen
aufzeichnenden Adapter ohne Portalbibliothek oder echte Zugangsdaten.

## Protokoll und Tagessperre

Jede Integritätsablehnung nennt einen stabilen Grund, zum Beispiel
`snapshot_lauf_abweichend`, `snapshot_inhalt_abweichend`,
`snapshot_schema_invalid` oder `nfc_nicht_verfuegbar`. Mailfehler verändern die
Ablehnung nicht. Die Meldungsstatus sind `meldung_zugestellt`,
`meldung_nicht_zugestellt` und `meldung_unterdrueckt`.

`snapshot-meldungen.log` im privaten Laufzeitordner reserviert unter Dateisperre
höchstens einen Versandversuch je Grund und Kalendertag in `Europe/Berlin`.
Die Reservierung wird vor dem Transport dauerhaft geschrieben. Ein fehlgeschlagener
oder ungewisser Versand wird an diesem Tag nicht automatisch wiederholt. Ein
anderer Grund oder ein neuer Tag kann wieder melden. Das Protokoll enthält keine
Schlüssel, Abruf-URLs oder Rohabzüge. Bei einem defekten Sperrprotokoll wird nicht
ungedrosselt versendet. Die Datei ist betrieblich zu überwachen und wird vom Leser
nicht gelöscht.

## Abnahmegrenzen

Die historischen Regressionsabzüge beweisen Rückwärtskompatibilität; sie sind kein
aktueller Live-Nachweis. Nach Auslieferung ist im Zeitplan-Protokoll die Annahme des
Live-Abzugs zu belegen. Vor P2 sind `intl` und die konfigurierte Mailanbindung auf
der Zielinstallation zu prüfen. Dieser Auftrag führt keine Auslieferung aus.
