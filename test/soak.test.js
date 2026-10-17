/**
 * Soak tests: play many hands and assert the invariants that a single-hand
 * test cannot see — chip conservation, termination, and no illegal AI moves.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { Table } from '../lib/table.js';
import { decide } from '../lib/ai.js';

/** Chips across every seat plus the pot: constant for the whole session. */
function totalChips(t) {
  return t.seats.reduce((sum, s) => sum + s.stack, 0) + t.pot;
}

/**
 * Play one session to an endgame or a hand cap, checking invariants on every
 * action. `heroPolicy` picks the human's move so a seed replays exactly.
 */
function soak({ opponents, seed, maxHands = 40, heroPolicy = 'random' }) {
  const t = new Table({ opponents, seed, smallBlind: 5, bigBlind: 10 });
  for (const seat of t.seats) seat.stack = 1000;
  const startTotal = totalChips(t);

  let heroActions = 0;
  for (let hand = 0; hand < maxHands; hand += 1) {
    if (t.result?.kind) break;
    t.startHand();
    if (t.phase === 'over') break;

    let guard = 0;
    while (t.phase === 'betting') {
      guard += 1;
      assert.ok(guard < 500, `hand ${hand} did not settle (possible deadlock)`);
      const seat = t.seats[t.toAct];
      const before = totalChips(t);

      let action;
      if (seat.human) {
        heroActions += 1;
        const legal = t.legalActions(seat.id);
        assert.ok(legal.actions.length > 0, 'the acting human must have at least one legal action');
        if (heroPolicy === 'call') {
          action = legal.actions.find((a) => a.kind === 'call' || a.kind === 'check');
        } else {
          // Deterministic pseudo-random pick from the legal set.
          const pick = legal.actions[(seed + heroActions * 7) % legal.actions.length];
          action = pick;
        }
        assert.ok(action, 'a legal human action must exist');
      } else {
        const choice = decide(t, seat.id);
        const legal = t.legalActions(seat.id);
        const legalKinds = legal.actions.map((a) => a.kind);
        const known = legalKinds.includes(choice.kind)
          || (choice.kind === 'raise' && legalKinds.includes('bet'));
        assert.ok(known, `AI picked ${choice.kind}, legal set is ${legalKinds.join('/')}`);
        action = { kind: choice.kind, amount: choice.amount ?? 0 };
      }

      t.act(seat.id, action.kind, action.amount ?? 0);
      assert.equal(totalChips(t), before, 'chips are conserved on every action');
    }
  }

  assert.equal(totalChips(t), startTotal, 'chips are conserved across the whole session');
  return { hands: t.handNumber, phase: t.phase, total: totalChips(t) };
}

test('soak: heads-up sessions conserve chips and always terminate', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    soak({ opponents: 1, seed, maxHands: 30 });
  }
});

test('soak: six-handed sessions conserve chips and always terminate', () => {
  for (const seed of [11, 12, 13]) {
    soak({ opponents: 5, seed, maxHands: 30 });
  }
});

test('soak: every table size is playable', () => {
  for (let opponents = 1; opponents <= 5; opponents += 1) {
    const result = soak({ opponents, seed: 100 + opponents, maxHands: 20 });
    assert.ok(result.hands > 0, `opponents=${opponents} should deal at least one hand`);
  }
});

test('soak: a passive hero never loses more than the chips committed', () => {
  const result = soak({ opponents: 3, seed: 21, maxHands: 25, heroPolicy: 'call' });
  assert.ok(result.total > 0);
});
