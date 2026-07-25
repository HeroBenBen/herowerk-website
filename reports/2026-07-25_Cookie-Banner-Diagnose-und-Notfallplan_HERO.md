---
type: fact
tldr: 'Stand 25.07.2026 ist der echte eingebettete consentmanager-Netzstatus BLOCKED; der Banner scheitert unabhängig davon nachweisbar an der HeroWerk-CSP, zusätzlich weicht die Reihenfolge im Head von der offiziellen Autoblocking-Anleitung ab.'
datum: 2026-07-25
status: offen
scope: hitl
quelle: agent
tags:
  - domain/web
  - domain/compliance
  - severity/hoch
---

# Cookie-Banner: Diagnose und Notfallplan

## Entscheidung oben

**Empfehlung:** Kein eigenes Banner bauen und nicht auf den Anbieter warten. Zuerst den belegten eigenen Konfigurationsfehler beheben:

1. `a.delivery.consentmanager.net` minimal in `script-src` freigeben.
2. Das consentmanager-Autoblocking-Skript auf allen HTML-Seiten vor den ersten anderen `<script>`-Block ziehen.
3. Danach in einem frischen Browserzustand Akzeptieren, Ablehnen, Widerruf sowie „kein GA4/Meta vor Zustimmung“ prüfen.

**Geschätzter Aufwand:** 2–4 Stunden einschließlich 29-Seiten-Abgleich und Browser-Smoke-Test. **[Vermutung — vor Umsetzung zu prüfen]** **Nicht umgesetzt:** Dafür braucht es Benjamins GO; dieser Auftrag war Diagnose und Entscheidungsunterlage, kein Live-Fix.

## Kurzurteil

Der heutige Live-Ausfall hat einen unabhängig belegten eigenen Blocker: die HeroWerk-CSP. **[verifiziert: Live-CSP, Chrome-DOM und `.htaccess`]** Ob der frühere Anbieterfehler zusätzlich fortbesteht, ist **BLOCKED**. Der am 01. und 03.07. gemessene eingebettete HTTP 503 lässt sich nicht mit curl entkräften, weil curl schon damals HTTP 200 lieferte. Heute liefern zwar **9 von 9** direkten bzw. mit Browser-Headern nachgebildeten Abrufe HTTP 200; das ist ausdrücklich **kein Beweis** für den Status des echten eingebetteten Browseraufrufs.

Die aktuelle Live-CSP lässt `a.delivery.consentmanager.net` nur unter `connect-src` zu. consentmanager bindet `cmp.php` jedoch als externes `<script>` ein. Dafür gilt `script-src`; dort ist nur `cdn.consentmanager.net` freigegeben. Die Ladekette bricht genau an diesem Übergang ab.

Zusätzlich steht das Autoblocking-Skript im `<head>` erst **nach** einem eigenen Inline-Skript für Google Consent Mode. Die [offizielle consentmanager-Anleitung](https://help.consentmanager.net/books/cmp/page/automatic-blocking-of-codes-and-cookies) verlangt das Autoblocking-Skript direkt nach `<head>` und vor jedem anderen `<script>` oder `<iframe>`. Das ist eine belegte Integrationsabweichung, auch wenn sie den historischen 503 nicht erklärt. **[verifiziert: `index.html` und consentmanager-Anleitung]**

## Messprotokoll vom 25.07.2026

Messzeit: 11:47–11:50 Uhr MESZ. Live-Ziel: `https://www.herowerk.de/`.

| Prüfung                                 |                                                               Messwert | Quelle                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------: | ------------------------------------------------------------------------ |
| Live-Startseite                         |                                             HTTP 200, 27.616 Byte HTML | Live-Abruf                                                               |
| Autoblocking `d94854dc5273c.js`         |                                         HTTP 200, 52.570 Byte entpackt | Live-Abruf                                                               |
| `cmp.php`, direkter Abruf               |                                                           3/3 HTTP 200 | exakte, vom Browser erzeugte URL; nicht gleich echter Embed-Kontext      |
| `cmp.php`, browserähnlich ohne `Origin` |                                                           3/3 HTTP 200 | `Referer`, `Sec-Fetch-Site: cross-site`, `Mode: no-cors`, `Dest: script` |
| `cmp.php`, zusätzlich mit `Origin`      |                                                           3/3 HTTP 200 | Kontrollvariante; weiterhin kein echter Embed-Kontext                    |
| `cmp.php`, echter Chrome-Netzstatus     |                                                                BLOCKED | Browser-Schnittstelle liefert keinen Status; CSP unterbricht Ladekette   |
| Banner normal                           |                                              0 CMP-Elemente, 0 Dialoge | Chrome-Live-DOM                                                          |
| Banner erzwungen (`?cmpscreen`)         |                                              0 CMP-Elemente, 0 Dialoge | Chrome-Live-DOM                                                          |
| CMP-Grundskripte                        | Autoblocking, `cmp.php`, `cmp_final.min.js`, `js/consent.js` vorhanden | Chrome-Live-DOM                                                          |
| Erwartete Folgestufe                    |                              zweites `cmp.php` und `customdata` fehlen | Chrome-Live-DOM                                                          |
| Tracking vor Zustimmung                 |                           kein von HeroWerk geladenes GA4-/Meta-Skript | DOM und `js/consent.js`                                                  |

Die vom Live-Browser erzeugte Delivery-URL war:

```text
https://a.delivery.consentmanager.net/delivery/cmp.php?id=173772&h=https%3A%2F%2Fwww.herowerk.de%2F&l=de&ls=DE_DE_EN&lp=DE&o=1784972799825
```

Der HTTP-200-Inhalt dieser URL erzeugt programmatisch einen **zweiten** Script-Aufruf an `a.delivery.consentmanager.net`, der die eigentliche CMP-Konfiguration laden soll. Dieser zweite Script-Knoten erscheint im Live-DOM nicht. Parallel zeigt der Live-Header:

```text
script-src 'self' 'unsafe-inline'
  https://*.vercel-insights.com
  https://cdn.consentmanager.net
  https://www.googletagmanager.com
  https://connect.facebook.net
```

`a.delivery.consentmanager.net` fehlt. Die Freigabe desselben Hosts unter `connect-src` hilft nicht, weil `cmp.php` über `<script src="…">` eingebunden wird.

### Saubere Trennung alt gegen heute

- **01./03.07.:** Eingebetteter Browseraufruf von `cmp.php` lieferte nach dem vorhandenen Netzwerkbeleg HTTP 503, während direkte Abrufe HTTP 200 lieferten.
- **25.07.:** 9 curl-basierte Wiederholungen liefern HTTP 200. Genau diese Messmethode sah den historischen Embed-Fehler jedoch schon am 01./03.07. nicht. Der echte eingebettete Netzstatus bleibt daher BLOCKED. Unabhängig davon ist die CSP ein heutiger Blocker. Ob consentmanager den damaligen Delivery-/Domainfehler serverseitig behoben hat, kann nur der Anbieter oder ein Browser-Netzbeleg nach dem CSP-Fix bestätigen.
- **Folge:** Die vorhandene Vault-Lehre „nicht unser Setup-Fehler“ reicht als alleinige Erklärung des heutigen Ausfalls nicht mehr aus. Beide Fehler können zeitlich nacheinander oder gleichzeitig bestanden haben.

## Repo-Prüfung gegen die Anbieteranleitung

Geprüfter Stand: `origin/main` bei `4f58aea`.

### Korrekt

- CMP-ID `173772`, Konto `104033` und Code-ID `d94854dc5273c` sind konsistent.
- `data-cmp-ab="1"`, `data-cmp-host`, `data-cmp-cdn` und `data-cmp-codesrc` sind gesetzt.
- Das Autoblocking-Skript ist synchron eingebunden; kein `async` oder `defer`.
- `js/consent.js` lädt GA4 und Meta nur nach eindeutig positiver Einwilligung. Der aktuelle Ausfall ist daher fail-closed: keine unerlaubte Messung, aber vollständiger Ausfall der vorgesehenen GA4-/Meta-Messung.

### Abweichungen

1. **CSP blockiert die Delivery-Skripte.** Fundstelle: `.htaccess`, CSP-Zeile. `connect-src` ist nicht die passende Direktive für ein Script-Element.
2. **Autoblocking ist nicht das erste Skript.** Fundstelle: `index.html` Z. 11–29 sowie derselbe Block auf allen HTML-Seiten. Der eigene Consent-Mode-Block steht davor.
3. **Zwecke müssen nach dem Fix einmal live gegengeprüft werden.** `js/consent.js` ordnet Statistik den Zweck-IDs `3`/`s3` und Marketing `4`/`s4` zu; der Kommentar im Code kennzeichnet diese Zuordnung selbst als zu prüfen.

## Free-Paket: zweite mögliche Grenze

Die öffentliche consentmanager-Seite nennt für Free **3.000 Seitenaufrufe pro Monat**. Nach Erreichen stoppt das Free-Paket die Auslieferung des Zustimmungs-Layers; zusätzliche Aufrufe sind nicht buchbar. **[verifiziert: consentmanager-Publisherseite und Anbietererläuterung]** Quelle: [consentmanager – Pakete für Publisher](https://www.consentmanager.net/en/publisher-and-publishers/) und [deutsche Erläuterung zum Free-Limit](https://www.consentmanager.net/de/knowledge/webinar-video-consent-solution-correctly-set-up/).

**BLOCKED:** Ob HeroWerk das Juli-Limit erreicht hat, ist von außen nicht messbar. Dafür muss Benjamin im consentmanager-Konto den aktuellen PageView-Zähler öffnen. Ohne diesen Kontobeleg ist das Free-Limit eine mögliche zusätzliche Ursache seit 14.07., keine verifizierte Ursache.

Wichtig: Das Free-Limit erklärt weder die HTTP-503-Messungen vor der Herabstufung am 14.07. noch die falsch konfigurierte CSP.

## Drei beauftragte Wege

| Weg                                  |                      Einmalaufwand |                                                                                        Laufende Kosten | Wirkung                                                             | Downside                                                                                                                                                                |
| ------------------------------------ | ---------------------------------: | -----------------------------------------------------------------------------------------------------: | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A – Beim Anbieter bleiben und warten |                                0 h |                                                                                                    0 € | keine                                                               | Nicht tragfähig: Warten korrigiert die eigene CSP nicht. Die Messlücke läuft weiter.                                                                                    |
| B – Zurück auf Essential             |                          ca. 0,5 h |                                                                                             59 €/Monat | 1 Mio. Aufrufe/Monat, TCF, bis zu 3 Websites                        | Löst die CSP nicht. Schnellere Bearbeitung ist öffentlich nicht zugesichert. Für reines Aufrufvolumen ist Starter mit 23 €/Monat und 100.000 Aufrufen wirtschaftlicher. |
| C – Eigenes schlankes Banner         | 20–32 h intern; Eurokosten BLOCKED | keine Lizenz; 2–4 h Pflege je Vendor-/Rechtsänderung; externe Rechts-/Barrierefreiheitsabnahme BLOCKED | keine Delivery-Abhängigkeit, schneller, Kontrolle über Consent Mode | HeroWerk trägt UX-, Barrierefreiheits-, Nachweis- und Rechtsänderungsrisiko selbst; kein IAB-TCF-Signal.                                                                |

Aktuelle bezahlte Preise und Leistungsgrenzen: [consentmanager Pricing](https://www.consentmanager.net/en/pricing/) und [Planvergleich](https://www.consentmanager.net/en/features/).

Weg C bedeutet konkret: zwei primäre Schaltflächen („Alle akzeptieren“ / „Optionale ablehnen“), versionierte Speicherung der Entscheidung im `localStorage`, Aktualisierung der Google-Consent-Mode-v2-Signale und physisches Laden von GA4/Meta erst nach Zustimmung. Zusätzlich braucht es einen jederzeit erreichbaren Widerruf, Tastatur-/Screenreader-Abnahme und Tests auf allen 29 Seiten. Vor Zustimmung bleibt Tracking vollständig gesperrt. Ein eigenes Banner liefert kein IAB-TCF-Signal; die Vendor- und Zweckliste muss HeroWerk bei jeder Stack-Änderung selbst pflegen. **BLOCKED:** Eine belastbare Eurozahl ist ohne von Benjamin bestätigten internen Verrechnungssatz sowie ein Angebot für Rechts- und Barrierefreiheitsprüfung nicht seriös.

## Empfehlung

**Nicht A, nicht B, noch nicht C.** Zuerst den eigenen Konfigurationsfehler in 2–4 Stunden beheben und testen. Danach:

1. Liegt der Juli-Zähler unter 3.000 und der Banner funktioniert, vorerst Free behalten.
2. Liegt der Zähler nahe oder über 3.000, auf **Starter für 23 €/Monat** statt Essential wechseln, solange HeroWerk weder TCF noch drei Websites benötigt.
3. Nur wenn consentmanager nach korrekter Einbindung erneut instabil ausliefert, das eigene Banner als kontrollierten Ersatz bauen.

Damit wird kein Anbieterwechsel bezahlt, bevor der selbst verursachte Block beseitigt und der tatsächliche Traffic bekannt ist.

## Screenshot- und Abnahmebedarf

Benjamin muss für den Support-Thread bereitstellen:

1. **Historischer Netzwerk-Beleg vom 01. oder 03.07.**: vollständige `cmp.php`-URL, HTTP 503, Initiator `d94854dc5273c.js`. Wenn kein alter Screenshot existiert, nicht heute künstlich nachstellen; der aktuelle echte Embed-Status ist bis zum CSP-Fix BLOCKED.
2. **Domainliste im Portal**: `herowerk.de` und `www.herowerk.de`, Status „genehmigt“, fehlendes „last seen“ sowie aktuelles Free-Paket.
3. **Nach dem CSP-Fix**: frischer Netzwerk-Beleg mit beiden `cmp.php`-Stufen, `customdata`, sichtbarem Banner und weiterhin 0 GA4-/Meta-Requests vor Zustimmung.

## Regel-Check

R0 ✅ | R1 ✅ | R2 ✅ | R3 ● | R4 ● | R5 ● | R6 ● | R7 ✅ | R8 ✅ | R9 ✅
R10 ✅ | R11 ● | R12 ● | R13 ✅ | R14 ✅ | R15 ✅ | R16 ✅ | R17 ● | R18 ✅ | R19 ● | R20 ●
Gate-Status: Start ✅ | Pre-Write ✅ | Execution ✅ | Output ✅
