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

// ── Konfigurations-Pruefung: jede Ausnahme braucht einen Grund ───────────────
// Am 28.07.2026 gemessen: eine Ausnahme {"seite":"impressum","breite":320} OHNE
// Feld `grund` liess einen echten Befund von 104 px still verschwinden, das Gate
// meldete PASS und sagte darueber kein Wort. Eine Ausnahme im eigenen Pruefgate
// ist ein Eingriff, kein Detail. Sie wird deshalb mechanisch erzwungen, VOR dem
// ersten Seitenaufruf, und der Lauf bricht ab statt weiterzulaufen.
// Lehre: _Learnings/agenten/feedback_gate_ausnahme_braucht_gemessenen_grund_2026-07-27.md
function pruefeGruende(konfig) {
  const fehlt = [];
  const pruefe = (liste, ort) => {
    (liste ?? []).forEach((e, i) => {
      if (typeof e?.grund !== 'string' || e.grund.trim().length < 10) {
        fehlt.push(`${ort}[${i}] = ${JSON.stringify(e)}`);
      }
    });
  };
  for (const [name, regel] of Object.entries(konfig.regeln ?? {})) {
    pruefe(regel.ausnahmen, `regeln.${name}.ausnahmen`);
    pruefe(regel.festeElemente, `regeln.${name}.festeElemente`);
    pruefe(regel.inhaltsContainer, `regeln.${name}.inhaltsContainer`);
  }
  pruefe(konfig.ignorierteWurzeln, 'ignorierteWurzeln');
  if (fehlt.length) {
    console.error(
      `ABBRUCH: ${fehlt.length} Eintrag/Eintraege in raster-expect.json haben kein Feld "grund" (oder einen zu kurzen).`
    );
    for (const f of fehlt) console.error(`  ${f}`);
    console.error(
      'Eine Ausnahme ohne gemessenen Grund ist eine stille Aufweichung des Gates und wirkt trotzdem.'
    );
    console.error(
      'Jede Ausnahme braucht einen Grund, der die Messung nennt, und eine Einzelsichtung der dadurch verdeckten Faelle.'
    );
    process.exit(2);
  }
}
pruefeGruende(konfig);

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
  // Das Muster "nur fuer Vorleseprogramme sichtbar" (1x1 px, margin -1px,
  // clip-path: inset(50%)) erzeugt ein Rechteck mit NULL sichtbarer Flaeche,
  // das per Definition eine Kante ueberragt. Es traegt kein Raster und darf
  // keinen Befund erzeugen. Gemessen 28.07.2026: `a.skip-link` steht auf jeder
  // Seite bei left -1 px und war der EINZIGE Befund der neuen Regel 6 ueber
  // 10.487 befundfaehige Elemente. Das gehoert in die Sichtbarkeitspruefung,
  // nicht in eine Ausnahmeliste: ausgeschlossen wird die Ursache (keine
  // sichtbare Flaeche), nicht ein Bauteilname.
  const flaechenlos = (cs) =>
    /inset\(\s*50%/.test(cs.clipPath || '') ||
    /^rect\(0(px)?,?\s*0(px)?,?\s*0(px)?,?\s*0(px)?\)$/.test((cs.clip || '').replace(/\s+/g, ' '));
  const sichtbar = (el, cs) =>
    cs.display !== 'none' &&
    cs.visibility !== 'hidden' &&
    parseFloat(cs.opacity) !== 0 &&
    !el.hasAttribute('hidden') &&
    !flaechenlos(cs);
  const klippt = (el) => {
    let a = el.parentElement;
    while (a && a !== document.documentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') return wahl(a);
      a = a.parentElement;
    }
    return null;
  };

  const erg = { r1: [], r2: [], r3: [], r4: [], r5: [], r6: [] };
  // Abdeckung: eine Regel, die nichts prueft, meldet PASS und ist gefaehrlicher
  // als eine abgeschaltete. Deshalb weist das Gate aus, WIE VIELE Elemente je
  // Regel tatsaechlich in den Test gelaufen sind. Fuer Regel 6 zaehlt seit dem
  // 28.07.2026 die BEFUNDFAEHIGE Menge, nicht die Zahl der Seitenaufrufe: die
  // alte Fassung meldete "232 Dokumente geprueft", waehrend sie auf 26 von 29
  // Seiten baulich nichts messen konnte.
  erg.abdeckung = { elemente: 0, sichtbar: 0, r1r3: 0, r4: 0, r5: 0, r6: 0 };
  const alle = [...document.querySelectorAll('body *')];
  erg.abdeckung.elemente = alle.length;

  // "Beidseitig zentriert" heisst: das Stylesheet setzt BEIDE waagerechten
  // Aussenabstaende auf 'auto'. Der berechnete Stil gibt dafuer nur den
  // benutzten Pixelwert her, deshalb werden die Regeln des Stylesheets gelesen
  // und gegen das Element geprueft.
  // KORREKTUR 28.07.2026 zur Streichung vom selben Tag: die damalige Begruendung
  // "auto-Raender sind per CSS-Definition symmetrisch" ist FALSCH. Sie gilt nur,
  // wenn BEIDE Seiten auto sind. `margin-left: auto; margin-right: 0` ist
  // rechtsbuendig und damit absichtlich unsymmetrisch. Die alte Fassung pruefte
  // auf "links ODER rechts auto" und haette deshalb jede absichtliche
  // Rechtsbuendigkeit als Befund gemeldet. Die neue Fassung trennt die Faelle.
  const autoLinks = [];
  const autoRechts = [];
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
        if (r.style.marginLeft === 'auto') autoLinks.push(r.selectorText);
        if (r.style.marginRight === 'auto') autoRechts.push(r.selectorText);
      }
    };
    sammle(regeln);
  }
  const passt = (el, liste) =>
    liste.some((w) => {
      try {
        return el.matches(w);
      } catch {
        return false;
      }
    });
  const beidseitigAuto = (el) => {
    const st = el.getAttribute('style') || '';
    const inlL = /margin(-left|-inline)?\s*:[^;]*auto/.test(st);
    const inlR = /margin(-right|-inline)?\s*:[^;]*auto/.test(st);
    return (inlL || passt(el, autoLinks)) && (inlR || passt(el, autoRechts));
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

      // Regel 5: erklaerter Seitenversatz. Am 28.07.2026 wieder scharf gestellt,
      // nachdem die Streichung mit einer falschen CSS-Aussage begruendet war.
      // Gemessene Deckungsluecke: ein Block, der schmaler ist als die
      // Inhaltsbreite seines Containers, wird von KEINER anderen Regel erfasst.
      // Regel 1 und 3 vergleichen nur gegen die Containerkante, Regel 4 springt
      // unter `mindestAnteilBreite` (0,6) heraus. Nachgestellt am 28.07.2026:
      // ein Block mit unerklaertem Versatz lief durch alle vier Regeln.
      //
      // Ein schmalerer Block darf genau drei Positionen einnehmen: buendig
      // links, buendig rechts oder mittig. Jede andere Lage ist unerklaert.
      // Zusaetzlich gilt: was das Stylesheet BEIDSEITIG auf `auto` setzt, muss
      // mittig stehen; steht es das nicht, hat etwas die Zentrierung geschlagen.
      // Absichtlich rechtsbuendige Bloecke (`margin-left: auto`, `margin-right: 0`)
      // sind KEIN Befund; die alte Fassung meldete genau die als Fehler.
      const r5 = cfg.regeln.r5_seitenversatz;
      if (
        (r5?.aktiv ?? true) &&
        /^(block|flow-root|table)$/.test(cs.display) &&
        /^(block|flow-root)$/.test(pcs.display) &&
        !rollt(pcs.overflowX) &&
        b.width >= (r5?.mindestBlockBreitePx ?? 24)
      ) {
        const inhLinks = pb.left + padL + bordL;
        const inhRechts = pb.right - padR - bordR;
        const inhBreite = inhRechts - inhLinks;
        const tol5 = r5?.maxAbweichungPx ?? 1;
        if (inhBreite >= 8 && inhBreite - b.width > tol5) {
          erg.abdeckung.r5++;
          const luckeLinks = b.left - inhLinks;
          const luckeRechts = inhRechts - b.right;
          const buendigLinks = Math.abs(luckeLinks) <= tol5;
          const buendigRechts = Math.abs(luckeRechts) <= tol5;
          const mittig = Math.abs(luckeLinks - luckeRechts) <= tol5;
          const zentriertErklaert = beidseitigAuto(el);
          if ((zentriertErklaert && !mittig) || (!buendigLinks && !buendigRechts && !mittig)) {
            erg.r5.push({
              block: wahl(el),
              container: wahl(par),
              abstandLinks: rr(luckeLinks),
              abstandRechts: rr(luckeRechts),
              abweichung: rr(Math.abs(luckeLinks - luckeRechts)),
              blockBreite: rr(b.width),
              inhaltsBreite: rr(inhBreite),
              art: zentriertErklaert
                ? 'beidseitig auto, steht aber nicht mittig'
                : 'unerklaerter Versatz',
            });
          }
        }
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
    // Ein Container, der NUR durch seine eigene max-width schmaler ist als der
    // verfuegbare Inhaltsbereich, ist ein bewusst zentrierter Block (Textspalte).
    // Ohne diese Unterscheidung meldete Regel 4 am 27.07.2026 bei 960 px sieben
    // Textseiten mit "sitzt bei 100/860" als Randfehler, obwohl dort schlicht
    // eine 760 px breite Spalte im 912 px breiten Inhaltsbereich zentriert steht.
    // WICHTIG: Die Bedingung greift nur, wenn die max-width KLEINER ist als der
    // verfuegbare Bereich. Ein zu kleiner Seitenrand faellt weiterhin auf, weil
    // der Container dann bis an seine (groessere) max-width laeuft. Nachgewiesen
    // am 27.07.2026: mit dieser Regel meldet das Gate den 20-px-Rand von
    // .detail-final-cta auf sieben Seiten unveraendert.
    // ZWEITE BEDINGUNG, nachgetragen am 27.07.2026 (R14-Befund B3): der Block
    // muss auch WIRKLICH zentriert stehen. Die erste Fassung sprang schon bei
    // ausgeschoepfter max-width heraus und liess damit eine linksbuendig
    // verrutschte Spalte durch (nachgestellt: .section-inner mit margin-left 0
    // steht bei 960 px auf 0/760 statt 100/860, Gate meldete 0 Befunde).
    // Auf Regel 5 zu verweisen half nicht: die ist abgeschaltet.
    const maxBreite = parseFloat(cs.maxWidth);
    const verfuegbar = breite - 2 * rand;
    const tol = cfg.toleranzPx ?? 0.5;
    if (Number.isFinite(maxBreite) && maxBreite < verfuegbar - tol && b.width <= maxBreite + tol) {
      const randLinks = b.left;
      const randRechts = breite - b.right;
      if (Math.abs(randLinks - randRechts) <= tol) return;
    }
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

  // Regel 6: Fensterkanten-Ueberstand.
  // Die Regeln 1 bis 4 vergleichen Kind gegen Container. Ein Element, das
  // ueber den FENSTERrand hinausragt, ohne seinen Container zu verlassen,
  // faellt dort durch. Genau so blieb der Fehler auf datenschutz.html
  // unentdeckt: 344 px Inhalt in 320 px Fenster, alle vier Regeln sauber.
  //
  // NEU GEBAUT am 28.07.2026, weil die erste Fassung nichts gemessen hat.
  // Sie las `documentElement.scrollWidth` gegen `clientWidth`. `css/site.css`
  // setzt aber in Zeile 14 und 48 `overflow-x: clip` auf `html` und `body`,
  // damit ist `scrollWidth` dauerhaft auf `clientWidth` geklemmt. Gemessene
  // Gegenprobe mit demselben 400-px-Block als direktes `body`-Kind: auf
  // `impressum` (ohne `site.css`) 5 Befunde bei 320 bis 414 px, auf `hinweise`
  // (mit `site.css`) 0. Befundfaehig waren nur 3 von 30 Seiten, also 24 von 240
  // Dokumenten, waehrend die Konsole "232 Dokumente geprueft" meldete.
  // Zweite Blindstelle derselben Messgroesse: `scrollWidth` waechst nur nach
  // rechts. Ein Block 176 px links AUS dem Fenster ergab 375 gegen 375, also
  // 0 Ueberschuss, sogar auf einer Seite ohne `site.css`.
  //
  // Deshalb wird jetzt der Ueberstand DIREKT aus den Elementkanten gegen
  // `clientWidth` gebildet, links wie rechts. `overflow-x: clip` auf `html`
  // und `body` aendert daran nichts, denn die Elementkante bleibt messbar.
  // Lehre: _Learnings/web/feedback_gate_misst_geklemmten_wert_2026-07-28.md
  const de = document.documentElement;
  const fensterBreite = de.clientWidth;
  const tol6 = cfg.regeln.r6_fensterkanten_ueberstand?.toleranzPx ?? 0.5;
  // Ein Element, das ZWISCHEN sich und `body` einen Vorfahren mit eigenem
  // waagerechtem Ueberlauf hat, kann die Fensterkante gar nicht erreichen: es
  // wird vorher abgeschnitten oder ist in einem rollbaren Kasten erreichbar.
  // `html` und `body` zaehlen hier ausdruecklich NICHT, denn genau ihr
  // `overflow-x: clip` war die Ursache der Blindheit.
  const zwischenGeklippt = (el) => {
    let a = el.parentElement;
    while (a && a !== document.body && a !== de) {
      if (getComputedStyle(a).overflowX !== 'visible') return wahl(a);
      a = a.parentElement;
    }
    return null;
  };
  for (const el of alle) {
    if (ignoriert(el)) continue;
    const cs = getComputedStyle(el);
    if (!sichtbar(el, cs)) continue;
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    if (zwischenGeklippt(el)) continue;
    erg.abdeckung.r6++;
    const ueberLinks = -b.left;
    const ueberRechts = b.right - fensterBreite;
    if (ueberLinks > tol6 || ueberRechts > tol6) {
      erg.r6.push({
        element: wahl(el),
        ueberstandLinks: rr(Math.max(0, ueberLinks)),
        ueberstandRechts: rr(Math.max(0, ueberRechts)),
        elementBreite: rr(b.width),
        fensterBreite: rr(fensterBreite),
        position: cs.position,
      });
    }
  }
  erg.r6.sort(
    (a, c) =>
      Math.max(c.ueberstandLinks, c.ueberstandRechts) -
      Math.max(a.ueberstandLinks, a.ueberstandRechts)
  );
  // Die Rollbreite bleibt als KONTEXTZAHL im Bericht, aber sie ist kein Urteil
  // mehr. Sie sagt nur noch, ob die Seite zusaetzlich waagerecht rollt.
  erg.rollbreite = {
    scrollWidth: rr(de.scrollWidth),
    clientWidth: rr(de.clientWidth),
    ueberschuss: rr(de.scrollWidth - de.clientWidth),
  };

  return erg;
}

// ── Lauf ────────────────────────────────────────────────────────────────────
const eigenerServer = !process.env.RASTER_BASE_URL;
const { server, url: serverUrl } = eigenerServer
  ? await starteServer()
  : { server: null, url: null };
const BASIS = process.env.RASTER_BASE_URL || serverUrl;

const befunde = []; // { seite, breite, regel, text, daten }
const transportfehler = []; // Ladefehler, die KEINE Layoutbefunde sind
let fehlversuche = 0;
const LIVE = konfig.liveLauf ?? { versuche: 3, wartenMs: 1500, pauseMs: 250 };
const kantenBericht = [];
const rollbreiteBericht = [];
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
      // Wiederholungsversuch und Drosselung, nur gegen eine echte Adresse.
      // Am 28.07.2026 meldete der Live-Lauf 32 Befunde "Seite nicht ladbar",
      // verteilt auf 27 verschiedene Seiten und alle 8 Breiten. 20 Einzelabrufe
      // der betroffenen Adressen ergaben 20 mal HTTP 200. Ursache gemessen,
      // nicht vermutet: IONOS liefert `x-ws-ratelimit-limit: 1000`, der Lauf
      // erzeugt bei 232 Seitenaufrufen ueber 2.000 Anfragen. Es ist also ein
      // Mengenproblem. Ein Wiederholungsversuch allein reicht dagegen nicht,
      // deshalb zusaetzlich eine Pause zwischen den Aufrufen.
      let antwort = null;
      let versuche = 0;
      for (let v = 1; v <= (eigenerServer ? 1 : LIVE.versuche); v++) {
        versuche = v;
        if (!eigenerServer && (v > 1 || LIVE.pauseMs)) {
          await new Promise((r) => setTimeout(r, v > 1 ? LIVE.wartenMs : LIVE.pauseMs));
        }
        antwort = await page.goto(ziel, { waitUntil: 'networkidle' }).catch(() => null);
        if (antwort && antwort.ok()) break;
      }
      // Fehlversuche exakt zaehlen. Die alte Fassung rechnete `versuche - 1` und
      // liess damit den letzten, ebenfalls gescheiterten Versuch unter den Tisch
      // fallen: bei 10 Seiten x 3 vergeblichen Versuchen meldete sie 20 statt 30.
      // Gemessen am 28.07.2026 gegen einen Server, der dauerhaft 503 liefert.
      const erfolgreich = antwort && antwort.ok();
      fehlversuche += erfolgreich ? versuche - 1 : versuche;
      if (!antwort || !antwort.ok()) {
        // Transportfehler wird als eigene Gattung gefuehrt, nicht als Layoutbefund.
        transportfehler.push({
          seite: seite.name,
          breite,
          text: `nach ${versuche} Versuch(en) nicht ladbar: ${ziel} (${antwort ? antwort.status() : 'kein Antwortobjekt'})`,
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
        if (
          konfig.regeln.r5_seitenversatz.ausnahmen.some(
            (a) => f.block.includes(a.block) && f.container.includes(a.container)
          )
        )
          continue;
        befunde.push({
          seite: seite.name,
          breite,
          regel: 'R5',
          text: `${f.block} steht in ${f.container} weder buendig noch mittig (${f.art}): links ${f.abstandLinks} px, rechts ${f.abstandRechts} px, Abweichung ${f.abweichung} px (Block ${f.blockBreite} px in Inhaltsbreite ${f.inhaltsBreite} px)`,
          daten: f,
        });
      }
      // Regel 6: Fensterkanten-Ueberstand.
      const r6 = konfig.regeln.r6_fensterkanten_ueberstand;
      rollbreiteBericht.push({ seite: seite.name, breite, ...r.rollbreite });
      for (const f of r.r6) {
        if (
          (r6.ausnahmen ?? []).some(
            (a) =>
              f.element.includes(a.element) &&
              (a.seite === undefined || a.seite === seite.name) &&
              (a.breite === undefined || a.breite === breite)
          )
        )
          continue;
        const seiten = [];
        if (f.ueberstandLinks > (r6.toleranzPx ?? 0.5))
          seiten.push(`links ${f.ueberstandLinks} px`);
        if (f.ueberstandRechts > (r6.toleranzPx ?? 0.5))
          seiten.push(`rechts ${f.ueberstandRechts} px`);
        befunde.push({
          seite: seite.name,
          breite,
          regel: 'R6',
          text: `${f.element} ragt aus dem Fenster: ${seiten.join(', ')} (Element ${f.elementBreite} px, Fenster ${f.fensterBreite} px, position ${f.position})`,
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
// Lokaler Lauf und Live-Lauf bekommen GETRENNTE Dateinamen. Vorher schrieben
// beide in dieselbe Datei, der zweite Lauf ueberschrieb den ersten, und im PR
// [#83] lag deshalb nur der lokale Bericht, waehrend der Live-Beleg als
// unversionierte Arbeitsbaum-Aenderung verschwand.
const berichtPfad = path.join(
  berichtVerzeichnis,
  eigenerServer ? `${heute}_Raster-Befund_HERO.md` : `${heute}_Raster-Befund-LIVE_HERO.md`
);

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
  ['R1', 'Regel 1: Container-Ueberstand (hart)'],
  ['R3', 'Regel 3: Kind nimmt die Aussenbreite statt der Inhaltsbreite (hart)'],
  ['R4', 'Regel 4: Seitenrand-Treue vollbreiter Container (hart)'],
  ['R5', 'Regel 5: erklaerter Seitenversatz schmalerer Bloecke (hart)'],
  ['R6', 'Regel 6: Fensterkanten-Ueberstand (hart)'],
  ['R2', 'Regel 2: Kanten-Inventar'],
]) {
  const liste = nachRegel(regel);
  zeilen.push(`## ${titel}: ${liste.length === 0 ? 'PASS' : liste.length + ' FAIL'}`);
  zeilen.push('');
  if (liste.length) {
    zeilen.push('| Seite | Breite | Befund |');
    zeilen.push('|---|---|---|');
    for (const b of liste)
      zeilen.push(`| ${b.seite} | ${b.breite} px | ${b.text.replace(/\|/g, '\\|')} |`);
    zeilen.push('');
  }
}
if (!eigenerServer) {
  zeilen.push('## Transportfehler (KEINE Layoutbefunde)');
  zeilen.push('');
  zeilen.push(
    `> Je Seitenaufruf bis zu ${LIVE.versuche} Versuche mit ${LIVE.wartenMs} ms Pause, dazu ${LIVE.pauseMs} ms Drosselung zwischen den Aufrufen. Fehlversuche insgesamt: ${fehlversuche}. Ein Transportfehler ist ein abgerissener Verbindungsversuch unter Last, kein Seitenfehler, und bricht den Lauf nicht als Rasterfehler ab.`
  );
  zeilen.push('');
  if (transportfehler.length) {
    zeilen.push('| Seite | Breite | Befund |');
    zeilen.push('|---|---|---|');
    for (const t of transportfehler) zeilen.push(`| ${t.seite} | ${t.breite} px | ${t.text} |`);
  } else {
    zeilen.push('Keine.');
  }
  zeilen.push('');
}
zeilen.push('## Abdeckung (was die Regeln ueberhaupt angefasst haben)');
zeilen.push('');
zeilen.push(
  '> Eine Regel, die nichts prueft, meldet PASS und ist gefaehrlicher als eine abgeschaltete. Diese Tabelle weist aus, wie viele Elemente je Regel **befundfaehig** waren, also einen Befund haetten erzeugen koennen. Steht in einer Spalte 0, ist die Regel auf dieser Seite wirkungslos. Gezaehlt werden ausdruecklich NICHT die Seitenaufrufe: die erste Fassung von Regel 6 meldete "232 Dokumente geprueft" und konnte auf 26 von 29 Seiten baulich nichts messen.'
);
zeilen.push('');
zeilen.push(
  '| Seite | Breite | Elemente | davon sichtbar | in Regel 1+3 | in Regel 4 | in Regel 5 | in Regel 6 |'
);
zeilen.push('|---|---|---|---|---|---|---|---|');
for (const a of abdeckung)
  zeilen.push(
    `| ${a.seite} | ${a.breite} px | ${a.elemente} | ${a.sichtbar} | ${a.r1r3} | ${a.r4} | ${a.r5} | ${a.r6} |`
  );
zeilen.push('');
zeilen.push('## Waagerechte Rollbreite (Kontextzahl, kein Urteil)');
zeilen.push('');
zeilen.push(
  '> `documentElement.scrollWidth` gegen `clientWidth`. Diese Zahl ist bewusst KEIN Pruefkriterium mehr: `css/site.css` setzt `overflow-x: clip` auf `html` und `body`, damit ist sie auf jeder Seite mit diesem Stylesheet auf `clientWidth` geklemmt. Das Urteil faellt Regel 6 aus den Elementkanten. Steht hier ein Ueberschuss, rollt die Seite zusaetzlich waagerecht.'
);
zeilen.push('');
const rollAuffaellig = rollbreiteBericht.filter((r) => r.ueberschuss > 0.5);
if (rollAuffaellig.length) {
  zeilen.push('| Seite | Breite | scrollWidth | clientWidth | Ueberschuss |');
  zeilen.push('|---|---|---|---|---|');
  for (const r of rollAuffaellig)
    zeilen.push(
      `| ${r.seite} | ${r.breite} px | ${r.scrollWidth} | ${r.clientWidth} | ${r.ueberschuss} px |`
    );
} else {
  zeilen.push(`Kein Ueberschuss auf ${rollbreiteBericht.length} Dokumenten.`);
}
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
  zeilen.push(`**${e.seite}, ${e.breite} px: ${e.kanten.length} verschiedene linke Kanten**`);
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
  `Abdeckung (befundfaehige Elemente): ${summe('sichtbar')} sichtbar, davon ${summe('r1r3')} in Regel 1+3, ${summe('r4')} in Regel 4, ${summe('r5')} in Regel 5, ${summe('r6')} in Regel 6.`
);
if (!eigenerServer) {
  console.log(
    `Live-Lauf: ${transportfehler.length} Transportfehler nach je ${LIVE.versuche} Versuchen, ${fehlversuche} Fehlversuche insgesamt, Pause ${LIVE.pauseMs} ms je Aufruf.`
  );
  if (transportfehler.length)
    for (const t of transportfehler)
      console.log(`  TRANSPORT ${t.seite} ${t.breite} px: ${t.text}`);
}
console.log(`Befunddatei: ${path.relative(wurzel, berichtPfad)}`);

// ── Gueltigkeit des Laufs ───────────────────────────────────────────────────
// Ein Lauf, der nichts gemessen hat, ist UNGUELTIG, nicht gruen. Gemessen am
// 28.07.2026 gegen einen Server, der dauerhaft 503 lieferte: 0 gemessene
// Dokumente, 10 Transportfehler, drei Nullabdeckungs-Warnungen, und trotzdem
// "Raster-Gate PASS" mit Rueckgabewert 0. Ein gruenes Ergebnis ohne Messung ist
// die gefaehrlichste Ausgabe, die ein Pruefwerkzeug erzeugen kann.
// Lehre: _Learnings/agenten/feedback_messung_deren_voraussetzung_still_scheitert_2026-07-28.md
const soll = konfig.seiten.length * konfig.breiten.length;
const anteilTransport = soll ? transportfehler.length / soll : 0;
const maxAnteil = konfig.gueltigkeit?.maxAnteilTransportfehler ?? 0.05;
const ungueltig = [];
if (geprüft === 0) ungueltig.push('kein einziges Dokument gemessen');
if (anteilTransport > maxAnteil)
  ungueltig.push(
    `${transportfehler.length} von ${soll} Aufrufen nicht ladbar (${(anteilTransport * 100).toFixed(1)} Prozent, Grenze ${(maxAnteil * 100).toFixed(1)} Prozent)`
  );
for (const [name, n] of [
  ['Regel 1+3', summe('r1r3')],
  ['Regel 4', summe('r4')],
  ['Regel 5', summe('r5')],
  ['Regel 6', summe('r6')],
])
  if (n === 0) ungueltig.push(`${name} hat kein einziges Element geprueft und belegt damit nichts`);
if (ungueltig.length) {
  console.error('Raster-Gate UNGUELTIG. Der Lauf belegt nichts und gilt nicht als bestanden:');
  for (const u of ungueltig) console.error(`  ${u}`);
  process.exit(4);
}

if (befunde.length && !nurBericht) {
  console.error(
    'Raster-Gate FAIL. Fluchten, Proportionen oder Container-Ueberstand stimmen nicht.'
  );
  process.exit(1);
}
console.log('Raster-Gate PASS.');
