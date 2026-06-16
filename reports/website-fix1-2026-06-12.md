# Website Fix-Runde 1 — 2026-06-12

## Scope und Leitplanken

- Branch-Ziel: `codex/setup-herowerk-website-for-vercel`.
- Commit-Identität: `HeroBenBen <267895549+HeroBenBen@users.noreply.github.com>`.
- Kein Merge, kein Production-Deploy.
- Content-Fidelity wurde grün gehalten; Wordlist-Patch und Vaillant-Vorauswahl wurden nicht umformuliert.

## Cluster A — WCAG 2.1 AA / axe

### Umgesetzt

- Formular-Controls ohne sichtbares `label for` erhalten zur Laufzeit robuste zugängliche Namen aus dem nächsten Formularlabel, Placeholder oder ID. Das adressiert `select-name` und `label`, ohne sichtbare Funnel-Texte zu verändern.
- Funnel-Antwortkarten erhalten `role="button"`, `tabindex="0"` und Enter-/Space-Auslösung. Die echte Conversion-Strecke bleibt unverändert.
- `index.html` wurde mit genau einem `main`-Landmark um die Inhaltssektionen ergänzt; die mobile Bottom-Bar ist als Navigation-Landmark benannt.
- `anfrage.html` erhielt ein nicht sichtbares, aber zugänglich benanntes `h1`, ohne die H2-basierte Content-Fidelity-Aufteilung textlich zu verändern.
- Fokuszustände wurden global sichtbar gemacht und für Funnel-/Preisanker-Karten verstärkt.

### Kontrast-Tabelle

| Token    |    Vorher | Kontrast auf #1C2B36 |   Nachher | Kontrast auf #1C2B36 | Grund                                                |
| -------- | --------: | -------------------: | --------: | -------------------: | ---------------------------------------------------- |
| `--g300` | `#D1D5DB` |               9.84:1 | `#E5E7EB` |              11.71:1 | Reserve für kleine UI-Texte im Dark-Mode             |
| `--g400` | `#9CA3AF` |               5.71:1 | `#D1D5DB` |               9.84:1 | Sekundärtext/Fußnoten deutlich über AA               |
| `--g500` | `#6B7280` |               3.00:1 | `#A0A6AD` |               5.91:1 | Normaltext-Kontrast von grenzwertig auf AA angehoben |

Chartreuse `#B7D900` und Bernstein `#E8A838` wurden nicht verfälscht; Text auf Bernstein bleibt Schiefer-basiert.

### Manuelle WCAG-Checkliste

- Tastatur: Funnel-Karten sind fokussierbar und per Enter/Space auslösbar.
- Fokus: sichtbarer Fokus über `:focus-visible`, zusätzlich auf `.answer-card`, `.pa-card`, `.manufacturer-tab`.
- Vorlesereihenfolge: Funnel bleibt in DOM-Reihenfolge Trust-Panel → Funnel-Panel; primäre Conversion liegt in `main`.
- Alt-Texte: inhaltstragende Bilder behalten sprechende Alt-Texte; Logo-/Partnerbilder haben kurze Marken-Alttexte oder Text-Fallback.
- Landmarks: Startseite hat Navigation, genau ein `main`, Footer und benannte mobile Navigation; Funnel-Seite hat `main` plus Trust-Aside.

## Cluster B — Performance

- Statische Bilder in `index.html` und `anfrage.html` erhielten explizite `width`/`height` und `decoding="async"`; Below-the-fold-Bilder behalten `loading="lazy"`.
- Dynamisch gerenderte Preisanker-/Wizard-Bilder erhalten ebenfalls Dimensionen, `height:auto`, `loading="lazy"` und `decoding="async"`.
- Broken Logo-/Partner-Bildpfade im Funnel wurden auf vorhandene Assets bzw. Text-Badge-Fallback reduziert, um unnötige 404-Bildrequests zu vermeiden.
- Font-Rendering bleibt über Google-Fonts-URL mit `display=swap` aktiv.

## Cluster C — SEO

- `index.html`, `anfrage.html`, `impressum.html`, `datenschutz.html` und `hinweise.html` haben Canonical-Links, Open-Graph- und Twitter-Meta-Tags.
- `robots.txt` und `sitemap.xml` wurden unter `/` ergänzt.
- Bestehendes JSON-LD für LocalBusiness/FAQPage/Product/WebPage bleibt erhalten.

## Cluster D — CSP / Security-Header

- `vercel.json` ergänzt Vercel-konforme Header-Konfiguration:
  - `Content-Security-Policy` mit `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, HubSpot-Form-API in `form-action`/`connect-src`, Google Fonts, Vercel Live/Insights.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy` für Kamera/Mikrofon/Geolocation aus.
  - `Strict-Transport-Security` und `X-Frame-Options: DENY`.
- CSP enthält temporär `unsafe-inline` für bestehende Inline-Styles/-Scripts der v4-Referenz. Das ist im Headerwert bewusst eng begrenzt und wird erst in einem separaten Nonce-/Refactor-Sprint entfernt.

## Cluster E — playwright-smoke Klassifikation

- Befund 1 `Theme-Toggle`: Test-Ablauf-Mismatch. Auf responsiven Layouts können mehrere Toggle-Instanzen existieren; der Test klickt jetzt den sichtbaren Toggle. Die Funktion selbst bleibt unverändert.
- Befund 2 `Funnel sendet HubSpot-Payload`: Test-Ablauf-Mismatch. Schritt 3 des canonical Funnels ist kein `.answer-card`-Schritt, sondern ein Heizungsalter-Select mit Weiter-Button. Der Test bildet jetzt die echte Strecke ab: Schritte 1–2 Karten, Schritt 3 Select + Weiter, Schritte 4–8 Karten, Schritt 9 PLZ, Schritt 10 Submit + HubSpot-Mock mit UTM-Assertions.
- Keine Test-Skips, keine Assertion-Abschwächung; die Conversion-Strecke bis Submit und Payload bleibt vollständig geprüft.

## Lokale Belege

- `node scripts/content-fidelity-check.js`: grün.
- `node scripts/hubspot-schema-check.js`: grün.
- `npm run lint`: grün.
- `python3 -m json.tool vercel.json`: grün.
- `python3 -m json.tool lighthouserc.json`: grün.
- `npm run test:smoke`: lokal nicht ausführbar, weil `playwright`/Browser-Binary in diesem Container nicht installiert ist und laut Vorgabe kein `npm install` ausgeführt wurde.
