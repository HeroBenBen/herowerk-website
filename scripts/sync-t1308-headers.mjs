import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = execFileSync(
  'git',
  ['show', '4d6b36c1b464175406383ebe758aed80035fc365:.htaccess'],
  { cwd: root, encoding: 'utf8' }
);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'vorschau/manifest.json')));
const originalLine = baseline
  .split('\n')
  .find((line) => line.includes('Header always set Content-Security-Policy'));
const policy = originalLine.match(/Content-Security-Policy "([^"]+)"/)[1];
const legacy = originalLine.match(/"expr=!\((.*)\)"$/)[1];
const explain =
  '%{REQUEST_URI} =~ m#^/(kundenportal|bewerberportal)(\\.html)?$# && %{THE_REQUEST} =~ m#^[^[:space:]]+[[:space:]]+/(kundenportal|bewerberportal)(\\?[^[:space:]]*)?[[:space:]]+HTTP/[0-9.]+$#';
const document = (file) =>
  `%{REQUEST_URI} =~ m#^/vorschau/${file.replaceAll('.', '\\.')}\\z# && %{THE_REQUEST} =~ m#^[^[:space:]]+[[:space:]]+/vorschau/${file.replaceAll('.', '\\.')}[?[:space:]]#`;
const documents = manifest.documents.map((d) => `(${document(d.file)})`).join(' || ');
const headers = [
  `  Header always set Content-Security-Policy "${policy}" "expr=!(${legacy}) && !(${explain}) && !(${documents})"`,
  `  Header always set Content-Security-Policy "${policy.replace('frame-src ', "frame-src 'self' ")}" "expr=${explain}"`,
  ...manifest.documents.map(
    (d) => `  Header always set Content-Security-Policy "${d.csp}" "expr=${document(d.file)}"`
  ),
  `  Header always set Content-Type "text/html; charset=utf-8" "expr=${documents}"`,
  `  Header always set X-Robots-Tag "noindex, nofollow" "expr=${documents}"`,
];
let next = baseline.replace(originalLine, headers.join('\n'));
next = next.replace(
  '  Header always set X-Frame-Options "DENY"',
  `  Header always set X-Frame-Options "DENY" "expr=!(${documents})"\n  Header always set X-Frame-Options "SAMEORIGIN" "expr=${documents}"`
);
next = next.replace(
  '  # Sichtbare .html-URL',
  `  # T1308: exakt sechs Dokumente behalten ihre Dateiadresse.\n  RewriteRule ^vorschau/(kunden|bewerber)-(login|mail|dashboard)\\.html$ - [END]\n  RewriteRule ^vorschau/(kunden|bewerber)-(login|mail|dashboard)/?$ - [R=404,L]\n  RewriteRule ^(kundenportal|bewerberportal)/$ /$1 [R=301,L]\n\n  # Sichtbare .html-URL`
);
next += `\n# T1308: nur neue öffentliche Fonts und SVG-Masken für die opake Frame-Herkunft lesbar.\n<IfModule mod_headers.c>\n  Header always set Access-Control-Allow-Origin "*" "expr=%{REQUEST_URI} =~ m#^/vorschau/assets/[a-f0-9]{64}\\.(woff2|svg)$#"\n</IfModule>\n`;
const file = path.join(root, '.htaccess');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(file, 'utf8') !== next) throw new Error('T1308-Headerdrift');
} else fs.writeFileSync(file, next);
console.log('T1308: pfadgebundene Header vollständig synchron.');
