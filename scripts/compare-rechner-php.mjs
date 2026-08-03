#!/usr/bin/env node
import fs from 'node:fs';

const GOOGLE_URL =
  'https://script.google.com/macros/s/AKfycbwsvoC0ZBtpZq8WY_hNS-BPN1gcTK5G1JAMfxSc5FpjWxQ2SbRLI9VqCnX8SRLO4meF/exec';
const args = Object.fromEntries(
  process.argv.slice(2).map((entry) => {
    const [key, ...rest] = entry.replace(/^--/, '').split('=');
    return [key, rest.length ? rest.join('=') : true];
  })
);
const LOCAL_URL = String(args.local || 'http://127.0.0.1:8787/api/rechner.php');
const CASE_LIMIT = Number(args.count || 506);
const CONCURRENCY = Number(args.concurrency || 6);
const OUTPUT = args.output ? String(args.output) : '';
const REFERER = 'https://www.herowerk.de/foerderrechner-waermepumpe.html';

function berlinDay() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function cycle(values, index, divisor = 1) {
  return values[Math.floor(index / divisor) % values.length];
}

function dimensionierung(index) {
  const known = cycle([false, true], index, 3);
  return {
    action: 'dimensionierung',
    flaeche: cycle([60, 85, 120, 180, 260, 420, 800], index),
    baujahr: cycle(['vor1978', '1978-1994', '1995-2010', 'nach2010'], index, 2),
    gebaeude: cycle(['efh', 'dhh', 'rh', 'zfh', 'mfh'], index, 3),
    sanierung: cycle(['nein', 'teilweise', 'umfassend'], index, 5),
    warmwasser: cycle(['ja', 'nein'], index, 7),
    heizsystem: cycle(['heizkoerper', 'fussboden'], index, 11),
    verbrauchKnown: known ? 'known' : 'unknown',
    verbrauch: known ? cycle([9000, 14500, 22000, 38000, 72000], index, 2) : 0,
    einheit: cycle(['kwh', 'liter', 'm3'], index, 13),
    plz: cycle(['30159', '30419', '30900', '31515', '00000'], index, 4),
    personen: cycle([1, 2, 4, 6], index, 3),
  };
}

function foerderung(index) {
  const we = cycle([1, 2, 3, 6, 7, 10], index, 3);
  const selbst = Math.min(we, cycle([0, 1, 2, 4], index, 5));
  const out = {
    action: 'foerderung',
    we,
    selbstWE: selbst,
    heizung: cycle(['gas', 'oel', 'kohle', 'nachtspeicher', 'gas-etage', 'biomasse'], index, 2),
    einkommen: cycle(['bis30', 'bis40', 'bis50', 'ueber50', 'unter40', 'keine'], index, 4),
    gemeinde: cycle(['hannover', 'seelze', 'langenhagen', 'celle', ''], index, 7),
    marke: cycle(['wolf', 'vaillant'], index, 3),
    wpTyp: cycle(['s', 'm', 'l', 'xl', 'xxl'], index, 2),
    heizungsalter: cycle([5, 19, 20, 35], index, 5),
    kind: cycle(['ja', 'nein'], index, 11),
    eu: cycle(['ja', 'nein'], index, 13),
    proklimaOptin: cycle(['ja', 'nein'], index, 17),
  };
  if (index % 9 === 0) out.preisManuell = cycle([12000, 23999, 35349, 88000], index, 2);
  return out;
}

function kostenvergleich(index) {
  const out = {
    action: 'kostenvergleich',
    modus: cycle(['kunde', 'berater'], index, 7),
    heizart: cycle(['gas', 'oel'], index),
    bedarf: cycle([5000, 12000, 20000, 36000, 80000], index, 2),
    eta: cycle([65, 75, 85, 93], index, 3),
    invWP: cycle([12000, 23999, 30000, 35349, 82223], index, 4),
    jaz: cycle([2.8, 3.3, 3.8, 4.5], index, 5),
    laufzeit: cycle([5, 10, 20, 30], index, 6),
    neuFossilTog: cycle([0, 1], index, 3),
    vglBrennstoff: cycle(['gas', 'oel'], index, 5),
    gasInvest: cycle([8000, 12000, 18000], index, 7),
    oelInvest: cycle([12000, 17500, 22000], index, 8),
    gaspreis: cycle([9.5, 12, 16], index, 4),
    gasStg: cycle([-1, 1.5, 2.5, 5], index, 6),
    oelpreis: cycle([9, 11, 15], index, 5),
    oelStg: cycle([-1, 2.5, 6], index, 7),
    strompreis: cycle([24, 32, 45], index, 3),
    stromEntw: cycle([-2, 0, 1.5, 5], index, 5),
    co2preis: cycle([45, 55, 80], index, 9),
    co2Pfad: cycle([150, 250, 400], index, 11),
    bioTog: cycle([0, 1], index, 4),
    bioAufpreis: cycle([1.2, 2.5, 4], index, 7),
    fHalbjahr: cycle(
      ['alt', 'h2-2026', 'h1-2027', 'h2-2027', 'h1-2028', 'h2-2028', 'h1-2029'],
      index,
      2
    ),
    fGrund: cycle([0, 1], index, 13),
    fEU: cycle([0, 1], index, 11),
    fKlima: cycle([0, 1], index, 7),
    fAlt20: cycle([0, 1], index, 5),
    fEinkSlider: cycle([15000, 30000, 40000, 50000, 90000, 120000], index, 3),
    fKind: cycle([0, 1], index, 17),
    fEffizienz: cycle([0, 1], index, 19),
    finanzTog: cycle([0, 1], index, 3),
    kredLZ: cycle([5, 10, 20], index, 7),
    kredZins: cycle([0, 0.98, 4.1], index, 5),
    immoTog: cycle([0, 1], index, 4),
    hausW: cycle([180000, 350000, 800000], index, 6),
    immoP: cycle([0, 4, 7, 12], index, 9),
    dynTarifTog: cycle([0, 1], index, 5),
    dynAnteil: cycle([0, 20, 40, 80], index, 3),
    dynSpread: cycle([0, 5, 10, 20], index, 7),
  };
  if (index % 10 === 0) {
    Object.assign(out, {
      bedarfModus: 'schaetzung',
      geb: cycle(['efh', 'dhh', 'rh', 'zfh', 'mfh'], index),
      bj: cycle(['vor1978', '1978-1994', '1995-2010', 'nach2010'], index, 2),
      san: cycle(['nein', 'teilweise', 'umfassend'], index, 3),
      flaeche: cycle([60, 90, 140, 280, 800], index, 4),
    });
  }
  return out;
}

function buildCases() {
  const cases = [];
  for (let index = 0; index < 166; index++) cases.push(dimensionierung(index));
  for (let index = 0; index < 167; index++) cases.push(foerderung(index));
  for (let index = 0; index < 167; index++) cases.push(kostenvergleich(index));
  cases.push({ action: 'preise' });
  cases.push({ action: 'kv_bootstrap' });
  cases.push({ action: 'fv_plaetze' });
  cases.push({ action: 'unbekannt' });
  cases.push({});
  cases.push({ action: 'health' });
  return cases.slice(0, CASE_LIMIT);
}

function publicGoogleShape(action, payload) {
  if (action === 'preise') {
    for (const brand of ['wolf', 'vaillant']) {
      payload[brand] = payload[brand].map(({ klasse, modell, kw, brutto, eigen }) => ({
        klasse,
        modell,
        kw,
        brutto,
        eigen,
      }));
    }
  }
  if (action === 'kv_bootstrap') {
    payload.perioden = payload.perioden.map(({ key, label }) => ({ key, label }));
    delete payload.hinweise;
    delete payload.defaults.fEffizienz;
    delete payload.defaults.modus;
    delete payload.etaMatrix.textEigen;
    payload.schaetzung = { einheitFaktor: payload.schaetzung.einheitFaktor };
  }
  return payload;
}

function firstDifference(expected, actual, path = '$') {
  if (expected === null || actual === null || typeof expected !== typeof actual) {
    return Object.is(expected, actual)
      ? null
      : `${path}: ${JSON.stringify(expected)} (${typeof expected}) != ${JSON.stringify(actual)} (${typeof actual})`;
  }
  if (typeof expected !== 'object') {
    return Object.is(expected, actual)
      ? null
      : `${path}: ${JSON.stringify(expected)} != ${JSON.stringify(actual)}`;
  }
  const expectedKeys = Object.keys(expected);
  const actualKeys = Object.keys(actual);
  if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
    return `${path}: Feldreihenfolge ${JSON.stringify(expectedKeys)} != ${JSON.stringify(actualKeys)}`;
  }
  for (const key of expectedKeys) {
    const difference = firstDifference(expected[key], actual[key], `${path}.${key}`);
    if (difference) return difference;
  }
  return null;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

let googleFailures = 0;
async function googleResponse(query, action) {
  const params = new URLSearchParams(query);
  params.set('origin', 'https://herowerk.de');
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${GOOGLE_URL}?${params}`,
        { redirect: 'follow' },
        55000
      );
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = JSON.parse(text);
      if (payload.error && !['health', 'unbekannt'].includes(action)) {
        throw new Error(payload.message || 'Google-Fehlerantwort');
      }
      return publicGoogleShape(action, payload);
    } catch (error) {
      googleFailures += 1;
      lastError = error;
      if (attempt < 8)
        await new Promise((resolve) => setTimeout(resolve, attempt < 3 ? 1000 : 3000));
    }
  }
  throw new Error(`Google nach 8 Versuchen ohne Antwort: ${lastError?.message || 'unbekannt'}`);
}

async function localResponse(query) {
  const params = new URLSearchParams(query);
  params.set('origin', 'https://herowerk.de');
  const response = await fetchWithTimeout(
    `${LOCAL_URL}?${params}`,
    { headers: { Referer: REFERER, Accept: 'application/json' } },
    20000
  );
  const text = await response.text();
  if (!response.ok) throw new Error(`PHP HTTP ${response.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

const cases = buildCases();
const startDay = berlinDay();
const startedAt = new Date().toISOString();
let nextIndex = 0;
let exact = 0;
let firstError = null;
let fvStart = await googleResponse({ action: 'fv_plaetze' }, 'fv_plaetze');
let fvEnd = null;

async function worker() {
  while (!firstError) {
    const index = nextIndex++;
    if (index >= cases.length) return;
    const query = cases[index];
    const action = String(query.action || 'health');
    try {
      const expected = await googleResponse(query, action);
      const actual = await localResponse(query);
      const difference = firstDifference(expected, actual);
      if (difference) {
        firstError = { index, action, query, difference };
        return;
      }
      exact += 1;
      if (exact % 25 === 0 || exact === cases.length) {
        process.stdout.write(
          `Verglichen: ${exact}/${cases.length}, Google-Wiederholungen: ${googleFailures}\n`
        );
      }
    } catch (error) {
      firstError = { index, action, query, difference: error.message };
      return;
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
if (!firstError) {
  fvEnd = await googleResponse({ action: 'fv_plaetze' }, 'fv_plaetze');
}
const endDay = berlinDay();
const result = {
  startedAt,
  finishedAt: new Date().toISOString(),
  berlinDay: startDay,
  sameBerlinDay: startDay === endDay,
  requestedCases: cases.length,
  exactMatches: exact,
  googleFailuresRepeated: googleFailures,
  validReferer: REFERER,
  fvStart,
  fvEnd,
  firstError,
};
if (OUTPUT) fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (firstError || startDay !== endDay || exact !== cases.length) process.exit(1);
