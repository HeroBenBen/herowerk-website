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
  verbrauchKnown: false,
  verbrauch: 0,
};
let wizStep = 1;
const RECHNER_API = 'https://script.google.com/macros/s/AKfycbwsvoC0ZBtpZq8WY_hNS-BPN1gcTK5G1JAMfxSc5FpjWxQ2SbRLI9VqCnX8SRLO4meF/exec';
let wizServerResult = null;
let wizSelectedMarke = 'wolf';
let foerderMarke = 'wolf';

// PLZ → Gemeinde Mapping (Region Hannover)
const plzMap = {
  // Hannover (proKlima)
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
  // Langenhagen (proKlima)
  30851: 'langenhagen',
  30853: 'langenhagen',
  30855: 'langenhagen',
  // Seelze (proKlima)
  30926: 'seelze',
  // Laatzen (proKlima)
  30880: 'laatzen',
  // Hemmingen (proKlima)
  30966: 'hemmingen',
  // Ronnenberg (proKlima)
  30952: 'ronnenberg',
  // Region Hannover (kein proKlima)
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

const proklimaGemeindenPlz = [
  'hannover',
  'langenhagen',
  'seelze',
  'laatzen',
  'hemmingen',
  'ronnenberg',
];

function pruefePlz(raw) {
  const val = String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 5);
  if (val.length < 5) return { status: 'unvollstaendig', val };
  const gemeinde = plzMap[val];
  if (gemeinde) {
    const label = gemeinde.charAt(0).toUpperCase() + gemeinde.slice(1);
    return proklimaGemeindenPlz.includes(gemeinde)
      ? { status: 'proklima', val, gemeinde, label }
      : { status: 'region', val, gemeinde, label };
  }
  if (val.startsWith('3') || val.startsWith('29') || val.startsWith('31')) {
    return { status: 'erweitert', val };
  }
  return { status: 'aussen', val };
}

function renderPlzFeedback(result) {
  if (result.status === 'proklima')
    return {
      text:
        '✓ ' +
        result.label +
        ', wir sind für dich da. proKlima-Fördergebiet, bis zu 5 % (max. 1.500 €) extra möglich.',
      cls: 'is-ok',
    };
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

function checkPlz(input) {
  const val = input.value.replace(/\D/g, '').slice(0, 5);
  input.value = val;
  const resultEl = document.getElementById('wzPlzResult');
  const proklimaEl = document.getElementById('wzPlzProklima');
  const nextBtn = document.getElementById('wzPlzNext');

  if (val.length < 5) {
    resultEl.innerHTML = '';
    proklimaEl.style.display = 'none';
    nextBtn.disabled = true;
    nextBtn.style.opacity = '0.4';
    nextBtn.style.cursor = 'not-allowed';
    return;
  }

  const gemeinde = plzMap[val];
  if (gemeinde) {
    const isProklima = proklimaGemeindenPlz.includes(gemeinde);
    const gemeindeLabel = gemeinde.charAt(0).toUpperCase() + gemeinde.slice(1);
    resultEl.innerHTML =
      SVG_CHECK +
      '<span style="color:var(--green);font-weight:600;">' +
      gemeindeLabel +
      '. Wir sind für dich da' +
      (isProklima ? ' (proKlima möglich)' : '') +
      '</span>';
    proklimaEl.style.display = isProklima ? 'block' : 'none';
    wizData.gemeinde = gemeinde;
    nextBtn.disabled = false;
    nextBtn.style.opacity = '1';
    nextBtn.style.cursor = 'pointer';
  } else if (val.startsWith('3') || val.startsWith('29') || val.startsWith('31')) {
    // Erweitertes Einzugsgebiet — Verfügbarkeit prüfen
    resultEl.innerHTML =
      SVG_CHECK +
      '<span style="color:var(--g300);">Deine PLZ ' +
      val +
      ' liegt möglicherweise in unserem Einzugsgebiet. Wir prüfen die Verfügbarkeit</span>';
    proklimaEl.style.display = 'none';
    wizData.gemeinde = 'sonstige';
    nextBtn.disabled = false;
    nextBtn.style.opacity = '1';
    nextBtn.style.cursor = 'pointer';
  } else {
    resultEl.innerHTML =
      SVG_WARN +
      '<span style="color:var(--bernstein);">Diese PLZ liegt außerhalb unseres Einzugsgebiets (Region Hannover).</span>';
    proklimaEl.style.display = 'none';
    wizData.gemeinde = '';
    nextBtn.disabled = true;
    nextBtn.style.opacity = '0.4';
    nextBtn.style.cursor = 'not-allowed';
  }
}

// Option selection + Auto-Advance
// Steps that auto-advance on click (no input fields needed):
// Step 2 (Gebäude, except Reihenhaus), Step 3 (Baujahr), Step 4 (Sanierung), Step 6 (Heizung)
const autoAdvanceSteps = [2, 3, 4, 6];

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
          step2Next.disabled = true;
          step2Next.style.opacity = '0.4';
          step2Next.style.cursor = 'not-allowed';
          return; // Don't auto-advance — wait for sub-option
        } else {
          rhSub.style.display = 'none';
          rhAbsage.style.display = 'none';
          step2Next.disabled = false;
          step2Next.style.opacity = '1';
          step2Next.style.cursor = 'pointer';
          document.getElementById('wzRhEnd')?.classList.remove('selected');
          document.getElementById('wzRhMitte')?.classList.remove('selected');
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
      step2Next.disabled = true;
      step2Next.style.opacity = '0.4';
      step2Next.style.cursor = 'not-allowed';
    } else {
      absage.style.display = 'none';
      step2Next.disabled = false;
      step2Next.style.opacity = '1';
      step2Next.style.cursor = 'pointer';
      // Auto-Advance after Endhaus selection
      setTimeout(() => wizNext(), 250);
    }
  });
});

// Fläche slider
document.getElementById('wzFlaeche')?.addEventListener('input', (e) => {
  document.getElementById('wzFlaeVal').textContent = e.target.value + ' m²';
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
  if (stepNum === 7) wizData.heizsystem = currentStep.querySelector('.selected')?.dataset.value || 'heizkoerper';
  if (stepNum === 8) wizData.warmwasser = currentStep.querySelector('.selected')?.dataset.value || 'ja';

  // Next step
  currentStep.classList.remove('active');
  const nextStep = document.querySelector(`.wizard-step[data-step="${stepNum + 1}"]`);
  if (nextStep) {
    nextStep.classList.add('active');
    wizStep = stepNum + 1;
    updateWizProgress();
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
  }
}

function updateWizProgress() {
  document.querySelectorAll('.wizard-progress-bar').forEach((bar, i) => {
    bar.classList.remove('active', 'done');
    if (i + 1 === wizStep) bar.classList.add('active');
    if (i + 1 < wizStep) bar.classList.add('done');
  });
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
  wizData.verbrauch = wizData.verbrauchKnown ? parseInt(document.getElementById('wzVerbrauchSlider').value) || 0 : 0;

  document.querySelectorAll('.wizard-step').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.wizard-progress-bar').forEach((b) => {
    b.classList.remove('active');
    b.classList.add('done');
  });

  const result = document.getElementById('wizResult');
  result.classList.add('active');
  document.getElementById('wizResultTitle').textContent = 'Wir berechnen deine Empfehlung';
  document.getElementById('wizResultSub').textContent = 'Die Berechnung läuft serverseitig mit den aktuellen Katalogdaten.';
  document.getElementById('wizResultCards').innerHTML = '<div style="border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:24px;color:var(--g300);text-align:center;">Einen Moment bitte...</div>';

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
    origin: 'https://herowerk.de',
  });

  try {
    const response = await fetch(RECHNER_API + '?' + params.toString());
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (data.error) throw new Error(data.message || 'server_error');
    wizServerResult = data;
    wizSelectedMarke = data.marken?.wolf?.deckt ? 'wolf' : data.marken?.vaillant?.deckt ? 'vaillant' : 'wolf';
    renderWizServerResult(data);
  } catch (err) {
    console.error('Dimensionierung nicht verfügbar', err);
    document.getElementById('wizResultTitle').textContent = 'Berechnung gerade nicht verfügbar';
    document.getElementById('wizResultSub').textContent = 'Bitte frage eine Beratung an. Wir prüfen die passende Wärmepumpe persönlich.';
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
  document.getElementById('wizResultTitle').textContent = `Ihr geschätzter Bedarf: ${formatKw(data.bedarf)} kW · ${heizLabel}`;
  document.getElementById('wizResultSub').textContent = `Überschlägige Schätzung, verbindliche Auslegung im Vor-Ort-Termin. Jahresarbeitszahl ${Number(data.jaz || 0).toFixed(1)}.`;
  document.getElementById('wizResultCards').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
      ${renderBrandCard('wolf', 'Wolf', data.marken?.wolf, data.bedarf)}
      ${renderBrandCard('vaillant', 'Vaillant', data.marken?.vaillant, data.bedarf)}
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
      <button class="btn-ghost" onclick="wizReset()" style="cursor:pointer;padding:12px 20px;">Neu berechnen</button>
      <a href="/kontakt" class="btn-primary" style="flex:1;min-width:200px;text-align:center;">Jetzt kostenlos beraten lassen</a>
    </div>
    <div style="margin-top:16px;background:rgba(183,217,0,0.06);border:2px solid rgba(183,217,0,0.25);border-radius:14px;padding:16px 20px;cursor:pointer;" onclick="wizToFoerder()">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div><div style="color:var(--white);font-family:'Barlow',sans-serif;font-weight:700;font-size:16px;">Weiter: Deine genaue Förderung berechnen</div><div style="color:var(--g400);font-size:13px;margin-top:2px;">Die ausgewählte Marke wird automatisch übernommen.</div></div>
        <div style="background:var(--green);color:var(--nacht);width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">→</div>
      </div>
    </div>`;
}

function renderBrandCard(key, label, brand, bedarf) {
  const selected = wizSelectedMarke === key;
  const badge = brand?.vorlaeufig ? '<span style="border:1px solid var(--bernstein);color:var(--bernstein);border-radius:999px;padding:3px 8px;font-size:11px;font-weight:700;">vorläufig</span>' : '';
  if (!brand || !brand.deckt) {
    return `<button type="button" onclick="wizSelectMarke('${key}')" style="text-align:left;border:2px solid ${selected ? 'var(--green)' : 'rgba(255,255,255,0.14)'};border-radius:16px;padding:20px;background:rgba(255,255,255,0.04);cursor:pointer;"><div style="display:flex;justify-content:space-between;gap:8px;"><h3 style="color:var(--white);margin:0;">${label}</h3>${badge}</div><p style="color:var(--g300);margin:14px 0 0;">Individuelle Planung</p></button>`;
  }
  return `<button type="button" onclick="wizSelectMarke('${key}')" style="text-align:left;border:2px solid ${selected ? 'var(--green)' : 'rgba(255,255,255,0.14)'};border-radius:16px;padding:20px;background:${selected ? 'rgba(183,217,0,0.06)' : 'rgba(255,255,255,0.04)'};cursor:pointer;">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;"><h3 style="color:var(--white);margin:0;">${label}</h3>${badge}</div>
    <div style="color:var(--green);font-weight:800;font-size:20px;margin-top:10px;">${brand.modell}</div>
    <div style="color:var(--g300);margin-top:8px;">✓ deckt ${formatKw(bedarf)} kW${brand.kaskade ? ' · Kaskade' : ''}</div>
    <div style="color:var(--g400);font-size:13px;margin-top:14px;">Richtpreis brutto</div><div style="color:var(--white);font-weight:800;">${formatEuro(brand.brutto)}</div>
    <div style="color:var(--g400);font-size:13px;margin-top:10px;">Eigenanteil geschätzt</div><div style="color:var(--green);font-weight:800;font-size:24px;">${formatEuro(brand.eigenanteil)}</div>
  </button>`;
}

function wizSelectMarke(key) {
  wizSelectedMarke = key;
  if (wizServerResult) renderWizServerResult(wizServerResult);
}

function formatEuro(value) { return Math.round(Number(value) || 0).toLocaleString('de-DE') + ' €'; }
function formatKw(value) { return Number(value || 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

function wizReset() {
  document.getElementById('wizResult').classList.remove('active');
  document.querySelectorAll('.wizard-step').forEach((s) => s.classList.remove('active'));
  document.querySelector('.wizard-step[data-step="1"]').classList.add('active');
  document.querySelectorAll('.wizard-option').forEach((o) => o.classList.remove('selected'));
  wizData.sanierung = 'nein';
  wizStep = 1;
  updateWizProgress();
  // Zum Wizard-Anfang scrollen
  document.getElementById('wizProgress').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== WIZARD → FÖRDERRECHNER: Datenübernahme =====
function wizToFoerder() {
  const selected = wizServerResult?.marken?.[wizSelectedMarke];
  foerderMarke = wizSelectedMarke || 'wolf';

  setKostenModus('manuell');
  const wpSelect = document.getElementById('foerderWpTyp');
  if (wpSelect) wpSelect.value = 'm';
  const kostenInput = document.getElementById('wpKostenInput');
  if (kostenInput && selected?.brutto) kostenInput.value = Math.round(selected.brutto);

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
  if (typeof updateProklimaOptin === 'function') updateProklimaOptin();
  if (typeof calculateFoerder === 'function') calculateFoerder();

  const foerderSection = document.getElementById('foerder');
  if (foerderSection) foerderSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else window.location.href = '/foerderung';
}

// ===== PREISANKER: Expand/Collapse-Karten mit Tech-Specs =====
// Produktdaten — Inline-Fallback für lokale Entwicklung (file://)
// → Bei WordPress-Umzug wird dieser Block durch serverseitige API ersetzt
// → Canonical Source: produkte_HERO.json (bei Änderungen BEIDE Stellen aktualisieren)
let paData = [];

async function paLoadData() {
  try {
    const response = await fetch('produkte_HERO.json');
    if (!response.ok) throw new Error(response.status);
    paData = await response.json();
  } catch (e) {
    console.info('fetch() nicht verfügbar (file://), nutze Inline-Fallback');
    paData = paDataFallback;
  }
}

function paFormatEuro(value) {
  return value.toLocaleString('de-DE') + ' €';
}

function paUpdateWolfMinimum() {
  const target = document.getElementById('wolfMinEigen');
  if (!target || !paData.length) return;
  const min = paData
    .map((item) => item.eigen)
    .filter((value) => typeof value === 'number')
    .sort((a, b) => a - b)[0];
  if (typeof min === 'number') target.textContent = 'ab ' + paFormatEuro(min) + ' Eigenanteil*';
}

function paSelectManufacturer(manufacturer) {
  const isWolf = manufacturer === 'wolf';
  const wolfPanel = document.getElementById('wolfPricePanel');
  const vaillantPanel = document.getElementById('vaillantPricePanel');
  const detail = document.getElementById('paDetail');
  const cardsContainer = document.getElementById('paCards');
  document.querySelectorAll('.manufacturer-tab').forEach((tab) => {
    const selected = tab.dataset.manufacturer === manufacturer;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.tabIndex = selected ? 0 : -1;
  });
  if (wolfPanel) wolfPanel.hidden = !isWolf;
  if (vaillantPanel) vaillantPanel.hidden = isWolf;
  if (!isWolf) {
    document
      .querySelectorAll('.pa-card')
      .forEach((card) => card.classList.remove('zoomed', 'dimmed'));
    if (detail) detail.classList.remove('open');
    if (cardsContainer) cardsContainer.classList.remove('has-selection');
    paOpenIdx = -1;
  }
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
    kw: '5–7 kW',
    icon: '<svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 4L4 14h3v12h18V14h3L16 4z"/><rect x="13" y="19" width="6" height="7"/></svg>',
    img: 'cha-sanierung.jpg',
    desc: 'Gut gedämmtes Haus mit niedrigem Wärmebedarf',
    preis: 29750,
    eigen: 8925,
    proklima: 7425,
    info: 'Richtpreis: ab 29.750 € brutto · KfW: bis -20.825 €',
    specs: [
      ['Heizleistung (WP)', '1,6–6,8 kW'],
      ['Heizstab (optional)', '9 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 70 °C'],
      ['Schallleistung', '≤ 52 dB(A)'],
      ['Effizienzklasse', 'A+++ (35°C) · A++ (55°C)'],
      ['SCOP (35°C / 55°C)²', '5,10 / 3,60'],
      ['JAZ Heizkörper¹', '3,96'],
      ['JAZ Fußbodenheizung¹', '4,92'],
      ['Abmessung (BxTxH)', '1.286 × 562 × 979 mm'],
      ['Herkunft', 'Made in Germany'],
    ],
  },
  {
    name: 'Standard',
    label: 'Einfamilienhaus',
    hausgroesse: 'ca. 120–180 m²',
    modell: 'Wolf CHA-10',
    kw: '9–12 kW',
    icon: '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 3L3 14h3v14h20V14h3L16 3z"/><rect x="12" y="18" width="8" height="10"/></svg>',
    img: 'cha-neubau-dunkel.jpg',
    desc: 'Der Klassiker. Für die meisten Einfamilienhäuser',
    preis: 34510,
    eigen: 13510,
    proklima: 12010,
    info: 'Richtpreis: ab 34.510 € brutto · KfW: bis -21.000 €',
    specs: [
      ['Heizleistung (WP)', '2,2–9,8 kW'],
      ['Heizstab (optional)', '9 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 70 °C'],
      ['Schallleistung', '≤ 52 dB(A)'],
      ['Effizienzklasse', 'A+++ (35°C) · A++ (55°C)'],
      ['SCOP (35°C / 55°C)²', '5,28 / 3,75'],
      ['JAZ Heizkörper¹', '4,10'],
      ['JAZ Fußbodenheizung¹', '5,09'],
      ['Abmessung (BxTxH)', '1.286 × 562 × 979 mm'],
      ['Herkunft', 'Made in Germany'],
    ],
  },
  {
    name: 'Komfort',
    label: 'Großzügiges Zuhause',
    hausgroesse: 'ca. 180–280 m²',
    modell: 'Wolf CHA-16/20',
    kw: '14–16 kW',
    icon: '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 3L3 16h3v16h24V16h3L18 3z"/><rect x="10" y="19" width="6" height="13"/><rect x="20" y="12" width="5" height="5"/><rect x="20" y="22" width="6" height="10"/></svg>',
    img: 'cha-komfort-neubau.jpg',
    desc: 'Für größere Häuser mit höherem Wärmebedarf',
    preis: 45220,
    eigen: 24220,
    proklima: 22720,
    info: 'Richtpreis: ab 45.220 € brutto · KfW: bis -21.000 €',
    specs: [
      ['Heizleistung (WP)', '3,7–16,7 kW'],
      ['Heizstab (optional)', '9 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 70 °C'],
      ['Schallleistung', '52 dB(A)'],
      ['Effizienzklasse', 'A+++ (35°C) · A++ (55°C)'],
      ['SCOP (35°C / 55°C)²', '4,95 / 3,52'],
      ['JAZ Heizkörper¹', '4,04'],
      ['JAZ Fußbodenheizung¹', '5,03'],
      ['Abmessung (BxTxH)', '1.286 × 562 × 979 mm'],
      ['Herkunft', 'Made in Germany'],
    ],
  },
  {
    name: 'Premium',
    label: 'Zwei Familien unter einem Dach',
    hausgroesse: 'ab 250 m² / 2 WE',
    modell: 'Wolf CHA-20/24',
    kw: '18–24 kW',
    icon: '<svg width="38" height="38" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 3L3 17h3v19h28V17h3L20 3z"/><line x1="20" y1="17" x2="20" y2="36"/><rect x="8" y="22" width="6" height="10"/><rect x="26" y="22" width="6" height="10"/></svg>',
    img: 'cha-mfh-saniert.jpg',
    desc: 'Zweifamilienhaus oder großes Einfamilienhaus',
    preis: 57120,
    eigen: 33495,
    proklima: 31995,
    info: 'Richtpreis: ab 57.120 € brutto · KfW: bis -23.625 € (1 WE selbst, 1 WE vermietet)',
    specs: [
      ['Heizleistung (WP)', '5,6–24,0 kW'],
      ['Heizstab (optional)', '9 kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Monoblock (Außenaufstellung)'],
      ['Vorlauftemp.', 'bis 70 °C'],
      ['Schallleistung', '52 dB(A)'],
      ['Effizienzklasse', 'A+++ (35°C) · A++ (55°C)'],
      ['SCOP (35°C / 55°C)²', '4,82 / 3,45'],
      ['JAZ Heizkörper¹', '3,99'],
      ['JAZ Fußbodenheizung¹', '4,96'],
      ['Abmessung (BxTxH)', '1.700 × 756 × 1.300 mm'],
      ['Herkunft', 'Made in Germany'],
    ],
  },
  {
    name: 'Kaskade',
    label: 'Mehrfamilienhaus & Gewerbe',
    hausgroesse: 'Ref. 6 WE MFH',
    modell: '2× Wolf CHA-16',
    kw: '2× 16 kW (32 kW)',
    imgPos: 'center 70%',
    icon: '<svg width="40" height="40" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="14" width="16" height="26"/><rect x="24" y="8" width="16" height="32"/><rect x="8" y="20" width="4" height="4"/><rect x="8" y="28" width="4" height="4"/><rect x="28" y="14" width="4" height="4"/><rect x="28" y="22" width="4" height="4"/><rect x="28" y="30" width="4" height="4"/><rect x="34" y="14" width="3" height="4"/><rect x="34" y="22" width="3" height="4"/></svg>',
    img: 'cha-kaskade-mfh.jpg',
    desc: 'Referenz: 6 WE MFH mit 2er-Kaskade*',
    preis: 82223,
    eigen: 34973,
    proklima: null,
    info: 'Richtpreis: ab 82.223 € brutto · KfW: bis -47.250 € (6 WE: 1 selbst, 5 vermietet)*',
    specs: [
      ['Heizleistung', '25–100+ kW'],
      ['Kältemittel', 'R290 (Propan, natürlich)'],
      ['Bauart', 'Kaskade bis 5 Geräte'],
      ['Vorlauftemp.', 'bis 70 °C'],
      ['Kaskadierung', '2–5 Außengeräte'],
      ['Effizienzklasse', 'A+++ (systemabhängig)'],
      ['SCOP²', 'systemabhängig'],
      ['Regelung', 'Wolf Kaskadenmanager'],
      ['Herkunft', 'Made in Germany'],
    ],
  },
];

// Karten rendern (nur kompakte Header, kein Preis-Doppelt)
function paRenderCards() {
  const container = document.getElementById('paCards');
  paUpdateWolfMinimum();
  if (!container) return;
  container.innerHTML = paData
    .map((d, i) => {
      const priceHtml =
        d.eigen !== null
          ? `<div class="pa-price-compact">ab ${d.eigen.toLocaleString('de-DE')} €</div><div class="pa-label">Eigenanteil*</div>`
          : `<div class="pa-price-compact" style="font-size:17px;">Individuell</div><div class="pa-label">&nbsp;</div>`;

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
  const hasJaz = d.specs.some((s) => s[0].startsWith('JAZ') || s[0].startsWith('SCOP'));
  document.getElementById('paSpecsTable').querySelector('tbody').innerHTML = d.specs
    .map((s) => {
      const isHighlight = s[0].startsWith('JAZ') || s[0].startsWith('SCOP');
      return `<tr${isHighlight ? ' style="background:rgba(183,217,0,0.08)"' : ''}><td>${s[0]}</td><td>${isHighlight ? '<strong>' + s[1] + '</strong>' : s[1]}</td></tr>`;
    })
    .join('');
  const fn = document.getElementById('paJazFootnote');
  if (fn) fn.style.display = hasJaz ? 'block' : 'none';

  const cta = document.getElementById('paDetailCta');
  if (d.eigen !== null) {
    const isZfhCard = d.hausgroesse && d.hausgroesse.includes('2 WE');
    const isMfhCard = d.hausgroesse && d.hausgroesse.includes('6 WE');
    let contextHint = '';
    let preSub = 'Eigenanteil nach max. Förderung (70%)';
    if (isZfhCard) {
      preSub = 'Eigenanteil (2 WE: 1 selbst, 1 vermietet)';
      contextHint = `<div style="color:var(--g500);font-size:11px;font-style:italic;margin-top:6px;">Kalkulation: 1 WE Selbstnutzung, 1 WE vermietet. Beide WE selbstgenutzt → niedrigerer Eigenanteil.</div>`;
    } else if (isMfhCard) {
      preSub = 'Eigenanteil (6 WE: 1 selbst, 5 vermietet)*';
      contextHint = `<div style="color:var(--bernstein);font-size:11px;font-style:italic;margin-top:6px;padding:8px;background:rgba(232,168,56,0.08);border-radius:6px;">* Referenzkonfiguration: 6 WE MFH, 2× Wolf CHA-16 Kaskade. Förderung bei MFH stark abhängig von Anzahl der Wohneinheiten und Eigentümerstruktur. Individuelle Planung erforderlich.</div>`;
    }
    cta.innerHTML = `
          <div class="pa-big-price">ab ${d.eigen.toLocaleString('de-DE')} €</div>
          <div class="pa-price-sub">${preSub}</div>
          ${d.proklima !== null ? `<div class="pa-proklima-badge">proKlima möglich: ab ${d.proklima.toLocaleString('de-DE')} €</div>` : ''}
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

  // Bild pro Modell — Ambiente-Bilder als Cover
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
paLoadData().then(() => paRenderCards());

// ===== SVG ICON CONSTANTS =====
const SVG_CHECK =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B7D900" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><polyline points="16 8 10 16 7 13"/></svg>';
const SVG_WARN =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8A838" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M12 2L2 22h20L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="#E8A838"/></svg>';
const SVG_CHECK_SM =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>';

// ===== FÖRDERRECHNER (KfW 458 — korrekte Pro-WE-Aufteilung) =====

// --- Heizungsalter: Baujahr-Feld ein-/ausblenden + Hinweistext ---
// --- Heizungsalter: Modus-Toggle (Alter-Dropdown vs. Baujahr-Input) ---
let alterModus = 'alter'; // 'alter' oder 'baujahr'

function getHeizungsalter() {
  if (alterModus === 'baujahr') {
    const baujahr = parseInt(document.getElementById('heizungBaujahr').value) || 2000;
    return new Date().getFullYear() - baujahr;
  } else {
    return parseInt(document.getElementById('heizungAlterSelect').value) || 20;
  }
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
  const heizung = document.getElementById('heizung').value;
  const gruppe = document.getElementById('heizungsalterGroup');
  const hinweis = document.getElementById('heizungsalterHinweis');

  if (heizung === 'gas') {
    // Gas: Alter abfragen — Klimabonus nur bei ≥20 Jahre
    gruppe.style.display = 'block';
    const alter = getHeizungsalter();
    if (alter >= 20) {
      hinweis.innerHTML =
        SVG_CHECK +
        '<span style="color:var(--green);">Deine Gasheizung ist ' +
        alter +
        ' Jahre alt. Du erhältst den Klimageschwindigkeitsbonus (+20%).</span>';
    } else {
      hinweis.innerHTML =
        SVG_WARN +
        '<span style="color:var(--amber);">Deine Gasheizung ist erst ' +
        alter +
        ' Jahre alt. Der Klimageschwindigkeitsbonus (+20%) gilt erst ab 20 Jahren.</span>';
    }
  } else if (heizung === 'oel' || heizung === 'nachtspeicher' || heizung === 'gas-etage') {
    gruppe.style.display = 'none';
    hinweis.innerHTML = '';
  } else {
    gruppe.style.display = 'none';
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
  wpKostenModus = modus;
  const paketDiv = document.getElementById('wpKostenPaket');
  const manuellDiv = document.getElementById('wpKostenManuell');
  const btns = document.getElementById('kostenToggle').querySelectorAll('button');
  if (modus === 'manuell') {
    paketDiv.style.display = 'none';
    manuellDiv.style.display = 'block';
    btns[0].classList.remove('active');
    btns[1].classList.add('active');
  } else {
    paketDiv.style.display = 'block';
    manuellDiv.style.display = 'none';
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

// --- proKlima: Opt-in ein-/ausblenden je nach Gemeinde ---
const proklimaGemeinden = [
  'hannover',
  'seelze',
  'langenhagen',
  'laatzen',
  'hemmingen',
  'ronnenberg',
];

function updateProklimaOptin() {
  const gemeinde = document.getElementById('gemeinde').value;
  const group = document.getElementById('proklimaOptinGroup');
  if (proklimaGemeinden.includes(gemeinde)) {
    group.style.display = '';
  } else {
    group.style.display = 'none';
    document.getElementById('proklimaOptin').value = 'nein';
  }
}

function toggleProklimaHinweis() {
  const val = document.getElementById('proklimaOptin').value;
  document.getElementById('proklimaHinweis').style.display = val === 'ja' ? 'block' : 'none';
}

async function calculateFoerder() {
  const weEl = document.getElementById('wohneinheiten');
  if (!weEl) return;
  const we = parseInt(weEl.value);
  const selbstWE = parseInt(document.getElementById('selbstnutzung').value);
  const heizung = document.getElementById('heizung').value;
  const einkommen = document.getElementById('einkommen').value;
  const gemeinde = document.getElementById('gemeinde').value;
  const wpTyp = document.getElementById('foerderWpTyp').value;
  const preisManuell = wpKostenModus === 'manuell' ? (parseInt(document.getElementById('wpKostenInput').value) || '') : '';
  const proklimaOptinVal = document.getElementById('proklimaOptin').value;

  document.getElementById('foerderSatzKfw').textContent = '...';
  document.getElementById('frPreis').textContent = 'wird berechnet';
  document.getElementById('frZuschuss').textContent = '...';
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
    proklimaOptin: proklimaOptinVal,
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
    document.getElementById('foerderBreakdown').innerHTML = '<div style="border:1px solid rgba(232,168,56,0.35);border-radius:12px;padding:14px;color:var(--g300);">Berechnung gerade nicht verfügbar. Bitte Beratung anfragen.</div>';
    document.getElementById('effektivSatzBox').style.display = 'none';
    return;
  }

  const preis = Number(data.preis) || 0;
  const gesamtZuschuss = Number(data.zuschussGesamt || 0) + Number(data.proklimaZuschuss || 0);
  const kfwSatz = Number(data.kfwSatz) || 0;
  const effektivSatz = Number(data.effektivSatz) || 0;

  document.getElementById('foerderSatzKfw').textContent = kfwSatz + '%';
  document.getElementById('frPreis').textContent = 'ab ' + preis.toLocaleString('de-DE') + ' €';
  document.getElementById('frZuschuss').textContent = '-' + Math.round(gesamtZuschuss).toLocaleString('de-DE') + ' €';
  document.getElementById('frEigen').textContent = 'ab ' + Math.round(Number(data.eigenanteil) || 0).toLocaleString('de-DE') + ' €';

  const effektivBox = document.getElementById('effektivSatzBox');
  if (effektivSatz < kfwSatz) {
    effektivBox.style.display = 'block';
    document.getElementById('foerderSatzEffektiv').textContent = effektivSatz + '%';
    document.getElementById('effektivErklaerung').textContent = 'Die serverseitige Berechnung berücksichtigt förderfähige Kosten, Investitionssumme und Wohneinheiten.';
  } else {
    effektivBox.style.display = 'none';
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
    html += '<div class="breakdown-item"><span>' + baustein + '</span><span class="pct">✓</span></div>';
  });
  html += '<div class="breakdown-item" style="border-top:1px solid rgba(255,255,255,0.15);padding-top:8px;margin-top:8px;"><span style="font-weight:700;color:var(--white);">KfW-Zuschuss gesamt</span><span class="pct" style="font-size:16px;">' + Math.round(Number(data.zuschussGesamt) || 0).toLocaleString('de-DE') + ' €</span></div>';
  if (Number(data.proklimaZuschuss) > 0) {
    html += '<div class="breakdown-item" style="margin-top:8px;"><span style="color:var(--green);">proKlima Zuschuss</span><span class="pct" style="color:var(--green);">' + Number(data.proklimaZuschuss).toLocaleString('de-DE') + ' €</span></div>';
  } else if (proklimaGemeinden.includes(gemeinde) && proklimaOptinVal === 'nein') {
    html += '<div class="breakdown-item" style="margin-top:8px;"><span style="color:var(--g400);">proKlima: nicht eingerechnet</span><span class="pct" style="color:var(--g400);">0 €</span></div>';
  } else if (!proklimaGemeinden.includes(gemeinde)) {
    html += '<div class="breakdown-item" style="margin-top:8px;"><span style="color:var(--g400);">proKlima: nicht im Fördergebiet</span><span class="pct" style="color:var(--g400);">0 €</span></div>';
  }
  if (data.vorlaeufig) {
    html += '<div style="margin-top:10px;color:var(--bernstein);font-size:13px;">Vaillant-Ergebnis vorläufig, verbindliche Prüfung im Vor-Ort-Termin.</div>';
  }
  breakdown.innerHTML = html;

  const wegBox = document.getElementById('wegHinweis');
  if (we >= 3) {
    wegBox.style.display = 'block';
    wegBox.innerHTML = '<div style="color:var(--g300);font-size:13px;line-height:1.6;">Bei einer WEG beantragt jeder Eigentümer individuell. Für die genaue Aufteilung beraten wir dich kostenlos.</div>';
  } else {
    wegBox.style.display = 'none';
    wegBox.innerHTML = '';
  }
}

document.getElementById('selbstnutzung')?.addEventListener('change', calculateFoerder);
document.getElementById('einkommen')?.addEventListener('change', calculateFoerder);
document.getElementById('wohneinheiten')?.addEventListener('change', function () {
  updateSelbstnutzungOptionen();
  calculateFoerder();
});
document.getElementById('gemeinde')?.addEventListener('change', function () {
  updateProklimaOptin();
  calculateFoerder();
});
document.getElementById('foerderWpTyp')?.addEventListener('change', calculateFoerder);
// Initialer Aufruf — nur wenn der Förderrechner auf dieser Seite vorhanden ist.
// Die folgenden Funktionen lesen .value direkter Förderrechner-Elemente; auf
// Seiten ohne Rechner (z. B. Startseite) würde der Top-Level-Aufruf sonst eine
// TypeError werfen und die restliche site.js-Ausführung abbrechen.
if (document.getElementById('wohneinheiten')) {
  updateSelbstnutzungOptionen();
  updateProklimaOptin();
  toggleProklimaHinweis();
  toggleHeizungsalter();
}

// ===== AMORTISATIONSRECHNER =====
function calculateAmort() {
  const heizung = document.getElementById('amortHeizung').value;
  const defaultPreise = { gas: 0.12, oel: 0.11, nachtspeicher: 0.32 };
  const defaultVerbrauch = { gas: 18000, oel: 18000, nachtspeicher: 12000 };

  const verbrauch =
    parseInt(document.getElementById('verbrauch').value) || defaultVerbrauch[heizung];
  const energiepreis =
    parseFloat(document.getElementById('energiepreis').value) || defaultPreise[heizung];
  const wpPreise = { s: 29750, m: 34510, l: 45220, xl: 57120, xxl: 82223 }; // Brutto inkl. 19% MwSt
  const preis = wpPreise[document.getElementById('amortWp').value];
  const foerderSatz = parseInt(document.getElementById('amortFoerder').value) / 100;
  const foerderBetrag = Math.round(Math.min(preis, 30000) * foerderSatz);
  let investitionNetto = preis - foerderBetrag;

  // Fossile Heizungskosten gegenrechnen (Ø 15.000 € im oberen Drittel)
  const fossilChecked = document.getElementById('amortFossil').checked;
  if (fossilChecked) {
    investitionNetto = Math.max(0, investitionNetto - 15000);
  }

  const kostenAlt = verbrauch * energiepreis;
  const wpStrompreis = 0.3;
  const jaz = 3.5;
  const kostenWp = (verbrauch / jaz) * wpStrompreis;
  const ersparnis = kostenAlt - kostenWp;
  const amortJahre = ersparnis > 0 ? investitionNetto / ersparnis : 99;

  document.getElementById('kostenAlt').textContent =
    Math.round(kostenAlt).toLocaleString('de-DE') + ' €';
  document.getElementById('kostenWp').textContent =
    Math.round(kostenWp).toLocaleString('de-DE') + ' €';
  document.getElementById('ersparnis').textContent =
    'ca. ' + Math.round(ersparnis).toLocaleString('de-DE') + ' €';

  // Validierung: bei unsinnigen Werten (>25 Jahre oder ≤0 Ersparnis) keinen Wert anzeigen
  const amortEl = document.getElementById('amortJahre');
  if (ersparnis <= 0 || amortJahre > 25) {
    amortEl.innerHTML =
      '<span style="font-size:16px;color:var(--g400);">Daten unvollständig. Bitte Verbrauch und Energiepreis prüfen</span>';
  } else {
    amortEl.textContent = 'ca. ' + amortJahre.toFixed(1) + ' Jahre';
  }
}

document.getElementById('verbrauch')?.addEventListener('input', calculateAmort);
document.getElementById('energiepreis')?.addEventListener('input', calculateAmort);
document.getElementById('amortHeizung')?.addEventListener('change', function () {
  const preise = { gas: '0.12', oel: '0.11', nachtspeicher: '0.32' };
  document.getElementById('energiepreis').value = preise[this.value];
  calculateAmort();
});
document.getElementById('amortWp')?.addEventListener('change', calculateAmort);
document.getElementById('amortFoerder')?.addEventListener('change', calculateAmort);
document.getElementById('amortFossil')?.addEventListener('change', calculateAmort);
if (document.getElementById('verbrauch')) calculateAmort();

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

  // Spezifischer Energiebedarf nach Baujahr (kWh/m²) — konsistent mit Wizard
  const spezBedarfMap = { vor1978: 180, '1978-1994': 140, '1995-2010': 100, nach2010: 60 };
  const spezVerbrauch = spezBedarfMap[baujahr] || 140;
  const verbrauch = flaeche * spezVerbrauch;
  const kostenAlt = verbrauch * energiePreise[heizTyp];

  // JAZ nach Baujahr (konservativ) — konsistent mit Wizard
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
    '00000000-0000-0000-0000-000000000000';
  const endpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;
  const payload = {
    fields: Object.entries(data)
      .filter(([name]) => name !== 'dsgvo')
      .map(([name, value]) => ({ name, value: String(value) })),
    context: { pageUri: window.location.href, pageName: document.title },
    legalConsentOptions: {
      consent: {
        consentToProcess: true,
        text: 'Einwilligung zur Verarbeitung der Kontaktdaten und Kontaktaufnahme.',
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

// ===== FÖRDERVORSCHUSS QUALIFIZIERUNGS-WIZARD =====
let fvqCurrentStep = 1;

function fvqCheckMfh() {
  const val = document.getElementById('fvqGebaeude').value;
  const hinweis = document.getElementById('fvqMfhHinweis');
  hinweis.style.display = val === 'mfh' ? 'block' : 'none';
}

function fvqNext(step) {
  // Aktuelle Step ausblenden
  document.getElementById('fvqStep' + fvqCurrentStep).style.display = 'none';
  // Neue Step einblenden
  document.getElementById('fvqStep' + step).style.display = 'block';
  fvqCurrentStep = step;
  // Progress Bar aktualisieren
  document.querySelectorAll('.fvq-progress-step').forEach((el) => {
    const s = parseInt(el.getAttribute('data-fvq'));
    el.style.background = s <= step ? 'var(--green)' : 'var(--g700)';
  });
  // Scroll zum Wizard
  document.getElementById('fv-qualify').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Heizungsalter ein-/ausblenden im FV-Wizard
function fvqToggleHeizalter() {
  const heizung = document.getElementById('fvqHeizung').value;
  const gruppe = document.getElementById('fvqHeizalterGroup');
  const hinweis = document.getElementById('fvqKlimaHinweis');
  if (heizung === 'gas') {
    gruppe.style.display = 'block';
    const baujahr = parseInt(document.getElementById('fvqHeizBaujahr').value) || 2000;
    const alter = new Date().getFullYear() - baujahr;
    if (alter >= 20) {
      hinweis.innerHTML =
        SVG_CHECK +
        '<span style="color:var(--green);">Gasheizung ' +
        alter +
        ' Jahre alt. Klimageschwindigkeitsbonus (+20%) anwendbar.</span>';
    } else {
      hinweis.innerHTML =
        SVG_WARN +
        '<span style="color:var(--amber);">Gasheizung ' +
        alter +
        ' Jahre alt. Klimageschwindigkeitsbonus erst ab 20 Jahren.</span>';
    }
  } else if (heizung === 'oel' || heizung === 'nachtspeicher' || heizung === 'gas-etage') {
    gruppe.style.display = 'none';
    hinweis.innerHTML =
      SVG_CHECK +
      '<span style="color:var(--green);">Klimageschwindigkeitsbonus (+20%) wird automatisch angerechnet.</span>';
  } else {
    gruppe.style.display = 'none';
    hinweis.innerHTML =
      '<span style="color:var(--g400);">Kein Klimageschwindigkeitsbonus bei dieser Heizungsart.</span>';
  }
}

function fvqSubmit() {
  // Pflichtfelder prüfen
  const vorname = document.getElementById('fvqVorname').value.trim();
  const nachname = document.getElementById('fvqNachname').value.trim();
  const email = document.getElementById('fvqEmail').value.trim();
  const strasse = document.getElementById('fvqStrasse').value.trim();
  const ort = document.getElementById('fvqOrt').value.trim();
  const gebdatum = document.getElementById('fvqGeburtsdatum').value;
  const dsgvo = document.getElementById('fvqDsgvo').checked;

  if (!vorname || !nachname || !email || !strasse || !ort || !gebdatum) {
    alert('Bitte fülle alle Pflichtfelder aus (Vorname, Nachname, Geburtsdatum, E-Mail, Adresse).');
    return;
  }
  if (!dsgvo) {
    alert('Bitte stimme der Datenschutzerklärung zu.');
    return;
  }

  // --- Förderberechnung ---
  const heizung = document.getElementById('fvqHeizung').value;
  const selbst = parseInt(document.getElementById('fvqSelbst').value);
  const einkommen = document.getElementById('fvqEinkommen').value;
  const we = parseInt(document.getElementById('fvqWE').value);
  const gebaeude = document.getElementById('fvqGebaeude').value;

  // WP-Typ schätzen nach Gebäudetyp + Fläche
  const flaeche = parseInt(document.getElementById('fvqFlaeche').value);
  let wpTyp = 'm'; // Standard
  if ((gebaeude === 'efh' || gebaeude === 'dhh' || gebaeude === 'rh-end') && flaeche <= 100)
    wpTyp = 's';
  else if ((gebaeude === 'efh' || gebaeude === 'dhh' || gebaeude === 'rh-end') && flaeche <= 200)
    wpTyp = 'm';
  else if (gebaeude === 'efh' || gebaeude === 'dhh' || gebaeude === 'rh-end' || gebaeude === 'zfh')
    wpTyp = 'l';
  else if (gebaeude === 'mfh') wpTyp = 'xl';

  const preise = { s: 29750, m: 34510, l: 45220, xl: 57120, xxl: 82223 };
  const preis = preise[wpTyp];

  // Fördersatz berechnen
  let satz = 30; // Grundförderung
  let klimaBonus = false;
  if (heizung === 'oel' || heizung === 'nachtspeicher' || heizung === 'gas-etage') {
    klimaBonus = true;
  } else if (heizung === 'gas') {
    const baujahr = parseInt(document.getElementById('fvqHeizBaujahr').value) || 2000;
    klimaBonus = new Date().getFullYear() - baujahr >= 20;
  }
  if (selbst > 0 && klimaBonus) satz += 20;
  if (selbst > 0 && einkommen === 'unter40') satz += 30;
  satz += 5; // R290 Effizienzbonus
  satz = Math.min(satz, 70);

  // Förderfähige Kosten (1. WE = 30.000€)
  const foerderBasis = Math.min(preis, 30000);
  const zuschuss = Math.round(foerderBasis * (satz / 100));
  const eigen = Math.max(0, preis - zuschuss);

  // Ergebnis anzeigen — NUR Fördersatz, keine absoluten Beträge (Preisanker-Psychologie)
  document.getElementById('fvqResultName').textContent = vorname;
  document.getElementById('fvqResultSatz').textContent = satz + '%';

  // Fördersatz-Bausteine als Tags
  const tagStyle =
    'display:inline-block;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;';
  let tags =
    '<span style="' +
    tagStyle +
    'background:rgba(183,217,0,0.15);color:var(--green);">Grundförderung 30%</span>';
  tags +=
    '<span style="' +
    tagStyle +
    'background:rgba(183,217,0,0.15);color:var(--green);">Effizienzbonus 5%</span>';
  if (selbst > 0 && klimaBonus)
    tags +=
      '<span style="' +
      tagStyle +
      'background:rgba(183,217,0,0.15);color:var(--green);">Klimabonus 20%</span>';
  if (selbst > 0 && einkommen === 'unter40')
    tags +=
      '<span style="' +
      tagStyle +
      'background:rgba(183,217,0,0.15);color:var(--green);">Einkommensbonus 30%</span>';
  document.getElementById('fvqResultBausteine').innerHTML = tags;

  // Breakdown — kein Preis, nur Erklärung
  let bd = '';
  if (satz >= 70) {
    bd +=
      '<span style="color:var(--green);font-weight:600;">Du erreichst den maximalen Fördersatz von 70%!</span><br>';
  }
  bd +=
    '<span style="color:var(--g500);">Der Fördersatz bezieht sich auf die förderfähigen Kosten (max. 30.000 € pro Wohneinheit). Den genauen Zuschussbetrag und dein persönliches Angebot ermitteln wir im Rahmen der Angebotserstellung.</span>';
  document.getElementById('fvqResultBreakdown').innerHTML = bd;

  // Zum Ergebnis wechseln
  fvqNext(4);
}

// Initial: Heizungsalter-Hinweis setzen
if (document.getElementById('fvqHeizung')) fvqToggleHeizalter();

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
