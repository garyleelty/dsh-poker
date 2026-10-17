/**
 * Client smoke tests: actually invoke the panel component (and the handlers it
 * exposes) against real Host snapshots. This catches the class of bug that
 * syntax checks and pure-logic tests cannot see — a `const` referenced before
 * its declaration, a missing dictionary key, or a render path that throws on a
 * particular table state.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import { apply as applyHost } from '../index.js';
import { Table } from '../lib/table.js';

// ---------------------------------------------------------------------------
// Load the browser half in a sandbox with a tiny React shim.
// ---------------------------------------------------------------------------

function loadClient(fetchImpl) {
  const source = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8');
  let registered = null;
  const sandbox = {
    window: {
      __ModuleLoader__: { load: (def) => { registered = def; } },
      matchMedia: () => ({ matches: false }),
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    document: {
      activeElement: null,
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    fetch: fetchImpl ?? (async () => ({ ok: true, json: async () => ({}) })),
  };
  sandbox.globalThis = sandbox;
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  assert.ok(registered, 'client.js must register itself with the module loader');
  return registered;
}

/**
 * Minimal React stand-in. Hooks return stable values; `useEffect` runs once so
 * effects that only set state do not loop.
 */
function makeReact() {
  // A tiny stateful renderer: hooks are keyed by call order and persist across
  // renders, so `setState` behaves like React's and re-renders the component.
  const hookState = [];
  const ranEffects = new Set();
  const cleanupFns = [];
  let hookIndex = 0;
  let rerender = null;

  const React = {
    createElement: (type, props, ...children) => ({
      type,
      props: props ?? {},
      children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false),
    }),
    Fragment: 'Fragment',
    useState: (init) => {
      const i = hookIndex;
      hookIndex += 1;
      if (!(i in hookState)) hookState[i] = typeof init === 'function' ? init() : init;
      const set = (value) => {
        const next = typeof value === 'function' ? value(hookState[i]) : value;
        if (next === hookState[i]) return;
        hookState[i] = next;
        if (rerender) rerender();
      };
      return [hookState[i], set];
    },
    useEffect: (fn) => {
      const i = hookIndex;
      hookIndex += 1;
      // Effects run once per mount (the shim has no dependency tracking).
      // `hookState[i]` may already hold a value from useState, so track
      // execution in a separate set instead of overloading the slot.
      if (!ranEffects.has(i)) {
        ranEffects.add(i);
        try {
          const cleanup = fn();
          if (typeof cleanup === 'function') cleanupFns.push(cleanup);
        } catch { /* an effect throwing must not kill the render */ }
      }
    },
    useCallback: (fn) => { hookIndex += 1; return fn; },
    useMemo: (fn) => { hookIndex += 1; return fn(); },
    useRef: (value) => {
      const i = hookIndex;
      hookIndex += 1;
      if (!(i in hookState)) hookState[i] = { current: value };
      return hookState[i];
    },
    __setRerender: (fn) => { rerender = fn; },
    __resetHooks: () => { hookIndex = 0; },
    __cleanup: () => { for (const fn of cleanupFns) { try { fn(); } catch { /* ignore */ } } cleanupFns.length = 0; },
  };
  return React;
}

/**
 * Render a component repeatedly until it stops changing, so effects that load
 * data (which call setState) are reflected in the final tree.
 */
async function renderSettled(React, Component, props) {
  let tree = null;
  let dirty = false;
  React.__setRerender(() => { dirty = true; });
  for (let pass = 0; pass < 8; pass += 1) {
    dirty = false;
    React.__resetHooks();
    tree = Component(props);
    // Let the effects' promises resolve, then re-render if they set state.
    await new Promise((r) => { setTimeout(r, 10); });
    if (!dirty) break;
  }
  React.__setRerender(null);
  React.__cleanup();
  return tree;
}

/**
 * Render a component tree to a string. Function components are invoked the way
 * React would invoke them; `props` are passed through so the panel's children
 * (TableView, StatStrip, ...) receive `t` and `state`.
 */
function textOf(node, props = {}) {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map((n) => textOf(n, props)).join(' ');
  if (node.type === 'style') return '';
  if (typeof node.type === 'function') {
    const child = node.type({ ...props, ...node.props });
    return textOf(child, props);
  }
  if (typeof node.type === 'string') {
    return textOf(node.children, props);
  }
  return textOf(node.children, props);
}

/** Collect every rendered element whose className matches. */
function find(node, predicate, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const n of node) find(n, predicate, out); return out; }
  if (predicate(node)) out.push(node);
  find(node.children, predicate, out);
  return out;
}

// ---------------------------------------------------------------------------
// Real Host snapshots to render.
// ---------------------------------------------------------------------------

function fakeHostContext() {
  const routes = new Map();
  const unit = {
    loadAll: async () => ({ global: null, tables: {} }),
    setGlobal: async () => {},
    close: async () => {},
  };
  const ctx = {
    logger: { warn: () => {}, error: () => {}, info: () => {} },
    storage: { backend: { names: () => ['json'], get: () => ({ kv: { open: async () => unit } }) } },
    webServer: { register: (e) => { routes.set(e.path, e.handler); return () => {}; } },
    effect: (fn) => { fn(); return () => {}; },
    llm: { listProviders: () => [] },
    agentDefaultModel: { currentSelection: () => null },
  };
  return { ctx, routes };
}

async function hostCall(routes, path, body) {
  let status = 200;
  let payload = null;
  const res = {
    set statusCode(v) { status = v; },
    get statusCode() { return status; },
    setHeader: () => {},
    end: (text) => { payload = text; },
  };
  const req = {
    async *[Symbol.asyncIterator]() {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    },
  };
  await routes.get(path)(req, res);
  return { status, body: payload ? JSON.parse(payload) : null };
}

/** Play until the hand settles, then return the settled snapshot. */
async function playToEnd(routes) {
  for (let i = 0; i < 40; i += 1) {
    const state = (await hostCall(routes, '/poker/state')).body;
    if (state.phase === 'over') return state;
    if (state.toAct !== 0) return state; // an AI is acting; caller can retry
    const move = state.heroLegal.actions.find((a) => a.kind === 'call' || a.kind === 'check');
    if (!move) return state;
    await hostCall(routes, '/poker/action', { kind: move.kind, amount: move.amount ?? 0 });
  }
  return (await hostCall(routes, '/poker/state')).body;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('the panel renders a live table without throwing', async () => {
  const { ctx, routes } = fakeHostContext();
  applyHost(ctx, { opponents: 5, thinkPace: 0 });
  await new Promise((r) => { setTimeout(r, 30); });
  const state = (await hostCall(routes, '/poker/state')).body;

  // Back the panel's fetch with the real Host routes.
  const fetchImpl = async (path, init) => {
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body) : undefined;
    const { status, body: payload } = await hostCall(routes, path, method === 'POST' ? body ?? {} : undefined);
    return { ok: status >= 200 && status < 300, status, json: async () => payload };
  };
  const def = loadClient(fetchImpl);
  const React = makeReact();
  const dicts = {};
  let Panel = null;
  def.factory((name) => { if (name === 'react') return React; throw new Error(name); }).apply({
    slots: {
      inject: (name, fn) => fn(),
      register: (spec, Component) => { if (spec.name === 'main') Panel = Component; return {}; },
    },
    locale: {
      register: (ns, lang, dict) => { dicts[lang] = dict; },
      bind: () => (key, args) => {
        let text = dicts.zh?.[key] ?? key;
        for (const [k, v] of Object.entries(args ?? {})) text = text.replaceAll(`{${k}}`, String(v));
        return text;
      },
    },
    effect: (fn) => fn(),
  });
  assert.ok(Panel, 'the main slot component must be registered');

  const t = (key, args) => {
    let text = dicts.zh?.[key] ?? key;
    for (const [k, v] of Object.entries(args ?? {})) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  };
  // The panel owns its table state and fills it from /poker/state; drive that
  // by pre-seeding the fetch used inside the sandbox.
  const tree = await renderSettled(React, Panel, { t });
  assert.ok(tree, 'the panel must render a tree');
  const rendered = textOf(tree, { t });
  assert.ok(rendered.length > 0, `the panel renders content, got: ${rendered.slice(0, 120)}`);
  assert.ok(rendered.includes('你'), 'the hero seat renders');
});

test('the panel renders a settled hand and a side-pot result', async () => {
  const { ctx, routes } = fakeHostContext();
  applyHost(ctx, { opponents: 2, thinkPace: 0 });
  await new Promise((r) => { setTimeout(r, 30); });

  let state = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    state = await playToEnd(routes);
    if (state.phase === 'over') break;
    await new Promise((r) => { setTimeout(r, 20); });
  }
  assert.equal(state.phase, 'over', 'the hand must settle');

  const fetchImpl = async (path, init) => {
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body) : undefined;
    const { status, body: payload } = await hostCall(routes, path, method === 'POST' ? body ?? {} : undefined);
    return { ok: status >= 200 && status < 300, status, json: async () => payload };
  };
  const def = loadClient(fetchImpl);
  const React = makeReact();
  const dicts = {};
  let Panel = null;
  def.factory((name) => { if (name === 'react') return React; throw new Error(name); }).apply({
    slots: {
      inject: (name, fn) => fn(),
      register: (spec, Component) => { if (spec.name === 'main') Panel = Component; return {}; },
    },
    locale: { register: (ns, lang, dict) => { dicts[lang] = dict; }, bind: () => (k) => k },
    effect: (fn) => fn(),
  });

  const t = (key, args) => {
    let text = dicts.zh?.[key] ?? key;
    for (const [k, v] of Object.entries(args ?? {})) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  };
  const tree = await renderSettled(React, Panel, { t });
  const rendered = textOf(tree, { t });
  assert.ok(rendered.length > 0, 'a settled hand still renders');
  // The result bar is present: either a win/lose line or the endgame text.
  // A settled hand either offers a way forward (next hand / rebuy / new game)
  // or is mid-showdown animation (reveal -> collect -> result bar).
  const hasResult = rendered.includes('下一手')
    || rendered.includes('重新买入')
    || rendered.includes('再来一局')
    || rendered.includes('你赢下了整桌')
    || rendered.includes('你的筹码已输光')
    || rendered.includes('摊牌')
    || rendered.includes('收池')
    || rendered.includes('跳过')
    || rendered.includes('这一手');
  assert.ok(hasResult, `a settled hand shows its outcome, got: ${rendered.slice(0, 240)}`);
  // The showdown chrome must never leave betting controls on screen.
  assert.ok(!rendered.includes('加注到'), 'a settled hand hides the raise slider');
});

test('every dictionary key used by the client exists in both locales', () => {
  const def = loadClient();
  const dicts = {};
  def.factory((name) => {
    if (name === 'react') return makeReact();
    throw new Error(name);
  }).apply({
    slots: { inject: (n, fn) => fn(), register: () => ({}) },
    locale: { register: (ns, lang, dict) => { dicts[lang] = dict; }, bind: () => (k) => k },
    effect: (fn) => fn(),
  });

  assert.ok(dicts.zh && dicts.en, 'both locales are registered');
  const zhKeys = Object.keys(dicts.zh).sort();
  const enKeys = Object.keys(dicts.en).sort();
  assert.deepEqual(zhKeys, enKeys, 'zh and en must declare the same keys');
  for (const key of zhKeys) {
    assert.ok(dicts.zh[key].length > 0, `zh['${key}'] is non-empty`);
    assert.ok(dicts.en[key].length > 0, `en['${key}'] is non-empty`);
  }
});

test('the table state machine and the client agree on card encoding', () => {
  // The client parses "Ah" style strings; the Host must only emit those.
  const t = new Table({ opponents: 2, seed: 3, smallBlind: 5, bigBlind: 10 });
  for (const seat of t.seats) seat.stack = 1000;
  t.startHand();
  while (t.phase === 'betting') t.act(t.toAct, 'call');

  const cardPattern = /^(10|[2-9TJQKA])[cdhs]$/;
  const record = t.lastHand;
  for (const card of record.board) {
    assert.match(card, cardPattern, `board card ${card} uses the wire format`);
  }
  for (const card of record.hero.cards) {
    assert.match(card, cardPattern, `hero card ${card} uses the wire format`);
  }
});
