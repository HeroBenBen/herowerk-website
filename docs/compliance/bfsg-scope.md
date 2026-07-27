# Geltungsbereich und Konformitätsstand nach dem Barrierefreiheitsstärkungsgesetz

Stand: 27.07.2026 · Gegenstand: `www.herowerk.de` · Verantwortlich: HeroWerk GmbH

Dieses Dokument hält fest, warum die Website barrierefrei gebaut wird, woran sie
gemessen wird, was erfüllt ist und was noch nicht. Es ist die interne Grundlage
der öffentlichen Erklärung unter `/barrierefreiheit`. Wo beide Dokumente
dieselbe Sache beschreiben, ist die öffentliche Erklärung die für Nutzer
verbindliche Fassung.

## 1. Grundentscheidung: keine Ausnahme-Debatte

**Geschäftsführungs-Entscheid vom 23.07.2026:** Die Umsetzung nach EN 301 549
in Verbindung mit WCAG 2.1 Stufe AA ist gesetzt. Es wird nicht geprüft, ob sich
HeroWerk als Kleinstunternehmen auf eine Ausnahme berufen könnte.

Begründung: Die Zielgruppe der Wärmepumpen-Sanierung ist überdurchschnittlich
alt. Wer eine Bestandsimmobilie saniert, ist typischerweise zwischen 45 und 70
Jahre alt, und in dieser Gruppe sind Sehschwäche, eingeschränkte Feinmotorik und
Tastaturbedienung häufig. Eine Seite, die diese Menschen aussperrt, sperrt
zahlende Kunden aus. Die gesetzliche Pflicht und das Geschäftsinteresse zeigen
hier in dieselbe Richtung, deshalb wird die strengere Auslegung gewählt.

**Was daraus folgt:** Kein Arbeitspaket dieser Website darf mit dem Argument
"gilt für uns nicht" abgelehnt werden. Ein Punkt ist entweder erfüllt oder er
steht als benannte Einschränkung in Abschnitt 4 und auf `/barrierefreiheit`.

## 2. Geltungsbereich

**Erfasst:** alle 29 öffentlich erreichbaren Seiten unter `www.herowerk.de`,
einschließlich der Anfragestrecke, des Förder- und Kostenvergleichsrechners,
der Karriereseite und der Rechtstexte.

**Nicht erfasst und getrennt zu betrachten:**

- Das Kundenportal und das Bewerberportal unter eigenen Adressen. Sie haben
  eigene Abnahmen.
- Der Einwilligungsdialog für Cookies. Er stammt von einem externen Anbieter
  (consentmanager), bringt sein eigenes Markup und seine eigene Fokusführung mit
  und lässt sich von uns nur konfigurieren, nicht umbauen. Siehe Abschnitt 4.
- Inhalte Dritter, die per Verweis eingebunden sind, etwa Kartendienste oder
  eingebettete Formulare des Kundenbeziehungssystems.

## 3. Prüfgrundlage und Messverfahren

| Was                         | Womit                                                           | Wie oft                               |
| --------------------------- | --------------------------------------------------------------- | ------------------------------------- |
| Automatische Regelprüfung   | axe-core über alle 29 Seiten in beiden Modi                     | vor jedem Livegang                    |
| Raster, Fluchten, Überstand | `scripts/verify-raster.mjs`, 29 Seiten x 8 Breiten              | vor jedem Livegang, im Dauerlauf      |
| Mobile Bedienbarkeit        | `scripts/verify-mobile.mjs`, 10 Punkte x 4 Breiten x 2 Modi     | vor jedem Livegang, im Dauerlauf      |
| Kontrastwerte               | eigene Messung aus den errechneten Farbwerten, beide Modi       | bei jeder Farbänderung                |
| Tastaturbedienung           | Durchlauf mit der Tabulator-Taste, Prüfung des sichtbaren Fokus | bei jeder Änderung an Bedienelementen |
| Sichtprüfung                | Bildschirmaufnahmen zur Freigabe durch die Geschäftsführung     | bei jeder gestalterischen Änderung    |

**Grundsatz:** Eine grüne Kennzahl beweist nur, was sie misst, und nur zum
Zeitpunkt ihrer Messung. Automatische Prüfungen decken erfahrungsgemäß nur einen
Teil der Anforderungen ab; sie ersetzen die Sichtprüfung nicht.

## 4. Konformitätsstand

**Erfüllt und gemessen (Stand 27.07.2026):**

- Durchgehende Sprachauszeichnung in Deutsch auf allen Seiten.
- Beschriftungen an allen sichtbaren Formularfeldern, nicht nur Platzhaltertexte.
- Aufklappbare Bereiche als echte Schaltflächen mit Zustandsanzeige, per
  Tastatur bedienbar.
- Hell- und Dunkel-Modus, umschaltbar über ein Bedienelement, das auf jeder
  Seite identisch ist. Der Zustand hängt an Farbe, Schriftgewicht und einer
  Umrisslinie, nicht allein an der Farbe.
- Zoomen ist auf keiner Seite gesperrt.
- Sichtbare Fokusmarkierung bei Tastaturbedienung.
- Sprungmarke zum Inhalt als erstes fokussierbares Element auf allen 29 Seiten,
  Ziel ist der Hauptbereich und dieser nimmt den Fokus auch an.
- Fortschritt der Anfragestrecke wird für Hilfsmittel angesagt, der Fokus wandert
  bei jedem Schritt auf die neue Überschrift.
- Pflichtfelder maschinenlesbar ausgezeichnet, Fehlermeldungen mit dem Feld
  verknüpft, der Fokus springt bei Fehlern zurück ins Feld.
- Das Hintergrundvideo der Startseite lässt sich anhalten und startet gar nicht
  erst, wenn im Betriebssystem "Bewegung reduzieren" eingestellt ist.
- Die Diagramme des Kostenvergleichs geben ihre Werte zusätzlich als Tabelle aus,
  erzeugt aus denselben Datenreihen wie die Grafik.
- Trefferflächen von mindestens 44 x 44 Punkten an Navigation, Schaltflächen und
  Aufklappern.
- Der Verweis hinter dem Logo trägt auf allen 25 Seiten mit Hauptnavigation einen
  zugänglichen Namen. Zuvor war er im Hell-Modus namenlos, weil dort das Bild mit
  dem Alternativtext ausgeblendet wird.
- Rollbare Tabellenbereiche sind mit der Tastatur erreichbar und benannt.

**Messstand axe-core, 29 Seiten x 2 Modi, 1280 px, gemessen 27.07.2026:**
Befunde mit Schweregrad serious oder critical: **9** (Stand 93b332a: **44**).
Kein Befund kam neu hinzu. Die verbleibenden neun sind unten als E1 und E2
benannt. Frühere Angaben aus dieser Sitzung, die "0 schwere Befunde" nannten,
sind falsch: in jenem Messlauf war der Hell-Modus nicht aktiv, das Werkzeug hat
also nicht gemessen, was es zu messen behauptete.

**Bekannte Einschränkungen (Stand 27.07.2026):**

| #   | Einschränkung                                                                                                                                                                                                                                                                                                                                        | Wirkung                                                                                                                                 | Vorgehen                                                                                                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E0  | **Zwei Stellen mit zu geringem Textkontrast.** Das Partner-Kennzeichen `.pb-vaillant` auf `/anfrage` steht in der Hausfarbe des Herstellers (#ff6f8a) und erreicht 2,47 dunkel und 2,64 hell. Die Fußnoten-Zeichen zu den Förderangaben auf `/anfrage` und `/foerderung` heben sich mit 1,1 bis 1,16 nur farblich vom umgebenden Text ab (7 Knoten). | Beide Stellen sind lesbar und erreichbar, aber unter dem Maßstab.                                                                       | Bestand, unverändert gegenüber 93b332a. Das Kennzeichen trägt einen Markennamen in der Farbe des Herstellers; die Fußnoten-Zeichen folgen dem abgestimmten Wortlaut aus dem Förder-Regelwerk. Beides zu ändern heißt, eine fremde Marke oder einen abgestimmten Rechtstext anzufassen, und ist deshalb eine Entscheidung der Geschäftsführung, kein stiller Fix. |
| E1  | **Abhängigkeit von JavaScript.** Ein Teil der Bedienbarkeit entsteht erst zur Laufzeit: die Tastaturbedienung der Auswahlkacheln, einzelne Feldbeschriftungen und der Modus-Umschalter.                                                                                                                                                              | Ohne aktives JavaScript sind Teile der Anfragestrecke nicht bedienbar.                                                                  | Wird bei jedem Umbau schrittweise abgebaut. Neue Bedienelemente werden ohne Laufzeit-Nachbesserung gebaut. Kein Zieldatum, weil der Umbau die Anfragestrecke betrifft.                                                                                                                                                                                           |
| E2  | **Einwilligungsdialog.** Fremdes Markup, eigene Fokusführung, in der Prüfumgebung nicht zuverlässig ladbar.                                                                                                                                                                                                                                          | Tastaturbedienung und Fokusfalle sind nicht maschinell abgesichert.                                                                     | Sichtprüfung bei jeder Änderung der Anbieter-Konfiguration. Wenn der Anbieter die Anforderungen dauerhaft verfehlt, ist der Wechsel auf eine eigene Lösung die Konsequenz.                                                                                                                                                                                       |
| E3  | **Reihenfolge der Zwischenüberschriften.** Auf sechs Ratgeber-Seiten (`baubarkeitspruefung`, `dimensionierung-verstehen`, `foerdervorschuss`, `gasheizung-tauschen-oder-reparieren`, `waermepumpe-altbau`, `waermepumpe-hannover`) folgt auf die Hauptüberschrift direkt eine Überschrift dritter Ebene.                                             | Wer über die Überschriften-Liste navigiert, sieht eine Stufe, die nicht zur Gliederung passt. Der Inhalt bleibt vollständig erreichbar. | Gemessen mit axe-core am 27.07.2026, Schweregrad "moderate". Die Korrektur ändert die Schriftgröße der betroffenen Überschriften und ist deshalb an eine gestalterische Freigabe gebunden. Fällig in der nächsten Inhaltswelle.                                                                                                                                  |
| E4  | **Kostenvergleichsrechner, interne Doppelpflege.** Die Seite führt eigene Kopien der Bauteile und Stile, weil sie die gemeinsamen Dateien nicht lädt.                                                                                                                                                                                                | Kein unmittelbarer Nachteil für Nutzer, aber ein Risiko, dass eine Verbesserung dort nicht ankommt.                                     | Jede Änderung an den gemeinsamen Dateien wird dort ausdrücklich mitgezogen, vermerkt in den betroffenen Dateien.                                                                                                                                                                                                                                                 |

## 5. Rückmeldung und Durchsetzung

Rückmeldungen zur Barrierefreiheit nimmt HeroWerk unter `info@herowerk.de`,
telefonisch unter 05131 50 59 750 und über das Kontaktformular entgegen. Die
öffentliche Erklärung unter `/barrierefreiheit` nennt dieselben Wege.

Bleibt eine Rückmeldung ohne befriedigende Antwort, ist die
Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten und
Dienstleistungen nach § 21 des Barrierefreiheitsstärkungsgesetzes zuständig.

## 6. Fortschreibung

Dieses Dokument wird bei jeder Änderung des Konformitätsstands fortgeschrieben,
mindestens jedoch einmal jährlich. Änderungen werden im `CHANGELOG.md` des
Vorhabens vermerkt. Die Liste der Einschränkungen in Abschnitt 4 und die Liste
auf `/barrierefreiheit` müssen inhaltlich übereinstimmen; weicht eine ab, gilt
die öffentliche Erklärung und dieses Dokument ist nachzuziehen.
