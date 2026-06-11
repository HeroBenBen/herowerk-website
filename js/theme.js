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

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark', true);
      });
    });
  });
})();
