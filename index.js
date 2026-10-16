import { decide } from './lib/ai.js';
import { Table } from './lib/table.js';

/** Route paths shared with the browser half; registered on the Host web server. */
const STATE_ROUTE = '/poker/state';
const ACTION_ROUTE = '/poker/action';
const NEW_HAND_ROUTE = '/poker/new-hand';
const ADVICE_ROUTE = '/poker/advice';

const DEFAULT_CONFIG = {
  stack: 1000,
  smallBlind: 5,
  bigBlind: 10,
  opponents: 3,
  equityTrials: 400,
  adviceMaxTokens: 400,
  /**
   * Opponent "thinking" time, as a multiplier on the built-in bands
   * (a check takes 250-650ms, a hard decision 550-1400ms). 1 is the default
   * pace; 0 removes the pause entirely.
   */
  thinkPace: 1,
};

/**
 * How long one AI "thinks": `factor` scales the whole band, 0 disables pacing.
 * Jitter keeps opponents from answering in lockstep.
 */
function thinkMs(lowMs, highMs, factor) {
  if (!(factor > 0)) return 0;
  return Math.round((lowMs + Math.random() * (highMs - lowMs)) * factor);
}
thinkMs.factor = 1;

/** 1 means the default pacing; 0 disables it; anything else scales the band. */
function pacingFactor(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 1;
  return n;
}


/** Services this plugin needs before it activates. */
export const inject = ['llm', 'agentDefaultModel', 'webServer'];

const SYSTEM_PROMPT = [
  '你是一名资深德州扑克教练，用简体中文回答。',
  '规则：无限注德州扑克，现金桌。',
  '只做教学与策略分析，不鼓励赌博行为。',
  '回答必须简洁：先给一句结论（弃牌/跟注/加注），再用 2-3 句话说明依据（胜率、底池赔率、位置、对手风格）。',
  '不要输出 Markdown 标题或列表符号，直接给一段连贯的中文短评，控制在 120 字以内。',
].join('\n');

export function apply(ctx, rawConfig) {
  const config = { ...DEFAULT_CONFIG, ...(rawConfig ?? {}) };
  // 0 or a negative value turns the pacing off entirely.
  thinkMs.factor = pacingFactor(config.thinkPace);
  let table = new Table({
    seed: (Date.now() & 0x7fffffff) >>> 0,
    opponents: clampInt(config.opponents, 1, 5),
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
  });
  for (const seat of table.seats) seat.stack = clampInt(config.stack, 100, 100000);

  const sendJson = (res, status, payload) => {
    const body = JSON.stringify(payload);
    res.statusCode = status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(body);
  };

  const readBody = async (req) => {
    if (!req || typeof req[Symbol.asyncIterator] !== 'function') return {};
    const chunks = [];
    try {
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
    } catch {
      return {};
    }
    if (chunks.length === 0) return {};
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return {};
    }
  };

  /** One string capturing every fact that makes an action meaningful. */
  const progressKey = () => [
    table.street,
    table.toAct,
    table.currentBet,
    table.pot,
    table.liveSeats().length,
    table.seats.map((s) => s.streetCommitted).join(','),
  ].join('|');

  const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

  /**
   * Let the AI seats act until the turn returns to the human or the hand ends.
   * A seat may legitimately act again (a re-raise, or opening the next street),
   * so progress is measured by the whole betting state, not by seat identity.
   * Each AI pauses before acting, so the browser can show the turn moving around
   * the table instead of every opponent answering at once.
   */
  const runAiUntilHuman = async () => {
    let guard = 0;
    while (table.phase === 'betting' && !table.seats[table.toAct].human) {
      guard += 1;
      if (guard > 200) {
        ctx.logger?.warn?.('poker: AI betting did not settle; folding the acting seat');
        const stuckSeat = table.toAct;
        const acted = table.act(stuckSeat, 'fold');
        if (table.phase === 'betting' && table.toAct === stuckSeat) break;
        if (acted.phase === 'betting' && !table.seats[table.toAct].human) continue;
        break;
      }
      const id = table.toAct;
      const choice = decide(table, id);
      // Thinking time: a tough spot (all-in, big raise, or a close decision)
      // reads as deliberation; a snap check reads as no hand.
      const cost = table.legalActions(id).callCost;
      const hard = cost > table.pot * 0.4 || choice.kind === 'allin' || choice.kind === 'raise';
      await sleep(hard ? thinkMs(550, 1400, thinkMs.factor) : thinkMs(250, 650, thinkMs.factor));
      const before = progressKey();
      table.act(id, choice.kind, choice.amount ?? 0);
      const last = table.history[table.history.length - 1];
      if (last) last.thought = choice.thought;
      if (table.phase === 'betting' && progressKey() === before) break;
    }
  };

  const withState = () => {
    const snapshot = table.snapshot();
    snapshot.equity = table.humanEquity(config.equityTrials);
    return snapshot;
  };

  const route = (path, handler) => ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path,
      handler: async (req, res) => {
        try {
          await handler(req, res);
        } catch (error) {
          sendJson(res, 500, { code: 'internal', message: String(error?.message ?? error) });
        }
      },
    }),
    `poker: ${path}`,
  );

  route(STATE_ROUTE, async (req, res) => {
    sendJson(res, 200, withState());
  });

  route(NEW_HAND_ROUTE, async (req, res) => {
    await readBody(req);
    // A live table plays the next hand on the same chips — that is what a cash
    // game is. Only an endgame (busted, swept, or unfundable) deals a fresh
    // table, so losing a hand no longer resets every stack to the start.
    if (table.result?.kind) {
      const seed = (Date.now() & 0x7fffffff) >>> 0;
      table = new Table({
        seed,
        opponents: clampInt(config.opponents, 1, 5),
        smallBlind: config.smallBlind,
        bigBlind: config.bigBlind,
      });
      for (const seat of table.seats) seat.stack = clampInt(config.stack, 100, 100000);
    }
    table.startHand();
    await runAiUntilHuman();
    sendJson(res, 200, withState());
  });

  route(ACTION_ROUTE, async (req, res) => {
    const body = await readBody(req);
    const kind = String(body.kind ?? '');
    const amount = Number.isFinite(body.amount) ? Number(body.amount) : 0;
    if (table.phase === 'over') {
      table.startHand();
      await runAiUntilHuman();
      sendJson(res, 200, withState());
      return;
    }
    if (table.phase !== 'betting' || table.toAct !== 0) {
      sendJson(res, 409, { code: 'not-your-turn', message: '现在不是你的行动时机' });
      return;
    }
    table.act(0, kind, amount);
    await runAiUntilHuman();
    sendJson(res, 200, withState());
  });

  route(ADVICE_ROUTE, async (req, res) => {
    const body = await readBody(req);
    const snapshot = withState();
    const summary = describeForCoach(table, snapshot, config);
    const fallback = heuristicAdvice(table, snapshot);
    let advice = fallback.text;
    let source = 'heuristic';
    let coachError = null;
    // A settled hand has no decision to coach, so skip the model call.
    if (table.phase === 'betting' && table.toAct === 0) {
      try {
        const generated = await askCoach(ctx, summary, config);
        if (generated) {
          advice = generated;
          source = 'llm';
        } else {
          coachError = 'no default model configured';
        }
      } catch (caught) {
        coachError = String(caught?.message ?? caught);
        ctx.logger?.warn?.(`poker: coach failed: ${coachError}`);
      }
    }
    sendJson(res, 200, { advice, source, summary, error: coachError, equity: snapshot.equity });
  });

  // A hand is ready as soon as the plugin mounts; the opponent's reply may
  // arrive after the mount, so the first state read can show it still deciding.
  table.startHand();
  void runAiUntilHuman();
}

function clampInt(value, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Build the compact Chinese situation report the coach reads. */
function describeForCoach(table, snapshot, config) {
  const human = table.seats[0];
  const board = table.board.length;
  const streetName = { preflop: '翻牌前', flop: '翻牌', turn: '转牌', river: '河牌' }[table.street];
  const legal = snapshot.legal;
  const callCost = legal.callCost ?? 0;
  const pct = (v) => `${Math.round(v * 100)}%`;

  const lines = [
    `阶段：${streetName}（公共牌 ${board} 张）`,
    `你的手牌：${human.hole.map(cardName).join(' ')}`,
    table.board.length ? `公共牌：${table.board.map(cardName).join(' ')}` : '公共牌：无',
    `底池：${table.pot}，当前下注：${table.currentBet}，你需要跟注：${callCost}`,
    `你的筹码：${human.stack}，已投入：${human.committed}`,
  ];
  if (snapshot.equity) {
    lines.push(`估算胜率：${pct(snapshot.equity.win)}（平局 ${pct(snapshot.equity.tie)}）`);
  }
  if (callCost > 0) {
    lines.push(`底池赔率：${pct(callCost / (table.pot + callCost))}`);
  }
  lines.push(`对手（${table.seats.length - 1} 位）：${
    table.seats.slice(1).map((s) => `${s.name}${s.folded ? '已弃牌' : s.allIn ? '全下' : `筹码${s.stack}`}`).join('，')
  }`);
  lines.push(`可选动作：${legal.actions.map((a) => a.label).join(' / ')}`);
  return lines.join('\n');
}

function cardName(card) {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['♣', '♦', '♥', '♠'];
  return `${ranks[card % 13]}${suits[(card / 13) | 0]}`;
}

/** Rule-based advice, used when no model is reachable. */
function heuristicAdvice(table, snapshot) {
  const legal = snapshot.legal;
  const callCost = legal.callCost ?? 0;
  const equity = snapshot.equity ? snapshot.equity.win + snapshot.equity.tie / 2 : 0;
  const potOdds = callCost > 0 ? callCost / (table.pot + callCost) : 0;
  const pct = (v) => `${Math.round(v * 100)}%`;

  if (table.phase === 'over') {
    return { text: '本局已结束，点击「下一手」开始新的一手牌。' };
  }
  if (callCost === 0) {
    if (equity > 0.6) return { text: `胜率 ${pct(equity)} 很强，建议下注或加注建立价值。` };
    if (equity > 0.4) return { text: `胜率 ${pct(equity)} 中等，可以小额下注试探，也可以过牌控制底池。` };
    return { text: `胜率 ${pct(equity)} 偏低，建议过牌，免费看下一张牌。` };
  }
  const ev = equity - potOdds;
  if (ev > 0.15) {
    return { text: `胜率 ${pct(equity)} 高于底池赔率 ${pct(potOdds)}，建议跟注；牌力很强时可以考虑加注。` };
  }
  if (ev > -0.03) {
    return { text: `胜率 ${pct(equity)} 与底池赔率 ${pct(potOdds)} 接近，跟注勉强可行，但注意位置与对手风格。` };
  }
  return { text: `胜率 ${pct(equity)} 低于底池赔率 ${pct(potOdds)}，建议弃牌，不要被底池套住。` };
}

/**
 * Candidate model routes, most preferred first: the configured default, then
 * every other registered provider. A route without credentials fails at the
 * provider, so trying the next one keeps coaching available on any setup.
 */
function candidateRoutes(ctx) {
  const routes = [];
  const seen = new Set();
  const push = (provider, model) => {
    if (typeof provider !== 'string' || provider.length === 0) return;
    if (typeof model !== 'string' || model.length === 0) return;
    const key = `${provider}\u0000${model}`;
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({ provider, model });
  };

  const selection = ctx.agentDefaultModel?.currentSelection?.();
  if (selection) push(selection.provider, selection.model);

  let providers = [];
  try {
    providers = ctx.llm.listProviders?.() ?? [];
  } catch {
    providers = [];
  }
  for (const info of providers) push(info?.id ?? info?.provider, selection?.model);
  return routes;
}

/**
 * One-shot model call. Streams chunks and assembles the text without importing
 * the LLM package, so the bundle carries no dependency on it.
 */
async function askCoach(ctx, summary, config) {
  const routes = candidateRoutes(ctx);
  if (routes.length === 0) return null;

  let lastError = null;
  for (const route of routes) {
    try {
      const text = await streamOnce(ctx, route, summary, config);
      if (text) return text;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return null;
}

/** Stream one provider attempt and return its assembled text. */
async function streamOnce(ctx, route, summary, config) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let text = '';
  let failure = null;
  try {
    for await (const chunk of ctx.llm.stream({
      provider: route.provider,
      model: route.model,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [{ type: 'text', text: summary }] }],
      maxTokens: config.adviceMaxTokens,
      temperature: 0.6,
      signal: controller.signal,
    })) {
      if (chunk?.type === 'text-delta') text += chunk.text ?? '';
      else if (chunk?.type === 'finish' && chunk.reason?.kind !== 'stop') {
        failure = chunk.reason?.failure?.message ?? chunk.reason?.kind ?? 'unknown';
      }
    }
  } finally {
    clearTimeout(timer);
  }
  if (failure) throw new Error(`${route.provider}: ${failure}`);
  return text.trim() || null;
}
