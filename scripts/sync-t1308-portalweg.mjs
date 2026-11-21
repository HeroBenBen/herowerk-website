import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = JSON.parse(
  fs.readFileSync(path.join(root, 'scripts/t1308-portalweg-vorlage.json'))
);
const check = process.argv.includes('--check');
const asset = (file) =>
  `${file}?v=${createHash('sha256')
    .update(fs.readFileSync(path.join(root, file)))
    .digest('hex')
    .slice(0, 10)}`;
const navPattern = /<nav aria-label="Hauptnavigation">[\s\S]*?<\/nav>/;
const links =
  '<a href="https://portal.herowerk.de/">Kundenportal</a>\n          <a href="https://bewerbung.herowerk.de/">Bewerberportal</a>';
const candidates = new Map(
  fs
    .readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')])
);
// Die zwei neuen Seiten erben Gestaltung und normale Fußzeile, keine Startseiten-Laufzeit.
const base = execFileSync('git', ['show', '4d6b36c1b464175406383ebe758aed80035fc365:index.html'], {
  cwd: root,
  encoding: 'utf8',
});
for (const portal of ['kunden', 'bewerber']) {
  const file = `${portal}portal.html`;
  const title = portal === 'kunden' ? 'Kundenportal' : 'Bewerberportal';
  const description =
    portal === 'kunden'
      ? 'So funktioniert das HeroWerk Kundenportal: Angebot, Termine, Förderung und Unterlagen an einem Ort.'
      : 'So funktioniert das HeroWerk Bewerberportal.';
  const url = `https://www.herowerk.de/${portal}portal`;
  let html = base.replace(/<main id="main-content"[\s\S]*?<\/main>/, template[portal]);
  html = html.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/g, (all, attrs) =>
    /src="js\/theme\.js\?/.test(attrs) ? all : ''
  );
  html = html.replace(/<title>.*?<\/title>/, `<title>${title} | HeroWerk</title>`);
  html = html.replace(
    /(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*(")/g,
    `$1${description}$2`
  );
  html = html.replace(
    /(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*(")/g,
    `$1${title} | HeroWerk$2`
  );
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(/\s*<!-- STRUKTURDATEN:AUTO (?:ANFANG[^>]*|ENDE) -->/g, '');
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace('<body>', '<body data-portal-erklaerseite>');
  html = html.replace(
    '</head>',
    `  <link rel="stylesheet" href="${asset('css/portalvorschau.css')}">\n</head>`
  );
  html = html.replace(
    '</body>',
    `  <script src="${asset('js/portalvorschau.js')}" defer></script>\n</body>`
  );
  candidates.set(file, html);
}
let navCount = 0;
let changed = 0;
for (const [file, source] of candidates) {
  let html = source;
  if (navPattern.test(html)) {
    navCount++;
    html = html.replace(navPattern, template.nav);
    html = html.replace(/^[ \t]*<script src="js\/portalweg\.js[^\"]*" defer><\/script>\n?/gm, '');
    html = html.replace(
      '</body>',
      `  <script src="${asset('js/portalweg.js')}" defer></script>\n</body>`
    );
  }
  if (!html.includes('<!-- T1308 Unternehmenslinks -->')) {
    const marker = '<!-- T1308 Unternehmenslinks -->';
    if (html.includes('<h2>Unternehmen</h2>')) {
      html = html.replace(
        '<h2>Unternehmen</h2>',
        `<h2>Unternehmen</h2>\n          ${marker}${links}`
      );
    } else {
      const group = `<div class="portal-footer">${marker}<h2>Unternehmen</h2>${links}</div>`;
      if (html.includes('</footer>')) html = html.replace('</footer>', `${group}</footer>`);
      else if (html.includes('<nav class="legal-footer"'))
        html = html.replace(
          '<nav class="legal-footer"',
          `<footer>${group}</footer>\n  <nav class="legal-footer"`
        );
      else throw new Error(`${file}: unbekannter Fußzeilenaufbau`);
    }
  }
  const footerMarker = '<!-- T1308 Unternehmenslinks -->';
  if (
    !html.includes(footerMarker + links) &&
    !html.includes(footerMarker + '<h2>Unternehmen</h2>' + links)
  )
    throw new Error(`${file}: Portal-Fußzeilenblock fehlt oder weicht ab`);
  html = html.replace(/^[ \t]*<link rel="stylesheet" href="css\/portalweg\.css[^\"]*">\n?/gm, '');
  html = html.replace(
    '</head>',
    `  <link rel="stylesheet" href="${asset('css/portalweg.css')}">\n</head>`
  );
  if (file === 'index.html')
    html = html.replace(
      /<div class="usp-text"><h2>Kundenportal<\/h2>[\s\S]*?<\/div>/,
      template.usp
    );
  if (file === 'karriere.html' && !html.includes('<strong>Schon beworben?</strong>'))
    html = html.replace('</main>', `${template.jobs}\n</main>`);
  const previous = fs.existsSync(path.join(root, file))
    ? fs.readFileSync(path.join(root, file), 'utf8')
    : '';
  if (previous !== html) {
    if (check) throw new Error(`T1308-Drift: ${file}`);
    fs.writeFileSync(path.join(root, file), html);
    changed++;
  }
}
if (navCount < 25) throw new Error(`Hauptnavigation fehlt: ${navCount} statt mindestens 25`);
console.log(
  `T1308: ${navCount} Hauptnavigationen, ${candidates.size} Fußzeilen, ${changed} Dateien geändert.`
);
