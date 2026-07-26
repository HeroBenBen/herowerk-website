#!/usr/bin/env node
// Fluchten-Pruefgate (GF-Auftrag Benjamin, 26.07.2026).
//
// WARUM ES DIESES SKRIPT GIBT: Am 26.07.2026 waren nach VIER unabhaengigen
// Abnahmen alle Normwerte gruen - Kontrast, Trefferflaechen, seitlicher
// Ueberlauf, verdeckte Inhalte, Byte-Gleichheit. Trotzdem stimmte das Layout
// auf dem Telefon nicht: ein Knopf war 220 px breit in einem Inhaltsbereich
// von 162 px und ragte auf JEDER Breite um 29 px aus seiner Karte. Keine
// Norm war verletzt, deshalb hat es keine Messung gefunden. Norm-Messungen
// sagen nichts ueber Fluchten und Proportionen. Das Raster ist eine eigene
// Pruefung und braucht ein eigenes Gate.
// Lehre: _Learnings/web/feedback_normkonform_ist_nicht_gestalterisch_sauber_fluchten_messen_2026-07-26.md
//
// AUFRUF:  npm run verify:raster
//          npm run verify:raster -- --nur-bericht      (kein Fehlerabbruch)
//          RASTER_BASE_URL=https://www.herowerk.de npm run verify:raster
// Ohne RASTER_BASE_URL startet das Skript einen eigenen statischen Server auf
// dem Arbeitsstand des Repos. Damit prueft es VOR dem Deploy, nicht danach.

import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const wurzel = path.resolve(process.env.RASTER_ROOT || path.join(hier, '..'));
const nurBericht = process.argv.includes('--nur-bericht');

const konfig = JSON.parse(await readFile(path.join(hier, 'raster-expect.json'), 'utf8'));
const TOL = konfig.toleranzPx ?? 0.5;

// ── Bereichspruefung ────────────────────────────────────────────────────────
// Eine physikalisch unmoegliche Messzahl ist ein Fehler im Messskript, nicht
// ein Befund. Lehre feedback_unmoegliche_zahl_ist_ein_messfehler_kein_befund_2026-07-26.
function pruefeBereich(name, wert, min, max) {
  if (!Number.isFinite(wert) || wert < min || wert > max) {
    console.error(
      `ABBRUCH: Messwert "${name}" = ${wert} liegt ausserhalb des zulaessigen Bereichs [${min}, ${max}].`
    );
    console.error(
      'Das ist ein Fehler im Messskript, kein Befund. Rohwert oben, Auswertung abgebrochen.'
    );
    process.exit(3);
  }
}

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
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      let datei = path.join(wurzel, p);
      if (!datei.startsWith(wurzel)) {
        res.writeHead(403).end();
        return;
      }
      if (!existsSync(datei) && existsSync(datei + '.html')) datei += '.html';
      if (!existsSync(datei)) {
        res.writeHead(404).end('nicht gefunden');
        return;
      }
      const inhalt = await readFile(datei);
      res.writeHead(200, {
        'content-type': TYPEN[path.extname(datei)] || 'application/octet-stream',
      });
      res.end(inhalt);
    } catch {
      res.writeHead(500).end();
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

// ── Messung im Browser ──────────────────────────────────────────────────────
// Laeuft im Seitenkontext. Gibt Rohwerte zurueck; bewertet wird ausserhalb.
function messen(cfg) {
  const rr = (n) => Math.round(n * 100) / 100;
  const wahl = (el) => {
    const k =
      typeof el.className === 'string' && el.className.trim()
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + k;
  };
  const ignoriert = (el) => cfg.ignorierteWurzeln.some((i) => el.closest(i.wahl));
  const sichtbar = (el, cs) =>
    cs.display !== 'none' &&
    cs.visibility !== 'hidden' &&
    parseFloat(cs.opacity) !== 0 &&
    !el.hasAttribute('hidden');
  const klippt = (el) => {
    let a = el.parentElement;
    while (a && a !== document.documentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') return wahl(a);
      a = a.parentElement;
    }
    return null;
  };

  const erg = { r1: [], r2: [], r3: [], r4: [], r5: [] };
  // Abdeckung: eine Regel, die nichts prueft, meldet PASS und ist gefaehrlicher
  // als eine abgeschaltete. Deshalb weist das Gate aus, WIE VIELE Elemente je
  // Regel tatsaechlich in den Test gelaufen sind.
  erg.abdeckung = { elemente: 0, sichtbar: 0, r1r3: 0, r5: 0, r4: 0 };
  const alle = [...document.querySelectorAll('body *')];
  erg.abdeckung.elemente = alle.length;

  // "Zentriert" heisst: das Stylesheet setzt den waagerechten Aussenabstand auf
  // 'auto'. Das ist die einzige belastbare Erkennung. Der berechnete Stil gibt
  // dafuer nur den benutzten Pixelwert her, deshalb werden die Regeln des
  // Stylesheets gelesen und gegen das Element geprueft.
  const zentrierWahlen = [];
  for (const bogen of document.styleSheets) {
    let regeln;
    try {
      regeln = bogen.cssRules;
    } catch {
      continue;
    }
    const sammle = (liste) => {
      for (const r of liste) {
        if (r.cssRules) {
          sammle(r.cssRules);
          continue;
        }
        if (!r.selectorText || !r.style) continue;
        const ml = r.style.marginLeft,
          mr = r.style.marginRight;
        const mi = r.style.marginInline || r.style.margin || '';
        if (ml === 'auto' || mr === 'auto' || /\bauto\b/.test(mi))
          zentrierWahlen.push(r.selectorText);
      }
    };
    sammle(regeln);
  }
  const istZentriert = (el) => {
    const st = el.getAttribute('style') || '';
    if (/margin(-left|-right|-inline)?\s*:[^;]*auto/.test(st)) return true;
    return zentrierWahlen.some((w) => {
      try {
        return el.matches(w);
      } catch {
        return false;
      }
    });
  };

  for (const el of alle) {
    if (ignoriert(el)) continue;
    const cs = getComputedStyle(el);
    if (!sichtbar(el, cs)) continue;
    erg.abdeckung.sichtbar++;
    const b = el.getBoundingClientRect();
    if (b.width < 8 || b.height < 4) continue;
    const par = el.parentElement;
    if (!par || par === document.body || par === document.documentElement) continue;
    // SVG-Innenleben ist kein Seitenraster; ein <svg> selbst wird weiter geprueft.
    if (par.namespaceURI === 'http://www.w3.org/2000/svg') continue;
    const pcs = getComputedStyle(par);
    if (!sichtbar(par, pcs)) continue;
    // Waagerechte Bildlaufbereiche (z. B. Karten-Karussell) sind bauartbedingt
    // breiter als ihr Rahmen. Das ist gewollt und kein Rasterfehler.
    const rollt = (v) => v === 'auto' || v === 'scroll';
    // NUR die waagerechte Achse, denn verglichen wird nur waagerecht. CSS zwingt
    // overflow-x auf 'auto', sobald overflow-y 'auto' ist; wer beide Achsen
    // ausnimmt, schaltet die Pruefung fuer jeden senkrecht rollenden Kasten ab.
    if (rollt(pcs.overflowX) && par.scrollWidth > par.clientWidth + 1) continue;
    const pb = par.getBoundingClientRect();
    if (pb.width < 8) continue;

    // Regel 1: Kind ragt ueber die Kante seines Containers
    // 'sticky' steht im normalen Fluss und gehoert ins Raster. 'absolute' und
    // 'fixed' nicht: ihr Bezug ist nicht der Elternkasten.
    if (cs.position === 'static' || cs.position === 'relative' || cs.position === 'sticky') {
      const links = pb.left - b.left;
      const rechts = b.right - pb.right;
      erg.abdeckung.r1r3++;
      if (links > 0.01 || rechts > 0.01) {
        erg.r1.push({
          kind: wahl(el),
          container: wahl(par),
          ueberstandLinks: rr(Math.max(0, links)),
          ueberstandRechts: rr(Math.max(0, rechts)),
          kindBreite: rr(b.width),
          containerBreite: rr(pb.width),
          abgeschnittenVon: klippt(el),
        });
      }

      // Regel 3: Kind nimmt die AUSSENbreite des Containers statt der Inhaltsbreite
      const padL = parseFloat(pcs.paddingLeft) || 0,
        padR = parseFloat(pcs.paddingRight) || 0;
      const bordL = parseFloat(pcs.borderLeftWidth) || 0,
        bordR = parseFloat(pcs.borderRightWidth) || 0;
      const inhalt = pb.width - padL - padR - bordL - bordR;
      if (padL + padR > 0 && Math.abs(b.width - pb.width) <= 0.5 && b.width - inhalt > 0.5) {
        erg.r3.push({
          kind: wahl(el),
          container: wahl(par),
          kindBreite: rr(b.width),
          containerAussen: rr(pb.width),
          containerInhalt: rr(inhalt),
          minWidth: cs.minWidth,
          width: cs.width,
        });
      }

      // Regel 5: zentrierter Block, aber unsymmetrisch.
      // Nur Bloecke. Inline-Elemente (a, strong, span) stehen im Textfluss und
      // haben keine eigene Flucht; sie hier zu messen erzeugt reines Rauschen.
      const gapL = b.left - (pb.left + padL + bordL);
      const gapR = pb.right - padR - bordR - b.right;
      // Geprueft werden GENAU die Bloecke, die das Stylesheet zentriert
      // (waagerechter Aussenabstand 'auto'). Zwei verworfene Fassungen und
      // warum: (a) "Container muss ein reiner Blockcontainer sein" hat die Regel
      // faktisch abgeschaltet, es erreichte KEIN Element den Test, weil hier
      // zentrierte Bloecke in Flex- und Rasterschachteln stehen. (b) "Luecken
      // aehnlich gross" hat 316 Scheinbefunde erzeugt, weil in einer Flex-Reihe
      // jedes Element zufaellig aehnliche Luecken hat, ohne zentriert zu sein.
      const istBlock = /^(block|flex|grid|table|table-cell)$/.test(cs.display);
      const zentriert = istBlock && istZentriert(el);
      if (zentriert) erg.abdeckung.r5++;
      if (zentriert && Math.abs(gapL - gapR) > (cfg.regeln.r5_symmetrie.maxAbweichungPx ?? 1)) {
        erg.r5.push({
          block: wahl(el),
          container: wahl(par),
          abstandLinks: rr(gapL),
          abstandRechts: rr(gapR),
          abweichung: rr(Math.abs(gapL - gapR)),
        });
      }
    }
  }

  // Regel 2: Kanten-Inventar der ersten zwei Bildschirme
  const grenze = window.innerHeight * 2;
  const kanten = new Map();
  for (const el of alle) {
    if (ignoriert(el)) continue;
    const cs = getComputedStyle(el);
    if (!sichtbar(el, cs) || cs.position === 'fixed') continue;
    const b = el.getBoundingClientRect();
    if (b.width < cfg.regeln.r2_kanten_inventar.mindestBlockBreitePx) continue;
    if (b.height < cfg.regeln.r2_kanten_inventar.mindestBlockHoehePx) continue;
    if (b.top > grenze || b.bottom < 0) continue;
    const k = rr(b.left);
    if (!kanten.has(k)) kanten.set(k, { anzahl: 0, beispiele: [] });
    const e = kanten.get(k);
    e.anzahl++;
    if (e.beispiele.length < 3) e.beispiele.push(wahl(el));
  }
  erg.r2 = [...kanten.entries()]
    .sort((a, c) => a[0] - c[0])
    .map(([kante, v]) => ({ kante, anzahl: v.anzahl, beispiele: v.beispiele }));

  // Regel 4: Seitenrand-Treue.
  // Der Seitenrand ist EIN hinterlegter Wert, kein aus dem Markup geratener.
  // Geprueft wird beides: die festen Elemente (Leiste unten) UND die
  // Inhaltscontainer der Seite selbst. Am 26.07. hatte die Seite vier
  // verschiedene Raender: Kopfzeile 24, Startseiten-Banner 20, Rechner 18,
  // feste Leiste 16.
  const rand = cfg.regeln.r4_seitenrand_treue.seitenrandPx;
  const breite = document.documentElement.clientWidth;
  const pruefeRand = (el, art, wahlText) => {
    const cs = getComputedStyle(el);
    if (!sichtbar(el, cs)) return;
    const b = el.getBoundingClientRect();
    if (b.width < 8) return;
    // Nur Container, die die volle Breite beanspruchen sollen. Ein bewusst
    // schmaler, zentrierter Block ist Sache von Regel 5, nicht von Regel 4.
    // Schwelle bewusst als ANTEIL der Fensterbreite. Die frueher benutzte Formel
    // (Breite >= Fenster minus zweimal Sollrand) nahm jeden Container mit
    // GROESSEREM Rand als dem Soll still von der Pruefung aus: je groesser der
    // Fehler, desto sicherer waere er durchgerutscht.
    if (b.width < breite * (cfg.regeln.r4_seitenrand_treue.mindestAnteilBreite ?? 0.6)) return;
    erg.abdeckung.r4++;
    erg.r4.push({
      art,
      wahl: wahlText,
      links: rr(b.left),
      rechts: rr(b.right),
      sollLinks: rand,
      sollRechts: rr(breite - rand),
      abweichungLinks: rr(Math.abs(b.left - rand)),
      abweichungRechts: rr(Math.abs(b.right - (breite - rand))),
    });
  };
  for (const w of cfg.regeln.r4_seitenrand_treue.festeElemente) {
    document.querySelectorAll(w.wahl).forEach((el) => pruefeRand(el, 'festes Element', w.wahl));
  }
  for (const w of cfg.regeln.r4_seitenrand_treue.inhaltsContainer) {
    document.querySelectorAll(w.wahl).forEach((el) => pruefeRand(el, 'Inhaltscontainer', wahl(el)));
  }

  return erg;
}

// ── Lauf ────────────────────────────────────────────────────────────────────
const eigenerServer = !process.env.RASTER_BASE_URL;
const { server, url: serverUrl } = eigenerServer
  ? await starteServer()
  : { server: null, url: null };
const BASIS = process.env.RASTER_BASE_URL || serverUrl;

const befunde = []; // { seite, breite, regel, text, daten }
const kantenBericht = [];
const abdeckung = [];
let geprüft = 0;

const browser = await chromium.launch();
try {
  for (const breite of konfig.breiten) {
    const ctx = await browser.newContext({
      viewport: { width: breite, height: 812 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    for (const seite of konfig.seiten) {
      const ziel = BASIS + seite.pfad;
      const antwort = await page.goto(ziel, { waitUntil: 'networkidle' }).catch(() => null);
      if (!antwort || !antwort.ok()) {
        befunde.push({
          seite: seite.name,
          breite,
          regel: 'LADEN',
          text: `Seite nicht ladbar: ${ziel} (${antwort ? antwort.status() : 'kein Antwortobjekt'})`,
        });
        continue;
      }
      // Einwilligungsdialog datensparsam schliessen; sonst misst jede Trefferprobe
      // dessen Schicht. Lehre feedback_fremd_overlay_wandert_mit_2026-07-26.
      const ablehnen = await page.$('#cmpwelcomebtnno, a#cmpbntnotxt, #cmpbox [id*="btnno"]');
      if (ablehnen) {
        await ablehnen.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(250);

      const r = await page.evaluate(messen, konfig);
      geprüft++;

      for (const f of r.r1) {
        pruefeBereich('ueberstandLinks', f.ueberstandLinks, 0, 10000);
        pruefeBereich('ueberstandRechts', f.ueberstandRechts, 0, 10000);
        if (f.ueberstandLinks <= TOL && f.ueberstandRechts <= TOL) continue;
        if (
          konfig.regeln.r1_container_ueberstand.ausnahmen.some(
            (a) => f.kind.includes(a.kind) && f.container.includes(a.container)
          )
        )
          continue;
        const wie = f.abgeschnittenVon
          ? `abgeschnitten von ${f.abgeschnittenVon}`
          : 'sichtbar heraus';
        befunde.push({
          seite: seite.name,
          breite,
          regel: 'R1',
          text: `${f.kind} ragt aus ${f.container}: links ${f.ueberstandLinks} px, rechts ${f.ueberstandRechts} px (Kind ${f.kindBreite} px in Container ${f.containerBreite} px, ${wie})`,
          daten: f,
        });
      }
      for (const f of r.r3) {
        if (
          konfig.regeln.r3_volle_aussenbreite.ausnahmen.some(
            (a) => f.kind.includes(a.kind) && f.container.includes(a.container)
          )
        )
          continue;
        befunde.push({
          seite: seite.name,
          breite,
          regel: 'R3',
          text: `${f.kind} nimmt die Aussenbreite von ${f.container} (${f.containerAussen} px) statt der Inhaltsbreite (${f.containerInhalt} px); min-width ${f.minWidth}, width ${f.width}`,
          daten: f,
        });
      }
      for (const f of r.r4) {
        if (f.abweichungLinks <= TOL && f.abweichungRechts <= TOL) continue;
        befunde.push({
          seite: seite.name,
          breite,
          regel: 'R4',
          text: `${f.art} ${f.wahl} sitzt bei ${f.links}/${f.rechts}, Soll-Seitenrand ${f.sollLinks}/${f.sollRechts} (Abweichung links ${f.abweichungLinks} px, rechts ${f.abweichungRechts} px)`,
          daten: f,
        });
      }
      for (const f of r.r5) {
        if (konfig.regeln.r5_symmetrie.ausnahmen.some((a) => f.block.includes(a.block))) continue;
        befunde.push({
          seite: seite.name,
          breite,
          regel: 'R5',
          text: `${f.block} steht unsymmetrisch in ${f.container}: links ${f.abstandLinks} px, rechts ${f.abstandRechts} px (Abweichung ${f.abweichung} px)`,
          daten: f,
        });
      }

      kantenBericht.push({ seite: seite.name, breite, kanten: r.r2 });
      abdeckung.push({ seite: seite.name, breite, ...r.abdeckung });
      const erwartet = konfig.regeln.r2_kanten_inventar.erwarteteKanten;
      if (konfig.regeln.r2_kanten_inventar.streng && erwartet.length) {
        for (const k of r.r2) {
          if (!erwartet.includes(k.kante)) {
            befunde.push({
              seite: seite.name,
              breite,
              regel: 'R2',
              text: `Nicht hinterlegte linke Kante ${k.kante} px (${k.anzahl} Bloecke, z. B. ${k.beispiele.join(', ')})`,
              daten: k,
            });
          }
        }
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  if (server) server.close();
}

// ── Befunddatei ─────────────────────────────────────────────────────────────
const heute = new Date().toISOString().slice(0, 10);
const berichtVerzeichnis = path.join(wurzel, 'reports');
await mkdir(berichtVerzeichnis, { recursive: true });
const berichtPfad = path.join(berichtVerzeichnis, `${heute}_Raster-Befund_HERO.md`);

const nachRegel = (r) => befunde.filter((b) => b.regel === r);
const zeilen = [];
zeilen.push(`# Raster-Befund ${heute}`);
zeilen.push('');
zeilen.push(`Quelle: ${eigenerServer ? 'lokaler Arbeitsstand des Repos' : BASIS}`);
zeilen.push(
  `Geprueft: ${konfig.seiten.length} Seiten x ${konfig.breiten.length} Breiten = ${geprüft} Laeufe.`
);
zeilen.push(`Ergebnis: ${befunde.length === 0 ? 'PASS' : 'FAIL'} (${befunde.length} Befunde).`);
zeilen.push('');
for (const [regel, titel] of [
  ['LADEN', 'Ladefehler'],
  ['R1', 'Regel 1: Container-Ueberstand (hart)'],
  ['R3', 'Regel 3: Kind nimmt die Aussenbreite statt der Inhaltsbreite (hart)'],
  ['R4', 'Regel 4: Seitenrand-Treue fester Elemente (hart)'],
  ['R5', 'Regel 5: Symmetrie zentrierter Bloecke (hart)'],
  ['R2', 'Regel 2: Kanten-Inventar'],
]) {
  const liste = nachRegel(regel);
  zeilen.push(`## ${titel} — ${liste.length === 0 ? 'PASS' : liste.length + ' FAIL'}`);
  zeilen.push('');
  if (liste.length) {
    zeilen.push('| Seite | Breite | Befund |');
    zeilen.push('|---|---|---|');
    for (const b of liste)
      zeilen.push(`| ${b.seite} | ${b.breite} px | ${b.text.replace(/\|/g, '\\|')} |`);
    zeilen.push('');
  }
}
zeilen.push('## Abdeckung (was die Regeln ueberhaupt angefasst haben)');
zeilen.push('');
zeilen.push(
  '> Eine Regel, die nichts prueft, meldet PASS und ist gefaehrlicher als eine abgeschaltete. Diese Tabelle weist aus, wie viele Elemente je Regel tatsaechlich in den Test gelaufen sind. Steht in einer Spalte 0, ist die Regel auf dieser Seite wirkungslos.'
);
zeilen.push('');
zeilen.push(
  '| Seite | Breite | Elemente | davon sichtbar | in Regel 1+3 | in Regel 4 | in Regel 5 |'
);
zeilen.push('|---|---|---|---|---|---|---|');
for (const a of abdeckung)
  zeilen.push(
    `| ${a.seite} | ${a.breite} px | ${a.elemente} | ${a.sichtbar} | ${a.r1r3} | ${a.r4} | ${a.r5} |`
  );
zeilen.push('');
zeilen.push('## Kanten-Inventar (Bericht)');
zeilen.push('');
if (!konfig.regeln.r2_kanten_inventar.streng) {
  zeilen.push(
    `> Regel 2 laeuft als Bericht ohne Fehlerabbruch. Grund: ${konfig.regeln.r2_kanten_inventar.grundKeineStrenge}`
  );
  zeilen.push('');
}
for (const e of kantenBericht) {
  zeilen.push(`**${e.seite}, ${e.breite} px — ${e.kanten.length} verschiedene linke Kanten**`);
  zeilen.push('');
  zeilen.push('| Kante | Bloecke | Beispiele |');
  zeilen.push('|---|---|---|');
  for (const k of e.kanten)
    zeilen.push(`| ${k.kante} px | ${k.anzahl} | ${k.beispiele.join(', ')} |`);
  zeilen.push('');
}
await writeFile(berichtPfad, zeilen.join('\n'), 'utf8');

// ── Konsole + Rueckgabewert ─────────────────────────────────────────────────
const gruppiert = new Map();
for (const b of befunde) {
  const k = `${b.regel} | ${b.text.split(':')[0]}`;
  gruppiert.set(k, (gruppiert.get(k) || 0) + 1);
}
console.log(
  `Raster-Gate: ${konfig.seiten.length} Seiten x ${konfig.breiten.length} Breiten, ${befunde.length} Befunde.`
);
for (const [k, n] of [...gruppiert.entries()].sort((a, c) => c[1] - a[1]))
  console.log(`  ${n}x  ${k}`);
const summe = (k) => abdeckung.reduce((a, b) => a + b[k], 0);
console.log(
  `Abdeckung: ${summe('sichtbar')} sichtbare Elemente, davon ${summe('r1r3')} in Regel 1+3, ${summe('r4')} in Regel 4, ${summe('r5')} in Regel 5.`
);
if (summe('r5') === 0)
  console.log(
    '  WARNUNG: Regel 5 hat kein einziges Element geprueft. Eine Regel ohne Pruefgegenstand meldet PASS, ohne etwas zu belegen.'
  );
console.log(`Befunddatei: ${path.relative(wurzel, berichtPfad)}`);

if (befunde.length && !nurBericht) {
  console.error(
    'Raster-Gate FAIL. Fluchten, Proportionen oder Container-Ueberstand stimmen nicht.'
  );
  process.exit(1);
}
console.log('Raster-Gate PASS.');
