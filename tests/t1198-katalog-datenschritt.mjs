import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const pfad = 'apps-script/rechner-backend/datenschritt-t1198-geraetekatalog.gs';
const quelle = fs.readFileSync(pfad, 'utf8');

assert.match(quelle, /dryRun === undefined \? true/);
assert.match(quelle, /Wolf Bericht Z\. 76, 110/);
assert.match(quelle, /Wolf Bericht Z\. 78, 112/);
assert.match(quelle, /Wolf Bericht Z\. 80, 114/);
assert.match(quelle, /Wolf Bericht Z\. 81, 115/);
assert.match(quelle, /Vaillant CSV Z\. 15\/171/);
assert.match(quelle, /Vaillant CSV Z\. 133\/313/);
assert.match(quelle, /Kaskadenumschaltung des Vaillant-Werkzeugs/);
assert.match(quelle, /P3/);

const modelle = [
  'Vaillant VWL 205/8.1 A S2 Q',
  'Wolf CHA-20/24',
  'Vaillant VWL 75/7.1 A',
  'Wolf CHA-07',
  'Vaillant VWL 35/8.1 A',
  'Wolf CHA-16/20',
  'Vaillant VWL 55/8.1 A',
  'Vaillant VWL 125/8.1 A',
  'Wolf CHA-10',
  'Vaillant VWL 105/8.1 A',
  'Vaillant VWL 55/7.1 A',
  'Vaillant VWL 75/8.1 A',
  'Vaillant VWL 115/7.1 A',
];
const sollwerte = {
  'Wolf CHA-07': ['', '', 11.5, 12],
  'Wolf CHA-10': [14, 14.5, 16.5, 17.5],
  'Wolf CHA-16/20': ['', '', 23, 23.5],
  'Wolf CHA-20/24': ['', '', 26.5, 27],
  'Vaillant VWL 35/8.1 A': ['', '', 7, 7],
  'Vaillant VWL 55/8.1 A': ['', '', 9, 10],
  'Vaillant VWL 75/8.1 A': ['', '', 13, 14],
  'Vaillant VWL 105/8.1 A': ['', '', 15, 16],
  'Vaillant VWL 125/8.1 A': ['', '', 18, 20],
  'Vaillant VWL 55/7.1 A': ['', '', 8, 9],
  'Vaillant VWL 75/7.1 A': ['', '', 11, 13],
  'Vaillant VWL 115/7.1 A': ['', '', 16, 18],
  'Vaillant VWL 205/8.1 A S2 Q': ['', '', 26, 23],
};

function baueUmgebung({ fremdwert = false, rueckleseAlsText = false } = {}) {
  const werte = Array.from({ length: 30 }, () => Array(38).fill(''));
  werte[7][0] = 'Marke';
  werte[7][1] = 'Modell';
  werte[7][2] = 'Kaskade';
  modelle.forEach((modell, index) => {
    werte[8 + index][0] = modell.startsWith('Wolf') ? 'Wolf' : 'Vaillant';
    werte[8 + index][1] = modell;
    werte[8 + index][2] = 'N';
  });
  werte[25][0] = 'Wolf';
  werte[25][1] = '2× Wolf CHA-10 (Kaskade)';
  werte[25][2] = 'J';
  if (fremdwert) werte[modelle.indexOf('Wolf CHA-10') + 8][34] = 13;

  const protokoll = [];
  let archivname = null;
  let kopien = 0;
  let flushes = 0;
  let wurdeGeschrieben = false;
  const bereich = (zeile, spalte, zeilen, spalten) => ({
    getValues() {
      return Array.from({ length: zeilen }, (_, z) =>
        Array.from({ length: spalten }, (_, s) => werte[zeile - 1 + z][spalte - 1 + s])
      );
    },
    setValues(neu) {
      wurdeGeschrieben = true;
      neu.forEach((reihe, z) =>
        reihe.forEach((wert, s) => {
          werte[zeile - 1 + z][spalte - 1 + s] = wert;
        })
      );
    },
    getValue() {
      const wert = werte[zeile - 1][spalte - 1];
      return rueckleseAlsText && wurdeGeschrieben && typeof wert === 'number' ? String(wert) : wert;
    },
    setValue(wert) {
      wurdeGeschrieben = true;
      werte[zeile - 1][spalte - 1] = wert;
    },
    getA1Notation() {
      return `R${zeile}C${spalte}`;
    },
  });
  const blatt = {
    getName: () => 'Geräte_Katalog',
    getDataRange: () => bereich(1, 1, werte.length, werte[0].length),
    getRange: bereich,
    copyTo() {
      kopien += 1;
      return { setName: (name) => (archivname = name) };
    },
  };
  const mappe = { getSheetByName: (name) => (name === 'Geräte_Katalog' ? blatt : null) };
  const sandbox = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => mappe,
      flush: () => (flushes += 1),
    },
    Logger: { log: (text) => protokoll.push(String(text)) },
    Utilities: { formatDate: () => '20261013-220000' },
    Session: { getScriptTimeZone: () => 'Europe/Berlin' },
    Date,
    JSON,
    Object,
    Array,
    String,
    Number,
    Error,
  };
  vm.createContext(sandbox);
  vm.runInContext(quelle, sandbox, { filename: pfad });
  return {
    ausfuehren: sandbox.t1198GeraeteKatalogAktualisieren,
    werte,
    protokoll,
    zustand: () => ({ archivname, kopien, flushes }),
  };
}

const trocken = baueUmgebung();
trocken.ausfuehren();
assert.deepEqual(trocken.zustand(), { archivname: null, kopien: 0, flushes: 0 });
assert(trocken.protokoll.some((zeile) => zeile.includes('TROCKENLAUF')));

const echt = baueUmgebung();
echt.ausfuehren(false);
assert.equal(echt.zustand().kopien, 1, 'vor dem Schreiben wird genau eine Archivkopie angelegt');
assert.match(echt.zustand().archivname, /^Geräte_Katalog_Archiv_20261013-220000$/);
assert.equal(echt.zustand().flushes, 1);
assert.deepEqual(echt.werte[7].slice(34, 38), [
  'Empfehlung bis kW W55',
  'Empfehlung bis kW W35',
  'Herstellerfreigabe bis kW W55',
  'Herstellerfreigabe bis kW W35',
]);
for (const [modell, erwartet] of Object.entries(sollwerte)) {
  const zielzeile = modelle.indexOf(modell) + 8;
  assert.deepEqual(echt.werte[zielzeile].slice(34, 38), erwartet, modell);
  for (const wert of echt.werte[zielzeile].slice(34, 38)) {
    assert(wert === '' || typeof wert === 'number', `${modell}: Werte sind Zahlen oder leer`);
  }
}
assert.deepEqual(echt.werte[25].slice(34, 38), ['', '', '', ''], 'keine Kaskadenwerte');
assert(echt.protokoll.some((zeile) => zeile.includes('Altwert')));

const konflikt = baueUmgebung({ fremdwert: true });
assert.throws(() => konflikt.ausfuehren(false), /anderen Wert/);
assert.equal(konflikt.zustand().kopien, 0, 'Konflikt bricht vor Archiv und Schreiben ab');

const typfehler = baueUmgebung({ rueckleseAlsText: true });
assert.throws(() => typfehler.ausfuehren(false), /Rückleseabweichung/);

console.log('PASS T1198-Datenschritt: Trockenlauf, Archiv, Zielsuche, Konflikt und typgleiche Rückleseprobe.');
