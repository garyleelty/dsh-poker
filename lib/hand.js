/** Card encoding: 0..51. rank = c % 13 (0=2 .. 12=A), suit = (c / 13) | 0. */
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const SUITS = ['c', 'd', 'h', 's'];
export const SUIT_GLYPH = { c: '♣', d: '♦', h: '♥', s: '♠' };

export function rankOf(card) {
  return card % 13;
}

export function suitOf(card) {
  return (card / 13) | 0;
}

export function cardText(card) {
  return RANKS[rankOf(card)] + SUITS[suitOf(card)];
}

const CATEGORY = [
  'high-card',
  'pair',
  'two-pair',
  'trips',
  'straight',
  'flush',
  'full-house',
  'quads',
  'straight-flush',
];

export function categoryText(category) {
  return CATEGORY[category] ?? 'high-card';
}

/**
 * Seven-card evaluator.
 * @param {number[]} cards
 * @returns {{ category: number, rank: number }}
 */
export function evaluate7(cards) {
  const rankCount = new Array(13).fill(0);
  const suitCount = new Array(4).fill(0);
  for (const card of cards) {
    rankCount[rankOf(card)] += 1;
    suitCount[suitOf(card)] += 1;
  }

  const flushSuit = suitCount.findIndex((n) => n >= 5);
  if (flushSuit >= 0) {
    const bits = 0;
    let mask = bits;
    for (const card of cards) {
      if (suitOf(card) === flushSuit) mask |= 1 << rankOf(card);
    }
    const straightHigh = straightHighOf(mask);
    if (straightHigh >= 0) return { category: 8, rank: straightHigh };
    // Flush: pick the five highest ranks of the flush suit.
    let rank = 0;
    let taken = 0;
    for (let r = 12; r >= 0 && taken < 5; r -= 1) {
      if ((mask >> r) & 1) {
        rank = rank * 13 + r;
        taken += 1;
      }
    }
    return { category: 5, rank };
  }

  const quadRank = rankCount.findIndex((n) => n === 4);
  if (quadRank >= 0) {
    let kicker = -1;
    for (let r = 12; r >= 0; r -= 1) {
      if (r !== quadRank && rankCount[r] > 0) {
        kicker = r;
        break;
      }
    }
    return { category: 7, rank: quadRank * 13 + kicker };
  }

  const tripRanks = [];
  const pairRanks = [];
  for (let r = 12; r >= 0; r -= 1) {
    if (rankCount[r] === 3) tripRanks.push(r);
    else if (rankCount[r] === 2) pairRanks.push(r);
  }

  if (tripRanks.length >= 2) {
    return { category: 6, rank: tripRanks[0] * 13 + tripRanks[1] };
  }
  if (tripRanks.length === 1 && pairRanks.length >= 1) {
    return { category: 6, rank: tripRanks[0] * 13 + pairRanks[0] };
  }

  let mask = 0;
  for (let r = 0; r < 13; r += 1) {
    if (rankCount[r] > 0) mask |= 1 << r;
  }
  const straightHigh = straightHighOf(mask);
  if (straightHigh >= 0) return { category: 4, rank: straightHigh };

  if (tripRanks.length === 1) {
    let rank = tripRanks[0] * 13 * 13;
    let taken = 0;
    for (let r = 12; r >= 0 && taken < 2; r -= 1) {
      if (r !== tripRanks[0] && rankCount[r] > 0) {
        rank += r * (taken === 0 ? 13 : 1);
        taken += 1;
      }
    }
    return { category: 3, rank };
  }

  if (pairRanks.length >= 2) {
    let kicker = -1;
    for (let r = 12; r >= 0; r -= 1) {
      if (rankCount[r] > 0 && r !== pairRanks[0] && r !== pairRanks[1]) {
        kicker = r;
        break;
      }
    }
    return { category: 2, rank: pairRanks[0] * 13 * 13 + pairRanks[1] * 13 + kicker };
  }

  if (pairRanks.length === 1) {
    let rank = pairRanks[0] * 13 * 13 * 13;
    let taken = 0;
    for (let r = 12; r >= 0 && taken < 3; r -= 1) {
      if (r !== pairRanks[0] && rankCount[r] > 0) {
        rank += r * (taken === 0 ? 169 : taken === 1 ? 13 : 1);
        taken += 1;
      }
    }
    return { category: 1, rank };
  }

  let rank = 0;
  let taken = 0;
  for (let r = 12; r >= 0 && taken < 5; r -= 1) {
    if (rankCount[r] > 0) {
      rank = rank * 13 + r;
      taken += 1;
    }
  }
  return { category: 0, rank };
}

function straightHighOf(mask) {
  // Highest straight wins, so scan from the ace down; the wheel (A,2,3,4,5)
  // is the fallback, not the first answer — checking it first made A2345+6
  // evaluate as five-high instead of six-high.
  for (let high = 12; high >= 4; high -= 1) {
    let need = 0;
    for (let i = 0; i < 5; i += 1) need |= 1 << (high - i);
    if ((mask & need) === need) return high;
  }
  const wheel = 0b1_0000_0000_1111; // A,2,3,4,5
  if ((mask & wheel) === wheel) return 3; // five-high straight
  return -1;
}

export function compareEval(a, b) {
  if (a.category !== b.category) return a.category - b.category;
  return a.rank - b.rank;
}
