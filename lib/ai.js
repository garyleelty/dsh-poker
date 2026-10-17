import { equityPercent, makeRng } from './odds.js';

const STYLES = [
  {
    name: 'tight', vpip: 0.28, aggression: 0.55, bluff: 0.06,
    label: '紧凶', hint: '入池少，加注果断', color: '#5b7cfa',
  },
  {
    name: 'loose', vpip: 0.62, aggression: 0.7, bluff: 0.16,
    label: '松凶', hint: '入池宽，爱施压', color: '#d9834a',
  },
  {
    name: 'rock', vpip: 0.2, aggression: 0.35, bluff: 0.04,
    label: '石头', hint: '只打强牌，很少诈唬', color: '#7a8a6f',
  },
  {
    name: 'maniac', vpip: 0.75, aggression: 0.9, bluff: 0.28,
    label: '疯狗', hint: '什么牌都敢打，诈唬多', color: '#c94f4f',
  },
];

export function styleFor(seatId) {
  const index = Math.max(0, seatId - 1);
  return STYLES[index % STYLES.length];
}

/**
 * Decide one AI action from its seat's point of view.
 * @param {import('./table.js').Table} table
 * @param {number} id seat id
 * @returns {{ kind: string, amount?: number, thought: string }}
 */
export function decide(table, id) {
  const seat = table.seats[id];
  const style = styleFor(id);
  const rng = makeRng((table.handNumber * 7919 + id * 131 + table.board.length * 17) >>> 0);
  const legal = table.legalActions(id);
  const callCost = legal.callCost;
  const pot = table.pot;

  const liveOpponents = Math.max(1, table.liveSeats().length - 1);
  const trials = table.street === 'preflop' ? 220 : 160;
  const equity = equityPercent(seat.hole, table.board, liveOpponents, trials, rng);
  const potOdds = callCost > 0 ? callCost / (pot + callCost) : 0;
  const facingBet = callCost > 0;

  // Free showdown: take it.
  if (!facingBet) {
    const valueBet = equity > 0.62 || (equity > 0.45 && rng() % 100 < style.aggression * 100);
    if (valueBet && seat.stack > 0) {
      // `amount` is the street total to bet TO (what `act()` expects).
      const size = Math.max(
        table.minRaise,
        Math.round(pot * (0.5 + 0.35 * rng() / 0xffffffff)),
      );
      const raiseTo = size;
      if (raiseTo >= table.minRaise || raiseTo === seat.streetCommitted + seat.stack) {
        return {
          kind: table.currentBet === 0 ? 'bet' : 'raise',
          amount: Math.min(raiseTo, seat.streetCommitted + seat.stack),
          thought: `胜率 ${pct(equity)}，主动出击`,
        };
      }
    }
    const bluff = rng() % 1000 < style.bluff * 1000 && pot > 0;
    if (bluff && seat.stack > table.minRaise) {
      return {
        kind: table.currentBet === 0 ? 'bet' : 'raise',
        amount: Math.min(Math.max(table.minRaise, Math.round(pot * 0.6)), seat.streetCommitted + seat.stack),
        thought: '试探性下注',
      };
    }
    return { kind: 'check', thought: `胜率 ${pct(equity)}，先看牌` };
  }

  // Facing a bet.
  const ev = equity - potOdds;
  const loose = rng() % 100 < style.vpip * 100;

  if (ev > 0.28 && seat.stack > callCost + table.minRaise) {
    // Re-raise to a street total: the pot-sized heuristic over the current
    // bet, always at least a legal min raise.
    const raiseTo = Math.min(
      Math.max(table.currentBet + table.minRaise, Math.round((pot + callCost) * 0.8) + table.currentBet),
      seat.streetCommitted + seat.stack,
    );
    if (raiseTo > table.currentBet) {
      return { kind: 'raise', amount: raiseTo, thought: `胜率 ${pct(equity)} 远高于底池赔率，加注` };
    }
  }

  if (ev > -0.02 || loose) {
    if (callCost >= seat.stack) {
      return { kind: 'call', thought: `赔率合适，跟注全下 ${callCost}` };
    }
    return { kind: 'call', thought: `胜率 ${pct(equity)}，底池赔率 ${pct(potOdds)}，跟注` };
  }

  if (callCost > seat.stack * 0.5 && equity < 0.3) {
    return { kind: 'fold', thought: `胜率 ${pct(equity)} 不足，弃牌` };
  }
  return { kind: 'fold', thought: `胜率 ${pct(equity)}，不划算，弃牌` };
}

function pct(value) {
  return `${Math.round(value * 100)}%`;
}
