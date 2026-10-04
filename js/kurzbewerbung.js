/* T1161: gemeinsame Kurzbewerbung, keine automatische Bewerberentscheidung. */
(function (root) {
  'use strict';
  const families = {
    anlagenmechaniker: 'F1',
    elektriker: 'F1',
    service: 'F1',
    quereinsteiger: 'F2',
    'quereinsteiger-fundamentbau': 'F2',
    gala: 'F2',
    'shk-meister': 'F3',
    'shk-meister-montage': 'F3',
    elektromeister: 'F3',
    vad: 'F4',
    'technischer-aussendienst': 'F4',
    va: 'F5',
    disponent: 'F5',
    backoffice: 'F5',
    assistenz: 'F5',
    hr: 'F5',
    finanzbuchhalter: 'F5',
    'finance-business-partner': 'F5',
    'planer-shk': 'F5',
    'planer-elektro': 'F5',
  };
  const questions = [
    {
      name: 'bewerber_arbeitserlaubnis',
      label: 'Arbeitserlaubnis',
      question: 'Darfst du in Deutschland arbeiten?',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { value: 'ja_uneingeschraenkt', label: 'Ja, ohne Einschränkung' },
        { value: 'ja_aufenthaltstitel', label: 'Ja, mit Aufenthaltstitel, der Arbeit erlaubt' },
        {
          value: 'beantragt_oder_beantragbar',
          label: 'Noch nicht, Erlaubnis beantragt oder beantragbar',
        },
        { value: 'nein', label: 'Nein' },
        { value: 'unklar', label: 'Weiß ich nicht' },
      ],
      number: 1,
    },
    {
      name: 'bewerber_berufsabschluss',
      label: 'Berufsabschluss',
      question: 'Welchen Berufsabschluss hast du?',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { value: 'geselle_facharbeiter', label: 'Gesellen- oder Facharbeiterbrief' },
        { value: 'meister_techniker', label: 'Meister oder Techniker' },
        { value: 'studium', label: 'Studium' },
        { value: 'ausland', label: 'Abschluss aus dem Ausland' },
        { value: 'keiner', label: 'Keinen Abschluss' },
        { value: 'anderer', label: 'Anderer' },
      ],
      number: 2,
    },
    {
      name: 'bewerber_anerkennung',
      label: 'Anerkennung',
      question: 'Ist dein ausländischer Abschluss in Deutschland anerkannt?',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { value: 'voll', label: 'Ja, voll' },
        { value: 'teilweise', label: 'Teilweise' },
        { value: 'verfahren_laeuft', label: 'Verfahren läuft' },
        { value: 'nicht_beantragt', label: 'Nicht beantragt' },
        { value: 'unklar', label: 'Weiß ich nicht' },
      ],
      number: 3,
    },
    {
      name: 'bewerber_berufserfahrung',
      label: 'Berufserfahrung',
      question: 'Wie viele Jahre hast du in diesem Beruf gearbeitet?',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { value: 'keine', label: 'keine' },
        { value: 'unter_1', label: 'unter 1' },
        { value: '1_bis_3', label: '1 bis 3' },
        { value: '3_bis_5', label: '3 bis 5' },
        { value: 'ueber_5', label: 'über 5' },
      ],
      number: 4,
    },
    {
      name: 'bewerber_fuehrerschein',
      label: 'Führerschein',
      question: 'Hast du einen Führerschein?',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { value: 'b', label: 'Klasse B' },
        { value: 'b_be', label: 'B und BE' },
        { value: 'c1_c1e', label: 'C1 oder C1E' },
        { value: 'c_ce', label: 'C oder CE' },
        { value: 'keiner', label: 'Keinen' },
        { value: 'in_ausbildung', label: 'Mache ich gerade' },
      ],
      number: 5,
    },
    {
      name: 'bewerber_deutsch',
      label: 'Deutschkenntnisse',
      question: 'Wie gut sprichst du Deutsch?',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { value: 'verhandlungssicher', label: 'Verhandlungssicher' },
        { value: 'sehr_gut_kundentelefon', label: 'Sehr gut, auch am Telefon mit Kunden' },
        { value: 'gut_arbeitsalltag', label: 'Gut, im Arbeitsalltag' },
        { value: 'grundkenntnisse', label: 'Grundkenntnisse' },
        { value: 'kaum', label: 'Kaum' },
      ],
      number: 6,
    },
    {
      name: 'bewerber_plz',
      label: 'Postleitzahl',
      question: 'Wo wohnst du?',
      type: 'string',
      fieldType: 'text',
      options: [],
      number: 7,
    },
    {
      name: 'bewerber_start',
      label: 'Verfügbarkeit',
      question: 'Ab wann kannst du anfangen?',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { value: 'sofort', label: 'Sofort' },
        { value: '1_monat', label: 'In 1 Monat' },
        { value: '2_bis_3_monate', label: 'In 2 bis 3 Monaten' },
        { value: 'spaeter', label: 'Später' },
      ],
      number: 8,
    },
  ];
  const family = (role) => families[role] || 'F5';
  const visible = (role, values) =>
    questions.filter(
      (q) =>
        (q.number !== 3 || values.bewerber_berufsabschluss === 'ausland') &&
        (q.number !== 5 || family(role) !== 'F5')
    );
  const fields = (role, values) =>
    visible(role, values).map((q) => ({
      name: q.name,
      value: String(values[q.name] || '').trim(),
    }));
  const valid = (role, values) =>
    visible(role, values).every((q) =>
      q.number === 7
        ? /^\d{5}$/.test(values[q.name] || '')
        : q.options.some((o) => o.value === values[q.name])
    );
  function mount(form, config = {}) {
    const make = (tag, text, cls) => {
      const el = document.createElement(tag);
      if (text) el.textContent = text;
      if (cls) el.className = cls;
      return el;
    };
    const take = (name) => {
      const input = form.querySelector('[name="' + name + '"]');
      return input?.closest('.form-group,.st-feld,.form-checkbox,.st-check') || input;
    };
    const roleControl = form.querySelector('[name="beworbene_rolle"]');
    const hinweis = form.querySelector('.bewerbung-hinweis, .st-hinweis');
    const contactNodes = [
      'firstname',
      'lastname',
      'email',
      'phone',
      'message',
      'newslettereinwilligung',
    ]
      .map(take)
      .filter(Boolean);
    const dateNode = take('fruhester_eintritt');
    let role = config.role || roleControl?.value || '',
      at = 0,
      busy = false;
    const values = () => Object.fromEntries(new FormData(form));
    const stepNodes = new Map();
    function step(id, title) {
      const el = make('fieldset', null, 'kb-step');
      el.dataset.schritt = id;
      const legend = make('legend', title);
      legend.tabIndex = -1;
      el.append(legend);
      stepNodes.set(id, el);
      return el;
    }
    const roleStep = step('rolle', 'Auf welche Stelle bewirbst du dich?');
    if (config.roles) {
      const choices = make('div', null, 'kb-choices');
      Object.entries(config.roles).forEach(([key, r]) => {
        const label = make('label', null, 'kb-choice');
        const input = make('input');
        input.type = 'radio';
        input.name = 'rolle_wahl';
        input.value = key;
        input.checked = key === role;
        input.required = true;
        label.append(input, make('span', r.titel));
        choices.append(label);
      });
      roleStep.append(choices);
    } else if (roleControl) roleStep.append(roleControl.closest('.form-group') || roleControl);
    const progress = make('p', null, 'kb-progress');
    progress.id = config.stelle ? 'stSchrittText' : 'kbSchrittText';
    progress.setAttribute('aria-live', 'polite');
    const bar = make('progress');
    bar.max = 100;
    bar.setAttribute('aria-label', 'Fortschritt der Bewerbung');
    const questionNodes = questions.map((q) => {
      const fs = step('a' + q.number, q.question);
      const help = {
        1: 'Das fragen wir alle Bewerberinnen und Bewerber gleich. Vor dem ersten Arbeitstag brauchen wir von allen einen Nachweis.',
        2: 'Deine Antwort allein führt nie zu einer automatischen Absage. Über jede Bewerbung entscheidet ein Mensch.',
        6: 'Deine Einschätzung reicht. Wir sprechen im Telefonat darüber.',
      }[q.number];
      if (help) fs.append(make('p', help, 'kb-help'));
      if (q.number === 7) {
        const label = make('label', 'Postleitzahl');
        const input = make('input');
        input.type = 'text';
        input.inputMode = 'numeric';
        input.autocomplete = 'postal-code';
        input.pattern = '[0-9]{5}';
        input.maxLength = 5;
        input.required = true;
        input.name = q.name;
        input.id = 'kb-' + q.name;
        label.htmlFor = input.id;
        fs.append(label, input);
      } else {
        const choices = make('div', null, 'kb-choices');
        q.options.forEach((o) => {
          const label = make('label', null, 'kb-choice');
          const input = make('input');
          input.type = 'radio';
          input.name = q.name;
          input.value = o.value;
          input.required = true;
          label.append(input, make('span', o.label));
          choices.append(label);
        });
        fs.append(choices);
      }
      if (q.number === 8 && dateNode) fs.append(dateNode);
      return fs;
    });
    const nameStep = step('name', 'Wie heißt du?');
    const contactStep = step('kontakt', 'Wie erreichen wir dich?');
    contactNodes.forEach((n) => {
      const input = n.matches('input,textarea') ? n : n.querySelector('input,textarea');
      (input && ['firstname', 'lastname'].includes(input.name) ? nameStep : contactStep).append(n);
    });
    if (hinweis) contactStep.append(hinweis);
    const nav = make('div', null, 'kb-nav');
    const back = make('button', 'Zurück', 'kb-back');
    back.type = 'button';
    back.id = config.stelle ? 'stZurueck' : 'kbZurueck';
    const next = make('button', 'Weiter', 'kb-next');
    next.type = 'submit';
    next.id = config.stelle ? 'stWeiter' : 'kbWeiter';
    nav.append(back, next);
    const error = make('p', null, 'kb-error');
    error.id = config.stelle ? 'stFehler' : 'kbFehler';
    error.setAttribute('role', 'alert');
    error.hidden = true;
    form.replaceChildren(
      progress,
      bar,
      roleStep,
      ...questionNodes,
      nameStep,
      contactStep,
      nav,
      error
    );
    if (config.roles) {
      roleControl.value = role;
      form.append(roleControl);
    }
    form.classList.add('kb-form');
    form.noValidate = true;
    const hasRoleStep = !config.role || !config.stelle;
    const steps = () => [
      ...(hasRoleStep ? ['rolle'] : []),
      ...visible(role, values()).map((q) => 'a' + q.number),
      'name',
      'kontakt',
    ];
    function refresh(focus = false) {
      const list = steps();
      at = Math.min(at, list.length - 1);
      stepNodes.forEach((fs, id) => {
        const included = list.includes(id);
        fs.hidden = id !== list[at];
        fs.querySelectorAll('input,select,textarea').forEach((el) => {
          el.disabled = !included;
        });
      });
      progress.textContent = 'Schritt ' + (at + 1) + ' von ' + list.length;
      bar.value = ((at + 1) / list.length) * 100;
      back.hidden = at === 0;
      next.textContent = at === list.length - 1 ? 'Bewerbung absenden' : 'Weiter';
      if (focus) stepNodes.get(list[at]).querySelector('legend').focus();
    }
    function check(id) {
      for (const el of stepNodes.get(id).querySelectorAll('input,select,textarea'))
        if (!el.disabled && !el.checkValidity()) {
          el.reportValidity();
          return false;
        }
      return true;
    }
    function payload() {
      const v = values();
      const out = ['firstname', 'lastname', 'email', 'phone', 'message'].map((name) => ({
        name,
        value: v[name] || '',
      }));
      out.push({ name: 'beworbene_rolle', value: role }, ...fields(role, v));
      if (v.fruhester_eintritt)
        out.push({
          name: 'fruhester_eintritt',
          value: String(Date.parse(v.fruhester_eintritt + 'T00:00:00Z')),
        });
      if (v.newslettereinwilligung) out.push({ name: 'newslettereinwilligung', value: 'true' });
      return {
        fields: out.filter((f) => f.value !== ''),
        context: { pageUri: window.location.href, pageName: document.title },
      };
    }
    form.addEventListener('change', (e) => {
      if (busy) return;
      if (['beworbene_rolle', 'rolle_wahl'].includes(e.target.name)) {
        role = e.target.value;
        if (config.roles) roleControl.value = role;
        config.onRole?.(role);
      }
      refresh();
    });
    back.addEventListener('click', () => {
      if (!busy) {
        at = Math.max(0, at - 1);
        error.hidden = true;
        refresh(true);
      }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      error.hidden = true;
      let list = steps();
      if (!check(list[at])) return;
      if (at < list.length - 1) {
        at++;
        refresh(true);
        return;
      }
      for (let i = 0; i < list.length; i++) {
        if (!check(list[i])) {
          at = i;
          refresh(true);
          return;
        }
      }
      if (!valid(role, values())) return;
      busy = true;
      next.disabled = true;
      back.disabled = true;
      next.textContent = 'Wird gesendet …';
      try {
        const response = await fetch(
          'https://api.hsforms.com/submissions/v3/integration/submit/148110267/c6a199f5-bab6-499e-a3ee-3d9605120877',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload()),
          }
        );
        if (!response.ok) throw new Error('submit');
        config.success?.(values());
        form.hidden = true;
      } catch {
        error.replaceChildren(
          make(
            'span',
            'Das Senden hat gerade nicht geklappt. Bitte versuch es erneut oder schreib uns an '
          )
        );
        const link = make('a', 'bewerbung@herowerk.de');
        link.href = 'mailto:bewerbung@herowerk.de?subject=Bewerbung%20bei%20HeroWerk';
        error.append(link);
        error.hidden = false;
      } finally {
        busy = false;
        next.disabled = false;
        back.disabled = false;
        refresh();
      }
    });
    refresh();
    return { focus: () => stepNodes.get(steps()[at]).querySelector('legend').focus() };
  }
  root.HeroKurzbewerbung = { families, family, questions, visible, fields, valid, mount };
  if (typeof module !== 'undefined') module.exports = root.HeroKurzbewerbung;
})(typeof window === 'undefined' ? globalThis : window);
