# Website-Umbau Iteration 2 — 2026-06-12

## Scope

- Keine Änderungen an `.github/workflows/` oder `lighthouserc.json`.
- Keine Gate-/Schwellen-Lockerung.
- Sichtbare Texte bleiben 1:1; einzige Wortänderung ist das freigegebene Nav-Label `Start` → `Startseite`.
- Kein neuer Sektionstyp; der abgelehnte `home-teaser-cards`-Block wurde ersatzlos entfernt.

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
- `js/site.js`
- `tests/smoke.spec.js`
- `reports/website-umbau-iteration2-2026-06-12.md`

## B1 — home-teaser-cards entfernt

- Der Block `<div class="pa-cards home-teaser-cards" aria-label="Navigation">` wurde vollständig aus `index.html` entfernt.
- Es wurde kein Ersatz gebaut und keine neue Sektion erfunden.
- Es existierten keine `home-teaser-cards`-spezifischen CSS-Regeln; `.pa-card` bleibt für den Preisindikator auf `/preise` erhalten.
- Content-Fidelity blieb nach Entfernung grün (`Content-Fidelity-Check OK`). Die Teaser-Entfernung ist GF-Sichtentscheid, keine Umformulierung von Bestandscontent.

## B2 — Kontrast-Dump vorher/nachher

Browserbasierter axe-Dump konnte lokal nicht laufen, weil `playwright` im Checkout nicht installiert ist und `npm ci`/Registry-Zugriff in dieser Umgebung blockiert. Stattdessen wurde vor und nach dem Fix ein eigener statischer Ratio-Dump für die vom Controller benannten Token-/Flächengruppen erzeugt.

### Vorher — eigene statische Messliste

| Gruppe                           | Vordergrund | Hintergrund |  Ratio |
| -------------------------------- | ----------- | ----------- | -----: |
| G1 Sand auf Chartreuse           | `#F4F1EA`   | `#B7D900`   | 1.44:1 |
| G2 Schiefer-light auf Chartreuse | `#5A6470`   | `#B7D900`   | 3.71:1 |
| G3 Akzentgrün auf Chartreuse     | `#5F7200`   | `#B7D900`   | 3.32:1 |
| G3 Akzentgrün auf Grau           | `#5F7200`   | `#B7B5B0`   | 2.63:1 |
| G4 Weiß auf Weiß                 | `#FFFFFF`   | `#FFFFFF`   | 1.00:1 |
| G5 Akzentgrün auf `#DAD8CF`      | `#5F7200`   | `#DAD8CF`   | 3.78:1 |

### Nachher — eigene statische Messliste

| Gruppe                              | Vordergrund | Hintergrund |   Ratio |
| ----------------------------------- | ----------- | ----------- | ------: |
| G1/G2/G3 Schiefer auf Chartreuse    | `#1C2B36`   | `#B7D900`   |  8.93:1 |
| G4 Formular-Label Schiefer auf Weiß | `#1C2B36`   | `#FFFFFF`   | 14.50:1 |
| G5 Schiefer auf Surface-Tertiary    | `#1C2B36`   | `#EBE7DC`   | 11.74:1 |
| Light Secondary auf Weiß            | `#5A6470`   | `#FFFFFF`   |  6.01:1 |
| Light Secondary auf Sand            | `#5A6470`   | `#F4F1EA`   |  5.33:1 |
| Dark Primary auf Schiefer           | `#FFFFFF`   | `#1C2B36`   | 14.50:1 |
| Dark Secondary auf Schiefer         | `#D1D5DB`   | `#1C2B36`   |  9.84:1 |
| Dark Tertiary auf Schiefer          | `#A0A6AD`   | `#1C2B36`   |  5.91:1 |

Fix-Mechanik:

- Light-Mode-Chartreuse-Flächen (`btn-primary`, `nav-cta`, `wizard-btn-next`, `form-submit`, `pa-header-cta`, `pa-bottom-cta`) erzwingen Schiefer `#1C2B36` für Text und SVG-Strokes.
- Light-Mode-Kontaktformularlabels erzwingen `#1C2B36` auf weißem Formularhintergrund.
- Light-Mode-Hinweis-/Segment-/Förderflächen nutzen Spec-Surface `#EBE7DC` und Schiefertext.
- Dark-Token wurden nicht umdefiniert.

## B3 — Nav-Label

- Auf den 7 Website-Seiten wurden Desktop-Nav und Mobile-Menü von `Start` auf `Startseite` geändert.
- Haus-Icon/SVG bleibt unverändert.

## B4 — `/preise` Heading-Order

- Der JS-rendered Preisindikator-Titel in `paRenderCards()` wurde von `<h3>` auf `<h2>` geändert.
- `.pa-card h2` nutzt die bestehende `.pa-card h3`-Optik, damit die visuelle Darstellung gleich bleibt.
- Statische Heading-Inventur nach Fix: alle geprüften Seiten haben 1× `h1` und 0 Heading-Sprünge.

## Tests / lokale Belege

- `npm run lint` → grün.
- `node scripts/content-fidelity-check.js` → grün.
- `node scripts/hubspot-schema-check.js` → grün.
- `git diff --check` → grün.
- Lead-only-Grep mit CI-Job-12-Pattern → 0 Treffer.
- Statische Heading-Inventur (`index`, `preise`, `dimensionierung`, `foerderung`, `prozess`, `ratgeber`, `kontakt`, `anfrage`) → 1× `h1`, 0 Heading-Sprünge.
- `npm run test:a11y -- --project=chromium` → lokal blockiert (`playwright: not found`).
- `npm run test:smoke -- --project=chromium` → lokal blockiert (`playwright: not found`).
- `npx lhci autorun --config=./lighthouserc.json` → lokal blockiert (`403 Forbidden - GET https://registry.npmjs.org/lhci`).

## Bestätigung

- Texte 1:1; einzige sichtbare Wortänderung ist `Startseite`.
- Kein neuer Sektionstyp; der abgelehnte Teaserblock wurde ersatzlos entfernt.
- Dark-Mode-Tokens und Dark-Mode-Selektoren wurden nicht geändert.
- `.github/workflows/`, `lighthouserc.json` und `baseline/visual/` wurden nicht verändert.
