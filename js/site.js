// ===== FAQ WORDLIST RUNTIME PATCH =====
document.querySelectorAll('[data-faq-runtime-answer]').forEach((el) => {
  el.innerHTML = el.getAttribute('data-faq-runtime-answer');
});

// ===== NAVIGATION =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
function toggleMenu() {
  mobileMenu?.classList.toggle('open');
}
hamburger?.addEventListener('click', toggleMenu);
window.addEventListener('scroll', () => {
  document.querySelector('nav')?.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== WIZARD (Dimensionierungsrechner) =====
const wizData = {
  gemeinde: '',
  gebaeude: '',
  baujahr: '',
  sanierung: 'nein',
  flaeche: 140,
  heizung: '',
  heizsystem: 'heizkoerper',
  warmwasser: 'ja',
  personen: 3,
  verbrauchKnown: false,
  verbrauch: 0,
};
let wizStep = 1;
// Server-seitiger Proxy auf UNSERER Domain (api/rechner.php). Der echte Apps-Script-Endpunkt
// steht nur noch server-seitig im PHP - nicht mehr im Browser sichtbar/direkt aufrufbar; die
// Besucher-IP geht an unseren Server statt an Google. Same-Origin -> kein CORS. Alle Aufruf-
// stellen haengen wie bisher '?...' an, daher bleibt die Rechner-Logik unveraendert.
const RECHNER_API = '/api/rechner';
let wizServerResult = null;
let wizSelectedMarke = 'wolf';
let foerderMarke = 'wolf';

// PLZ → Gemeinde Mapping (Region Hannover)
const plzMap = {
  // Hannover
  30159: 'hannover',
  30161: 'hannover',
  30163: 'hannover',
  30165: 'hannover',
  30167: 'hannover',
  30169: 'hannover',
  30171: 'hannover',
  30173: 'hannover',
  30175: 'hannover',
  30177: 'hannover',
  30179: 'hannover',
  30419: 'hannover',
  30449: 'hannover',
  30451: 'hannover',
  30453: 'hannover',
  30455: 'hannover',
  30457: 'hannover',
  30459: 'hannover',
  30519: 'hannover',
  30521: 'hannover',
  30539: 'hannover',
  30559: 'hannover',
  30625: 'hannover',
  30627: 'hannover',
  30629: 'hannover',
  30655: 'hannover',
  30657: 'hannover',
  30659: 'hannover',
  30669: 'hannover',
  // Langenhagen
  30851: 'langenhagen',
  30853: 'langenhagen',
  30855: 'langenhagen',
  // Seelze
  30926: 'seelze',
  // Laatzen
  30880: 'laatzen',
  // Hemmingen
  30966: 'hemmingen',
  // Ronnenberg
  30952: 'ronnenberg',
  // Region Hannover
  30900: 'wedemark',
  30938: 'burgwedel',
  30916: 'isernhagen',
  30823: 'garbsen',
  30826: 'garbsen',
  30827: 'garbsen',
  31275: 'lehrte',
  31311: 'uetze',
  30974: 'wennigsen',
  30890: 'barsinghausen',
  30989: 'gehrden',
  31832: 'springe',
  30982: 'pattensen',
  31319: 'sehnde',
  30559: 'hannover',
  31535: 'neustadt',
  // Erweitert: 1h20 Fahrzeit ab 30900 Wedemark
  31515: 'wunstorf',
  31547: 'rehburg-loccum',
  31542: 'bad-nenndorf',
  31552: 'rodenberg',
  31553: 'sachsenhagen',
  31559: 'hohnhorst',
  31867: 'lauenau',
  31863: 'coppenbrügge',
  31848: 'bad-münder',
  31785: 'hameln',
  31787: 'hameln',
  31789: 'hameln',
  31840: 'hessisch-oldendorf',
  31675: 'bückeburg',
  31655: 'stadthagen',
  31683: 'obernkirchen',
  31688: 'nienstädt',
  31691: 'helpsen',
  31694: 'niedernwöhren',
  31699: 'beckedorf',
  29221: 'celle',
  29223: 'celle',
  29225: 'celle',
  29227: 'celle',
  29229: 'celle',
  31303: 'burgdorf',
  31234: 'edemissen',
  31226: 'peine',
  31228: 'peine',
  31246: 'ilsede',
  31249: 'hohenhameln',
  30900: 'wedemark',
  31241: 'ilsede',
  31171: 'nordstemmen',
  31174: 'schellerten',
  31177: 'harsum',
  31180: 'giesen',
  31185: 'söhlde',
  31061: 'alfeld',
  31073: 'grünenplan',
  31008: 'elze',
  30890: 'barsinghausen',
  31028: 'gronau',
  31020: 'salzhemmendorf',
};

function pruefePlz(raw) {
  const val = String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 5);
  if (val.length < 5) return { status: 'unvollstaendig', val };
  const gemeinde = plzMap[val];
  if (gemeinde) {
    const label = gemeinde.charAt(0).toUpperCase() + gemeinde.slice(1);
    return { status: 'region', val, gemeinde, label };
  }
  if (val.startsWith('3') || val.startsWith('29') || val.startsWith('31')) {
    return { status: 'erweitert', val };
  }
  return { status: 'aussen', val };
}

function renderPlzFeedback(result) {
  if (result.status === 'region')
    return { text: '✓ ' + result.label + ', wir sind für dich da.', cls: 'is-ok' };
  if (result.status === 'erweitert')
    return {
      text:
        '✓ PLZ ' +
        result.val +
        ' liegt möglicherweise in unserem Einzugsgebiet, wir prüfen die Verfügbarkeit.',
      cls: 'is-neutral',
    };
  if (result.status === 'aussen')
    return {
      text: 'Diese PLZ liegt außerhalb unseres Einzugsgebiets (Region Hannover).',
      cls: 'is-warn',
    };
  return { text: '', cls: '' };
}

function setWizardNextDisabled(button, disabled) {
  if (!button) return;
  button.disabled = disabled;
  button.classList.toggle('is-disabled', disabled);
}

function showFoerderSlot(element, visible) {
  if (!element) return;
  element.classList.toggle('is-visible', visible);
  element.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function checkPlz(input) {
  const val = input.value.replace(/\D/g, '').slice(0, 5);
  input.value = val;
  const resultEl = document.getElementById('wzPlzResult');
  const nextBtn = document.getElementById('wzPlzNext');

  if (val.length < 5) {
    resultEl.innerHTML = '';
    setWizardNextDisabled(nextBtn, true);
    return;
  }

  const gemeinde = plzMap[val];
  if (gemeinde) {
    const gemeindeLabel = gemeinde.charAt(0).toUpperCase() + gemeinde.slice(1);
    resultEl.innerHTML =
      SVG_CHECK +
      '<span style="color:var(--green);font-weight:600;">' +
      gemeindeLabel +
      '. Wir sind für dich da</span>';
    wizData.gemeinde = gemeinde;
    setWizardNextDisabled(nextBtn, false);
  } else if (val.startsWith('3') || val.startsWith('29') || val.startsWith('31')) {
    // Erweitertes Einzugsgebiet - Verfügbarkeit prüfen
    resultEl.innerHTML =
      SVG_CHECK +
      '<span style="color:var(--g300);">Deine PLZ ' +
      val +
      ' liegt möglicherweise in unserem Einzugsgebiet. Wir prüfen die Verfügbarkeit</span>';
    wizData.gemeinde = 'sonstige';
    setWizardNextDisabled(nextBtn, false);
  } else {
    resultEl.innerHTML =
      SVG_WARN +
      '<span style="color:var(--bernstein);">Diese PLZ liegt außerhalb unseres Einzugsgebiets (Region Hannover).</span>';
    wizData.gemeinde = '';
    setWizardNextDisabled(nextBtn, true);
  }
}

// Option selection + Auto-Advance
// Steps that auto-advance on click (no input fields needed):
// Step 2 (Gebäude, except Reihenhaus), Step 3 (Baujahr), Step 4 (Sanierung), Step 6 (Heizung), Step 7 (Heizsystem), Step 8 (Warmwasser)
// Step 9 (Verbrauch) bleibt manuell: "Ich kenne meinen Verbrauch" blendet ein Eingabefeld ein.
const autoAdvanceSteps = [2, 3, 4, 6, 7, 8];

document.querySelectorAll('.wizard-options').forEach((group) => {
  group.querySelectorAll('.wizard-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      group.querySelectorAll('.wizard-option').forEach((o) => o.classList.remove('selected'));
      opt.classList.add('selected');
      // Reihenhaus sub-question logic
      const rhSub = document.getElementById('wzRhSub');
      const rhAbsage = document.getElementById('wzRhAbsage');
      const step2Next = document.getElementById('wzStep2Next');
      if (rhSub && group.id === 'wzGebaeude') {
        if (opt.dataset.value === 'rh') {
          rhSub.style.display = 'block';
          rhAbsage.style.display = 'none';
          setWizardNextDisabled(step2Next, true);
          return; // Don't auto-advance - wait for sub-option
        } else {
          rhSub.style.display = 'none';
          rhAbsage.style.display = 'none';
          setWizardNextDisabled(step2Next, false);
          document.getElementById('wzRhEnd')?.classList.remove('selected');
          document.getElementById('wzRhMitte')?.classList.remove('selected');
        }
      }

      // Warmwasser = Ja: Personenzahl als Pflicht-Auswahl erfragen und Auto-Advance unterdruecken,
      // bis der Kunde eine Personenzahl-Karte gewaehlt hat (Muster wie #wzRhEnd). Bei "Nein" Block aus.
      const persBlock = document.getElementById('wzPersonen');
      if (persBlock && group.id === 'wzWarmwasser') {
        const wwNext = document.getElementById('wzWwNext');
        if (opt.dataset.value === 'ja') {
          persBlock.style.display = 'block';
          // "Weiter" sperren, bis eine Personenzahl-Karte gewaehlt ist (kein Default 3).
          const personGewaehlt = !!document.querySelector('#wzPersonenOpts .wz-person.selected');
          if (wwNext) {
            setWizardNextDisabled(wwNext, !personGewaehlt);
          }
          return; // nicht auto-advancen - Personenzahl-Auswahl + Weiter abwarten
        }
        persBlock.style.display = 'none';
        if (wwNext) {
          setWizardNextDisabled(wwNext, false);
        }
      }

      // Auto-Advance: determine which step this option belongs to
      const stepEl = opt.closest('.wizard-step');
      if (stepEl) {
        const stepNum = parseInt(stepEl.dataset.step);
        if (autoAdvanceSteps.includes(stepNum)) {
          setTimeout(() => wizNext(), 250); // Short delay for visual feedback
        }
      }
    });
  });
});

// Reihenhaus sub-option click handlers
['wzRhEnd', 'wzRhMitte'].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', () => {
    document.getElementById('wzRhEnd').classList.remove('selected');
    document.getElementById('wzRhMitte').classList.remove('selected');
    el.classList.add('selected');
    const step2Next = document.getElementById('wzStep2Next');
    const absage = document.getElementById('wzRhAbsage');
    if (id === 'wzRhMitte') {
      absage.style.display = 'block';
      setWizardNextDisabled(step2Next, true);
    } else {
      absage.style.display = 'none';
      setWizardNextDisabled(step2Next, false);
      // Auto-Advance after Endhaus selection
      setTimeout(() => wizNext(), 250);
    }
  });
});

// Fläche slider
document.getElementById('wzFlaeche')?.addEventListener('input', (e) => {
  document.getElementById('wzFlaeVal').textContent = e.target.value + ' m²';
});

// Personenzahl: Auswahl-Karten (ersetzt Slider, AE-D). Pflicht-Auswahl ohne Default;
// erst nach Klick wird "Weiter" aktiv (Muster wie #wzRhEnd). Statischer Auswahl-Zustand
// (kein Blinken, WCAG 2.3.1). scrollIntoView haelt Auswahl + "Weiter" sichtbar.
document.querySelectorAll('#wzPersonenOpts .wz-person').forEach((card) => {
  card.addEventListener('click', () => {
    document
      .querySelectorAll('#wzPersonenOpts .wz-person')
      .forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');
    wizData.personen = parseInt(card.dataset.value, 10) || wizData.personen;
    const wwNext = document.getElementById('wzWwNext');
    if (wwNext) {
      setWizardNextDisabled(wwNext, false);
    }
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});

// Verbrauch toggle
document
  .getElementById('wzVerbrauch')
  ?.querySelectorAll('.wizard-option')
  .forEach((opt) => {
    opt.addEventListener('click', () => {
      document.getElementById('wzVerbrauchInput').style.display =
        opt.dataset.value === 'known' ? 'block' : 'none';
    });
  });

// Verbrauch: Einheiten-Umschalter (kWh / m³ Gas / Liter Öl)
let wzUnit = 'kwh'; // 'kwh', 'm3' oder 'liter'
const OEL_FAKTOR = 10; // 1 Liter Heizöl ≈ 10 kWh
const GAS_FAKTOR = 10; // 1 m³ Erdgas ≈ 10 kWh

function wzSetActiveBtn(activeId) {
  const active =
    'border-width:2px;border-style:solid;border-color:var(--green);background:rgba(183,217,0,0.15);color:var(--green);font-weight:700;';
  const inactive =
    'border-width:2px;border-style:solid;border-color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.1);color:#fff;font-weight:600;';
  ['wzUnitKwh', 'wzUnitM3', 'wzUnitLiter'].forEach((id) => {
    const btn = document.getElementById(id);
    const s = id === activeId ? active : inactive;
    s.split(';')
      .filter(Boolean)
      .forEach((rule) => {
        const [k, v] = rule.split(':');
        btn.style[k.trim()] = v.trim();
      });
  });
}

function wzGetKwh() {
  const val = parseInt(document.getElementById('wzVerbrauchSlider').value);
  if (wzUnit === 'liter') return val * OEL_FAKTOR;
  if (wzUnit === 'm3') return val * GAS_FAKTOR;
  return val;
}

function wzSwitchUnit(unit) {
  const slider = document.getElementById('wzVerbrauchSlider');
  const currentKwh = wzGetKwh();

  if (unit === 'liter') {
    wzUnit = 'liter';
    slider.min = 500;
    slider.max = 12000;
    slider.step = 50;
    slider.value = Math.round(currentKwh / OEL_FAKTOR);
    wzSetActiveBtn('wzUnitLiter');
    document.getElementById('wzSliderMin').textContent = '500 Liter';
    document.getElementById('wzSliderMax').textContent = '12.000 Liter';
  } else if (unit === 'm3') {
    wzUnit = 'm3';
    slider.min = 500;
    slider.max = 12000;
    slider.step = 50;
    slider.value = Math.round(currentKwh / GAS_FAKTOR);
    wzSetActiveBtn('wzUnitM3');
    document.getElementById('wzSliderMin').textContent = '500 m³';
    document.getElementById('wzSliderMax').textContent = '12.000 m³';
  } else {
    wzUnit = 'kwh';
    slider.min = 5000;
    slider.max = 120000;
    slider.step = 500;
    slider.value = currentKwh;
    wzSetActiveBtn('wzUnitKwh');
    document.getElementById('wzSliderMin').textContent = '5.000 kWh';
    document.getElementById('wzSliderMax').textContent = '120.000 kWh';
  }
  wzUpdateVerbrauchLabel();
}

function wzUpdateVerbrauchLabel() {
  const val = parseInt(document.getElementById('wzVerbrauchSlider').value);
  if (wzUnit === 'liter') {
    document.getElementById('wzVerbVal').textContent =
      val.toLocaleString('de-DE') +
      ' Liter (≈ ' +
      (val * OEL_FAKTOR).toLocaleString('de-DE') +
      ' kWh)';
    document.getElementById('wzVerbrauchHinweis').textContent =
      'Steht auf deiner Heizöl-Rechnung oder dem Tankbeleg.';
  } else if (wzUnit === 'm3') {
    document.getElementById('wzVerbVal').textContent =
      val.toLocaleString('de-DE') +
      ' m³ (≈ ' +
      (val * GAS_FAKTOR).toLocaleString('de-DE') +
      ' kWh)';
    document.getElementById('wzVerbrauchHinweis').textContent =
      'Steht auf deiner Gas-Jahresabrechnung (Verbrauch in Kubikmetern).';
  } else {
    document.getElementById('wzVerbVal').textContent = val.toLocaleString('de-DE') + ' kWh';
    document.getElementById('wzVerbrauchHinweis').textContent =
      val > 45000 ? 'Tipp: Bei diesem Verbrauch empfehlen wir eine individuelle Beratung.' : '';
  }
}

document.getElementById('wzVerbrauchSlider')?.addEventListener('input', wzUpdateVerbrauchLabel);

function wizNext() {
  const currentStep = document.querySelector('.wizard-step.active');
  const stepNum = parseInt(currentStep.dataset.step);

  // Validate: Step 1 = PLZ, rest = option selection
  if (stepNum === 1) {
    if (!wizData.gemeinde) return;
  } else {
    const group = currentStep.querySelector('.wizard-options');
    if (group && !group.querySelector('.selected')) {
      group.style.outline = '2px solid #E53935';
      setTimeout(() => (group.style.outline = 'none'), 2000);
      return;
    }
  }

  // Save data
  // Step 1: gemeinde already set by checkPlz()
  if (stepNum === 2) {
    const mainSel = currentStep.querySelector('#wzGebaeude .selected')?.dataset.value || '';
    if (mainSel === 'rh') {
      // Reihenhaus: use sub-selection (rh-end)
      const rhSel = document.getElementById('wzRhEnd')?.classList.contains('selected')
        ? 'rh-end'
        : '';
      wizData.gebaeude = rhSel || 'rh';
    } else {
      wizData.gebaeude = mainSel;
    }
  }
  if (stepNum === 3) wizData.baujahr = currentStep.querySelector('.selected')?.dataset.value || '';
  if (stepNum === 4)
    wizData.sanierung = currentStep.querySelector('.selected')?.dataset.value || 'nein';
  if (stepNum === 5) wizData.flaeche = parseInt(document.getElementById('wzFlaeche').value);
  if (stepNum === 6) wizData.heizung = currentStep.querySelector('.selected')?.dataset.value || '';
  if (stepNum === 7)
    wizData.heizsystem = currentStep.querySelector('.selected')?.dataset.value || 'heizkoerper';
  if (stepNum === 8) {
    // Warmwasser nur aus der Ja/Nein-Gruppe lesen (Personenzahl-Karten sind eine zweite
    // .selected-Gruppe im selben Schritt); personen wird beim Karten-Klick gesetzt.
    wizData.warmwasser =
      currentStep.querySelector('#wzWarmwasser .selected')?.dataset.value || 'ja';
  }

  // Next step
  currentStep.classList.remove('active');
  const nextStep = document.querySelector(`.wizard-step[data-step="${stepNum + 1}"]`);
  if (nextStep) {
    nextStep.classList.add('active');
    wizStep = stepNum + 1;
    updateWizProgress();
    wizScrollToTop();
  }
}

function wizBack() {
  const currentStep = document.querySelector('.wizard-step.active');
  const stepNum = parseInt(currentStep.dataset.step);
  if (stepNum > 1) {
    currentStep.classList.remove('active');
    document.querySelector(`.wizard-step[data-step="${stepNum - 1}"]`).classList.add('active');
    wizStep = stepNum - 1;
    updateWizProgress();
    wizScrollToTop();
  }
}

function updateWizProgress() {
  document.querySelectorAll('.wizard-progress-bar').forEach((bar, i) => {
    bar.classList.remove('active', 'done');
    if (i + 1 === wizStep) bar.classList.add('active');
    if (i + 1 < wizStep) bar.classList.add('done');
  });
}

// Beim Schritt-/Ergebnis-Wechsel den Wizard-Anfang an den oberen Rand holen,
// damit auf dem Handy Frage+Optionen (bzw. die Empfehlung) sofort sichtbar sind
// und der Kunde nicht erst hochscrollen muss. scroll-margin-top:80px (css) haelt
// die fixe Navigation frei.
function wizScrollToTop(id = 'wizCard') {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function wizCalculate() {
  const step9 = document.querySelector('.wizard-step[data-step="9"]');
  const verbSel = step9.querySelector('.wizard-options .selected');
  if (!verbSel) {
    step9.querySelector('.wizard-options').style.outline = '2px solid #E53935';
    setTimeout(() => (step9.querySelector('.wizard-options').style.outline = 'none'), 2000);
    return;
  }

  wizData.verbrauchKnown = verbSel.dataset.value === 'known';
  wizData.verbrauch = wizData.verbrauchKnown
    ? parseInt(document.getElementById('wzVerbrauchSlider').value) || 0
    : 0;

  // Lead-Prefill für die abgespeckte Leadstrecke (/anfrage) stagen - überlebt auch den
  // Umweg über /foerderung; wird einmalig auf /anfrage konsumiert.
  try {
    sessionStorage.setItem(
      'hwLeadPrefill',
      JSON.stringify({
        gebaeude: wizData.gebaeude || null,
        heizung: wizData.heizung || null,
        baujahr: wizData.baujahr || null,
        flaeche: wizData.flaeche || null,
        heizsystem: wizData.heizsystem || null,
        plz: (document.getElementById('wzPlz')?.value || '').replace(/\D/g, '').slice(0, 5) || null,
      })
    );
  } catch (e) {}

  document.querySelectorAll('.wizard-step').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.wizard-progress-bar').forEach((b) => {
    b.classList.remove('active');
    b.classList.add('done');
  });

  const result = document.getElementById('wizResult');
  result.classList.add('active');
  wizScrollToTop();
  document.getElementById('wizResultTitle').textContent = 'Wir berechnen deine Empfehlung';
  document.getElementById('wizResultSub').textContent =
    'Die Berechnung läuft serverseitig mit den aktuellen Katalogdaten.';
  document.getElementById('wizResultCards').innerHTML =
    '<div style="border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:24px;color:var(--g300);text-align:center;">Einen Moment bitte...</div>';

  const params = new URLSearchParams({
    action: 'dimensionierung',
    flaeche: String(wizData.flaeche),
    baujahr: wizData.baujahr,
    gebaeude: wizData.gebaeude,
    sanierung: wizData.sanierung,
    warmwasser: wizData.warmwasser,
    heizsystem: wizData.heizsystem,
    verbrauchKnown: wizData.verbrauchKnown ? 'known' : 'unknown',
    verbrauch: String(wizData.verbrauch),
    einheit: wzUnit,
    plz: (document.getElementById('wzPlz')?.value || '').replace(/\D/g, '').slice(0, 5),
    personen: String(wizData.warmwasser === 'ja' ? wizData.personen : 0),
    origin: 'https://herowerk.de',
  });

  try {
    const response = await fetch(RECHNER_API + '?' + params.toString());
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (data.error) throw new Error(data.message || 'server_error');
    wizServerResult = data;
    // WP-Web: Dimensionierungs-Ergebnis (kW-Bedarf/Heizlast + bekannter Energiebedarf) fuer den
    // Lead-Prefill festhalten, damit es pfadunabhaengig bis /anfrage -> HubSpot ueberlebt.
    hwMergeLeadPrefill({
      heizlast_kw: data && data.bedarf != null ? Math.round(Number(data.bedarf) * 10) / 10 : null,
      energiebedarf_kwh: wizData.verbrauchKnown ? Number(wizData.verbrauch) || null : null,
    });
    wizSelectedMarke = data.marken?.wolf?.deckt
      ? 'wolf'
      : data.marken?.vaillant?.deckt
        ? 'vaillant'
        : 'wolf';
    renderWizServerResult(data);
  } catch (err) {
    console.error('Dimensionierung nicht verfügbar', err);
    document.getElementById('wizResultTitle').textContent = 'Berechnung gerade nicht verfügbar';
    document.getElementById('wizResultSub').textContent =
      'Bitte frage eine Beratung an. Wir prüfen die passende Wärmepumpe persönlich.';
    document.getElementById('wizResultCards').innerHTML = `
      <div style="border:2px solid rgba(232,168,56,0.35);border-radius:16px;padding:24px;background:rgba(232,168,56,0.08);">
        <h3 style="color:var(--white);margin:0 0 8px;">Berechnung gerade nicht verfügbar</h3>
        <p style="color:var(--g300);margin:0 0 16px;">Bitte Beratung anfragen. Wir melden uns mit einer individuellen Einschätzung.</p>
        <a href="/anfrage" class="btn-primary">Beratung anfragen</a>
      </div>`;
  }
}

function renderWizServerResult(data) {
  const heizLabel = data.heizsystem === 'fussboden' ? 'Fußbodenheizung' : 'Heizkörper';
  document.getElementById('wizResultTitle').textContent =
    `Deine Wärmepumpe für ca. ${formatKw(data.bedarf)} kW Bedarf`;
  document.getElementById('wizResultSub').textContent =
    `Überschlägige Berechnung. Die exakte Dimensionierung erfolgt über das Hüllflächenverfahren und DIN EN 12831. ${heizLabel} · ca. Jahresarbeitszahl ${formatKw(data.jaz)}.`;
  // Transparenz: spezifische Heizlast (≈ W/m²) + welches Schätzverfahren griff (Verbrauch vs. Fläche).
  // Felder kommen aus dem Backend (dimensionierung_); fehlen sie (alte /exec-Version), bleibt die Zeile leer.
  const wm2 = data.spez_heizlast_wm2
    ? `ca. <strong>${data.spez_heizlast_wm2} W/m²</strong> spezifische Heizlast`
    : '';
  const sep = wm2 && data.methode_hinweis ? ' · ' : '';
  const methodLine =
    wm2 || data.methode_hinweis
      ? `<div class="wiz-result-method" style="font-size:13px;color:var(--g300);margin:0 0 16px;text-align:center;">${wm2}${sep}${data.methode_hinweis || ''}</div>`
      : '';
  document.getElementById('wizResultCards').innerHTML = `
    <div class="foerder-grid wiz-result-shell">
      ${methodLine}
      <div class="wiz-result-grid">
        ${renderBrandCard('wolf', 'Wolf', data.marken?.wolf, data.bedarf)}
        ${renderBrandCard('vaillant', 'Vaillant', data.marken?.vaillant, data.bedarf)}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px;">
        <button class="btn-ghost" onclick="wizReset()" style="flex:1;min-width:150px;cursor:pointer;">← Neu berechnen</button>
        <a href="/anfrage" class="btn-primary" style="flex:1.5;min-width:220px;text-align:center;">Jetzt kostenlos beraten lassen</a>
        <button class="btn-ghost" onclick="wizToFoerder()" style="flex:1.2;min-width:210px;cursor:pointer;">Weiter zur Förderung →</button>
      </div>
      <div class="wiz-din-note">
        <strong>Überschlägige Berechnung. Die exakte Dimensionierung erfolgt über das Hüllflächenverfahren und DIN EN 12831.</strong>
        <p>Dieser Rechner gibt dir eine erste Orientierung auf Basis deiner Gebäudedaten und unserer Erfahrungswerte. Die verbindliche Auslegung deiner Wärmepumpe ermitteln wir vor Ort nach dem Hüllflächenverfahren und der Heizlast-Norm DIN EN 12831. Das ist genauer als jede Faustformel und sorgt dafür, dass deine Anlage weder zu groß noch zu klein ausfällt. Diese normgerechte Berechnung verlangt auch die Förderung, wir liefern sie dir also ohnehin mit.</p>
      </div>
      <div style="margin-top:14px;font-size:12px;line-height:1.5;color:var(--g400);">* Bis zu 80 Prozent Förderung = Grundförderung 30 Prozent + Klimabonus 16 Prozent + Einkommensbonus 40 Prozent. Voraussetzungen: selbstnutzende Eigentümer, funktionsfähige Öl-, Kohle-, Gasetagen- oder Nachtspeicherheizung oder Gas- bzw. Biomasseheizung ab 20 Jahren, anrechenbares zu versteuerndes Haushaltseinkommen bis 30.000 Euro (bei mindestens einem minderjährigen Kind werden einmalig 10.000 Euro abgezogen), Antrag im Zeitraum 21.07.2026 bis 31.01.2027 (danach sinkt der Klimabonus halbjährlich). Gedeckelt auf 80 Prozent von höchstens 28.000 Euro förderfähigen Kosten der ersten Wohneinheit, also höchstens 22.400 Euro Zuschuss. Brutto inkl. MwSt. Verbindlicher Preis nach Vor-Ort-Termin.</div>
    </div>`;
}

// Marken-Schriftzug fuer die Ergebnis-Panels - alle Marken (Wolf, Vaillant) als Text,
// kein Hersteller-Logo. Gleichbehandlung + keine optische Bevorzugung (GF 2026-06-29);
// currentColor = theme-aware (weiss auf dunkel, Schiefer auf hell).
function brandLogo(key, label) {
  return `<span class="wiz-brand-logo" role="img" aria-label="${label}" style="font-weight:800;font-size:19px;letter-spacing:0.01em;line-height:22px;display:block;">${label}</span>`;
}

function renderBrandCard(key, label, brand, bedarf) {
  const selected = wizSelectedMarke === key;
  const cls = 'foerder-result wiz-brand-panel' + (selected ? ' wiz-selected' : '');
  const badge = selected ? '<span class="wiz-brand-badge">✓ Ausgewählt</span>' : '';
  const head = `<div class="wiz-brand-head">${brandLogo(key, label)}${badge}</div>`;
  if (!brand || !brand.deckt) {
    return `<button type="button" class="${cls}" onclick="wizSelectMarke('${key}')" style="text-align:left;font:inherit;">
      ${head}
      <div class="wiz-brand-satz"><div class="fr-satz" style="font-size:24px;line-height:1.2;">Individuelle Planung</div></div>
      <div class="fr-row"><span>Dein Bedarf</span><span class="fr-val">${formatKw(bedarf)} kW</span></div>
      <div class="fr-row"><span>Auslegung</span><span class="fr-val">im Vor-Ort-Termin</span></div>
    </button>`;
  }
  // FAIL-CLOSED (P-16): Ohne Preistafel-Treffer liefert das Backend eigenanteil = null -> "auf
  // Anfrage" statt einer stillen Notrechnung oder "ab 0 EUR".
  const eigenSatz =
    brand.eigenanteil == null
      ? '<div class="fr-satz" style="font-size:24px;line-height:1.2;">Preis auf Anfrage</div><div class="fr-label" style="margin-bottom:0;">Eigenanteil im Vor-Ort-Termin</div>'
      : `<div class="fr-satz" style="font-size:40px;">ab ${formatEuro(brand.eigenanteil)}</div><div class="fr-label" style="margin-bottom:0;">geschätzter Eigenanteil nach max. Förderung (80 %)*</div>`;
  return `<button type="button" class="${cls}" onclick="wizSelectMarke('${key}')" style="text-align:left;font:inherit;">
    ${head}
    <div class="wiz-brand-satz">${eigenSatz}</div>
    <div class="fr-row"><span>Empfohlenes Modell</span><span class="fr-val">${modellZweizeilig(brand.modell)}</span></div>
    <div class="fr-row"><span>Deckt deinen Bedarf</span><span class="fr-val">${formatKw(bedarf)} kW${brand.kaskade ? ' · Kaskade' : ''} ✓</span></div>
    <div class="fr-row"><span>Brutto-Richtpreis vor Förderung</span><span class="fr-val">ab ${formatEuro(brand.brutto)}</span></div>
  </button>`;
}

function wizSelectMarke(key) {
  wizSelectedMarke = key;
  if (wizServerResult) renderWizServerResult(wizServerResult);
}

function modellZweizeilig(m) {
  var s = String(m == null ? '' : m).trim();
  var match = s.match(/^(\d+\s*[×x]\s*)?(Wolf|Vaillant)\s+(.+)$/);
  if (!match) return s;
  return (
    '<span style="display:block;">' +
    (match[1] || '') +
    match[2] +
    '</span><span style="display:block;">' +
    match[3] +
    '</span>'
  );
}
function formatEuro(value) {
  return Math.round(Number(value) || 0).toLocaleString('de-DE') + String.fromCharCode(160) + '€';
}
function formatKw(value) {
  return Number(value || 0).toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

// Optik-Vorschau ohne Backend: rendert das Ergebnis mit Beispielwerten.
// Aktiv NUR auf Vercel-Preview-Hosts via ?demo - niemals auf herowerk.de.
function wizDemo() {
  if (!document.getElementById('wizResult')) return;
  const demoData = {
    bedarf: 9.2,
    jaz: 3.8,
    heizsystem: 'heizkoerper',
    marken: {
      wolf: {
        deckt: true,
        modell: 'Wolf CHA-10',
        brutto: 33721,
        eigenanteil: 11321,
        kaskade: false,
      },
      vaillant: {
        deckt: true,
        modell: 'Vaillant VWL 105/8.1 A',
        brutto: 40276,
        eigenanteil: 17876,
        kaskade: false,
      },
    },
  };
  wizServerResult = demoData;
  wizSelectedMarke = 'wolf';
  document.querySelectorAll('.wizard-step').forEach((s) => s.classList.remove('active'));
  document.getElementById('wizResult').classList.add('active');
  renderWizServerResult(demoData);
}
if (
  typeof location !== 'undefined' &&
  location.search.indexOf('demo') !== -1 &&
  /\.vercel\.app$/.test(location.hostname)
) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wizDemo);
  else wizDemo();
}

function wizReset() {
  document.getElementById('wizResult').classList.remove('active');
  document.querySelectorAll('.wizard-step').forEach((s) => s.classList.remove('active'));
  document.querySelector('.wizard-step[data-step="1"]').classList.add('active');
  document.querySelectorAll('.wizard-option').forEach((o) => o.classList.remove('selected'));
  wizData.sanierung = 'nein';
  wizStep = 1;
  updateWizProgress();
  // Zum Wizard-Anfang scrollen (Kachel-Oberkante)
  wizScrollToTop();
}

// ===== WIZARD → FÖRDERRECHNER: Datenübernahme =====
function wizToFoerder() {
  // Förderrechner liegt auf /foerderung (auf dieser Seite nicht eingebettet). Ist er hier
  // nicht vorhanden, direkt dorthin navigieren - sonst lief die Vorbefüllung ins Leere und
  // der Button wirkte "nicht verlinkt" (Navigation am Funktionsende wurde nie erreicht).
  if (!document.getElementById('foerder')) {
    // Werte für die Förderrechner-Seite mitnehmen -> dort Vorbefüllung nach dem Laden.
    try {
      const sel = wizServerResult?.marken?.[wizSelectedMarke];
      sessionStorage.setItem(
        'hwFoerderPrefill',
        JSON.stringify({
          marke: wizSelectedMarke || 'wolf',
          brutto: sel?.brutto || null,
          gemeinde: wizData.gemeinde || null,
          heizung: wizData.heizung || null,
          gebaeude: wizData.gebaeude || null,
        })
      );
    } catch (e) {}
    window.location.href = '/foerderung';
    return;
  }
  const selected = wizServerResult?.marken?.[wizSelectedMarke];
  foerderMarke = wizSelectedMarke || 'wolf';

  setKostenModus('manuell');
  foerderSelectPackage(foerderMarke, 'm');
  const kostenInput = document.getElementById('wpKostenInput');
  if (kostenInput && selected?.brutto)
    kostenInput.value = Math.round(selected.brutto).toLocaleString('de-DE') + ' €';

  const gemeindeSelect = document.getElementById('gemeinde');
  if (gemeindeSelect && wizData.gemeinde) {
    const gemeindeVal = wizData.gemeinde.toLowerCase();
    const match = Array.from(gemeindeSelect.options).find((o) => o.value === gemeindeVal);
    gemeindeSelect.value = match ? gemeindeVal : 'sonstige';
  }

  const heizungSelect = document.getElementById('heizung');
  if (heizungSelect && wizData.heizung) {
    const heizMap = {
      'gas-old': 'gas',
      'gas-new': 'gas',
      'gas-etage': 'gas-etage',
      oel: 'oel',
      biomasse: 'biomasse',
      kohle: 'kohle',
      nachtspeicher: 'nachtspeicher',
      sonstige: 'sonstige',
    };
    heizungSelect.value = heizMap[wizData.heizung] || 'gas';
    toggleHeizungsalter();
  }

  if (wizData.heizung === 'gas-old') {
    setAlterModus('alter');
    const alterSelect = document.getElementById('heizungAlterSelect');
    if (alterSelect) alterSelect.value = '20';
  } else if (wizData.heizung === 'gas-new') {
    setAlterModus('alter');
    const alterSelect = document.getElementById('heizungAlterSelect');
    if (alterSelect) alterSelect.value = '15';
  }

  const weSelect = document.getElementById('wohneinheiten');
  if (weSelect && wizData.gebaeude) {
    const weMap = { efh: '1', dhh: '1', dh: '1', rh: '1', 'rh-end': '1', zfh: '2', mfh: '5' };
    weSelect.value = weMap[wizData.gebaeude] || '1';
  }

  const snSelect = document.getElementById('selbstnutzung');
  if (snSelect) snSelect.value = '1';

  if (typeof updateSelbstnutzungOptionen === 'function') updateSelbstnutzungOptionen();
  if (typeof calculateFoerder === 'function') calculateFoerder();

  const foerderSection = document.getElementById('foerder');
  // Beim Wechsel in den Förderrechner oben auf der Seite starten (neues Thema von Anfang an
  // erfassen), nicht zum Ergebnis-Abschnitt nach unten springen. (GF 22.06.)
  if (foerderSection) window.scrollTo({ top: 0, behavior: 'auto' });
  else window.location.href = '/foerderung';
}

// Formatiert das Kosten-Eingabefeld als Eurowert (Tausenderpunkt + €). Der Parse-Pfad
// (calculateFoerder) strippt alle Nicht-Ziffern, daher bleibt die Berechnung korrekt.
function formatKostenInput(el) {
  const n = parseInt((el.value || '').replace(/[^0-9]/g, ''), 10);
  el.value = Number.isFinite(n) && n > 0 ? n.toLocaleString('de-DE') + ' €' : '';
}

// ===== PREISANKER: Expand/Collapse-Karten mit Tech-Specs =====
// Produktdaten - Inline-Fallback für lokale Entwicklung (file://)
// Preise = Single Source: live aus dem Sheet über den Rechner-Server (action=preise).
// Präsentation (Specs/Bilder/Modell/Icons) bleibt statisch in paDataFallback; nur die
// Preisfelder (preis/eigen/info) werden mit Live-Werten überschrieben.
// PA_KLASSEN muss in der Reihenfolge zu paDataFallback passen (Kompakt..Kaskade = s..xxl).
let paData = [];
let paPrices = { wolf: [], vaillant: [] };
const PA_KLASSEN = ['s', 'm', 'l', 'xl', 'xxl'];
const FOERDER_PACKAGE_FALLBACK = {
  wolf: [
    { klasse: 's', modell: 'Wolf CHA-07', kw: '5-7 kW', brutto: 29568 },
    { klasse: 'm', modell: 'Wolf CHA-10', kw: '9-12 kW', brutto: 33721 },
    { klasse: 'l', modell: 'Wolf CHA-16/20', kw: '14-16 kW', brutto: 41360 },
    { klasse: 'xl', modell: 'Wolf CHA-20/24', kw: '18-24 kW', brutto: 48972 },
    { klasse: 'xxl', modell: '2× Wolf CHA-16', kw: '32 kW', brutto: 89419 },
  ],
  vaillant: [
    { klasse: 's', modell: 'Vaillant VWL 55/8.1 A', kw: 'ca. 5,6 kW', brutto: 28963 },
    { klasse: 'm', modell: 'Vaillant VWL 75/8.1 A', kw: 'ca. 6,9 kW', brutto: 32755 },
    { klasse: 'l', modell: 'Vaillant VWL 105/8.1 A', kw: 'ca. 10,6 kW', brutto: 40276 },
    { klasse: 'xl', modell: 'Vaillant VWL 125/8.1 A', kw: 'ca. 12,1 kW', brutto: 46159 },
    { klasse: 'xxl', modell: '2× Vaillant VWL 125/8.1 A', kw: 'ca. 24 kW', brutto: 79060 },
  ],
};

// Robustheit gegen Preisfelder ohne Zahl: Für die Kaskade ist die Paket-Konstellation nicht
// definiert, deshalb liefert die Live-Row keinen Eigenanteil. Ein reiner `!== null`-Test würde bei
// undefined/NaN durchfallen und in `.toLocaleString()` crashen. Nur echte, endliche
// Zahlen gelten als anzeigbar, alles andere rendert als "auf Anfrage".
function paHasNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function paCloneFallback(data) {
  return data.map((d) => ({
    ...d,
    specs: d.specs.map((spec) => [...spec]),
  }));
}

function paRowsByKlasse(rows) {
  return (rows || []).reduce((acc, row) => {
    if (row && row.klasse) acc[row.klasse] = row;
    return acc;
  }, {});
}

function foerderGetSelectedPackage() {
  const select = document.getElementById('foerderWpTyp');
  const selected = select?.selectedOptions?.[0];
  const raw = selected?.value || select?.value || 'wolf:m';
  const parts = raw.includes(':')
    ? raw.split(':')
    : [selected?.dataset.brand || foerderMarke || 'wolf', raw];
  const marke = parts[0] === 'vaillant' ? 'vaillant' : 'wolf';
  const klasse = PA_KLASSEN.includes(parts[1]) ? parts[1] : 'm';
  const row = foerderPackageRows(marke).find((item) => item.klasse === klasse);
  return {
    marke,
    klasse,
    price: Number(selected?.dataset.price || row?.brutto || 0),
  };
}

function foerderPackageRows(brand) {
  const rows =
    paPrices[brand] && paPrices[brand].length ? paPrices[brand] : FOERDER_PACKAGE_FALLBACK[brand];
  return PA_KLASSEN.map((klasse) => rows.find((row) => row.klasse === klasse)).filter(Boolean);
}

function foerderFormatPackageOption(row) {
  const brutto = Number(row.brutto) || 0;
  const kw = String(row.kw || '').replace(/^ca\.\s*/i, '');
  return row.modell + ' · ' + kw + ' · ' + brutto.toLocaleString('de-DE') + ' €';
}

function foerderRefreshPackageOptions() {
  const select = document.getElementById('foerderWpTyp');
  if (!select) return;
  const current = foerderGetSelectedPackage();
  select.innerHTML = '';
  [
    ['wolf', 'Wolf CHA'],
    ['vaillant', 'Vaillant aroTHERM plus'],
  ].forEach(([brand, label]) => {
    const group = document.createElement('optgroup');
    group.label = label;
    foerderPackageRows(brand).forEach((row) => {
      const option = document.createElement('option');
      option.value = brand + ':' + row.klasse;
      option.dataset.brand = brand;
      option.dataset.klasse = row.klasse;
      option.dataset.price = String(row.brutto || '');
      option.textContent = foerderFormatPackageOption(row);
      group.appendChild(option);
    });
    select.appendChild(group);
  });
  const nextValue = current.marke + ':' + current.klasse;
  select.value = Array.from(select.options).some((option) => option.value === nextValue)
    ? nextValue
    : 'wolf:m';
  foerderMarke = foerderGetSelectedPackage().marke;
}

function foerderSelectPackage(brand, klasse) {
  const select = document.getElementById('foerderWpTyp');
  if (!select) return;
  const nextBrand = brand === 'vaillant' ? 'vaillant' : 'wolf';
  const nextKlasse = PA_KLASSEN.includes(klasse) ? klasse : 'm';
  select.value = nextBrand + ':' + nextKlasse;
  foerderMarke = nextBrand;
}

function paApplyBrand(brand) {
  const selectedBrand = brand === 'vaillant' ? 'vaillant' : 'wolf';
  const fallback = selectedBrand === 'vaillant' ? paDataFallbackVaillant : paDataFallback;
  const byKlasse = paRowsByKlasse(paPrices[selectedBrand]);
  paData = paCloneFallback(fallback);
  paData.forEach((d, i) => {
    const row = byKlasse[PA_KLASSEN[i]];
    if (!row) {
      d.preis = null;
      d.eigen = null;
      d.info = 'Preis auf Anfrage: den genauen Richtpreis nennen wir im Vor-Ort-Termin.';
      return;
    }
    d.preis = paHasNumber(row.brutto) ? row.brutto : null;
    d.eigen = paHasNumber(row.eigen) ? row.eigen : null;
    // Ohne beide Zahlen keine KfW-Differenz bilden (sonst "bis -NaN €").
    d.info =
      paHasNumber(d.preis) && paHasNumber(d.eigen)
        ? 'Richtpreis: ab ' +
          d.preis.toLocaleString('de-DE') +
          ' € brutto · KfW: bis -' +
          (d.preis - d.eigen).toLocaleString('de-DE') +
          ' €'
        : 'Preis auf Anfrage, wir rechnen dein Projekt projektgenau durch.';
  });
  paUpdateMinimum(selectedBrand);
}

async function paLoadData() {
  // Beide Marken-Labels (wolfMinEigen/vaillantMinEigen) beim Laden fuellen, nicht
  // erst beim Tab-Klick. Wolf zuletzt -> aktive Ansicht + paData bleiben Wolf.
  paApplyBrand('vaillant');
  paApplyBrand('wolf');
  foerderRefreshPackageOptions();
  try {
    const response = await fetch(RECHNER_API + '?action=preise&origin=https://herowerk.de');
    if (!response.ok) throw new Error(response.status);
    const data = await response.json();
    paPrices = {
      wolf: (data && data.wolf) || [],
      vaillant: (data && data.vaillant) || [],
    };
    const bruttoMap = {};
    paPrices.wolf.forEach((row) => {
      bruttoMap[row.klasse] = row.brutto;
    });
    if (typeof window !== 'undefined') window.HW_PREISE_BRUTTO = bruttoMap;
    foerderRefreshPackageOptions();
    paApplyBrand('vaillant');
    paApplyBrand('wolf');
  } catch (e) {
    console.info('Live-Preise nicht verfügbar, zeige "auf Anfrage"', e);
    foerderRefreshPackageOptions();
  }
}

function paFormatEuro(value) {
  return value.toLocaleString('de-DE') + ' €';
}

function paUpdateMinimum(brand) {
  const targetId = brand === 'vaillant' ? 'vaillantMinEigen' : 'wolfMinEigen';
  const target = document.getElementById(targetId);
  if (!target || !paData.length) return;
  const min = paData
    .map((item) => item.eigen)
    .filter(paHasNumber)
    .sort((a, b) => a - b)[0];
  if (paHasNumber(min)) target.textContent = 'ab ' + paFormatEuro(min) + ' Eigenanteil*';
}

function paSelectManufacturer(manufacturer) {
  const selectedManufacturer = manufacturer === 'vaillant' ? 'vaillant' : 'wolf';
  const detail = document.getElementById('paDetail');
  const cardsContainer = document.getElementById('paCards');
  document.querySelectorAll('.manufacturer-tab').forEach((tab) => {
    const selected = tab.dataset.manufacturer === selectedManufacturer;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.tabIndex = selected ? 0 : -1;
  });
  paApplyBrand(selectedManufacturer);
  paRenderCards();
  document
    .querySelectorAll('.pa-card')
    .forEach((card) => card.classList.remove('zoomed', 'dimmed'));
  if (detail) detail.classList.remove('open');
  if (cardsContainer) cardsContainer.classList.remove('has-selection');
  paOpenIdx = -1;
}

function paInitManufacturerTabs() {
  const tabs = Array.from(document.querySelectorAll('.manufacturer-tab'));
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => paSelectManufacturer(tab.dataset.manufacturer));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Enter' || event.key === ' ') {
        paSelectManufacturer(tab.dataset.manufacturer);
        return;
      }
      let nextIndex = index;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      tabs[nextIndex].focus();
      paSelectManufacturer(tabs[nextIndex].dataset.manufacturer);
    });
  });
}

const paDataFallback = [
  {
    name: 'Kompakt',
    label: 'Kompaktes Wohnhaus',
    hausgroesse: 'bis ca. 120 m²',
    modell: 'Wolf CHA-07',
    kw: 'A-7/W35: 2,4-6,8 kW',
    icon: '<svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 4L4 14h3v12h18V14h3L16 4z"/><rect x="13" y="19" width="6" height="7"/></svg>',
    img: 'cha-sanierung.jpg',
    desc: 'Gut gedämmtes Haus mit niedrigem Wärmebedarf',
    preis: 29750,
    eigen: 7350,
    info: 'Richtpreis: ab 29.750 € brutto · KfW: bis -22.400 €',
    specs: [
      ['Heizleistung A-7/W35', '2,4-6,8 kW'],
      ['Heizstab (optional)', '9 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 70 °C'],
      ['Schallleistung ErP', '52 dB(A)'],
      ['Effizienzklasse', 'A+++ (35 °C) · A++ (55 °C)'],
      ['SCOP (35 / 55 °C)²', '4,92 / 3,77'],
      ['JAZ Heizkörper¹', '3,96'],
      ['JAZ Fußbodenheizung¹', '4,92'],
      ['Abmessung außen (BxHxT)', '1.286 × 979 × 562 mm'],
      ['Hersteller', 'WOLF GmbH'],
    ],
  },
  {
    name: 'Standard',
    label: 'Einfamilienhaus',
    hausgroesse: 'ca. 120-180 m²',
    modell: 'Wolf CHA-10',
    kw: 'A-7/W35: 2,3-9,8 kW',
    icon: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 3L3 14h3v14h20V14h3L16 3z"/><rect x="12" y="18" width="8" height="10"/></svg>',
    img: 'cha-neubau-dunkel.jpg',
    desc: 'Der Klassiker. Für die meisten Einfamilienhäuser',
    preis: 34510,
    eigen: 12110,
    info: 'Richtpreis: ab 34.510 € brutto · KfW: bis -22.400 €',
    specs: [
      ['Heizleistung A-7/W35', '2,3-9,8 kW'],
      ['Heizstab (optional)', '9 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 70 °C'],
      ['Schallleistung ErP', '53 dB(A)'],
      ['Effizienzklasse', 'A+++ (35 °C) · A++ (55 °C)'],
      ['SCOP (35 / 55 °C)²', '4,86 / 3,60'],
      ['JAZ Heizkörper¹', '4,10'],
      ['JAZ Fußbodenheizung¹', '5,09'],
      ['Abmessung außen (BxHxT)', '1.286 × 979 × 562 mm'],
      ['Hersteller', 'WOLF GmbH'],
    ],
  },
  {
    name: 'Komfort',
    label: 'Großzügiges Zuhause',
    hausgroesse: 'ca. 180-280 m²',
    modell: 'Wolf CHA-16/20',
    kw: 'A-7/W35: 3,7-16,7 kW',
    icon: '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 3L3 16h3v16h24V16h3L18 3z"/><rect x="10" y="19" width="6" height="13"/><rect x="20" y="12" width="5" height="5"/><rect x="20" y="22" width="6" height="10"/></svg>',
    img: 'cha-komfort-neubau.jpg',
    desc: 'Für größere Häuser mit höherem Wärmebedarf',
    preis: 45220,
    eigen: 22820,
    info: 'Richtpreis: ab 45.220 € brutto · KfW: bis -22.400 €',
    specs: [
      ['Heizleistung A-7/W35', '3,7-16,7 kW'],
      ['Heizstab (optional)', '9 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 70 °C'],
      ['Schallleistung ErP', '52 dB(A)'],
      ['Effizienzklasse', 'A+++ (35 °C) · A+++ (55 °C)'],
      ['SCOP (35 / 55 °C)²', '5,46 / 3,92'],
      ['JAZ Heizkörper¹', '4,04'],
      ['JAZ Fußbodenheizung¹', '5,03'],
      ['Abmessung außen (BxHxT)', '1.700 × 1.300 × 756 mm'],
      ['Hersteller', 'WOLF GmbH'],
    ],
  },
  {
    name: 'Premium',
    label: 'Zwei Familien unter einem Dach',
    hausgroesse: 'ab 250 m² / 2 WE',
    modell: 'Wolf CHA-20/24',
    kw: 'A-7/W35: 3,7-19,6 kW',
    icon: '<svg width="38" height="38" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 3L3 17h3v19h28V17h3L20 3z"/><line x1="20" y1="17" x2="20" y2="36"/><rect x="8" y="22" width="6" height="10"/><rect x="26" y="22" width="6" height="10"/></svg>',
    img: 'cha-mfh-saniert.jpg',
    desc: 'Zweifamilienhaus oder großes Einfamilienhaus',
    preis: 57120,
    eigen: 34720,
    info: 'Richtpreis: ab 57.120 € brutto · KfW: bis -22.400 €',
    specs: [
      ['Heizleistung A-7/W35', '3,7-19,6 kW'],
      ['Heizstab (optional)', '9 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 70 °C'],
      ['Schallleistung ErP', '53 dB(A)'],
      ['Effizienzklasse', 'A+++ (35 °C) · A+++ (55 °C)'],
      ['SCOP (35 / 55 °C)²', '5,20 / 3,88'],
      ['JAZ Heizkörper¹', '3,99'],
      ['JAZ Fußbodenheizung¹', '4,96'],
      ['Abmessung außen (BxHxT)', '1.700 × 1.300 × 756 mm'],
      ['Hersteller', 'WOLF GmbH'],
    ],
  },
  {
    name: 'Kaskade',
    label: 'Mehrfamilienhaus & Gewerbe',
    hausgroesse: 'Ref. 6 WE MFH',
    modell: '2× Wolf CHA-16/20',
    kw: '2× 16,7 kW @A-7/W35',
    imgPos: 'center 70%',
    icon: '<svg width="40" height="40" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="14" width="16" height="26"/><rect x="24" y="8" width="16" height="32"/><rect x="8" y="20" width="4" height="4"/><rect x="8" y="28" width="4" height="4"/><rect x="28" y="14" width="4" height="4"/><rect x="28" y="22" width="4" height="4"/><rect x="28" y="30" width="4" height="4"/><rect x="34" y="14" width="3" height="4"/><rect x="34" y="22" width="3" height="4"/></svg>',
    img: 'cha-kaskade-mfh.jpg',
    desc: 'Referenz: 6 WE MFH mit 2er-Kaskade*',
    preis: 82223,
    // Mehr-WE-Projekt: Die Staffel ist nach Kanon 1.4 belegt. Ohne definierte
    // Paket-Konstellation bleibt der Eigenanteil trotzdem bewusst ohne Zahl.
    eigen: null,
    info: 'Für die erste Wohneinheit sind 28.000 Euro förderfähig, für die zweite bis sechste Wohneinheit je 15.000 Euro, ab der siebten je 8.000 Euro. Die Grenzen der weiteren Wohneinheiten bleiben auch nach der Reform unverändert, nur die Grenze der ersten Wohneinheit sinkt. Den Eigenanteil der Kaskade rechnen wir projektgenau, weil die Paket-Konstellation nicht definiert ist.',
    specs: [
      ['Heizleistung A-7/W35', '33,4 kW (2× 16,7)'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', '2er-Kaskade (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 70 °C'],
      ['Kaskadierung', 'bis 5 Außengeräte / max. 100 kW'],
      ['Effizienzklasse', 'A+++ (systemabhängig)'],
      ['SCOP (35 / 55 °C)²', '5,46 / 3,92 je Gerät'],
      ['JAZ Heizkörper¹', '4,04 je Gerät; projektbezogen prüfen'],
      ['JAZ Fußbodenheizung¹', '5,03 je Gerät; projektbezogen prüfen'],
      ['Schallleistung ErP', '52 dB(A) je Gerät'],
      ['Hersteller', 'WOLF GmbH'],
    ],
  },
];

const paDataFallbackVaillant = [
  {
    name: 'Kompakt',
    label: 'Kompaktes Wohnhaus',
    hausgroesse: 'bis ca. 80 m²',
    modell: 'Vaillant aroTHERM plus VWL 55/8.1 A',
    kw: 'A-7/W35: 5,59 kW',
    icon: paDataFallback[0].icon,
    img: 'vwl-s-m.jpg',
    desc: 'Kompaktes Haus mit moderatem Wärmebedarf',
    specs: [
      ['Heizleistung A-7/W35', '5,59 kW (COP 2,67)'],
      ['Heizleistung (Pdesignh)', '6 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 75 °C'],
      ['Schallleistung ErP außen', '44 dB(A)'],
      ['Effizienzklasse (35 / 55 °C)', 'A+++ / A++'],
      ['ηs (35 / 55 °C)', '190 % / 143 %'],
      ['SCOP (35 / 55 °C)²', '4,83 / 3,64'],
      ['JAZ Heizkörper¹', '3,72'],
      ['JAZ Fußbodenheizung¹', '4,41'],
      ['Abmessung (BxTxH)', '1.100 × 450 × 765 mm'],
      ['Hersteller', 'Vaillant Deutschland GmbH & Co. KG'],
    ],
  },
  {
    name: 'Standard',
    label: 'Einfamilienhaus',
    hausgroesse: 'ca. 80-100 m²',
    modell: 'Vaillant aroTHERM plus VWL 75/8.1 A',
    kw: 'A-7/W35: 6,94 kW',
    icon: paDataFallback[1].icon,
    img: 'vwl-s-m.jpg',
    desc: 'Der Klassiker für viele Einfamilienhäuser',
    specs: [
      ['Heizleistung A-7/W35', '6,94 kW (COP 2,94)'],
      ['Heizleistung (Pdesignh)', '7 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 75 °C'],
      ['Schallleistung ErP außen', '47 dB(A)'],
      ['Effizienzklasse (35 / 55 °C)', 'A+++ / A++'],
      ['ηs (35 / 55 °C)', '196 % / 142 %'],
      ['SCOP (35 / 55 °C)²', '4,98 / 3,62'],
      ['JAZ Heizkörper¹', '3,76'],
      ['JAZ Fußbodenheizung¹', '4,45'],
      ['Abmessung (BxTxH)', '1.100 × 450 × 965 mm'],
      ['Hersteller', 'Vaillant Deutschland GmbH & Co. KG'],
    ],
  },
  {
    name: 'Komfort',
    label: 'Großzügiges Zuhause',
    hausgroesse: 'ca. 100-150 m²',
    modell: 'Vaillant aroTHERM plus VWL 105/8.1 A',
    kw: 'A-7/W35: 10,58 kW',
    icon: paDataFallback[2].icon,
    img: 'vwl-l.jpg',
    desc: 'Für größere Häuser mit höherem Wärmebedarf',
    specs: [
      ['Heizleistung A-7/W35', '10,58 kW (COP 3,01)'],
      ['Heizleistung (Pdesignh)', '11 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 75 °C'],
      ['Schallleistung ErP außen', '50 dB(A)'],
      ['Effizienzklasse (35 / 55 °C)', 'A+++ / A+++'],
      ['ηs (35 / 55 °C)', '202 % / 151 %'],
      ['SCOP (35 / 55 °C)²', '5,13 / 3,86'],
      ['JAZ Heizkörper¹', '4,03'],
      ['JAZ Fußbodenheizung¹', '4,77'],
      ['Abmessung (BxTxH)', '1.100 × 450 × 1.480 mm'],
      ['Hersteller', 'Vaillant Deutschland GmbH & Co. KG'],
    ],
  },
  {
    name: 'Premium',
    label: 'Großes Zuhause',
    hausgroesse: 'ca. 150-175 m²',
    modell: 'Vaillant aroTHERM plus VWL 125/8.1 A',
    kw: 'A-7/W35: 12,14 kW',
    icon: paDataFallback[3].icon,
    img: 'vwl-xl.jpg',
    desc: 'Großes Einfamilienhaus mit hohem Bedarf',
    specs: [
      ['Heizleistung A-7/W35', '12,14 kW (COP 2,72)'],
      ['Heizleistung (Pdesignh)', '12 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 75 °C'],
      ['Schallleistung ErP außen', '50 dB(A)'],
      ['Effizienzklasse (35 / 55 °C)', 'A+++ / A+++'],
      ['ηs (35 / 55 °C)', '202 % / 151 %'],
      ['SCOP (35 / 55 °C)²', '5,12 / 3,85'],
      ['JAZ Heizkörper¹', '4,05'],
      ['JAZ Fußbodenheizung¹', '4,80'],
      ['Abmessung (BxTxH)', '1.100 × 450 × 1.480 mm'],
      ['Hersteller', 'Vaillant Deutschland GmbH & Co. KG'],
    ],
  },
  {
    name: 'Kaskade',
    label: 'Mehrfamilienhaus & Gewerbe',
    hausgroesse: 'ab ca. 175 m² / MFH',
    modell: '2× Vaillant VWL 125/8.1 A',
    kw: '2× 12,14 kW @A-7/W35',
    imgPos: 'center 70%',
    icon: paDataFallback[4].icon,
    img: 'vwl-xxl.jpg',
    desc: 'Mehrfamilienhaus mit 2er-Kaskade*',
    specs: [
      ['Heizleistung A-7/W35', '24,28 kW (2× 12,14)'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Kaskade (2 Außengeräte)'],
      ['Vorlauftemp.', 'bis 75 °C'],
      ['Effizienzklasse', 'A+++ (systemabhängig)'],
      ['ηs (35 / 55 °C)', '202 % / 151 % je Gerät'],
      ['SCOP (35 / 55 °C)²', '5,12 / 3,85 je Gerät'],
      ['JAZ Heizkörper¹', '4,05 je Gerät; projektbezogen prüfen'],
      ['JAZ Fußbodenheizung¹', '4,80 je Gerät; projektbezogen prüfen'],
      ['Schallleistung ErP außen', '50 dB(A) je Gerät'],
      ['Hersteller', 'Vaillant Deutschland GmbH & Co. KG'],
    ],
  },
];

// Karten rendern (nur kompakte Header, kein Preis-Doppelt)
function paRenderCards() {
  const container = document.getElementById('paCards');
  paUpdateMinimum(
    document.querySelector('.manufacturer-tab.active')?.dataset.manufacturer || 'wolf'
  );
  if (!container) return;
  container.innerHTML = paData
    .map((d, i) => {
      const priceHtml = paHasNumber(d.eigen)
        ? `<div class="pa-price-compact">ab ${d.eigen.toLocaleString('de-DE')} €</div><div class="pa-label">Eigenanteil*</div>`
        : `<div class="pa-price-compact" style="font-size:17px;">Auf Anfrage</div><div class="pa-label">projektgenau</div>`;

      const defaultClass = i === 0 ? ' pa-default-highlight' : '';
      const iconHtml = d.icon
        ? `<div style="color:var(--green);margin-bottom:8px;display:flex;justify-content:center;">${d.icon}</div>`
        : '';
      const labelHtml = d.label
        ? `<div style="color:var(--g300);font-size:12px;font-weight:600;letter-spacing:0.3px;margin-bottom:4px;">${d.label}</div>`
        : '';
      const hausHtml = d.hausgroesse
        ? `<div style="color:var(--g400);font-size:12px;margin-top:2px;">${d.hausgroesse}</div>`
        : '';
      return `
        <div class="pa-card pa-visible${defaultClass}" role="button" tabindex="0" onclick="paZoom(${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();paZoom(${i});}" data-idx="${i}">
          ${iconHtml}
          ${labelHtml}
          <h2>${d.name}</h2>
          ${hausHtml}
          <div class="pa-modell">${d.modell}</div>
          <div class="pa-kw">${d.kw}</div>
          ${priceHtml}
        </div>`;
    })
    .join('');
}

// Detail-Panel aktualisieren
function paUpdateDetail(d) {
  document.getElementById('paSpecsTitle').textContent = d.name;
  document.getElementById('paSpecsSub').textContent = d.modell + ' · ' + d.kw;
  const hasEfficiencyFootnote = d.specs.some(
    (s) => s[0].startsWith('JAZ') || s[0].startsWith('SCOP')
  );
  document.getElementById('paSpecsTable').querySelector('tbody').innerHTML = d.specs
    .map((s) => {
      const isHighlight = s[0].startsWith('JAZ') || s[0].startsWith('SCOP');
      return `<tr${isHighlight ? ' style="background:rgba(183,217,0,0.08)"' : ''}><td>${s[0]}</td><td>${isHighlight ? '<strong>' + s[1] + '</strong>' : s[1]}</td></tr>`;
    })
    .join('');
  const fn = document.getElementById('paJazFootnote');
  if (fn) fn.style.display = hasEfficiencyFootnote ? 'block' : 'none';

  const cta = document.getElementById('paDetailCta');
  if (paHasNumber(d.eigen)) {
    const isZfhCard = d.hausgroesse && d.hausgroesse.includes('2 WE');
    const isMfhCard = d.hausgroesse && d.hausgroesse.includes('6 WE');
    let contextHint = '';
    let preSub = 'Eigenanteil nach max. Förderung (80 %)*';
    // Die Staffel ist nach Kanon 1.4 belegt. Die Eigenanteile bleiben der Bestfall der ersten
    // Wohneinheit (Kanon Abschnitt 5), nicht eine WE-Mischrechnung.
    if (isZfhCard || isMfhCard) {
      const isVaillantCard = d.modell && d.modell.includes('Vaillant');
      const referenceText = isMfhCard
        ? (isVaillantCard
            ? 'Referenzkonfiguration: 2× Vaillant VWL 125/8.1 A Kaskade. '
            : 'Referenzkonfiguration: 6 WE MFH, 2× Wolf CHA-16/20 Kaskade. ') +
          'Für die erste Wohneinheit sind 28.000 Euro förderfähig, für die zweite bis sechste Wohneinheit je 15.000 Euro, ab der siebten je 8.000 Euro. Die Grenzen der weiteren Wohneinheiten bleiben auch nach der Reform unverändert, nur die Grenze der ersten Wohneinheit sinkt. Den Eigenanteil der Kaskade rechnen wir projektgenau, weil die Paket-Konstellation nicht definiert ist.'
        : 'Für die erste Wohneinheit sind 28.000 Euro förderfähig, für die zweite bis sechste Wohneinheit je 15.000 Euro, ab der siebten je 8.000 Euro. Die Grenzen der weiteren Wohneinheiten bleiben auch nach der Reform unverändert, nur die Grenze der ersten Wohneinheit sinkt. Für vermietete Wohneinheiten gilt die Grundförderung 30 Prozent.';
      contextHint = `<div style="color:var(--bernstein);font-size:11px;font-style:italic;margin-top:6px;padding:8px;background:rgba(232,168,56,0.08);border-radius:6px;">${referenceText}</div>`;
    }
    cta.innerHTML = `
          <div class="pa-big-price">ab ${d.eigen.toLocaleString('de-DE')} €</div>
          <div class="pa-price-sub">${preSub}</div>
          <div class="pa-info">${d.info}</div>
          ${contextHint}
          `;
  } else {
    cta.innerHTML = `
          <div style="color:var(--bernstein);font-size:26px;font-weight:700;font-family:'Barlow',sans-serif;">Individuelles Angebot</div>
          <div class="pa-price-sub">Förderung abhängig von Wohneinheiten</div>
          <div class="pa-info">${d.info}</div>
          `;
  }
}

// Pfeilposition berechnen (zeigt auf die aktive Karte)
function paPositionArrow(idx) {
  const card = document.querySelectorAll('.pa-card')[idx];
  const container = document.getElementById('paCards');
  if (!card || !container) return;
  const cardRect = card.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const left = cardRect.left - containerRect.left + cardRect.width / 2 - 10;
  document.getElementById('paDetailArrow').style.left = left + 'px';
}

let paOpenIdx = -1;
function paZoom(idx) {
  const cards = document.querySelectorAll('.pa-card');
  const detail = document.getElementById('paDetail');
  const cardsContainer = document.getElementById('paCards');

  // Gleiche Karte → zuklappen
  if (paOpenIdx === idx) {
    cards.forEach((c) => c.classList.remove('zoomed', 'dimmed'));
    if (cards[0]) cards[0].classList.add('pa-default-highlight');
    detail.classList.remove('open');
    cardsContainer.classList.remove('has-selection');
    paOpenIdx = -1;
    return;
  }

  paOpenIdx = idx;

  // Default-Highlight entfernen bei erster Interaktion
  cards.forEach((c) => c.classList.remove('pa-default-highlight'));

  // Karten: Zoom + Dim
  cards.forEach((c, i) => {
    if (i === idx) {
      c.classList.add('zoomed');
      c.classList.remove('dimmed');
    } else {
      c.classList.remove('zoomed');
      c.classList.add('dimmed');
    }
  });

  // Detail-Panel aktualisieren und öffnen
  paUpdateDetail(paData[idx]);
  cardsContainer.classList.add('has-selection');
  detail.classList.add('open');

  // Pfeil positionieren
  requestAnimationFrame(() => paPositionArrow(idx));

  // Bild pro Modell - Ambiente-Bilder als Cover
  const imgContainer = document.querySelector('.pa-detail-img');
  if (imgContainer) {
    const imgSrc = paData[idx].img || 'cha-sanierung.jpg';
    const imgPos = paData[idx].imgPos || 'center center';
    imgContainer.innerHTML = `<img id="paImg" src="${imgSrc}" alt="${paData[idx].modell}" width="2500" height="2500" style="object-position:${imgPos};" loading="lazy" decoding="async" onerror="this.style.display='none'">`;
    const img = document.getElementById('paImg');
    if (img) {
      img.style.animation = 'none';
      img.offsetHeight;
      img.style.animation = '';
    }
  }
}

// Klick außerhalb → alles zuklappen
document.addEventListener('click', (e) => {
  if (paOpenIdx === -1) return;
  if (
    !e.target.closest('.pa-card') &&
    !e.target.closest('.pa-detail') &&
    !e.target.closest('.btn-primary')
  ) {
    const allCards = document.querySelectorAll('.pa-card');
    allCards.forEach((c) => c.classList.remove('zoomed', 'dimmed'));
    if (allCards[0]) allCards[0].classList.add('pa-default-highlight');
    document.getElementById('paDetail').classList.remove('open');
    document.getElementById('paCards').classList.remove('has-selection');
    paOpenIdx = -1;
  }
});

// Pfeil bei Resize anpassen
window.addEventListener('resize', () => {
  if (paOpenIdx >= 0) paPositionArrow(paOpenIdx);
});

// Initial: Daten laden, dann rendern
paInitManufacturerTabs();
paLoadData().then(() => {
  paApplyBrand('wolf');
  paRenderCards();
});

// ===== SVG ICON CONSTANTS =====
const SVG_CHECK =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B7D900" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><polyline points="16 8 10 16 7 13"/></svg>';
const SVG_WARN =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8A838" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M12 2L2 22h20L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="#E8A838"/></svg>';
const SVG_CHECK_SM =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>';

// ===== FÖRDERRECHNER (KfW 458 - korrekte Pro-WE-Aufteilung) =====

// --- Heizungsalter: Baujahr-Feld ein-/ausblenden + Hinweistext ---
// --- Heizungsalter: Modus-Toggle (Alter-Dropdown vs. Baujahr-Input) ---
let alterModus = 'alter'; // 'alter' oder 'baujahr'

function getHeizungsalter() {
  if (alterModus === 'baujahr') {
    const baujahr = parseInt(document.getElementById('heizungBaujahr')?.value) || 2000;
    return new Date().getFullYear() - baujahr;
  } else {
    return parseInt(document.getElementById('heizungAlterSelect')?.value) || 20;
  }
}

const FOERDER_HEIZUNG_BONUS = Object.freeze({
  oel: 'funktional',
  kohle: 'funktional',
  'gas-etage': 'funktional',
  nachtspeicher: 'funktional',
  gas: 'alter20',
  biomasse: 'alter20',
});

function ensureFoerderHeizungsoptionen() {
  const select = document.getElementById('heizung');
  if (!select) return;
  const sonstige = select.querySelector('option[value="sonstige"]');
  [
    ['biomasse', 'Holz- oder Pelletheizung'],
    ['kohle', 'Kohleheizung'],
  ].forEach(([value, label]) => {
    let option = select.querySelector(`option[value="${value}"]`);
    if (!option) {
      option = document.createElement('option');
      option.value = value;
      select.insertBefore(option, sonstige || null);
    }
    option.textContent = label;
  });
}

function foerderHatKlimabonus(heizung, alter) {
  const bedingung = FOERDER_HEIZUNG_BONUS[heizung];
  return bedingung === 'funktional' || (bedingung === 'alter20' && alter >= 20);
}

// WP-Web (Rechner-Daten an HubSpot, 2026-07-03): non-null-Werte in hwLeadPrefill mergen,
// ohne bestehende Keys zu verlieren. Ueberlebt Dim -> Foerder -> Anfrage (sessionStorage),
// damit errechnete Dimensionierungs-/Foerderwerte pfadunabhaengig im Funnel/HubSpot ankommen.
function hwMergeLeadPrefill(patch) {
  try {
    const d = JSON.parse(sessionStorage.getItem('hwLeadPrefill') || '{}') || {};
    Object.keys(patch || {}).forEach(function (k) {
      const v = patch[k];
      if (v !== null && v !== undefined && v !== '') d[k] = v;
    });
    sessionStorage.setItem('hwLeadPrefill', JSON.stringify(d));
  } catch (e) {}
}

// Foerderrechner -> Leadstrecke: Heizungsalter zusaetzlich in hwLeadPrefill mitgeben,
// damit /anfrage es nicht erneut abfragt. Nur das Alter (saubere Zeichenkette) ergaenzen;
// uebrige Felder (heizung/gebaeude/...) bleiben aus dem Rechner-Prefill (korrekte Keys).
function hwStageFoerderLead() {
  try {
    const d = JSON.parse(sessionStorage.getItem('hwLeadPrefill') || '{}') || {};
    const alter = typeof getHeizungsalter === 'function' ? getHeizungsalter() : null;
    if (alter) d.heizungsalter = 'ca. ' + alter + ' Jahre';
    sessionStorage.setItem('hwLeadPrefill', JSON.stringify(d));
  } catch (e) {}
}

function setAlterModus(modus) {
  alterModus = modus;
  const alterDiv = document.getElementById('heizungsalterAlter');
  const baujahrDiv = document.getElementById('heizungsalterBaujahr');
  const btns = document.getElementById('alterToggle').querySelectorAll('button');
  if (modus === 'baujahr') {
    alterDiv.style.display = 'none';
    baujahrDiv.style.display = 'block';
    btns[0].classList.remove('active');
    btns[1].classList.add('active');
  } else {
    alterDiv.style.display = 'block';
    baujahrDiv.style.display = 'none';
    btns[0].classList.add('active');
    btns[1].classList.remove('active');
  }
  updateFoerderrechner();
}

function toggleHeizungsalter() {
  const heizungEl = document.getElementById('heizung');
  const gruppe = document.getElementById('heizungsalterGroup');
  const hinweis = document.getElementById('heizungsalterHinweis');
  if (!heizungEl || !gruppe || !hinweis) return;
  const heizung = heizungEl.value;
  const bedingung = FOERDER_HEIZUNG_BONUS[heizung];

  if (bedingung === 'alter20') {
    showFoerderSlot(gruppe, true);
    const alter = getHeizungsalter();
    const heizungsLabel = heizung === 'biomasse' ? 'Biomasseheizung' : 'Gasheizung';
    if (foerderHatKlimabonus(heizung, alter)) {
      hinweis.innerHTML =
        SVG_CHECK +
        '<span style="color:var(--green);">Deine ' +
        heizungsLabel +
        ' ist ' +
        alter +
        ' Jahre alt. Du erhältst den Klimabonus (+16 %, für Anträge vom 21.07.2026 bis 31.01.2027).</span>';
    } else {
      hinweis.innerHTML =
        SVG_WARN +
        '<span style="color:var(--amber);">Deine ' +
        heizungsLabel +
        ' ist erst ' +
        alter +
        ' Jahre alt. Der Klimabonus (+16 %, für Anträge vom 21.07.2026 bis 31.01.2027) gilt erst ab 20 Jahren.</span>';
    }
  } else if (bedingung === 'funktional') {
    showFoerderSlot(gruppe, false);
    hinweis.innerHTML = '';
  } else {
    showFoerderSlot(gruppe, false);
    hinweis.innerHTML = '';
  }
  calculateFoerder();
}

function updateFoerderrechner() {
  toggleHeizungsalter();
}

// --- WP-Kosten: Toggle Paket-Dropdown vs. manuelle Eingabe ---
let wpKostenModus = 'paket'; // 'paket' oder 'manuell'

function setKostenModus(modus) {
  const previousMode = wpKostenModus;
  wpKostenModus = modus;
  const paketDiv = document.getElementById('wpKostenPaket');
  const manuellDiv = document.getElementById('wpKostenManuell');
  const btns = document.getElementById('kostenToggle').querySelectorAll('button');
  if (modus === 'manuell') {
    showFoerderSlot(paketDiv, false);
    showFoerderSlot(manuellDiv, true);
    if (previousMode !== 'manuell') {
      const selectedPackage = foerderGetSelectedPackage();
      const input = document.getElementById('wpKostenInput');
      if (input && selectedPackage.price > 0) {
        input.value = selectedPackage.price.toLocaleString('de-DE') + ' €';
      }
    }
    btns[0].classList.remove('active');
    btns[1].classList.add('active');
  } else {
    showFoerderSlot(paketDiv, true);
    showFoerderSlot(manuellDiv, false);
    btns[0].classList.add('active');
    btns[1].classList.remove('active');
  }
  calculateFoerder();
}

// --- Selbstnutzung: Optionen dynamisch an WE-Anzahl anpassen ---
function updateSelbstnutzungOptionen() {
  const weEl = document.getElementById('wohneinheiten');
  const sel = document.getElementById('selbstnutzung');
  const label = document.getElementById('selbstnutzungLabel');
  // Förderrechner-Elemente existieren nicht auf jeder Seite (z. B. Startseite).
  // Ohne diesen Guard wirft der initiale Top-Level-Aufruf eine TypeError und
  // bricht die restliche site.js-Ausführung ab (u. a. die Startseiten-PLZ-Bindung).
  if (!weEl || !sel || !label) return;
  const we = parseInt(weEl.value);
  const currentVal = sel.value;

  if (we <= 1) {
    label.textContent = 'Selbst bewohnt?';
    sel.innerHTML =
      '<option value="1">Ja, selbst bewohnt</option><option value="0">Nein, vermietet</option>';
  } else {
    label.textContent = 'Davon selbst bewohnt?';
    sel.innerHTML =
      '<option value="1">Ja, 1 Wohnung selbst bewohnt</option><option value="0">Nein, alles vermietet</option>';
  }
  // Vorherige Auswahl beibehalten
  sel.value = currentVal;
  if (!sel.value) sel.value = '1';
}

async function calculateFoerder() {
  const weEl = document.getElementById('wohneinheiten');
  if (!weEl) return;
  ensureFoerderHeizungsoptionen();
  const we = parseInt(weEl.value);
  const selbstWE = parseInt(document.getElementById('selbstnutzung').value);
  const heizung = document.getElementById('heizung').value;
  const einkommen = document.getElementById('einkommen').value;
  const gemeinde = document.getElementById('gemeinde')?.value || '';
  const selectedPackage = foerderGetSelectedPackage();
  const wpTyp = selectedPackage.klasse;
  foerderMarke = selectedPackage.marke;
  const preisManuell =
    wpKostenModus === 'manuell'
      ? parseInt(
          (document.getElementById('wpKostenInput').value || '').replace(/[^0-9]/g, ''),
          10
        ) || ''
      : '';
  const calcDots =
    '<span class="calc-dots" role="status" aria-label="wird berechnet"><i></i><i></i><i></i></span>';
  document.getElementById('foerderSatzKfw').innerHTML = calcDots;
  document.getElementById('frPreis').textContent = 'wird berechnet';
  document.getElementById('frZuschuss').innerHTML = calcDots;
  document.getElementById('frEigen').textContent = 'wird berechnet';

  const params = new URLSearchParams({
    action: 'foerderung',
    we: String(we),
    selbstWE: String(selbstWE),
    heizung,
    einkommen,
    gemeinde,
    marke: foerderMarke || 'wolf',
    wpTyp,
    preisManuell: String(preisManuell),
    heizungsalter: String(getHeizungsalter()),
    // Kinderabzug (Kanon 1.2: einmalig 10.000 € auf das anrechenbare zvE). Das Markup dazu lebt in
    // foerderung.html (Lane C, anderer Branch). Defensiv gelesen: fehlt die Checkbox, weil noch die
    // alte Seite ausgeliefert wird, bleibt es bei 'nein' (konservativ), nichts bricht.
    kind: document.getElementById('foerderKind')?.checked ? 'ja' : 'nein',
    origin: 'https://herowerk.de',
  });

  let data;
  try {
    const response = await fetch(RECHNER_API + '?' + params.toString());
    if (!response.ok) throw new Error('HTTP ' + response.status);
    data = await response.json();
    if (data.error) throw new Error(data.message || 'server_error');
  } catch (err) {
    console.error('Förderberechnung nicht verfügbar', err);
    document.getElementById('foerderBreakdown').innerHTML =
      '<div style="border:1px solid rgba(232,168,56,0.35);border-radius:12px;padding:14px;color:var(--g300);">Berechnung gerade nicht verfügbar. Bitte Beratung anfragen.</div>';
    showFoerderSlot(document.getElementById('effektivSatzBox'), false);
    return;
  }

  const preis = Number(data.preis) || 0;
  const gesamtZuschuss = Number(data.zuschussGesamt || 0);
  const kfwSatz = Number(data.kfwSatz) || 0;
  const effektivSatz = Number(data.effektivSatz) || 0;

  document.getElementById('foerderSatzKfw').textContent = kfwSatz + '%';
  document.getElementById('frPreis').textContent = 'ab ' + preis.toLocaleString('de-DE') + ' €';
  document.getElementById('frZuschuss').textContent =
    '-' + Math.round(gesamtZuschuss).toLocaleString('de-DE') + ' €';
  document.getElementById('frEigen').textContent =
    'ab ' + Math.round(Number(data.eigenanteil) || 0).toLocaleString('de-DE') + ' €';

  // Antragszeitraum-/Degressions-Hinweis (Kanon 7.2). Ziel-Element und Response-Felder kommen von
  // Lane C; fehlt eines von beiden, bleibt die Zeile leer statt zu brechen.
  const periodeHinweisEl = document.getElementById('foerderPeriodeHinweis');
  if (periodeHinweisEl) {
    periodeHinweisEl.textContent =
      (data.periodeLabel ? 'Antragszeitraum ' + data.periodeLabel : '') +
      (data.hinweis ? ' ' + data.hinweis : '');
  }

  const effektivBox = document.getElementById('effektivSatzBox');
  if (effektivSatz < kfwSatz) {
    showFoerderSlot(effektivBox, true);
    document.getElementById('foerderSatzEffektiv').textContent = effektivSatz + '%';
    document.getElementById('effektivErklaerung').textContent =
      'Die serverseitige Berechnung berücksichtigt förderfähige Kosten, Investitionssumme und Wohneinheiten.';
  } else {
    showFoerderSlot(effektivBox, false);
  }

  const selbstGroup = document.getElementById('selbstnutzungGroup');
  selbstGroup.style.display = '';

  const einkommenGroup = document.getElementById('einkommenGroup');
  if (selbstWE === 0) {
    einkommenGroup.style.opacity = '0.4';
    document.getElementById('einkommen').disabled = true;
  } else {
    einkommenGroup.style.opacity = '1';
    document.getElementById('einkommen').disabled = false;
  }

  const breakdown = document.getElementById('foerderBreakdown');
  let html = '';
  (data.bausteine || []).forEach((baustein) => {
    html +=
      '<div class="breakdown-item"><span>' + baustein + '</span><span class="pct">✓</span></div>';
  });
  html +=
    '<div class="breakdown-item" style="border-top:1px solid rgba(255,255,255,0.15);padding-top:8px;margin-top:8px;"><span style="font-weight:700;color:var(--white);">KfW-Zuschuss gesamt</span><span class="pct" style="font-size:16px;">' +
    Math.round(Number(data.zuschussGesamt) || 0).toLocaleString('de-DE') +
    ' €</span></div>';
  breakdown.innerHTML = html;

  // WP-Web: Foerder-Ergebnis fuer den Lead-Prefill festhalten (ueberlebt bis /anfrage -> HubSpot).
  // einkommen_unter_40k = <40k-Bonus-Flag (ja/nein/ka); unvalidierte Selbstauskunft, der
  // Sales-Agent prueft sie beim Vollstaendigkeits-Check. Nur fuer Selbstnutzer aussagekraeftig.
  // Die HubSpot-Property bleibt binaer; hier wird NUR gemappt, nicht gerechnet.
  // Beide Wertesaetze werden akzeptiert, damit die Merge-Reihenfolge der Branches egal ist:
  // neu (Lane C, 4-stufig) bis30/bis40/bis50/ueber50 und alt (Bestand) unter40/ueber40.
  // Ohne die Alt-Werte bekaeme jeder Lead still 'ka', sobald eine Haelfte allein live geht.
  const einkommenFlag = ['bis30', 'bis40', 'unter40'].includes(einkommen)
    ? 'ja'
    : ['bis50', 'ueber50', 'ueber40'].includes(einkommen)
      ? 'nein'
      : 'ka';
  hwMergeLeadPrefill({
    foerderquote_pct: effektivSatz || kfwSatz || null,
    foerderbetrag_eur: Math.round(gesamtZuschuss) || null,
    einkommen_unter_40k: selbstWE > 0 ? einkommenFlag : 'ka',
  });

  const wegBox = document.getElementById('wegHinweis');
  if (we >= 3) {
    showFoerderSlot(wegBox, true);
    wegBox.innerHTML =
      '<div style="color:var(--g300);font-size:13px;line-height:1.6;">Bei einer WEG beantragt jeder Eigentümer individuell. Für die genaue Aufteilung beraten wir dich kostenlos.</div>';
  } else {
    showFoerderSlot(wegBox, false);
    wegBox.innerHTML = '';
  }
}

document.getElementById('selbstnutzung')?.addEventListener('change', calculateFoerder);
document.getElementById('einkommen')?.addEventListener('change', calculateFoerder);
document.getElementById('foerderKind')?.addEventListener('change', calculateFoerder);
document.getElementById('wohneinheiten')?.addEventListener('change', function () {
  updateSelbstnutzungOptionen();
  calculateFoerder();
});
document.getElementById('gemeinde')?.addEventListener('change', function () {
  calculateFoerder();
});
document.getElementById('foerderWpTyp')?.addEventListener('change', calculateFoerder);
// Initialer Aufruf - nur wenn der Förderrechner auf dieser Seite vorhanden ist.
// Die folgenden Funktionen lesen .value direkter Förderrechner-Elemente; auf
// Seiten ohne Rechner (z. B. Startseite) würde der Top-Level-Aufruf sonst eine
// TypeError werfen und die restliche site.js-Ausführung abbrechen.
if (document.getElementById('wohneinheiten')) {
  ensureFoerderHeizungsoptionen();
  updateSelbstnutzungOptionen();
  toggleHeizungsalter();
}

// ===== HEIZKOSTENVERGLEICH (Baujahr-abhängig) =====
document.getElementById('wohnflaeche')?.addEventListener('input', (e) => {
  document.getElementById('flaeVal').textContent = e.target.value;
  calculateHeiz();
});
document.getElementById('heizHeizung')?.addEventListener('change', calculateHeiz);
document.getElementById('heizBaujahr')?.addEventListener('change', calculateHeiz);

function calculateHeiz() {
  const flaeche = parseInt(document.getElementById('wohnflaeche').value);
  const heizTyp = document.getElementById('heizHeizung').value;
  const baujahr = document.getElementById('heizBaujahr').value;
  const energiePreise = { gas: 0.12, oel: 0.11, nachtspeicher: 0.32 };
  const heizLabels = { gas: 'Gas', oel: 'Öl', nachtspeicher: 'Nachtspeicher' };

  // Spezifischer Energiebedarf nach Baujahr (kWh/m²) - konsistent mit Wizard
  const spezBedarfMap = { vor1978: 180, '1978-1994': 140, '1995-2010': 100, nach2010: 60 };
  const spezVerbrauch = spezBedarfMap[baujahr] || 140;
  const verbrauch = flaeche * spezVerbrauch;
  const kostenAlt = verbrauch * energiePreise[heizTyp];

  // JAZ nach Baujahr (konservativ) - konsistent mit Wizard
  const jazMap = { vor1978: 3.0, '1978-1994': 3.3, '1995-2010': 3.8, nach2010: 4.2 };
  const jaz = jazMap[baujahr] || 3.5;

  const wpStrompreis = 0.3;
  const kostenWp = (verbrauch / jaz) * wpStrompreis;
  const sparnis = kostenAlt - kostenWp;

  document.getElementById('heizBarLabel').textContent = heizLabels[heizTyp];
  document.getElementById('heizKostenAlt').textContent =
    Math.round(kostenAlt).toLocaleString('de-DE') + ' €';
  document.getElementById('heizKostenWp').textContent =
    Math.round(kostenWp).toLocaleString('de-DE') + ' €';
  document.getElementById('heizSparnis').textContent =
    'ca. ' + Math.round(sparnis).toLocaleString('de-DE') + ' €';

  // Methode-Hinweis dynamisch aktualisieren
  document.getElementById('heizMethode').textContent =
    'Verbrauch: ' +
    flaeche +
    ' m² × ' +
    spezVerbrauch +
    ' kWh/m² = ' +
    verbrauch.toLocaleString('de-DE') +
    ' kWh. Jahresarbeitszahl (JAZ) ' +
    jaz.toFixed(1) +
    '. Wärmepumpen-Strom 0,30 €/kWh.';

  // Dynamic bars
  const maxKosten = Math.max(kostenAlt, kostenWp);
  document.getElementById('heizBarAlt').style.width =
    Math.round((kostenAlt / maxKosten) * 100) + '%';
  document.getElementById('heizBarWp').style.width = Math.round((kostenWp / maxKosten) * 100) + '%';
}
if (document.getElementById('wohnflaeche')) calculateHeiz();

// ===== SELF-SERVICE FORM =====
let qsStep = 0;
const qsTotalSteps = 4;

function qsSelect(el) {
  el.parentElement.querySelectorAll('.qs-option').forEach((o) => o.classList.remove('selected'));
  el.classList.add('selected');
}

function qsUpdateBars() {
  document.querySelectorAll('.qs-form-step-bar').forEach((bar) => {
    const s = parseInt(bar.dataset.step);
    bar.classList.toggle('active', s === qsStep);
    bar.classList.toggle('done', s < qsStep);
  });
}

function qsShowPanel(idx) {
  document.querySelectorAll('.qs-form-panel').forEach((p) => p.classList.remove('active'));
  const panel = document.querySelector(`.qs-form-panel[data-panel="${idx}"]`);
  if (panel) panel.classList.add('active');
  qsUpdateBars();
}

function qsNext() {
  if (qsStep < qsTotalSteps - 1) {
    qsStep++;
    qsShowPanel(qsStep);
  }
}

function qsPrev() {
  if (qsStep > 0) {
    qsStep--;
    qsShowPanel(qsStep);
  }
}

function qsSubmit() {
  document.querySelectorAll('.qs-form-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.qs-form-step-bar').forEach((b) => {
    b.classList.remove('active');
    b.classList.add('done');
  });
  document.querySelector('.qs-form-steps').style.display = 'none';
  document.getElementById('qsSuccess').classList.add('active');
}

// ===== FAQ =====
document.querySelectorAll('.faq-question').forEach((question) => {
  question.addEventListener('click', () => {
    question.parentElement.classList.toggle('open');
  });
});

// ===== KONTAKT NACHRICHTENFORMULAR =====
document.getElementById('kontaktForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  const portalId = document.body.dataset.hubspotPortalId || '148110267';
  const formId =
    form.dataset.hubspotFormId ||
    document.body.dataset.hubspotContactFormId ||
    'f4662e0a-f6fd-412f-9cc6-bd3273aee7a0';
  const endpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;
  // Kontaktformular -> Standard-Properties: Name in firstname/lastname splitten,
  // telefon -> phone, nachricht -> nachricht. Genau die Felder des HubSpot-Kontaktformulars.
  const nameParts = (data.name || '').trim().split(/\s+/);
  const kontaktFields = {
    firstname: nameParts.shift() || '',
    lastname: nameParts.join(' '),
    email: data.email || '',
    phone: data.telefon || '',
    nachricht: data.nachricht || '',
  };
  const payload = {
    fields: Object.entries(kontaktFields)
      .filter(([, value]) => value !== '' && value != null)
      .map(([name, value]) => ({ name, value: String(value) })),
    context: { pageUri: window.location.href, pageName: document.title },
    legalConsentOptions: {
      consent: {
        consentToProcess: true,
        text: 'Ich stimme der Verarbeitung meiner Daten gemäß der Datenschutzerklärung zu und erteile meine Einwilligung zur Kontaktaufnahme. Die Einwilligung ist jederzeit widerrufbar.',
        communications: [],
      },
    },
  };

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Wird gesendet...';
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('HubSpot submit failed: ' + response.status);
    document.getElementById('kontaktSuccessName').textContent =
      (data.name || '').split(' ')[0] || 'dir';
    form.style.display = 'none';
    document.getElementById('kontaktFormSuccess').classList.add('show');
  } catch (error) {
    // Fallback, falls die HubSpot Mapping CI oder eine fehlende Live Form ID den API Submit blockiert.
    const subject = encodeURIComponent('Nachricht über herowerk.de');
    const body = encodeURIComponent(
      `Name: ${data.name || ''}\nE-Mail: ${data.email || ''}\nTelefon: ${data.telefon || ''}\n\nNachricht:\n${data.nachricht || ''}`
    );
    window.location.href = `mailto:${form.dataset.mailto || 'info@herowerk.de'}?subject=${subject}&body=${body}`;
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Nachricht senden';
    }
  }
});

// ===== SCROLL-REVEAL: Preisanker-Karten =====
(function () {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.pa-card').forEach((c) => c.classList.add('pa-visible'));
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  const container = document.getElementById('paCards');
  if (container) observer.observe(container);
})();

// ===== STARTSEITEN PLZ FEEDBACK =====
// site.js wird mit defer geladen, der DOM ist bei Top-Level-Ausführung also bereit.
// Bindung daher direkt ausführen (mit readyState-Fallback, falls die Datei je ohne
// defer eingebunden wird) und idempotent halten, damit ein Doppelaufruf nicht zwei
// Input-Listener anhängt.
function initEntryPlzFeedback() {
  const input = document.getElementById('entryPlz');
  const feedback = document.getElementById('entryPlzFeedback');
  if (!input || !feedback || typeof pruefePlz !== 'function') return;
  if (input.dataset.plzBound === '1') return; // idempotent
  input.dataset.plzBound = '1';

  const update = () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 5);
    const rendered = renderPlzFeedback(pruefePlz(input.value));
    feedback.textContent = rendered.text;
    feedback.className = 'entry-plz-feedback' + (rendered.cls ? ' ' + rendered.cls : '');
  };

  input.addEventListener('input', update);
  input.closest('form')?.addEventListener('submit', update);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEntryPlzFeedback);
} else {
  initEntryPlzFeedback();
}

// ===== ANFRAGE PREFILL AUS STARTSEITEN PLZ =====
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const plz = params.get('plz');
  const plzInput = document.getElementById('plzInput');
  if (plzInput && /^\d{5}$/.test(plz || '')) {
    plzInput.value = plz;
    plzInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

// ===== STARTSEITEN-PLZ -> DIMENSIONIERUNGS-WIZARD (Schritt 1) =====
// Der Hero "Jetzt starten" fuehrt zum Rechner (/dimensionierung) und gibt die PLZ mit.
// Wir nutzen die bestehende checkPlz-Logik (kein Duplikat): vorbefuellen + "Weiter" aktivieren.
document.addEventListener('DOMContentLoaded', () => {
  const wzPlz = document.getElementById('wzPlz');
  if (!wzPlz || typeof checkPlz !== 'function') return;
  const plz = (new URLSearchParams(window.location.search).get('plz') || '').replace(/[^0-9]/g, '');
  if (plz.length !== 5) return;
  wzPlz.value = plz;
  checkPlz(wzPlz);
});

// ===== FÖRDERRECHNER-VORBEFÜLLUNG AUS DIMENSIONIERUNGS-ASSISTENT =====
// "Weiter zur Förderung" speichert die Wizard-Werte in sessionStorage und navigiert nach
// /foerderung. Hier rekonstruieren wir die nötigen Globals und nutzen die bestehende
// wizToFoerder-Logik (#foerder existiert auf der Förderseite -> kein Redirect).
function hwApplyFoerderHandoff() {
  if (!document.getElementById('foerder')) return;
  let raw = null;
  try {
    raw = sessionStorage.getItem('hwFoerderPrefill');
  } catch (e) {
    return;
  }
  if (!raw) return;
  try {
    sessionStorage.removeItem('hwFoerderPrefill');
  } catch (e) {}
  let d = null;
  try {
    d = JSON.parse(raw);
  } catch (e) {
    return;
  }
  if (!d) return;
  wizSelectedMarke = d.marke || 'wolf';
  if (d.gemeinde) wizData.gemeinde = d.gemeinde;
  if (d.heizung) wizData.heizung = d.heizung;
  if (d.gebaeude) wizData.gebaeude = d.gebaeude;
  wizServerResult = { marken: { [wizSelectedMarke]: { brutto: d.brutto } } };
  wizToFoerder();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hwApplyFoerderHandoff);
} else {
  hwApplyFoerderHandoff();
}
