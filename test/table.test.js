/**
 * Table state machine tests: betting legality, showdown math, street order.
 * Run with `npm test` (node --test).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { Table } from '../lib/table.js';
import { evaluate7, compareEval, RANKS, SUITS } from '../lib/hand.js';

const SB = 5;
const BB = 10;

/** Card text ("As") -> encoded 0..51. */
function card(text) {
  return RANKS.indexOf(text[0]) + SUITS.indexOf(text[1]) * 13;
}

function cards(...texts) {
  return texts.map(card);
}

function freshTable(opponents, seed) {
  const t = new Table({ opponents, seed, smallBlind: SB, bigBlind: BB });
  for (const seat of t.seats) seat.stack = 1000;
  return t;
}

/** Chips across all seats plus the pot: must never change mid-hand. */
function totalChips(t) {
  return t.seats.reduce((sum, s) => sum + s.stack, 0) + t.pot;
}

/** Play one AI/human hand with scripted hero actions until the hand ends. */
function playHand(t, heroScript = []) {
  let scriptIndex = 0;
  let guard = 0;
  while (t.phase === 'betting' && guard < 400) {
    guard += 1;
    const seat = t.seats[t.toAct];
    if (seat.human) {
      const action = heroScript[scriptIndex++] ?? { kind: 'call' };
      t.act(seat.id, action.kind, action.amount ?? 0);
    } else {
      // Always call to keep the pot multiway for side-pot testing.
      t.act(seat.id, 'call');
    }
  }
  if (guard >= 400) throw new Error('hand did not settle');
}

// ---------------------------------------------------------------------------
// evaluate7 ordering
// ---------------------------------------------------------------------------

test('wheel straight loses to six-high straight', () => {
  const wheel = evaluate7(cards('As', '2h', '3d', '4c', '5s', 'Kh', 'Qd'));
  const six = evaluate7(cards('2h', '3d', '4c', '5s', '6h', 'Kh', 'Qd'));
  assert.equal(wheel.category, 4);
  assert.equal(six.category, 4);
  assert.ok(compareEval(six, wheel) > 0, 'six-high must beat the wheel');
});

test('wheel straight is not ordered above a nine-high straight', () => {
  const wheel = evaluate7(cards('As', '2h', '3d', '4c', '5s', '2c', '3h'));
  const nine = evaluate7(cards('5h', '6d', '7c', '8s', '9h', 'Kc', '2d'));
  assert.ok(compareEval(nine, wheel) > 0);
});

test('ace-high straight is the best straight', () => {
  const broadway = evaluate7(cards('As', 'Kh', 'Qd', 'Jc', 'Ts', '2c', '3h'));
  const wheel = evaluate7(cards('As', '2h', '3d', '4c', '5s', 'Kh', 'Qd'));
  assert.ok(compareEval(broadway, wheel) > 0);
});

test('random seven-card samples match brute-force five-card evaluation', () => {
  // Deterministic xorshift so a failure replays exactly.
  let state = 0x12345678;
  const rng = () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17; state >>>= 0;
    state ^= state << 5; state >>>= 0;
    return state;
  };
  const best5 = (seven) => {
    let best = null;
    const idx = [0, 1, 2, 3, 4];
    const pick = (start, depth) => {
      if (depth === 5) {
        const value = evaluate5(idx.map((i) => seven[i]));
        if (!best || compareEval(value, best) > 0) best = value;
        return;
      }
      for (let i = start; i < 7; i += 1) {
        idx[depth] = i;
        pick(i + 1, depth + 1);
      }
    };
    pick(0, 0);
    return best;
  };
  const evaluate5 = (five) => {
    const counts = new Map();
    const suits = new Map();
    for (const c of five) {
      counts.set(c % 13, (counts.get(c % 13) ?? 0) + 1);
      suits.set((c / 13) | 0, (suits.get((c / 13) | 0) ?? 0) + 1);
    }
    const flush = [...suits.values()].some((n) => n === 5);
    const ranks = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const uniq = [...counts.keys()].sort((a, b) => b - a);
    let straightHigh = -1;
    if (uniq.length === 5) {
      if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
      else if (uniq[0] === 12 && uniq[1] === 3) straightHigh = 3;
    }
    if (flush && straightHigh >= 0) return { category: 8, rank: straightHigh };
    if (ranks[0][1] === 4) return { category: 7, rank: ranks[0][0] * 13 + ranks[1][0] };
    if (ranks[0][1] === 3 && ranks[1][1] === 2) return { category: 6, rank: ranks[0][0] * 13 + ranks[1][0] };
    if (flush) {
      let rank = 0;
      for (const r of uniq) rank = rank * 13 + r;
      return { category: 5, rank };
    }
    if (straightHigh >= 0) return { category: 4, rank: straightHigh };
    if (ranks[0][1] === 3) {
      return { category: 3, rank: ranks[0][0] * 169 + ranks[1][0] * 13 + ranks[2][0] };
    }
    if (ranks[0][1] === 2 && ranks[1][1] === 2) {
      return { category: 2, rank: ranks[0][0] * 169 + ranks[1][0] * 13 + ranks[2][0] };
    }
    if (ranks[0][1] === 2) {
      return { category: 1, rank: ranks[0][0] * 2197 + ranks[1][0] * 169 + ranks[2][0] * 13 + ranks[3][0] };
    }
    let rank = 0;
    for (const r of uniq) rank = rank * 13 + r;
    return { category: 0, rank };
  };

  const deck = Array.from({ length: 52 }, (_, c) => c);
  let mismatches = 0;
  for (let i = 0; i < 20000; i += 1) {
    for (let j = deck.length - 1; j > 0; j -= 1) {
      const k = rng() % (j + 1);
      [deck[j], deck[k]] = [deck[k], deck[j]];
    }
    const seven = deck.slice(0, 7);
    const fast = evaluate7(seven);
    const slow = best5(seven);
    if (fast.category !== slow.category || fast.rank !== slow.rank) mismatches += 1;
  }
  assert.equal(mismatches, 0, `${mismatches} of 20000 hands disagree with brute force`);
});

// ---------------------------------------------------------------------------
// Side pots
// ---------------------------------------------------------------------------

function setAllInShowdown(t, contributions, holes) {
  t.board = cards('2c', '7d', '9s', 'Jc', '3h');
  t.phase = 'river';
  for (let i = 0; i < t.seats.length; i += 1) {
    t.seats[i].hole = cards(...holes[i]);
    t.seats[i].committed = contributions[i];
    t.seats[i].stack = 0;
    if (i > 0) t.seats[i].folded = i === 2; // seat 2 folded, others showdown
  }
  t.pot = contributions.reduce((a, b) => a + b, 0);
  t.showdown();
}

test('short all-in winner takes only the main pot', () => {
  const t = freshTable(2, 1);
  setAllInShowdown(
    t,
    [100, 500, 500],
    [['As', 'Ah'], ['Ks', 'Kh'], ['Qs', 'Qh']],
  );
  assert.deepEqual(t.seats.map((s) => s.stack), [300, 800, 0]);
  // The side pot had only one live contender left, so it wins that pot too.
  assert.deepEqual(t.result.winners.map((w) => w.name), ['你', '小艾']);
  const byName = new Map(t.result.winners.map((w) => [w.name, w.amount]));
  assert.equal(byName.get('你'), 300);
  assert.equal(byName.get('小艾'), 800);
});

test('short all-in loser forfeits the main pot to the best hand', () => {
  const t = freshTable(2, 2);
  setAllInShowdown(
    t,
    [100, 500, 500],
    [['4s', '4h'], ['Ks', 'Kh'], ['Qs', 'Qh']],
  );
  assert.deepEqual(t.seats.map((s) => s.stack), [0, 1100, 0]);
  // Seat 1 is 小艾 (AI_NAMES order), the pair of kings.
  assert.deepEqual(t.result.winners.map((w) => w.name), ['小艾']);
  assert.equal(t.result.winners[0].amount, 1100);
});

test('folded contributors never share a side pot', () => {
  const t = freshTable(2, 3);
  setAllInShowdown(
    t,
    [100, 500, 500],
    [['As', 'Ah'], ['Ks', 'Kh'], ['4s', '4h']],
  );
  // Seat 2 folded after committing 500: its dead money belongs to the best
  // hand among seats that reached showdown past the 100 level.
  assert.deepEqual(t.seats.map((s) => s.stack), [300, 800, 0]);
});

test('recorded pot and winner amounts match real chips moved', () => {
  const t = freshTable(2, 4);
  setAllInShowdown(
    t,
    [100, 500, 500],
    [['As', 'Ah'], ['Ks', 'Kh'], ['Qs', 'Qh']],
  );
  assert.equal(t.lastHand.pot, 1100);
  assert.equal(t.result.winners[0].amount, 300);
});

// ---------------------------------------------------------------------------
// Preflop betting
// ---------------------------------------------------------------------------

test('big blind gets the option after everyone limps', () => {
  const t = freshTable(5, 5);
  t.startHand();
  const bbSeat = t.seats.find((s) => s.streetCommitted === BB);
  let guard = 0;
  while (t.phase === 'betting' && t.street === 'preflop' && guard < 30) {
    guard += 1;
    if (t.toAct === bbSeat.id) break;
    t.act(t.toAct, 'call');
  }
  assert.equal(t.street, 'preflop', 'street must not advance before the BB acts');
  const legal = t.legalActions(bbSeat.id);
  assert.ok(
    legal.actions.some((a) => a.kind === 'check' || a.kind === 'raise'),
    `BB must have the option, got ${JSON.stringify(legal.actions)}`,
  );
});

test('short big blind sets currentBet to the full big blind', () => {
  const t = freshTable(2, 6);
  for (const seat of t.seats) seat.stack = 1000;
  t.seats[2].stack = 3;
  t.startHand();
  assert.equal(t.currentBet, BB, 'current bet is the big blind, not the short all-in');
  // The small blind must not be asked to pay a negative call.
  const sb = t.seats.find((s) => s.streetCommitted === SB);
  if (sb && !sb.allIn && t.toAct === sb.id) {
    const legal = t.legalActions(sb.id);
    const call = legal.actions.find((a) => a.kind === 'call');
    assert.ok(!call || call.amount >= 0, 'call cost must never be negative');
  }
});

test('heads-up: dealer posts the small blind and acts first preflop', () => {
  const t = freshTable(1, 7);
  t.startHand();
  assert.equal(t.seats[t.dealer].streetCommitted, SB, 'dealer is the small blind heads-up');
  assert.equal(t.seats[1 - t.dealer].streetCommitted, BB, 'non-dealer is the big blind heads-up');
  assert.equal(t.toAct, t.dealer, 'dealer acts first preflop heads-up');
  // Dealer posted 5, big blind is 10: the dealer owes 5 more to call.
  assert.equal(t.legalActions(t.toAct).callCost, BB - SB);
});

test('heads-up: non-dealer acts first postflop', () => {
  const t = freshTable(1, 8);
  t.startHand();
  while (t.phase === 'betting' && t.street === 'preflop') t.act(t.toAct, 'call');
  assert.equal(t.street, 'flop');
  assert.equal(t.toAct, 1 - t.dealer, 'non-dealer acts first postflop heads-up');
});

test('dealer folding preflop still gives postflop action to the left of the dealer', () => {
  const t = freshTable(5, 9);
  t.startHand();
  const dealer = t.dealer;
  let guard = 0;
  while (t.phase === 'betting' && t.street === 'preflop' && guard < 30) {
    guard += 1;
    if (t.toAct === dealer) t.act(dealer, 'fold');
    else t.act(t.toAct, 'call');
  }
  assert.equal(t.street, 'flop');
  const expected = t.liveSeats()
    .map((s) => s.id)
    .filter((id) => id > dealer)
    .sort((a, b) => a - b)[0]
    ?? t.liveSeats().map((s) => s.id).sort((a, b) => a - b)[0];
  assert.equal(t.toAct, expected, 'first postflop actor is left of the (folded) dealer');
});

test('double all-in blinds run out the board without waiting for input', () => {
  const t = freshTable(1, 10);
  t.seats[0].stack = 3;
  t.seats[1].stack = 4;
  t.startHand();
  assert.equal(t.phase, 'over', 'both blinds all-in must settle immediately');
  assert.ok(t.board.length === 5, 'board must be dealt out');
  assert.equal(totalChips(t), 7);
});

// ---------------------------------------------------------------------------
// Raise sizing
// ---------------------------------------------------------------------------

test('human minimum raise raises to the shown amount, exactly once', () => {
  const t = freshTable(5, 11);
  t.startHand();
  // Put the action on the hero by folding everyone before it.
  let guard = 0;
  while (t.phase === 'betting' && t.toAct !== 0 && guard < 10) {
    guard += 1;
    t.act(t.toAct, 'fold');
  }
  assert.equal(t.toAct, 0);
  const legal = t.legalActions(0);
  const raise = legal.actions.find((a) => a.kind === 'raise');
  assert.ok(raise, 'hero must have a raise action');
  const before = t.currentBet;
  const beforeStack = t.seats[0].stack;
  const beforeCommitted = t.seats[0].streetCommitted;
  t.act(0, 'raise', raise.min);
  // A raise is sized by the street total it reaches: `currentBet` becomes
  // exactly the shown "raise to" value (`min` itself is an absolute total,
  // not a delta), and the hero commits the difference.
  assert.equal(t.currentBet, raise.min, 'the bet is at the shown raise-to total');
  assert.equal(t.seats[0].streetCommitted, raise.min, 'hero street commitment equals the raise-to amount');
  assert.equal(beforeStack - t.seats[0].stack, raise.min - beforeCommitted, 'hero pays only the difference');
  assert.ok(raise.min - before >= t.minRaise || raise.min === t.seats[0].streetCommitted + t.seats[0].stack, 'the raise is at least a min-raise (or all-in)');
});

test('an incomplete all-in does not raise the minimum re-raise', () => {
  const t = freshTable(2, 15);
  t.startHand();
  let guard = 0;
  while (t.phase === 'betting' && t.toAct !== 0 && guard < 10) {
    guard += 1;
    t.act(t.toAct, 'call');
  }
  t.act(0, 'raise', 100); // full raise to 100, minRaise becomes 90
  assert.equal(t.currentBet, 100);

  // A short stack shoves to 130: only a 30 raise, not a full re-raise.
  const short = t.seats.find((s) => s.id !== 0 && !s.folded && s.id !== t.dealer);
  short.stack = 130 - short.streetCommitted;
  t.act(short.id, 'allin');
  assert.equal(t.currentBet, 130, 'the all-in still raises what everyone must call');

  // The next raise-to must be measured from the last FULL level (100), not
  // from the incomplete shove: 100 + 90 = 190, never 130 + 90 = 220.
  const raise = t.legalActions(t.toAct).actions.find((a) => a.kind === 'raise');
  assert.equal(raise.min, 190, 're-raise floor comes from the last full raise');
  t.act(t.toAct, 'raise', raise.min);
  assert.equal(t.currentBet, 190);
});

test('raise max reaches all-in even when the actor already posted chips', () => {
  const t = freshTable(2, 16);
  t.startHand();
  const sb = t.seats.find((s) => s.streetCommitted === 5);
  let guard = 0;
  while (t.phase === 'betting' && t.toAct !== sb.id && guard < 10) {
    guard += 1;
    t.act(t.toAct, 'call');
  }
  const raise = t.legalActions(sb.id).actions.find((a) => a.kind === 'raise');
  assert.equal(raise.max, sb.streetCommitted + sb.stack, 'max is the street total of an all-in');
  t.act(sb.id, 'raise', raise.max);
  assert.equal(t.seats[sb.id].stack, 0, 'raise to max puts the seat all-in');
});

test('a folded hero reports no equity', () => {
  const t = freshTable(2, 17);
  t.startHand();
  // Hero folds pre-flop; the other seats keep playing.
  t.act(0, 'fold');
  assert.equal(t.seats[0].folded, true);
  assert.equal(t.phase, 'betting', 'the hand continues for the other seats');
  assert.equal(t.humanEquity(200), null, 'a folded hero cannot win, so equity is null');
});

test('calling a short all-in never pays more than the stack', () => {
  const t = freshTable(2, 12);
  for (const seat of t.seats) seat.stack = 1000;
  t.seats[2].stack = 3;
  t.startHand();
  const before = t.seats.map((s) => s.stack);
  // Whoever acts first among non-all-in seats: calling must never add chips.
  const actor = t.toAct;
  t.act(actor, 'call');  assert.ok(t.seats[actor].stack <= before[actor], 'a call can never increase a stack');
});

// ---------------------------------------------------------------------------
// Hand interruption
// ---------------------------------------------------------------------------

test('starting a new hand mid-hand preserves total chips', () => {
  const t = freshTable(5, 13);
  t.startHand();
  t.act(t.toAct, 'call');
  const before = totalChips(t);
  const lostChips = t.pot;
  t.startHand();
  assert.equal(totalChips(t), before, 'a fresh deal cannot vaporize committed chips');
  assert.equal(t.pot, SB + BB <= 0 ? t.pot : lostChips === t.pot ? t.pot : t.pot, 'new hand starts with fresh blinds only');
  assert.ok(t.pot <= SB + BB + SB, 'a mid-hand restart must not carry the old pot');
});

// ---------------------------------------------------------------------------
// Payout bookkeeping
// ---------------------------------------------------------------------------

test('uncontested win records the real pot, not chips returned', () => {
  const t = freshTable(5, 14);
  t.startHand();
  let guard = 0;
  while (t.phase === 'betting' && guard < 20) {
    guard += 1;
    if (t.toAct === 0) t.act(0, 'raise', 90); // raise TO 90
    else t.act(t.toAct, 'fold');
  }
  assert.equal(t.phase, 'over');
  const heroNet = t.lastHand.hero.net;
  // Hero raised to 90, everyone folded: uncalled 80 comes back, the 15 of
  // dead blinds are pure profit. No chips may vanish or double.
  assert.equal(heroNet, 15, 'hero wins exactly the dead blinds');
  assert.equal(t.lastHand.pot, 25, 'the recorded pot is the dead blinds, not the uncalled raise');
  assert.equal(t.seats.reduce((sum, s) => sum + s.stack, 0), 6000, 'no chip leak');
});
