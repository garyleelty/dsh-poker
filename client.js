window.__ModuleLoader__.load({
  id: 'dsh-texas-poker',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PANEL_ID = 'texas-poker';
    const NS = 'texasPoker';

    const CSS = `
    /* The panel lives in a flex column, where auto side margins would make this
       item shrink-to-fit and let growing numbers (pot, hand count) widen the
       whole panel. width:100% pins it to the column; the cap only keeps a wide
       monitor from stretching five seats across the whole screen. */
    .pk-page{
      /* The panel is the query container, so the table scales with the space it
         actually has: collapsing the sidebar widens the table instead of
         leaving it sized for a window it no longer fills. */
      container-type:inline-size;
      width:100%;max-width:min(100%, 1100px);margin:0 auto;box-sizing:border-box;
      min-width:0;padding:16px 20px 28px;display:flex;flex-direction:column;gap:12px;
      overflow:hidden;
      /* Responsive scale: every table dimension derives from these, so the whole
         board grows on a large screen and shrinks on a small one — driven by the
         available width, never by the content, which is what kept it stable. */
      --pk-card-w: clamp(24px, 2.5vw, 40px);
      --pk-card-h: calc(var(--pk-card-w) * 1.34);
      --pk-board-w: calc(var(--pk-card-w) * 1.06);
      --pk-board-h: calc(var(--pk-card-h) * 1.07);
      /* Seat height is exactly its parts: 2px of border + padding 17 + top 16 +
         stack 16 + cards + hand 13 + bet 14 + four 4px gaps. The felt then
         reserves the seat plus the board plus the same slack as before. */
      --pk-seat-h: calc(var(--pk-card-h) + 94px);
      --pk-felt-min: calc(var(--pk-seat-h) + var(--pk-board-h) + 141px);
      --pk-fs-sm: clamp(10px, 0.85vw, 12.5px);
      --pk-fs-md: clamp(11.5px, 0.95vw, 13px);
    }
    /* Panel-relative scale for engines that support container queries: 3.6cqw
       reproduces the original 32px card at a ~900px panel and tops out at 40px
       on a wide one. Kept behind @supports because an unsupported cqw unit
       would make every width that uses these variables fall back to auto. */
    @supports (width: 1cqw){
      /* The whole set is repeated here, not just --pk-card-w: a custom property
         is substituted on the element that declares it, so the derived values
         would otherwise still be computed from the .pk-page fallback and the
         card would come out the wrong shape. */
      .pk-root{
        --pk-card-w: clamp(24px, 3.6cqw, 40px);
        --pk-card-h: calc(var(--pk-card-w) * 1.34);
        --pk-board-w: calc(var(--pk-card-w) * 1.06);
        --pk-board-h: calc(var(--pk-card-h) * 1.07);
        --pk-seat-h: calc(var(--pk-card-h) + 94px);
        --pk-felt-min: calc(var(--pk-seat-h) + var(--pk-board-h) + 141px);
        --pk-fs-sm: clamp(10px, 1.15cqw, 12.5px);
        --pk-fs-md: clamp(11.5px, 1.25cqw, 13px);
      }
    }
    /* One line always: growing numbers ("第 100 手") must not push the bar into
       a second row, which would change the page height mid-session. */
    .pk-topbar{display:flex;align-items:center;gap:12px;flex-wrap:nowrap;min-width:0;height:26px;overflow:hidden}
    .pk-brand{display:flex;align-items:baseline;gap:8px;min-width:0;flex:none}
    .pk-brand__title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap}
    .pk-handno{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
    .pk-steps{display:flex;gap:4px;margin-left:2px;flex:none}
    .pk-step{font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);letter-spacing:.02em;white-space:nowrap}
    .pk-step--on{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
    .pk-step--done{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
    .pk-blinds{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;flex:none}
    .pk-spacer{flex:1 1 auto;min-width:0}
    /* Every content row fills the page width instead of sizing to its text. */
    .pk-root{width:100%;min-width:0;display:flex;flex-direction:column;gap:12px}

    /* Felt */
    /* The table never resizes: every region that changes during a hand has its
       space reserved up front, so nothing jumps between streets. */
    .pk-felt{position:relative;border-radius:20px;padding:56px 20px 20px;min-height:var(--pk-felt-min);background:
      radial-gradient(ellipse 100% 74% at 50% 34%, color-mix(in srgb, var(--dsw-alias-brand-primary) 20%, transparent) 0%, transparent 72%),
      var(--dsw-alias-bg-layer-2);
      border:1px solid var(--dsw-alias-border-l1);box-shadow:inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent)}
    .pk-felt::after{content:"";position:absolute;inset:14px;border-radius:14px;border:1px dashed color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);pointer-events:none}

    .pk-board{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:6px}
    .pk-board__label{font-size:var(--pk-fs-sm);letter-spacing:.14em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
    .pk-board__cards{display:flex;gap:6px;height:var(--pk-board-h)}
    .pk-potchip{display:inline-flex;align-items:center;gap:6px;margin-top:2px;height:18px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
    .pk-chipdot{width:9px;height:9px;border-radius:50%;background:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}

    /* One row of equal columns; the runtime inline style sets the column count
       from the seat total. minmax(0,1fr) lets seats shrink instead of forcing
       the felt wider when the column count is high. */
    .pk-seats{position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:8px;margin-top:14px;width:100%;min-width:0}
    /* Fixed height = padding 17 + top 16 + stack 16 + cards 43 + hand 13 + bet 14
       + four 4px gaps. Every part is itself fixed, so the seat never resizes. */
    .pk-seat{position:relative;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 82%, transparent);padding:8px 9px 9px;height:var(--pk-seat-h);box-sizing:border-box;display:flex;flex-direction:column;gap:4px;align-items:center;transition:border-color .15s, box-shadow .15s, opacity .2s}
    .pk-seat--me{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, var(--dsw-alias-bg-layer-1))}
    .pk-seat--active{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary), 0 0 14px -4px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent)}
    .pk-seat--folded{opacity:.42}
    .pk-seat--won{border-color:var(--dsw-alias-state-success-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-success-primary), 0 0 16px -4px color-mix(in srgb, var(--dsw-alias-state-success-primary) 65%, transparent)}
    .pk-seat__hand{height:13px;line-height:13px;font-size:10px;font-weight:600;color:var(--dsw-alias-state-success-primary);letter-spacing:.02em}
    .pk-seat__top{display:flex;align-items:center;gap:5px;width:100%;height:16px}
    .pk-seat__pos{font-size:9px;line-height:14px;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);border-radius:4px;padding:0 3px;flex:none}
    .pk-seat__name{font-size:var(--pk-fs-md);line-height:16px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
    .pk-seat__dealer{font-size:9px;border-radius:50%;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base);width:13px;height:13px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex:none}
    .pk-seat__tag{font-size:8.5px;letter-spacing:.04em;padding:0 4px;border-radius:4px;background:color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);color:var(--dsw-alias-label-secondary);flex:none}
    .pk-seat__tag--allin{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 24%, transparent);color:var(--dsw-alias-state-warn-primary)}
    .pk-seat__tag--out{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 22%, transparent);color:var(--dsw-alias-state-error-primary)}
    .pk-seat__stack{height:16px;line-height:16px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
    .pk-seat__cards{display:flex;gap:4px;height:var(--pk-card-h)}
    .pk-seat__bet{display:inline-flex;align-items:center;gap:4px;height:14px;line-height:14px;font-size:10.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
    .pk-betchip{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);flex:none}
    .pk-timer{position:absolute;left:9px;right:9px;bottom:3px;height:2px;border-radius:2px;background:color-mix(in srgb, var(--dsw-alias-brand-primary) 85%, transparent);transform-origin:left;animation:pk-timer 12s linear forwards}
    @keyframes pk-timer{from{transform:scaleX(0)}to{transform:scaleX(1)}}

    /* Cards */
    /* border-box: the hairline border counts inside the card's box, so a card is
       exactly --pk-card-h tall and the seat's fixed parts still sum exactly
       (otherwise the 2px of border makes the flex column shrink the text rows). */
    .pk-card{position:relative;box-sizing:border-box;width:var(--pk-card-w);height:var(--pk-card-h);border-radius:5px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);display:inline-flex;flex-direction:column;align-items:center;justify-content:center;font-size:calc(var(--pk-card-w) * 0.39);line-height:1.05;color:var(--dsw-alias-label-primary);font-weight:600;user-select:none}
    .pk-card--red{color:var(--dsw-alias-state-error-primary)}
    .pk-card__suit{font-size:calc(var(--pk-card-w) * 0.375)}
    .pk-card--down,.pk-card--hidden{opacity:.4}
    .pk-card--hidden{background:repeating-linear-gradient(45deg,color-mix(in srgb, var(--dsw-alias-brand-primary) 26%, transparent) 0 4px,transparent 4px 8px),var(--dsw-alias-bg-layer-1)}
    .pk-card--deal{animation:pk-deal .26s ease-out both}
    @keyframes pk-deal{from{transform:translateY(-10px) rotate(-4deg);opacity:0}to{transform:none;opacity:1}}
    /* Board cards and the empty placeholders are the same box, so revealing a
       card never changes the row's width. */
    .pk-card--board,.pk-card--down.pk-card--board{width:var(--pk-board-w);height:var(--pk-board-h)}

    /* Coach / info strip */
    /* Four tiles on one row: they share the width instead of wrapping to a
       second row, which would change the panel's height at narrow sizes. */
    .pk-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .pk-stat{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:7px 11px;min-width:0;height:58px;box-sizing:border-box;overflow:hidden}
    .pk-stat__k{font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
    .pk-stat__v{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;margin-top:1px}
    .pk-meter{height:3px;border-radius:3px;background:color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);margin-top:6px;overflow:hidden}
    .pk-meter__fill{height:100%;background:var(--dsw-alias-brand-primary);border-radius:3px;transition:width .3s}
    /* Coach action: a filled accent button, the one call-to-action on the page. */
    .pk-coachbtn{
      box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;
      height:36px;padding:0 16px;border:0.5px solid transparent;border-radius:var(--dsw-radius-md);
      background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary));
      color:var(--dsw-alias-label-primary-foreground,#fff);
      font-size:13px;font-weight:600;line-height:1;letter-spacing:-0.01em;
      cursor:pointer;white-space:nowrap;flex:none;-webkit-font-smoothing:antialiased;
      transition:background-color .12s ease-out, transform .06s ease-out, opacity .12s ease-out;
    }
    .pk-coachbtn:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary))}
    .pk-coachbtn:active:not(:disabled){transform:scale(.97)}
    .pk-coachbtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
    .pk-coachbtn:disabled{cursor:not-allowed;opacity:.4}

    /* History */
    .pk-history{display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:var(--dsw-alias-label-secondary);height:114px;overflow:hidden}
    .pk-history__row{display:flex;gap:5px;align-items:baseline;height:16px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pk-history__row--empty{visibility:hidden}
    .pk-history__dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex:none;transform:translateY(-1px)}
    .pk-history__dot--me{background:var(--dsw-alias-brand-primary)}
    .pk-history__thought{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-style:normal;opacity:.9;overflow:hidden;text-overflow:ellipsis}

    /* Controls — buttons follow the host's own Button primitives: the shared
       radius scale, 0.5px hairline strokes, and a real :active press state.
       Transitions use a short ease-out so a tap feels immediate, not animated. */
    .pk-actions{display:flex;flex-wrap:nowrap;gap:8px;align-items:center;height:36px}
    .pk-btn{
      box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;
      height:36px;padding:0 16px;border:0.5px solid var(--dsw-alias-border-l2);
      border-radius:var(--dsw-radius-md);
      background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);
      font-size:13px;font-weight:500;line-height:1;letter-spacing:-0.01em;
      cursor:pointer;white-space:nowrap;flex:none;
      -webkit-font-smoothing:antialiased;
      transition:background-color .12s ease-out, border-color .12s ease-out,
                 transform .06s ease-out, opacity .12s ease-out;
    }
    .pk-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent))}
    /* A small inset on press is the whole "feels physical" trick. */
    .pk-btn:active:not(:disabled){transform:scale(.97);background:var(--dsw-alias-interactive-bg-active,color-mix(in srgb, var(--dsw-alias-label-primary) 11%, transparent))}
    .pk-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
    .pk-btn:disabled{cursor:not-allowed;opacity:.4}
    /* Filled primary: the host's own primary fill, with its foreground colour. */
    .pk-btn--primary{
      border-color:transparent;
      background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary));
      color:var(--dsw-alias-label-primary-foreground,#fff);
      font-weight:600;
    }
    .pk-btn--primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary))}
    .pk-btn--primary:active:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary))}
    /* Destructive stays outlined: a red fill would shout for a routine fold. */
    .pk-btn--danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent)}
    .pk-btn--danger:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 9%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent)}
    .pk-btn--ghost{border-color:transparent;background:transparent;font-weight:400}
    .pk-actions__wait{font-size:12.5px;color:var(--dsw-alias-label-secondary)}
    /* One fixed-height slot for the whole control area. Its contents are a
       fixed two-row stack (action buttons 36px, then the raise panel 73px with
       an 8px gap = 117px), never a wrapping row: height must not depend on the
       available width, or collapsing the sidebar / showing a scrollbar would
       resize the table. */
    .pk-actionbar{height:121px;display:flex;align-items:center;overflow:hidden}
    .pk-actionbar>*{width:100%}
    .pk-controls{display:grid;grid-template-rows:36px 73px;gap:8px;align-content:center;height:117px}
    .pk-controlrow{display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden}
    .pk-actions--thinking{align-items:center;gap:8px}
    .pk-dots{display:inline-flex;gap:3px}
    .pk-dots span{width:4px;height:4px;border-radius:50%;background:var(--dsw-alias-brand-primary);opacity:.35;animation:pk-dot 1.05s ease-in-out infinite}
    .pk-dots span:nth-child(2){animation-delay:.16s}
    .pk-dots span:nth-child(3){animation-delay:.32s}
    @keyframes pk-dot{0%,100%{opacity:.25;transform:translateY(0)}45%{opacity:1;transform:translateY(-3px)}}
    .pk-raisebox{display:flex;align-items:center;gap:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:8px 10px;height:73px;box-sizing:border-box;min-width:0}
    .pk-raisebox--empty{border-color:transparent;background:transparent}
    .pk-raisescale{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
    .pk-raiseval{display:flex;justify-content:space-between;font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
    .pk-raiseval b{color:var(--dsw-alias-label-primary);font-size:13px}
    input[type=range].pk-slider{width:100%;accent-color:var(--dsw-alias-brand-primary)}
    /* Quick-bet chips: small outlined controls, the host's compact radius. */
    .pk-quick{display:flex;gap:4px}
    .pk-quick button{
      box-sizing:border-box;height:22px;padding:0 8px;
      border:0.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);
      background:transparent;color:var(--dsw-alias-label-secondary);
      font-size:11px;font-weight:500;line-height:1;letter-spacing:-0.01em;
      cursor:pointer;white-space:nowrap;
      transition:background-color .12s ease-out, color .12s ease-out, transform .06s ease-out;
    }
    .pk-quick button:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent));color:var(--dsw-alias-label-primary)}
    .pk-quick button:active{transform:scale(.96)}

    /* Result overlay */
    /* Fixed two-line banner (verdict + detail, then the next-hand button), never
       a wrapping row: the settled state must not change width with its text. */
    .pk-result{height:121px;box-sizing:border-box;border-radius:12px;border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, var(--dsw-alias-bg-layer-1));padding:12px 14px;display:flex;flex-direction:column;justify-content:center;gap:8px;overflow:hidden;animation:pk-pop .22s ease-out}
    .pk-result__line{display:flex;align-items:center;gap:12px;min-width:0}
    .pk-result__line span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    @keyframes pk-pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .pk-result__verdict{font-size:14px;font-weight:600}
    .pk-result__verdict--win{color:var(--dsw-alias-state-success-primary)}
    .pk-result__verdict--lose{color:var(--dsw-alias-state-error-primary)}
    .pk-result__detail{font-size:12px;color:var(--dsw-alias-label-secondary)}
    /* Fixed slot: the advice box scrolls internally instead of growing the page. */
    .pk-adviceslot{min-height:104px}
    .pk-advice{height:104px;box-sizing:border-box;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);padding:11px 13px;overflow:auto}
    .pk-advice__head{display:flex;align-items:center;gap:8px;margin-bottom:5px}
    .pk-advice__label{font-size:11px;font-weight:600;color:var(--dsw-alias-brand-primary)}
    .pk-advice__who{font-size:9.5px;padding:0 5px;border-radius:4px;background:color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);color:var(--dsw-alias-label-secondary)}
    .pk-advice__text{margin:0;font-size:13px;line-height:1.65;color:var(--dsw-alias-label-primary)}
    .pk-advice--busy{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--dsw-alias-label-secondary)}
    /* Reserves the loaded layout's footprint so the first fetch does not make
       the panel jump from a short message to a full table. */
    .pk-empty{padding:24px;min-height:calc(var(--pk-felt-min) + 318px);box-sizing:border-box;color:var(--dsw-alias-label-secondary);font-size:13px}
    `;


    const dict = {
      zh: {
        panel: '德州扑克',
        'title.coach': 'AI 教练',
        'hand.no': '第 {n} 手',
        'street.preflop': '翻牌前',
        'street.flop': '翻牌',
        'street.turn': '转牌',
        'street.river': '河牌',
        'street.showdown': '摊牌',
        'pot': '底池',
        'your.cards': '你的手牌',
        'board': '公共牌',
        'stack': '筹码',
        'action.fold': '弃牌',
        'action.check': '过牌',
        'action.call': '跟注',
        'action.raise': '加注',
        'action.allin': '全下',
        'advice.ask': '问 AI 教练',
        'advice.asking': '思考中…',
        'advice.fromLlm': 'AI 建议',
        'advice.fromHeuristic': '规则建议',
        'next.hand': '下一手',
        'equity': '胜率',
        'waiting': '等待其他玩家…',
        'result.win': '你赢了 {amount}',
        'result.lose': '本局结束',
        'new.hand': '开始新的一手',
        'raise.amount': '加注额',
        'confirm': '确定',
        'cancel': '取消',
        'error.load': '无法连接到牌桌服务',
        'pos.btn': '庄',
        'pos.sb': '小盲',
        'pos.bb': '大盲',
        'pos.utg': '前位',
        'pos.late': '后位',
        'potodds': '底池赔率',
        'tocall': '需跟注',
        currentbet: '当前注',
        'street.preflop.short': '翻前',
        'street.flop.short': '翻牌',
        'street.turn.short': '转牌',
        'street.river.short': '河牌',
        'street.showdown.short': '摊牌',
        'result.you.win': '你拿下这一手 +{amount}',
        'result.you.lose': '这一手落空',
        'result.detail': '{name} 以 {hand} 胜出',
        'result.you.hand': '你拿到 {hand}',
        'result.others': '对手牌型：',
        'raise.to': '加到 {amount}',
        'raise.quick.half': '1/2 池',
        'raise.quick.pot': '满池',
        'raise.quick.max': '全下',
        thinking: '对手正在思考…',
        'coach.by': 'AI 教练',
        'coach.rules': '规则引擎',
        toact: '你的回合',
      },
      en: {
        panel: 'Texas Hold’em',
        'title.coach': 'AI Coach',
        'hand.no': 'Hand {n}',
        'street.preflop': 'Pre-flop',
        'street.flop': 'Flop',
        'street.turn': 'Turn',
        'street.river': 'River',
        'street.showdown': 'Showdown',
        pot: 'Pot',
        'your.cards': 'Your hand',
        board: 'Board',
        stack: 'Stack',
        'action.fold': 'Fold',
        'action.check': 'Check',
        'action.call': 'Call',
        'action.raise': 'Raise',
        'action.allin': 'All-in',
        'advice.ask': 'Ask AI coach',
        'advice.asking': 'Thinking…',
        'advice.fromLlm': 'AI advice',
        'advice.fromHeuristic': 'Rule-based advice',
        'next.hand': 'Next hand',
        equity: 'Equity',
        waiting: 'Waiting for other players…',
        'result.win': 'You won {amount}',
        'result.lose': 'Hand complete',
        'new.hand': 'Start a new hand',
        'raise.amount': 'Raise to',
        confirm: 'Confirm',
        cancel: 'Cancel',
        'error.load': 'Cannot reach the table service',
        'pos.btn': 'BTN',
        'pos.sb': 'SB',
        'pos.bb': 'BB',
        'pos.utg': 'EP',
        'pos.late': 'LP',
        'potodds': 'Pot odds',
        'tocall': 'To call',
        currentbet: 'Current bet',
        'street.preflop.short': 'Pre',
        'street.flop.short': 'Flop',
        'street.turn.short': 'Turn',
        'street.river.short': 'River',
        'street.showdown.short': 'Show',
        'result.you.win': 'You win this hand +{amount}',
        'result.you.lose': 'Hand lost',
        'result.detail': '{name} wins with {hand}',
        'result.you.hand': 'you had {hand}',
        'result.others': 'Hands: ',
        'raise.to': 'Raise to {amount}',
        'raise.quick.half': '1/2 pot',
        'raise.quick.pot': 'Pot',
        'raise.quick.max': 'Max',
        thinking: 'Opponents are thinking…',
        'coach.by': 'AI coach',
        'coach.rules': 'Rules engine',
        toact: 'Your turn',
      },
    };

    const SUIT_GLYPH = { c: '♣', d: '♦', h: '♥', s: '♠' };
    const RED = new Set(['d', 'h']);

    /** "Ah" -> { rank: 'A', suit: 'h' } */
    function parseCard(text) {
      if (!text || typeof text !== 'string') return null;
      const suit = text.slice(-1);
      const rank = text.slice(0, -1);
      return { rank, suit, glyph: SUIT_GLYPH[suit] ?? suit, red: RED.has(suit) };
    }

    function Card({ value, faceDown, board, deal }) {
      if (!value) {
        // An empty board slot keeps the board class, so it is the same box as a
        // real board card and revealing one never widens the row.
        return h('span', { className: 'pk-card pk-card--down' + (board ? ' pk-card--board' : '') });
      }
      if (faceDown) return h('span', { className: 'pk-card pk-card--hidden' });
      const card = parseCard(value);
      if (!card) return h('span', { className: 'pk-card pk-card--down' });
      return h(
        'span',
        {
          className: 'pk-card'
            + (card.red ? ' pk-card--red' : '')
            + (board ? ' pk-card--board' : '')
            + (deal ? ' pk-card--deal' : ''),
          'aria-label': value,
        },
        h('span', { className: 'pk-card__rank' }, card.rank),
        h('span', { className: 'pk-card__suit' }, card.glyph),
      );
    }

    /** Blinds-based position label, the way a real table seats you. */
    function positionOf(seat, state, t) {
      const n = state.seats.length;
      if (state.dealer === seat.id) return t('pos.btn');
      if (n === 2) return state.dealer === (seat.id + 1) % 2 ? t('pos.bb') : t('pos.sb');
      const after = (state.dealer + 1) % n;
      const before = (state.dealer + n - 1) % n;
      if (seat.id === after) return t('pos.sb');
      if (seat.id === before) return t('pos.bb');
      if (seat.id === (after + 1) % n) return t('pos.utg');
      return t('pos.late');
    }

    function Seat({ seat, active, dealer, state, t, won, handName }) {
      const cards = seat.cards ?? [];
      const faceDown = !seat.human && cards.every((c) => c === null);
      const busted = seat.stack === 0 && seat.committed === 0;
      const tag = seat.stack === 0 && seat.committed > 0 ? 'allin'
        : busted ? 'out' : null;
      return h(
        'div',
        {
          className: 'pk-seat'
            + (active ? ' pk-seat--active' : '')
            + (seat.folded ? ' pk-seat--folded' : '')
            + (seat.human ? ' pk-seat--me' : '')
            + (won ? ' pk-seat--won' : ''),
        },
        h(
          'div',
          { className: 'pk-seat__top' },
          h('span', { className: 'pk-seat__pos' }, positionOf(seat, state, t)),
          h('span', { className: 'pk-seat__name' }, seat.name),
          dealer ? h('span', { className: 'pk-seat__dealer', title: t('pos.btn') }, 'D') : null,
          tag === 'allin' ? h('span', { className: 'pk-seat__tag pk-seat__tag--allin' }, 'ALL-IN') : null,
          tag === 'out' ? h('span', { className: 'pk-seat__tag pk-seat__tag--out' }, 'OUT') : null,
        ),
        h('div', { className: 'pk-seat__stack' }, String(seat.stack)),
        h(
          'div',
          { className: 'pk-seat__cards' },
          cards.length
            ? cards.map((c, i) => h(Card, { key: i, value: c, faceDown }))
            : h(Card, { value: null }),
        ),
        // Always rendered, even when empty, so the seat keeps one fixed height.
        h(
          'div',
          { className: 'pk-seat__hand' },
          handName ?? '',
        ),
        h(
          'div',
          { className: 'pk-seat__bet' },
          seat.streetCommitted > 0
            ? [h('span', { key: 'c', className: 'pk-betchip' }), String(seat.streetCommitted)]
            : null,
        ),
        active ? h('div', { className: 'pk-timer', key: `tm-${state.street}` }) : null,
      );
    }

    /** Street progress rail, as a real table implies the round you are on. */
    function StreetRail({ state, t }) {
      const order = ['preflop', 'flop', 'turn', 'river'];
      const at = order.indexOf(state.street);
      return h(
        'div',
        { className: 'pk-steps' },
        order.map((street, i) => h(
          'span',
          {
            key: street,
            className: 'pk-step'
              + (i === at ? ' pk-step--on' : i < at ? ' pk-step--done' : ''),
          },
          t(`street.${street}.short`),
        )),
      );
    }

    /** The felt: board, pot, and every seat. */
    function Felt({ state, t }) {
      const board = state.board ?? [];
      const cards = board.map((c, i) => h(Card, { key: c + i, value: c, board: true, deal: true }));
      // Placeholders carry the board class too, so an empty slot is exactly the
      // size of a real card and the row never widens as cards appear.
      while (cards.length < 5) cards.push(h(Card, { key: `empty-${cards.length}`, value: null, board: true }));
      // At showdown the Host reveals every shown hand with its made hand type;
      // use that to mark the pot winner and label what each seat actually held.
      const shown = new Map((state.result?.shown ?? []).map((s) => [s.name, s.hand]));
      const winners = new Set((state.result?.winners ?? []).map((w) => w.name));
      const over = state.phase === 'over';
      return h(
        'div',
        { className: 'pk-felt' },
        h(
          'div',
          { className: 'pk-board' },
          h('div', { className: 'pk-board__label' }, t('board')),
          h('div', { className: 'pk-board__cards' }, cards),
          h(
            'span',
            { className: 'pk-potchip' },
            h('span', { className: 'pk-chipdot' }),
            `${t('pot')} ${state.pot}`,
          ),
        ),
        h(
          'div',
          {
            className: 'pk-seats',
            // One row for every seat, regardless of panel width: the table must
            // not reflow to a second row and change the felt's height.
            style: { gridTemplateColumns: `repeat(${Math.max(1, state.seats.length)}, minmax(0, 1fr))` },
          },
          state.seats.map((seat) => h(Seat, {
            key: seat.id,
            seat,
            state,
            t,
            active: state.toAct === seat.id,
            dealer: state.dealer === seat.id,
            won: over && winners.has(seat.name),
            handName: over ? shown.get(seat.name) ?? null : null,
          })),
        ),
      );
    }

    /** Equity / pot-odds readout with a bar, the numbers a player actually uses. */
    function StatStrip({ state, t }) {
      const eq = state.equity;
      const pct = eq ? Math.round((eq.win + eq.tie / 2) * 100) : null;
      const odds = state.legal && state.legal.callCost > 0
        ? Math.round(state.legal.potOdds * 100)
        : null;
      const tile = (key, value, extra) => h(
        'div',
        { className: 'pk-stat', key: key },
        h('div', { className: 'pk-stat__k' }, t(key)),
        h('div', { className: 'pk-stat__v' }, value),
        extra ?? null,
      );
      return h(
        'div',
        { className: 'pk-strip' },
        tile('equity', pct === null ? '—' : `${pct}%`,
          pct === null ? null : h('div', { className: 'pk-meter' },
            h('div', { className: 'pk-meter__fill', style: { width: `${pct}%` } }))),
        odds === null
          ? tile('tocall', '—')
          : tile('potodds', `${odds}%`, h('div', { className: 'pk-meter' },
            h('div', { className: 'pk-meter__fill', style: { width: `${odds}%` } }))),
        tile('pot', String(state.pot)),
        tile('currentbet', String(state.currentBet ?? 0)),
      );
    }

    /**
     * Action log with AI reasoning shown inline. Six rows are always laid out
     * (blank when unused) so the panel keeps one height as the hand progresses.
     */
    function History({ state, t }) {
      const rows = (state.history ?? []).slice(-6);
      const padded = rows.slice();
      while (padded.length < 6) padded.push(null);
      return h(
        'div',
        { className: 'pk-history' },
        padded.map((entry, i) => h(
          'span',
          { key: i, className: 'pk-history__row' + (entry ? '' : ' pk-history__row--empty') },
          entry
            ? [
              h('span', {
                key: 'd',
                className: 'pk-history__dot' + (entry.seat === 0 ? ' pk-history__dot--me' : ''),
              }),
              h('span', { key: 't' }, entry.text ?? ''),
              entry.thought
                ? h('span', { key: 'w', className: 'pk-history__thought' }, `（${entry.thought}）`)
                : null,
            ]
            : null,
        )),
      );
    }

    /** Fold / check-call / raise panel with a slider and pot-sized shortcuts. */
    function Controls({ state, t, busy, onAction }) {
      const actions = state.legal?.actions ?? [];
      const byKind = {};
      for (const a of actions) byKind[a.kind] = a;
      const raise = byKind.raise ?? byKind.bet;
      const [amount, setAmount] = React.useState(null);

      const min = raise ? raise.min : 0;
      const max = raise ? raise.max : 0;
      const pot = state.pot;
      const half = raise ? Math.min(max, Math.max(min, Math.round(pot * 0.5))) : 0;
      const full = raise ? Math.min(max, Math.max(min, pot)) : 0;
      const chosen = amount === null ? min : Math.min(max, Math.max(min, amount));

      const reset = () => setAmount(null);
      // Two fixed rows: the action buttons on top, the raise panel below. The
      // raise row keeps its height even without a raise option, so the control
      // area is the same box in every state and at every width.
      return h(
        'div',
        { className: 'pk-controls' },
        h(
          'div',
          { className: 'pk-controlrow' },
          byKind.fold
            ? h('button', {
              className: 'pk-btn pk-btn--danger', disabled: busy, onClick: () => onAction(byKind.fold),
            }, byKind.fold.label)
            : null,
          byKind.check
            ? h('button', {
              className: 'pk-btn', disabled: busy, onClick: () => onAction(byKind.check),
            }, byKind.check.label)
            : null,
          byKind.call
            ? h('button', {
              className: 'pk-btn pk-btn--primary', disabled: busy, onClick: () => onAction(byKind.call),
            }, byKind.call.label)
            : null,
          byKind.allin
            ? h('button', {
              className: 'pk-btn', disabled: busy, onClick: () => onAction(byKind.allin),
            }, byKind.allin.label)
            : null,
        ),
        raise
          ? h(
            'div',
            { className: 'pk-raisebox' },
            h(
              'div',
              { className: 'pk-raisescale' },
              h(
                'div',
                { className: 'pk-raiseval' },
                h('span', null, t('raise.amount')),
                h('b', null, t('raise.to', { amount: chosen })),
              ),
              h('input', {
                type: 'range',
                className: 'pk-slider',
                min, max, value: chosen,
                onChange: (e) => setAmount(Number(e.target.value)),
              }),
              h(
                'div',
                { className: 'pk-quick' },
                h('button', { onClick: () => setAmount(half) }, t('raise.quick.half')),
                h('button', { onClick: () => setAmount(full) }, t('raise.quick.pot')),
                h('button', { onClick: () => setAmount(max) }, t('raise.quick.max')),
              ),
            ),
            h('button', {
              className: 'pk-btn pk-btn--primary',
              disabled: busy,
              onClick: () => { const a = { ...raise, amount: chosen }; reset(); onAction(a); },
            }, t('action.raise')),
          )
          : h('div', { className: 'pk-raisebox pk-raisebox--empty' }),
      );
    }

    function TableView({ state, t, busy, onAction, onAdvice, onNext }) {
      if (!state) {
        // Inside .pk-root so the placeholder inherits the same scale variables
        // the loaded table uses, and reserving its footprint causes no jump.
        return h(
          'div',
          { className: 'pk-root' },
          h('div', { className: 'pk-empty' }, t('error.load')),
        );
      }
      const myTurn = state.phase === 'betting' && state.toAct === 0;
      const isOver = state.phase === 'over';
      const me = state.seats.find((s) => s.human);
      const iWon = isOver
        && (state.result?.winners ?? []).some((w) => w.name === (me ? me.name : ''));

      return h(
        'div',
        { className: 'pk-root' },
        h(
          'div',
          { className: 'pk-topbar' },
          h(
            'div',
            { className: 'pk-brand' },
            h('span', { className: 'pk-brand__title' }, t('panel')),
            h('span', { className: 'pk-handno' }, t('hand.no', { n: state.handNumber })),
          ),
          h(StreetRail, { state, t }),
          h('span', { className: 'pk-spacer' }),
          h('span', { className: 'pk-blinds' },
            `${state.smallBlind}/${state.bigBlind}`),
        ),
        h(Felt, { state, t }),
        h(StatStrip, { state, t }),
        h(History, { state, t }),
        // The action slot has one height across every state (controls, waiting,
        // or the result), so the layout below the felt never shifts.
        h(
          'div',
          { className: 'pk-actionbar' },
          isOver
            ? h(
              'div',
              { className: 'pk-result' },
              h(
                'div',
                { className: 'pk-result__line' },
                h(
                  'span',
                  { className: 'pk-result__verdict ' + (iWon ? 'pk-result__verdict--win' : 'pk-result__verdict--lose') },
                  iWon
                    ? t('result.you.win', {
                      amount: state.result.winners.find((w) => w.name === me.name).amount,
                    })
                    : t('result.you.lose'),
                ),
                h('span', { className: 'pk-result__detail' },
                  (state.result?.winners ?? [])
                    .map((w) => (w.name === (me ? me.name : '')
                      ? t('result.you.hand', { hand: w.hand ?? '' })
                      : t('result.detail', { name: w.name, hand: w.hand ?? '' })))
                    .join('，')),
              ),
              h(
                'div',
                { className: 'pk-result__line' },
                h('button', { className: 'pk-btn pk-btn--primary', onClick: onNext }, t('next.hand')),
              ),
            )
            : myTurn
              ? h(Controls, { state, t, busy, onAction })
              : h(
                'div',
                { className: 'pk-controls' },
                h(
                  'div',
                  { className: 'pk-controlrow pk-actions--thinking' },
                  h('span', { className: 'pk-dots' },
                    h('span'), h('span'), h('span')),
                  h('span', { className: 'pk-actions__wait' }, t('thinking')),
                ),
                h('div', { className: 'pk-raisebox pk-raisebox--empty' }),
              ),
        ),
        h(
          'div',
          { className: 'pk-actions' },
          h('button', { className: 'pk-coachbtn', disabled: busy, onClick: onAdvice }, t('advice.ask')),
        ),
      );
    }

    function Styles() {
      return h('style', { dangerouslySetInnerHTML: { __html: CSS } });
    }

    function Panel(props) {
      const t = props.t;
      const [state, setState] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [advice, setAdvice] = React.useState(null);
      const [asking, setAsking] = React.useState(false);

      const call = React.useCallback(async (path, body) => {
        const response = await fetch(path, {
          method: body ? 'POST' : 'GET',
          headers: body ? { 'content-type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) throw new Error(`${path} -> ${response.status}`);
        return response.json();
      }, []);

      React.useEffect(() => {
        call('/poker/state').then(setState).catch(() => setState(null));
      }, [call]);

      /**
       * Run one Host call that also plays opponent turns, following the table
       * while it runs so each seat is seen acting in turn rather than the whole
       * street landing at once.
       */
      const withFollow = React.useCallback(async (path, body) => {
        let polling = true;
        const follow = (async () => {
          while (polling) {
            await new Promise((r) => setTimeout(r, 260));
            if (!polling) break;
            try {
              setState(await call('/poker/state'));
            } catch {
              /* keep the last good state */
            }
          }
        })();
        try {
          return await call(path, body);
        } finally {
          polling = false;
          await follow;
        }
      }, [call]);

      const onAction = React.useCallback(async (action) => {
        setBusy(true);
        setAdvice(null);
        try {
          setState(await withFollow('/poker/action', {
            kind: action.kind,
            amount: action.amount ?? 0,
          }));
        } finally {
          setBusy(false);
        }
      }, [withFollow]);

      const onNext = React.useCallback(async () => {
        setBusy(true);
        setAdvice(null);
        try {
          setState(await withFollow('/poker/new-hand', {}));
        } finally {
          setBusy(false);
        }
      }, [withFollow]);

      const onAdvice = React.useCallback(async () => {
        setAsking(true);
        try {
          setAdvice(await call('/poker/advice', {}));
        } catch {
          setAdvice({ advice: '', source: 'error' });
        } finally {
          setAsking(false);
        }
      }, [call]);

      return h(
        'div',
        { className: 'pk-page' },
        h(Styles),
        h(TableView, { state, t, busy, onAction, onAdvice, onNext }),
        // One fixed slot for the coach area: it is present before, during, and
        // after a request, and its height does not follow the text length, so
        // asking for advice never resizes the page.
        h(
          'div',
          { className: 'pk-adviceslot' },
          asking
            ? h(
              'div',
              { className: 'pk-advice pk-advice--busy' },
              h('span', { className: 'pk-dots' }, h('span'), h('span'), h('span')),
              h('span', null, t('advice.asking')),
            )
            : advice && advice.advice
              ? h(
                'div',
                { className: 'pk-advice' },
                h(
                  'div',
                  { className: 'pk-advice__head' },
                  h('span', { className: 'pk-advice__label' },
                    advice.source === 'llm' ? t('coach.by') : t('coach.rules')),
                  advice.equity
                    ? h('span', { className: 'pk-advice__who' },
                      `${t('equity')} ${Math.round((advice.equity.win + advice.equity.tie / 2) * 100)}%`)
                    : null,
                ),
                h('p', { className: 'pk-advice__text' }, advice.advice),
              )
              : null,
        ),
      );
    }

    function PokerIcon({ size }) {
      return h(
        'svg',
        {
          width: size ?? 18,
          height: size ?? 18,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '1.6',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'aria-hidden': true,
        },
        h('path', { d: 'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z' }),
        h('path', { d: 'M12 8.5 9.8 12l2.2 3.5 2.2-3.5z' }),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, 'zh', dict.zh), 'poker: zh dictionary');
        ctx.effect(() => ctx.locale.register(NS, 'en', dict.en), 'poker: en dictionary');

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 60,
          locale: NS,
          label: () => ctx.locale.bind(NS)('panel'),
        }, PokerIcon));

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, Panel));
      },
    };
  },
});
