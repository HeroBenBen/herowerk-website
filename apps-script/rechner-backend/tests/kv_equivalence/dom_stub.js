/**
 * dom_stub.js — minimaler DOM-Ersatz, damit der UNVERAENDERTE Orakel-Script-Block
 * in Node laeuft. Das Orakel wird nie editiert (Briefing Abschnitt 1).
 *
 * Prinzip: Die Element-Registry wird aus dem Orakel-HTML geparst (id, Typ, value,
 * checked, min/max/step, selected option). Damit stammen die Startwerte aus der
 * Quelle selbst und nicht aus abgetippten Konstanten.
 *
 * Der Runner setzt window.location.search auf "?modus=berater". Dann bricht
 * init() (Orakel Z.719) sofort ab und die gesamte Wizard-UI-Schicht bleibt
 * inaktiv. calculate(), getFoerder() und updateFoerderung() lesen ausschliesslich
 * die Basis-Controls und sind davon unberuehrt.
 */
'use strict';

const fs = require('fs');

/* ---------- HTML-Parsing der Controls ---------- */

function parseControls(html) {
  const head = html.slice(0, html.lastIndexOf('<script>'));
  const out = {};

  // <input ...> (self-closing oder nicht), Tag endet am ersten '>' ohne '<' dazwischen
  const reInput = /<input\b([^<>]*)>/gi;
  let m;
  while ((m = reInput.exec(head)) !== null) {
    const attrs = parseAttrs(m[1]);
    if (!attrs.id) continue;
    out[attrs.id] = {
      tag: 'input',
      type: (attrs.type || 'text').toLowerCase(),
      value: attrs.value !== undefined ? attrs.value : '',
      checked: 'checked' in attrs,
      min: attrs.min, max: attrs.max, step: attrs.step
    };
  }

  // <select id=...> ... </select>
  const reSelect = /<select\b([^<>]*)>([\s\S]*?)<\/select>/gi;
  while ((m = reSelect.exec(head)) !== null) {
    const attrs = parseAttrs(m[1]);
    if (!attrs.id) continue;
    const body = m[2];
    const opts = [];
    let selected = null;
    const reOpt = /<option\b([^<>]*)>/gi;
    let o;
    while ((o = reOpt.exec(body)) !== null) {
      const oa = parseAttrs(o[1]);
      const v = oa.value !== undefined ? oa.value : '';
      opts.push(v);
      if ('selected' in oa) selected = v;
    }
    out[attrs.id] = {
      tag: 'select',
      type: 'select-one',
      value: selected !== null ? selected : (opts.length ? opts[0] : ''),
      checked: false,
      options: opts
    };
  }

  // Alle uebrigen ids (Container fuer innerHTML/textContent)
  const reId = /\bid="([^"]+)"/g;
  while ((m = reId.exec(head)) !== null) {
    if (!out[m[1]]) out[m[1]] = { tag: 'div', type: '', value: '', checked: false };
  }
  return out;
}

function parseAttrs(s) {
  const a = {};
  const re = /([a-zA-Z0-9_:-]+)(?:\s*=\s*"([^"]*)")?/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (!m[1]) continue;
    a[m[1].toLowerCase()] = m[2] !== undefined ? m[2] : true;
  }
  return a;
}

/* ---------- Element-Stub ---------- */

class ClassList {
  constructor() { this._s = new Set(); }
  add(...c) { c.forEach(x => this._s.add(x)); }
  remove(...c) { c.forEach(x => this._s.delete(x)); }
  toggle(c, on) { if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else { on ? this._s.add(c) : this._s.delete(c); } }
  contains(c) { return this._s.has(c); }
}

class El {
  constructor(id, spec) {
    this.id = id;
    this.tagName = (spec && spec.tag ? spec.tag : 'div').toUpperCase();
    this.type = spec ? spec.type : '';
    this._value = spec ? spec.value : '';
    this.checked = spec ? !!spec.checked : false;
    this.min = spec && spec.min !== undefined ? spec.min : '';
    this.max = spec && spec.max !== undefined ? spec.max : '';
    this.step = spec && spec.step !== undefined ? spec.step : '';
    this.style = {};
    this.dataset = {};
    this.classList = new ClassList();
    this.children = [];
    this.hidden = false;
    this.disabled = false;
    this._html = '';
    this._text = '';
    this._listeners = {};
  }
  get value() { return this._value; }
  set value(v) { this._value = String(v); }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); this._text = stripTags(this._html); }
  get textContent() { return this._html ? stripTags(this._html) : this._text; }
  set textContent(v) { this._text = String(v); this._html = ''; }
  setAttribute(k, v) { if (k === 'data-theme') this._theme = v; this['attr_' + k] = v; }
  getAttribute(k) { return this['attr_' + k]; }
  addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); }
  removeEventListener() {}
  dispatchEvent(ev) {
    const ls = this._listeners[ev.type] || [];
    ev.target = this;
    ls.forEach(fn => fn(ev));
    if (ev.bubbles && this._doc) this._doc._bubble(ev);
    return true;
  }
  appendChild(n) { this.children.push(n); return n; }
  remove() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  scrollIntoView() {}
  getContext() { return null; }
}

function stripTags(h) {
  // Tags werden durch ein LEERZEICHEN ersetzt, nicht geloescht: sonst kleben
  // benachbarte Zellen aneinander ("<td>2026</td><td>12,0" → "202612,0") und
  // erzeugen Phantom-Zahlen. Das betrifft nur die Auswertung, nie das Orakel.
  return String(h)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/* ---------- Document-Stub ---------- */

function buildDom(htmlPath, search) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const specs = parseControls(html);
  const els = {};
  Object.keys(specs).forEach(id => { els[id] = new El(id, specs[id]); });

  const docListeners = {};
  const documentElement = new El('__root', { tag: 'html' });
  const body = new El('__body', { tag: 'body' });

  const document = {
    _bubble(ev) { (docListeners[ev.type] || []).forEach(fn => fn(ev)); },
    getElementById(id) { return els[id] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) { return new El('', { tag }); },
    createTextNode() { return new El('', { tag: 'text' }); },
    addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
    documentElement,
    body
  };
  Object.keys(els).forEach(id => { els[id]._doc = document; });

  class Event {
    constructor(type, opts) { this.type = type; this.bubbles = !!(opts && opts.bubbles); this.target = null; }
  }

  // Chart-Stub: sammelt die Daten-Serien je Canvas-Id.
  const chartStore = {};
  class Chart {
    constructor(canvas, config) {
      this.canvas = canvas;
      this.id = canvas && canvas.id ? canvas.id : '?';
      this.config = config;
      this.data = config.data;
      this.options = config.options || {};
      chartStore[this.id] = this;
    }
    destroy() { delete chartStore[this.id]; }
    update() {}
    getDatasetMeta() { return { data: [] }; }
    static getChart(id) { return chartStore[id] || null; }
    static register() {}
  }

  const storage = {};
  const localStorage = {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; }
  };

  const window = {
    location: { href: 'https://www.herowerk.de/wp-rechner.html' + (search || ''), search: search || '', pathname: '/wp-rechner.html', hash: '' },
    Chart,
    matchMedia: () => ({ matches: false }),
    localStorage
  };

  return { document, window, Event, Chart, localStorage, chartStore, els, URL: globalThis.URL, URLSearchParams: globalThis.URLSearchParams };
}

module.exports = { buildDom, parseControls, stripTags };
