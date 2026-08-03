#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.env.CONSENT_CHECK_ROOT || path.join(__dirname, '..'));
const cmpCodeId = 'd94854dc5273c';
const cmpScriptUrl = 'https://cdn.consentmanager.net/delivery/autoblocking/' + cmpCodeId + '.js';
const cmpDeliveryHost = 'https://a.delivery.consentmanager.net';
const cmpCdnHost = 'https://cdn.consentmanager.net';
const guardMarker = '<!-- ConsentManager nur auf den beiden oeffentlichen HeroWerk-Domains -->';
const expectedGuard = [
  '  ' + guardMarker,
  '  <script>',
  '    (function () {',
  "      var host = window.location.hostname.toLowerCase().replace(/\\.$/, '');",
  "      var productionHosts = ['herowerk.de', 'www.herowerk.de'];",
  '',
  '      if (productionHosts.indexOf(host) === -1) return;',
  '',
  '      document.write(',
  '        \'<script type="text/javascript" data-cmp-ab="1"\' +',
  '          \' src="https://cdn.consentmanager.net/delivery/autoblocking/d94854dc5273c.js"\' +',
  '          \' data-cmp-host="a.delivery.consentmanager.net"\' +',
  '          \' data-cmp-cdn="cdn.consentmanager.net"\' +',
  "          ' data-cmp-codesrc=\"0\"></' + 'script>'",
  '      );',
  '    }());',
  '  </script>',
].join('\n');
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

function listTopLevelHtml() {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => entry.name)
    .sort();
}

function checkCmpPage(relativePath, source) {
  const guardMarkerCount = count(source, guardMarker);
  const exactGuardCount = count(source, expectedGuard);
  const firstScriptPosition = source.search(/<script\b/i);
  const guardPosition = source.indexOf(expectedGuard);
  const guardScriptPosition = guardPosition === -1 ? -1 : source.indexOf('<script>', guardPosition);
  const defaultPosition = source.indexOf("gtag('consent', 'default'");
  const loaderPosition = source.indexOf('js/consent.js?v=');

  if (guardMarkerCount !== 1) {
    errors.push(relativePath + ': ' + guardMarkerCount + ' statt genau 1 ConsentManager-Wächter.');
  }
  if (exactGuardCount !== 1) {
    errors.push(relativePath + ': ConsentManager-Wächter fehlt oder weicht von der Vorgabe ab.');
  }

  const sourceWithoutGuard = exactGuardCount === 1 ? source.replace(expectedGuard, '') : source;
  if (sourceWithoutGuard.includes(cmpScriptUrl)) {
    errors.push(relativePath + ': ungeschützter ConsentManager-Skriptaufruf gefunden.');
  }
  if (firstScriptPosition !== guardScriptPosition) {
    errors.push(relativePath + ': ConsentManager-Wächter ist nicht das erste Skript im Dokument.');
  }
  if (count(source, cmpCodeId + '.js') !== 1) {
    errors.push(relativePath + ': CMP-Code-ID kommt nicht genau einmal vor.');
  }
  if (count(source, "gtag('consent', 'default'") !== 1) {
    errors.push(relativePath + ': Consent-Mode-Default kommt nicht genau einmal vor.');
  }
  if (count(source, 'js/consent.js?v=') !== 1) {
    errors.push(relativePath + ': lokaler Opt-in-Loader kommt nicht genau einmal vor.');
  }
  if (!(guardScriptPosition < defaultPosition && defaultPosition < loaderPosition)) {
    errors.push(
      relativePath + ': Soll-Reihenfolge Wächter → Consent-Mode-Default → Loader verletzt.'
    );
  }
}

function checkCsp(label, policy) {
  const scriptDirective = policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('script-src '));
  const scriptTokens = scriptDirective?.split(/\s+/).slice(1) || [];
  const styleDirective = policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('style-src '));
  const styleTokens = styleDirective?.split(/\s+/).slice(1) || [];

  if (!scriptTokens.includes(cmpDeliveryHost)) {
    errors.push(label + ': ' + cmpDeliveryHost + ' fehlt als exakter Host in script-src.');
  }
  if (!styleTokens.includes(cmpCdnHost)) {
    errors.push(label + ': ' + cmpCdnHost + ' fehlt als exakter Host in style-src.');
  }
}

const topLevelHtmlFiles = listTopLevelHtml();
console.log('Consent-Zählprobe: ' + topLevelHtmlFiles.length + ' öffentliche Stammseiten.');

if (topLevelHtmlFiles.length === 0) {
  errors.push('Keine öffentliche HTML-Seite im Projektstamm gefunden.');
}
for (const relativePath of topLevelHtmlFiles) {
  checkCmpPage(relativePath, read(relativePath));
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
  console.error('Consent-Integration FEHLER: ' + errors.length);
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log(
  'Consent-Integration OK: ' +
    topLevelHtmlFiles.length +
    ' öffentliche Stammseiten mit Wächter, keine ungeschützte Einbindung, 2 CSP-Quellen.'
);
