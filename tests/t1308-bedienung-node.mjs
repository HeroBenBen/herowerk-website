import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseJS } from 'acorn';
import { harness, TestElement } from './t1308-dom-double.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const portalweg = source('js/portalweg.js');
const site = source('js/site.js');
const reference = parseJS(site, { ecmaVersion: 'latest' }).body.find(
  (node) => node.type === 'FunctionDeclaration' && node.id.name === 'heroVideoSteuerung'
);
const originalMotion = site.slice(reference.start, reference.end) + '\nheroVideoSteuerung();';
let comparisons = 0;
for (const reduced of [false, true])
  for (const motion of [null, 'an', 'aus', 'ungueltig'])
    for (const storageError of [false, true]) {
      const html = source('kundenportal.html');
      const options = { reduced, motion, storageError };
      const current = harness(html, options),
        baseline = harness(html, options);
      const video = new TestElement('video');
      video.paused = true;
      video.pause = () => {
        video.paused = true;
        video.emit('pause');
      };
      video.play = () => {
        video.paused = false;
        video.emit('play');
        return Promise.resolve();
      };
      const get = baseline.document.getElementById;
      baseline.document.getElementById = (id) => (id === 'heroVideo' ? video : get(id));
      current.run(portalweg);
      baseline.run(originalMotion);
      const a = current.document.querySelector('[data-motion-switch]'),
        b = baseline.document.querySelector('[data-motion-switch]');
      const same = () => {
        for (const key of ['role', 'aria-checked', 'aria-label'])
          assert.equal(
            a.getAttribute(key),
            b.getAttribute(key),
            `${reduced}/${motion}/${storageError}/${key}`
          );
        assert.equal(a.innerHTML, b.innerHTML);
        assert.deepEqual(current.writes, baseline.writes);
      };
      same();
      for (const active of ['true', 'false', null, 'false']) {
        const target =
          active === null ? a : new TestElement('span', { class: 'tt-feld', 'data-aktiv': active });
        a.emit('click', { target });
        b.emit('click', { target });
        same();
      }
      comparisons++;
    }
for (const portal of ['kunden', 'bewerber']) {
  const h = harness(source(`${portal}portal.html`));
  h.run(source('js/theme.js'));
  h.ready();
  h.run(portalweg);
  const { document: doc, context, win } = h;
  const controls = doc.querySelectorAll('button');
  // Jede Kopf-/Menüschaltfläche ist entweder Theme, Bewegung oder Portal-Auswahl.
  for (const button of controls.filter((b) => b.closest('nav'))) {
    assert(
      button.hasAttribute('data-theme-toggle') ||
        button.hasAttribute('data-motion-switch') ||
        button.getAttribute('id') === 'navPortalBtn',
      'Ungeprüftes Bedienelement'
    );
  }
  for (const theme of doc.querySelectorAll('[data-theme-toggle]')) {
    assert.equal(theme.getAttribute('role'), 'switch');
    assert.equal(theme.getAttribute('aria-label'), 'Ansicht: Hell oder Dunkel');
    assert(theme.innerHTML.includes('Hell') && theme.innerHTML.includes('Dunkel'));
    const before = doc.documentElement.getAttribute('data-theme');
    theme.emit('click');
    assert.notEqual(doc.documentElement.getAttribute('data-theme'), before);
    assert(h.writes.some(([key]) => key === 'hero-theme'));
  }
  const hamburger = doc.getElementById('hamburger'),
    menu = doc.getElementById('mobileMenu');
  hamburger.emit('keydown', { key: 'Enter' });
  assert(menu.classList.contains('open'));
  assert.equal(hamburger.getAttribute('aria-expanded'), 'true');
  assert(doc.documentElement.classList.contains('menue-offen'));
  doc.emit('keydown', { key: 'Escape' });
  assert(!menu.classList.contains('open'));
  assert(doc.activeElement === hamburger, 'Fokus nach Handy-Escape');
  hamburger.emit('keydown', { key: ' ' });
  assert(menu.classList.contains('open'));
  for (const link of menu.querySelectorAll('a')) {
    assert(link.getAttribute('href'));
    if (link.hasAttribute('onclick')) {
      h.run(link.getAttribute('onclick'));
      assert(!menu.classList.contains('open'));
      context.toggleMenu();
    }
  }
  menu.emit('touchstart', { touches: [{ clientX: 100, clientY: 200 }] });
  menu.emit('touchend', { changedTouches: [{ clientX: 105, clientY: 120 }] });
  assert(!menu.classList.contains('open'));
  assert(menu.emit('click').prevented);
  context.toggleMenu();
  menu.scrollHeight = 1500;
  menu.emit('touchstart', { touches: [{ clientX: 100, clientY: 200 }] });
  menu.emit('touchend', { changedTouches: [{ clientX: 100, clientY: 100 }] });
  assert(menu.classList.contains('open'), 'Scrollbares Menü darf nicht weggewischt werden');
  context.scrollY = 51;
  win.emit('scroll');
  assert(doc.querySelector('nav').classList.contains('scrolled'));
  assert.equal(doc.documentElement.styles['--mobile-bar-h'], '94px');
  doc.emit('keydown', { key: 'Escape' });
  assert(!menu.classList.contains('open'));
  const open = doc.getElementById('navPortalBtn'),
    panel = doc.getElementById('navPortalPanel');
  open.emit('click');
  assert(!panel.hidden);
  assert.equal(open.getAttribute('aria-expanded'), 'true');
  doc.emit('keydown', { key: 'Escape' });
  assert(panel.hidden);
  assert(doc.activeElement === open, 'Fokus nach Portal-Escape');
  open.emit('click');
  doc.emit('focusin', { target: hamburger });
  assert(panel.hidden);
  console.log(
    `${portal}: sämtliche Kopf-/Menüschalter, Links, Tastatur, Wischgeste und Scrollzustand grün.`
  );
}
// Die tatsächliche Host-Laufzeit mit kontrollierten Kanälen ausführen.
const h = harness(source('kundenportal.html'));
h.run(source('js/portalvorschau.js'));
const stages = h.document.querySelectorAll('.pv-buehne');
const ports = [];
for (const stage of stages) {
  h.intersections[0].trigger(stage);
  const frame = stage.querySelector('iframe');
  h.win.emit('message', { source: frame.contentWindow, data: { type: 't1300-ready', version: 1 } });
  const init = frame.contentWindow.sent[0][0];
  const port = h.channels.at(-1).port1;
  ports.push({ port, run: init.run });
  for (const type of ['started', 'call', 'state', 'action', 'preview', 'link', 'confirm'])
    port.onmessage({ data: { version: 1, run: init.run, type, id: 1 } });
  assert(
    stage.querySelector('.pv-toast').hidden,
    'Initialisierung/virtuelle Aktion darf keinen Bedienhinweis auslösen'
  );
}
ports[0].port.onmessage({ data: { version: 1, run: ports[0].run, type: 'public-notice' } });
assert(!stages[0].querySelector('.pv-toast').hidden);
ports[1].port.onmessage({ data: { version: 1, run: ports[1].run, type: 'public-notice' } });
assert(stages[0].querySelector('.pv-toast').hidden);
assert(!stages[1].querySelector('.pv-toast').hidden);
assert.equal(stages.filter((s) => !s.querySelector('.pv-toast').hidden).length, 1);
for (const entry of [...h.timers.values()]) if (entry.delay === 4500) entry.fn();
assert(stages.every((s) => s.querySelector('.pv-toast').hidden));
// Der öffentliche Adapter meldet ausschließlich vertrauenswürdige Nutzerereignisse.
const child = harness('<!doctype html><html><body><button>Bedienung</button></body></html>');
const sent = [];
child.run(
  fs.readFileSync(path.join(root, '../portal/scripts/t1300/public-runtime.browser.mjs'), 'utf8')
);
child.win.emit('message', {
  source: child.context.parent,
  data: { type: 't1300-init', run: 'node-test' },
  ports: [{ postMessage: (data) => sent.push(data) }],
});
const button = child.document.querySelector('button');
for (const type of ['click', 'submit', 'change', 'beforeinput'])
  child.document.emit(type, { target: button, isTrusted: false });
assert.equal(sent.length, 0);
child.document.emit('click', { target: button, isTrusted: true });
assert.equal(sent.length, 1);
assert.equal(sent[0].type, 'public-notice');
console.log(
  `${comparisons} Bewegungsvergleiche mit site.js sowie Lade-/Nutzerhinweise und Einzelanzeige grün. Node-Testdouble, kein Browserlauf.`
);
