# Website Mehrseiten-Umbau — 2026-06-12

## Scope und Dateien

Getouchte/neue Dateien: `.github/workflows/ci.yml`, `index.html`, `preise.html`, `dimensionierung.html`, `foerderung.html`, `prozess.html`, `ratgeber.html`, `kontakt.html`, `anfrage.html`, `impressum.html`, `datenschutz.html`, `hinweise.html`, `funnel.html`, `css/site.css`, `js/site.js`, `tokens.css`, `vercel.json`, `sitemap.xml`, `baseline/v4-sections.json`, `scripts/fidelity-pages.json`, `tests/a11y.spec.js`, `tests/smoke.spec.js`, `tests/website-additive.spec.js`, `tests/visual/visual-shared.js`, `reports/website-umbau-2026-06-12.md`.

Nicht verändert: `produkte_HERO.json`, Bilder, Funnel-Flow-Logik und HubSpot-Mapping.

## Herkunfts-Mapping je Seite/Sektion

| Zielseite          | Herkunft aus bisheriger `index.html`                      | Status                                                                          |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `/`                | Hero inkl. Preisbox-Teaser, 5 USP-Kacheln und Trust-Strip | 1:1 verschoben, zusätzliche Teaser-Karten als „Neu: Navigation, GF-freigegeben“ |
| `/preise`          | komplette Sektion `#preise`                               | 1:1 verschoben                                                                  |
| `/dimensionierung` | kompletter `#wizard`                                      | 1:1 verschoben                                                                  |
| `/foerderung`      | komplette Sektion `#foerder`                              | 1:1 verschoben                                                                  |
| `/prozess`         | komplette Sektion `#prozess`                              | 1:1 verschoben                                                                  |
| `/ratgeber`        | `#blog` und `#faq`                                        | 1:1 verschoben                                                                  |
| `/kontakt`         | `#contact`                                                | 1:1 verschoben                                                                  |

Nicht in den neuen Seitenschnitt übernommen: bisherige Sektionen `#fv`, `#compare`, `#anfrage`, `#hf`, `#fv-qualify`, weil sie in der ratifizierten Tabelle nicht als Zielinhalt genannt sind.

## Wort-Inventur / Content-Fidelity

- `scripts/fidelity-pages.json` scannt jetzt `index.html`, `preise.html`, `dimensionierung.html`, `foerderung.html`, `prozess.html`, `ratgeber.html`, `kontakt.html`, `anfrage.html`.
- `baseline/v4-sections.json` wurde auf die neue Seitenstruktur generiert.
- Beleg: `node scripts/content-fidelity-check.js` meldet `Content-Fidelity-Check OK (8 Seite(n), Schwelle 30%).`

## URL-Form und SEO

- `vercel.json` setzt `cleanUrls: true`.
- Interne Navigationslinks verwenden die endungslose Form (`/preise`, `/dimensionierung`, `/foerderung`, `/prozess`, `/ratgeber`, `/kontakt`, `/anfrage`).
- Canonicals und `sitemap.xml` verwenden die endungslose Form.
- JSON-LD bleibt nur auf `/` und ist auf `LocalBusiness` beschränkt.
- Lokaler Beleg: `node scripts/seo-basics-check.js http://127.0.0.1:8080` und `node scripts/rich-results-check.js http://127.0.0.1:8080/` liefen grün.

## CI-Umzug

- Lighthouse-CI misst künftig je Theme drei URLs: `/`, `/preise.html`, `/anfrage.html`; `runs: 3` und `collect.numberOfRuns: 3` bleiben aktiv.
- axe deckt `index`, `preise`, `dimensionierung`, `foerderung`, `prozess`, `ratgeber`, `kontakt`, `anfrage` jeweils in Dark und Light ab.
- Smoke-Tests wurden auf echte Unterseiten umgestellt und enthalten einen Navigations-Smoke von `/` auf jede Unterseite und zurück.
- Visual-Tests definieren alle sieben Seiten plus Funnel je Theme; `baseline/visual` ist weiterhin leer und bleibt bis Benjamin-Ratifikation per `/baseline-update-Label` geskippt.

## Light-Theme-Kontrast-Befundliste — Fixes

| Muster                                                                                                  |                      Nachher-Farbe | Hintergrund |     Ratio |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------: | ----------: | --------: |
| Chartreuse-Text auf Weiß (`faq-toggle`, `pa-price-compact`, `pct`, `pz-time`, `blog-card-tag`, `check`) |                          `#5F7200` |   `#FFFFFF` |  `5.39:1` |
| Weiß auf Weiß                                                                                           |                          `#1C2B36` |   `#FFFFFF` | `14.50:1` |
| Schiefer auf Schiefer (`hc-label`)                                                                      | `#1C2B36` auf hellen Light-Flächen |   `#FFFFFF` | `14.50:1` |
| Hellgrau auf Weiß (`pz-expand-hint`, `qs-option`, Labels)                                               |                          `#5A6470` |   `#FFFFFF` |  `6.01:1` |
| Sand auf Chartreuse (`hf-step-num`, `pz-step-num`)                                                      |                          `#1C2B36` |   `#B7D900` |  `8.93:1` |
| `.trust-strip-sub`                                                                                      |                          `#5A6470` |   `#FFFFFF` |  `6.01:1` |

Dark-Theme-Farben wurden nicht abgesenkt; die zusätzlichen Regeln sind auf `[data-theme='light']` bzw. den bestehenden Trust-Strip-Token begrenzt.

## Lighthouse-Beleg

Lighthouse konnte lokal nicht ausgeführt werden, weil die lokale Node-Installation nach `npm ci` unvollständig bleibt und die Browser-/LHCI-Binaries nicht verfügbar sind. Die CI-Konfiguration ist auf Median aus drei Läufen für `/`, `/preise.html`, `/anfrage.html` je Dark/Light umgestellt; Schwellen bleiben unverändert hart für Performance 0,90, Accessibility 0,95 und Best Practices 0,95. SEO bleibt wie ratifiziert kalibriert: echte SEO-Einzelaudits `error`, `is-crawlable` und `categories:seo` `warn`.

## axe-Beleg

Browserbasierte axe-Läufe konnten lokal nicht ausgeführt werden: `npm run test:a11y -- --project=chromium` endet mit `playwright: not found`, weil `npm ci` in dieser Umgebung nicht sauber abgeschlossen hat. Die Testabdeckung für alle Seiten × Themes ist in `tests/a11y.spec.js` umgesetzt und läuft in CI mit `npx playwright install --with-deps`.

## Slop-Selbsttest

- Ring 1 Text: neue Titles/Meta-Descriptions sind sachlich; keine Floskel-Muster wie „nahtlos“, „revolutionär“, „maßgeschneidert“, „Jetzt durchstarten“.
- Ring 2 Design: keine neuen Komponenten, Icons oder Bildmotive; Teaser-Karten verwenden bestehende `pa-card`-Komponente; `css/site.css` und `js/site.js` enthalten ausgelagerten Bestandscode; Farbwerte stammen aus bestehenden Tokens/Fix-Runden-Werten.
- Ring 3 Struktur: keine erfundenen Testimonials, Slider oder Logo-Leisten; jede Seite ist oben auf eine bestehende Herkunftssektion gemappt.

## Baseline-Updates

- Content-Fidelity-Baseline wurde begründet auf die neue Seitenstruktur umgezogen.
- Visual-Baselines wurden nicht still ersetzt: `baseline/visual` enthält weiterhin keine neuen PNGs; der erste vollständige Visual-Run bleibt Benjamin-Ratifikation per `/baseline-update-Label` vorbehalten.

## Offene Punkte

- Lokale Lighthouse-Scores und lokale axe-0-Nachweise fehlen wegen der in dieser Umgebung defekten Browser-/Dependency-Installation. Keine Gate-Schwelle wurde gelockert.
- Der tatsächliche Performance-Nachweis muss im Vercel-Preview-CI-Lauf erfolgen; der DOM wurde durch den Mehrseiten-Schnitt reduziert, indem ausgelagerte Sektionen nicht mehr auf `/` mitgeführt werden.
