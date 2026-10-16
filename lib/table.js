import { cardText, categoryText, compareEval, evaluate7 } from './hand.js';
import { equity, makeRng, shuffle } from './odds.js';

export const STREETS = ['preflop', 'flop', 'turn', 'river'];

const AI_NAMES = ['小艾', '老K', '阿蒙', '杰克', '菲尔'];

/**
 * One cash-game table: fixed blinds, no-limit betting, side pots, showdown.
 * The whole state is plain JSON so it can cross the Host/Client boundary.
 */
export class Table {
  constructor(options = {}) {
    this.smallBlind = options.smallBlind ?? 5;
    this.bigBlind = options.bigBlind ?? 10;
    this.opponents = options.opponents ?? 3;
    this.rng = makeRng(options.seed ?? (Date.now() & 0x7fffffff));
    this.seats = [];
    for (let i = 0; i < this.opponents + 1; i += 1) {
      this.seats.push({
        id: i,
        name: i === 0 ? '你' : AI_NAMES[(i - 1) % AI_NAMES.length],
        human: i === 0,
        stack: 1000,
        hole: [],
        committed: 0,
        streetCommitted: 0,
        folded: false,
        allIn: false,
        seat: i,
      });
    }
    this.deck = [];
    this.board = [];
    this.pot = 0;
    this.street = 'preflop';
    this.dealer = 0;
    this.toAct = 0;
    this.currentBet = 0;
    this.lastRaise = 0;
    this.lastAggressor = null;
    this.minRaise = this.bigBlind;
    this.actionsThisStreet = 0;
    this.actedThisStreet = new Set();
    this.history = [];
    this.phase = 'idle'; // idle | dealing | betting | showdown | over
    this.result = null;
    this.handNumber = 0;
    this.pendingAdvice = null;
  }

  /** Start a fresh hand: post blinds, deal, and let the first seat act. */
  startHand() {
    this.handNumber += 1;
    this.board = [];
    this.pot = 0;
    this.street = 'preflop';
    this.result = null;
    this.pendingAdvice = null;
    this.history = [];
    this.phase = 'betting';

    const deck = [];
    for (let c = 0; c < 52; c += 1) deck.push(c);
    shuffle(this.rng, deck);
    this.deck = deck;

    for (const seat of this.seats) {
      seat.hole = [];
      seat.committed = 0;
      seat.streetCommitted = 0;
      seat.folded = false;
      seat.allIn = false;
      if (seat.stack <= 0) seat.folded = true;
    }

    const live = this.seats.filter((s) => !s.folded);
    // Two human-visible endgames are settled here, before any card is dealt.
    // `live.length < 2` alone cannot tell them apart: a busted human still
    // leaves every AI seat alive, which used to deal a hand the human had
    // already been silently folded out of.
    if (this.seats[0].stack <= 0) {
      this.phase = 'over';
      this.result = { text: '你的筹码已输光', kind: 'bust', winners: [] };
      return this.snapshot();
    }
    // The human holds chips and is the only seat still funded, so every AI has
    // been knocked out — a table sweep, not the "not enough chips" failure.
    if (live.length < 2) {
      this.phase = 'over';
      this.result = { text: '你赢下了整桌', kind: 'sweep', winners: [] };
      return this.snapshot();
    }

    this.dealer = this.nextSeat(this.dealer, live);
    const order = this.actionOrder(live);
    const sbSeat = this.smallBlindSeat(order, live);
    const bbSeat = this.bigBlindSeat(order, live);

    this.postBlind(sbSeat, Math.min(this.smallBlind, sbSeat.stack));
    this.postBlind(bbSeat, Math.min(this.bigBlind, bbSeat.stack));
    this.currentBet = bbSeat.streetCommitted;
    this.minRaise = this.bigBlind;
    this.lastRaise = this.bigBlind;
    // The big blind is the opening bet, so it is the seat everyone must answer.
    this.lastAggressor = bbSeat.id;

    for (const seat of live) seat.hole = [this.deck.pop(), this.deck.pop()];

    this.actedThisStreet = new Set([sbSeat.id, bbSeat.id].filter((id) => {
      const s = this.seats[id];
      return s.allIn || s.stack === 0;
    }));
    this.toAct = this.firstToAct(order, live);
    this.street = 'preflop';
    return this.snapshot();
  }

  smallBlindSeat(order, live) {
    if (live.length === 2) return this.seats[order[0]];
    return this.seats[order[0]];
  }

  bigBlindSeat(order, live) {
    if (live.length === 2) return this.seats[order[1]];
    return this.seats[order[1]];
  }

  /**
   * First seat to act pre-flop: normally UTG, but never a seat that cannot act.
   * A player who posted a blind with their last chips is already all-in, and
   * handing them the turn deadlocked the street — `act()` returns early for
   * all-in seats, so no click could ever advance the hand.
   */
  firstToAct(order, live) {
    const canAct = (id) => {
      const s = this.seats[id];
      return !s.folded && !s.allIn && s.stack > 0;
    };
    const start = live.length === 2 ? 0 : 2;
    for (let i = start; i < order.length; i += 1) {
      if (canAct(order[i])) return order[i];
    }
    for (let i = 0; i < order.length; i += 1) {
      if (canAct(order[i])) return order[i];
    }
    return order[start] ?? order[0];
  }

  postBlind(seat, amount) {
    const paid = Math.min(amount, seat.stack);
    seat.stack -= paid;
    seat.committed += paid;
    seat.streetCommitted += paid;
    if (seat.stack === 0) seat.allIn = true;
    this.pot += paid;
  }

  nextSeat(fromId, live) {
    const ids = live.map((s) => s.id).sort((a, b) => a - b);
    for (const id of ids) if (id > fromId) return id;
    return ids[0];
  }

  /** Acting order for a street: left of the dealer first. */
  actionOrder(live) {
    const ids = live.map((s) => s.id).sort((a, b) => a - b);
    const start = ids.findIndex((id) => id === this.dealer);
    const rotated = ids.slice(start + 1).concat(ids.slice(0, start + 1));
    return live.length === 2 ? [rotated[0], rotated[1]] : rotated;
  }

  liveSeats() {
    return this.seats.filter((s) => !s.folded);
  }

  contenders() {
    return this.seats.filter((s) => !s.folded && !s.allIn);
  }

  /**
   * Apply one action by seat id.
   * @param {number} id seat id
   * @param {'fold'|'call'|'check'|'bet'|'raise'|'allin'} kind
   * @param {number} amount for bet/raise: the additional chips above the call
   */
  act(id, kind, amount = 0) {
    if (this.phase !== 'betting') return this.snapshot();
    const seat = this.seats[id];
    if (!seat || seat.folded || seat.allIn) return this.snapshot();

    const callCost = Math.min(this.currentBet - seat.streetCommitted, seat.stack);
    let put = 0;

    if (kind === 'fold') {
      seat.folded = true;
      this.history.push({ seat: id, kind: 'fold', text: `${seat.name} 弃牌` });
    } else if (kind === 'check') {
      if (callCost > 0) return this.snapshot();
      this.history.push({ seat: id, kind: 'check', text: `${seat.name} 过牌` });
    } else if (kind === 'call') {
      put = callCost;
      if (put === 0) {
        this.history.push({ seat: id, kind: 'check', text: `${seat.name} 过牌` });
      } else {
        this.history.push({ seat: id, kind: 'call', amount: put, text: `${seat.name} 跟注 ${put}` });
      }
    } else if (kind === 'bet' || kind === 'raise') {
      const wanted = Math.max(amount, this.minRaise);
      put = Math.min(callCost + wanted, seat.stack);
      const totalStreet = seat.streetCommitted + put;
      const raisedBy = totalStreet - this.currentBet;
      if (put >= callCost + Math.min(this.minRaise, seat.stack) || seat.stack === put) {
        this.lastRaise = Math.max(raisedBy, this.minRaise);
        this.minRaise = Math.max(this.minRaise, this.lastRaise);
      }
      this.currentBet = Math.max(this.currentBet, totalStreet);
      this.lastAggressor = id;
      this.history.push({
        seat: id,
        kind: seat.stack === put ? 'allin' : 'raise',
        amount: put,
        text: `${seat.name} ${this.currentBet > 0 && raisedBy > 0 ? '加注' : '下注'} ${put}`,
      });
    } else if (kind === 'allin') {
      put = seat.stack;
      const totalStreet = seat.streetCommitted + put;
      if (totalStreet > this.currentBet) {
        this.lastRaise = totalStreet - this.currentBet;
        this.minRaise = Math.max(this.minRaise, this.lastRaise);
        this.currentBet = totalStreet;
        this.lastAggressor = id;
      }
      this.history.push({ seat: id, kind: 'allin', amount: put, text: `${seat.name} 全下 ${put}` });
    } else {
      return this.snapshot();
    }

    seat.stack -= put;
    seat.committed += put;
    seat.streetCommitted += put;
    if (seat.stack === 0) seat.allIn = true;
    this.pot += put;
    this.actedThisStreet.add(id);

    return this.advance();
  }

  /** Move the action pointer, close the street, or run the showdown. */
  advance() {
    const live = this.liveSeats();
    if (live.length === 1) return this.finish([live[0]]);

    const contenders = this.contenders();
    if (contenders.length === 0) return this.runOut();

    // The betting round closes when every player who can still act has acted
    // and matched the current bet. `lastAggressor` is the seat everyone has to
    // answer: with no raise yet, that is the first seat in the street's order.
    const order = this.actionOrder(live);
    const pending = live.filter((s) => this.needsToAct(s, order));
    if (pending.length === 0) return this.nextStreet();

    const startAt = Math.max(0, order.findIndex((id) => id === this.toAct));
    for (let i = 1; i <= order.length; i += 1) {
      const candidate = order[(startAt + i) % order.length];
      if (pending.some((s) => s.id === candidate)) {
        this.toAct = candidate;
        return this.snapshot();
      }
    }
    // `pending` is non-empty and already excludes folded and all-in seats, so
    // this is always a seat that can act. Pointing at an all-in seat here used
    // to deadlock the street: `act()` returns early for all-in seats, so the
    // turn could never advance and the hand hung on the human's action.
    this.toAct = pending[0].id;
    return this.snapshot();
  }

  /**
   * Whether a seat still owes action this street.
   * With no aggression yet (`lastAggressor` null), every live player gets one
   * turn; after a bet or raise, players act until they have matched it.
   */
  needsToAct(seat, order) {
    if (seat.folded || seat.allIn) return false;
    if (this.lastAggressor === null) return !this.actedThisStreet.has(seat.id);
    if (seat.id === this.lastAggressor && this.seats[this.lastAggressor].streetCommitted >= this.currentBet) {
      return false;
    }
    if (seat.streetCommitted < this.currentBet) return true;
    return !this.actedThisStreet.has(seat.id);
  }

  nextStreet() {
    const index = STREETS.indexOf(this.street);
    if (index >= STREETS.length - 1) return this.showdown();

    for (const seat of this.seats) seat.streetCommitted = 0;
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.lastAggressor = null;
    this.actedThisStreet = new Set();
    this.street = STREETS[index + 1];

    if (this.street === 'flop') {
      this.board.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
    } else {
      this.board.push(this.deck.pop());
    }

    const live = this.liveSeats();
    const contenders = live.filter((s) => !s.allIn);
    if (contenders.length <= 1) return this.runOut();

    const order = this.actionOrder(live);
    this.toAct = order.find((id) => !this.seats[id].allIn) ?? order[0];
    return this.snapshot();
  }

  /** No more betting is possible: deal the remaining board and show down. */
  runOut() {
    while (this.board.length < 5) this.board.push(this.deck.pop());
    this.street = 'river';
    return this.showdown();
  }

  showdown() {
    const live = this.liveSeats();
    const evaluated = live
      .filter((s) => s.hole.length === 2)
      .map((s) => ({ seat: s, value: evaluate7([...s.hole, ...this.board]) }));
    if (evaluated.length === 0) return this.finish([]);

    evaluated.sort((a, b) => compareEval(b.value, a.value));
    const best = evaluated[0].value;
    const winners = evaluated.filter((e) => compareEval(e.value, best) === 0).map((e) => e.seat);
    return this.finish(winners, evaluated);
  }

  finish(winners, evaluated = null) {
    const refunds = this.refundUncalled();
    const pots = this.buildPots();
    const payouts = new Map();
    for (const seat of this.seats) payouts.set(seat.id, 0);

    for (const pot of pots) {
      const eligible = pot.seats.filter((id) => winners.some((w) => w.id === id));
      const pool = eligible.length > 0 ? eligible : pot.seats;
      const share = Math.floor(pot.amount / pool.length);
      let remainder = pot.amount - share * pool.length;
      for (const id of pool) {
        payouts.set(id, payouts.get(id) + share);
        if (remainder > 0) {
          payouts.set(id, payouts.get(id) + 1);
          remainder -= 1;
        }
      }
    }

    for (const seat of this.seats) {
      seat.stack += payouts.get(seat.id);
      const refund = refunds.get(seat.id) ?? 0;
      if (refund > 0) {
        seat.stack += refund;
        payouts.set(seat.id, payouts.get(seat.id) + refund);
      }
    }

    this.phase = 'over';
    this.pot = 0;
    this.result = {
      winners: winners.map((w) => ({
        id: w.id,
        name: w.name,
        amount: payouts.get(w.id),
        hand: w.hole.length === 2 && this.board.length >= 3
          ? categoryText(evaluate7([...w.hole, ...this.board]).category)
          : null,
        cards: w.hole.map(cardText),
      })),
      pots: pots.map((p) => ({ amount: p.amount, seats: p.seats })),
      board: this.board.map(cardText),
      shown: (evaluated ?? []).slice(0, 3).map((e) => ({
        name: e.seat.name,
        cards: e.seat.hole.map(cardText),
        hand: categoryText(e.value.category),
      })),
    };
    return this.snapshot();
  }

  /**
   * Return the part of each seat's contribution no opponent could match,
   * because every other live seat was all-in for less. The excess never
   * enters a pot: it goes back to the seat that put it in.
   * @returns {Map<number, number>} seat id -> chips to refund
   */
  refundUncalled() {
    const refunds = new Map();
    const live = this.seats.filter((s) => s.committed > 0);
    if (live.length < 2) return refunds;

    for (const seat of live) {
      const bestOpponent = Math.max(
        ...live.filter((s) => s.id !== seat.id).map((s) => s.committed),
      );
      const excess = seat.committed - bestOpponent;
      if (excess > 0) {
        refunds.set(seat.id, excess);
        seat.committed -= excess;
        this.pot -= excess;
      }
    }
    return refunds;
  }

  /** Split the pot into a main pot and side pots by contribution level. */
  buildPots() {
    const contributors = this.seats.filter((s) => s.committed > 0);
    const levels = [...new Set(contributors.map((s) => s.committed))].sort((a, b) => a - b);
    const pots = [];
    let previous = 0;
    for (const level of levels) {
      const step = level - previous;
      if (step <= 0) continue;
      const seats = contributors.filter((s) => s.committed >= level).map((s) => s.id);
      const amount = step * seats.length;
      if (amount <= 0) {
        previous = level;
        continue;
      }
      const existing = pots.find((p) => p.seats.length === seats.length
        && p.seats.every((id) => seats.includes(id)));
      if (existing) existing.amount += amount;
      else pots.push({ amount, seats });
      previous = level;
    }
    return pots;
  }

  /** Equity of the human seat against the live opponents. */
  humanEquity(trials = 400) {
    const human = this.seats[0];
    if (human.hole.length !== 2) return null;
    const opponents = Math.max(1, this.liveSeats().filter((s) => s.id !== 0).length);
    return equity(human.hole, this.board, opponents, trials, this.rng);
  }

  legalActions(id) {
    const seat = this.seats[id];
    if (!seat || this.phase !== 'betting' || this.toAct !== id) return { actions: [] };
    // An all-in or busted seat has nothing left to choose: `act()` would reject
    // every action, so offering buttons here only produced a dead click.
    if (seat.allIn || seat.folded || seat.stack <= 0) return { actions: [] };
    const callCost = Math.min(this.currentBet - seat.streetCommitted, seat.stack);
    const actions = [{ kind: 'fold', label: '弃牌' }];
    if (callCost === 0) actions.push({ kind: 'check', label: '过牌' });
    else actions.push({ kind: 'call', label: `跟注 ${callCost}`, amount: callCost });

    const raiseFloor = Math.min(this.currentBet + this.minRaise - seat.streetCommitted, seat.stack);
    if (seat.stack > callCost) {
      actions.push({
        kind: this.currentBet === 0 ? 'bet' : 'raise',
        label: this.currentBet === 0 ? '下注' : '加注',
        min: raiseFloor,
        max: seat.stack,
      });
    }
    actions.push({ kind: 'allin', label: `全下 ${seat.stack}`, amount: seat.stack });
    return {
      actions,
      callCost,
      minRaise: this.minRaise,
      pot: this.pot,
      potOdds: callCost > 0 ? callCost / (this.pot + callCost) : 0,
    };
  }

  snapshot() {
    return {
      handNumber: this.handNumber,
      street: this.street,
      phase: this.phase,
      pot: this.pot,
      board: this.board.map(cardText),
      dealer: this.dealer,
      toAct: this.phase === 'betting' ? this.toAct : null,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      seats: this.seats.map((s) => ({
        id: s.id,
        name: s.name,
        human: s.human,
        stack: s.stack,
        committed: s.committed,
        streetCommitted: s.streetCommitted,
        folded: s.folded,
        allIn: s.allIn,
        cards: s.hole.length === 2
          ? s.hole.map((c) => (s.human || this.phase === 'over' ? cardText(c) : null))
          : [],
      })),
      history: this.history.slice(-12),
      result: this.result,
      legal: this.phase === 'betting' ? this.legalActions(this.toAct) : { actions: [] },
    };
  }
}
