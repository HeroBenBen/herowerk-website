#!/usr/bin/env node
// Wer den Rechner messen will, ruft dieses Modul auf und baut die Messstrecke nicht nach.
// Diese Sonde zeigt den kürzesten vollständigen Aufruf mit Rechenkern, Bedienung und Rohwerten.

import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  installRechnerApi,
  messeRechnerSchritte,
  pruefeRechnerJahrestabellen,
  wurzel,
} from './lib/mobile-messung.mjs';

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

async function starteServer() {
  const server = createServer(async (req, res) => {
    const roh = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let datei = path.join(wurzel, roh);
    if (!datei.startsWith(wurzel)) return res.writeHead(403).end();
    if (!existsSync(datei) && existsSync(datei + '.html')) datei += '.html';
    if (!existsSync(datei) || datei.endsWith('/')) return res.writeHead(404).end();
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
  await new Promise((fertig) => server.listen(0, '127.0.0.1', fertig));
  return { server, basis: 'http://127.0.0.1:' + server.address().port };
}

const { server, basis } = await starteServer();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await installRechnerApi(page);
  await page.goto(basis + '/kostenvergleich-waermepumpe.html', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('#cmpbox')?.remove());

  const { schritte } = await messeRechnerSchritte(page);
  const jahre = await pruefeRechnerJahrestabellen(page);

  console.log('Rechner-Sonde: 390 x 800 px, dark, fünf Schritte.');
  for (const messung of schritte) {
    console.log(
      `Schritt ${messung.schritt}: sichtbarStreng ${messung.sichtbareElemente}, Ziel oben ${messung.top}, sichtbar ${messung.sichtbar ? 'ja' : 'nein'}, Textblöcke ${messung.textbloecke.gesamt}/${messung.textbloecke.zuklappbar}, Überläufe ${messung.elementUeberlauf.length}`
    );
  }
  console.log(
    `Jahrestabellen: Deckel ${jahre.chartDetails.join('/')}, Zeilen ${jahre.mainRows}/${jahre.breakCards}/${jahre.heatCards}, Überläufe ${jahre.elementUeberlauf.length}`
  );
} finally {
  await browser.close();
  server.close();
}
