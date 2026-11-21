// Node-Testdouble für Ereignisse und Attribute, keine Browser-/Layout-Emulation.
import { parse, parseFragment } from 'parse5';
import vm from 'node:vm';
export class TestElement {
  constructor(tag = 'div', attrs = {}, children = []) {
    this.tagName = tag;
    this.attrs = { ...attrs };
    this.children = children;
    this.events = new Map();
    this.dataset = {};
    this.style = {
      setProperty: (key, value) => {
        this.styles[key] = value;
      },
    };
    this.styles = {};
    this.hidden = 'hidden' in attrs;
    this.height = 0;
    this.clientHeight = 1000;
    this.scrollHeight = 1000;
    for (const [name, value] of Object.entries(attrs))
      if (name.startsWith('data-'))
        this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    for (const child of children) child.parentElement = this;
    this.classList = {
      contains: (name) => (this.attrs.class || '').split(/\s+/).includes(name),
      add: (...names) => {
        this.attrs.class = [
          ...new Set([...(this.attrs.class || '').split(/\s+/).filter(Boolean), ...names]),
        ].join(' ');
      },
      remove: (...names) => {
        this.attrs.class = (this.attrs.class || '')
          .split(/\s+/)
          .filter((name) => !names.includes(name))
          .join(' ');
      },
      toggle: (name, force) => {
        const on = force ?? !this.classList.contains(name);
        this.classList[on ? 'add' : 'remove'](name);
        return on;
      },
    };
  }
  setAttribute(name, value) {
    this.attrs[name] = String(value);
    if (name === 'data-theme') this.dataset.theme = value;
  }
  getAttribute(name) {
    return this.attrs[name] ?? null;
  }
  hasAttribute(name) {
    return name in this.attrs;
  }
  removeAttribute(name) {
    delete this.attrs[name];
  }
  matches(selector) {
    return selector.split(',').some((part) => {
      part = part.trim();
      if (part.includes(':not')) {
        const excluded = part.match(/:not\((.*)\)/)[1];
        return this.matches(part.split(':not')[0]) && !this.matches(excluded);
      }
      const attr = part.match(/\[([\w-]+)(?:="([^"]*)")?\]/);
      if (
        attr &&
        (!this.hasAttribute(attr[1]) ||
          (attr[2] !== undefined && this.getAttribute(attr[1]) !== attr[2]))
      )
        return false;
      part = part.replace(/\[[^\]]+\]/g, '');
      if (part.startsWith('.')) return this.classList.contains(part.slice(1));
      if (part.startsWith('#')) return this.getAttribute('id') === part.slice(1);
      return !part || this.tagName === part;
    });
  }
  closest(selector) {
    for (let el = this; el; el = el.parentElement) if (el.matches(selector)) return el;
    return null;
  }
  querySelectorAll(selector) {
    return this.children.flatMap((child) =>
      child instanceof TestElement
        ? [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]
        : []
    );
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  get firstChild() {
    return this.children[0];
  }
  get textContent() {
    return this.children.map((child) => child.textContent).join('');
  }
  set textContent(value) {
    this.children = [{ textContent: value }];
  }
  get innerHTML() {
    return this.markup ?? '';
  }
  set innerHTML(value) {
    this.markup = value;
    this.children = fromNodes(parseFragment(value).childNodes);
    for (const child of this.children) child.parentElement = this;
  }
  addEventListener(type, handler) {
    const all = this.events.get(type) || [];
    all.push(handler);
    this.events.set(type, all);
  }
  removeEventListener(type, handler) {
    this.events.set(
      type,
      (this.events.get(type) || []).filter((h) => h !== handler)
    );
  }
  emit(type, data = {}) {
    const event = {
      target: this,
      preventDefault() {
        this.prevented = true;
      },
      stopPropagation() {
        this.stopped = true;
      },
      stopImmediatePropagation() {
        this.stopped = true;
      },
      ...data,
    };
    for (const handler of this.events.get(type) || []) {
      handler(event);
      if (event.stopped) break;
    }
    return event;
  }
  focus() {
    this.owner.activeElement = this;
  }
  getBoundingClientRect() {
    return { height: this.height };
  }
  insertBefore(child, before) {
    child.parentElement = this;
    this.children.splice(this.children.indexOf(before), 0, child);
  }
  remove() {
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
  }
}
function fromNodes(nodes) {
  return nodes.map((node) =>
    node.tagName
      ? new TestElement(
          node.tagName,
          Object.fromEntries(node.attrs.map((a) => [a.name, a.value])),
          fromNodes(node.childNodes || [])
        )
      : { textContent: node.value || '' }
  );
}
export function harness(html, { reduced = false, motion = null, storageError = false } = {}) {
  const document = new TestElement('document', {}, fromNodes(parse(html).childNodes));
  document.documentElement = document.querySelector('html');
  document.body = document.querySelector('body');
  document.getElementById = (id) => document.querySelector('#' + id);
  document.createElement = (tag) => {
    const el = new TestElement(tag);
    el.contentWindow = {
      sent: [],
      postMessage(...args) {
        this.sent.push(args);
      },
    };
    return el;
  };
  document.forms = [];
  document.fonts = { ready: Promise.resolve() };
  for (const el of document.querySelectorAll('html, body, div, a, button, nav, span, p, input'))
    el.owner = document;
  const bar = document.querySelector('.mobile-bottom-bar');
  if (bar) bar.height = 93.78;
  const values = new Map(motion === null ? [] : [['hero-motion', motion]]),
    writes = [],
    timers = new Map(),
    channels = [],
    intersections = [],
    mutations = [];
  const win = new TestElement('window');
  const context = vm.createContext({
    document,
    Element: TestElement,
    localStorage: {
      getItem(key) {
        if (storageError) throw Error('Speicher gesperrt');
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        if (storageError) throw Error('Speicher gesperrt');
        values.set(key, value);
        writes.push([key, value]);
      },
    },
    URLSearchParams,
    CSS: { escape: (s) => s },
    console,
    matchMedia: () => ({ matches: reduced }),
    location: { search: '' },
    scrollY: 0,
    addEventListener: (...args) => win.addEventListener(...args),
    removeEventListener: (...args) => win.removeEventListener(...args),
    setTimeout(fn, delay) {
      const id = {};
      timers.set(id, { fn, delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    crypto: {
      getRandomValues: (array) => {
        array.fill(channels.length + 1);
        return array;
      },
    },
    ResizeObserver: class {
      observe() {}
    },
    IntersectionObserver: class {
      constructor(fn) {
        this.fn = fn;
        intersections.push(this);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      trigger(stage) {
        this.fn([{ target: stage, isIntersecting: true }]);
      }
    },
    MutationObserver: class {
      constructor(fn) {
        this.fn = fn;
        mutations.push(this);
      }
      observe() {}
    },
    MessageChannel: class {
      constructor() {
        this.port1 = {
          close() {
            this.closed = true;
          },
          postMessage() {},
        };
        this.port2 = {};
        channels.push(this);
      }
    },
  });
  context.window = context;
  context.parent = { name: 'parent' };
  return {
    document,
    context,
    win,
    writes,
    values,
    channels,
    timers,
    intersections,
    mutations,
    run: (source) => vm.runInContext(source, context, { timeout: 1000 }),
    ready: () => document.emit('DOMContentLoaded'),
  };
}
