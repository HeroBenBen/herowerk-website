# HeroWerk Jobs — Stellen über Google Sheets steuern (Anleitung zum Veröffentlichen)

Diese Anleitung erklärt **Schritt für Schritt und ohne Technik-Kenntnisse**, wie die
Stellenanzeigen auf der Karriereseite (`herowerk.de/karriere`) über eine Google-Tabelle
gesteuert werden. Du musst keine Webseite anfassen — du arbeitest nur in der Tabelle.

**Die Tabelle:** „Hero_Jobs_Website"
(Datei-ID `1n6kuRA4sjyFI2SMwcIpE6_QRBHEfsQYLZDus9vJm160`)

---

## 0. Das Wichtigste in einem Satz

Du pflegst Stellen in der Tabelle, klickst auf **„HeroWerk Jobs → Auf Webseite
veröffentlichen"** — und die Webseite zeigt genau diesen Stand. Was du nicht
veröffentlichst, wird **nicht** live. Halbfertige Entwürfe landen also nie aus Versehen
auf der Seite.

---

## 1. So ist die Tabelle aufgebaut

### Tab „Übersicht" (die Liste aller Stellen)

| Spalte | Überschrift   | Was kommt hier rein                                              |
| ------ | ------------- | --------------------------------------------------------------- |
| A      | Nr.           | Reihenfolge auf der Seite (1, 2, 3, …). Kleinere Zahl = weiter oben. |
| B      | Rolle         | Der vollständige Titel, z. B. `Disponent:in (m/w/d)`            |
| C      | Web-Kategorie | Genau eine der drei Kategorien (siehe unten)                    |
| D      | Status        | `online` = wird angezeigt · `offline` = wird **nicht** angezeigt |
| E      | id            | Kurz-Kennung der Stelle (z. B. `disponent`). **Nicht ändern**, sobald gesetzt. |

Die **drei erlaubten Kategorien** (genau so schreiben):

1. `Montage & Technik`
2. `Vertrieb & Beratung`
3. `Büro & Organisation`

### Detail-Tabs (ein eigener Reiter je Stelle)

Zu jeder Stelle gehört ein **eigener Reiter**, dessen Name = die `id` aus Spalte E ist
(z. B. der Reiter `disponent`). Dieser Reiter hat **zwei Spalten**: links das Feld (A),
rechts der Text (B). So sieht ein Detail-Tab aus:

```
A (Feld)                       B (Text)
-----------------------------  ---------------------------------------------
id                             disponent
Beschäftigung                  Vollzeit
Standort                       Region Hannover
Icon                           layout
Teaser                         Ein Satz, der die Stelle beschreibt.
Aufgaben                       Erste Aufgabe
                               Zweite Aufgabe
                               Dritte Aufgabe
Profil                         Erste Anforderung
                               Zweite Anforderung
Darauf kannst du dich freuen   Erster Vorteil
                               Zweiter Vorteil
```

**So funktionieren die Listen:** Bei `Aufgaben`, `Profil` und
`Darauf kannst du dich freuen` schreibst du den **ersten** Punkt rechts neben das Feld.
Jeden **weiteren** Punkt schreibst du in eine **neue Zeile darunter** und lässt die
**linke Spalte (A) leer**. Sobald links wieder ein Feldname steht, beginnt das nächste
Feld. Leere Punkte werden übersprungen.

**Erlaubte Werte für „Icon"** (kleines Symbol vor dem Titel — exakt so schreiben):
`wrench`, `medal`, `learning`, `shield`, `zap`, `layers`, `gear`, `chat`, `clipboard`,
`file`, `layout`, `users`, `briefcase`.
Wird nichts oder etwas Unbekanntes eingetragen, nimmt das System automatisch `briefcase`
(Aktenkoffer).

---

## 2. Das Menü „HeroWerk Jobs"

Oben in der Tabelle (neben „Hilfe") erscheint ein Menü **„HeroWerk Jobs"**.
Falls es fehlt: Tabelle einmal neu laden (Seite aktualisieren) und ein paar Sekunden warten.

| Menüpunkt                       | Was es macht                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| **Auf Webseite veröffentlichen**| Macht den aktuellen Stand live. **Dieser Klick zählt** — vorher passiert auf der Seite nichts. |
| **Vorschau anzeigen**           | Zeigt in einem Fenster, **welche** Stellen veröffentlicht würden (zum Gegenchecken).          |
| **Rolle anlegen**               | Legt eine neue Stelle an (fragt nach Titel + Kategorie, erstellt Listen-Eintrag + Detail-Tab). |
| **Einrichten / Reparieren**     | Stellt fehlende Bausteine her (id-Spalte, fehlende Detail-Tabs). Ändert nie vorhandene Texte. |
| **Website-Rollen vorbefüllen**  | Befüllt die 13 bestehenden Webseiten-Stellen einmalig mit dem aktuellen Webseiten-Text.       |

---

## 3. Einmalige Ersteinrichtung (nur am Anfang)

**Schritt 0 — den Code einfügen (nur ein einziges Mal):**

1. Tabelle „Hero_Jobs_Website" öffnen → **Erweiterungen → Apps Script**.
2. Im Editor den vorhandenen Beispiel-Code (`function myFunction() {}`) löschen und den
   **kompletten Inhalt der Datei `apps-script/jobs/Code.gs`** (aus dem Webseiten-Projekt;
   der Web-Betreuer gibt sie dir) hineinkopieren.
3. Oben auf **Speichern** (Disketten-Symbol) klicken. Dann zurück zur Tabelle und die Seite
   **neu laden** — jetzt erscheint oben das Menü **„HeroWerk Jobs"**.
   (Beim ersten Ausführen eines Menüpunkts fragt Google nach einer **Berechtigung** — mit
   dem HeroWerk-Konto `b.bendler@herowerk.de` zustimmen. Das ist normal.)

*(Die Datei `appsscript.json` ist optional und nur eine Referenz — die Einstellungen
„Ausführen als / Zugriff" wählst du ohnehin im Bereitstellen-Dialog, Abschnitt 4.)*

**Schritt 1 — Stellen einrichten + erstmals veröffentlichen:**

4. Menü **HeroWerk Jobs → Einrichten / Reparieren** klicken.
5. Menü **HeroWerk Jobs → Website-Rollen vorbefüllen** klicken und im Dialog bestätigen.
   Damit stehen die 13 Stellen mit Text in der Tabelle.
6. In Spalte D (Status) bei jeder Stelle, die online soll, `online` eintragen.
7. Menü **HeroWerk Jobs → Auf Webseite veröffentlichen** klicken.

---

## 4. Die Web-App veröffentlichen (Verbindung zur Webseite herstellen)

Das macht man **einmal**. Danach reicht für jede Änderung der Klick „Auf Webseite
veröffentlichen" aus Abschnitt 5.

1. In der Tabelle oben **Erweiterungen → Apps Script** öffnen.
2. Oben rechts auf **Bereitstellen → Neue Bereitstellung** klicken.
3. Beim Zahnrad „Typ auswählen" **Web-App** wählen.
4. Einstellungen setzen:
   - **Ausführen als:** *Ich* (`b.bendler@herowerk.de`)
   - **Zugriff:** *Jeder* (anonym)
5. **Bereitstellen** klicken, ggf. Google-Berechtigung erneut bestätigen.
6. Es erscheint eine **Web-App-URL**, die auf `/exec` endet. Diese **kopieren**.
7. Diese URL muss **einmalig** in der Webseite eingetragen werden, in der Datei
   `karriere.html`, in die Zeile:
   ```
   var JOBS_FEED_URL = '';
   ```
   Dort die kopierte `/exec`-URL zwischen die beiden Anführungszeichen setzen
   (das übernimmt der Web-Betreuer). **Solange dort nichts steht, bleibt die Seite
   unverändert** — es kann also nichts kaputtgehen.

### Später etwas geändert? So wird ein Update live (gleiche URL!)

1. **Erweiterungen → Apps Script** öffnen.
2. **Bereitstellen → Bereitstellungen verwalten**.
3. Beim Stift-Symbol (Bearbeiten) bei **Version** auf **Neue Version** stellen.
4. **Bereitstellen** klicken.

Wichtig: **„Neue Version"** bei der **bestehenden** Bereitstellung → die URL bleibt
gleich. Eine **„Neue Bereitstellung"** würde eine **neue** URL erzeugen (dann müsste die
Webseite erneut angepasst werden) — das willst du normalerweise nicht.

---

## 5. Alltag: eine Stelle ändern, ein-/ausschalten oder neu anlegen

**Bestehende Stelle ändern:** Im jeweiligen Detail-Tab den Text anpassen →
**HeroWerk Jobs → Auf Webseite veröffentlichen**.

**Stelle ausschalten:** In der „Übersicht" Status auf `offline` setzen →
**Auf Webseite veröffentlichen**. (Die Stelle verschwindet von der Seite.)

**Neue Stelle anlegen:** **HeroWerk Jobs → Rolle anlegen** → Titel + Kategorie eingeben.
Die Stelle wird `offline` angelegt; ihren neuen Detail-Tab füllen, Status auf `online`
setzen → **Auf Webseite veröffentlichen**.

**Tipp:** Vor dem Veröffentlichen einmal **Vorschau anzeigen** klicken — dann siehst du
genau, welche Stellen live gehen.

---

## 6. Die 13 bestehenden Webseiten-Stellen (ihre `id`)

Diese `id`-Werte sind fest mit den Karten auf der Webseite verknüpft. Wenn du eine dieser
Stellen pflegst, muss die `id` in Spalte E **exakt** so stehen (sonst findet die Webseite
die Karte nicht):

| #   | id                  | Stelle (Titel auf der Seite)                              | Kategorie            |
| --- | ------------------- | -------------------------------------------------------- | -------------------- |
| 1   | `anlagenmechaniker` | Anlagenmechaniker:in SHK / Wärmepumpen-Monteur:in        | Montage & Technik    |
| 2   | `shk-meister`       | SHK-Meister:in / Technische Betriebsleitung              | Montage & Technik    |
| 3   | `quereinsteiger`    | Quereinsteiger:in Montage                                | Montage & Technik    |
| 4   | `elektromeister`    | Elektromeister:in / Konzessionsträger:in Elektro         | Montage & Technik    |
| 5   | `elektriker`        | Elektriker:in – Wärmepumpen & Photovoltaik               | Montage & Technik    |
| 6   | `gala`              | Fundament- & Außenanlagen / GaLa                         | Montage & Technik    |
| 7   | `service`           | Service-/Wartungstechniker:in                            | Montage & Technik    |
| 8   | `vad`               | Vertriebsberater:in Außendienst – Wärmepumpe             | Vertrieb & Beratung  |
| 9   | `va`                | Vertriebsassistenz / Innendienst                         | Vertrieb & Beratung  |
| 10  | `backoffice`        | Backoffice / Auftragssachbearbeitung                     | Büro & Organisation  |
| 11  | `planer`            | SHK-Planer:in / Anlagenauslegung                         | Büro & Organisation  |
| 12  | `hr`                | Personalreferent:in / HR                                 | Büro & Organisation  |
| 13  | `assistenz`         | Assistenz der Geschäftsführung                           | Büro & Organisation  |

---

## 7. Wenn etwas nicht klappt

- **Menü „HeroWerk Jobs" fehlt:** Tabelle neu laden, kurz warten.
- **Eine Stelle erscheint nicht auf der Seite:** Status = `online`? `id` in Spalte E
  gesetzt? Detail-Tab mit genau diesem `id`-Namen vorhanden? Danach noch einmal
  **Auf Webseite veröffentlichen**.
- **„Vorschau anzeigen" zeigt 0 Stellen:** Es ist (noch) keine Stelle `online`, oder
  die Detail-Tabs fehlen → **Einrichten / Reparieren** ausführen.
- **Änderung ist auf der Seite nicht zu sehen:** Wurde **Auf Webseite veröffentlichen**
  geklickt? Die Webseite zeigt immer nur den zuletzt veröffentlichten Stand.

---

*Technischer Hinweis (für den Web-Betreuer): Das Skript ist container-bound an die Tabelle
`1n6kuRA4sjyFI2SMwcIpE6_QRBHEfsQYLZDus9vJm160`. `doGet` liefert den in `_published!A1`
eingefrorenen JSON-Snapshot. In `karriere.html` steuert die Konstante `JOBS_FEED_URL` den
Abruf — leer = statischer Baseline-Stand (No-Op).*
