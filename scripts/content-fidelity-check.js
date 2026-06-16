#!/usr/bin/env node
// Job 6 — Content-Fidelity-Check gegen v4-Baseline (Pipeline Abschnitt G).
// Section-Regel: <section id> primär, H2-Fallback, FAQ separat (pro faq-item).
// Fail bei > 30% Wort-Abweichung pro Section oder fehlender Section.
// Modus --generate: erzeugt baseline/v4-sections.json aus den PAGES.
// Quelle Website: index.html ist byte-identisch zu HeroWerk_Website_v4.html
// (verifiziert Tag-1a-Report 2026-06-11).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASELINE_FILE = path.join(ROOT, 'baseline', 'v4-sections.json');
const THRESHOLD = 0.3;
// Seiten-Liste pro Repo (Portal-Repo: index.html + dashboard.html)
const PAGES = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts', 'fidelity-pages.json'), 'utf8')
);

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
}

function wordCount(html) {
  const text = stripTags(html).trim();
  return text ? text.split(/\s+/).length : 0;
}

// Extrahiert <section ...id="x"...> ... </section> Blöcke (nicht-verschachtelt, v4-Struktur).
function extractSections(html) {
  const out = [];
  const seen = new Map();
  const uniq = (id) => {
    const n = (seen.get(id) || 0) + 1;
    seen.set(id, n);
    return n === 1 ? id : `${id}[${n}]`;
  };
  const re = /<section\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const idMatch = m[0].match(/id="([^"]+)"/);
    const classMatch = m[0].match(/class="([^"]+)"/);
    const start = m.index;
    const end = html.indexOf('</section>', start);
    if (end === -1) continue;
    const inner = html.slice(start + m[0].length, end);
    const id = uniq(
      idMatch
        ? idMatch[1]
        : classMatch
          ? `class:${classMatch[1].split(' ')[0]}`
          : `noid-${out.length}`
    );
    if (id === 'faq') {
      // FAQ separat: jede Frage als eigene Einheit (Reihenfolge-stabil)
      const items = inner.split(/<div class="faq-item"/).slice(1);
      items.forEach((item, i) => {
        const qm = item.match(/faq-q-text[^>]*>([\s\S]*?)</);
        out.push({
          id: `faq[${i + 1}]`,
          question: qm ? stripTags(qm[1]).trim().slice(0, 80) : '',
          words: wordCount(item),
        });
      });
      // FAQ-Rahmen (Titel etc.) ohne Items
      out.push({ id: 'faq[frame]', words: wordCount(inner.split('<div class="faq-item"')[0]) });
    } else {
      out.push({ id, words: wordCount(inner) });
    }
  }
  if (out.length > 0) return out;
  // H2-Fallback: Seite ohne <section id> → Split an <h2>, sonst ganze Seite
  const bodyMatch = html.match(/<body[\s\S]*<\/body>/i);
  const body = bodyMatch ? bodyMatch[0] : html;
  const parts = body.split(/<h2\b/i);
  if (parts.length > 1) {
    return parts.map((p, i) => ({ id: `h2-block[${i}]`, words: wordCount(i ? '<h2' + p : p) }));
  }
  return [{ id: 'page', words: wordCount(body) }];
}

function scanPages() {
  return PAGES.map((file) => ({
    file,
    sections: extractSections(fs.readFileSync(path.join(ROOT, file), 'utf8')),
  }));
}

if (process.argv.includes('--generate')) {
  const baseline = {
    generated: new Date().toISOString().slice(0, 10),
    rule: 'section-id primär, H2-Fallback, FAQ separat; Fail bei >30% Wort-Abweichung',
    threshold: THRESHOLD,
    pages: scanPages(),
  };
  fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`Baseline geschrieben: ${BASELINE_FILE}`);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
const current = scanPages();
const errors = [];
const warnings = [];

for (const basePage of baseline.pages) {
  const curPage = current.find((p) => p.file === basePage.file);
  if (!curPage) {
    errors.push(`Seite fehlt: ${basePage.file}`);
    continue;
  }
  for (const baseSec of basePage.sections) {
    const curSec = curPage.sections.find((s) => s.id === baseSec.id);
    if (!curSec) {
      errors.push(
        `${basePage.file} → Section "${baseSec.id}" fehlt (Baseline: ${baseSec.words} Wörter)`
      );
      continue;
    }
    const dev = baseSec.words === 0 ? 0 : Math.abs(curSec.words - baseSec.words) / baseSec.words;
    if (dev > (baseline.threshold || THRESHOLD)) {
      errors.push(
        `${basePage.file} → Section "${baseSec.id}": ${baseSec.words} → ${curSec.words} Wörter (${(dev * 100).toFixed(1)}% Abweichung > 30%)`
      );
    }
  }
  for (const curSec of curPage.sections) {
    if (!basePage.sections.find((s) => s.id === curSec.id)) {
      warnings.push(
        `${basePage.file} → neue Section "${curSec.id}" (${curSec.words} Wörter) — nicht in Baseline`
      );
    }
  }
}

warnings.forEach((w) => console.log(`WARN: ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`FAIL: ${e}`));
  console.error(`Content-Fidelity-Check: ${errors.length} Verstoß/Verstöße gegen v4-Baseline.`);
  process.exit(1);
}
console.log(
  `Content-Fidelity-Check OK (${current.length} Seite(n), Schwelle ${(THRESHOLD * 100) | 0}%).`
);
