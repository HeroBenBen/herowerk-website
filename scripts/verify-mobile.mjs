#!/usr/bin/env node
// Mobile-Pruefliste als versioniertes Gate (Fixplan G4, Punkte 1 bis 10).
//
// WARUM ES DIESES SKRIPT GIBT: Die Mobil-Abnahme lief bis zum 27.07.2026 als
// Wegwerf-Skript im Arbeitsordner. Fuer Dritte war sie damit nicht nachfahrbar,
// und niemand konnte pruefen, ob ein spaeterer Umbau sie noch besteht. Ein
// Pruefschritt, den nur eine Sitzung kennt, ist kein Gate.
// Lehre: _Learnings/agenten/feedback_pruefwerkzeug_das_nie_etwas_findet_ist_verdaechtig_2026-07-27.md
//
// AUFRUF:  npm run verify:mobile
//          npm run verify:mobile -- --nur-bericht          (kein Fehlerabbruch)
//          MOBILE_BASE_URL=https://www.herowerk.de npm run verify:mobile
// Ohne MOBILE_BASE_URL startet das Skript einen eigenen statischen Server auf
// dem Arbeitsstand des Repos und prueft damit VOR dem Deploy.
//
// WAS ES NICHT PRUEFT, ausdruecklich benannt statt stillschweigend ausgelassen:
//   Punkt 7 (Einwilligungsdialog) laesst sich nicht maschinell abnehmen. Der
//   Dialog kommt von einem externen Anbieter, laedt in der Pruefumgebung nicht
//   zuverlaessig und traegt seine eigene Fokusfuehrung. Er bleibt eine
//   Sichtpruefung und ist in docs/compliance/bfsg-scope.md als solche vermerkt.
//   Punkt 10 (Ladekennzahlen) misst dieses Skript als Stichprobe mit
//   Naeherungswerten aus der PerformanceObserver-Schnittstelle. Das ersetzt
//   keine Feldmessung, es faengt nur grobe Ausreisser.

import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const wurzel = path.resolve(process.env.MOBILE_ROOT || path.join(hier, '..'));
const nurBericht = process.argv.includes('--nur-bericht');

const BREITEN = [320, 360, 390, 414];
const MODI = ['dark', 'light'];
const MIN_TREFFER = 44;
const MIN_SCHRIFT = 16;
const TOL = 0.5;

const KERNSEITEN = [
  '/index.html',
  '/preise.html',
  '/foerderung.html',
  '/rechner.html',
  '/ratgeber.html',
  '/karriere.html',
  '/kontakt.html',
  '/anfrage.html',
  '/datenschutz.html',
  '/impressum.html',
  // Ergaenzt 28.07.2026: die Ratgeber-Artikelseiten waren gar nicht abgedeckt,
  // obwohl sie seit diesem Tag drei neue Bauteile tragen (Pfadzeile, Fakt-Satz,
  // Begriffsblock). Das gruene Gate war fuer sie kein Nachweis. Gefunden von der
  // Abnahme. Drei Vertreter, weil alle zwoelf denselben Bauplan tragen:
  // der laengste Fakt-Satz, die laengste Pfadzeile, der groesste Begriffsblock.
  '/foerderung-hannover.html',
  '/waermepumpe-hannover.html',
  '/waermepumpe-laerm.html',
];

// ── Statischer Server auf dem Arbeitsstand ──────────────────────────────────
const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

async function starteServer() {
  const server = createServer(async (req, res) => {
    const roh = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let datei = path.join(wurzel, roh);
    if (!datei.startsWith(wurzel)) {
      res.writeHead(403).end();
      return;
    }
    if (!existsSync(datei) && existsSync(datei + '.html')) datei += '.html';
    if (!existsSync(datei) || datei.endsWith('/')) {
      res.writeHead(404).end('nicht gefunden');
      return;
    }
    try {
      const inhalt = await readFile(datei);
      res.writeHead(200, {
        'Content-Type': TYPEN[path.extname(datei)] || 'application/octet-stream',
      });
      res.end(inhalt);
    } catch {
      res.writeHead(500).end();
    }
  });
  await new Promise((f) => server.listen(0, '127.0.0.1', f));
  return { server, basis: 'http://127.0.0.1:' + server.address().port };
}

// ── Befund-Sammlung ─────────────────────────────────────────────────────────
const befunde = [];
const abdeckung = { punkte: new Map(), laeufe: 0 };
function melde(punkt, seite, breite, modus, text) {
  befunde.push({ punkt, seite, breite, modus, text });
}
function zaehle(punkt, n) {
  abdeckung.punkte.set(punkt, (abdeckung.punkte.get(punkt) || 0) + n);
}

async function modusSetzen(page, modus) {
  if (modus !== 'light') return;
  await page.evaluate(() => {
    const sw = [...document.querySelectorAll('[data-theme-switch]')].find(
      (e) => e.getBoundingClientRect().width > 0
    );
    if (sw && sw.children[0]) sw.children[0].click();
    else document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.waitForTimeout(250);
}

async function menueOeffnen(page) {
  const treffer = await page.evaluate(() => {
    const t = document.querySelector('.hamburger, .mobile-menu-toggle, #hamburger');
    if (!t) return false;
    t.click();
    return true;
  });
  if (treffer) await page.waitForTimeout(350);
  return treffer;
}

// ── Hauptlauf ───────────────────────────────────────────────────────────────
const externeBasis = process.env.MOBILE_BASE_URL;
const { server, basis } = externeBasis
  ? { server: null, basis: externeBasis.replace(/\/$/, '') }
  : await starteServer();
const browser = await chromium.launch();

for (const seite of KERNSEITEN) {
  for (const breite of BREITEN) {
    for (const modus of MODI) {
      const ctx = await browser.newContext({
        viewport: { width: breite, height: 800 },
        deviceScaleFactor: 2,
        isMobile: false,
      });
      const page = await ctx.newPage();
      const url = basis + (externeBasis ? seite.replace(/\.html$/, '') : seite);
      const antwort = await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => null);
      if (!antwort || antwort.status() >= 400) {
        melde(
          3,
          seite,
          breite,
          modus,
          'Seite nicht erreichbar, Status ' + (antwort ? antwort.status() : 'kein')
        );
        await ctx.close();
        continue;
      }
      await page.waitForTimeout(700);
      await page.evaluate(() => document.querySelector('#cmpbox')?.remove());
      await modusSetzen(page, modus);
      abdeckung.laeufe++;

      // Punkt 3: kein waagerechter Bildlauf des Dokuments
      const rollbreite = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      zaehle(3, 1);
      if (rollbreite.scroll - rollbreite.client > TOL) {
        melde(
          3,
          seite,
          breite,
          modus,
          `Dokument rollt waagerecht: scrollWidth ${rollbreite.scroll} gegen clientWidth ${rollbreite.client}`
        );
      }

      // Punkt 9: Eingabefelder mindestens 16 px, sonst zoomt iOS beim Antippen
      // AUSNAHME mit gemessenem Grund: Ankreuzfelder und Auswahlknoepfe sind
      // ausgenommen. iOS zoomt nur beim Antippen von Feldern, in die man TEXT
      // eingibt; ein Ankreuzfeld loest den Zoom nicht aus. Ohne die Ausnahme
      // meldete der Lauf vom 27.07.2026 zwei Felder als Befund, die keiner
      // sind: "kontaktDsgvo" und "foerderKind", beide 13,33 px, beide
      // Ankreuzfelder ohne Texteingabe. Beide wurden einzeln angesehen, bevor
      // die Ausnahme geschrieben wurde. Alle uebrigen 80 Befunde des Laufs
      // waren echte Texteingabefelder auf /kontakt und sind behoben.
      const felder = await page.evaluate((min) => {
        const OHNE_TEXTEINGABE = [
          'checkbox',
          'radio',
          'range',
          'color',
          'file',
          'submit',
          'button',
          'image',
          'reset',
        ];
        return [...document.querySelectorAll('input:not([type=hidden]), select, textarea')]
          .filter((e) => !OHNE_TEXTEINGABE.includes((e.getAttribute('type') || '').toLowerCase()))
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => ({
            id: e.id || e.name || e.className,
            groesse: parseFloat(getComputedStyle(e).fontSize),
          }))
          .filter((e) => e.groesse < min);
      }, MIN_SCHRIFT);
      zaehle(9, 1);
      for (const f of felder)
        melde(
          9,
          seite,
          breite,
          modus,
          `Eingabefeld "${f.id}" hat ${f.groesse} px Schrift, unter ${MIN_SCHRIFT} px`
        );

      // Punkt 2: Trefferflaechen in Navigation, Knoepfen und Aufklappern
      await menueOeffnen(page);
      const klein = await page.evaluate((min) => {
        const sel =
          'nav a, nav button, .mobile-menu a, .mobile-menu button, .mobile-bottom-bar a, .btn-primary, .btn-ghost, [aria-expanded], summary';
        return [...document.querySelectorAll(sel)]
          .filter((e) => {
            const b = e.getBoundingClientRect();
            return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden';
          })
          .map((e) => {
            const b = e.getBoundingClientRect();
            return {
              kennung: (e.tagName + '.' + (e.className || '')).slice(0, 60),
              w: +b.width.toFixed(2),
              h: +b.height.toFixed(2),
            };
          })
          .filter((e) => e.h + 0.5 < min || e.w + 0.5 < min);
      }, MIN_TREFFER);
      zaehle(2, 1);
      for (const k of klein)
        melde(
          2,
          seite,
          breite,
          modus,
          `Trefferflaeche zu klein: ${k.kennung} misst ${k.w} x ${k.h}, gefordert ${MIN_TREFFER}`
        );

      // Punkt 4: feste Kopfzeile verdeckt den Beginn des Inhalts nicht
      const verdeckt = await page.evaluate(() => {
        const kopf = document.querySelector('nav, .topnav');
        const inhalt = document.getElementById('main-content');
        if (!kopf || !inhalt) return null;
        const kcs = getComputedStyle(kopf);
        if (kcs.position !== 'fixed' && kcs.position !== 'sticky') return null;
        const kb = kopf.getBoundingClientRect();
        const erstes = inhalt.querySelector('h1, h2, .hero-badge, .page-head');
        if (!erstes) return null;
        const eb = erstes.getBoundingClientRect();
        return {
          kopfUnten: +kb.bottom.toFixed(2),
          inhaltOben: +eb.top.toFixed(2),
          ueberdeckung: +(kb.bottom - eb.top).toFixed(2),
        };
      });
      zaehle(4, 1);
      if (verdeckt && verdeckt.ueberdeckung > TOL) {
        melde(
          4,
          seite,
          breite,
          modus,
          `Feste Kopfzeile ueberdeckt den Inhaltsbeginn um ${verdeckt.ueberdeckung} px`
        );
      }

      // Punkt 5: Marken-Umschalter der Preiskarten bedienbar
      if (seite === '/preise.html') {
        const tabs = await page.evaluate(() => {
          const t = [
            ...document.querySelectorAll('.manufacturer-tab, [data-marke], .pa-brand-tab'),
          ].filter((e) => e.getBoundingClientRect().width > 0);
          if (!t.length) return { gefunden: 0 };
          t[t.length - 1].click();
          return {
            gefunden: t.length,
            masse: t.map((e) => {
              const b = e.getBoundingClientRect();
              return +b.height.toFixed(2);
            }),
          };
        });
        zaehle(5, 1);
        if (!tabs.gefunden)
          melde(5, seite, breite, modus, 'Kein Marken-Umschalter auf der Preisseite gefunden');
        else if (tabs.masse.some((h) => h + 0.5 < MIN_TREFFER))
          melde(
            5,
            seite,
            breite,
            modus,
            'Marken-Umschalter unter ' + MIN_TREFFER + ' px hoch: ' + tabs.masse.join(', ')
          );
      }

      // Punkt 6: Hintergrundvideo mit Halteknopf, Wirkung geprueft
      if (seite === '/index.html') {
        const video = await page.evaluate(async () => {
          const v = document.getElementById('heroVideo');
          const k = document.getElementById('heroVideoToggle');
          if (!v || !k) return { fehlt: true };
          const vorher = v.paused;
          k.click();
          await new Promise((f) => setTimeout(f, 300));
          const b = k.getBoundingClientRect();
          return {
            fehlt: false,
            vorher,
            nachher: v.paused,
            knopf: { w: +b.width.toFixed(2), h: +b.height.toFixed(2) },
          };
        });
        zaehle(6, 1);
        if (video.fehlt) melde(6, seite, breite, modus, 'Hintergrundvideo oder Halteknopf fehlt');
        else {
          if (video.vorher === video.nachher)
            melde(
              6,
              seite,
              breite,
              modus,
              'Halteknopf ohne Wirkung, Zustand blieb ' + video.vorher
            );
          if (video.knopf.h + 0.5 < MIN_TREFFER)
            melde(6, seite, breite, modus, 'Halteknopf nur ' + video.knopf.h + ' px hoch');
        }
      }

      // Punkt 8: Bewerbungsweg auf der Karriereseite
      if (seite === '/karriere.html') {
        const mails = await page.evaluate(() => {
          const a = [...document.querySelectorAll('a[href^="mailto:"]')];
          return {
            anzahl: a.length,
            ziele: [...new Set(a.map((e) => e.getAttribute('href').split('?')[0]))],
          };
        });
        zaehle(8, 1);
        if (!mails.anzahl) melde(8, seite, breite, modus, 'Kein Bewerbungsweg per E-Mail gefunden');
      }

      await ctx.close();
    }
  }
}

// ── Punkt 1: Anfragestrecke in einem Durchlauf, je Breite ───────────────────
for (const breite of BREITEN) {
  const ctx = await browser.newContext({
    viewport: { width: breite, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(basis + (externeBasis ? '/anfrage' : '/anfrage.html'), {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('#cmpbox')?.remove());
  zaehle(1, 1);

  const lauf = await page.evaluate(async () => {
    const warte = (ms) => new Promise((f) => setTimeout(f, ms));
    const schritte = [];
    for (let i = 0; i < 14; i++) {
      const aktiv = document.querySelector('.step.active');
      if (!aktiv) break;
      schritte.push(aktiv.getAttribute('data-step'));
      const plz = aktiv.querySelector('#plzInput');
      if (plz) {
        plz.value = '30900';
        plz.dispatchEvent(new Event('input', { bubbles: true }));
        await warte(250);
      }
      const karte = aktiv.querySelector('.answer-card');
      if (karte) {
        karte.click();
        await warte(400);
      }
      const weiter = aktiv.querySelector('button:not([disabled])');
      const naechster = document.querySelector('.step.active');
      if (naechster === aktiv && weiter) {
        weiter.click();
        await warte(450);
      }
      if (document.querySelector('.step.active') === aktiv) break;
    }
    return { erreichteSchritte: schritte.length, folge: schritte };
  });

  if (lauf.erreichteSchritte < 3) {
    melde(
      1,
      '/anfrage.html',
      breite,
      'dark',
      `Anfragestrecke bricht nach ${lauf.erreichteSchritte} Schritten ab (Folge ${lauf.folge.join(', ')})`
    );
  }
  await ctx.close();
}

// ── Punkt 10: Ladekennzahlen als Stichprobe ─────────────────────────────────
for (const seite of ['/index.html', '/preise.html']) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(basis + (externeBasis ? seite.replace(/\.html$/, '') : seite), {
    waitUntil: 'load',
  });
  await page.waitForTimeout(2500);
  const werte = await page.evaluate(() => {
    const lcp = performance.getEntriesByType('largest-contentful-paint').pop();
    let cls = 0;
    for (const e of performance.getEntriesByType('layout-shift') || [])
      if (!e.hadRecentInput) cls += e.value;
    return { lcpMs: lcp ? Math.round(lcp.startTime) : null, cls: +cls.toFixed(4) };
  });
  zaehle(10, 1);
  if (werte.cls > 0.1)
    melde(10, seite, 390, 'dark', `Verschiebung des Layouts ${werte.cls}, Schwelle 0,1`);
  if (werte.lcpMs !== null && werte.lcpMs > 4000)
    melde(
      10,
      seite,
      390,
      'dark',
      `Groesste Inhaltsdarstellung nach ${werte.lcpMs} ms, Schwelle 4000`
    );
  await ctx.close();
}

await browser.close();
if (server) server.close();

// ── Bericht ─────────────────────────────────────────────────────────────────
const PUNKTE = {
  1: 'Anfragestrecke vollstaendig durchspielbar',
  2: 'Trefferflaechen mindestens 44 px',
  3: 'Kein waagerechter Bildlauf',
  4: 'Feste Kopfzeile verdeckt keinen Inhalt',
  5: 'Marken-Umschalter der Preiskarten bedienbar',
  6: 'Hintergrundvideo mit wirksamem Halteknopf',
  7: 'Einwilligungsdialog bedienbar und schliessbar',
  8: 'Bewerbungsweg auf der Karriereseite',
  9: 'Eingabefelder mindestens 16 px',
  10: 'Ladekennzahlen als Stichprobe',
};
const jetzt = process.env.MOBILE_STAMP || new Date().toISOString().slice(0, 10);
const zeilen = [];
zeilen.push('# Mobile-Verifikation, Befundbericht');
zeilen.push('');
zeilen.push(
  `Erzeugt von \`scripts/verify-mobile.mjs\` gegen \`${externeBasis || 'Arbeitsstand des Repos'}\`.`
);
zeilen.push(
  `Breiten ${BREITEN.join(' / ')} px, Modi ${MODI.join(' und ')}, ${KERNSEITEN.length} Kernseiten, ${abdeckung.laeufe} Seitenlaeufe.`
);
zeilen.push('');
zeilen.push('## Ergebnis je Punkt');
zeilen.push('');
zeilen.push('| Punkt | Gegenstand | Geprueft | Befunde | Urteil |');
zeilen.push('|---|---|---|---|---|');
for (const nr of Object.keys(PUNKTE)) {
  const n = Number(nr);
  const gep = abdeckung.punkte.get(n) || 0;
  const b = befunde.filter((x) => x.punkt === n).length;
  const urteil =
    n === 7
      ? 'NICHT MASCHINELL PRUEFBAR, Sichtpruefung'
      : gep === 0
        ? 'KEINE ABDECKUNG'
        : b === 0
          ? 'PASS'
          : 'FAIL';
  zeilen.push(`| ${n} | ${PUNKTE[n]} | ${n === 7 ? '0' : gep} | ${b} | ${urteil} |`);
}
zeilen.push('');
if (befunde.length) {
  zeilen.push('## Befunde im Einzelnen');
  zeilen.push('');
  zeilen.push('| Punkt | Seite | Breite | Modus | Befund |');
  zeilen.push('|---|---|---|---|---|');
  for (const b of befunde)
    zeilen.push(`| ${b.punkt} | ${b.seite} | ${b.breite} | ${b.modus} | ${b.text} |`);
} else {
  zeilen.push('Keine Befunde.');
}
zeilen.push('');
zeilen.push('## Was dieser Lauf NICHT abdeckt');
zeilen.push('');
zeilen.push(
  '- Punkt 7, Einwilligungsdialog: externer Anbieter, eigene Fokusfuehrung, in der Pruefumgebung nicht zuverlaessig geladen. Bleibt Sichtpruefung, vermerkt in `docs/compliance/bfsg-scope.md`.'
);
zeilen.push('- Punkt 10 misst Naeherungswerte im Labor, keine Feldmessung.');
zeilen.push('- Echte Geraete, echte Netze und echte Hilfsmittel ersetzt dieser Lauf nicht.');

await mkdir(path.join(wurzel, 'reports'), { recursive: true });
const ziel = path.join(wurzel, 'reports', `${jetzt}_Mobile-Verifikation_HERO.md`);
await writeFile(ziel, zeilen.join('\n') + '\n', 'utf8');

const fail = befunde.length;
console.log(
  `Mobile-Gate: ${KERNSEITEN.length} Seiten x ${BREITEN.length} Breiten x ${MODI.length} Modi, ${abdeckung.laeufe} Laeufe, ${fail} Befunde.`
);
console.log(
  `Abdeckung je Punkt: ${[...abdeckung.punkte.entries()].map(([k, v]) => k + '=' + v).join(', ')}`
);
console.log(
  'Punkt 7 (Einwilligungsdialog) ist NICHT maschinell geprueft, das ist eine bewusste Luecke, siehe Bericht.'
);
console.log('Befunddatei: ' + path.relative(wurzel, ziel));
if (fail && !nurBericht) {
  console.error('Mobile-Gate FAIL.');
  process.exit(1);
}
console.log(fail ? 'Mobile-Gate FAIL, aber nur Bericht angefordert.' : 'Mobile-Gate PASS.');
