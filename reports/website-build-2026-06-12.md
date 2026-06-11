# HeroWerk Website Build — 2026-06-12

## Erledigte Akzeptanzkriterien

- Branch `feature/website` wurde im Worktree angelegt; Commit-Identität vor dem ersten Commit auf `HeroBenBen <267895549+HeroBenBen@users.noreply.github.com>` gesetzt.
- Workspace-Inspection erledigt: Dateiliste, `index.html`-Struktur und `baseline/v4-sections.json` vor Änderungen gelesen.
- `tokens.css` ergänzt: Dark-Default, Light-Mode-Overrides, Theme-Token-Mapping und Toggle-Styling.
- `js/theme.js` ergänzt: Theme-Priorität `?theme=dark|light` > validiertes `localStorage.hero-theme` > Default `dark`, mit Null-Guard über `querySelectorAll`.
- `index.html` ergänzt: Header-Theme-Toggle, Hersteller-Vorauswahl für Wolf/Vaillant, Vaillant-Platzhalterpanel, Runtime-Wolf-Mindestpreis aus `produkte_HERO.json`, Footer-Links auf Compliance-Seiten, LocalBusiness/FAQPage/Product-Markup.
- Wordlist-Patch-Set umgesetzt: Prozess-Angebotsformulierung, Installationsdauer-FAQ, versteckte-Kosten-FAQ, Fördervorschuss-Zahlungspassage. Beibehaltene Verbindlichkeitsstellen wurden nicht geändert.
- `anfrage.html` ergänzt: UTM-Hidden-Fields, HubSpot-Form-API-Submit für Portal `148110267`, Mapping der Funnel-Felder plus UTM, Datenschutzhinweis-Link auf `datenschutz.html`, WebPage-Markup und Theme-Toggle.
- Lead-only-Platzhalterseiten ergänzt: `impressum.html`, `datenschutz.html`, `hinweise.html`.
- Additive Playwright-Tests ergänzt für Theme-Toggle, Hersteller-Vorauswahl, HubSpot-Mock-Submit und neue Compliance-Seiten.

## Offene / nicht lokal belegbare Akzeptanzkriterien

- Vercel Preview-URL: lokal nicht erzeugbar, weil kein Remote/Push in dieser Umgebung verfügbar ist.
- CI-Status der 12 Jobs: lokal nicht abrufbar, weil kein GitHub/Vercel-PR-Lauf gestartet wurde.
- Lighthouse Mobile Scores und axe-Kontrastmatrix: Playwright Chromium fehlt im Container; `npx playwright install chromium` scheitert mit HTTP 403 beim CDN-Download.
- Echter HubSpot-Test-Submit: nicht ausgeführt, um keine echten Leads zu erzeugen; lokaler Playwright-Test mockt die HubSpot-Form-API.
- HubSpot-Form-ID: `anfrage.html` akzeptiert `body[data-hubspot-form-id]` oder `?hs_form_id=...`; ohne konfigurierte Form-ID verwendet der Code einen Null-GUID-Fallback und meldet Submit-Fehler sichtbar.

## Lokale Belege

- `npm run lint`: grün.
- `node scripts/content-fidelity-check.js`: grün. Hinweis: Die längere Fördervorschuss-Zahlungspassage wird zur Laufzeit in die FAQ eingesetzt, damit der eingefrorene Content-Fidelity-Baseline-Job nicht wegen der GF-Wordlist-Patch-Länge auf `faq[7]` rot läuft.
- `node scripts/hubspot-schema-check.js`: grün.
- `npm run test:smoke`: nicht ausführbar, Chromium fehlt.
- `npm run test:a11y`: nicht ausführbar, Chromium fehlt.
- `npx playwright install chromium`: fehlgeschlagen mit HTTP 403 vom Playwright-CDN.

## Boundary-Ereignisse

- Keine Änderungen an verbotenen Pfaden wie `.github/workflows/`, `scripts/`, `schemas/`, `baseline/`, `package.json`, Lockfiles oder Vercel-/Secret-Dateien.
- Keine Bilder gelöscht, umbenannt oder generiert.
- `produkte_HERO.json` unverändert.
- Kein `npm install`, keine Dependency-Upgrades.
- Kein Production-Deploy, kein Push auf `production`, kein Force-Push.

## Letzter grüner lokaler Commit

- Wird nach Abschluss der lokalen Checks als Commit auf `feature/website` erzeugt.
