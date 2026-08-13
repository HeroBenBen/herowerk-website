const baseUrl = (process.env.PRUEFSERVER_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');

const expectations = [
  ['Startseite', '/', 200],
  ['Rechner-Unterseite', '/rechner', 200],
  ['Förder-Unterseite', '/foerderung', 200],
  ['privates Zeitplan-Skript', '/api/werte-auffrischen.php', 403],
];

let failed = false;

for (const [name, pathname, expectedStatus] of expectations) {
  const response = await fetch(baseUrl + pathname, { redirect: 'manual' });
  const passed = response.status === expectedStatus;
  console.log(
    `${passed ? 'PASS' : 'ROT '} ${name}: HTTP ${response.status}, erwartet ${expectedStatus}`
  );
  failed ||= !passed;
}

if (failed) {
  console.error(
    'FEHLER: Die geänderte .htaccess schützt nicht gezielt. Die Sperre darf nicht ausgeliefert werden.'
  );
  process.exit(1);
}

console.log('ERGEBNIS: GRÜN, drei öffentliche Seiten erreichbar und Zeitplan-Skript gesperrt.');
