# Website Fix-Runde 3 — 2026-06-12

## Scope

- Branch: `codex/setup-herowerk-website-for-vercel`.
- Commit-Identität: `HeroBenBen <267895549+HeroBenBen@users.noreply.github.com>`.
- Lead-only-Wortlaut und Funnel-Copy wurden nicht textlich verändert; Änderungen an `index.html` sind Tag-/Ressourcenebene, an `anfrage.html` nur Event-Härtung.

## W1c — axe color-contrast pro Theme

### Diagnose und Ursache

- Lokale Browser-Reproduktion war in dieser Umgebung nicht vollständig möglich, weil `npm ci` die Playwright/Lighthouse-Binaries nicht installieren konnte (`EAI_AGAIN`, npm `Exit handler never called`) und vorhandene `playwright`-Binaries fehlen.
- Die Fix-Runde-2-Regression kam aus zu breit geteilten Token-/Selector-Korrekturen: Kontrastfixes für Light-Akzenttext und tertiäre Texte wurden nicht sauber theme-separiert dokumentiert/abgesichert. Fix-Runde 3 trennt Dark- und Light-Kontrastwächter explizit.

### Umsetzung

- Dark-Theme-Texttokens wieder theme-spezifisch kontraststark gesetzt (`--color-text-secondary #D1D5DB`, `--color-text-tertiary #A0A6AD`) und Dark-Only-Guards für schwache Inline-/Trust-Texte ergänzt.
- Light-Theme-Akzenttext bleibt getrennt `#5F7200`; Chartreuse `#B7D900` bleibt für Flächen/Akzent erhalten.
- Light-Guards für `var(--g300/400/500)`/`var(--muted)` setzen Text auf `#5A6470`.

### Verifizierte statische Kontrastwerte

- Dark body: `#FFFFFF` auf `#1C2B36` = 14.50:1.
- Dark secondary: `#D1D5DB` auf `#1C2B36` = 9.84:1.
- Dark tertiary: `#A0A6AD` auf `#1C2B36` = 5.91:1.
- Dark accent: `#B7D900` auf `#1C2B36` = 8.93:1.
- Light body: `#1C2B36` auf `#F4F1EA` = 12.86:1.
- Light secondary: `#5A6470` auf `#FFFFFF` = 6.01:1.
- Light accent text: `#5F7200` auf `#F4F1EA` = 4.78:1.
- Light accent on white: `#5F7200` auf `#FFFFFF` = 5.39:1.
- Text auf Bernstein: `#1C2B36` auf `#E8A838` = 6.97:1.

## W2 — heading-order auf `/`

- Footer-Spaltenüberschriften wurden tag-seitig von `h4` auf `h3` geändert, passend zur vorherigen Hierarchie. Sichtbarer Text unverändert.

## W3 — Funnel-PLZ-Input

- Bereits in Fix-Runde 2 umgesetzt und erhalten: `#plzInput` validiert zusätzlich im `input`-Event (`validatePlz(this)`) neben `keyup`.

## W4 — Theme-Toggle erreichbar

- Bereits in Fix-Runde 2 umgesetzt und erhalten: zusätzlicher `nav-theme-standalone`-Toggle im mobilen Header; Test-Intent `.filter({ visible: true })` bleibt unverändert.

## W5c — Lighthouse Performance

- Font- und Token-Stylesheets bleiben per `preload`/`onload` nicht blockierend geladen; `noscript`-Fallbacks bleiben vorhanden.
- Bilder behalten explizite Dimensionen/`decoding="async"`/Lazy-Loading below-the-fold.
- Lokale Performance-Scores konnten nicht gemessen werden, weil `npm ci` wegen Registry/DNS-Problemen fehlschlug und `npx lhci` wegen Registry-403 nicht verfügbar war.
- Keine Performance-Schwelle wurde geändert; `categories:performance` bleibt `error` mit `minScore: 0.90`.

## W7 — Mess-Robustheit

- `ci.collect.numberOfRuns: 3` in `lighthouserc.json` ergänzt.
- Lighthouse-Action erhält zusätzlich `runs: 3`.
- Inline-Begründung: Median aus 3 Läufen glättet kalte Vercel-Preview-Schwankungen (±0,05); Schwellen bleiben unverändert.

## W6 Status — SEO-Gate bleibt ratifiziert

- `categories:seo` bleibt `warn`.
- `is-crawlable` bleibt `warn` wegen Vercel-Preview-`x-robots-tag:noindex`.
- Harte SEO-Einzelaudits bleiben `error`.

### Static-Beleg der 10 harten SEO-Einzelaudits

- `document-title`: pass.
- `meta-description`: pass.
- `http-status-code`: pass (lokal dateibasiert; echter Status in CI/Preview).
- `link-text`: pass.
- `crawlable-anchors`: pass.
- `robots-txt`: pass.
- `image-alt`: pass.
- `hreflang`: pass / single-locale not-applicable.
- `canonical`: pass.
- `font-size`: pass.
- `is-crawlable`: warn (Preview-noindex).

## Lokale Test-Belege

- `node scripts/content-fidelity-check.js`: grün.
- `node scripts/hubspot-schema-check.js`: grün.
- `npm run lint`: grün.
- `python3 -m json.tool lighthouserc.json`: grün.
- `python3 -m json.tool vercel.json`: grün.
- Static SEO Node-One-Liner: 10 harte SEO-Audits pass, `is-crawlable` warn.
- Kontrast Node-One-Liner: siehe W1c-Kontrastwerte.

## Nicht lokal ausführbar / Offen

- `npm ci`: fehlgeschlagen wegen Registry/DNS `EAI_AGAIN` und npm-internem `Exit handler never called`.
- `npm run test:smoke`: lokal `playwright: not found`.
- `npm run test:a11y`: lokal `playwright: not found`.
- `npx lhci autorun --config=./lighthouserc.json`: Registry `403 Forbidden` für `lhci`.
- Lighthouse Performance-Scores (3 Läufe + Median) und echte axe-0-Ausgabe müssen in CI belegt werden, sobald Dependencies/Browsers installiert sind; keine Gate-Lockerung vorgenommen.
