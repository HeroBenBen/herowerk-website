/**
 * T1198, P0: einmaliger Datenschritt für Geräte_Katalog.
 *
 * Nicht automatisch ausführen. Ohne Argument ist dies immer ein Trockenlauf.
 * Für den freigegebenen Schreiblauf ausdrücklich
 * t1198GeraeteKatalogAktualisieren(false) aufrufen.
 *
 * Befund, NICHT ändern: Vaillant VWL 205/8.1 (aroTHERM perform) hat eine
 * Herstellerfreigabe von 26 kW bei W55, aber nur 23 kW bei W35. Vermutlich
 * Kaskadenumschaltung des Vaillant-Werkzeugs, belegt aus der Messreihe vom
 * 16.08.2026; in P3 prüfen.
 */
function t1198GeraeteKatalogAktualisieren(dryRun) {
  const istTrockenlauf = dryRun === undefined ? true : Boolean(dryRun);
  const koepfe = [
    'Empfehlung bis kW W55',
    'Empfehlung bis kW W35',
    'Herstellerfreigabe bis kW W55',
    'Herstellerfreigabe bis kW W35'
  ];

  const zielwerte = {
    // Empfehlung leer; Freigabe 11,5/12,0: Wolf Bericht Z. 76, 110.
    'Wolf CHA-07': ['', '', 11.5, 12],
    // Empfehlung 14,0/14,5: Entscheid Z. 37; Freigabe 16,5/17,5: Wolf Bericht Z. 78, 112.
    'Wolf CHA-10': [14, 14.5, 16.5, 17.5],
    // Empfehlung leer; Freigabe 23,0/23,5: Wolf Bericht Z. 80, 114.
    'Wolf CHA-16/20': ['', '', 23, 23.5],
    // Empfehlung leer; Freigabe 26,5/27,0: Wolf Bericht Z. 81, 115.
    'Wolf CHA-20/24': ['', '', 26.5, 27],
    // Empfehlung leer; Freigabe 7/7: Vaillant CSV Z. 15/171.
    'Vaillant VWL 35/8.1 A': ['', '', 7, 7],
    // Empfehlung leer; Freigabe 9/10: Vaillant CSV Z. 27/193.
    'Vaillant VWL 55/8.1 A': ['', '', 9, 10],
    // Empfehlung leer; Freigabe 13/14: Vaillant CSV Z. 50/226.
    'Vaillant VWL 75/8.1 A': ['', '', 13, 14],
    // Empfehlung leer; Freigabe 15/16: Vaillant CSV Z. 60/242.
    'Vaillant VWL 105/8.1 A': ['', '', 15, 16],
    // Empfehlung leer; Freigabe 18/20: Vaillant CSV Z. 77/279.
    'Vaillant VWL 125/8.1 A': ['', '', 18, 20],
    // Empfehlung leer; Freigabe 8/9: Vaillant CSV Z. 24/188.
    'Vaillant VWL 55/7.1 A': ['', '', 8, 9],
    // Empfehlung leer; Freigabe 11/13: Vaillant CSV Z. 42/220.
    'Vaillant VWL 75/7.1 A': ['', '', 11, 13],
    // Empfehlung leer; Freigabe 16/18: Vaillant CSV Z. 69/263.
    'Vaillant VWL 115/7.1 A': ['', '', 16, 18],
    // Empfehlung leer; Freigabe 26/23: Vaillant CSV Z. 133/313. Auffälligkeit siehe Befund oben.
    'Vaillant VWL 205/8.1 A S2 Q': ['', '', 26, 23]
  };

  const mappe = SpreadsheetApp.getActiveSpreadsheet();
  const blatt = mappe.getSheetByName('Geräte_Katalog');
  if (!blatt) throw new Error('Blatt Geräte_Katalog fehlt.');

  const daten = blatt.getDataRange().getValues();
  let kopfIndex = -1;
  let modellSpalte = -1;
  for (let zeile = 0; zeile < daten.length; zeile += 1) {
    const normalisiert = daten[zeile].map(function (wert) {
      return String(wert == null ? '' : wert).trim().toLowerCase();
    });
    if (
      normalisiert.indexOf('marke') >= 0
      && normalisiert.indexOf('modell') >= 0
      && normalisiert.indexOf('kaskade') >= 0
    ) {
      kopfIndex = zeile;
      modellSpalte = normalisiert.indexOf('modell');
      break;
    }
  }
  if (kopfIndex < 0) throw new Error('Kopfzeile mit Marke, Modell und Kaskade fehlt.');
  if (kopfIndex + 1 !== 8) throw new Error('Kopfzeile liegt nicht in Zeile 8; kein Schreiben außerhalb AI8:AL8.');

  const zielzeilen = {};
  Object.keys(zielwerte).forEach(function (modell) {
    const fundstellen = [];
    for (let zeile = kopfIndex + 1; zeile < daten.length; zeile += 1) {
      if (String(daten[zeile][modellSpalte]).trim() === modell) fundstellen.push(zeile + 1);
    }
    if (fundstellen.length !== 1) {
      throw new Error('Modell nicht eindeutig gefunden: ' + modell + ' (' + fundstellen.length + ' Treffer).');
    }
    zielzeilen[modell] = fundstellen[0];
  });

  const pruefungen = [];
  koepfe.forEach(function (kopf, index) {
    pruefungen.push({ zeile: 8, spalte: 35 + index, soll: kopf, name: 'Kopf ' + kopf });
  });
  Object.keys(zielwerte).forEach(function (modell) {
    zielwerte[modell].forEach(function (soll, index) {
      pruefungen.push({ zeile: zielzeilen[modell], spalte: 35 + index, soll: soll, name: modell });
    });
  });

  pruefungen.forEach(function (pruefung) {
    const alt = blatt.getRange(pruefung.zeile, pruefung.spalte, 1, 1).getValue();
    Logger.log(
      (istTrockenlauf ? 'TROCKENLAUF ' : '')
      + pruefung.name + ' ' + 'R' + pruefung.zeile + 'C' + pruefung.spalte
      + ': Altwert=' + JSON.stringify(alt) + ', Sollwert=' + JSON.stringify(pruefung.soll)
    );
    if (alt !== '' && !(typeof alt === typeof pruefung.soll && alt === pruefung.soll)) {
      throw new Error(
        'Zielzelle trägt schon einen anderen Wert: R' + pruefung.zeile + 'C' + pruefung.spalte
        + ', Alt=' + JSON.stringify(alt) + ', Soll=' + JSON.stringify(pruefung.soll)
      );
    }
  });

  if (istTrockenlauf) {
    Logger.log('TROCKENLAUF beendet; keine Archivkopie und keine Zelle geschrieben.');
    return;
  }

  const zeitstempel = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  blatt.copyTo(mappe).setName('Geräte_Katalog_Archiv_' + zeitstempel);
  blatt.getRange(8, 35, 1, 4).setValues([koepfe]);
  Object.keys(zielwerte).forEach(function (modell) {
    blatt.getRange(zielzeilen[modell], 35, 1, 4).setValues([zielwerte[modell]]);
  });
  SpreadsheetApp.flush();

  pruefungen.forEach(function (pruefung) {
    const ist = blatt.getRange(pruefung.zeile, pruefung.spalte, 1, 1).getValue();
    if (typeof ist !== typeof pruefung.soll || ist !== pruefung.soll) {
      throw new Error(
        'Rückleseabweichung in R' + pruefung.zeile + 'C' + pruefung.spalte
        + ': Ist=' + JSON.stringify(ist) + ' (' + typeof ist + ')'
        + ', Soll=' + JSON.stringify(pruefung.soll) + ' (' + typeof pruefung.soll + ')'
      );
    }
  });
  Logger.log('T1198-Datenschritt erfolgreich geschrieben und typgleich zurückgelesen.');
}
