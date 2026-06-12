# Website Fix-Runde 5 — 2026-06-12

## Scope

- Keine Performance-Optimierung.
- Keine Layout- oder Strukturänderung am sichtbaren Seitenaufbau.
- Kein CSP-/`vercel.json`-Touch in dieser Runde.
- Lead-only-Wortlaut und Funnel-Copy unverändert.

## F1 — favicon.ico-404

- Befund adressiert: Root-`favicon.ico` aus dem vorhandenen Logo-Asset `herowerk-logo-stacked.png` als ICO-Container erzeugt.
- Alle Hauptseiten verlinken nun explizit auf `/favicon.ico`.
- Lokaler 200-Beleg: `python3 -m http.server 4173` + `urllib.request.urlopen('http://127.0.0.1:4173/favicon.ico')` ergab `200 image/vnd.microsoft.icon 20610`.

## F2 — `.trust-strip-sub`-Kontrast

- Text/COPY unverändert.
- Korrektur ausschließlich über `tokens.css`: `--trust-strip-sub-color: #5a6470` für Default/Dark und Light; `.trust-strip-sub` nutzt diesen Token mit `!important`, um die ältere Inline-CSS-Farbe `#9A9A9A` zu übersteuern.
- Verifizierter Kontrast für den tatsächlichen weißen Trust-Strip-Hintergrund:
  - Default/Dark: `#5A6470` auf `#FFFFFF` = `6.01:1`.
  - Light: `#5A6470` auf `#FFFFFF` = `6.01:1`.

## F3 — 42 axe-Knoten auf `/?theme=dark`

### Repro-Protokoll

- Ziel laut Auftrag: lokale Messung mit CI-Parametern, Viewport `375×812`, axe via `@axe-core/playwright` auf `/?theme=dark`, danach vollständiger Dump aller Violation-Knoten.
- Lokale Installation wurde versucht:
  - `npm ci` mit vorhandenen Proxy-Env-Werten hing ohne Abschluss.
  - `env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u npm_config_http_proxy -u npm_config_https_proxy npm ci` endete mit `npm error Exit handler never called!`.
- Browserbasierter axe-Lauf wurde deshalb lokal nicht ausführbar:
  - `npm run test:a11y -- --project=chromium` endete mit `sh: 1: playwright: not found`.
- Ergebnis: Die 42 Knoten konnten in dieser Umgebung nicht lokal gedumpt werden. Es wurde **kein** F3-Fix geraten und keine weitere Farblogik für diese 42 Knoten geändert.
- Controller-Hinweis: Da die Vercel-Preview-Toolbar projektseitig deaktiviert wurde, muss der nächste CI-Lauf auf der neuen Preview zeigen, ob die 42 Knoten verschwinden. Falls nicht, ist ein CI-Debug-Dump gegen die Preview-URL erforderlich.

## Lokale Checks

- `npm run lint` — bestanden.
- `node scripts/content-fidelity-check.js` — bestanden.
- `node scripts/hubspot-schema-check.js` — bestanden.
- `git diff --check` — bestanden.
- `python3 -m json.tool vercel.json` — bestanden; keine Dateiänderung an `vercel.json`.
- `python3 -m http.server 4173` + `urllib.request.urlopen('/favicon.ico')` — `200`.

## Offene Punkte

- Browserbasierter axe-Nachweis je URL/Theme ist lokal blockiert, weil Playwright nach fehlgeschlagenem `npm ci` nicht verfügbar ist.
- F3-Knotenliste liegt deshalb nicht vor; bewusst kein Blind-Fix.
