#!/usr/bin/env node
/**
 * Erzeugt die strukturierten Daten (JSON-LD) fuer herowerk.de.
 *
 * Grundsatz: ausgezeichnet wird ausschliesslich SICHTBARER Seiteninhalt.
 * Fragen und Antworten werden aus dem gerenderten HTML gelesen, Ueberschrift und
 * Beschreibung aus <h1> und <meta name="description">, die Stellen aus dem
 * Jobs-Feed. Es gibt keinen zweiten Datenhaushalt: dieses Skript liest, es pflegt nicht.
 *
 * Der erzeugte Block steht zwischen zwei Markern und wird bei jedem Lauf ersetzt.
 * Handgeschriebene JSON-LD-Bloecke ausserhalb der Marker bleiben unberuehrt.
 *
 *   node scripts/build-structured-data.mjs           schreibt
 *   node scripts/build-structured-data.mjs --check    prueft nur (Gate)
 *   node scripts/build-structured-data.mjs --jobs     holt den Jobs-Feed neu
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'scripts/structured-data.config.json'), 'utf8'));
const JOBS_SNAPSHOT = join(ROOT, 'scripts/jobs-snapshot.json');
const ZUSTAND_DATEI = join(ROOT, 'scripts/structured-data.state.json');
const ZUSTAND = existsSync(ZUSTAND_DATEI)
  ? JSON.parse(readFileSync(ZUSTAND_DATEI, 'utf8')).artikel
  : {};
const HEUTE = new Date().toISOString().slice(0, 10);
const BASIS = 'https://www.herowerk.de';
const START =
  '  <!-- STRUKTURDATEN:AUTO ANFANG (erzeugt von scripts/build-structured-data.mjs, nicht von Hand aendern) -->';
const ENDE = '  <!-- STRUKTURDATEN:AUTO ENDE -->';

const argv = process.argv.slice(2);
const NUR_PRUEFEN = argv.includes('--check');
const JOBS_HOLEN = argv.includes('--jobs');

/* ---------- Werkzeuge ---------- */

const ENTITAETEN = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
  '&shy;': '',
  '&auml;': 'ä',
  '&ouml;': 'ö',
  '&uuml;': 'ü',
  '&Auml;': 'Ä',
  '&Ouml;': 'Ö',
  '&Uuml;': 'Ü',
  '&szlig;': 'ß',
  '&euro;': '€',
  '&ndash;': ',',
  '&mdash;': ',',
};

/**
 * HTML-Fragment zu reinem Text.
 * Was fuer Vorleseprogramme versteckt ist (aria-hidden), gehoert auch nicht in die
 * Auszeichnung: sonst landen Fussnoten-Sternchen und Zierzeichen im Antworttext.
 * Danach Tags raus, Entitaeten aufloesen, Leerraum normalisieren und das
 * Leerzeichen vor Satzzeichen entfernen, das beim Ersetzen von Inline-Tags entsteht.
 */
function text(html) {
  return html
    .replace(/<([a-z]+)\b[^>]*\baria-hidden="true"[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*\baria-hidden="true"[^>]*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-zA-Z]+;|&#39;/g, (e) => (e in ENTITAETEN ? ENTITAETEN[e] : e))
    .replace(/­/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

/**
 * Letzte inhaltliche Aenderung.
 *
 * BEWUSST NICHT aus git. `git log -1 -- datei` liefert im flachen Klon (CI-Standard
 * `fetch-depth: 1`) nicht das Datum der Datei, sondern das Datum von HEAD. Das Gate
 * waere damit ab dem ersten Folge-Commit dauerhaft rot, und `npm run build:seo`
 * wuerde es lokal nicht beheben. Am 28.07.2026 im flachen Klon reproduziert:
 * Datei-Datum 2026-07-28, gemeldet 2026-08-05.
 *
 * Stattdessen: Fingerabdruck des ausgezeichneten Inhalts. Aendert sich der Inhalt,
 * wandert das Datum, sonst bleibt es stehen. Das ist auch fachlich richtiger, denn
 * eine Datei aendert sich auch durch Asset-Versionierung, ohne dass der Artikel
 * inhaltlich neu waere.
 */
function letzteAenderung(slug, fingerabdruck) {
  const alt = ZUSTAND[slug];
  if (alt && alt.fingerabdruck === fingerabdruck) return alt.dateModified;
  return HEUTE;
}

/** Nur der sichtbare Bereich: alles ausserhalb von <main> wird ignoriert, falls vorhanden. */
function hauptbereich(html) {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : html;
}

function h1Von(html) {
  const m = hauptbereich(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? text(m[1]) : null;
}

function beschreibungVon(html) {
  const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  return m ? text(m[1]) : null;
}

/** Fragen und Antworten aus den sichtbaren .faq-item-Bloecken. */
function faqVon(html) {
  const bereich = hauptbereich(html);
  const treffer = [...bereich.matchAll(/<div class="faq-item">([\s\S]*?)<\/div>\s*<\/div>/g)];
  const paare = [];
  for (const t of treffer) {
    const roh = t[1];
    const f = roh.match(/<span class="faq-q-text">([\s\S]*?)<\/span>/);
    const a = roh.match(/<div class="faq-answer">([\s\S]*?)$/);
    if (!f || !a) continue;
    const frage = text(f[1]);
    const antwort = text(a[1]);
    if (frage && antwort) paare.push({ frage, antwort });
  }
  return paare;
}

/* ---------- Bausteine ---------- */

const ORG = CONFIG.organisation;

function organisationKnoten() {
  return { '@type': 'Organization', '@id': `${BASIS}/#organisation`, name: ORG.name, url: ORG.url };
}

function localBusiness() {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HVACBusiness'],
    '@id': `${BASIS}/#localbusiness`,
    name: ORG.name,
    url: ORG.url,
    logo: ORG.logo,
    image: ORG.logo,
    telephone: ORG.telefon,
    email: ORG.email,
    description: 'Meisterbetrieb für Wärmepumpen in der Region Hannover.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: ORG.strasse,
      postalCode: ORG.plz,
      addressLocality: ORG.ort,
      addressRegion: ORG.region,
      addressCountry: ORG.land,
    },
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Region Hannover' },
      { '@type': 'City', name: 'Hannover' },
    ],
  };
}

/**
 * BreadcrumbList, gelesen aus der SICHTBAREN Pfadzeile.
 * Ohne sichtbare Pfadzeile wird nichts ausgezeichnet. Google verlangt, dass
 * strukturierte Daten den sichtbaren Seiteninhalt abbilden; eine erfundene
 * Brotkrume waere ein Richtlinienverstoss.
 */
function brotkrume(slug, html) {
  const bereich = hauptbereich(html);
  const m = bereich.match(/<div class="brotkrume"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) return null;
  const roh = m[1];
  const stufen = [];
  for (const t of roh.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    stufen.push({ url: t[1], name: text(t[2]) });
  }
  const aktuell = roh.match(/<span aria-current="page"[^>]*>([\s\S]*?)<\/span>/);
  if (aktuell) stufen.push({ url: `/${slug}`, name: text(aktuell[1]) });
  if (stufen.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${BASIS}/${slug}#breadcrumb`,
    itemListElement: stufen.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.name,
      item: s.url === '/' ? `${BASIS}/` : `${BASIS}${s.url}`,
    })),
  };
}

function faqSeite(slug, paare) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASIS}/${slug}#faq`,
    mainEntity: paare.map((p) => ({
      '@type': 'Question',
      name: p.frage,
      acceptedAnswer: { '@type': 'Answer', text: p.antwort },
    })),
  };
}

const NEUER_ZUSTAND = {};

function artikel(slug, html) {
  const kopf = h1Von(html);
  const besch = beschreibungVon(html);
  if (!kopf) return null;
  // Fingerabdruck ueber genau das, was ausgezeichnet wird, nicht ueber die ganze Datei.
  const fingerabdruck = createHash('sha256')
    .update(`${kopf} | ${besch || ''} | ${text(hauptbereich(html))}`)
    .digest('hex')
    .slice(0, 16);
  const geaendertAm = letzteAenderung(slug, fingerabdruck);
  NEUER_ZUSTAND[slug] = { fingerabdruck, dateModified: geaendertAm };
  const knoten = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${BASIS}/${slug}#article`,
    headline: kopf,
    inLanguage: 'de',
    url: `${BASIS}/${slug}`,
    mainEntityOfPage: `${BASIS}/${slug}`,
    datePublished: CONFIG.artikel[slug].datePublished,
    dateModified: geaendertAm,
    author: organisationKnoten(),
    publisher: organisationKnoten(),
  };
  if (besch) knoten.description = besch;
  return knoten;
}

function jobPostings() {
  if (!existsSync(JOBS_SNAPSHOT)) return [];
  const schnappschuss = JSON.parse(readFileSync(JOBS_SNAPSHOT, 'utf8'));
  const rollen = schnappschuss.rollen || [];
  return rollen.map((r) => {
    const beschreibung = [
      r.teaser ? `<p>${r.teaser}</p>` : '',
      liste('Deine Aufgaben', r.aufgaben),
      liste('Dein Profil', r.profil),
      liste('Darauf kannst du dich freuen', r.freuen),
    ]
      .filter(Boolean)
      .join('');
    const knoten = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      '@id': `${BASIS}/karriere#${r.id}`,
      title: `${r.name} (m/w/d)`,
      description: beschreibung,
      identifier: { '@type': 'PropertyValue', name: ORG.name, value: r.id },
      datePosted: schnappschuss.datePosted,
      validThrough: schnappschuss.validThrough,
      employmentType: 'FULL_TIME',
      hiringOrganization: {
        '@type': 'Organization',
        name: ORG.name,
        sameAs: ORG.url,
        logo: ORG.logo,
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          streetAddress: ORG.strasse,
          postalCode: ORG.plz,
          addressLocality: ORG.ort,
          addressRegion: ORG.region,
          addressCountry: ORG.land,
        },
      },
    };
    // Verguetung wird erst ausgewiesen, wenn der Feed sie fuehrt. Kein Platzhalter, keine Schaetzung.
    if (r.verguetung && r.verguetung.wert && r.verguetung.einheit) {
      knoten.baseSalary = {
        '@type': 'MonetaryAmount',
        currency: 'EUR',
        value: {
          '@type': 'QuantitativeValue',
          value: r.verguetung.wert,
          unitText: r.verguetung.einheit,
        },
      };
    }
    return knoten;
  });
}

function liste(titel, eintraege) {
  if (!Array.isArray(eintraege) || eintraege.length === 0) return '';
  const li = eintraege.map((e) => `<li>${String(e)}</li>`).join('');
  return `<p><strong>${titel}</strong></p><ul>${li}</ul>`;
}

/* ---------- Jobs-Feed holen ---------- */

async function jobsHolen() {
  const antwort = await fetch(`${BASIS}/api/jobs`);
  if (!antwort.ok) throw new Error(`Jobs-Feed HTTP ${antwort.status}`);
  const daten = await antwort.json();
  const rollen = Array.isArray(daten) ? daten : daten.jobs || daten.rollen || [];
  if (rollen.length === 0)
    throw new Error('Jobs-Feed leer, Schnappschuss wird NICHT ueberschrieben');
  const heute = new Date().toISOString().slice(0, 10);
  const gueltig = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  const alt = existsSync(JOBS_SNAPSHOT) ? JSON.parse(readFileSync(JOBS_SNAPSHOT, 'utf8')) : {};
  const schnappschuss = {
    _hinweis:
      'Erzeugt aus /api/jobs (Google Sheet Hero_Jobs_Website). NICHT von Hand aendern. Neu holen: npm run build:seo:jobs',
    abgerufenAm: heute,
    datePosted: alt.datePosted || heute,
    validThrough: gueltig,
    rollen,
  };
  writeFileSync(JOBS_SNAPSHOT, JSON.stringify(schnappschuss, null, 2) + '\n');
  console.log(`Jobs-Schnappschuss aktualisiert: ${rollen.length} Rollen, gueltig bis ${gueltig}.`);
}

/* ---------- Einbau ---------- */

function bloeckeFuer(slug, html, datei) {
  const bloecke = [];
  if (CONFIG.localbusiness.includes(slug)) bloecke.push(localBusiness());
  const bk = brotkrume(slug, html);
  if (bk) bloecke.push(bk);
  const faq = faqVon(html);
  if (faq.length > 0) bloecke.push(faqSeite(slug, faq));
  if (CONFIG.artikel[slug]) {
    const a = artikel(slug, html);
    if (a) bloecke.push(a);
  }
  if (slug === 'karriere') bloecke.push(...jobPostings());
  return bloecke;
}

function einbauen(html, bloecke) {
  const inhalt =
    bloecke.length === 0
      ? ''
      : bloecke
          .map(
            (b) =>
              `  <script type="application/ld+json">\n${JSON.stringify(b, null, 2)
                .split('\n')
                .map((z) => '  ' + z)
                .join('\n')}\n  </script>`
          )
          .join('\n');
  const neuerBlock = bloecke.length === 0 ? '' : `${START}\n${inhalt}\n${ENDE}\n`;
  const vorhanden = new RegExp(
    `${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${ENDE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`
  );
  if (vorhanden.test(html)) return html.replace(vorhanden, neuerBlock);
  if (bloecke.length === 0) return html;
  return html.replace(/(\n?)<\/head>/i, `\n${neuerBlock}</head>`);
}

/* ---------- Hauptlauf ---------- */

if (JOBS_HOLEN) {
  await jobsHolen();
}

const seiten = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter((z) => z && !z.includes('/'))
  .sort();

let geaendert = 0;
let mitBloecken = 0;
let knoten = 0;
const abweichungen = [];

for (const datei of seiten) {
  const slug = datei.replace(/\.html$/, '');
  const pfad = join(ROOT, datei);
  const alt = readFileSync(pfad, 'utf8');
  const bloecke = bloeckeFuer(slug === 'index' ? 'index' : slug, alt, datei);
  const neu = einbauen(alt, bloecke);
  if (bloecke.length > 0) {
    mitBloecken += 1;
    knoten += bloecke.length;
  }
  if (neu !== alt) {
    geaendert += 1;
    abweichungen.push(datei);
    if (!NUR_PRUEFEN) writeFileSync(pfad, neu);
  }
}

// Zustand mitschreiben: er traegt die Fingerabdruecke, aus denen dateModified stammt.
const zustandNeu =
  JSON.stringify(
    {
      _hinweis:
        'Erzeugt von scripts/build-structured-data.mjs. NICHT von Hand aendern. fingerabdruck ist ein Kurz-Hash des ausgezeichneten Inhalts; solange er gleich bleibt, bleibt dateModified stehen.',
      artikel: Object.fromEntries(
        Object.keys(NEUER_ZUSTAND)
          .sort()
          .map((k) => [k, NEUER_ZUSTAND[k]])
      ),
    },
    null,
    2
  ) + '\n';
const zustandAlt = existsSync(ZUSTAND_DATEI) ? readFileSync(ZUSTAND_DATEI, 'utf8') : '';
if (zustandNeu !== zustandAlt) {
  if (NUR_PRUEFEN) {
    geaendert += 1;
    abweichungen.push('scripts/structured-data.state.json');
  } else {
    writeFileSync(ZUSTAND_DATEI, zustandNeu);
  }
}

/**
 * Ratifizierte Sollwerte je Typ. Ohne sie meldet das Gate gruen, wenn eine
 * ganze Gattung still verschwindet. Am 28.07.2026 nachgestellt: ein Rueckbau
 * der Pfadzeile auf <nav> liess alle zwoelf BreadcrumbList wegfallen, das Gate
 * meldete "42 Knoten, 0 Abweichungen" und damit PASS.
 */
const SOLL = { BreadcrumbList: 12, FAQPage: 11, Article: 12, JobPosting: 19 };
const gezaehlt = {};
for (const datei of seiten) {
  const slug = datei.replace(/\.html$/, '');
  for (const b of bloeckeFuer(slug, readFileSync(join(ROOT, datei), 'utf8'), datei)) {
    const typen = Array.isArray(b['@type']) ? b['@type'] : [b['@type']];
    for (const t of typen) gezaehlt[t] = (gezaehlt[t] || 0) + 1;
  }
}
const sollFehler = Object.entries(SOLL).filter(([t, n]) => (gezaehlt[t] || 0) !== n);
if (sollFehler.length) {
  console.error('Sollwert der strukturierten Daten verletzt:');
  sollFehler.forEach(([t, n]) => console.error(`  ${t}: ${gezaehlt[t] || 0}, erwartet ${n}`));
  console.error('Wer die Zahl bewusst aendert, zieht SOLL in diesem Skript mit.');
  process.exit(1);
}

const auto = seiten.filter((d) => readFileSync(join(ROOT, d), 'utf8').includes(START)).length;

if (NUR_PRUEFEN) {
  if (geaendert > 0) {
    console.error(
      `Strukturdaten NICHT aktuell: ${geaendert} Seite(n) weichen ab: ${abweichungen.join(', ')}`
    );
    console.error('Behebung: npm run build:seo');
    process.exit(1);
  }
  console.log(
    `Strukturdaten aktuell: ${auto} Seiten mit Auto-Block, ${knoten} Knoten, ${seiten.length} Seiten geprueft, 0 Abweichungen.`
  );
} else {
  console.log(
    `Strukturdaten erzeugt: ${mitBloecken} Seiten mit Auszeichnung, ${knoten} Knoten, ${geaendert} Datei(en) geschrieben.`
  );
}
