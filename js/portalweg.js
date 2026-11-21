/* Portalweg: bestehende Seiten behalten ihre Menüsteuerung aus site.js. */
(() => {
  'use strict';
  const button = document.getElementById('navPortalBtn');
  const panel = document.getElementById('navPortalPanel');
  if (button && panel) {
    const close = (returnFocus = false) => {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (returnFocus) button.focus();
    };
    button.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.nav-portal')) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !panel.hidden) close(true);
    });
    document.addEventListener('focusin', (event) => {
      if (!event.target.closest('.nav-portal')) close();
    });
  }
  if (!document.body.hasAttribute('data-portal-erklaerseite')) return;
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  window.toggleMenu = () => {
    const open = menu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('menue-offen', open);
  };
  hamburger.setAttribute('role', 'button');
  hamburger.setAttribute('tabindex', '0');
  hamburger.setAttribute('aria-label', 'Menü');
  hamburger.setAttribute('aria-controls', 'mobileMenu');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.addEventListener('click', window.toggleMenu);
  hamburger.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.toggleMenu();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('open')) {
      window.toggleMenu();
      hamburger.focus();
    }
  });

  // Ohne site.js: gleiche globale Bewegungswahl wie heroVideoSteuerung().
  // Die Erklärseiten haben kein Video; Zustand und gespeicherte Wahl bleiben
  // trotzdem mit der Startseite identisch.
  const motion = document.querySelector('[data-motion-switch]');
  if (motion) {
    const reduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stored = null;
    try {
      const value = localStorage.getItem('hero-motion');
      if (['an', 'aus'].includes(value)) stored = value;
    } catch {
      /* Wahl bleibt bei gesperrtem Speicher für diesen Aufruf wirksam. */
    }
    let enabled = !reduced && stored !== 'aus';
    const renderMotion = () => {
      motion.setAttribute('role', 'switch');
      motion.setAttribute('aria-checked', enabled ? 'true' : 'false');
      motion.setAttribute('aria-label', 'Bewegung: Aus oder An');
      motion.innerHTML =
        `<span class="tt-feld" data-aktiv="${enabled ? 'false' : 'true'}">Aus</span>` +
        `<span class="tt-feld" data-aktiv="${enabled ? 'true' : 'false'}">An</span>`;
    };
    renderMotion();
    motion.addEventListener('click', (event) => {
      const field = event.target instanceof Element ? event.target.closest('.tt-feld') : null;
      if (field && field.dataset.aktiv === 'true') return;
      enabled = !enabled;
      try {
        localStorage.setItem('hero-motion', enabled ? 'an' : 'aus');
      } catch {
        /* Ohne Speicher dieselbe Bedienung, ohne dauerhafte Speicherung. */
      }
      renderMotion();
    });
  }

  // Übrige Navigation aus site.js: Wischbedienung und fester Scrollzustand.
  if (menu) {
    const SCHWELLE_HOCH = 60; // px, die der Finger nach oben zurueckgelegt haben muss
    const MAX_SEITLICH = 45; // px seitliche Abweichung, darueber ist es kein Hochwischen
    const MAX_DAUER = 800; // ms, laenger ist ein Halten und kein Wischen
    let start = null;
    let gewischt = false;

    menu.addEventListener(
      'touchstart',
      (event) => {
        // MUSS als erstes stehen, vor jedem Waechter. R14-Befund 26.07.2026:
        // stand das Zuruecksetzen hinter den Waechtern, ueberlebte ein gesetztes
        // "gewischt" die naechste Beruehrung und der Klick-Abfang unten
        // verschluckte einen echten Tipp. Gemessen: Tipp auf /foerderung nach
        // vorherigem Wischen bei scrollTop 40 loeste NICHT aus.
        gewischt = false;
        if (event.touches.length !== 1) {
          start = null;
          return;
        }
        // Ein scrollbares Menue gehoert dem Bildlauf, nicht der Geste. Sonst
        // schliesst die erste Aufwaertsbewegung aus der Ruhelage das Menue,
        // statt zum letzten Eintrag zu scrollen.
        if (menu.scrollHeight > menu.clientHeight + 1) {
          start = null;
          return;
        }
        const t = event.touches[0];
        start = { x: t.clientX, y: t.clientY, zeit: Date.now() };
      },
      { passive: true }
    );

    menu.addEventListener(
      'touchend',
      (event) => {
        if (!start || !menu.classList.contains('open')) return;
        const t = event.changedTouches && event.changedTouches[0];
        if (!t) return;
        const dy = t.clientY - start.y;
        const dx = Math.abs(t.clientX - start.x);
        const dauer = Date.now() - start.zeit;
        start = null;
        if (dy > -SCHWELLE_HOCH || dx > MAX_SEITLICH || dauer > MAX_DAUER) return;
        gewischt = true;
        window.toggleMenu();
      },
      { passive: true }
    );

    // Ein Hochwischen, das auf einem Link endet, darf diesen Link nicht
    // ausloesen. Der Klick kommt nach dem touchend, deshalb wird genau der eine
    // folgende Klick in der Erfassungsphase abgefangen.
    menu.addEventListener(
      'click',
      (event) => {
        if (!gewischt) return;
        gewischt = false;
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );
  }

  window.addEventListener(
    'scroll',
    () => {
      document.querySelector('nav')?.classList.toggle('scrolled', window.scrollY > 50);
    },
    { passive: true }
  );

  // Gleicher Reserveplatz für die feste mobile Aktionsleiste.
  (function syncMobileBarHeight() {
    const root = document.documentElement;
    const bar = document.querySelector('.mobile-bottom-bar');
    const apply = () => {
      // Ohne Leiste (Rechtsseiten, Funnel) oder wenn sie ausgeblendet ist:
      // kein Reserveraum. Aufrunden, damit kein Sub-Pixel-Rest offen bleibt.
      const hoehe = bar ? bar.getBoundingClientRect().height : 0;
      root.style.setProperty('--mobile-bar-h', (hoehe > 0 ? Math.ceil(hoehe) : 0) + 'px');
    };
    apply();
    // Umbruch aendert sich bei Drehung, Breitenwechsel und nachgeladener Schrift.
    if (bar && typeof ResizeObserver === 'function') new ResizeObserver(apply).observe(bar);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    document.fonts?.ready?.then(apply);
  })();
})();
