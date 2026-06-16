# Website Fix-Runde 2 — 2026-06-12

## Scope

- Branch: `codex/setup-herowerk-website-for-vercel`.
- Commit-Identität: `HeroBenBen <267895549+HeroBenBen@users.noreply.github.com>`.
- Lead-only-Wortlaut, Funnel-Copy, Wordlist-Patch und Vaillant-Vorauswahl wurden nicht textlich verändert.

## W1 — axe color-contrast

- Korrektur ausschließlich über `tokens.css`/Theme-Verhalten: Light-Theme-Akzenttext wird als kontrastfähiges `#5F7200` gerendert, schwacher tertiärer Light-Text wurde auf `#5A6470` gehoben, Dark-Mode-Trust-Hilfstexte nutzen kontrastfähige Grautokens.
- Verifizierte statische Kontrastwerte:
  - `--g300`: `#E5E7EB` auf `#1C2B36` = 11.71:1.
  - `--g400`: `#D1D5DB` auf `#1C2B36` = 9.84:1.
  - `--g500`: `#A0A6AD` auf `#1C2B36` = 5.91:1.
  - Light-Akzenttext: `#5F7200` auf `#F4F1EA` = 4.78:1.
  - Light-Bodytext: `#1C2B36` auf `#F4F1EA` = 12.86:1.
  - Text auf Bernstein: `#1C2B36` auf `#E8A838` = 6.97:1.

## W2 — heading-order auf `/`

- Hero-USP-Überschriften wurden von `h4` auf sequenzielle `h2`-Tags gehoben; der Contact-Erfolgstitel wurde von `h4` auf `h3` gehoben.
- Sichtbarer Text blieb unverändert.

## W3 — PLZ-Input-Härtung

- `#plzInput` ruft `validatePlz(this)` nun zusätzlich im `input`-Handler auf. `keyup` und Enter-Logik bleiben erhalten.
- Damit funktionieren Paste, Playwright `fill()`, Autofill und mobile IME-Eingaben.

## W4 — Theme-Toggle erreichbar

- Ein zusätzlicher Standalone-Theme-Toggle ist im mobilen Header sichtbar, während Desktop den bestehenden Nav-Toggle nutzt.
- Der Smoke-Test bleibt bei `.filter({ visible: true })` und prüft weiterhin den echten `data-theme`-Wechsel.

## W5 — Lighthouse Performance dark

- Render-blockierende Google-Font-Stylesheets und `tokens.css` werden per `rel="preload"`/`onload` nachgeladen; `noscript`-Fallbacks bleiben vorhanden.
- Statische/dynamische Bilder behalten explizite Dimensionen, Lazy Loading below-the-fold und `decoding="async"` aus Fix-Runde 1.
- Lokaler Lighthouse-Score konnte nicht gemessen werden, weil `npm ci` in dieser Umgebung bei Registry-Fetches mit `EAI_AGAIN` scheitert und dadurch Playwright/LHCI-Binaries fehlen.

## W6 — SEO-Gate Preview-noindex

- `categories:seo` ist auf `warn` umverdrahtet, weil Vercel Preview strukturell `x-robots-tag: noindex` setzt und `is-crawlable` die Kategorie-Mathematik verfälscht.
- `is-crawlable` bleibt als `warn` sichtbar.
- Harte SEO-Einzelaudits bleiben `error`: `document-title`, `meta-description`, `http-status-code`, `link-text`, `crawlable-anchors`, `robots-txt`, `image-alt`, `hreflang`, `canonical`, `font-size`.
- Kommentar/Begründung im LHCI-Config-Feld verweist auf `04_Marketing_Vertrieb/Website/WebDev2/_Klaerungen/2026-06-12_SEO-Gate-Preview-noindex-Entscheid_HERO.md`.

### W6 Static-Beleg der 10 harten SEO-Einzelaudits

- `document-title`: pass.
- `meta-description`: pass.
- `http-status-code`: pass (Datei vorhanden; echter Status in CI/Preview).
- `link-text`: pass.
- `crawlable-anchors`: pass.
- `robots-txt`: pass.
- `image-alt`: pass.
- `hreflang`: pass / single-locale not-applicable.
- `canonical`: pass.
- `font-size`: pass.
- `is-crawlable`: warn wegen Vercel-Preview-noindex.

## Lokale Test-Belege

- `node scripts/content-fidelity-check.js`: grün.
- `node scripts/hubspot-schema-check.js`: grün.
- `npm run lint`: grün.
- `python3 -m json.tool lighthouserc.json`: grün.
- `python3 -m json.tool vercel.json`: grün.
- Static SEO-Audit-Beleg via Node-One-Liner: 10 harte Audits pass, `is-crawlable` warn.
- Kontrastwerte via Node-One-Liner: siehe W1.

## Nicht lokal ausführbar / Offen

- `npm ci`: fehlgeschlagen wegen Registry/DNS `EAI_AGAIN` und npm-internem `Exit handler never called`; ohne erfolgreiches `npm ci` fehlen lokale Playwright/LHCI-Binaries.
- `npm run test:smoke`: `playwright: not found`.
- `npm run test:a11y`: `playwright: not found`.
- Lighthouse dark/light: lokal nicht ausführbar ohne LHCI/Browser-Installation. Die Gates wurden nicht gelockert; Performance/A11y/Best-Practices bleiben hart.
