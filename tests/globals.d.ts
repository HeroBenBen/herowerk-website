// Browser-Globals fuer die Playwright-Tests.
//
// Warum es diese Datei gibt: Die Specs greifen in `page.evaluate(...)` auf
// Globals zu, die im BROWSER leben. `tsc --noEmit` (CI-Job `lint`, Schritt 3)
// prueft dieselben Dateien im NODE-Kontext und kennt sie dort nicht, meldet also
// `TS2304: Cannot find name '...'`. Die Specs tragen dafuer bereits
// `/* global ... */`, aber das ist eine ESLint-Direktive; tsc liest sie nicht.
// Deshalb war eslint gruen und tsc rot.
//
// Jede Zeile hier deklariert einen REAL existierenden Global, keine Attrappe.
// Die Fundstelle steht jeweils dabei und ist vor dem Eintragen live geprueft.
//
// `any` ist bewusst: tsconfig faehrt `strict: false`, und diese Tests pruefen
// Verhalten im Browser, nicht Typvertraege. Wer hier praeziser werden will,
// braucht echte Typen am Produktcode; das ist ein eigener Auftrag.

/** Anfrage-Strecke: HubSpot-Payload-Bau. Fundstelle: anfrage.html:1922 */
declare function buildHubSpotPayload(data: any): any;

/** WP-Rechner Thin Client: zentraler Client-State. Fundstelle: kostenvergleich-waermepumpe.html:719 */
declare const KV_STATE: any;

/** WP-Rechner Thin Client: loest eine Berechnung aus. Fundstelle: kostenvergleich-waermepumpe.html:838 */
declare function calculate(options?: any): any;

/** Chart.js 4.4.1 UMD-Global. Fundstelle: <script src="/js/chart-4.4.1.umd.min.js"> */
declare const Chart: any;

/** Google Tag Manager Queue. Fundstelle: js/consent.js und kostenvergleich-waermepumpe.html */
declare const dataLayer: any[];

/** Google Analytics Event-API. Fundstelle: kostenvergleich-waermepumpe.html */
declare function gtag(...args: any[]): void;

interface Window {
  /** consentmanager-API des Einwilligungsanbieters. Fundstelle: cdn.consentmanager.net/delivery/js/cmp_final.min.js, live geprueft 29.07.2026 (typeof window.__cmp === 'function' auf Vorschau und www.herowerk.de). */
  __cmp?: any;
  /** WP-Rechner Thin Client: Wizard-Bridge-Handle (schaetzungsbasierter Bedarf). Fundstelle: kostenvergleich-waermepumpe.html:1076/1083 */
  WZ_BRIDGE?: any;
  /** WP-Rechner Thin Client: Test-Zwischenspeicher fuer den O4-Lead-Roundtrip. Fundstelle: tests/kv-thin-client.spec.js:595 */
  __kvLastForO4Test?: any;
}

/** Apps-Script-Engine als CommonJS-Modul in Perioden-/Aequivalenztests geladen. module.exports Fundstelle: apps-script/rechner-backend/kv_engine.gs:721 */
declare module '*.gs';
