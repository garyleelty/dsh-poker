import { cardText, categoryText, compareEval, evaluate7 } from './hand.js';
import { equity, makeRng, shuffle } from './odds.js';

export const STREETS = ['preflop', 'flop', 'turn', 'river'];

// Monotonic suffix so two tables that start in the same millisecond cannot
// publish the same hand uid.
let handSequence = 0;

// Stable seat identities. `name` is the display fallback (zh); the client
// localizes via `nameKey` so an English UI shows "Aimee", not "小艾".
const AI_SEATS = [
  { key: 'aimee', name: '小艾' },
  { key: 'oldk', name: '老K' },
  { key: 'amon', name: '阿蒙' },
  { key: 'jack', name: '杰克' },
  { key: 'phil', name: '菲尔' },
];

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
    // A separate stream for equity sampling, so repeated /poker/state polls
    // cannot change the order the deck is shuffled into.
    this.equityRng = makeRng((options.seed ?? 1) ^ 0x5bf03635);
    this.seats = [];
    for (let i = 0; i < this.opponents + 1; i += 1) {
      this.seats.push({
        id: i,
        name: i === 0 ? '你' : AI_SEATS[(i - 1) % AI_SEATS.length].name,
        nameKey: i === 0 ? 'seat.you' : `seat.name.${AI_SEATS[(i - 1) % AI_SEATS.length].key}`,
        human: i === 0,
        stack: 1000,
        hole: [],
        committed: 0,
        streetCommitted: 0,
        folded: false,
        allIn: false,
        seat: i,
        // Last action taken in the current street, for the table's action
        // badges. Cleared when the street changes.
        lastAction: null,
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
    // The last FULL raise level (street total). An incomplete all-in shove
    // raises `currentBet` but must not raise the minimum re-raise: the next
    // legal raise-to stays `lastFullRaiseTo + minRaise`.
    this.lastFullRaiseTo = 0;
    this.actionsThisStreet = 0;
    this.actedThisStreet = new Set();
    this.history = [];
    this.phase = 'idle'; // idle | dealing | betting | showdown | over
    this.result = null;
    this.handNumber = 0;
    this.pendingAdvice = null;
    // Session history: the last settled hand is published as a plain record so
    // the Host can archive it without knowing the table internals.
    this.handStartedAt = null;
    this.heroStackAtStart = null;
    this.handUid = null;
    this.lastHand = null;
  }

  /** Start a fresh hand: post blinds, deal, and let the first seat act. */
  startHand() {
    // Aborting a live hand: every committed chip goes back before the deal,
    // so a mid-hand restart can never vaporize chips into a vanished pot.
    if (this.phase === 'betting') {
      for (const seat of this.seats) {
        seat.stack += seat.committed;
        this.pot -= seat.committed;
        seat.committed = 0;
      }
    }

    this.handNumber += 1;
    const startedAt = Date.now();
    this.handStartedAt = startedAt;
    this.heroStackAtStart = this.seats[0].stack;
    this.handUid = `${startedAt}-${this.handNumber}-${++handSequence}`;
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
      seat.lastAction = null;
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
    // Heads-up: the dealer posts the small blind and the other seat the big
    // blind; multiway it is simply the first two seats after the dealer.
    const sbSeat = live.length === 2 ? this.seats[this.dealer] : this.seats[order[0]];
    const bbSeat = live.length === 2 ? this.seats[this.nextSeat(this.dealer, live)] : this.seats[order[1]];

    this.postBlind(sbSeat, Math.min(this.smallBlind, sbSeat.stack));
    this.postBlind(bbSeat, Math.min(this.bigBlind, bbSeat.stack));
    // The current bet is always the full big blind, even when the big blind
    // seat was too short to post it all: a short all-in must not shrink what
    // the other seats owe (which used to produce negative call costs).
    this.currentBet = Math.max(this.bigBlind, bbSeat.streetCommitted);
    this.minRaise = this.bigBlind;
    this.lastRaise = this.bigBlind;
    // The big blind itself is the opening full "raise" level.
    this.lastFullRaiseTo = this.currentBet;
    // The big blind is the opening bet, so it is the seat everyone must answer.
    this.lastAggressor = bbSeat.id;

    for (const seat of live) seat.hole = [this.deck.pop(), this.deck.pop()];

    this.actedThisStreet = new Set([sbSeat.id, bbSeat.id].filter((id) => {
      const s = this.seats[id];
      return s.allIn || s.stack === 0;
    }));
    this.toAct = this.firstToAct(order, live);
    this.street = 'preflop';

    // When no seat can act (every live seat posted their last chips), the
    // betting round is already closed: run the board out instead of hanging
    // on a decision nobody can make.
    if (this.contenders().length <= 1) return this.runOut();
    // The big blind keeps its option: it is not marked as having acted, so if
    // everyone limps the round cannot close before the BB checks or raises.
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
   * First seat to act pre-flop. Heads-up the dealer (small blind) acts first;
   * multiway it is UTG, skipping seats that cannot act. A player who posted a
   * blind with their last chips is already all-in, and handing them the turn
   * deadlocked the street — `act()` returns early for all-in seats, so no
   * click could ever advance the hand.
   */
  firstToAct(order, live) {
    const canAct = (id) => {
      const s = this.seats[id];
      return !s.folded && !s.allIn && s.stack > 0;
    };
    // Heads-up the dealer (small blind) acts first pre-flop. The rotation
    // puts the non-dealer in front of the dealer, so scan from the dealer's
    // own position for this street; multiway it is UTG, two left of the
    // dealer.
    const start = live.length === 2 ? order.indexOf(this.dealer) : 2;
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
    // Live dealer: the first actor is the seat left of the dealer. A folded
    // dealer cannot anchor the rotation, so the first actor is the first live
    // seat left of the button instead.
    const dealerIndex = ids.findIndex((id) => id === this.dealer);
    if (dealerIndex >= 0) {
      return ids.slice(dealerIndex + 1).concat(ids.slice(0, dealerIndex + 1));
    }
    let start = 0;
    for (let i = 0; i < ids.length; i += 1) {
      if (ids[i] > this.dealer) { start = i; break; }
    }
    return ids.slice(start).concat(ids.slice(0, start));
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
   * @param {number} amount for bet/raise: the total street commitment to raise
   *   TO (what the slider shows), not the chips added on top of the call
   */
  act(id, kind, amount = 0) {
    if (this.phase !== 'betting') return this.snapshot();
    const seat = this.seats[id];
    if (!seat || seat.folded || seat.allIn) return this.snapshot();

    const callCost = Math.min(Math.max(0, this.currentBet - seat.streetCommitted), seat.stack);
    const wasBet = this.currentBet > 0;
    let put = 0;
    let actionKind = kind;

    if (kind === 'fold') {
      seat.folded = true;
      actionKind = 'fold';
      this.history.push({ seat: id, kind, street: this.street, text: `${seat.name} 弃牌` });
    } else if (kind === 'check') {
      if (callCost > 0) return this.snapshot();
      actionKind = 'check';
      this.history.push({ seat: id, kind, street: this.street, text: `${seat.name} 过牌` });
    } else if (kind === 'call') {
      put = callCost;
      if (put === 0) {
        actionKind = 'check';
        this.history.push({ seat: id, kind: 'check', street: this.street, text: `${seat.name} 过牌` });
      } else {
        actionKind = 'call';
        this.history.push({
          seat: id, kind, street: this.street, amount: put,
          to: seat.streetCommitted + put,
          text: `${seat.name} 跟注 ${put}`,
        });
      }
    } else if (kind === 'bet' || kind === 'raise') {
      // `amount` is the total this street ("raise to 60"). Zero or a value at
      // or below the current bet means a minimum raise, so a caller that only
      // knows "raise" without sizing still produces a legal bet.
      const raiseTo = amount > this.currentBet
        ? Math.min(amount, seat.streetCommitted + seat.stack)
        : Math.min(this.currentBet + this.minRaise, seat.streetCommitted + seat.stack);
      put = raiseTo - seat.streetCommitted;
      const totalStreet = raiseTo;
      const raisedBy = totalStreet - this.currentBet;
      // A raise is "full" when it clears the current minimum raise. Only a
      // full raise moves the re-raise floor; a short all-in shove does not.
      const isFullRaise = raisedBy >= this.minRaise || seat.stack === put;
      if (isFullRaise) {
        this.lastRaise = Math.max(raisedBy, this.minRaise);
        this.minRaise = Math.max(this.minRaise, this.lastRaise);
        this.lastFullRaiseTo = totalStreet;
      }
      this.currentBet = Math.max(this.currentBet, totalStreet);
      this.lastAggressor = id;
      actionKind = seat.stack === put ? 'allin' : (wasBet ? 'raise' : 'bet');
      this.history.push({
        seat: id,
        kind: seat.stack === put ? 'allin' : 'raise',
        street: this.street,
        amount: put,
        to: totalStreet,
        text: `${seat.name} ${this.currentBet > 0 && raisedBy > 0 ? '加注' : '下注'} ${put}`,
      });
    } else if (kind === 'allin') {
      put = seat.stack;
      const totalStreet = seat.streetCommitted + put;
      if (totalStreet > this.currentBet) {
        const raisedBy = totalStreet - this.currentBet;
        // An incomplete all-in still raises the amount to call, but the next
        // re-raise must still be measured from the last FULL raise level.
        if (raisedBy >= this.minRaise) {
          this.lastRaise = raisedBy;
          this.minRaise = raisedBy;
          this.lastFullRaiseTo = totalStreet;
        }
        this.currentBet = totalStreet;
        this.lastAggressor = id;
      }
      actionKind = 'allin';
      this.history.push({
        seat: id, kind, street: this.street, amount: put, to: totalStreet,
        text: `${seat.name} 全下 ${put}`,
      });
    } else {
      return this.snapshot();
    }

    seat.stack -= put;
    seat.committed += put;
    seat.streetCommitted += put;
    if (seat.stack === 0) seat.allIn = true;
    this.pot += put;
    this.actedThisStreet.add(id);
    // The badge's "to" is the total this street, so a raise reads "加注到 60"
    // rather than the amount added on top of the call.
    seat.lastAction = {
      kind: actionKind,
      amount: put,
      to: seat.streetCommitted,
      street: this.street,
    };

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
   * The big blind keeps its option pre-flop: it opened the betting but has
   * not acted, so it may still check or raise after limps.
   */
  needsToAct(seat, order) {
    if (seat.folded || seat.allIn) return false;
    if (this.lastAggressor === null) return !this.actedThisStreet.has(seat.id);
    // The last aggressor does not owe action only if it has actually acted
    // this street. The big blind "opens" pre-flop without acting, so it keeps
    // the option — this is what used to skip the BB after every limp.
    if (seat.id === this.lastAggressor && this.actedThisStreet.has(seat.id)
      && this.seats[this.lastAggressor].streetCommitted >= this.currentBet) {
      return false;
    }
    if (seat.streetCommitted < this.currentBet) return true;
    return !this.actedThisStreet.has(seat.id);
  }

  nextStreet() {
    const index = STREETS.indexOf(this.street);
    if (index >= STREETS.length - 1) return this.showdown();

    for (const seat of this.seats) {
      seat.streetCommitted = 0;
      seat.lastAction = null;
    }
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.lastRaise = 0;
    this.lastFullRaiseTo = 0;
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
    const totalPot = this.pot;
    const pots = this.buildPots();
    const payouts = new Map();
    for (const seat of this.seats) payouts.set(seat.id, 0);

    for (const pot of pots) {
      // Uncontested hand (everyone folded): the only live seat simply takes
      // every pot it contributed to — there is no showdown to rank.
      if (!evaluated || evaluated.length === 0) {
        const pool = pot.seats.filter((id) => winners.some((w) => w.id === id));
        if (pool.length === 0) continue;
        const share = Math.floor(pot.amount / pool.length);
        let remainder = pot.amount - share * pool.length;
        for (const id of pool) {
          payouts.set(id, payouts.get(id) + share);
          if (remainder > 0) {
            payouts.set(id, payouts.get(id) + 1);
            remainder -= 1;
          }
        }
        continue;
      }
      // Each pot is won by the best showdown hand among the seats eligible
      // for THAT pot. A global winner list cannot do this: a short all-in
      // winning the main pot is not eligible for the side pot above it, and
      // a folded contributor's dead money must go to the best hand that
      // actually reached showdown at that level.
      const contenders = pot.seats
        .map((id) => this.seats[id])
        .filter((s) => !s.folded && s.hole.length === 2 && evaluated?.some((e) => e.seat.id === s.id))
        .map((s) => ({ seat: s, value: evaluated.find((e) => e.seat.id === s.id).value }))
        .sort((a, b) => compareEval(b.value, a.value));
      if (contenders.length === 0) continue;
      const best = contenders[0].value;
      const pool = contenders
        .filter((c) => compareEval(c.value, best) === 0)
        .map((c) => c.seat.id);
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
      // Refunds are the seat's own uncalled chips, not winnings: they must
      // not appear in a winner's payout amount.
      const refund = refunds.get(seat.id) ?? 0;
      if (refund > 0) seat.stack += refund;
    }
    const wonChips = new Map(payouts);
    // Payout winners: every seat that actually received chips, with the
    // per-pot winning hand — not just the global best hand, which a short
    // all-in winning only the main pot would not appear on.
    const payoutWinners = [...wonChips.entries()]
      .filter(([, amount]) => amount > 0)
      .map(([id, amount]) => {
        const seat = this.seats[id];
        const shownEntry = evaluated?.find((e) => e.seat.id === id);
        return {
          id,
          name: seat.name,
          nameKey: seat.nameKey,
          amount,
          hand: shownEntry
            ? categoryText(shownEntry.value.category)
            : seat.hole.length === 2 && this.board.length >= 3
              ? categoryText(evaluate7([...seat.hole, ...this.board]).category)
              : null,
          cards: seat.hole.map(cardText),
        };
      });

    this.phase = 'over';
    this.pot = 0;
    // Detect the endgame when the hand settles, not one hand later: otherwise
    // the player sees a "next hand" button and only discovers the bust after
    // starting a hand that never deals.
    const heroBusted = this.seats[0].stack <= 0;
    const swept = !heroBusted && this.seats.slice(1).every((s) => s.stack <= 0);
    this.result = {
      kind: heroBusted ? 'bust' : swept ? 'sweep' : null,
      winners: payoutWinners,
      pots: pots.map((p) => ({ amount: p.amount, seats: p.seats })),
      board: this.board.map(cardText),
      shown: (evaluated ?? []).map((e) => ({
        name: e.seat.name,
        nameKey: e.seat.nameKey,
        cards: e.seat.hole.map(cardText),
        hand: categoryText(e.value.category),
      })),
    };
    this.publishHand(totalPot);
    // A settled hand must not leave betting chrome behind: no current bet, no
    // chips in front of the seats, no stale action badges.
    this.currentBet = 0;
    for (const seat of this.seats) {
      seat.streetCommitted = 0;
      seat.lastAction = null;
    }
    return this.snapshot();
  }

  /**
   * Publish a plain, self-contained record of the settled hand for the Host's
   * session archive. The table itself never stores history across hands.
   */
  publishHand(totalPot) {
    const hero = this.seats[0];
    const shown = new Map((this.result?.shown ?? []).map((s) => [s.name, s]));
    const heroShown = shown.get(hero.name);
    const heroNet = hero.stack - (this.heroStackAtStart ?? hero.stack);
    this.lastHand = {
      uid: this.handUid,
      at: Date.now(),
      handNumber: this.handNumber,
      startedAt: this.handStartedAt,
      board: this.board.map(cardText),
      pot: totalPot,
      hero: {
        cards: hero.hole.map(cardText),
        net: heroNet,
        stack: hero.stack,
        hand: heroShown?.hand ?? null,
        folded: hero.folded,
      },
      kind: this.result?.kind ?? null,
      winners: (this.result?.winners ?? []).map((w) => ({
        name: w.name,
        nameKey: w.nameKey ?? null,
        amount: w.amount,
        hand: w.hand ?? null,
        cards: w.cards ?? [],
      })),
      shown: (this.result?.shown ?? []).map((s) => ({
        name: s.name,
        nameKey: this.seats.find((seat) => seat.name === s.name)?.nameKey ?? null,
        cards: s.cards,
        hand: s.hand,
      })),
      opponents: this.seats.slice(1).map((s) => {
        const seen = shown.get(s.name);
        return {
          id: s.id,
          name: s.name,
          nameKey: s.nameKey ?? null,
          stack: s.stack,
          folded: s.folded,
          allIn: s.allIn,
          hand: seen?.hand ?? null,
          cards: seen?.cards ?? [],
        };
      }),
      actions: this.history.map((entry) => ({
        seat: entry.seat,
        name: this.seats[entry.seat]?.name ?? '',
        nameKey: this.seats[entry.seat]?.nameKey ?? null,
        kind: entry.kind,
        amount: entry.amount ?? 0,
        to: entry.to ?? null,
        street: entry.street ?? this.street,
        text: entry.text,
      })),
    };
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

  /**
   * Equity of the human seat against the live opponents.
   * Monte-Carlo sampling runs on its own RNG, never on `this.rng`: that one
   * shuffles the deck, so sharing it made the cards dealt depend on how many
   * times the client had polled for state.
   */
  humanEquity(trials = 400) {
    const human = this.seats[0];
    if (human.hole.length !== 2) return null;
    // A folded hero can no longer win this hand: reporting a live win
    // probability would be actively misleading.
    if (human.folded) return null;
    const opponents = Math.max(1, this.liveSeats().filter((s) => s.id !== 0).length);
    return equity(human.hole, this.board, opponents, trials, this.equityRng);
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

    // `min` and `max` are the street TOTAL to raise TO (the number the slider
    // and its "raise to N" label show), matching what `act()` consumes.
    // The minimum re-raise is measured from the last FULL raise level, so an
    // incomplete all-in shove does not inflate it.
    const allInTo = seat.streetCommitted + seat.stack;
    const raiseToFloor = this.lastFullRaiseTo > 0
      ? this.lastFullRaiseTo + this.minRaise
      : Math.max(this.currentBet, this.minRaise);
    const raiseFloor = Math.min(Math.max(raiseToFloor, this.currentBet + 1), allInTo);
    if (seat.stack > callCost) {
      actions.push({
        kind: this.currentBet === 0 ? 'bet' : 'raise',
        label: this.currentBet === 0 ? '下注' : '加注',
        min: raiseFloor,
        max: allInTo,
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
        nameKey: s.nameKey,
        human: s.human,
        stack: s.stack,
        committed: s.committed,
        streetCommitted: s.streetCommitted,
        folded: s.folded,
        allIn: s.allIn,
        cards: s.hole.length === 2
          ? s.hole.map((c) => (s.human || (this.phase === 'over' && !s.folded) ? cardText(c) : null))
          : [],
        lastAction: s.lastAction ? { ...s.lastAction } : null,
      })),
      history: this.history.slice(-12),
      result: this.result,
      legal: this.phase === 'betting' ? this.legalActions(this.toAct) : { actions: [] },
    };
  }
}
