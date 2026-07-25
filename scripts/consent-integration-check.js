#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.env.CONSENT_CHECK_ROOT || path.join(__dirname, '..'));
const cmpCodeId = 'd94854dc5273c';
const cmpScriptUrl = `https://cdn.consentmanager.net/delivery/autoblocking/${cmpCodeId}.js`;
const cmpDeliveryHost = 'https://a.delivery.consentmanager.net';
const skippedDirectories = new Set(['.git', 'dist-ionos', 'node_modules', 'reports']);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

function listHtml(relativeDirectory = '') {
  const absoluteDirectory = path.join(root, relativeDirectory);
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      return skippedDirectories.has(entry.name) ? [] : listHtml(relativePath);
    }
    return entry.isFile() && entry.name.endsWith('.html') ? [relativePath] : [];
  });
}

function checkCmpPage(relativePath, source) {
  const scriptTags = [...source.matchAll(/<script\b[^>]*>/gi)];
  const cmpTags = scriptTags.filter((match) => match[0].includes(`${cmpCodeId}.js`));
  const defaultPosition = source.indexOf("gtag('consent', 'default'");
  const loaderPosition = source.indexOf('js/consent.js?v=');

  if (cmpTags.length !== 1) {
    errors.push(`${relativePath}: ${cmpTags.length} statt genau 1 CMP-Skript.`);
    return;
  }

  const cmpTag = cmpTags[0];
  const requiredFragments = [
    `src="${cmpScriptUrl}"`,
    'data-cmp-ab="1"',
    'data-cmp-host="a.delivery.consentmanager.net"',
    'data-cmp-cdn="cdn.consentmanager.net"',
    'data-cmp-codesrc="0"',
  ];

  for (const fragment of requiredFragments) {
    if (!cmpTag[0].includes(fragment)) {
      errors.push(`${relativePath}: CMP-Skript enthält nicht ${fragment}.`);
    }
  }
  if (/\b(?:async|defer)\b/i.test(cmpTag[0])) {
    errors.push(`${relativePath}: CMP-Skript darf weder async noch defer sein.`);
  }
  if (scriptTags[0]?.index !== cmpTag.index) {
    errors.push(`${relativePath}: CMP-Autoblocking ist nicht das erste Skript im Dokument.`);
  }
  if (count(source, `${cmpCodeId}.js`) !== 1) {
    errors.push(`${relativePath}: CMP-Code-ID kommt nicht genau einmal vor.`);
  }
  if (count(source, "gtag('consent', 'default'") !== 1) {
    errors.push(`${relativePath}: Consent-Mode-Default kommt nicht genau einmal vor.`);
  }
  if (count(source, 'js/consent.js?v=') !== 1) {
    errors.push(`${relativePath}: lokaler Opt-in-Loader kommt nicht genau einmal vor.`);
  }
  if (!(cmpTag.index < defaultPosition && defaultPosition < loaderPosition)) {
    errors.push(`${relativePath}: Soll-Reihenfolge CMP → Consent-Mode-Default → Loader verletzt.`);
  }
}

function checkCsp(label, policy) {
  const scriptDirective = policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('script-src '));
  const tokens = scriptDirective?.split(/\s+/).slice(1) || [];

  if (!tokens.includes(cmpDeliveryHost)) {
    errors.push(`${label}: ${cmpDeliveryHost} fehlt als exakter Host in script-src.`);
  }
}

const htmlFiles = listHtml().sort();
const topLevelHtmlFiles = htmlFiles.filter((relativePath) => !relativePath.includes(path.sep));
const cmpPages = [];

for (const relativePath of htmlFiles) {
  const source = read(relativePath);
  const containsCmp = source.includes(`${cmpCodeId}.js`);
  if (!relativePath.includes(path.sep) && !containsCmp) {
    errors.push(`${relativePath}: produktive Top-Level-Seite enthält keine CMP-Einbindung.`);
  }
  if (containsCmp) {
    cmpPages.push(relativePath);
    checkCmpPage(relativePath, source);
  }
}

const htaccess = read('.htaccess');
const htaccessPolicy = htaccess.match(/Content-Security-Policy "([^"]+)"/)?.[1];
if (!htaccessPolicy) {
  errors.push('.htaccess: Content-Security-Policy nicht gefunden.');
} else {
  checkCsp('.htaccess', htaccessPolicy);
}

const vercel = JSON.parse(read('vercel.json'));
const vercelPolicy = vercel.headers
  ?.flatMap((entry) => entry.headers || [])
  .find((header) => header.key?.toLowerCase() === 'content-security-policy')?.value;
if (!vercelPolicy) {
  errors.push('vercel.json: Content-Security-Policy nicht gefunden.');
} else {
  checkCsp('vercel.json', vercelPolicy);
}

if (errors.length > 0) {
  console.error(`Consent-Integration FEHLER: ${errors.length}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Consent-Integration OK: ${topLevelHtmlFiles.length} Top-Level-Seiten, ` +
    `${cmpPages.length} CMP-Seiten, 2 CSP-Quellen.`
);
