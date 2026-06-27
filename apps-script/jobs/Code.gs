/**
 * HeroWerk_Jobs_Website — Code.gs (container-bound Google Apps Script Web App)
 *
 * ZWECK: Die Google-Tabelle steuert die Stellen auf der Karriereseite (karriere.html).
 *   - Tab "Übersicht": Nr. | Rolle | Web-Kategorie | Status (online/offline) | id
 *   - je Rolle ein Detail-Tab (A=Label, B=Wert), verknüpft über die id
 *   - publish() friert die aktuelle Auswahl als JSON in den versteckten Tab "_published" (A1) ein
 *   - doGet() liefert GENAU diesen eingefrorenen Snapshot als JSON aus (halbfertige
 *     Entwürfe gehen so nie versehentlich live — nur ein bewusstes "Veröffentlichen" zählt)
 *
 * GEBUNDENE TABELLE (container-bound): 1n6kuRA4sjyFI2SMwcIpE6_QRBHEfsQYLZDus9vJm160
 *   (Sheet "Hero_Jobs_Website"). Dieses Skript ist an genau diese Tabelle gebunden.
 *
 * WEB-APP-URL: Nach dem Deploy ("Bereitstellen → Neue Bereitstellung → Web-App") die
 *   /exec-URL in karriere.html eintragen → Konstante JOBS_FEED_URL (im unteren <script>).
 *   Solange JOBS_FEED_URL leer ist, bleibt die Seite exakt der statische Stand (No-Op).
 *
 * RE-DEPLOY (gleiche URL behalten!): "Bereitstellen → Bereitstellungen verwalten →
 *   (Stift/Bearbeiten) → Version: Neue Version → Bereitstellen". Die URL bleibt gleich,
 *   nur eine NEUE Bereitstellung erzeugt eine neue URL.
 *
 * Stil/Muster: Spiegelt apps-script/rechner-backend/Code.gs (doGet + ContentService-JSON).
 */

var SHEET_ID = '1n6kuRA4sjyFI2SMwcIpE6_QRBHEfsQYLZDus9vJm160';
var SERVICE_NAME = 'HeroWerk Jobs Website';

var TAB_UEBERSICHT = 'Übersicht';
var TAB_PUBLISHED = '_published';

// Übersicht-Spalten (1-basiert): A=Nr., B=Rolle, C=Web-Kategorie, D=Status, E=id
var COL_NR = 1;
var COL_ROLLE = 2;
var COL_KATEGORIE = 3;
var COL_STATUS = 4;
var COL_ID = 5;

// Die drei zulässigen Web-Kategorien (Reihenfolge = Anzeige auf der Seite).
var KATEGORIEN = ['Montage & Technik', 'Vertrieb & Beratung', 'Büro & Organisation'];

// Detail-Tab-Labels (Spalte A). Single-Value-Felder + Listen-Felder.
var LABEL_ID = 'id';
var LABEL_BESCHAEFTIGUNG = 'Beschäftigung';
var LABEL_STANDORT = 'Standort';
var LABEL_ICON = 'Icon';
var LABEL_TEASER = 'Teaser';
var LABEL_AUFGABEN = 'Aufgaben';
var LABEL_PROFIL = 'Profil';
var LABEL_FREUEN = 'Darauf kannst du dich freuen';

var SINGLE_LABELS = [LABEL_ID, LABEL_BESCHAEFTIGUNG, LABEL_STANDORT, LABEL_ICON, LABEL_TEASER];
var LIST_LABELS = [LABEL_AUFGABEN, LABEL_PROFIL, LABEL_FREUEN];
var ALL_LABELS = SINGLE_LABELS.concat(LIST_LABELS);

// Reihenfolge der Zeilen in einem frisch angelegten Detail-Tab (Template).
var DETAIL_TEMPLATE_ORDER = [
  LABEL_ID,
  LABEL_BESCHAEFTIGUNG,
  LABEL_STANDORT,
  LABEL_ICON,
  LABEL_TEASER,
  LABEL_AUFGABEN,
  LABEL_PROFIL,
  LABEL_FREUEN,
];

// Erlaubte Icon-Schlüssel (die SVGs liegen im JS der Webseite). Default: briefcase.
var ALLOWED_ICONS = [
  'wrench',
  'medal',
  'learning',
  'shield',
  'zap',
  'layers',
  'gear',
  'chat',
  'clipboard',
  'file',
  'layout',
  'users',
  'briefcase',
];
var DEFAULT_ICON = 'briefcase';

var DEFAULT_BESCHAEFTIGUNG = 'Vollzeit';
var DEFAULT_STANDORT = 'Region Hannover';

// ---------------------------------------------------------------------------
// Menü
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('HeroWerk Jobs')
    .addItem('Auf Webseite veröffentlichen', 'publish')
    .addItem('Vorschau anzeigen', 'preview')
    .addSeparator()
    .addItem('Rolle anlegen', 'createRole')
    .addItem('Einrichten / Reparieren', 'setup')
    .addItem('Website-Rollen vorbefüllen', 'seedWebsiteRoles')
    .addToUi();
}

// ---------------------------------------------------------------------------
// Feed-Aufbau (Lesen + Parsen)
// ---------------------------------------------------------------------------

/**
 * Liest die Übersicht und baut für jede ONLINE-Rolle mit gültiger id + vorhandenem
 * Detail-Tab ein Rollen-Objekt. Sortiert nach Nr. (order). Gibt ein Array zurück.
 */
function buildFeed_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(TAB_UEBERSICHT);
  if (!sh) throw new Error('Tab "' + TAB_UEBERSICHT + '" fehlt — bitte "Einrichten / Reparieren" ausführen.');
  var values = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rolleText = String(row[COL_ROLLE - 1] || '').trim();
    var status = String(row[COL_STATUS - 1] || '').trim().toLowerCase();
    var id = slugifyId_(String(row[COL_ID - 1] || ''));
    var kategorie = String(row[COL_KATEGORIE - 1] || '').trim();
    var order = num_(row[COL_NR - 1], i);
    if (status !== 'online') continue;
    if (!id) continue;
    var detail = ss.getSheetByName(id);
    if (!detail) continue;
    var parsed = parseDetailTab_(detail);
    var nameMwd = splitNameMwd_(rolleText);
    out.push({
      id: id,
      name: nameMwd.name,
      mwd: nameMwd.mwd,
      kategorie: kategorie,
      tags: [
        parsed.standort || DEFAULT_STANDORT,
        parsed.beschaeftigung || DEFAULT_BESCHAEFTIGUNG,
      ],
      teaser: parsed.teaser,
      aufgaben: parsed.aufgaben,
      profil: parsed.profil,
      freuen: parsed.freuen,
      icon: normalizeIcon_(parsed.icon),
      order: order,
    });
  }
  out.sort(function (a, b) {
    return a.order - b.order;
  });
  return out;
}

/**
 * Parst einen Detail-Tab (A=Label, B=Wert). Listen-Felder sammeln B der Label-Zeile
 * und jeder Folgezeile mit leerer Spalte A, bis zum nächsten nicht-leeren Label.
 */
function parseDetailTab_(sheet) {
  var values = sheet.getDataRange().getValues();
  var res = {
    id: '',
    beschaeftigung: '',
    standort: '',
    icon: '',
    teaser: '',
    aufgaben: [],
    profil: [],
    freuen: [],
  };
  var current = null; // aktuelles Listen-Feld (Array) oder null
  for (var i = 0; i < values.length; i++) {
    var labelRaw = String(values[i][0] || '').trim();
    var valRaw = String(values[i][1] || '').trim();
    if (labelRaw) {
      current = null;
      if (labelRaw === LABEL_ID) res.id = valRaw;
      else if (labelRaw === LABEL_BESCHAEFTIGUNG) res.beschaeftigung = valRaw;
      else if (labelRaw === LABEL_STANDORT) res.standort = valRaw;
      else if (labelRaw === LABEL_ICON) res.icon = valRaw;
      else if (labelRaw === LABEL_TEASER) res.teaser = valRaw;
      else if (labelRaw === LABEL_AUFGABEN) {
        current = res.aufgaben;
        if (valRaw) current.push(valRaw);
      } else if (labelRaw === LABEL_PROFIL) {
        current = res.profil;
        if (valRaw) current.push(valRaw);
      } else if (labelRaw === LABEL_FREUEN) {
        current = res.freuen;
        if (valRaw) current.push(valRaw);
      } else {
        current = null; // unbekanntes Label -> nichts sammeln
      }
    } else if (current && valRaw) {
      current.push(valRaw); // Fortsetzungszeile eines Listen-Felds
    }
  }
  return res;
}

// "Anlagenmechaniker:in ... (m/w/d)" -> { name: "Anlagenmechaniker:in ...", mwd: "(m/w/d)" }
function splitNameMwd_(text) {
  var t = String(text || '').trim();
  var m = t.match(/\(m\/w\/d\)\s*$/i);
  if (m) {
    return { name: t.slice(0, m.index).trim(), mwd: m[0].trim() };
  }
  return { name: t, mwd: '' };
}

function normalizeIcon_(icon) {
  var key = String(icon || '').trim().toLowerCase();
  return ALLOWED_ICONS.indexOf(key) >= 0 ? key : DEFAULT_ICON;
}

// ---------------------------------------------------------------------------
// Veröffentlichen / Vorschau / doGet
// ---------------------------------------------------------------------------

function publish() {
  var feed = buildFeed_();
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = getOrCreateHiddenSheet_(ss, TAB_PUBLISHED);
  sh.getRange(1, 1).setValue(JSON.stringify(feed));
  ss.toast(feed.length + ' Rollen veröffentlicht', SERVICE_NAME, 5);
  return feed.length;
}

function preview() {
  var feed = buildFeed_();
  var ui = SpreadsheetApp.getUi();
  if (!feed.length) {
    ui.alert(SERVICE_NAME, 'Es würden 0 Rollen veröffentlicht.\n\nPrüfe: Status = "online", id gesetzt, Detail-Tab vorhanden.', ui.ButtonSet.OK);
    return;
  }
  var lines = feed.map(function (r) {
    return '• ' + (r.name || r.id) + '  [' + r.kategorie + ']';
  });
  ui.alert(
    SERVICE_NAME,
    'Es würden ' + feed.length + ' Rollen veröffentlicht:\n\n' + lines.join('\n'),
    ui.ButtonSet.OK
  );
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName(TAB_PUBLISHED);
    var raw = sh ? String(sh.getRange(1, 1).getValue() || '') : '';
    if (!raw) raw = '[]';
    // Validieren, damit doGet niemals kaputtes JSON ausliefert.
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      parsed = [];
    }
    return json_(parsed);
  } catch (err) {
    return json_([]);
  }
}

// ---------------------------------------------------------------------------
// Rolle anlegen
// ---------------------------------------------------------------------------

function createRole() {
  var ui = SpreadsheetApp.getUi();
  var nameResp = ui.prompt(
    'Rolle anlegen',
    'Wie heißt die Rolle? (z. B. "Disponent:in (m/w/d)")',
    ui.ButtonSet.OK_CANCEL
  );
  if (nameResp.getSelectedButton() !== ui.Button.OK) return;
  var roleName = String(nameResp.getResponseText() || '').trim();
  if (!roleName) {
    ui.alert(SERVICE_NAME, 'Kein Rollenname eingegeben — abgebrochen.', ui.ButtonSet.OK);
    return;
  }

  var katMsg = 'In welche Kategorie? Bitte die Zahl eingeben:\n\n';
  for (var k = 0; k < KATEGORIEN.length; k++) {
    katMsg += (k + 1) + ' = ' + KATEGORIEN[k] + '\n';
  }
  var katResp = ui.prompt('Rolle anlegen — Kategorie', katMsg, ui.ButtonSet.OK_CANCEL);
  if (katResp.getSelectedButton() !== ui.Button.OK) return;
  var katIdx = parseInt(String(katResp.getResponseText() || '').trim(), 10) - 1;
  if (isNaN(katIdx) || katIdx < 0 || katIdx >= KATEGORIEN.length) {
    ui.alert(SERVICE_NAME, 'Ungültige Kategorie — abgebrochen.', ui.ButtonSet.OK);
    return;
  }
  var kategorie = KATEGORIEN[katIdx];

  var ss = SpreadsheetApp.openById(SHEET_ID);
  ensureUebersichtHeader_(ss);
  var sh = ss.getSheetByName(TAB_UEBERSICHT);
  var existingIds = collectExistingIds_(ss);
  var id = uniqueSlug_(roleName, existingIds);
  var nextNr = nextNr_(sh);

  sh.appendRow([nextNr, roleName, kategorie, 'offline', id]);
  createDetailTemplate_(ss, id);

  ss.toast(
    'Rolle "' + roleName + '" angelegt (offline). Detail-Tab "' + id + '" füllen, dann auf "online" stellen + veröffentlichen.',
    SERVICE_NAME,
    8
  );
}

// ---------------------------------------------------------------------------
// Einrichten / Reparieren (non-destruktiv)
// ---------------------------------------------------------------------------

function setup() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  ensureUebersichtHeader_(ss);
  var sh = ss.getSheetByName(TAB_UEBERSICHT);
  getOrCreateHiddenSheet_(ss, TAB_PUBLISHED); // versteckten Snapshot-Tab sicherstellen

  var values = sh.getDataRange().getValues();
  var existingIds = collectExistingIds_(ss);
  var idsAssigned = 0;
  var detailsCreated = 0;

  for (var i = 1; i < values.length; i++) {
    var rolleText = String(values[i][COL_ROLLE - 1] || '').trim();
    if (!rolleText) continue;
    var id = slugifyId_(String(values[i][COL_ID - 1] || ''));
    if (!id) {
      id = uniqueSlug_(rolleText, existingIds);
      sh.getRange(i + 1, COL_ID).setValue(id);
      existingIds[id] = true;
      idsAssigned++;
    }
    if (!ss.getSheetByName(id)) {
      createDetailTemplate_(ss, id); // NIE bestehende Detail-Inhalte überschreiben
      detailsCreated++;
    }
  }

  SpreadsheetApp.getUi().alert(
    SERVICE_NAME,
    'Einrichten / Reparieren fertig.\n\n' +
      '• id-Spalte vorhanden: ja\n' +
      '• neu vergebene ids: ' +
      idsAssigned +
      '\n' +
      '• neu angelegte Detail-Tabs: ' +
      detailsCreated +
      '\n\nBestehende Detail-Inhalte wurden NICHT verändert.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ---------------------------------------------------------------------------
// Website-Rollen vorbefüllen (13 Stellen aus karriere.html)
// ---------------------------------------------------------------------------

function seedWebsiteRoles() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    SERVICE_NAME + ' — Website-Rollen vorbefüllen',
    'Dies setzt für die 13 Webseiten-Rollen die id und ÜBERSCHREIBT deren Detail-Tabs mit dem ' +
      'aktuellen Webseiten-Text.\n\nFortfahren?',
    ui.ButtonSet.OK_CANCEL
  );
  if (resp !== ui.Button.OK) return;

  var ss = SpreadsheetApp.openById(SHEET_ID);
  ensureUebersichtHeader_(ss);
  var sh = ss.getSheetByName(TAB_UEBERSICHT);
  var values = sh.getDataRange().getValues();
  var roles = WEBSITE_ROLES_();
  var matched = 0;
  var unmatched = [];

  for (var r = 0; r < roles.length; r++) {
    var role = roles[r];
    var rowIndex = -1;
    var normTarget = normalizeName_(role.name);
    for (var i = 1; i < values.length; i++) {
      var existingId = slugifyId_(String(values[i][COL_ID - 1] || ''));
      var rolleText = String(values[i][COL_ROLLE - 1] || '');
      if (existingId === role.id || normalizeName_(rolleText) === normTarget) {
        rowIndex = i;
        break;
      }
    }
    if (rowIndex < 0) {
      unmatched.push(role.id);
      continue;
    }
    sh.getRange(rowIndex + 1, COL_ID).setValue(role.id);
    values[rowIndex][COL_ID - 1] = role.id; // lokalen Spiegel aktualisieren
    writeDetailContent_(ss, role);
    matched++;
  }

  var msg = matched + ' von ' + roles.length + ' Website-Rollen vorbefüllt.';
  if (unmatched.length) {
    msg +=
      '\n\nNICHT zugeordnet (bitte in der Übersicht die "Rolle" passend benennen ' +
      'oder die id manuell setzen):\n• ' +
      unmatched.join('\n• ');
  }
  ui.alert(SERVICE_NAME, msg, ui.ButtonSet.OK);
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen: Tabs / Header / ids
// ---------------------------------------------------------------------------

function ensureUebersichtHeader_(ss) {
  var sh = ss.getSheetByName(TAB_UEBERSICHT) || ss.insertSheet(TAB_UEBERSICHT);
  var header = ['Nr.', 'Rolle', 'Web-Kategorie', 'Status', 'id'];
  var firstRow = sh.getRange(1, 1, 1, header.length).getValues()[0];
  var needsHeader = false;
  for (var c = 0; c < header.length; c++) {
    if (String(firstRow[c] || '').trim() === '') {
      needsHeader = true;
      break;
    }
  }
  // id-Spalten-Header gezielt sicherstellen (non-destruktiv für A–D, falls schon befüllt).
  if (needsHeader) {
    if (String(sh.getRange(1, COL_NR).getValue() || '').trim() === '') sh.getRange(1, COL_NR).setValue('Nr.');
    if (String(sh.getRange(1, COL_ROLLE).getValue() || '').trim() === '') sh.getRange(1, COL_ROLLE).setValue('Rolle');
    if (String(sh.getRange(1, COL_KATEGORIE).getValue() || '').trim() === '') sh.getRange(1, COL_KATEGORIE).setValue('Web-Kategorie');
    if (String(sh.getRange(1, COL_STATUS).getValue() || '').trim() === '') sh.getRange(1, COL_STATUS).setValue('Status');
    if (String(sh.getRange(1, COL_ID).getValue() || '').trim() === '') sh.getRange(1, COL_ID).setValue('id');
  }
  sh.setFrozenRows(1);
  return sh;
}

function getOrCreateHiddenSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.hideSheet();
  }
  return sh;
}

function collectExistingIds_(ss) {
  var out = {};
  var sh = ss.getSheetByName(TAB_UEBERSICHT);
  if (sh) {
    var col = sh.getRange(2, COL_ID, Math.max(1, sh.getLastRow() - 1), 1).getValues();
    for (var i = 0; i < col.length; i++) {
      var id = slugifyId_(String(col[i][0] || ''));
      if (id) out[id] = true;
    }
  }
  return out;
}

function nextNr_(sh) {
  var last = sh.getLastRow();
  var max = 0;
  if (last >= 2) {
    var col = sh.getRange(2, COL_NR, last - 1, 1).getValues();
    for (var i = 0; i < col.length; i++) {
      var n = num_(col[i][0], 0);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

// Slug: Umlaute -> ae/oe/ue/ss, lowercase, nur a-z0-9 + Bindestrich.
function slugifyId_(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueSlug_(text, existing) {
  var base = slugifyId_(text);
  if (!base) base = 'rolle';
  var id = base;
  var n = 2;
  while (existing[id]) {
    id = base + '-' + n;
    n++;
  }
  existing[id] = true;
  return id;
}

// Normalisierung für Namens-Matching: lowercase, "(m/w/d)" raus, nur a-z0-9.
function normalizeName_(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\(m\/w\/d\)/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '');
}

// ---------------------------------------------------------------------------
// Detail-Tabs: Template + Inhalt schreiben
// ---------------------------------------------------------------------------

function createDetailTemplate_(ss, id) {
  if (ss.getSheetByName(id)) return ss.getSheetByName(id); // nie überschreiben
  var sh = ss.insertSheet(id);
  var rows = [];
  for (var i = 0; i < DETAIL_TEMPLATE_ORDER.length; i++) {
    var label = DETAIL_TEMPLATE_ORDER[i];
    var val = '';
    if (label === LABEL_ID) val = id;
    else if (label === LABEL_BESCHAEFTIGUNG) val = DEFAULT_BESCHAEFTIGUNG;
    else if (label === LABEL_STANDORT) val = DEFAULT_STANDORT;
    else if (label === LABEL_ICON) val = DEFAULT_ICON;
    rows.push([label, val]);
  }
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.setColumnWidth(1, 220);
  sh.setColumnWidth(2, 560);
  return sh;
}

// Schreibt den vollständigen Detail-Inhalt einer Website-Rolle (überschreibt den Tab).
function writeDetailContent_(ss, role) {
  var sh = ss.getSheetByName(role.id) || ss.insertSheet(role.id);
  sh.clearContents();
  var rows = [];
  rows.push([LABEL_ID, role.id]);
  rows.push([LABEL_BESCHAEFTIGUNG, DEFAULT_BESCHAEFTIGUNG]);
  rows.push([LABEL_STANDORT, DEFAULT_STANDORT]);
  rows.push([LABEL_ICON, role.icon]);
  rows.push([LABEL_TEASER, role.teaser]);
  appendList_(rows, LABEL_AUFGABEN, role.aufgaben);
  appendList_(rows, LABEL_PROFIL, role.profil);
  appendList_(rows, LABEL_FREUEN, role.freuen);
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.setColumnWidth(1, 220);
  sh.setColumnWidth(2, 560);
}

function appendList_(rows, label, items) {
  if (!items || !items.length) {
    rows.push([label, '']);
    return;
  }
  rows.push([label, items[0]]);
  for (var i = 1; i < items.length; i++) {
    rows.push(['', items[i]]);
  }
}

// ---------------------------------------------------------------------------
// JSON-Antwort (Spiegel von rechner-backend json_)
// ---------------------------------------------------------------------------

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function num_(v, fallback) {
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v || '').replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

// ---------------------------------------------------------------------------
// Eingebetteter Inhalt der 13 Website-Rollen (exakt aus karriere.html, Stand Build).
// id | name (mit (m/w/d)) | icon | teaser | aufgaben[] | profil[] | freuen[]
// ---------------------------------------------------------------------------

function WEBSITE_ROLES_() {
  return [
    {
      id: 'anlagenmechaniker',
      name: 'Anlagenmechaniker:in SHK / Wärmepumpen-Monteur:in (m/w/d)',
      icon: 'wrench',
      teaser:
        'Du machst aus alten Öl- und Gasheizungen moderne Wärmepumpen – im festen Zweier-Team, auf vorbereiteten Baustellen in der Region Hannover. Abends bist du zuhause, nicht im Hotel.',
      aufgaben: [
        'Du baust die alte Heizung aus und die neue Wärmepumpe ein – von der Außeneinheit bis zur Inbetriebnahme, im eingespielten Montageteam.',
        'Du bindest die Anlage hydraulisch ein, befüllst, entlüftest und nimmst sie in Betrieb.',
        'Du übergibst die fertige Anlage und erklärst den Kund:innen ihre neue Heizung verständlich.',
        'Du dokumentierst sauber per Tablet (Fotos + Abnahmeprotokoll) – die Auftragsdaten hast du vorab digital dabei, kein Zettelchaos.',
        'Du arbeitest auf vorbereiteten Baustellen: Aufmaß, Planung und Material kommen aus dem Innendienst – du konzentrierst dich aufs Handwerk.',
      ],
      profil: [
        'Abgeschlossene Ausbildung als Anlagenmechaniker:in SHK, Gas-/Wasserinstallateur:in oder Heizungsbauer:in.',
        'Erfahrung in der Heizungsinstallation – erste Wärmepumpen-Berührung ist ein Plus, aber kein Muss (wir schulen dich).',
        'Sorgfältige, kundenfreundliche und eigenverantwortliche Arbeitsweise im Team.',
        'Führerschein Klasse B und Deutsch ab B2.',
      ],
      freuen: [
        'Feste Region Hannover – keine Fernmontage, kein Hotel, abends daheim.',
        'Modernes Werkzeug, gut ausgestattete Fahrzeuge, Tablet statt Papierkram.',
        'Kälteschein & Herstellerschulungen auf unsere Kosten.',
        'Unbefristete Festanstellung, faire Vergütung + Bonus, 30 Tage Urlaub.',
      ],
    },
    {
      id: 'shk-meister',
      name: 'SHK-Meister:in / Technische Betriebsleitung (m/w/d)',
      icon: 'medal',
      teaser:
        'Du führst unsere Montageteams fachlich und stehst mit deinem Namen für die Qualität jeder Anlage – als technische Betriebsleitung in der Region Hannover.',
      aufgaben: [
        'Du leitest und führst unsere Montageteams fachlich an – auf der Baustelle und im Hintergrund.',
        'Du sicherst die Qualität und nimmst die fertigen Wärmepumpen-Installationen ab.',
        'Du übernimmst die Verantwortung als technische:r Betriebsleiter:in nach Handwerksordnung.',
        'Du stellst sicher, dass Normen (DIN/VDE) und Herstellervorgaben sauber eingehalten werden.',
        'Du gibst dein Wissen weiter und entwickelst die Kolleg:innen im Team fachlich weiter.',
      ],
      profil: [
        'Meisterbrief im SHK-Handwerk.',
        'Mehrjährige Erfahrung in der Heizungs- bzw. Wärmepumpentechnik.',
        'Führungsstärke, Verantwortungsbewusstsein und ein Auge fürs Detail.',
        'Führerschein Klasse B.',
      ],
      freuen: [
        'Feste Region Hannover – keine Fernmontage, abends daheim.',
        'Gestaltungsspielraum, flache Hierarchien und kurze Wege.',
        'Herstellerschulungen & Weiterbildung auf unsere Kosten.',
        'Unbefristete Festanstellung, faire Vergütung + Bonus, 30 Tage Urlaub.',
      ],
    },
    {
      id: 'quereinsteiger',
      name: 'Quereinsteiger:in Montage (m/w/d)',
      icon: 'learning',
      teaser:
        'Du hast handwerkliches Talent und Lust auf die Wärmewende? Wir bilden dich Schritt für Schritt zum Wärmepumpen-Profi aus – im festen Team in der Region Hannover.',
      aufgaben: [
        'Du arbeitest im Montageteam beim Ein- und Ausbau der Anlagen mit und lernst von erfahrenen Kolleg:innen.',
        'Du verlegst Kabel, übernimmst Bohrarbeiten und setzt Schaltschränke.',
        'Du bereitest Baustelle, Material und Werkzeug vor – sauber und präzise.',
        'Du unterstützt bei Anschluss, Inbetriebnahme und Übergabe der Wärmepumpe.',
        'Du dokumentierst deine Arbeit per Tablet und wächst Schritt für Schritt in die Rolle hinein.',
      ],
      profil: [
        'Handwerkliche Praxis und ausgeprägte Lernbereitschaft.',
        'Bereitschaft, dich zum Wärmepumpen-Profi ausbilden zu lassen – SHK- oder Elektro-Erfahrung ist ein Plus, aber kein Muss.',
        'Zuverlässigkeit, Sorgfalt und Teamgeist.',
        'Führerschein Klasse B.',
      ],
      freuen: [
        'Strukturiertes Onboarding durch erfahrene Kolleg:innen.',
        'Weiterbildung auf unsere Kosten – bis zum Kälteschein & Herstellerschulungen.',
        'Feste Region Hannover, modernes Werkzeug und gut ausgestattete Fahrzeuge.',
        'Unbefristete Festanstellung, faire Vergütung + Bonus, 30 Tage Urlaub.',
      ],
    },
    {
      id: 'elektromeister',
      name: 'Elektromeister:in / Konzessionsträger:in Elektro (m/w/d)',
      icon: 'shield',
      teaser:
        'Du verantwortest die Elektro-Seite unserer Installationen, gibst grünes Licht für jeden Anschluss – und bringst die Konzession dafür mit. Festes Einsatzgebiet: Region Hannover.',
      aufgaben: [
        'Du verantwortest fachlich die Elektroarbeiten an Wärmepumpe und PV und behältst sie im Blick.',
        'Du bist als verantwortliche Elektrofachkraft im Installateurverzeichnis des Netzbetreibers eingetragen (Konzessionsträger:in).',
        'Du nimmst elektrotechnische Installationen nach VDE ab und prüfst sie.',
        'Du leitest die Elektrofachkräfte im Team an und gibst dein Wissen weiter.',
        'Du sorgst dafür, dass jeder Anschluss normgerecht und sicher ans Netz geht.',
      ],
      profil: [
        'Meisterbrief im Elektrohandwerk (Energie- und Gebäudetechnik).',
        'Eintragung in die Handwerksrolle und Eignung als Konzessionsträger:in beim Netzbetreiber.',
        'Erfahrung mit WP- bzw. PV-Elektroinstallation.',
        'Führerschein Klasse B.',
      ],
      freuen: [
        'Feste Region Hannover – keine Fernmontage, abends daheim.',
        'Gestaltungsspielraum, flache Hierarchien und kurze Wege.',
        'Herstellerschulungen & Weiterbildung auf unsere Kosten.',
        'Unbefristete Festanstellung, faire Vergütung + Bonus, 30 Tage Urlaub.',
      ],
    },
    {
      id: 'elektriker',
      name: 'Elektriker:in – Wärmepumpen & Photovoltaik (m/w/d)',
      icon: 'zap',
      teaser:
        'Du bringst Wärmepumpen und PV-Anlagen sauber ans Netz – vom Anschluss bis zur Inbetriebnahme, im festen Team in der Region Hannover.',
      aufgaben: [
        'Du übernimmst den Elektroanschluss der Wärmepumpe: Zählerplatz, Sicherungskasten, Steuerleitung.',
        'Du schließt PV-Anlagen auf der AC-Seite an: Wechselrichter ans Hausnetz, Schutz und Erdung.',
        'Du installierst Batteriespeicher und Wallboxen und nimmst sie in Betrieb.',
        'Du machst die Funktionsprüfung, erstellst das VDE-Messprotokoll und meldest beim Netzbetreiber an.',
        'Du dokumentierst deine Arbeit sauber per Tablet – die Auftragsdaten hast du vorab digital dabei.',
      ],
      profil: [
        'Abgeschlossene Ausbildung als Elektroniker:in (Energie- und Gebäudetechnik) oder vergleichbar.',
        'Installationserfahrung, idealerweise mit Wärmepumpen, Wallboxen oder PV-Anlagen.',
        'Selbstständige, verantwortungsvolle Arbeitsweise und Qualitätsbewusstsein.',
        'Führerschein Klasse B und Deutsch ab B2.',
      ],
      freuen: [
        'Feste Region Hannover – keine Fernmontage, kein Hotel, abends daheim.',
        'Modernes Werkzeug, gut ausgestattete Fahrzeuge, Tablet statt Papierkram.',
        'Herstellerschulungen & Weiterbildung auf unsere Kosten.',
        'Unbefristete Festanstellung, faire Vergütung + Bonus, 30 Tage Urlaub.',
      ],
    },
    {
      id: 'gala',
      name: 'Fundament- & Außenanlagen / GaLa (m/w/d)',
      icon: 'layers',
      teaser:
        'Du schaffst die Basis – damit die Außeneinheit sicher steht und drumherum alles stimmt. Festes Einsatzgebiet: Region Hannover, abends bist du zuhause.',
      aufgaben: [
        'Du bereitest Aufstellflächen und Fundamente für die Außeneinheiten vor.',
        'Du übernimmst Erd-, Pflaster- und kleinere Tiefbauarbeiten rund um die Anlage.',
        'Du stellst die Außenanlagen wieder her und gestaltest sie sauber.',
        'Du arbeitest eng mit dem Montageteam vor Ort zusammen.',
        'Du sorgst dafür, dass die Baustelle ordentlich und sicher hinterlassen wird.',
      ],
      profil: [
        'Erfahrung im Garten- und Landschaftsbau oder Tiefbau.',
        'Handwerkliches Geschick und körperliche Belastbarkeit.',
        'Sorgfalt, Zuverlässigkeit und Teamgeist.',
        'Führerschein Klasse B, idealerweise BE.',
      ],
      freuen: [
        'Feste Region Hannover – keine Fernmontage, abends daheim.',
        'Modernes Werkzeug und gut ausgestattete Fahrzeuge.',
        'Strukturiertes Onboarding durch erfahrene Kolleg:innen.',
        'Unbefristete Festanstellung, faire Vergütung + Bonus, 30 Tage Urlaub.',
      ],
    },
    {
      id: 'service',
      name: 'Service-/Wartungstechniker:in (m/w/d)',
      icon: 'gear',
      teaser:
        'Du hältst die Anlagen unserer Kund:innen am Laufen – und bist ihr vertrautes Gesicht in der Region Hannover. Abends bist du zuhause, nicht im Hotel.',
      aufgaben: [
        'Du wartest und inspizierst installierte Wärmepumpen und hältst sie effizient am Laufen.',
        'Du gehst auf Fehlersuche, behebst Störungen und übernimmst kleinere Reparaturen.',
        'Du berätst die Kund:innen verständlich zu Betrieb und Effizienz ihrer Anlage.',
        'Du dokumentierst deine Serviceeinsätze sauber per Tablet.',
        'Du bist das vertraute Gesicht vor Ort und baust ein verlässliches Verhältnis zu den Kund:innen auf.',
      ],
      profil: [
        'Ausbildung im SHK- oder Kältetechnik-Bereich.',
        'Erfahrung mit Wärmepumpen oder Heizungstechnik.',
        'Selbstständige, serviceorientierte und freundliche Arbeitsweise.',
        'Führerschein Klasse B.',
      ],
      freuen: [
        'Feste Region Hannover – keine Fernmontage, abends daheim.',
        'Modernes Werkzeug, gut ausgestattete Fahrzeuge, Tablet statt Papierkram.',
        'Kälteschein & Herstellerschulungen auf unsere Kosten.',
        'Unbefristete Festanstellung, faire Vergütung + Bonus, 30 Tage Urlaub.',
      ],
    },
    {
      id: 'vad',
      name: 'Vertriebsberater:in Außendienst – Wärmepumpe (m/w/d)',
      icon: 'chat',
      teaser:
        'Du holst Menschen bei ihrem Heizungswechsel ab – direkt am Küchentisch – und machst aus Interesse ein überzeugtes Ja zur Wärmepumpe. Dein Revier: die Region Hannover.',
      aufgaben: [
        'Du berätst Hausbesitzer:innen vor Ort zu Wärmepumpe und Förderung – ehrlich und auf Augenhöhe.',
        'Du nimmst das technische Aufmaß und das Objekt auf und dokumentierst die Daten sauber.',
        'Du erstellst das passgenaue, individuelle Angebot und begleitest die Kund:innen bis zur Entscheidung.',
        'Du pflegst deine Kontakte und Termine zuverlässig im CRM.',
        'Du bist das Gesicht von HeroWerk vor Ort und baust echtes Vertrauen auf.',
      ],
      profil: [
        'Kommunikationsstärke und Vertriebstalent – idealerweise im Umfeld SHK, Energie oder Bau (Quereinsteiger:innen willkommen).',
        'Technisches Verständnis und Freude an ehrlichen, transparenten Gesprächen.',
        'Digital-affin und sicher im Umgang mit CRM-Tools.',
        'Führerschein Klasse B.',
      ],
      freuen: [
        'Firmenwagen, den du auch privat fahren kannst (1 %-Regelung).',
        'Feste Region Hannover – kurze Wege, abends daheim.',
        'Faire Vergütung + Bonus und Weiterbildung auf unsere Kosten.',
        'Unbefristete Festanstellung und 30 Tage Urlaub.',
      ],
    },
    {
      id: 'va',
      name: 'Vertriebsassistenz / Innendienst (m/w/d)',
      icon: 'clipboard',
      teaser:
        'Du hältst dem Außendienst den Rücken frei und sorgst dafür, dass kein Lead verloren geht – die organisatorische Schaltzentrale unseres Vertriebs.',
      aufgaben: [
        'Du terminierst und bereitest die Beratungsgespräche des Außendiensts vor.',
        'Du pflegst Kundendaten und Angebote zuverlässig im CRM.',
        'Du kommunizierst freundlich mit Kund:innen per Telefon und E-Mail.',
        'Du unterstützt das Vertriebsteam im Tagesgeschäft und hältst alle Fäden zusammen.',
        'Du behältst offene Leads im Blick und sorgst dafür, dass nichts liegen bleibt.',
      ],
      profil: [
        'Kaufmännische Ausbildung oder vergleichbare Erfahrung.',
        'Organisationstalent und freundliches Auftreten.',
        'Sicherer Umgang mit digitalen Tools.',
        'Strukturierte, zuverlässige Arbeitsweise.',
      ],
      freuen: [
        'Anteilig Homeoffice und flexible Arbeitszeiten.',
        'Strukturiertes Onboarding durch erfahrene Kolleg:innen.',
        'Faire Vergütung + Bonus und Weiterbildung auf unsere Kosten.',
        'Unbefristete Festanstellung und 30 Tage Urlaub.',
      ],
    },
    {
      id: 'backoffice',
      name: 'Backoffice / Auftragssachbearbeitung (m/w/d)',
      icon: 'file',
      teaser:
        'Du bist die organisatorische Drehscheibe zwischen Kund:innen, Montage und Vertrieb – und sorgst dafür, dass jeder Auftrag rundläuft.',
      aufgaben: [
        'Du wickelst Aufträge von der Annahme bis zur Abrechnung ab.',
        'Du koordinierst Termine und Einsätze der Teams.',
        'Du kommunizierst mit Kund:innen, Lieferanten und Behörden.',
        'Du pflegst Dokumente und Prozesse sauber und strukturiert.',
        'Du behältst den Überblick und sorgst dafür, dass nichts zwischen den Bereichen verloren geht.',
      ],
      profil: [
        'Kaufmännische Ausbildung.',
        'Organisationsstärke und Sorgfalt.',
        'Sicherer Umgang mit Office- und ERP-Tools.',
        'Kommunikationsstärke und freundliches Auftreten.',
      ],
      freuen: [
        'Anteilig Homeoffice und flexible Arbeitszeiten.',
        'Strukturiertes Onboarding durch erfahrene Kolleg:innen.',
        'Faire Vergütung + Bonus und Weiterbildung auf unsere Kosten.',
        'Unbefristete Festanstellung und 30 Tage Urlaub.',
      ],
    },
    {
      id: 'planer',
      name: 'SHK-Planer:in / Anlagenauslegung (m/w/d)',
      icon: 'layout',
      teaser:
        'Du prüfst und planst Wärmepumpen-Projekte am Rechner, damit jede Anlage zum Haus passt und sparsam läuft – auf Wunsch auch anteilig im Homeoffice.',
      aufgaben: [
        'Du prüfst verkaufte Wärmepumpen-Projekte technisch am PC und legst die Anlagen passgenau aus.',
        'Du plausibilisierst Heizlastberechnungen und Wärmepumpen-Auslegungen.',
        'Du unterstützt den Außendienst technisch und arbeitest an Zusatzangeboten mit.',
        'Du koordinierst dich mit Schornsteinfeger und Behörden.',
        'Du sorgst dafür, dass jede Anlage effizient und normgerecht geplant ins Montageteam geht.',
      ],
      profil: [
        'Geselle:in, Meister:in oder Techniker:in im SHK-Bereich.',
        'Mehrjährige Erfahrung in der Heizungs- bzw. Wärmepumpentechnik.',
        'Wärmepumpen-Schulungen oder -Zertifikate von Vorteil.',
        'Sicheres, strukturiertes Arbeiten am PC.',
      ],
      freuen: [
        'Anteilig Homeoffice und flexible Arbeitszeiten.',
        'Weiterbildung auf unsere Kosten – inklusive Wärmepumpen-Schulungen.',
        'Faire Vergütung + Bonus und Gestaltungsspielraum mit kurzen Wegen.',
        'Unbefristete Festanstellung und 30 Tage Urlaub.',
      ],
    },
    {
      id: 'hr',
      name: 'Personalreferent:in / HR (m/w/d)',
      icon: 'users',
      teaser:
        'Du baust mit uns das Team auf, das die Wärmewende vor Ort umsetzt – von der ersten Ausschreibung bis zum gelungenen Einstieg.',
      aufgaben: [
        'Du steuerst das Recruiting von der Ausschreibung bis zur Einstellung neuer Kolleg:innen.',
        'Du gestaltest ein strukturiertes Onboarding, das neue Teammitglieder gut ankommen lässt.',
        'Du betreust die Mitarbeitenden empathisch in allen Personalfragen.',
        'Du baust HR-Prozesse und -Strukturen von Grund auf mit auf.',
        'Du machst HeroWerk als Arbeitgeber in der Region sichtbar und attraktiv.',
      ],
      profil: [
        'Erfahrung im Recruiting oder HR, gern im handwerklichen/gewerblichen Umfeld.',
        'Empathie und Kommunikationsstärke.',
        'Strukturierte, eigenständige Arbeitsweise.',
        'Diskretion und Verlässlichkeit.',
      ],
      freuen: [
        'Anteilig Homeoffice und flexible Arbeitszeiten.',
        'Großer Gestaltungsspielraum, flache Hierarchien und kurze Wege.',
        'Faire Vergütung + Bonus und Weiterbildung auf unsere Kosten.',
        'Unbefristete Festanstellung und 30 Tage Urlaub.',
      ],
    },
    {
      id: 'assistenz',
      name: 'Assistenz der Geschäftsführung (m/w/d)',
      icon: 'briefcase',
      teaser:
        'Du hältst der Geschäftsführung den Rücken frei und sorgst dafür, dass der Laden rundläuft – die rechte Hand mit Überblick über das ganze Unternehmen.',
      aufgaben: [
        'Du unterstützt die Geschäftsführung organisatorisch und administrativ.',
        'Du bereitest Termine, Unterlagen und Entscheidungen vor.',
        'Du koordinierst zwischen den Bereichen und externen Partnern.',
        'Du übernimmst eigene Projekte und treibst sie eigenständig voran.',
        'Du behältst den Überblick und denkst proaktiv mit, bevor etwas zum Problem wird.',
      ],
      profil: [
        'Kaufmännische Ausbildung oder Studium.',
        'Organisationstalent und Diskretion.',
        'Sicherer Umgang mit digitalen Tools.',
        'Proaktive, mitdenkende Arbeitsweise.',
      ],
      freuen: [
        'Anteilig Homeoffice und flexible Arbeitszeiten.',
        'Großer Gestaltungsspielraum, flache Hierarchien und kurze Wege.',
        'Faire Vergütung + Bonus und Weiterbildung auf unsere Kosten.',
        'Unbefristete Festanstellung und 30 Tage Urlaub.',
      ],
    },
  ];
}
