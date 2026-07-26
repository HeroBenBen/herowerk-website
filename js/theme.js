(function () {
  'use strict';
  // Sofort am <html> setzen, noch waehrend der Kopf geparst wird: die Modus-
  // Umschalter sind reine Skript-Bedienelemente (Sinnbild und Klick-Verhalten
  // entstehen erst hier). Ohne Skript sollen sie gar nicht erscheinen, sonst
  // steht dort ein toter Knopf - bei schmalen Bildschirmen frisst er zusaetzlich
  // die Breite, die das Logo braucht. Die Marke wird VOR dem ersten Bild gesetzt,
  // deshalb entsteht kein Nachrutschen der Kopfzeile.
  document.documentElement.classList.add('js-an');
  const KEY = 'hero-theme';
  const allowed = ['dark', 'light'];
  // Mond = aktueller Dunkel-Modus, Sonne = aktueller Hell-Modus (G3-N N-2).
  // Inline-SVG (CSP-konform, keine externe Ressource); currentColor erbt die Pill-Farbe.
  const MOON_ICON =
    '<svg class="theme-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const SUN_ICON =
    '<svg class="theme-toggle-icon theme-toggle-icon--sun" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('theme');
  const fromStorage = localStorage.getItem(KEY);
  // GF-Entscheid 26.07.: Dunkel bleibt fuer JEDEN Besucher der Start, auch auf
  // dem Telefon. Der dunkle Auftritt ist der Haupt-Markenkontakt und das
  // Unterscheidungsmerkmal; die Geraete-Einstellung darf ihn nicht abloesen,
  // sonst bekaeme die Mehrheit die schwaechere Fassung zu sehen. Wer hell
  // will, schaltet um - der Umschalter steht dafuer im Klappmenue.
  // Reihenfolge deshalb unveraendert: Adresszeile, bewusste Wahl, sonst dunkel.
  // KEIN prefers-color-scheme. Bewusst so, nicht vergessen.
  const initial = allowed.includes(fromUrl)
    ? fromUrl
    : allowed.includes(fromStorage)
      ? fromStorage
      : 'dark';

  function applyTheme(theme, persist) {
    const next = allowed.includes(theme) ? theme : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      // Zwei-Feld-Schalter (nur im Klappmenue, Kennzeichen data-theme-switch).
      // Fachbefund 26.07.2026: die einfeldrige Fassung zeigt im Dunkel-Modus
      // einen Mond neben dem Wort "Light-Mode" und behauptet damit im selben
      // Atemzug Zustand UND Absicht. Beim Zwei-Feld-Schalter stehen beide
      // Zustaende gleichzeitig da, der aktive ist gefuellt, nichts zu raten.
      if (button.hasAttribute('data-theme-switch')) {
        const dunkel = next === 'dark';
        button.setAttribute('role', 'switch');
        button.setAttribute('aria-checked', dunkel ? 'true' : 'false');
        // Der zugaengliche Name MUSS die sichtbaren Beschriftungen "Hell" und
        // "Dunkel" enthalten (WCAG 2.5.3 Label in Name, Stufe A), sonst trifft
        // Sprachsteuerung das Element nicht. R14-Befund 26.07.2026: der Name
        // lautete "Dunkle Ansicht" und enthielt "Dunkel" nicht als Wort.
        button.setAttribute('aria-label', 'Ansicht: Hell oder Dunkel');
        button.innerHTML =
          `<span class="tt-feld" data-aktiv="${dunkel ? 'false' : 'true'}">${SUN_ICON}Hell</span>` +
          `<span class="tt-feld" data-aktiv="${dunkel ? 'true' : 'false'}">${MOON_ICON}Dunkel</span>`;
        return;
      }
      const label = next === 'dark' ? 'Light' : 'Dark';
      const icon = next === 'dark' ? MOON_ICON : SUN_ICON;
      button.setAttribute('aria-label', `${label}-Mode aktivieren`);
      button.innerHTML = `${icon}<span class="theme-toggle-label">${label}-Mode</span>`;
    });
    if (persist) localStorage.setItem(KEY, next);
  }

  applyTheme(initial, allowed.includes(fromUrl));

  function ensureAccessibleControls() {
    document.querySelectorAll('select, textarea, input:not([type="hidden"])').forEach((control) => {
      if (control.getAttribute('aria-label') || control.getAttribute('aria-labelledby')) return;
      if (control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`)) return;
      const label = control
        .closest('.form-group, .ws-field, .cc-input-group, .alter-panel, .contact-field')
        ?.querySelector('label');
      const text = label?.textContent?.trim().replace(/\s+/g, ' ');
      control.setAttribute(
        'aria-label',
        text || control.getAttribute('placeholder') || control.id || 'Eingabefeld'
      );
    });

    document.querySelectorAll('.answer-card').forEach((card) => {
      if (!card.hasAttribute('role')) card.setAttribute('role', 'button');
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        card.click();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') || initial, false);
    ensureAccessibleControls();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', (event) => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        // Beim Zwei-Feld-Schalter ist ein Tipp auf das BEREITS aktive Feld
        // folgenlos. R14-Befund 26.07.2026: er schaltete davon weg, das
        // Bedienelement sah aus wie ein Waehler und verhielt sich wie ein
        // Kippschalter. Ein Tipp neben die Felder (auf die Schiene) schaltet
        // weiterhin um, damit die ganze Flaeche bedienbar bleibt.
        if (button.hasAttribute('data-theme-switch')) {
          const feld = event.target instanceof Element ? event.target.closest('.tt-feld') : null;
          if (feld && feld.dataset.aktiv === 'true') return;
        }
        applyTheme(current === 'dark' ? 'light' : 'dark', true);
      });
    });
  });
})();
