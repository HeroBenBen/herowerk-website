#!/usr/bin/env node
// Job 11 — Schema.org-Validator (Pipeline Abschnitt G).
// Aufruf: node scripts/rich-results-check.js <preview-url>
// Google-Rich-Results-API benötigt einen API-Key (Secret = Benjamin-Zone),
// daher strukturelle JSON-LD-Validierung: parsebar, @context schema.org,
// @type vorhanden, Pflichtfelder je bekanntem Typ (LocalBusiness, FAQPage,
// Product). Empfehlung: nach Live zusätzlich manueller Lauf über
// https://search.google.com/test/rich-results (T4-1).
'use strict';

const REQUIRED_FIELDS = {
  LocalBusiness: ['name', 'address'],
  HVACBusiness: ['name', 'address'],
  FAQPage: ['mainEntity'],
  Product: ['name'],
  Article: ['headline', 'datePublished', 'author', 'publisher'],
  JobPosting: ['title', 'description', 'datePosted', 'hiringOrganization', 'jobLocation'],
  BreadcrumbList: ['itemListElement'],
};

// @type darf laut schema.org ein Array sein (index.html traegt seit dem 28.07.2026
// ["LocalBusiness","HVACBusiness"]). Der frühere direkte Lookup lief bei einem Array
// ins Leere und hat die Pflichtfeldpruefung STILL abgeschaltet, statt sie zu melden.
// Gefunden von der unabhaengigen Abnahme am 28.07.2026.
function typen(type) {
  return (Array.isArray(type) ? type : [type]).filter(Boolean).map(String);
}

async function main() {
  const base = process.argv[2];
  if (!base) {
    console.error('Usage: rich-results-check.js <url>');
    process.exit(2);
  }
  const resp = await fetch(base, { redirect: 'follow' });
  if (!resp.ok) {
    console.error(`FAIL: Seite HTTP ${resp.status}`);
    process.exit(1);
  }
  const html = await resp.text();
  const blocks = [
    ...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
  ];
  const errors = [];
  if (blocks.length === 0) errors.push('Kein JSON-LD-Block gefunden');

  for (const [i, m] of blocks.entries()) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch (e) {
      errors.push(`JSON-LD-Block ${i + 1} nicht parsebar: ${e.message}`);
      continue;
    }
    const items = Array.isArray(data) ? data : data['@graph'] || [data];
    for (const item of items) {
      const ctx = String(item['@context'] || data['@context'] || '');
      if (!ctx.includes('schema.org')) errors.push(`Block ${i + 1}: @context ist nicht schema.org`);
      const type = item['@type'];
      if (!type) {
        errors.push(`Block ${i + 1}: @type fehlt`);
        continue;
      }
      for (const t of typen(type)) {
        for (const field of REQUIRED_FIELDS[t] || []) {
          if (!(field in item)) errors.push(`Block ${i + 1} (${t}): Pflichtfeld "${field}" fehlt`);
        }
      }
    }
  }

  if (errors.length) {
    errors.forEach((e) => console.error(`FAIL: ${e}`));
    process.exit(1);
  }
  console.log(`Rich-Results-Check OK (${blocks.length} JSON-LD-Block/Blöcke).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
