// ============================================================
// Prüft die Löschung alter Zählerdateien der Rechner-Aufrufgrenze.
// GF-Entscheid 04.10.2026, Vorgang T1143.
//
// Die echte Funktion wird aus api/rechner.php ausgeschnitten und in einem
// eigenen PHP-Lauf gegen temporäre Verzeichnisse gerufen. Die Schnittstelle
// selbst und das echte Laufzeitverzeichnis werden dabei nie ausgeführt oder berührt.
// ============================================================
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rechnerDatei = path.join(repoRoot, 'api', 'rechner.php');
const quelle = fs.readFileSync(rechnerDatei, 'utf8');
const ergebnisse = [];
const musterdName = `${'a'.repeat(64)}.json`;

function pruefe(name, bestanden, detail) {
  ergebnisse.push({ name, bestanden });
  console.log(`${bestanden ? 'PASS' : 'ROT '} ${name}: ${detail}`);
}

function fall(name, pruefung) {
  try {
    const ergebnis = pruefung();
    pruefe(name, ergebnis.bestanden, ergebnis.detail);
  } catch (error) {
    pruefe(name, false, error instanceof Error ? error.message : String(error));
  }
}

function funktionAusschneiden(source) {
  const start = source.indexOf('function rechner_rate_limit_cleanup(');
  if (start === -1) return null;
  const klammer = source.indexOf('{', start);
  if (klammer === -1) return null;
  let tiefe = 0;
  for (let index = klammer; index < source.length; index += 1) {
    if (source[index] === '{') tiefe += 1;
    if (source[index] === '}') tiefe -= 1;
    if (tiefe === 0) return source.slice(start, index + 1);
  }
  return null;
}

function echterBlock(source = quelle) {
  const konstanten = [
    'RECHNER_RATE_LIMIT_CLEANUP_MAX_AGE_SECONDS',
    'RECHNER_RATE_LIMIT_CLEANUP_INTERVAL_SECONDS',
    'RECHNER_RATE_LIMIT_CLEANUP_MARKER_FILE',
    'RECHNER_RATE_LIMIT_CLEANUP_FILE_PATTERN',
  ].map((name) => source.match(new RegExp(`^const ${name} = .+;$`, 'm'))?.[0]);
  const funktion = funktionAusschneiden(source);
  if (konstanten.some((wert) => !wert) || !funktion) return null;
  return `${konstanten.join('\n')}\n\n${funktion}`;
}

const block = echterBlock();
const pruefnamen = [
  'Fall 1: strikt alte Musterdatei wird gelöscht',
  'Fall 2: junge Musterdatei bleibt',
  'Fall 3: eben geschriebene Musterdatei bleibt',
  'Fall 4: fremde Namen, Unterverzeichnis und Verknüpfung bleiben',
  'Fall 5: Merkdatei bremst eine Stunde und erlaubt danach den Lauf',
  'Fall 6: fehlendes und nicht schreibbares Verzeichnis bleiben still',
  'Fall 7: Funktion ist vor HTTP 429 eingehängt und Schwelle ist 604800',
  'Fall 8: belegte Sperre kehrt sofort zurück',
  'Fall 9: Löschfehler verrät weder Pfad noch Dateiname',
  'Rot-Nachweis a: 3650 Tage lassen Fall 1 rot werden',
  'Rot-Nachweis b: ohne Namensprüfung wird Fall 4 rot',
  'Rot-Nachweis c: ohne Stundenbremse wird Fall 5 rot',
  'Rot-Nachweis d: ohne Aufrufzeile wird Fall 7 rot',
  'Rot-Nachweis e: ohne Warnungsunterdrückung wird Fall 9 rot',
];

if (!block) {
  for (const name of pruefnamen) pruefe(name, false, 'Aufräumfunktion oder Konstanten fehlen.');
  console.log(`\n0 von ${pruefnamen.length} Prüfungen grün.`);
  process.exit(1);
}

const wurzel = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-rechner-zaehlerdateien-'));
let nummer = 0;

function neuesVerzeichnis() {
  nummer += 1;
  const verzeichnis = path.join(wurzel, `fall-${nummer}`);
  fs.mkdirSync(verzeichnis);
  return verzeichnis;
}

function schreibeAlt(datei, sekunden) {
  fs.writeFileSync(datei, '{}');
  const zeit = new Date(Date.now() - sekunden * 1000);
  fs.utimesSync(datei, zeit, zeit);
}

function merkdatei(verzeichnis, zeitpunkt) {
  fs.writeFileSync(path.join(verzeichnis, '.cleanup-last-run'), `${zeitpunkt}\n`);
}

function phpLauf(verzeichnis, verwendeterBlock = block) {
  const skript = path.join(wurzel, `lauf-${++nummer}.php`);
  fs.writeFileSync(
    skript,
    `<?php\ndeclare(strict_types=1);\n${verwendeterBlock}\nrechner_rate_limit_cleanup($argv[1]);\n`
  );
  const ergebnis = spawnSync('php', [skript, verzeichnis], { encoding: 'utf8', timeout: 5000 });
  return {
    status: ergebnis.status,
    stdout: ergebnis.stdout ?? '',
    stderr: ergebnis.stderr ?? '',
    error: ergebnis.error,
  };
}

function laufWarStill(ergebnis) {
  return ergebnis.status === 0 && ergebnis.stdout === '' && !ergebnis.error;
}

fall(pruefnamen[0], () => {
  const verzeichnis = neuesVerzeichnis();
  const datei = path.join(verzeichnis, musterdName);
  schreibeAlt(datei, 604800 + 60);
  const lauf = phpLauf(verzeichnis);
  return {
    bestanden: laufWarStill(lauf) && !fs.existsSync(datei),
    detail: lauf.stderr.trim() || 'Datei gelöscht',
  };
});

fall(pruefnamen[1], () => {
  const verzeichnis = neuesVerzeichnis();
  const datei = path.join(verzeichnis, musterdName);
  schreibeAlt(datei, 604800 - 60);
  const lauf = phpLauf(verzeichnis);
  return { bestanden: laufWarStill(lauf) && fs.existsSync(datei), detail: 'Datei bleibt bestehen' };
});

fall(pruefnamen[2], () => {
  const verzeichnis = neuesVerzeichnis();
  const datei = path.join(verzeichnis, musterdName);
  fs.writeFileSync(datei, '{}');
  const lauf = phpLauf(verzeichnis);
  return { bestanden: laufWarStill(lauf) && fs.existsSync(datei), detail: 'Datei bleibt bestehen' };
});

function fremdeObjekte(verzeichnis) {
  const dateien = [`${'b'.repeat(63)}.json`, `${'C'.repeat(64)}.json`, 'notiz.txt'].map((name) =>
    path.join(verzeichnis, name)
  );
  for (const datei of dateien) schreibeAlt(datei, 604800 + 60);
  const unterverzeichnis = path.join(verzeichnis, `${'d'.repeat(64)}.json`);
  fs.mkdirSync(unterverzeichnis);
  schreibeAlt(path.join(unterverzeichnis, musterdName), 604800 + 60);
  const ziel = path.join(wurzel, `ziel-${nummer}.json`);
  schreibeAlt(ziel, 604800 + 60);
  const link = path.join(verzeichnis, `${'e'.repeat(64)}.json`);
  fs.symlinkSync(ziel, link);
  return { dateien, unterverzeichnis, ziel, link };
}

function alleFremdenBleiben(objekte) {
  return [...objekte.dateien, objekte.unterverzeichnis, objekte.ziel, objekte.link].every((datei) =>
    fs.existsSync(datei)
  );
}

fall(pruefnamen[3], () => {
  const verzeichnis = neuesVerzeichnis();
  const objekte = fremdeObjekte(verzeichnis);
  const lauf = phpLauf(verzeichnis);
  return {
    bestanden: laufWarStill(lauf) && alleFremdenBleiben(objekte),
    detail: 'alle fremden Objekte vorhanden',
  };
});

fall(pruefnamen[4], () => {
  const verzeichnis = neuesVerzeichnis();
  const erster = phpLauf(verzeichnis);
  const datei = path.join(verzeichnis, musterdName);
  schreibeAlt(datei, 604800 + 60);
  const zweiter = phpLauf(verzeichnis);
  const gebremst = fs.existsSync(datei);
  merkdatei(verzeichnis, Math.floor(Date.now() / 1000) - 3601);
  const dritter = phpLauf(verzeichnis);
  return {
    bestanden: [erster, zweiter, dritter].every(laufWarStill) && gebremst && !fs.existsSync(datei),
    detail: `zweiter Lauf gebremst=${gebremst}, dritter Lauf löscht=${!fs.existsSync(datei)}`,
  };
});

fall(pruefnamen[5], () => {
  const fehlt = path.join(wurzel, 'fehlt');
  const ohneVerzeichnis = phpLauf(fehlt);
  const nichtSchreibbar = neuesVerzeichnis();
  fs.chmodSync(nichtSchreibbar, 0o500);
  const ohneSchreibrecht = phpLauf(nichtSchreibbar);
  fs.chmodSync(nichtSchreibbar, 0o700);
  return {
    bestanden:
      laufWarStill(ohneVerzeichnis) &&
      laufWarStill(ohneSchreibrecht) &&
      fs.readdirSync(nichtSchreibbar).length === 0,
    detail: 'beide Läufe ohne Ausnahme und Standardausgabe',
  };
});

function einhaengungStimmt(source) {
  const funktionsStart = source.indexOf('function rechner_rate_limit(');
  const aufruf = source.indexOf('rechner_rate_limit_cleanup($directory);', funktionsStart);
  const fail = source.indexOf("rechner_fail(429, 'rate_limit_exceeded');");
  return funktionsStart !== -1 && aufruf > funktionsStart && fail > aufruf;
}

fall(pruefnamen[6], () => {
  const schwelle = /const RECHNER_RATE_LIMIT_CLEANUP_MAX_AGE_SECONDS = 604800;/.test(quelle);
  const eingebaut = einhaengungStimmt(quelle);
  return {
    bestanden: schwelle && eingebaut,
    detail: `Schwelle=${schwelle}, Einhängung=${eingebaut}`,
  };
});

fall(pruefnamen[7], () => {
  const verzeichnis = neuesVerzeichnis();
  merkdatei(verzeichnis, Math.floor(Date.now() / 1000) - 3601);
  const datei = path.join(verzeichnis, musterdName);
  schreibeAlt(datei, 604800 + 60);
  const halterSkript = path.join(wurzel, 'sperre.php');
  const signal = path.join(wurzel, 'sperre-bereit');
  fs.writeFileSync(
    halterSkript,
    "<?php $h=fopen($argv[1], 'c+'); flock($h, LOCK_EX); touch($argv[2]); sleep(5);"
  );
  const halter = spawn('php', [halterSkript, path.join(verzeichnis, '.cleanup-last-run'), signal], {
    stdio: 'ignore',
  });
  const warteArray = new Int32Array(new SharedArrayBuffer(4));
  const warteBis = Date.now() + 2000;
  while (!fs.existsSync(signal) && Date.now() < warteBis) Atomics.wait(warteArray, 0, 0, 10);
  if (!fs.existsSync(signal)) {
    halter.kill();
    throw new Error('Sperrprozess wurde nicht bereit');
  }
  const start = Date.now();
  const lauf = phpLauf(verzeichnis);
  const dauer = Date.now() - start;
  halter.kill();
  return {
    bestanden: laufWarStill(lauf) && dauer < 1000 && fs.existsSync(datei),
    detail: `Rückkehr nach ${dauer} ms, Datei bleibt`,
  };
});

function loeschfehler(verwendeterBlock = block) {
  const verzeichnis = neuesVerzeichnis();
  merkdatei(verzeichnis, Math.floor(Date.now() / 1000) - 3601);
  const datei = path.join(verzeichnis, musterdName);
  schreibeAlt(datei, 604800 + 60);
  fs.chmodSync(verzeichnis, 0o500);
  const lauf = phpLauf(verzeichnis, verwendeterBlock);
  fs.chmodSync(verzeichnis, 0o700);
  return { verzeichnis, datei, lauf };
}

fall(pruefnamen[8], () => {
  const { verzeichnis, datei, lauf } = loeschfehler();
  const geheim = lauf.stderr.includes(verzeichnis) || lauf.stderr.includes(path.basename(datei));
  return {
    bestanden:
      laufWarStill(lauf) &&
      lauf.stderr.includes('HeroWerk Rechner: rate_limit_cleanup_failed') &&
      !geheim,
    detail: lauf.stderr.trim() || 'Fehlervermerk fehlt',
  };
});

fall(pruefnamen[9], () => {
  const mutation = block.replace('604800;', '315360000;');
  const verzeichnis = neuesVerzeichnis();
  const datei = path.join(verzeichnis, musterdName);
  schreibeAlt(datei, 604800 + 60);
  phpLauf(verzeichnis, mutation);
  return {
    bestanden: fs.existsSync(datei),
    detail: 'mutierte Schwelle verhindert die Soll-Löschung',
  };
});

fall(pruefnamen[10], () => {
  const mutation = block.replace(
    'if (preg_match(RECHNER_RATE_LIMIT_CLEANUP_FILE_PATTERN, $entry) !== 1) {',
    'if (false) {'
  );
  const verzeichnis = neuesVerzeichnis();
  const objekte = fremdeObjekte(verzeichnis);
  phpLauf(verzeichnis, mutation);
  return {
    bestanden: !alleFremdenBleiben(objekte),
    detail: 'Mutation löscht mindestens ein fremdes Objekt',
  };
});

fall(pruefnamen[11], () => {
  const mutation = block.replace('3600;', '0;');
  const verzeichnis = neuesVerzeichnis();
  phpLauf(verzeichnis, mutation);
  const datei = path.join(verzeichnis, musterdName);
  schreibeAlt(datei, 604800 + 60);
  phpLauf(verzeichnis, mutation);
  return {
    bestanden: !fs.existsSync(datei),
    detail: 'Mutation räumt beim zweiten Lauf erneut auf',
  };
});

fall(pruefnamen[12], () => {
  const ohneAufruf = quelle.replace(/\n\s*rechner_rate_limit_cleanup\(\$directory\);/, '');
  return {
    bestanden: !einhaengungStimmt(ohneAufruf),
    detail: 'Einhängungswache erkennt die entfernte Aufrufzeile',
  };
});

fall(pruefnamen[13], () => {
  const mutation = block.replace('@unlink(', 'unlink(');
  const { verzeichnis, datei, lauf } = loeschfehler(mutation);
  const verraten = lauf.stderr.includes(verzeichnis) || lauf.stderr.includes(path.basename(datei));
  return { bestanden: verraten, detail: 'PHP-Warnung verrät bei der Mutation Pfad oder Dateiname' };
});

const rot = ergebnisse.filter((ergebnis) => !ergebnis.bestanden);
console.log(`\n${ergebnisse.length - rot.length} von ${ergebnisse.length} Prüfungen grün.`);
fs.rmSync(wurzel, { recursive: true, force: true });
if (rot.length) process.exit(1);
