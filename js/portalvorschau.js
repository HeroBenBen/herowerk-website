/* Öffentliche Vorschau: opake Sandbox, exklusiver Nachrichtenkanal, kein Transport. */
(() => {
  'use strict';
  const stages = [];
  let activeNotice = null;
  const theme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  for (const wrapper of document.querySelectorAll('.pv-rahmen')) {
    const stage = wrapper.querySelector('.pv-buehne');
    const toast = wrapper.querySelector('.pv-toast');
    const { portal, view } = stage.dataset;
    const defaultNotice = toast.firstChild.textContent;
    let port, frame, timer, noticeTimer, run;
    const notice = () => {
      if (activeNotice && activeNotice !== toast) activeNotice.hidden = true;
      activeNotice = toast;
      toast.firstChild.textContent = defaultNotice;
      toast.hidden = false;
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => {
        toast.hidden = true;
      }, 4500);
    };
    const fail = () => {
      clearTimeout(timer);
      port?.close();
      stage.dataset.status = 'error';
      // Wortlaut zur Freigabe im Bericht: nur technischer Fehlerfall.
      toast.firstChild.textContent = 'Die Vorschau konnte nicht gestartet werden. ';
      toast.hidden = false;
    };
    const ready = (event) => {
      if (
        !frame ||
        event.source !== frame.contentWindow ||
        event.data?.type !== 't1300-ready' ||
        event.data.version !== 1 ||
        port
      )
        return;
      const channel = new MessageChannel();
      port = channel.port1;
      port.onmessage = ({ data: message }) => {
        if (message?.version !== 1 || message.run !== run) {
          fail();
          return;
        }
        if (message.type === 'started') {
          clearTimeout(timer);
          stage.dataset.status = 'started';
        } else if (message.type === 'public-notice') notice();
        else if (message.type === 'confirm') {
          port.postMessage({ version: 1, run, type: 'confirmation', id: message.id, value: false });
        } else if (message.type === 'blocked') fail();
        // Die interne Laufzeit meldet auch beim Token-Start action. Das ist
        // keine Nutzerbedienung und darf keinen Hinweis erzeugen.
        else if (!['state', 'call', 'action', 'preview', 'link'].includes(message.type)) fail();
      };
      frame.contentWindow.postMessage(
        {
          type: 't1300-init',
          version: 1,
          run,
          scenario: Number(stage.dataset.scenario || 0),
          state: null,
          session: view === 'dashboard',
          address:
            view === 'dashboard'
              ? 'dashboard.html?token=T1300-musterlink&email=demo%40example.com'
              : 'index.html',
          theme: theme(),
        },
        '*',
        [channel.port2]
      );
    };
    const load = () => {
      toast.hidden = true;
      toast.firstChild.textContent = defaultNotice;
      clearTimeout(noticeTimer);
      clearTimeout(timer);
      port?.close();
      port = null;
      frame?.remove();
      run = Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) =>
        x.toString(16).padStart(2, '0')
      ).join('');
      frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.referrerPolicy = 'no-referrer';
      frame.title = `${portal === 'kunden' ? 'Kundenportal' : 'Bewerberportal'}, Station ${wrapper.closest('.pv-station').querySelector('.nr').textContent}, Vorschau mit Beispieldaten`;
      frame.src = `/vorschau/${portal}-${view}.html`;
      stage.dataset.status = 'loading';
      stage.insertBefore(frame, toast);
      timer = setTimeout(fail, 15000);
    };
    window.addEventListener('message', ready);
    stages.push({ stage, load, loaded: false });
    for (const button of wrapper.querySelectorAll('[data-ansicht]'))
      button.addEventListener('click', () => {
        stage.classList.toggle('handy', button.dataset.ansicht === 'handy');
        wrapper
          .querySelectorAll('[data-ansicht]')
          .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      });
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          const item = stages.find((s) => s.stage === entry.target);
          if (!item.loaded) {
            item.loaded = true;
            item.load();
          }
          observer.unobserve(entry.target);
        }
    },
    { rootMargin: '200px 0px' }
  );
  stages.forEach(({ stage }) => observer.observe(stage));
  let currentTheme = theme();
  new MutationObserver(() => {
    if (currentTheme === theme()) return;
    currentTheme = theme();
    stages.filter((s) => s.loaded).forEach((s) => s.load());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('pagehide', () => {
    observer.disconnect();
  });
})();
