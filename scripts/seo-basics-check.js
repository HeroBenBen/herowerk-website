#!/usr/bin/env node
// Job 10 — SEO-Basics-Check (Pipeline Abschnitt G / T4-1-Checkliste).
// Aufruf: node scripts/seo-basics-check.js <preview-url>
// Prüft: sitemap.xml, robots.txt (+ Sitemap-Verweis), Canonical, Open Graph,
// Twitter Card, Schema.org JSON-LD, Theme-Color Meta.
'use strict';

async function get(url) {
  const resp = await fetch(url, { redirect: 'follow' });
  return { status: resp.status, text: resp.ok ? await resp.text() : '' };
}

async function main() {
  const base = process.argv[2];
  if (!base) {
    console.error('Usage: seo-basics-check.js <url>');
    process.exit(2);
  }
  const origin = new URL(base).origin;
  const errors = [];

  const home = await get(origin + '/');
  if (home.status >= 400) errors.push(`Startseite HTTP ${home.status}`);
  const html = home.text;

  const sitemap = await get(origin + '/sitemap.xml');
  if (sitemap.status >= 400) errors.push(`sitemap.xml nicht erreichbar (HTTP ${sitemap.status})`);

  const robots = await get(origin + '/robots.txt');
  if (robots.status >= 400) errors.push(`robots.txt nicht erreichbar (HTTP ${robots.status})`);
  else if (!/sitemap:/i.test(robots.text)) errors.push('robots.txt ohne Sitemap-Verweis');

  /** @type {[RegExp, string][]} */
  const checks = [
    [/<link[^>]+rel="canonical"/i, 'Canonical-Tag fehlt'],
    [/<meta[^>]+property="og:title"/i, 'og:title fehlt'],
    [/<meta[^>]+property="og:description"/i, 'og:description fehlt'],
    [/<meta[^>]+property="og:image"/i, 'og:image fehlt'],
    [/<meta[^>]+name="twitter:card"/i, 'twitter:card fehlt'],
    [/<script[^>]+type="application\/ld\+json"/i, 'Schema.org JSON-LD fehlt'],
    [/<meta[^>]+name="theme-color"/i, 'theme-color Meta fehlt'],
  ];
  for (const [re, msg] of checks) if (!re.test(html)) errors.push(msg);

  if (errors.length) {
    errors.forEach((e) => console.error(`FAIL: ${e}`));
    process.exit(1);
  }
  console.log('SEO-Basics-Check OK.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
