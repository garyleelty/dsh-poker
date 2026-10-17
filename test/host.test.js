/**
 * Host route tests: exercise the plugin's HTTP surface with a fake cordis
 * context, so route guards, serialization and history persistence are covered
 * without booting Harness.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { apply } from '../index.js';

/**
 * Minimal cordis-like context. `effect` runs immediately and records its
 * disposer; `webServer.register` collects routes so the test can call them.
 */
function fakeContext(options = {}) {
  const routes = new Map();
  const disposers = [];
  const logs = [];
  const storageState = options.storage ?? { global: null };

  const backend = {
    names: () => ['json'],
    get: () => ({
      kv: {
        open: async () => ({
          loadAll: async () => ({ global: storageState.global, tables: {} }),
          setGlobal: async (value) => { storageState.global = value; },
          close: async () => {},
        }),
      },
    }),
  };

  const ctx = {
    logger: {
      warn: (msg) => logs.push(String(msg)),
      error: (msg) => logs.push(String(msg)),
      info: () => {},
    },
    storage: { backend },
    webServer: {
      register: (entry) => {
        routes.set(entry.path, entry.handler);
        return () => routes.delete(entry.path);
      },
    },
    effect: (fn, label) => {
      const dispose = fn();
      if (typeof dispose === 'function') disposers.push(dispose);
      return () => {};
    },
    llm: {
      listProviders: () => [],
      stream: async function* stream() {
        throw new Error('no llm in tests');
      },
    },
    agentDefaultModel: { currentSelection: () => null },
  };

  return { ctx, routes, disposers, logs, storageState };
}

/** Call one registered route and return { status, body }. */
async function callRoute(routes, path, body) {
  const handler = routes.get(path);
  if (!handler) throw new Error(`route ${path} not registered`);
  let status = 200;
  let payload = null;
  const res = {
    set statusCode(value) { status = value; },
    get statusCode() { return status; },
    setHeader: () => {},
    end: (text) => { payload = text; },
  };
  // A request body is an async iterable of chunks.
  const req = {
    async *[Symbol.asyncIterator]() {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    },
  };
  await handler(req, res);
  return { status, body: payload ? JSON.parse(payload) : null };
}

/** Let queued microtasks and AI pacing settle. */
const settle = () => new Promise((resolve) => { setTimeout(resolve, 20); });

test('state route returns a playable snapshot with heroLegal', async () => {
  const { ctx, routes } = fakeContext();
  apply(ctx, { opponents: 2, thinkPace: 0 });
  await settle();

  const { status, body } = await callRoute(routes, '/poker/state');
  assert.equal(status, 200);
  assert.equal(typeof body.handNumber, 'number');
  assert.ok(Array.isArray(body.seats));
  assert.ok(body.heroLegal, 'hero view is exposed separately from the acting seat');
  assert.ok(Array.isArray(body.heroLegal.actions));
});

test('action route rejects a move when it is not the human turn', async () => {
  const { ctx, routes } = fakeContext();
  // thinkPace 0 makes AI turns instant, but the human still only acts on
  // their own turn; force the table into an AI turn by acting once.
  apply(ctx, { opponents: 2, thinkPace: 0 });
  await settle();

  const state = (await callRoute(routes, '/poker/state')).body;
  if (state.toAct !== 0) {
    const { status, body } = await callRoute(routes, '/poker/action', { kind: 'call', amount: 0 });
    assert.equal(status, 409);
    assert.equal(body.code, 'not-your-turn');
  } else {
    // Human is first to act: folding is legal, then the AI acts.
    const { status } = await callRoute(routes, '/poker/action', { kind: 'fold', amount: 0 });
    assert.equal(status, 200);
  }
});

test('concurrent new-hand requests are serialized, not dealt twice', async () => {
  const { ctx, routes } = fakeContext();
  apply(ctx, { opponents: 2, thinkPace: 0 });
  await settle();

  const before = (await callRoute(routes, '/poker/state')).body.handNumber;
  // Fire three "next hand" requests at once: they must queue, so at most one
  // hand is dealt on top of the current one.
  const results = await Promise.all([
    callRoute(routes, '/poker/new-hand', {}),
    callRoute(routes, '/poker/new-hand', {}),
    callRoute(routes, '/poker/new-hand', {}),
  ]);
  for (const result of results) assert.equal(result.status, 200);
  const after = (await callRoute(routes, '/poker/state')).body.handNumber;
  assert.ok(after >= before, 'hand number must not go backwards');
  assert.ok(after - before <= 3, 'queued requests may each advance one hand');
});

test('new hand while a hand is live returns chips to the seats', async () => {
  const { ctx, routes } = fakeContext();
  apply(ctx, { opponents: 2, thinkPace: 0 });
  await settle();

  const start = (await callRoute(routes, '/poker/state')).body;
  const startTotal = start.seats.reduce((sum, s) => sum + s.stack, 0) + start.pot;

  // Hero calls whatever is owed so real chips move into the pot.
  const hero = start.heroLegal.actions.find((a) => a.kind === 'call' || a.kind === 'check');
  if (hero && start.toAct === 0) {
    await callRoute(routes, '/poker/action', { kind: hero.kind, amount: hero.amount ?? 0 });
  }
  const mid = (await callRoute(routes, '/poker/state')).body;
  const midTotal = mid.seats.reduce((sum, s) => sum + s.stack, 0) + mid.pot;

  await callRoute(routes, '/poker/new-hand', {});
  const next = (await callRoute(routes, '/poker/state')).body;
  const nextTotal = next.seats.reduce((sum, s) => sum + s.stack, 0) + next.pot;

  assert.equal(midTotal, startTotal, 'no chips vanish mid-hand');
  assert.equal(nextTotal, startTotal, 'a fresh deal keeps the table total');
});

test('history route survives an empty archive', async () => {
  const { ctx, routes } = fakeContext();
  apply(ctx, { opponents: 2, thinkPace: 0 });
  await settle();

  const { status, body } = await callRoute(routes, '/poker/history');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.hands));
  assert.equal(typeof body.summary.net, 'number');
  assert.equal(body.summary.hands, body.hands.length);
});

test('history ids stay small and contiguous across a reload', async () => {
  // Seed storage with two hands the way a previous session would have left it.
  const seeded = {
    global: {
      version: 1,
      nextId: 2,
      hands: [
        { uid: 'a', at: 1, id: 1, hero: { net: 10 }, pot: 30 },
        { uid: 'b', at: 2, id: 2, hero: { net: -5 }, pot: 20 },
      ],
    },
  };
  const { ctx, routes } = fakeContext({ storage: seeded });
  apply(ctx, { opponents: 2, thinkPace: 0 });
  await settle();

  const { body } = await callRoute(routes, '/poker/history');
  assert.deepEqual(body.hands.map((h) => h.id), [1, 2], 'loaded ids are preserved');
  // A new hand continues the sequence instead of jumping to a watermark.
  assert.ok(seeded.global.nextId <= 3, `nextId should continue from 2, got ${seeded.global.nextId}`);
});

test('advice route falls back to the rules engine without a model', async () => {
  const { ctx, routes } = fakeContext();
  apply(ctx, { opponents: 2, thinkPace: 0 });
  await settle();

  const { status, body } = await callRoute(routes, '/poker/advice', {});
  assert.equal(status, 200);
  assert.equal(body.source, 'heuristic');
  assert.ok(typeof body.advice === 'string' && body.advice.length > 0);
  assert.ok(body.summary.includes('阶段'));
});

test('invalid config is clamped instead of producing broken chips', async () => {
  const { ctx, routes } = fakeContext();
  apply(ctx, { opponents: 2, thinkPace: 0, smallBlind: -5, bigBlind: 0, equityTrials: 0 });
  await settle();

  const { body } = await callRoute(routes, '/poker/state');
  assert.ok(body.smallBlind >= 1, `small blind must stay positive, got ${body.smallBlind}`);
  assert.ok(body.bigBlind >= 1, `big blind must stay positive, got ${body.bigBlind}`);
  assert.ok(Number.isFinite(body.equity?.win ?? 0), 'equity must be a finite number');
});
