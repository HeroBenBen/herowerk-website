// @einheitenknopf: Einheitenknoepfe im Verbrauchsschritt des Dimensionierungsrechners,
// gemessen am GEMALTEN Bild, in Hell und Dunkel, fuer Gas, Oel und Strom.
//
// ANLASS (GF-Meldung an der Live-Seite, nachgemessen 10.09.2026): Im Schritt "Kennst du
// deinen Jahresverbrauch?" war im Hellmodus der NICHT gewaehlte Einheitenknopf unsichtbar.
// Weisse Schrift, weisser Halbrahmen und weisse Toenung auf weisser Karte, Kontrast 1,00
// fuer Schrift und Rahmen. Wer seinen Verbrauch nur in Kubikmetern kennt, sieht nicht,
// dass er umschalten kann. Die Farben standen an ZWEI Stellen fest fuer den dunklen Grund:
// als Inline-Stil im Markup von dimensionierung.html UND in wzSetActiveBtn (js/site.js),
// das sie bei jedem Umschalten neu schrieb. Wer nur eine Stelle berichtigt, hat nach dem
// ersten Klick den alten Fehler zurueck. Deshalb misst dieser Test beide Zustaende, auch
// nach einem Umschaltklick und nach dem Zurueckschalten.
//
// WARUM AM BILDPUNKT: getComputedStyle hat an dieser Stelle schon einmal gelogen, weil
// Deckkraft und Untergrund mitmischen. Gelesen wird deshalb ein Bildschirmfoto: Flaeche,
// Schrift, Rahmen und Umfeld sind die Farben, die tatsaechlich gemalt wurden. Aus dem
// berechneten Stil kommt nur die Geometrie (Lage und Rahmenstaerke).
//
// SCHWELLEN: Schrift gegen Flaeche 4,5 zu 1 (WCAG 1.4.3), Rahmen gegen das Umfeld 3 zu 1
// (WCAG 1.4.11, die Kante macht den Knopf als Knopf erkennbar), Fokusring gegen das Umfeld
// 3 zu 1. Gewaehlt und nicht gewaehlt muessen sich in Rahmenfarbe UND Flaeche unterscheiden;
// der gewaehlte Knopf traegt Gruen in Schrift und Rahmen. Beim Umschalten darf kein anderes
// Element im Schritt seine Lage oder Groesse aendern (Toleranz 0,5 px). Wie die Texte, die
// sich beim Umschalten unter den Knoepfen mitaendern, dabei neutralisiert werden, steht an
// lageAufnehmen.
//
// AUFRUF:  scripts/start-pruefserver.sh && npm run verify:einheitenknopf
// BILDER:  EINHEIT_BILDER_DIR=/pfad EINHEIT_BILDER_PRAEFIX=nachher npm run verify:einheitenknopf
'use strict';
/* global document, window, Image, Event */
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const SCHWELLE_SCHRIFT = 4.5;
const SCHWELLE_RAHMEN = 3;
const SCHWELLE_FOKUS = 3;
// Abstand im RGB-Raum. Rahmen: gewaehlt Gruen gegen neutralen Rahmen liegt gemessen bei
// weit ueber 100. Flaeche: die Toenungen liegen dunkel wie hell bei rund 25 bis 30; gleiche
// Gestaltung fuer beide Zustaende ergibt 0.
const ABSTAND_RAHMEN = 40;
const ABSTAND_FLAECHE = 10;
// Gruen heisst: Gruenkanal mindestens 60 ueber dem Blaukanal (#b7d900 dunkel, #4f6000 hell).
const GRUEN_UEBERHANG = 60;
const TOL_LAGE = 0.5;

const MODI = ['dark', 'light'];
const BREITEN = [1280, 390];
// Welche Knoepfe je Energietraeger zu sehen sind, steht in wzSyncUnits. Die Liste ist hier
// bewusst fest: misst der Test still weniger Knoepfe als gedacht, soll er rot werden.
const TRAEGER = [
  { name: 'Gas', heizung: 'gas', sichtbar: ['wzUnitKwh', 'wzUnitM3'], start: 'wzUnitM3' },
  { name: 'Oel', heizung: 'oel', sichtbar: ['wzUnitLiter'], start: 'wzUnitLiter' },
  { name: 'Strom', heizung: 'nacht', sichtbar: ['wzUnitKwh'], start: 'wzUnitKwh' },
];

test.describe.configure({ mode: 'parallel' });

/** @param {import('@playwright/test').Page} page */
async function aktiverSchritt(page) {
  return page.evaluate(() => {
    const s = document.querySelector('.wizard-step.active');
    return s ? parseInt(s.getAttribute('data-step'), 10) : null;
  });
}

// Faehrt den Assistenten wie ein Kunde bis zum Verbrauchsschritt. Fallstrick aus der Sonde
// tests/sonden/hinweis-verbrauchseingabe-sonde.mjs: manche Schritte springen nach der Wahl
// von allein weiter (250 ms). Erst abwarten, dann nur bei stehendem Schritt auf Weiter.
/** @param {import('@playwright/test').Page} page @param {string} heizung */
async function zumVerbrauchsschritt(page, heizung) {
  for (let i = 0; i < 40; i++) {
    const schritt = await aktiverSchritt(page);
    if (schritt === 8) return;
    if (schritt === null) throw new Error('Kein aktiver Schritt im Rechner gefunden.');
    await page.evaluate((wunsch) => {
      const s = document.querySelector('.wizard-step.active');
      const opts = [...s.querySelectorAll('.wizard-option')];
      const ziel = opts.find((o) => o.getAttribute('data-value') === wunsch) || opts[0];
      if (ziel) /** @type {HTMLElement} */ (ziel).click();
      const feld = /** @type {HTMLInputElement | null} */ (
        s.querySelector('input[type="text"], input[type="tel"], input[inputmode="numeric"]')
      );
      if (feld && !feld.value) {
        feld.value = '30159';
        feld.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, heizung);
    await page.waitForTimeout(450);
    if ((await aktiverSchritt(page)) !== schritt) continue;
    await page.evaluate(() => {
      const weiter = /** @type {HTMLElement | null} */ (
        document.querySelector('.wizard-step.active .wizard-btn-next')
      );
      if (weiter) weiter.click();
    });
    await page.waitForTimeout(400);
  }
  throw new Error('Verbrauchsschritt nach 40 Schritten nicht erreicht.');
}

// Liest das Bild in einem leeren Nebenblatt aus (dort gilt keine Seiten-CSP) und rechnet
// alle Farben aus Bildpunkten. Koordinaten in Geraetepixeln des Bildschirmfotos.
/**
 * @param {import('@playwright/test').Page} rechenblatt
 * @param {Buffer} bild
 * @param {Array<{id: string, x: number, y: number, w: number, h: number, rahmen: number}>} knoepfe
 */
async function bildAuswerten(rechenblatt, bild, knoepfe) {
  return rechenblatt.evaluate(
    async ({ b64, knoepfe: liste }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const leinwand = document.createElement('canvas');
      leinwand.width = img.naturalWidth;
      leinwand.height = img.naturalHeight;
      const g = leinwand.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, leinwand.width, leinwand.height).data;
      const px = (x, y) => {
        const xx = Math.min(Math.max(Math.round(x), 0), leinwand.width - 1);
        const yy = Math.min(Math.max(Math.round(y), 0), leinwand.height - 1);
        const i = (yy * leinwand.width + xx) * 4;
        return [d[i], d[i + 1], d[i + 2]];
      };
      const lin = (v) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      const lum = (f) => 0.2126 * lin(f[0]) + 0.7152 * lin(f[1]) + 0.0722 * lin(f[2]);
      const kontrast = (a, b) => {
        const la = lum(a);
        const lb = lum(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      };
      const median = (punkte) => {
        const s = [...punkte].sort((a, b) => lum(a) - lum(b));
        return s[Math.floor(s.length / 2)];
      };
      // Punkte entlang der mittleren 60 % aller vier Seiten, a Geraetepixel von der
      // Aussenkante nach innen (a >= 0) oder nach aussen (a < 0). Die Mitte der Seiten
      // meidet die gerundeten Ecken.
      // Innenkante mit ceil/floor: die erste und letzte Bildzeile liegen sicher IM Knopf.
      const kante = (k, a, nurObenUnten) => {
        const x0 = Math.ceil(k.x - 0.01);
        const y0 = Math.ceil(k.y - 0.01);
        const x1 = Math.floor(k.x + k.w + 0.01) - 1;
        const y1 = Math.floor(k.y + k.h + 0.01) - 1;
        const punkte = [];
        for (let x = Math.round(x0 + (x1 - x0) * 0.2); x <= x0 + (x1 - x0) * 0.8; x++) {
          punkte.push(px(x, y0 + a), px(x, y1 - a));
        }
        if (!nurObenUnten) {
          for (let y = Math.round(y0 + (y1 - y0) * 0.2); y <= y0 + (y1 - y0) * 0.8; y++) {
            punkte.push(px(x0 + a, y), px(x1 - a, y));
          }
        }
        return punkte;
      };
      const r2 = (z) => Math.round(z * 100) / 100;
      return liste.map((k) => {
        const innen = Math.ceil(k.rahmen) + 3;
        const haeufigkeit = new Map();
        const innenPunkte = [];
        for (let y = Math.round(k.y) + innen; y < Math.round(k.y + k.h) - innen; y++) {
          for (let x = Math.round(k.x) + innen; x < Math.round(k.x + k.w) - innen; x++) {
            const f = px(x, y);
            innenPunkte.push(f);
            const schluessel = f.join(',');
            haeufigkeit.set(schluessel, (haeufigkeit.get(schluessel) || 0) + 1);
          }
        }
        const flaeche = [...haeufigkeit.entries()]
          .sort((a, b) => b[1] - a[1])[0][0]
          .split(',')
          .map(Number);
        const nachKontrast = innenPunkte
          .map((f) => ({ f, k: kontrast(f, flaeche) }))
          .sort((a, b) => b.k - a.k);
        // Der neuntstaerkste Bildpunkt, nicht der staerkste: ein einzelner Ausreisser soll
        // die Schriftfarbe nicht bestimmen. Bei 14 px fetter Schrift in doppelter Aufloesung
        // liegen Hunderte Bildpunkte voll in der Schriftfarbe.
        const schrift = nachKontrast[Math.min(8, nachKontrast.length - 1)].f;
        // Rahmen: jede Bildzeile des Rahmenbandes einzeln, genommen wird die, die sich am
        // deutlichsten von der Flaeche abhebt. So trifft die Messung auch einen 1-px-Rahmen.
        // Hat der Knopf keinen sichtbaren Rahmen, bleibt es bei der Flaechenfarbe.
        const abst = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        let rahmen = flaeche;
        for (let a = 0; a < Math.max(1, Math.ceil(k.rahmen)); a++) {
          const kandidat = median(kante(k, a, false));
          if (abst(kandidat, flaeche) > abst(rahmen, flaeche)) rahmen = kandidat;
        }
        const umfeld = median(kante(k, -4, false));
        // Fokusring: staerkste Kante zwischen 3 und 20 Geraetepixeln ausserhalb, gegen das
        // Umfeld weiter draussen. Nur oben und unten, dort ist genug freier Raum.
        const fern = median(kante(k, -24, true));
        let ring = 1;
        for (let a = 3; a <= 20; a++)
          ring = Math.max(ring, kontrast(median(kante(k, -a, true)), fern));
        return {
          id: k.id,
          flaeche,
          schrift,
          rahmen,
          umfeld,
          kontrastSchrift: r2(kontrast(schrift, flaeche)),
          kontrastRahmen: r2(kontrast(rahmen, umfeld)),
          kontrastRing: r2(ring),
          schriftPixel: nachKontrast.filter((e) => e.k >= 3).length,
        };
      });
    },
    { b64: bild.toString('base64'), knoepfe }
  );
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Page} rechenblatt
 * @param {string[]} ids
 * @param {{ fokusBehalten?: boolean }} [optionen]
 */
async function knoepfeMessen(page, rechenblatt, ids, optionen = {}) {
  await page.mouse.move(1, 1);
  // Die Seite rollt weich (css/site.css: scroll-behavior smooth). Deshalb sofort rollen und
  // die Geometrie vor UND nach dem Bild lesen: nur ein ruhendes Bild passt zu den Koordinaten.
  // Gefunden beim Bau: bei 1280 px lief das Bild 200 ms nach dem Rollen noch, die Rahmenmessung
  // traf die Flaeche statt des Rahmens.
  await page.evaluate((behalten) => {
    const aktiv = /** @type {HTMLElement | null} */ (document.activeElement);
    if (!behalten && aktiv && aktiv !== document.body) aktiv.blur();
    document
      .getElementById('wzUnitKwh')
      .parentElement.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, !!optionen.fokusBehalten);
  const geometrieLesen = () =>
    page.evaluate((liste) => {
      const dpr = window.devicePixelRatio;
      return liste.map((id) => {
        const el = document.getElementById(id);
        const r = el.getBoundingClientRect();
        return {
          id,
          x: r.left * dpr,
          y: r.top * dpr,
          w: r.width * dpr,
          h: r.height * dpr,
          rahmen: parseFloat(window.getComputedStyle(el).borderTopWidth) * dpr,
          gedrueckt: el.getAttribute('aria-pressed'),
        };
      });
    }, ids);
  for (let versuch = 0; versuch < 5; versuch++) {
    await page.waitForTimeout(200);
    const vorher = await geometrieLesen();
    const bild = await page.screenshot({ scale: 'device', animations: 'disabled', caret: 'hide' });
    const nachher = await geometrieLesen();
    if (JSON.stringify(vorher) !== JSON.stringify(nachher)) continue;
    const werte = await bildAuswerten(rechenblatt, bild, vorher);
    return werte.map((w, i) => ({ ...w, gedrueckt: vorher[i].gedrueckt }));
  }
  throw new Error('Knopfgeometrie kam nicht zur Ruhe, Bild und Koordinaten passen nicht zusammen.');
}

// Lage und Groesse aller Elemente im aktiven Schritt, in Dokumentkoordinaten.
// Beim Umschalten wechseln auch TEXTE unter den Knoepfen: der Reglerwert ("2.000 m³ (≈ 20.000
// kWh)" gegen "20.000 kWh"), die Reglergrenzen und der Hinweis zur Abrechnung. Gemessen beim
// Bau: bei 390 px bricht der laengere Reglerwert auf zwei Zeilen um und schiebt alles darunter
// um 28,8 px. Das ist Inhalt, nicht die Gestaltung der Knoepfe. Damit trotzdem JEDES Element
// streng verglichen wird, setzt die Nachher-Aufnahme die geaenderten Blatt-Texte nur fuer die
// Dauer der Messung auf den Vorher-Text zurueck und danach wieder auf den neuen. Beide
// Aufnahmen unterscheiden sich dann nur noch im Zustand der Knoepfe.
/** @param {import('@playwright/test').Page} page @param {Array<string | null> | null} [textVorher] */
async function lageAufnehmen(page, textVorher = null) {
  return page.evaluate((vorherTexte) => {
    const alle = [...document.querySelector('.wizard-step.active').querySelectorAll('*')];
    const texte = alle.map((el) => (el.children.length === 0 ? el.textContent : null));
    const getauscht = [];
    if (vorherTexte && vorherTexte.length === alle.length) {
      alle.forEach((el, i) => {
        if (texte[i] === null || vorherTexte[i] === null || texte[i] === vorherTexte[i]) return;
        getauscht.push({ el, neu: texte[i] });
        el.textContent = vorherTexte[i];
      });
    }
    const lage = alle.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        wer: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
        x: r.left + window.scrollX,
        y: r.top + window.scrollY,
        w: r.width,
        h: r.height,
        sichtbar: el.getClientRects().length > 0,
      };
    });
    getauscht.forEach((t) => {
      t.el.textContent = t.neu;
    });
    return { texte, lage, getauschteTexte: getauscht.length };
  }, textVorher);
}

/** @param {{lage: any[]}} vorher @param {{lage: any[], getauschteTexte: number}} nachher */
function lageVergleichen(vorher, nachher) {
  const befunde = [];
  let groesste = 0;
  let geprueft = 0;
  if (vorher.lage.length !== nachher.lage.length) {
    befunde.push(`Elementzahl ${vorher.lage.length} gegen ${nachher.lage.length}`);
    groesste = Infinity;
  }
  for (let i = 0; i < Math.min(vorher.lage.length, nachher.lage.length); i++) {
    const v = vorher.lage[i];
    const n = nachher.lage[i];
    if (!v.sichtbar && !n.sichtbar) continue;
    geprueft++;
    if (v.sichtbar !== n.sichtbar) {
      befunde.push(`${v.wer}: Sichtbarkeit wechselt`);
      groesste = Infinity;
      continue;
    }
    const d = [n.x - v.x, n.y - v.y, n.w - v.w, n.h - v.h];
    const max = Math.max(...d.map((z) => Math.abs(z)));
    if (max > TOL_LAGE) {
      befunde.push(
        `${v.wer}: dx ${d[0].toFixed(2)} dy ${d[1].toFixed(2)} dw ${d[2].toFixed(2)} dh ${d[3].toFixed(2)}`
      );
    }
    groesste = Math.max(groesste, max);
  }
  return {
    groesste: Math.round(groesste * 100) / 100,
    geprueft,
    getauschteTexte: nachher.getauschteTexte,
    befunde,
  };
}

/** @param {number[]} a @param {number[]} b */
const abstand = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
/** @param {number[]} f */
const istGruen = (f) => f[1] - f[2] >= GRUEN_UEBERHANG;

for (const modus of MODI) {
  for (const traeger of TRAEGER) {
    for (const breite of BREITEN) {
      test(`@einheitenknopf ${traeger.name} ${modus} ${breite}px`, async ({ browser }) => {
        test.setTimeout(180000);
        const kontext = await browser.newContext({
          viewport: { width: breite, height: 900 },
          deviceScaleFactor: 2,
        });
        const page = await kontext.newPage();
        const rechenblatt = await kontext.newPage();
        // Einwilligungsanbieter abweisen wie im Mobile-Gate: sein Dialog kann die Knoepfe
        // ueberdecken, und er gehoert nicht zu dem, was hier gemessen wird.
        await page.route('**/*consentmanager.net/**', (r) => r.abort());
        await page.route('**/api/rechner**', (r) =>
          r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await page.goto(`/dimensionierung.html?theme=${modus}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(
          modus
        );
        await zumVerbrauchsschritt(page, traeger.heizung);
        await page.locator('#wzVerbrauch .wizard-option[data-value="known"]').click();
        await page.waitForTimeout(500);
        expect(await aktiverSchritt(page)).toBe(8);
        await expect(page.locator('#wzVerbrauchInput')).toBeVisible();

        const sichtbar = await page.evaluate(() =>
          ['wzUnitKwh', 'wzUnitM3', 'wzUnitLiter'].filter(
            (id) => document.getElementById(id).getClientRects().length > 0
          )
        );
        expect(sichtbar, 'sichtbare Einheitenknoepfe').toEqual(traeger.sichtbar);

        const lauf = { modus, breite, traeger: traeger.name };
        /** @param {string} zustand @param {string} gewaehlt @param {any[]} werte */
        const bewerten = (zustand, gewaehlt, werte) => {
          for (const w of werte) {
            const istGewaehlt = w.id === gewaehlt;
            console.log(
              'EINHEIT-MESSUNG ' + JSON.stringify({ ...lauf, zustand, gewaehlt: istGewaehlt, ...w })
            );
            const wo = `${traeger.name} ${modus} ${breite}px ${zustand} ${w.id}`;
            expect
              .soft(w.kontrastSchrift, `${wo}: Schrift gegen Flaeche`)
              .toBeGreaterThanOrEqual(SCHWELLE_SCHRIFT);
            expect
              .soft(w.kontrastRahmen, `${wo}: Rahmen gegen Umfeld`)
              .toBeGreaterThanOrEqual(SCHWELLE_RAHMEN);
            expect.soft(w.gedrueckt, `${wo}: aria-pressed`).toBe(istGewaehlt ? 'true' : 'false');
            expect
              .soft(istGruen(w.schrift), `${wo}: Schrift gruen nur wenn gewaehlt`)
              .toBe(istGewaehlt);
            expect
              .soft(istGruen(w.rahmen), `${wo}: Rahmen gruen nur wenn gewaehlt`)
              .toBe(istGewaehlt);
          }
          if (werte.length === 2) {
            const a = werte.find((w) => w.id === gewaehlt);
            const b = werte.find((w) => w.id !== gewaehlt);
            const unterschied = {
              abstandRahmen: abstand(a.rahmen, b.rahmen),
              abstandFlaeche: abstand(a.flaeche, b.flaeche),
            };
            console.log(
              'EINHEIT-UNTERSCHEIDUNG ' + JSON.stringify({ ...lauf, zustand, ...unterschied })
            );
            expect
              .soft(unterschied.abstandRahmen, `${zustand}: Rahmenfarbe unterscheidbar`)
              .toBeGreaterThanOrEqual(ABSTAND_RAHMEN);
            expect
              .soft(unterschied.abstandFlaeche, `${zustand}: Flaeche unterscheidbar`)
              .toBeGreaterThanOrEqual(ABSTAND_FLAECHE);
          }
        };

        bewerten(
          'Ausgang',
          traeger.start,
          await knoepfeMessen(page, rechenblatt, traeger.sichtbar)
        );

        const bilderDir = process.env.EINHEIT_BILDER_DIR;
        if (bilderDir && traeger.name !== 'Strom') {
          await page.locator('#wizCard').screenshot({
            path: path.join(
              bilderDir,
              `${process.env.EINHEIT_BILDER_PRAEFIX || 'bild'}_${modus}_${traeger.name}_${breite}px.png`
            ),
            animations: 'disabled',
          });
        }

        if (traeger.sichtbar.length === 2) {
          const [erster, zweiter] = traeger.sichtbar;
          const anderer = traeger.start === erster ? zweiter : erster;
          for (const [zustand, ziel] of [
            ['nach Umschalten', anderer],
            ['nach Zurueckschalten', traeger.start],
          ]) {
            const vorher = await lageAufnehmen(page);
            await page.locator('#' + ziel).click();
            await page.waitForTimeout(300);
            const nachher = await lageAufnehmen(page, vorher.texte);
            const lage = lageVergleichen(vorher, nachher);
            console.log('EINHEIT-LAGE ' + JSON.stringify({ ...lauf, zustand, ...lage }));
            expect
              .soft(
                lage.groesste,
                `${zustand}: Lageaenderung anderer Elemente ${lage.befunde.slice(0, 5).join(' | ')}`
              )
              .toBeLessThanOrEqual(TOL_LAGE);
            bewerten(zustand, ziel, await knoepfeMessen(page, rechenblatt, traeger.sichtbar));
          }
        }

        // Tastatur: Fokusring sichtbar am gemalten Bild, Leertaste schaltet um.
        await page.locator('#' + traeger.start).focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.activeElement.id)).toBe(traeger.start);
        const ring = (
          await knoepfeMessen(page, rechenblatt, [traeger.start], { fokusBehalten: true })
        )[0];
        console.log(
          'EINHEIT-FOKUS ' +
            JSON.stringify({ ...lauf, knopf: ring.id, kontrastRing: ring.kontrastRing })
        );
        expect
          .soft(ring.kontrastRing, `${traeger.start}: Fokusring gegen Umfeld`)
          .toBeGreaterThanOrEqual(SCHWELLE_FOKUS);
        if (traeger.sichtbar.length === 2) {
          const anderer = traeger.sichtbar.find((id) => id !== traeger.start);
          await page.keyboard.press(anderer === traeger.sichtbar[0] ? 'Shift+Tab' : 'Tab');
          expect(await page.evaluate(() => document.activeElement.id)).toBe(anderer);
          await page.keyboard.press('Space');
          await page.waitForTimeout(200);
          expect
            .soft(
              await page.locator('#' + anderer).getAttribute('aria-pressed'),
              'Leertaste schaltet um'
            )
            .toBe('true');
        }
        await kontext.close();
      });
    }
  }
}
