---
type: draft
tldr: 'Englischer Antwortentwurf auf die consentmanager-Rückfrage vom 07.07.2026; beantwortet Plattform, Einbindung und Screenshots und trennt den historischen 503 vom heute gefundenen CSP-Fehler.'
datum: 2026-07-25
status: entwurf
scope: hitl
quelle: agent
tags:
  - domain/web
  - domain/compliance
  - severity/hoch
---

# Consentmanager support reply – draft

## Before sending – Benjamin

Please attach:

1. The **historical Network-tab screenshot from 1 or 3 July**, showing the full `cmp.php` request, HTTP 503, and `d94854dc5273c.js` as initiator. Today’s true embedded status is not yet available, so do not create or label a current screenshot as a 503.
2. A **current consentmanager domain-list screenshot** showing `herowerk.de` and `www.herowerk.de` as approved, with no “last seen” date, plus the current Free plan.
3. A screenshot of the manual `<head>` integration showing the automatic-blocking snippet, Code ID `d94854dc5273c`, and the adjacent local consent loader; it must also make clear that no plugin or Google Tag Manager is involved.

## Email draft

**Subject:** Re: CMP 173772 – requested integration details and historical embedded 503

Dear consentmanager Support Team,

Thank you for your reply of 7 July, and apologies for our delayed response. Below are the requested details for account 104033 and CMP 173772.

### 1. CMS / platform

The website is a static HTML website. We do not use a CMS. It is served by Apache on IONOS hosting.

Live website:

- https://www.herowerk.de/
- https://herowerk.de/

### 2. Type of integration

The integration is manual in the `<head>` of every HTML page.

- No plugin
- No Google Tag Manager
- consentmanager automatic blocking
- Code ID: `d94854dc5273c`
- CMP ID: `173772`

This is the exact consent and analytics block from `index.html`:

<!-- prettier-ignore -->
```html
  <!-- (a) Google Consent Mode v2 — Default: alles verweigert -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
      security_storage: 'granted',
      wait_for_update: 500
    });
    gtag('set', 'ads_data_redaction', true);
    gtag('set', 'url_passthrough', true);
  </script>
  <!-- (b) consentmanager CMP (Autoblocking) Konto 104033 / CMP 173772 (live d94854dc5273c) -->
  <script type="text/javascript" data-cmp-ab="1" src="https://cdn.consentmanager.net/delivery/autoblocking/d94854dc5273c.js" data-cmp-host="a.delivery.consentmanager.net" data-cmp-cdn="cdn.consentmanager.net" data-cmp-codesrc="0"></script>
  <!-- (c) Opt-in-Loader: injiziert GA4 (G-1XT9BLBDW8) + Meta-Pixel (1348888427192043) ERST nach Consent -->
  <script src="js/consent.js?v=5e2ae31749"></script>
```

### 3. Screenshots and test evidence

We are attaching:

1. A historical Chrome Network-tab screenshot from 1 or 3 July showing the embedded cross-site request to
   `https://a.delivery.consentmanager.net/delivery/cmp.php?id=173772&...`
   returning HTTP 503. The same URL returned HTTP 200 when opened directly or requested with curl at that time.
2. A screenshot of the domain list in the consentmanager portal showing both `herowerk.de` and `www.herowerk.de` as approved but without a “last seen” date.
3. A screenshot of the manual integration in the page `<head>`, showing the automatic-blocking snippet with Code ID `d94854dc5273c` and the adjacent local consent loader.

### Important update from 25 July

Our current command-line checks return HTTP 200. We repeated the exact `cmp.php` request nine times:

- 3 direct requests
- 3 requests with browser-like `Referer` and `Sec-Fetch-*` headers
- 3 requests additionally carrying an `Origin` header

All 9 requests returned HTTP 200. However, we do not treat this as proof that the historical embedded-browser 503 has been resolved: direct and curl-based requests also returned HTTP 200 when the genuine embedded request returned HTTP 503 on 1 and 3 July.

The banner still does not render, including when we use the documented `?cmpscreen` parameter. During today’s review we found a separate client-side Content Security Policy issue on our website: `a.delivery.consentmanager.net` is currently allowed under `connect-src`, but not under `script-src`, although `cmp.php` is loaded as a script. This currently interrupts the browser loading chain, so the genuine embedded HTTP status on 25 July is **not yet confirmed**. We will correct and retest this issue on our side. We also found that our automatic-blocking script is not currently the first script in the `<head>`, and we will align this with your published integration instructions.

These client-side findings do not explain the embedded HTTP 503 recorded on 1 and 3 July. Please confirm whether your technical team changed or repaired the delivery or domain-whitelisting state for CMP 173772 between 3 and 25 July.

Our Essential trial ended and the account was downgraded to Free on 14 July. Please also confirm:

1. whether this downgrade affects delivery or domain-whitelisting for this CMP;
2. the current July pageview count for account 104033;
3. whether the Free-plan pageview limit has already stopped delivery of the consent layer.

The issue has existed since 1 July, i.e. for 24 days, and has prevented the GA4 and Meta reach/conversion measurement configured on our website since launch. Please forward this case to your technical team and provide a written technical status by **29 July 2026**.

Kind regards,

Benjamin Bendler
HeroWerk GmbH i.G.

## Internal rule check — do not send

R0 ✅ | R1 ✅ | R2 ✅ | R3 ● | R4 ● | R5 ● | R6 ● | R7 ✅ | R8 ✅ | R9 ✅
R10 ✅ | R11 ● | R12 ● | R13 ✅ | R14 ✅ | R15 ✅ | R16 ✅ | R17 ● | R18 ✅ | R19 ● | R20 ●
Gate status: Start ✅ | Pre-write ✅ | Execution ✅ | Output ✅
