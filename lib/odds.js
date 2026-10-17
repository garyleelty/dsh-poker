import { compareEval, evaluate7 } from './hand.js';

/** Deterministic xorshift32 so one seed replays one deal. */
export function makeRng(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };
}

export function shuffle(rng, deck) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = rng() % (i + 1);
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

/**
 * Monte-Carlo equity of one hole pair against `opponents` random hands.
 * A tie counts as an equal share of the pot among all tied players, so the
 * returned equity sums to the fraction of the pot the hero expects to win.
 * @param {number[]} hole two cards
 * @param {number[]} board zero, three, four, or five cards
 * @param {number} opponents how many random hands to beat
 * @param {number} trials sample count
 * @param {() => number} rng
 * @returns {{ win: number, tie: number }} fractions of `trials`; win + tie is
 *   the hero's expected pot share (a tie among `tied` players is worth 1/tied)
 */
export function equity(hole, board, opponents, trials, rng) {
  const used = new Set([...hole, ...board]);
  const deck = [];
  for (let c = 0; c < 52; c += 1) {
    if (!used.has(c)) deck.push(c);
  }
  const needBoard = 5 - board.length;
  if (deck.length < needBoard + opponents * 2) return { win: 0, tie: 0 };

  const trial = board.slice();
  let wins = 0;
  let ties = 0;

  for (let t = 0; t < trials; t += 1) {
    shuffle(rng, deck);
    for (let i = 0; i < needBoard; i += 1) trial[board.length + i] = deck[i];
    trial.length = 5;

    const mine = evaluate7([hole[0], hole[1], trial[0], trial[1], trial[2], trial[3], trial[4]]);
    let beatAll = true;
    let tiedWith = 0;
    let cursor = needBoard;
    for (let o = 0; o < opponents; o += 1) {
      const a = deck[cursor];
      const b = deck[cursor + 1];
      cursor += 2;
      const cmp = compareEval(
        mine,
        evaluate7([a, b, trial[0], trial[1], trial[2], trial[3], trial[4]]),
      );
      if (cmp < 0) {
        beatAll = false;
        break;
      }
      if (cmp === 0) tiedWith += 1;
    }
    if (beatAll) {
      if (tiedWith === 0) {
        wins += 1;
      } else {
        // Tied players split the pot: the hero's share of this trial is
        // 1 / (tiedWith + 1).
        ties += 1 / (tiedWith + 1);
      }
    }
  }

  return { win: wins / trials, tie: ties / trials };
}

/**
 * @returns {number} 0..1, the hero's expected pot share: win plus the tied
 *   share (each tie is already weighted by 1/tiedPlayers in `equity`)
 */
export function equityPercent(hole, board, opponents, trials, rng) {
  const { win, tie } = equity(hole, board, opponents, trials, rng);
  return win + tie;
}
