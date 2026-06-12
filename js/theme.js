(function () {
  'use strict';
  const KEY = 'hero-theme';
  const allowed = ['dark', 'light'];
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('theme');
  const fromStorage = localStorage.getItem(KEY);
  const initial = allowed.includes(fromUrl)
    ? fromUrl
    : allowed.includes(fromStorage)
      ? fromStorage
      : 'dark';

  function applyTheme(theme, persist) {
    const next = allowed.includes(theme) ? theme : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const label = next === 'dark' ? 'Light' : 'Dark';
      button.setAttribute('aria-label', `${label}-Mode aktivieren`);
      button.textContent = `${label}-Mode`;
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
    ensureAccessibleControls();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark', true);
      });
    });
  });
})();
