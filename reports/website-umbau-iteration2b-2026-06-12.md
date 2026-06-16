# Website-Umbau Iteration 2b — Optik-Paket — 2026-06-12

## Scope

- Keine Änderungen an `.github/workflows/` oder `lighthouserc.json`.
- Keine neuen Sektionen, keine neuen Website-Assets, keine Copy-Änderungen.
- `baseline/visual/` bleibt unverändert.

## Getouchte Dateien

- `kontakt.html`
- `css/site.css`
- `js/site.js`
- `reports/website-umbau-iteration2b-2026-06-12.md`
- `reports/screenshots-iter2b/README.md`

## V1 — `/kontakt` Bild-Verzerrung

Vorher laut Controller-DOM-Messung:

| Bild                   |         Natural | Gerendert | Befund                                                  |
| ---------------------- | --------------: | --------: | ------------------------------------------------------- |
| `hero-fachpartner.png` | 3000×2000 (3:2) |  482×2000 | ca. 84 % Seitenverhältnis-Abweichung, gequetschte Säule |

Fix:

- `.contact-layout` bleibt ein zweispaltiges Grid, aber die Spalten strecken sich gleichmäßig.
- Ein globaler `img`-Reset setzt `max-width: 100%` und `height: auto`; `.contact-image img` rendert gezielt mit `width: 100%`, `height: 100%`, `object-fit: cover`; dadurch wird das Bild zugeschnitten statt verzerrt.
- Mobile-Regel für `≤768px` bleibt einspaltig und begrenzt das Bild auf 280 px Höhe.

Nachher-Erwartung:

| Bild                   |         Natural |                                      Gerendert | Befund                                                   |
| ---------------------- | --------------: | ---------------------------------------------: | -------------------------------------------------------- |
| `hero-fachpartner.png` | 3000×2000 (3:2) | Höhe folgt Formularspalte, `object-fit: cover` | keine Verzerrung; Cropping ist bewusstes Cover-Verhalten |

## V2 — `/preise` unsichtbare Preis-Karten

Vorher laut Controller-Code-/DOM-Befund:

| Element             | Vorher                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `#paCards .pa-card` | 5 DOM-Kinder, aber `opacity: 0`                                                                                                          |
| Ursache             | IntersectionObserver beobachtete leeren Container, unobserved vor `paRenderCards()`, später gerenderte Karten erhielten nie `pa-visible` |

Fix:

- `paRenderCards()` rendert jede Karte direkt mit `pa-visible`.
- Sichtbarkeit hängt damit nicht mehr vom Scroll-Reveal-Timing ab; Observer bleibt nur kosmetisches Progressive Enhancement.

Nachher-Erwartung:

| Element             | Nachher                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `#paCards .pa-card` | Karten erhalten direkt `pa-visible`; Reveal-Animation kann laufen, aber Inhalte bleiben nicht dauerhaft `opacity: 0` |

## V3 — `/dimensionierung` Wizard-Layout Desktop

Fix:

- `.wizard-container` ist auf Desktop auf `max-width: 760px` begrenzt und zentriert.
- `.wizard-slider-group` nutzt die Kartenbreite statt nur einer halben Desktop-Spalte.
- `.wizard-nav` nutzt `flex-start` mit Gap statt `space-between`, damit der Weiter-Knopf in der Achse der Eingaben bleibt.
- Alle vorhandenen 7 `data-step`-Panels nutzen dieselbe Layout-Regel; keine Copy wurde geändert.

## V4 — Responsive-Selbst-Audit

Browserbasierte Screenshots und automatische rendered-size-Messung konnten lokal nicht erzeugt werden, weil `playwright` nicht verfügbar ist und `npm ci`/Registry-Zugriff in dieser Umgebung blockiert. Der Ordner `reports/screenshots-iter2b/` enthält deshalb nur eine README mit dem lokalen Blocker; die CI/Preview-Umgebung muss die 32+ Screenshot-Artefakte liefern.

Statische Bild-Inventur der 7 Seiten + `anfrage.html`:

| Asset                       |   Natural |
| --------------------------- | --------: |
| `hero-fachpartner.png`      | 3000×2000 |
| `hero-beratung.jpg`         | 3000×1999 |
| `hero-service.png`          | 3000×2000 |
| `herowerk-logo-stacked.png` |   607×337 |
| `cha-sanierung.jpg`         | 2500×2500 |
| `cha-neubau-dunkel.jpg`     | 2500×2500 |
| `cha-mfh-saniert.jpg`       | 2500×2500 |

## Lokale Befehlsbelege

- `npm run lint` → grün.
- `node scripts/content-fidelity-check.js` → grün.
- `node scripts/hubspot-schema-check.js` → grün.
- `git diff --check` → grün.
- Lead-only-Grep mit CI-Job-12-Pattern → 0 Treffer.
- `env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u npm_config_http_proxy -u npm_config_https_proxy npm ci --ignore-scripts --fetch-timeout=30000 --fetch-retries=1` → lokal blockiert/hängengeblieben; Prozess beendet.
- `npm run test:a11y -- --project=chromium` → lokal blockiert (`playwright: not found`).
- `npm run test:smoke -- --project=chromium` → lokal blockiert (`playwright: not found`).

## Bestätigung

- Texte 1:1; keine sichtbare Copy-Änderung.
- Keine neuen Sektionen/Website-Assets.
- Gates/Schwellen unangetastet.
