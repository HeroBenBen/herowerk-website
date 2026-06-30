/* ============================================================================
 * HeroWerk — Consent + Analytics Loader (Opt-in, Google Consent Mode v2)
 * ----------------------------------------------------------------------------
 * Rechtliche Kernanforderung (TTDSG/TDDDG § 25, DSGVO Art. 6 Abs. 1 lit. a):
 *   GA4 und Meta-Pixel duerfen ERST NACH ausdruecklicher Einwilligung laden und
 *   feuern. Vor Zustimmung: KEIN Analytics-/Marketing-Request.
 *
 * Verteidigung in der Tiefe (zwei Sperren):
 *   (1) Consent Mode v2 Default = alles 'denied' (siehe Inline-Bootstrap im <head>,
 *       laeuft VOR dieser Datei). Selbst wenn ein Tag frueh laedt, sendet es keine
 *       Cookies / keine Ad-Signale.
 *   (2) Diese Datei injiziert die GA4- und Meta-Skripte ueberhaupt erst, NACHDEM
 *       die consentmanager-CMP eine positive Einwilligung meldet. Vorher existiert
 *       kein <script src> fuer GA/Meta -> physisch kein Request moeglich.
 *
 * Die consentmanager-Autoblocking-CMP (Live-Snippet von Benjamin, siehe <head>)
 * ist die zusaetzliche vendor-konforme Sperre + liefert das UI (Akzeptieren /
 * Ablehnen / Einstellungen) und den Widerruf.
 *
 * IDs (oeffentliche Client-IDs):
 *   GA4-Mess-ID : G-1XT9BLBDW8
 *   Meta-Pixel  : 1348888427192043
 *   consentmanager: Konto 104033 / CMP 173772 (Consent Mode v2 im Konto AN)
 *
 * TODO (offen, NICHT in diesem Build):
 *   - Google-Ads-Conversion-Tag: AW-Conversion-ID liegt NICHT vor -> nicht gebaut.
 *     Sobald AW-ID vorliegt: gtag('config','AW-XXXXXXX') + Conversion-Event hier
 *     ergaenzen (greift dann ebenfalls erst nach ad_storage = 'granted').
 * ========================================================================== */
(function () {
  'use strict';

  var GA4_ID = 'G-1XT9BLBDW8';
  var META_PIXEL_ID = '1348888427192043';

  // dataLayer/gtag-Stub ist bereits im Inline-Head-Bootstrap angelegt. Defensiv
  // hier erneut absichern, falls diese Datei isoliert geladen wird.
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }

  var ga4Loaded = false;
  var metaLoaded = false;

  // ----- GA4 (gtag.js) erst nach analytics-Einwilligung injizieren -----------
  function loadGA4() {
    if (ga4Loaded) return;
    ga4Loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    document.head.appendChild(s);
    gtag('js', new Date());
    // Google-Signale AUS, IP-Anonymisierung Standard in GA4, EU-Datenverarbeitung.
    gtag('config', GA4_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }

  // ----- Meta-Pixel erst nach marketing-Einwilligung injizieren --------------
  function loadMetaPixel() {
    if (metaLoaded) return;
    metaLoaded = true;
    /* Offizieller Meta-Pixel-Base-Code (Loader), hier erst nach Consent ausgefuehrt. */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  // ----- consentmanager-Einwilligung auf Consent Mode + Tag-Laden mappen -----
  // consentmanager stellt window.__cmp bereit. Wir fragen die Vendor-/Purpose-
  // Zustimmung ab und uebersetzen sie in Google Consent Mode v2 + Tag-Injection.
  // Lesart konservativ: Tag laedt NUR bei eindeutigem true.
  function applyConsent() {
    if (typeof window.__cmp !== 'function') return;
    window.__cmp('getCMPData', null, function (data) {
      if (!data) return;

      var purposes = data.purposeConsents || data.consent || {};
      var vendors = data.vendorConsents || {};

      // consentmanager-Standard-Zwecke: 1 = Notwendig, 2 = Praeferenzen,
      // 3 = Statistik/Messung, 4 = Marketing. Die exakte Zuordnung haengt von der
      // CMP-Konfiguration (Konto 104033) ab -> vor Live im consentmanager-Konto
      // pruefen (CMPs -> Zwecke) und ggf. Purpose-IDs unten anpassen.
      var analyticsOk = purposes['3'] === true || purposes.s3 === true;
      var marketingOk = purposes['4'] === true || purposes.s4 === true;

      // Consent Mode v2 entsprechend aktualisieren (Default war 'denied').
      gtag('consent', 'update', {
        analytics_storage: analyticsOk ? 'granted' : 'denied',
        ad_storage: marketingOk ? 'granted' : 'denied',
        ad_user_data: marketingOk ? 'granted' : 'denied',
        ad_personalization: marketingOk ? 'granted' : 'denied',
      });

      if (analyticsOk) loadGA4();
      if (marketingOk) loadMetaPixel();
    });
  }

  // consentmanager feuert __cmp('addEventListener', 'consent', ...) bei jeder
  // Zustimmungs-Aenderung (Akzeptieren / Ablehnen / Widerruf). Wir reagieren live.
  function bindCmp() {
    if (typeof window.__cmp !== 'function') return false;
    try {
      window.__cmp('addEventListener', ['consent', applyConsent, false], null);
    } catch (e) {
      /* aeltere __cmp-Signatur: stiller Fallback aufs Polling unten */
    }
    applyConsent();
    return true;
  }

  // Falls die CMP beim Ausfuehren dieser Datei noch nicht bereit ist: kurz pollen,
  // bis window.__cmp existiert (max. ~10 s), dann Listener binden.
  if (!bindCmp()) {
    var tries = 0;
    var iv = setInterval(function () {
      tries += 1;
      if (bindCmp() || tries > 50) clearInterval(iv);
    }, 200);
  }
})();
