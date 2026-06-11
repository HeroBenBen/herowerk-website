#!/usr/bin/env node
// Job 7 — CSP/Headers-Test via Mozilla HTTP Observatory (Pipeline Abschnitt G).
// Aufruf: node scripts/observatory-check.js <preview-url>
// Fail bei Score/Grade schlechter als B.
// HINWEIS: Solange Vercel Deployment Protection auf Preview-URLs aktiv ist,
// bewertet Observatory die 401-Schutzseite — Befund siehe T1-6b-Report.
'use strict';

const API = 'https://observatory-api.mdn.mozilla.net/api/v2/scan';
const PASSING = ['A+', 'A', 'A-', 'B+', 'B'];

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: observatory-check.js <url>');
    process.exit(2);
  }
  const host = new URL(arg).hostname;
  let result;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const resp = await fetch(`${API}?host=${encodeURIComponent(host)}`, { method: 'POST' });
    if (!resp.ok) {
      console.error(`Observatory-API HTTP ${resp.status} (Versuch ${attempt}/5)`);
      await new Promise((r) => setTimeout(r, 10000));
      continue;
    }
    result = await resp.json();
    if (result.error) {
      console.error(`Observatory-Fehler: ${result.error} (Versuch ${attempt}/5)`);
      result = null;
      await new Promise((r) => setTimeout(r, 10000));
      continue;
    }
    break;
  }
  if (!result) {
    console.error('Observatory-Scan nach 5 Versuchen nicht möglich.');
    process.exit(1);
  }
  console.log(`Mozilla Observatory: Host=${host} Grade=${result.grade} Score=${result.score}`);
  if (!PASSING.includes(result.grade)) {
    console.error(`FAIL: Grade ${result.grade} ist schlechter als B (Pipeline-Schwelle).`);
    process.exit(1);
  }
  console.log('CSP/Headers-Gate OK (≥ B).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
