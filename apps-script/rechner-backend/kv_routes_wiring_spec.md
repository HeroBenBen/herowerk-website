---
type: reference
tldr: "Exakte Dispatcher-Zeilen für doGet (action kostenvergleich + kv_bootstrap) inklusive Origin-Gate, CacheService-Muster, Perioden-Automatik und Parameter-Mapping Request auf kvCalculate-inputs; enthält den Pflicht-Befund, dass das bestehende num_ Dezimalwerte um Faktor 10 verfälscht."
datum: 2026-07-15
quelle: "Code.gs origin/main 95c0e91 (read-only gelesen); kv_contract.md; kv_engine.gs"
status: Lane-B-Deliverable B6, Übernahme durch den Controller (Lane C). Lane B hat Code.gs NICHT verändert.
---

# KV-Routes-Wiring-Spec — Dispatcher für `kostenvergleich` und `kv_bootstrap`

Lane B besitzt Code.gs nicht und hat es nur gelesen. Diese Datei enthält die
Zeilen zur wörtlichen Übernahme durch Lane C bzw. den Controller.

## 0. STOPPER vor dem Wiring: `num_` verfälscht jeden Dezimalwert

`num_` (Code.gs Z.578) entfernt Punkte als Tausendertrenner, BEVOR es parst:

```javascript
function num_(v, fallback) { if (typeof v === 'number') return v;
  const n = parseFloat(String(v || '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? fallback : n; }
```

Für die Bestands-Routen ist das richtig (deutsche Eingaben `12.000`). Für den
Kostenvergleich ist es **falsch**: der Client sendet JavaScript-Zahlen, also
Punkt-Dezimalen. Gemessen:

| Eingabe | `num_` liefert | korrekt |
|---|---|---|
| `"3.8"` (jaz) | **38** | 3.8 |
| `"0.7"` (kredZins) | **7** | 0.7 |
| `"2.5"` (gasStg, bioAufpreis) | **25** | 2.5 |
| `"1.5"` (stromEntw) | **15** | 1.5 |
| `"-0.5"` (stromEntw) | **-5** | -0.5 |
| `"32.5"` (strompreis) | **325** | 32.5 |

Jeder Dezimal-Parameter käme um den Faktor 10 zu hoch in der Engine an, ohne
Fehlermeldung: eine JAZ von 38 statt 3,8 macht die Wärmepumpe zehnmal
effizienter als sie ist. Betroffen: `jaz`, `kredZins`, `gasStg`, `oelStg`,
`stromEntw`, `bioAufpreis`, `gaspreis`, `oelpreis`, `strompreis`, `co2preis`,
`immoP`, `eta`, `co2Pfad`.

**Pflicht:** die KV-Routen benutzen `kvNum_`, NICHT `num_`. `num_` bleibt für die
Bestands-Routen unverändert (kein Bestands-Verhalten anfassen).

```javascript
/**
 * Zahl aus einem KV-Request-Parameter. Der Client sendet JS-Zahlen, also
 * Punkt-Dezimalen ("3.8"). Anders als num_ (Bestand, deutsche Eingaben mit
 * Tausenderpunkt) darf hier der Punkt NICHT entfernt werden.
 * Komma wird zusätzlich als Dezimaltrenner akzeptiert ("3,8"), falls jemand
 * die URL von Hand baut.
 */
function kvNum_(v, fallback) {
  if (typeof v === 'number') return v;
  const s = String(v === undefined || v === null ? '' : v).trim().replace(',', '.');
  if (s === '') return fallback;
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n;
}

/** Checkbox-Parameter: "1|true|ja" = an, alles andere = aus (kv_contract.md 1). */
function kvBool_(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'ja';
}

/** Enum-Parameter gegen eine Whitelist, sonst Default. Kein Nutzerwert ungeprüft in die Engine. */
function kvEnum_(v, erlaubt, fallback) {
  const s = String(v === undefined || v === null ? '' : v).trim();
  return erlaubt.indexOf(s) >= 0 ? s : fallback;
}
```

## 1. Dispatcher-Zeilen für `doGet`

Einzufügen in Code.gs `doGet` (Z.20 bis 32), NACH dem Origin-Gate und VOR dem
`health_()`-Fallback. Das Origin-Gate (`isAllowedOrigin_` / `ALLOWED_ORIGIN_RE`,
Z.18 + Z.572 bis 576) und der `try/catch`-Rahmen bleiben unverändert und gelten
damit automatisch auch für die neuen Routen.

```javascript
function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || 'health').toLowerCase();
  try {
    if (!isAllowedOrigin_(params)) return json_({ error: true, message: 'origin_not_allowed' });
    if (action === 'dimensionierung') return json_(dimensionierung_(params));
    if (action === 'foerderung') return json_(foerderung_(params));
    if (action === 'preise') return json_(preise_(params));
    if (action === 'kostenvergleich') return json_(kostenvergleich_(params));   // NEU
    if (action === 'kv_bootstrap') return json_(kvBootstrap_(params));          // NEU
    return json_(health_());
  } catch (err) {
    return json_({ error: true, message: err && err.message ? err.message : String(err), service: SERVICE_NAME, ready: false });
  }
}
```

`action` wird per `toLowerCase()` normalisiert: die Route heisst deshalb
`kv_bootstrap` (klein), nicht `kvBootstrap`.

## 2. Route `kostenvergleich`

```javascript
function kostenvergleich_(p) {
  const params = kvGetParams_();            // Sheet + Cache, siehe kv_sheet_spec.md 4
  const inputs = kvMapRequest_(p, params);  // Request → typisierte Engine-Inputs
  const out = kvCalculate(inputs, params);
  out.periodeAutomatik = inputs._periodeAutomatik;  // true = Server hat die Periode gesetzt
  return out;
}
```

**Kein eigener CacheService-Eintrag für das Ergebnis.** Begründung: der
Parameter-Raum ist praktisch unbegrenzt (Dutzende Regler), ein Ergebnis-Cache
hätte eine Trefferquote nahe null und würde nur das 100-KB-Limit je Cache-Eintrag
riskieren. Gecacht wird ausschliesslich das, was aus dem Sheet kommt
(`kvparams:v1`, TTL `CACHE_TTL_SECONDS` = 300 s), exakt wie bei `getCatalog_`
(Z.458 bis 483). Der Rechenkern selbst ist reines JavaScript ohne Sheet-Zugriff
und braucht keinen Cache.

## 3. Route `kv_bootstrap`

```javascript
function kvBootstrap_(p) {
  const params = kvGetParams_();
  const out = kvBootstrapPayload(params);
  // Die Anzeige-Periode, die der Client vorbelegen soll (Perioden-Automatik).
  out.aktivePeriode = kvPeriodeHeute_(params);
  return out;
}
```

`kvBootstrapPayload` liefert bewusst NUR Anzeige- und Metadaten: Perioden-Labels,
eta-Matrix mit Herkunftstexten, Defaults, Schätz-Fragen-Metadaten, Hinweistexte.
**Keine Rechenlogik, keine Formeln, keine Preis-Pfade** (kv_contract.md 3).

## 4. Perioden-Automatik (der einzige Ort, der die Uhr lesen darf)

Briefing Abschnitt 5: der Rechenkern kennt kein Datum, die Periode kommt als
Eingabe. Nur dieser Wrapper liest die Server-Zeit. Damit ist ein Deploy vor dem
Stichtag 21.07.2026 gefahrlos: die Engine liefert bis 20.07. das Alt-Regelwerk
und schaltet danach von selbst um, ohne Deploy. Diese Zusage gilt auf BEIDEN
Parameter-Pfaden (Sheet und Seed-Fallback) und ist auf dem Seed-Pfad durch das
Perioden-Gate belegt: 15.07.2026 → `alt`, 21.07.2026 → `h2-2026`, 01.02.2027 →
`h1-2027`, 01.08.2028 → `h2-2028`, 01.01.2030 → `h1-2029`. Vor dem Fix X-1 war
sie auf dem Seed-Pfad falsch (Abnahme-Befund B-1).

```javascript
/**
 * Antragsperiode aus der Server-Zeit. EINZIGE Stelle mit new Date().
 * Zeitzone: das Apps-Script-Projekt läuft auf Europe/Berlin (appsscript.json).
 *
 * Dieser Wrapper liest NUR die Uhr. Die Auswahl-Logik selbst steht als reine
 * Funktion `kvPeriodeFuerDatum(heuteIso, params)` in kv_engine.gs und wird dort
 * vom Perioden-Gate getestet (`tests/kv_equivalence/run_perioden_automatik.js`,
 * 18 Stichtags-Fälle plus Jahresraster-Invariante). Hier wird sie NICHT
 * dupliziert: doppelte Logik in einer .md war die Ursache des Befunds B-1
 * (die Funktion lebte nur im Text und wurde von keinem Test berührt).
 */
function kvPeriodeHeute_(params) {
  const heute = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd');
  return kvPeriodeFuerDatum(heute, params);
}
```

**Datenvertrag (Pflicht, sonst schaltet die Automatik nie um):** `kvPeriodeFuerDatum`
entscheidet über `gueltigAb`/`gueltigBis` je Periode. Diese Felder müssen in BEIDEN
Parameter-Quellen stehen: im Sheet-Tab `KV_FoerderPerioden` (Spalten B und C,
kv_sheet_spec.md 2) UND in `KV_PARAMS_SEED.perioden` (kv_engine.gs). Der Seed ist
der ausdrückliche Fallback, wenn ein Tab fehlt (kv_sheet_spec.md 4). Fehlen die
Felder dort, liefert die Auswahl für jedes Datum die erste Perioden-Zeile, also
dauerhaft das Alt-Regelwerk. Genau das war Befund B-1 der Abnahme. Beide Quellen
sind seit dem Fix zeilengleich, das Perioden-Gate prüft den Seed-Pfad bei jedem
Testlauf.

**Regel für `fHalbjahr`:** schickt der Client keine Periode, setzt der Server
`kvPeriodeHeute_`. Schickt der Client eine gültige Periode (der Nutzer klickt in
der Degressions-Treppe auf einen späteren Zeitraum), gewinnt der Client. Ein
unbekannter Wert fällt auf die Server-Periode zurück, nie auf einen Fehler.

## 5. Parameter-Mapping Request → `kvCalculate`-inputs

Vollständig nach kv_contract.md Abschnitt 1. Defaults kommen aus `KV_DEFAULTS`
(kv_engine.gs) und sind identisch mit den Orakel-HTML-Startwerten.

```javascript
function kvMapRequest_(p, params) {
  const d = KV_DEFAULTS;
  const periodeServer = kvPeriodeHeute_(params);
  const periodenKeys = Object.keys(params.perioden);
  const periodeReq = String(p.fHalbjahr || '').trim();
  const periode = periodenKeys.indexOf(periodeReq) >= 0 ? periodeReq : periodeServer;

  return {
    _periodeAutomatik: periodenKeys.indexOf(periodeReq) < 0,
    modus: kvEnum_(p.modus, ['kunde', 'berater'], d.modus),

    // System
    heizart: kvEnum_(p.heizart, ['gas', 'oel'], d.heizart),
    bedarf: kvNum_(p.bedarf, d.bedarf),
    eta: kvNum_(p.eta, d.eta),
    invWP: kvNum_(p.invWP, d.invWP),
    jaz: kvNum_(p.jaz, d.jaz),
    laufzeit: Math.round(kvNum_(p.laufzeit, d.laufzeit)),

    // Vergleich
    neuFossilTog: kvBool_(p.neuFossilTog, d.neuFossilTog),
    vglBrennstoff: kvEnum_(p.vglBrennstoff, ['gas', 'oel'], d.vglBrennstoff),
    gasInvest: kvNum_(p.gasInvest, d.gasInvest),
    oelInvest: kvNum_(p.oelInvest, d.oelInvest),

    // Energie und Preise
    gaspreis: kvNum_(p.gaspreis, d.gaspreis),
    gasStg: kvNum_(p.gasStg, d.gasStg),
    oelpreis: kvNum_(p.oelpreis, d.oelpreis),
    oelStg: kvNum_(p.oelStg, d.oelStg),
    strompreis: kvNum_(p.strompreis, d.strompreis),
    stromEntw: kvNum_(p.stromEntw, d.stromEntw),
    co2preis: kvNum_(p.co2preis, d.co2preis),
    co2Pfad: kvNum_(p.co2Pfad, d.co2Pfad),
    bioTog: kvBool_(p.bioTog, d.bioTog),
    bioAufpreis: kvNum_(p.bioAufpreis, d.bioAufpreis),

    // Förderung
    fHalbjahr: periode,
    fGrund: kvBool_(p.fGrund, d.fGrund),
    fEU: kvBool_(p.fEU, d.fEU),
    fKlima: kvBool_(p.fKlima, d.fKlima),
    fAlt20: kvBool_(p.fAlt20, d.fAlt20),
    fEinkSlider: kvNum_(p.fEinkSlider, d.fEinkSlider),
    fKind: kvBool_(p.fKind, d.fKind),
    // Produktiv hart AUS: Ein mitgesendeter Client-Wert wird bewusst ignoriert.
    // Die Engine-Fähigkeit bleibt für den Äquivalenzbeweis erhalten.
    proklimaTog: false,
    fEffizienz: kvBool_(p.fEffizienz, d.fEffizienz),

    // Finanzierung und Extras
    finanzTog: kvBool_(p.finanzTog, d.finanzTog),
    kredLZ: Math.round(kvNum_(p.kredLZ, d.kredLZ)),
    kredZins: kvNum_(p.kredZins, d.kredZins),
    immoTog: kvBool_(p.immoTog, d.immoTog),
    hausW: kvNum_(p.hausW, d.hausW),
    immoP: kvNum_(p.immoP, d.immoP),
    dynTarifTog: kvBool_(p.dynTarifTog, d.dynTarifTog),
    dynAnteil: kvNum_(p.dynAnteil, d.dynAnteil),
    dynSpread: kvNum_(p.dynSpread, d.dynSpread)
  };
}
```

### Mapping-Tabelle (Request-Parameter → Engine-Feld → Caster)

| Request | Engine-Feld | Caster | Default |
|---|---|---|---|
| `modus` | `modus` | `kvEnum_` (kunde/berater) | `kunde` |
| `heizart` | `heizart` | `kvEnum_` (gas/oel) | `gas` |
| `bedarf` | `bedarf` | `kvNum_` | 20000 |
| `eta` | `eta` | `kvNum_` | 85 |
| `invWP` | `invWP` | `kvNum_` | 30000 |
| `jaz` | `jaz` | `kvNum_` | 3.8 |
| `laufzeit` | `laufzeit` | `kvNum_` + `Math.round` | 20 |
| `neuFossilTog` | `neuFossilTog` | `kvBool_` | true |
| `vglBrennstoff` | `vglBrennstoff` | `kvEnum_` (gas/oel) | `gas` |
| `gasInvest` / `oelInvest` | dito | `kvNum_` | 12000 / 16000 |
| `gaspreis` / `gasStg` | dito | `kvNum_` | 12 / 2.5 |
| `oelpreis` / `oelStg` | dito | `kvNum_` | 11 / 2.5 |
| `strompreis` / `stromEntw` | dito | `kvNum_` | 32 / 1.5 |
| `co2preis` / `co2Pfad` | dito | `kvNum_` | 55 / 250 |
| `bioTog` / `bioAufpreis` | dito | `kvBool_` / `kvNum_` | true / 2.5 |
| `fHalbjahr` | `fHalbjahr` | Whitelist gegen `params.perioden`, sonst Server-Periode | Server-Periode |
| `fGrund` / `fEU` / `fKlima` / `fAlt20` | dito | `kvBool_` | true |
| `fEinkSlider` | `fEinkSlider` | `kvNum_` | 60000 |
| `fKind` / `fEffizienz` | dito | `kvBool_` | false |
| `proklimaTog` | `proklimaTog` | produktiv fest `false`; Client-Wert wird ignoriert | false |
| `finanzTog` | `finanzTog` | `kvBool_` | false |
| `kredLZ` | `kredLZ` | `kvNum_` + `Math.round` | 10 |
| `kredZins` | `kredZins` | `kvNum_` | 0.7 |
| `immoTog` / `hausW` / `immoP` | dito | `kvBool_` / `kvNum_` | false / 350000 / 7 |
| `dynTarifTog` / `dynAnteil` / `dynSpread` | dito | `kvBool_` / `kvNum_` | false / 40 / 10 |

**Einheiten:** Der Server rechnet ausschliesslich in kWh. Die Umrechnung
m³ Gas bzw. Liter Heizöl × 10 macht der Client vor dem Request
(`wz_unit_faktor`, Bootstrap). Es gibt keinen `einheit`-Parameter auf dieser
Route (anders als bei `dimensionierung`, das seine eigene Umrechnung hat).

## 6. Datenschutz-Grenze der Route

- Es gibt **keinen Lead-Parameter** auf dieser Route. Der Lead-Contract
  `hero_kv_lead` (kv_contract.md 4) lebt ausschliesslich im `sessionStorage` des
  Clients und wird beim CTA-Klick an das Formular übergeben, nicht an das Backend.
- Einkommensdaten (`fEinkSlider`, `fKind`) sind Rechen-Eingaben und gehen in die
  Quote ein. Sie dürfen **nicht** geloggt und **nicht** in den Lead übernommen
  werden (kv_contract.md 4, Verbotsliste).
- `Logger.log` mit vollem Request ist auf dieser Route untersagt: er enthielte
  Einkommen und Gebäudedaten. Wird ein Fehler-Log gebraucht, nur `action` und
  `err.message` loggen.

## 7. Abnahme-Checks nach dem Wiring (Lane C)

| # | Prüfung | Erwartung |
|---|---|---|
| 1 | `?action=kv_bootstrap&origin=https://herowerk.de` | 6 Reform-Perioden, `aktivePeriode` = `alt` (vor dem 21.07.2026), keine Rechenlogik im Payload |
| 2 | `?action=kostenvergleich&origin=https://herowerk.de` (ohne weitere Parameter, `fHalbjahr=h2-2026` erzwungen) | Quote 46 %, Zuschuss 12.880 €, Eigenanteil 17.120 €, Vorteil 45.389 € |
| 3 | `&jaz=3.8` | `inputsEcho.jaz` = **3.8**, nicht 38 (der `kvNum_`-Beweis) |
| 4 | `&origin=https://fremd.de` | `origin_not_allowed` |
| 5 | `&fHalbjahr=quatsch` | Server-Periode, kein Fehler, `periodeAutomatik: true` |
| 6 | Sheet-Tab `KV_Parameter` umbenannt | Engine rechnet mit `KV_PARAMS_SEED` weiter (kein Kundenfehler) |
| 7 | Sheet-Tab umbenannt UND Datum nach dem 21.07.2026 | `aktivePeriode` = `h2-2026`, NICHT `alt`. Der Seed-Fallback muss die Perioden-Automatik genauso tragen wie das Sheet (Befund B-1). Gate-Beleg: `node tests/kv_equivalence/run_perioden_automatik.js` |

Prüfung 2 und 3 sind die beiden Werte, an denen ein kaputtes Wiring zuerst
auffällt.
