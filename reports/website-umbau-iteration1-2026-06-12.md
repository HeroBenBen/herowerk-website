# Website-Umbau Iteration 1 — 2026-06-12

## Scope

- Branch-Ziel: `codex/setup-herowerk-website-for-vercel`.
- Keine Gate-/Schwellen-Lockerung.
- Keine sichtbare Copy-Umformulierung: Änderungen an Seiteninhalten sind Tag-Ebene (`h2`/`h3` → `h1`/`h2`) oder Schriftgrößen/Theme-Kontrast.
- Funnel-Copy bleibt unverändert; `anfrage.html` wurde in dieser Iteration nicht editiert.

## Getouchte Dateien

- `index.html`
- `preise.html`
- `dimensionierung.html`
- `foerderung.html`
- `prozess.html`
- `ratgeber.html`
- `kontakt.html`
- `css/site.css`
- `tokens.css`
- `tests/smoke.spec.js`
- `reports/website-umbau-iteration1-2026-06-12.md`

## U1 — h1 je Unterseite / Heading-Order

Tag-only-Fix: Die jeweilige Sektions-Hauptüberschrift wurde wortgleich auf `h1` hochgestuft. Nachgelagerte Seitenüberschriften wurden lückenlos auf `h2` geführt. Footer-Spaltenüberschriften wurden tag-seitig auf `h2` angepasst, damit Seiten ohne weitere Zwischenüberschrift keinen `h1`→`h3`-Sprung erzeugen.

Statische lokale Heading-Inventur:

| Seite               | h1-Anzahl | Heading-Sprünge |
| ------------------- | --------: | --------------: |
| `/`                 |         1 |               0 |
| `/preise`           |         1 |               0 |
| `/dimensionierung`  |         1 |               0 |
| `/foerderung`       |         1 |               0 |
| `/prozess`          |         1 |               0 |
| `/ratgeber`         |         1 |               0 |
| `/kontakt`          |         1 |               0 |
| `/anfrage.html`     |         1 |               0 |
| `/impressum.html`   |         1 |               0 |
| `/datenschutz.html` |         1 |               0 |
| `/hinweise.html`    |         1 |               0 |

## U2 — color-contrast-Reste

Browserbasierter axe-Dump konnte lokal nicht erzeugt werden, weil `npm ci` in dieser Umgebung fehlschlug und danach `playwright` nicht verfügbar war (`sh: 1: playwright: not found`). Deshalb wurde kein spekulativer DOM-spezifischer Fix vorgenommen, sondern die vom Auftrag benannten Restgruppen wurden auf Komponenten-/Theme-Ebene adressiert.

Vorher-Befundquelle: CI-Lauf `27420413195` meldete Restgruppen `11×/5×/4×` je Seite; die Umbau-Auftragsliste benennt diese Muster:

| Muster                        | Fix                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Chartreuse-Text auf Weiß/Sand | Light-Theme-Akzenttext für bestehende grüne Text-/Icon-Komponenten auf `#5F7200` geführt. |
| Weiß auf Weiß                 | Light-Theme-Headings/Werte in bestehenden Karten auf Schiefer `#1C2B36` geführt.          |
| Hellgrau auf Weiß/Sand        | Bestehende Light-Grautokens bleiben `#5A6470`; kleine Resttexte nutzen diese Tokens.      |
| Sand auf Chartreuse           | Bestehende `pz-step-num`/`hf-step-num`-Regel bleibt Schiefer auf Chartreuse.              |
| Kleine Fußnoten/Hinweise      | CSS-/Inline-Schriftgrößen von 9–11 px auf 12 px angehoben, Text unverändert.              |

Verifizierte statische Kontrastwerte:

| Vordergrund | Hintergrund |   Ratio |
| ----------- | ----------- | ------: |
| `#5F7200`   | `#FFFFFF`   |  5.39:1 |
| `#5F7200`   | `#F4F1EA`   |  4.78:1 |
| `#1C2B36`   | `#FFFFFF`   | 14.50:1 |
| `#5A6470`   | `#FFFFFF`   |  6.01:1 |
| `#5A6470`   | `#F4F1EA`   |  5.33:1 |
| `#1C2B36`   | `#B7D900`   |  8.93:1 |
| `#D1D5DB`   | `#1C2B36`   |  9.84:1 |
| `#A0A6AD`   | `#1C2B36`   |  5.91:1 |

Nachher-axe-Beleg: lokal blockiert durch fehlendes Playwright; CI muss den 0-Violations-Nachweis gegen die Preview liefern.

## U3 — Lighthouse light: font-size, link-text, best-practices

- `font-size`: Kleine CSS-/Inline-Hinweise auf den neuen Seiten wurden auf mindestens 12 px angehoben; Text bleibt unverändert.
- `link-text`: Statische lokale Linktext-Prüfung fand keine leeren oder generischen Links ohne Ersatznamen. Die mobile Telefon-Icon-Verlinkung hat `aria-label="Anrufen"`.
- `best-practices`: Ein lokaler LHCI-Lauf war nicht möglich, weil `npx lhci` wegen Registry-403 nicht installiert werden konnte. Der zuletzt konkret bekannte Best-Practices-Treiber aus den vorherigen Runden (`/favicon.ico` 404) ist bereits durch ein echtes Root-Favicon behoben; in dieser Iteration wurde keine CSP-/Performance-/Schwellenänderung vorgenommen.

SEO-Einzelaudit-Status, statisch geprüft:

| Audit               | Status                                                                             |
| ------------------- | ---------------------------------------------------------------------------------- |
| `document-title`    | pass                                                                               |
| `meta-description`  | pass                                                                               |
| `http-status-code`  | pass über lokalen HTTP-Server für `/`                                              |
| `link-text`         | pass per statischer Linktext-Prüfung                                               |
| `crawlable-anchors` | pass per vorhandenen echten `href`-Zielen                                          |
| `robots-txt`        | pass (`robots.txt` vorhanden)                                                      |
| `image-alt`         | pass per bestehendem Alt-/Aria-Konzept                                             |
| `hreflang`          | pass gemäß LHCI-Konfiguration als hartes Audit, lokal nicht browserbasiert messbar |
| `canonical`         | pass per `seo-basics-check`                                                        |
| `font-size`         | pass erwartet nach 12-px-Anhebung; lokal nicht browserbasiert messbar              |

Lighthouse-Scores: lokal nicht verfügbar (`npx lhci autorun --config=./lighthouserc.json` → Registry `403 Forbidden`). Keine Schwelle wurde geändert.

## U4 — Nav-Smoke-Timeout

Klassifikation: Test-Ablauf-Mismatch am 375-px-Viewport. Die Desktop-Nav-Links liegen im Burger-Menü; die Startseiten-Teaser-Karten sind dagegen sichtbar und erfüllen denselben Nutzerintent „Unterseite erreichen“.

Fix: Der Smoke-Test klickt von `/` auf die sichtbaren `.pa-card[href="/…"]`-Teaser und kehrt über den sichtbaren Logo-Link (`a:has(.nav-logo)`) zur Startseite zurück. Produktionsnavigation wurde nicht geändert.

Nachher-Smoke-Beleg: lokal blockiert durch fehlendes Playwright; Test-Intent bleibt unverändert.

## Lokale Befehlsbelege

- `npm run lint` → grün.
- `node scripts/content-fidelity-check.js` → grün (`Content-Fidelity-Check OK`).
- `node scripts/hubspot-schema-check.js` → grün.
- `git diff --check` → grün.
- `node scripts/seo-basics-check.js http://127.0.0.1:8081` → grün.
- `node scripts/rich-results-check.js http://127.0.0.1:8081/` → grün.
- `npm run test:smoke -- --project=chromium` → lokal blockiert (`playwright: not found`).
- `npm run test:a11y -- --project=chromium` → lokal blockiert (`playwright: not found`).
- `npx lhci autorun --config=./lighthouserc.json` → lokal blockiert (`403 Forbidden - GET https://registry.npmjs.org/lhci`).

## Bestätigung

- Wortlaut unverändert; Linktexte/Teaser-Texte bleiben aus bestehenden Überschriften/Formulierungen.
- Content-Fidelity ist lokal grün.
- Keine Gate-/Schwellen-Lockerung.
- Keine Performance-Optimierung in dieser Iteration.
