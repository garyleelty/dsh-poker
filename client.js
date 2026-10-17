window.__ModuleLoader__.load({
  id: 'dsh-texas-poker',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PANEL_ID = 'texas-poker';
    const NS = 'texasPoker';

    const CSS = `
    /* Page shell. The panel is the query container: every table dimension
       derives from the width it actually gets, so collapsing the sidebar grows
       the table instead of leaving it sized for a window it no longer fills. */
    .pk-page{
      container-type:inline-size;
      position:relative;
      width:100%;max-width:1100px;margin:0 auto;box-sizing:border-box;
      min-width:0;padding:14px 18px 22px;display:flex;flex-direction:column;gap:10px;
      --pk-table-h:clamp(370px, 47cqw, 528px);
      --pk-seat-w:clamp(60px, 13cqw, 146px);
      --pk-hero-w:clamp(150px, 21cqw, 236px);
      --pk-opp-card-w:clamp(24px, 3.1cqw, 40px);
      --pk-hero-card-w:clamp(38px, 5.1cqw, 60px);
      --pk-board-card-w:clamp(32px, 4.3cqw, 52px);
      --pk-cream:#f4efe2;
      --pk-cream-dim:#c9c1ae;
      --pk-gold:#c9a45c;
      --pk-felt:#124031;
      --pk-felt-deep:#09261d;
      --pk-rail:#8a6a3f;
      --pk-red:#b23a3a;
      --pk-green:#4bb07a;
    }
    .pk-root{width:100%;min-width:0;display:flex;flex-direction:column;gap:10px}
    .pk-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

    /* Top bar */
    .pk-topbar{display:flex;align-items:center;gap:10px;min-width:0;height:28px;overflow:hidden}
    .pk-brand{display:flex;align-items:baseline;gap:7px;min-width:0;flex:none}
    .pk-brand__title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap}
    .pk-handno{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
    .pk-steps{display:flex;gap:4px;margin-left:2px;flex:none}
    .pk-step{font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);letter-spacing:.02em;white-space:nowrap}
    .pk-step--on{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
    .pk-step--done{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
    .pk-spacer{flex:1 1 auto;min-width:0}
    .pk-topright{display:flex;align-items:center;gap:8px;flex:none}
    .pk-blinds{font-size:10.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;flex:none}
    .pk-historybtn{
      box-sizing:border-box;display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;
      border:0.5px solid var(--dsw-alias-border-l2);border-radius:999px;background:transparent;
      color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:500;line-height:1;
      cursor:pointer;white-space:nowrap;flex:none;transition:background-color .12s,color .12s;
    }
    .pk-historybtn:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent));color:var(--dsw-alias-label-primary)}
    .pk-historybtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}

    /* The rail + felt. The seats live on top of this, not in a separate row. */
    .pk-table{
      position:relative;width:100%;height:var(--pk-table-h);box-sizing:border-box;
      border-radius:50% / 42%;
      background:linear-gradient(145deg,#b08a52 0%,#6b4e2a 38%,#3a2a16 70%,#8a6a3f 100%);
      box-shadow:0 22px 44px -24px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.28), inset 0 -2px 6px rgba(0,0,0,.45);
      margin:2px 0 0;
    }
    .pk-felt{
      position:absolute;inset:7px;border-radius:inherit;overflow:hidden;
      background:
        radial-gradient(ellipse at 50% 36%, #1e5b45 0%, var(--pk-felt) 55%, var(--pk-felt-deep) 100%);
      box-shadow:inset 0 0 0 1px rgba(244,239,226,.09), inset 0 0 70px rgba(0,0,0,.4);
    }
    .pk-felt::before{
      content:"";position:absolute;inset:0;pointer-events:none;
      background:
        repeating-linear-gradient(115deg, rgba(255,255,255,.028) 0 1px, transparent 1px 9px),
        radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0,0,0,.32) 100%);
    }
    .pk-felt::after{
      content:"";position:absolute;left:50%;top:43%;width:46%;height:54%;transform:translate(-50%,-50%);
      border:1px solid rgba(244,239,226,.07);border-radius:50%;pointer-events:none;
    }
    .pk-watermark{
      position:absolute;left:50%;top:47%;transform:translate(-50%,-50%);
      font-size:clamp(18px,3.2cqw,40px);font-weight:700;letter-spacing:.34em;
      color:rgba(244,239,226,.05);white-space:nowrap;pointer-events:none;
    }

    /* Board and pot at the center of the felt */
    .pk-board{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:2;display:flex;flex-direction:column;align-items:center;gap:5px}
    .pk-board__label{font-size:8.5px;letter-spacing:.18em;color:rgba(244,239,226,.45)}
    .pk-board__cards{display:flex;gap:6px;height:calc(var(--pk-board-card-w) * 1.4);perspective:600px}
    .pk-pot{
      position:absolute;left:50%;top:57%;transform:translate(-50%,-50%);z-index:2;
      display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--pk-cream);
      text-shadow:0 1px 3px rgba(0,0,0,.8);pointer-events:none;
    }
    .pk-pot__chips{position:relative;width:48px;height:18px}
    .pk-pot__line{display:flex;align-items:baseline;gap:5px}
    .pk-pot__amount{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
    .pk-pot__label{font-size:8px;letter-spacing:.16em;color:rgba(244,239,226,.55)}
    .pk-pot--showdown .pk-pot__amount{font-size:12px;letter-spacing:.12em;font-weight:600;color:rgba(244,239,226,.7)}

    /* Seats are placed on the felt by the component's angle table. */
    .pk-seat{
      position:absolute;z-index:4;width:var(--pk-seat-w);box-sizing:border-box;
      display:flex;flex-direction:column;align-items:center;gap:3px;
      padding:5px 5px 6px;border-radius:10px;
      background:linear-gradient(180deg,rgba(23,25,24,.97),rgba(13,15,14,.97));
      border:1px solid rgba(244,239,226,.14);
      box-shadow:0 9px 20px -12px rgba(0,0,0,.95);
      transform:translate(-50%,-50%);
      transition:opacity .18s, border-color .18s, box-shadow .18s;
    }
    .pk-seat--hero{
      left:50%;top:auto;bottom:6px;transform:translateX(-50%);
      width:var(--pk-hero-w);border-color:rgba(201,164,92,.4);
      background:linear-gradient(180deg,rgba(30,32,30,.98),rgba(15,17,16,.98));
      box-shadow:0 12px 26px -14px rgba(0,0,0,.95),0 0 0 1px rgba(201,164,92,.08);
    }
    .pk-seat--active{
      border-color:var(--pk-gold);
      box-shadow:0 0 0 1px var(--pk-gold),0 0 24px -5px rgba(201,164,92,.6);
      animation:pk-breathe 1.9s ease-in-out infinite;
    }
    .pk-seat--won{
      border-color:var(--pk-green);
      box-shadow:0 0 0 1px var(--pk-green),0 0 30px -6px rgba(75,176,122,.7);
    }
    .pk-seat--folded{opacity:.42;filter:saturate(.55)}
    .pk-seat--out{opacity:.3}
    .pk-seat--lost .pk-avatar{filter:grayscale(.7);opacity:.72}
    .pk-seat--speaking{z-index:12}
    .pk-seat__top{display:flex;align-items:center;gap:3px;width:100%;min-width:0;height:18px}
    .pk-seat__pos{font-size:7.5px;line-height:12px;padding:0 3px;border-radius:3px;border:1px solid rgba(244,239,226,.17);color:var(--pk-cream-dim);flex:none;white-space:nowrap}
    .pk-seat__name{font-size:10px;line-height:14px;font-weight:600;color:var(--pk-cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
    .pk-seat--hero .pk-seat__name{font-size:12px;line-height:16px}
    .pk-avatar{
      box-sizing:border-box;width:17px;height:17px;border-radius:50%;flex:none;
      display:inline-flex;align-items:center;justify-content:center;
      font-size:8px;font-weight:700;line-height:1;color:#fff;
      background:radial-gradient(circle at 32% 28%,color-mix(in srgb,var(--av,#9a8a6a) 52%,#fff) 0%,var(--av,#9a8a6a) 72%);
      border:1px solid rgba(255,255,255,.3);box-shadow:0 1px 3px rgba(0,0,0,.45);
    }
    .pk-avatar--hero{color:#1d1608;background:radial-gradient(circle at 32% 28%,#f7e2ac 0%,#c9a45c 72%);border-color:#e6cd92}
    .pk-avatar--won{box-shadow:0 0 0 1px var(--pk-green),0 0 10px rgba(75,176,122,.75);border-color:var(--pk-green)}
    .pk-seat__style{
      font-size:7.5px;line-height:13px;padding:0 4px;border-radius:3px;flex:none;white-space:nowrap;
      color:var(--av,#c9c1ae);background:color-mix(in srgb,var(--av,#9a8a6a) 17%,transparent);
      border:1px solid color-mix(in srgb,var(--av,#9a8a6a) 36%,transparent);
    }
    .pk-seat__tag{font-size:7px;letter-spacing:.04em;padding:0 3px;border-radius:3px;background:rgba(201,164,92,.2);color:#f0cf8e;flex:none}
    .pk-seat__tag--allin{background:rgba(179,66,63,.26);color:#ff9b96}
    .pk-seat__tag--out{background:rgba(179,66,63,.18);color:#e07a75}
    .pk-seat__stack{font-size:11px;line-height:14px;font-weight:700;color:var(--pk-cream);font-variant-numeric:tabular-nums}
    .pk-seat--hero .pk-seat__stack{font-size:13px;line-height:16px}
    .pk-seat__cards{display:flex;align-items:flex-end;justify-content:center;gap:3px;min-height:calc(var(--pk-opp-card-w) * 1.4)}
    .pk-seat--hero .pk-seat__cards{gap:6px;min-height:calc(var(--pk-hero-card-w) * 1.4);margin:1px 0}
    .pk-seat__status{height:17px;width:100%;display:flex;align-items:center;justify-content:center;overflow:visible}
    .pk-seat__win{
      position:absolute;top:-8px;right:-4px;z-index:6;
      font-size:8px;font-weight:700;line-height:15px;padding:0 6px;border-radius:999px;
      background:var(--pk-green);color:#07130d;white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,.4);animation:pk-badge-in .22s ease-out;
    }
    .pk-act{
      max-width:100%;font-size:8px;line-height:14px;padding:0 6px;border-radius:999px;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;
      animation:pk-badge-in .18s ease-out;
    }
    .pk-seat--hero .pk-act{font-size:9.5px;padding:0 8px}
    .pk-act--fold{background:rgba(170,170,170,.16);color:#c8c8c8}
    .pk-act--check{background:rgba(190,205,200,.14);color:#d8e0dd}
    .pk-act--call{background:rgba(75,176,122,.18);color:#8fe0b5}
    .pk-act--bet,.pk-act--raise{background:rgba(201,164,92,.2);color:#f0cf8e}
    .pk-act--allin{background:rgba(179,66,63,.24);color:#ff9b96}
    .pk-turn{font-size:8.5px;line-height:14px;font-weight:700;letter-spacing:.05em;color:var(--pk-gold);white-space:nowrap}
    .pk-seat--hero .pk-turn{font-size:10px}
    .pk-think{display:inline-flex;align-items:center;gap:2px}
    .pk-think i{width:3px;height:3px;border-radius:50%;background:var(--pk-cream);opacity:.3;animation:pk-dot 1.05s ease-in-out infinite}
    .pk-think i:nth-child(2){animation-delay:.16s}
    .pk-think i:nth-child(3){animation-delay:.32s}

    .pk-bubble{
      position:absolute;left:50%;z-index:20;max-width:170px;
      transform:translateX(-50%);
      padding:4px 7px;border-radius:8px;
      background:var(--pk-cream);color:#1b1b1b;
      font-size:8.5px;line-height:1.35;font-weight:500;
      white-space:normal;text-align:left;pointer-events:none;
      box-shadow:0 5px 14px rgba(0,0,0,.5);
      animation:pk-badge-in .16s ease-out;
    }
    .pk-bubble::after{
      content:"";position:absolute;left:50%;width:6px;height:6px;
      background:var(--pk-cream);transform:translateX(-50%) rotate(45deg);
    }
    .pk-bubble--above{bottom:calc(100% + 7px)}
    .pk-bubble--above::after{bottom:-3px}
    .pk-bubble--below{top:calc(100% + 7px)}
    .pk-bubble--below::after{top:-3px}
    .pk-bubble--left{left:-6px;transform:none}
    .pk-bubble--left::after{left:24px}
    .pk-bubble--right{left:auto;right:-6px;transform:none}
    .pk-bubble--right::after{left:auto;right:24px}

    /* Cards: real card faces, not grey tokens */
    .pk-card{
      position:relative;box-sizing:border-box;flex:none;
      width:var(--pk-opp-card-w);height:calc(var(--pk-opp-card-w) * 1.4);
      border-radius:4px;background:#f4f0e4;border:1px solid #d8d0bd;color:#171717;
      box-shadow:0 2px 5px rgba(0,0,0,.35);overflow:hidden;user-select:none;font-weight:700;
    }
    .pk-seat--hero .pk-card{width:var(--pk-hero-card-w);height:calc(var(--pk-hero-card-w) * 1.4);border-radius:6px}
    .pk-card--board{width:var(--pk-board-card-w);height:calc(var(--pk-board-card-w) * 1.4);border-radius:5px}
    .pk-card--red{color:var(--pk-red)}
    .pk-card__corner{position:absolute;top:1px;left:2px;display:flex;flex-direction:column;align-items:center;line-height:.88;font-size:calc(var(--pk-opp-card-w) * .29);letter-spacing:-.03em}
    .pk-seat--hero .pk-card__corner{font-size:calc(var(--pk-hero-card-w) * .25)}
    .pk-seat--hero .pk-card__corner:not(.pk-card__corner--br){top:2px;left:4px}
    .pk-card--board .pk-card__corner{font-size:calc(var(--pk-board-card-w) * .24)}
    .pk-card--board .pk-card__corner:not(.pk-card__corner--br){top:2px;left:3px}
    .pk-card__corner--br{bottom:1px;right:2px;top:auto;left:auto}
    .pk-card__corner i{font-style:normal;font-size:.86em;line-height:1}
    .pk-card__pip{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:calc(var(--pk-opp-card-w) * .6);opacity:.92}
    .pk-seat--hero .pk-card__pip{font-size:calc(var(--pk-hero-card-w) * .56)}
    .pk-card--board .pk-card__pip{font-size:calc(var(--pk-board-card-w) * .56)}
    .pk-card--back{
      background:
        repeating-linear-gradient(45deg,rgba(201,164,92,.3) 0 2px,transparent 2px 6px),
        linear-gradient(145deg,#6d2b2b,#3f1717);
      border-color:#8a5a3a;
    }
    .pk-card--back::after{content:"";position:absolute;inset:2px;border:1px solid rgba(244,239,226,.2);border-radius:2px}
    .pk-card--slot{background:rgba(0,0,0,.14);border:1px dashed rgba(244,239,226,.18);box-shadow:none;color:rgba(244,239,226,.16);display:flex;align-items:center;justify-content:center;font-size:calc(var(--pk-opp-card-w) * .34)}
    .pk-card--slot.pk-card--board{font-size:calc(var(--pk-board-card-w) * .34)}
    .pk-card--deal{animation:pk-deal .3s cubic-bezier(.2,.7,.3,1) both;animation-delay:calc(var(--pk-card-i,0) * 38ms)}
    .pk-card--flip{animation:pk-flip .34s ease-out both;animation-delay:calc(var(--pk-card-i,0) * 42ms)}
    .pk-card--down{opacity:.5}

    /* Chips, bets and the dealer button */
    .pk-chips{position:relative;display:inline-block;width:30px;height:18px}
    .pk-chip{
      position:absolute;left:50%;bottom:calc(var(--i,0) * 3px);width:18px;height:18px;margin-left:-9px;
      border-radius:50%;border:2px solid rgba(0,0,0,.38);
      background:repeating-conic-gradient(#f1e7d2 0 12deg,#9b7a47 12deg 24deg);
      box-shadow:inset 0 0 0 3px #2b2b2b,0 2px 0 rgba(0,0,0,.28);
    }
    .pk-chip--red{background:repeating-conic-gradient(#f0a19a 0 12deg,#8e2f2b 12deg 24deg)}
    .pk-chip--green{background:repeating-conic-gradient(#a9e0c4 0 12deg,#2d7252 12deg 24deg)}
    .pk-chip--black{background:repeating-conic-gradient(#a7a7a7 0 12deg,#232323 12deg 24deg)}
    .pk-chip--gold{background:repeating-conic-gradient(#f7e2ac 0 12deg,#a77d35 12deg 24deg)}
    .pk-bet{
      position:absolute;z-index:3;transform:translate(-50%,-50%);
      display:flex;flex-direction:column;align-items:center;gap:0;
      color:var(--pk-cream);font-size:9.5px;font-variant-numeric:tabular-nums;
      text-shadow:0 1px 3px rgba(0,0,0,.8);pointer-events:none;
      animation:pk-chip-in .22s ease-out;
    }
    .pk-bet__chips{position:relative;width:24px;height:16px}
    .pk-bet .pk-chip{width:13px;height:13px;margin-left:-6.5px;border-width:1.5px}
    .pk-bet__amount{font-size:9.5px;font-weight:700;line-height:13px;white-space:nowrap}
    .pk-bet--allin .pk-bet__amount{color:#ff9b96}
    .pk-award{
      position:absolute;z-index:9;transform:translate(-50%,-50%);
      display:flex;flex-direction:column;align-items:center;gap:1px;
      color:var(--pk-cream);text-shadow:0 1px 3px rgba(0,0,0,.8);pointer-events:none;
      transition:left .64s cubic-bezier(.2,.7,.3,1),top .64s cubic-bezier(.2,.7,.3,1),opacity .18s ease-out;
    }
    .pk-award__chips{position:relative;width:28px;height:16px}
    .pk-award .pk-chip{width:15px;height:15px;margin-left:-7.5px;border-width:1.5px}
    .pk-award__amount{font-size:11px;font-weight:700;line-height:14px;color:var(--pk-gold);white-space:nowrap}
    .pk-dealer{
      position:absolute;z-index:5;width:16px;height:16px;border-radius:50%;
      background:var(--pk-cream);color:#1a1a1a;border:1px solid #b08a52;
      font-size:9px;font-weight:800;line-height:14px;text-align:center;
      box-shadow:0 2px 5px rgba(0,0,0,.45);transform:translate(-50%,-50%);
    }

    /* Stat strip */
    .pk-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .pk-stat{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);padding:6px 10px;min-width:0;height:52px;box-sizing:border-box;overflow:hidden}
    .pk-stat__k{font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);white-space:nowrap}
    .pk-stat__v{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;margin-top:0;line-height:19px}
    .pk-stat__sub{font-size:8px;line-height:10px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pk-meter{height:2px;border-radius:2px;background:color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);margin-top:4px;overflow:hidden}
    .pk-meter__fill{height:100%;background:var(--dsw-alias-brand-primary);border-radius:2px;transition:width .3s}

    /* Current-hand log: a compact secondary trail below the table. */
    .pk-history{display:flex;flex-direction:column;gap:2px;font-size:10.5px;color:var(--dsw-alias-label-secondary);height:66px;overflow:hidden}
    .pk-history__row{display:flex;gap:5px;align-items:baseline;height:15px;line-height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pk-history__row--empty{visibility:hidden}
    .pk-history__dot{width:4px;height:4px;border-radius:50%;background:currentColor;flex:none;transform:translateY(-1px)}
    .pk-history__dot--me{background:var(--dsw-alias-brand-primary)}
    .pk-history__thought{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-style:normal;opacity:.9;overflow:hidden;text-overflow:ellipsis}

    /* Controls */
    .pk-actions{display:flex;flex-wrap:nowrap;gap:8px;align-items:center;height:34px}
    .pk-btn{
      box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;
      height:34px;padding:0 15px;border:0.5px solid var(--dsw-alias-border-l2);
      border-radius:var(--dsw-radius-md);
      background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);
      font-size:12.5px;font-weight:500;line-height:1;letter-spacing:-0.01em;
      cursor:pointer;white-space:nowrap;flex:none;-webkit-font-smoothing:antialiased;
      transition:background-color .12s ease-out,border-color .12s ease-out,transform .06s ease-out,opacity .12s ease-out;
    }
    .pk-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent))}
    .pk-btn:active:not(:disabled){transform:scale(.97);background:var(--dsw-alias-interactive-bg-active,color-mix(in srgb, var(--dsw-alias-label-primary) 11%, transparent))}
    .pk-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
    .pk-btn:disabled{cursor:not-allowed;opacity:.4}
    .pk-btn--primary{
      border-color:transparent;
      background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary));
      color:var(--dsw-alias-label-primary-foreground,#fff);
      font-weight:600;
    }
    .pk-btn--primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary))}
    .pk-btn--primary:active:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary))}
    .pk-btn--danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent)}
    .pk-btn--danger:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 9%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent)}
    .pk-actions__wait{font-size:12px;color:var(--dsw-alias-label-secondary)}
    .pk-actionbar{height:117px;display:flex;align-items:center;overflow:hidden}
    .pk-actionbar>*{width:100%}
    .pk-controls{display:grid;grid-template-rows:34px 73px;gap:8px;align-content:center;height:115px}
    .pk-controlrow{display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden}
    .pk-actions--thinking{align-items:center;gap:8px}
    .pk-dots{display:inline-flex;gap:3px}
    .pk-dots span{width:4px;height:4px;border-radius:50%;background:var(--dsw-alias-brand-primary);opacity:.35;animation:pk-dot 1.05s ease-in-out infinite}
    .pk-dots span:nth-child(2){animation-delay:.16s}
    .pk-dots span:nth-child(3){animation-delay:.32s}
    .pk-raisebox{display:flex;align-items:center;gap:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);padding:8px 10px;height:73px;box-sizing:border-box;min-width:0}
    .pk-raisebox--empty{border-color:transparent;background:transparent}
    .pk-raisescale{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
    .pk-raiseval{display:flex;justify-content:space-between;font-size:10.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
    .pk-raiseval b{color:var(--dsw-alias-label-primary);font-size:12.5px}
    input[type=range].pk-slider{width:100%;accent-color:var(--dsw-alias-brand-primary)}
    .pk-quick{display:flex;gap:4px}
    .pk-quick button{
      box-sizing:border-box;height:21px;padding:0 8px;
      border:0.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);
      background:transparent;color:var(--dsw-alias-label-secondary);
      font-size:10.5px;font-weight:500;line-height:1;letter-spacing:-0.01em;
      cursor:pointer;white-space:nowrap;
      transition:background-color .12s ease-out,color .12s ease-out,transform .06s ease-out;
    }
    .pk-quick button:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent));color:var(--dsw-alias-label-primary)}
    .pk-quick button:active{transform:scale(.96)}

    /* Result and coach */
    .pk-result{height:117px;box-sizing:border-box;border-radius:10px;border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, var(--dsw-alias-bg-layer-1));padding:10px 13px;display:flex;flex-direction:column;justify-content:center;gap:7px;overflow:hidden;animation:pk-pop .22s ease-out}
    .pk-result__line{display:flex;align-items:center;gap:12px;min-width:0}
    .pk-result__line span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pk-result__verdict{font-size:14px;font-weight:600}
    .pk-result__verdict--win{color:var(--dsw-alias-state-success-primary)}
    .pk-result__verdict--lose{color:var(--dsw-alias-state-error-primary)}
    .pk-result__detail{font-size:11.5px;color:var(--dsw-alias-label-secondary)}
    .pk-result--waiting{border-style:dashed;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 4%,var(--dsw-alias-bg-layer-1))}

    /* Coach stays a secondary control: the table and the chips are the show. */
    .pk-coachbtn{
      box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;
      height:32px;padding:0 12px;border:0.5px solid var(--dsw-alias-border-l2);
      border-radius:var(--dsw-radius-md);background:transparent;
      color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:1;
      letter-spacing:-0.01em;cursor:pointer;white-space:nowrap;flex:none;
      -webkit-font-smoothing:antialiased;transition:background-color .12s,color .12s,transform .06s;
    }
    .pk-coachbtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent));color:var(--dsw-alias-label-primary)}
    .pk-coachbtn:active:not(:disabled){transform:scale(.97)}
    .pk-coachbtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
    .pk-coachbtn:disabled{cursor:not-allowed;opacity:.4}
    .pk-adviceslot{min-height:0}
    .pk-advice{box-sizing:border-box;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);padding:10px 12px;max-height:120px;overflow:auto;animation:pk-pop .18s ease-out}
    .pk-advice__head{display:flex;align-items:center;gap:8px;margin-bottom:4px}
    .pk-advice__label{font-size:10.5px;font-weight:600;color:var(--dsw-alias-brand-primary)}
    .pk-advice__who{font-size:9px;padding:0 5px;border-radius:4px;background:color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);color:var(--dsw-alias-label-secondary)}
    .pk-advice__text{margin:0;font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-primary)}
    .pk-advice--busy{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
    .pk-empty{padding:24px;min-height:var(--pk-table-h);box-sizing:border-box;color:var(--dsw-alias-label-secondary);font-size:13px}

    /* History drawer */
    .pk-drawer-backdrop{
      position:absolute;inset:0;z-index:40;display:flex;justify-content:flex-end;
      background:rgba(0,0,0,.55);backdrop-filter:blur(3px);animation:pk-fade .16s ease-out;
    }
    .pk-drawer{
      width:min(460px,100%);height:100%;box-sizing:border-box;
      background:var(--dsw-alias-bg-layer-1);border-left:1px solid var(--dsw-alias-border-l1);
      box-shadow:-24px 0 60px -34px rgba(0,0,0,.9);display:flex;flex-direction:column;
      overflow:hidden;animation:pk-slide .22s cubic-bezier(.2,.7,.3,1);
    }
    .pk-drawer:focus{outline:none}
    .pk-drawer:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
    .pk-drawer__head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:15px 15px 9px}
    .pk-drawer__title{font-size:17px;font-weight:600;color:var(--dsw-alias-label-primary);line-height:22px}
    .pk-drawer__sub{font-size:10.5px;color:var(--dsw-alias-label-secondary);margin-top:2px}
    .pk-drawer__close{
      width:28px;height:28px;border-radius:8px;border:0.5px solid var(--dsw-alias-border-l2);
      background:transparent;color:var(--dsw-alias-label-secondary);font-size:17px;line-height:1;
      cursor:pointer;flex:none;display:inline-flex;align-items:center;justify-content:center;
    }
    .pk-drawer__close:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent));color:var(--dsw-alias-label-primary)}
    .pk-drawer__body{flex:1;min-height:0;overflow:auto;padding:0 15px 18px;display:flex;flex-direction:column;gap:12px;overscroll-behavior:contain}
    .pk-summary{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    .pk-summary__tile{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);padding:7px 9px;min-width:0}
    .pk-summary__k{font-size:8.5px;letter-spacing:.05em;color:var(--dsw-alias-label-secondary);white-space:nowrap}
    .pk-summary__v{font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);line-height:21px}
    .pk-summary__v--win{color:var(--dsw-alias-state-success-primary)}
    .pk-summary__v--lose{color:var(--dsw-alias-state-error-primary)}
    .pk-curve{position:relative;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-base);padding:10px 10px 6px 34px}
    .pk-curve__plot{position:relative;height:148px}
    .pk-curve svg{display:block;width:100%;height:100%;overflow:visible}
    .pk-curve__y{position:absolute;left:7px;top:10px;bottom:22px;width:24px;font-size:8px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
    .pk-curve__y span{position:absolute;left:0;transform:translateY(-50%);white-space:nowrap}
    .pk-curve__x{display:flex;justify-content:space-between;font-size:8px;color:var(--dsw-alias-label-secondary);padding:2px 0 0}
    .pk-curve__empty{height:148px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--dsw-alias-label-secondary)}
    .pk-handlist{display:flex;flex-direction:column;gap:5px}
    .pk-handrow{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);overflow:hidden}
    .pk-handrow__head{display:flex;align-items:center;gap:7px;padding:6px 8px;cursor:pointer;min-width:0}
    .pk-handrow__head:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent)}
    .pk-handrow__id{font-size:9.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;flex:none;width:24px}
    .pk-handrow__cards{display:flex;gap:2px;flex:none;--pk-opp-card-w:17px}
    .pk-handrow__cards .pk-card{box-shadow:none;border-radius:3px}
    .pk-handrow__cards .pk-card__corner--br{display:none}
    .pk-handrow__meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:0}
    .pk-handrow__hand{font-size:10px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pk-handrow__board{font-size:8.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.02em}
    .pk-handrow__net{font-size:11.5px;font-weight:700;font-variant-numeric:tabular-nums;flex:none;white-space:nowrap}
    .pk-handrow__net--win{color:var(--dsw-alias-state-success-primary)}
    .pk-handrow__net--lose{color:var(--dsw-alias-state-error-primary)}
    .pk-handrow__net--flat{color:var(--dsw-alias-label-secondary)}
    .pk-handrow__chev{font-size:13px;color:var(--dsw-alias-label-secondary);flex:none;width:12px;text-align:center}
    .pk-rebuy{font-size:7.5px;padding:0 4px;border-radius:3px;background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 20%, transparent);color:var(--dsw-alias-state-warn-primary);white-space:nowrap;flex:none}
    .pk-handrow__detail{border-top:1px solid var(--dsw-alias-border-l1);padding:7px 9px;display:flex;flex-direction:column;gap:4px;background:color-mix(in srgb, var(--dsw-alias-label-primary) 2%, transparent)}
    .pk-handrow__actions{display:grid;grid-template-columns:1fr 1fr;gap:1px 10px;font-size:8.5px;line-height:13px;color:var(--dsw-alias-label-secondary)}
    .pk-handrow__action{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pk-handrow__action b{color:var(--dsw-alias-label-primary);font-weight:500}
    .pk-handrow__foot{font-size:8.5px;color:var(--dsw-alias-label-secondary);line-height:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pk-drawer__note{font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);padding:0 2px}
    .pk-drawer__state{padding:28px 12px;text-align:center;font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.7}
    .pk-drawer__state button{margin-top:10px}

    /* Motion: short and physical, never a long cinematic. */
    @keyframes pk-deal{
      from{opacity:0;transform:translateY(-12px) rotate(-5deg) scale(.94)}
      to{opacity:1;transform:none}
    }
    @keyframes pk-flip{
      from{opacity:.2;transform:rotateY(82deg)}
      to{opacity:1;transform:none}
    }
    @keyframes pk-breathe{
      0%,100%{box-shadow:0 0 0 1px var(--pk-gold),0 0 16px -6px rgba(201,164,92,.45)}
      50%{box-shadow:0 0 0 1px var(--pk-gold),0 0 28px -4px rgba(201,164,92,.72)}
    }
    @keyframes pk-badge-in{
      from{opacity:0;transform:translateY(3px)}
      to{opacity:1;transform:none}
    }
    @keyframes pk-dot{
      0%,100%{opacity:.25;transform:translateY(0)}
      45%{opacity:1;transform:translateY(-3px)}
    }
    @keyframes pk-chip-in{
      from{opacity:0;transform:translate(-50%,-36%) scale(.84)}
      to{opacity:1;transform:translate(-50%,-50%) scale(1)}
    }
    @keyframes pk-pop{
      from{opacity:0;transform:translateY(6px)}
      to{opacity:1;transform:none}
    }
    @keyframes pk-fade{from{opacity:0}to{opacity:1}}
    @keyframes pk-slide{from{opacity:0;transform:translateX(26px)}to{opacity:1;transform:none}}

    @media (prefers-reduced-motion: reduce){
      .pk-seat--active,.pk-card--deal,.pk-card--flip,.pk-bet,.pk-result,.pk-advice,.pk-act{animation:none!important}
      .pk-dots span,.pk-think i{animation:none!important}
      .pk-page *{scroll-behavior:auto!important}
    }

    /* Narrow screens: shrink the table, not the information. */
    @container (max-width: 700px){
      .pk-page{padding:12px 12px 18px;gap:9px}
      .pk-seat{padding:4px;border-radius:8px}
      .pk-seat__top{height:14px}
      .pk-seat__status{height:15px}
      .pk-act{font-size:7.5px;padding:0 4px}
      .pk-seat__pos{font-size:7px;padding:0 2px}
      .pk-strip{gap:6px}
      .pk-stat{padding:5px 8px;height:50px}
      .pk-stat__v{font-size:13px;line-height:18px}
      .pk-history{font-size:10px}
      .pk-drawer{width:100%;border-left:0}
    }
    @container (max-width: 560px){
      .pk-seat__style{display:none}
      .pk-step{padding:2px 5px;font-size:9px}
      .pk-brand__title{font-size:13px}
      .pk-historybtn{padding:0 7px}
      .pk-board__label{display:none}
      .pk-seat--hero{bottom:4px}
    }
    @container (max-width: 480px){
      .pk-blinds{display:none}
      .pk-historybtn span{display:none}
    }
    @container (max-width: 430px){
      .pk-avatar{width:13px;height:13px;font-size:7px}
      .pk-seat__top{height:16px}
      .pk-bubble{max-width:126px;font-size:7.5px}
      .pk-page{padding:10px 10px 16px}
      .pk-seat__pos{display:none}
      .pk-seat__name{font-size:9px}
      .pk-act{font-size:7px;padding:0 3px}
      .pk-strip{gap:4px}
      .pk-stat{padding:4px 6px;height:48px}
      .pk-stat__k{font-size:7.5px}
      .pk-stat__v{font-size:12px}
      .pk-history{height:48px}
      .pk-history__row:nth-child(n+4){display:none}
    }
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
        'result.join': '，',
        'result.you.hand': '你拿到 {hand}',
        'result.foldWin': '对手全部弃牌',
        'result.winNoHand': '{name} 拿下底池',
        'result.others': '对手牌型：',
        'raise.to': '加到 {amount}',
        'raise.quick.half': '1/2 池',
        'raise.quick.pot': '满池',
        'raise.quick.max': '最大',
        thinking: '对手正在思考…',
        'coach.by': 'AI 教练',
        'coach.rules': '规则引擎',
        toact: '你的回合',
        'end.bust': '你的筹码已输光',
        'end.sweep': '你赢下了整桌',
        'end.bust.detail': '再买一次就能继续上桌',
        'end.sweep.detail': '所有对手都被你清空了',
        'rebuy': '重新买入',
        'new.game': '再来一局',
        blinds: '盲注',
        history: '历史',
        'history.title': '手牌历史',
        'history.session': '已记录 · {n} 手',
        'history.current': '当前桌筹码',
        'history.hands': '手数',
        'history.net': '累计盈亏',
        'history.winrate': '胜率',
        'history.biggest': '最大底池',
        'history.curve': '累计盈亏曲线',
        'history.hand': '第 {n} 手',
        'history.empty': '这一局还没有完成的手牌。打完一手后，这里会出现牌局记录和盈利曲线。',
        'history.noShowdown': '未摊牌',
        'history.empty.curve': '完成一手后开始绘制',
        'history.loading': '正在读取历史…',
        'history.error': '历史读取失败',
        'history.retry': '重试',
        'history.refresh': '刷新历史',
        'history.close': '关闭历史',
        'history.rebuy': '重新买入',
        'history.note': '曲线按手牌累计盈亏，不含重新买入的筹码。点击任意一手展开动作记录。',
        'won.amount': '赢得 {amount}',
        'showdown.reveal': '摊牌中…',
        'showdown.reveal.detail': '逐张亮牌',
        'showdown.collect': '收池…',
        'showdown.collect.detail': '筹码飞向赢家',
        'showdown.skip': '跳过',
        'action.bet': '下注',
        'action.raise.to': '加注到 {amount}',
        'hand.high-card': '高牌',
        'hand.pair': '一对',
        'hand.two-pair': '两对',
        'hand.trips': '三条',
        'hand.straight': '顺子',
        'hand.flush': '同花',
        'hand.full-house': '葫芦',
        'hand.quads': '四条',
        'hand.straight-flush': '同花顺',
        'style.tight': '紧凶',
        'style.tight.hint': '入池少，加注果断',
        'style.loose': '松凶',
        'style.loose.hint': '入池宽，爱施压',
        'style.rock': '石头',
        'style.rock.hint': '只打强牌，很少诈唬',
        'style.maniac': '疯狗',
        'style.maniac.hint': '什么牌都敢打，诈唬多',
        'ai.thought.valueRaise': '胜率 {equity} 远高于底池赔率，加注',
        'ai.thought.callAllIn': '赔率合适，跟注全下 {amount}',
        'ai.thought.call': '胜率 {equity}，底池赔率 {odds}，跟注',
        'ai.thought.foldWeak': '胜率 {equity} 不足，弃牌',
        'ai.thought.foldOdds': '胜率 {equity}，不划算，弃牌',
        'ai.thought.valueBet': '胜率 {equity}，主动出击',
        'ai.thought.probe': '试探性下注',
        'ai.thought.check': '胜率 {equity}，先看牌',
        'seat.you': '你',
        'a11y.yourTurn': '轮到你了',
        'a11y.handWon': '这一手你赢了',
        'a11y.handOver': '这一手结束',
        'seat.name.aimee': '小艾',
        'seat.name.oldk': '老K',
        'seat.name.amon': '阿蒙',
        'seat.name.jack': '杰克',
        'seat.name.phil': '菲尔',
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
        'result.join': ', ',
        'result.you.hand': 'you had {hand}',
        'result.foldWin': 'Everyone folded',
        'result.winNoHand': '{name} wins the pot',
        'result.others': 'Hands: ',
        'raise.to': 'Raise to {amount}',
        'raise.quick.half': '1/2 pot',
        'raise.quick.pot': 'Pot',
        'raise.quick.max': 'Max',
        thinking: 'Opponents are thinking…',
        'coach.by': 'AI coach',
        'coach.rules': 'Rules engine',
        toact: 'Your turn',
        'end.bust': 'You are out of chips',
        'end.sweep': 'You swept the table',
        'end.bust.detail': 'Rebuy to sit back down',
        'end.sweep.detail': 'Every opponent is broke',
        rebuy: 'Rebuy',
        'new.game': 'New game',
        blinds: 'Blinds',
        history: 'History',
        'history.title': 'Hand history',
        'history.session': 'Saved · {n} hands',
        'history.current': 'Table stack',
        'history.hands': 'Hands',
        'history.net': 'Session P/L',
        'history.winrate': 'Win rate',
        'history.biggest': 'Biggest pot',
        'history.curve': 'Cumulative hand results',
        'history.hand': 'Hand {n}',
        'history.empty': 'No completed hands yet. Finish one and the hand log and profit curve will appear here.',
        'history.noShowdown': 'No showdown',
        'history.empty.curve': 'The curve starts after your first hand',
        'history.loading': 'Loading history…',
        'history.error': 'Could not load history',
        'history.retry': 'Retry',
        'history.refresh': 'Refresh history',
        'history.close': 'Close history',
        'history.rebuy': 'Rebuy',
        'history.note': 'The curve is cumulative hand results, excluding rebuys. Click any hand to expand its actions.',
        'won.amount': 'Won {amount}',
        'showdown.reveal': 'Showdown…',
        'showdown.reveal.detail': 'Revealing hands',
        'showdown.collect': 'Collecting…',
        'showdown.collect.detail': 'Chips are moving to the winner',
        'showdown.skip': 'Skip',
        'action.bet': 'Bet',
        'action.raise.to': 'Raise to {amount}',
        'hand.high-card': 'High card',
        'hand.pair': 'One pair',
        'hand.two-pair': 'Two pair',
        'hand.trips': 'Three of a kind',
        'hand.straight': 'Straight',
        'hand.flush': 'Flush',
        'hand.full-house': 'Full house',
        'hand.quads': 'Four of a kind',
        'hand.straight-flush': 'Straight flush',
        'style.tight': 'Tight',
        'style.tight.hint': 'Plays few hands, raises decisively',
        'style.loose': 'Loose',
        'style.loose.hint': 'Wide range, loves pressure',
        'style.rock': 'Rock',
        'style.rock.hint': 'Only strong hands, rarely bluffs',
        'style.maniac': 'Maniac',
        'style.maniac.hint': 'Plays anything, bluffs a lot',
        'ai.thought.valueRaise': 'Equity {equity} well above pot odds, raising',
        'ai.thought.callAllIn': 'Fair price, calling the all-in {amount}',
        'ai.thought.call': 'Equity {equity} vs pot odds {odds}, calling',
        'ai.thought.foldWeak': 'Equity {equity} is too low, folding',
        'ai.thought.foldOdds': 'Equity {equity} does not pay, folding',
        'ai.thought.valueBet': 'Equity {equity}, taking the initiative',
        'ai.thought.probe': 'Probe bet',
        'ai.thought.check': 'Equity {equity}, taking a free look',
        'seat.you': 'You',
        'a11y.yourTurn': 'Your turn',
        'a11y.handWon': 'You won this hand',
        'a11y.handOver': 'Hand complete',
        'seat.name.aimee': 'Aimee',
        'seat.name.oldk': 'Old K',
        'seat.name.amon': 'Amon',
        'seat.name.jack': 'Jack',
        'seat.name.phil': 'Phil',
      },
    };

    const SUIT_GLYPH = { c: '♣', d: '♦', h: '♥', s: '♠' };
    const RED = new Set(['d', 'h']);

    /** "Ah" -> { rank: 'A', suit: 'h' } */
    function parseCard(text) {
      if (!text || typeof text !== 'string') return null;
      const suit = text.slice(-1);
      const rawRank = text.slice(0, -1);
      // The wire format uses the poker shorthand "T" for ten. A Chinese
      // table should read "10", not a mysterious T card.
      const rank = rawRank === 'T' ? '10' : rawRank;
      return { rank, suit, glyph: SUIT_GLYPH[suit] ?? suit, red: RED.has(suit) };
    }

    const HAND_KEYS = [
      'high-card', 'pair', 'two-pair', 'trips', 'straight',
      'flush', 'full-house', 'quads', 'straight-flush',
    ];

    // The Host sends the public style on every snapshot. Duplicate it here so
    // a bundle refreshed before the Host restarts still shows avatars/tags.
    const FALLBACK_STYLES = [
      { key: 'tight', label: '紧凶', hint: '入池少，加注果断', color: '#5b7cfa' },
      { key: 'loose', label: '松凶', hint: '入池宽，爱施压', color: '#d9834a' },
      { key: 'rock', label: '石头', hint: '只打强牌，很少诈唬', color: '#7a8a6f' },
      { key: 'maniac', label: '疯狗', hint: '什么牌都敢打，诈唬多', color: '#c94f4f' },
    ];

    function styleForSeat(seat) {
      if (seat.style) return seat.style;
      return FALLBACK_STYLES[Math.max(0, (seat.id - 1) % FALLBACK_STYLES.length)];
    }

    /** Localized seat name, falling back to the Host's Chinese name. */
    function seatName(t, seat) {
      if (!seat) return '';
      if (seat.nameKey) {
        const text = t(seat.nameKey);
        if (text !== seat.nameKey) return text;
      }
      return seat.name ?? '';
    }

    /** Localized personality tag, falling back to the Host's Chinese label. */
    function styleLabel(t, style) {
      if (!style) return '';
      const key = `style.${style.key}`;
      const text = t(key);
      return text === key ? (style.label ?? '') : text;
    }

    /** Localized personality tooltip. */
    function styleHint(t, style) {
      if (!style) return '';
      const key = `style.${style.key}.hint`;
      const text = t(key);
      return text === key ? (style.hint ?? '') : text;
    }

    /**
     * Localized AI reasoning. The Host sends both the Chinese `thought` and a
     * structured `thoughtKey`; prefer the key so English UI stays English.
     */
    function thoughtText(t, entry) {
      if (entry?.thoughtKey) {
        const text = t(entry.thoughtKey, entry.thoughtArgs ?? {});
        if (text !== entry.thoughtKey) return text;
      }
      return entry?.thought ?? '';
    }

    /** Server sends category keys; the dictionary owns the wording. */
    function handLabel(t, key) {
      if (!key) return '';
      if (!HAND_KEYS.includes(key)) return key;
      return t(`hand.${key}`);
    }

    function formatSigned(n) {
      const value = Number(n) || 0;
      return value > 0 ? `+${value}` : String(value);
    }

    function netTone(n) {
      if (n > 0) return 'win';
      if (n < 0) return 'lose';
      return 'flat';
    }

    /** "As Kd 9c" -> "A♠ K♦ 9♣" for compact history rows. */
    function cardLine(cards) {
      return (cards ?? []).map((card) => {
        const parsed = parseCard(card);
        return parsed ? `${parsed.rank}${parsed.glyph}` : '';
      }).join(' ');
    }

    function actionText(action, t) {
      if (!action) return '';
      const amount = action.amount ?? 0;
      switch (action.kind) {
        case 'fold': return t('action.fold');
        case 'check': return t('action.check');
        case 'call': return `${t('action.call')} ${amount}`;
        case 'bet': return `${t('action.bet')} ${action.to || amount}`;
        case 'raise': return t('action.raise.to', { amount: action.to || amount });
        case 'allin': return `${t('action.allin')} ${amount}`;
        default: return '';
      }
    }

    /**
     * Seats around the top half of the oval, hero at the bottom. The angles are
     * picked per table size so 5 opponents still leave a gap between cards.
     */
    const OPPONENT_ANGLES = {
      1: [90],
      2: [150, 30],
      3: [180, 90, 0],
      4: [180, 120, 60, 0],
      5: [180, 120, 90, 60, 0],
    };

    function opponentSpots(count) {
      const angles = OPPONENT_ANGLES[count] ?? OPPONENT_ANGLES[Math.max(1, Math.min(5, count))];
      return angles.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return {
          left: 50 + 40 * Math.cos(rad),
          top: 50 - 34 * Math.sin(rad),
        };
      });
    }

    function betSpot(spot) {
      return {
        left: 50 + (spot.left - 50) * 0.58,
        top: 50 + (spot.top - 50) * 0.58,
      };
    }

    function dealerSpot(spot) {
      // The button sits beside the seat, not between the seat and the board:
      // a radial offset would put it inside the large top/side nameplates.
      return {
        left: spot.left + (spot.left < 50 ? 9 : -9),
        top: spot.top + (spot.top < 30 ? 3 : 0),
      };
    }

    function Card({ value, faceDown, board, deal, index }) {
      const style = { '--pk-card-i': String(index ?? 0) };
      // Face-down first: an opponent's hidden hand is [null, null], which must
      // become a card back, not the empty board slot.
      if (faceDown) {
        return h('span', {
          className: 'pk-card pk-card--back' + (board ? ' pk-card--board' : ''),
          'aria-label': 'hidden card',
        });
      }
      if (!value) {
        return h('span', {
          className: 'pk-card pk-card--slot' + (board ? ' pk-card--board' : ''),
          'aria-hidden': true,
        });
      }
      const card = parseCard(value);
      if (!card) {
        return h('span', { className: 'pk-card pk-card--slot' });
      }
      return h(
        'span',
        {
          className: 'pk-card'
            + (card.red ? ' pk-card--red' : '')
            + (board ? ' pk-card--board' : '')
            + (deal ? (board ? ' pk-card--flip' : ' pk-card--deal') : ''),
          style,
          'aria-label': `${card.rank}${card.glyph}`,
        },
        h('span', { className: 'pk-card__corner' }, card.rank, h('i', null, card.glyph)),
        h('span', { className: 'pk-card__pip', 'aria-hidden': true }, card.glyph),
        h('span', { className: 'pk-card__corner pk-card__corner--br', 'aria-hidden': true },
          card.rank, h('i', null, card.glyph)),
      );
    }

    function ChipStack({ count = 3, className = '' }) {
      const colors = ['pk-chip--red', 'pk-chip--green', 'pk-chip--gold', 'pk-chip--black'];
      return h(
        'span',
        { className: `pk-chips ${className}` },
        Array.from({ length: count }, (_, i) => h('i', {
          key: i,
          className: `pk-chip ${colors[i % colors.length]}`,
          style: { '--i': i },
        })),
      );
    }

    function Dealer({ left, top, t }) {
      return h('span', {
        className: 'pk-dealer',
        title: t('pos.btn'),
        style: { left: `${left}%`, top: `${top}%` },
      }, 'D');
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

    function Seat({
      seat, active, state, t, won, handName, winAmount, isHero, spot, lastAction,
      reveal = true, bubble, bubbleBelow, bubbleAlign, stack, lost,
    }) {
      const cards = seat.cards ?? [];
      const style = isHero ? null : styleForSeat(seat);
      const faceDown = !seat.human && (!reveal || cards.every((c) => c === null));
      const busted = seat.stack === 0 && seat.committed === 0;
      const shownStack = stack ?? seat.stack;
      const over = state.phase === 'over';
      const folded = seat.folded;
      const avatarColor = isHero ? '#c9a45c' : style?.color;
      const tag = seat.allIn ? 'allin' : busted ? 'out' : null;
      const action = over ? null : (lastAction ?? seat.lastAction);
      const currentAction = action && action.street === state.street ? action : null;
      const showTurn = active && !over && !folded;

      let status = null;
      if (over) {
        if (folded) status = h('span', { className: 'pk-act pk-act--fold' }, t('action.fold'));
        else if (handName) {
          status = h('span', {
            className: 'pk-act ' + (won ? 'pk-act--call' : 'pk-act--check'),
          }, handLabel(t, handName));
        }
      } else if (folded) {
        status = h('span', { className: 'pk-act pk-act--fold' }, t('action.fold'));
      } else if (showTurn && seat.human) {
        status = h('span', { className: 'pk-turn' }, t('toact'));
      } else if (showTurn) {
        status = h('span', { className: 'pk-think' }, h('i'), h('i'), h('i'));
      } else if (currentAction) {
        status = h('span', { className: `pk-act pk-act--${currentAction.kind}` },
          actionText(currentAction, t));
      }

      return h(
        'div',
        {
          className: 'pk-seat'
            + (isHero ? ' pk-seat--hero' : '')
            + (active && !over ? ' pk-seat--active' : '')
            + (folded ? ' pk-seat--folded' : '')
            + (won ? ' pk-seat--won' : '')
            + (busted && !folded ? ' pk-seat--out' : '')
            + (lost ? ' pk-seat--lost' : '')
            + (bubble ? ' pk-seat--speaking' : ''),
          style: isHero ? undefined : { left: `${spot.left}%`, top: `${spot.top}%` },
        },
        h(
          'div',
          { className: 'pk-seat__top' },
          h('span', { className: 'pk-seat__pos' }, positionOf(seat, state, t)),
          h('span', {
            className: 'pk-avatar'
              + (isHero ? ' pk-avatar--hero' : '')
              + (won ? ' pk-avatar--won' : ''),
            style: avatarColor ? { '--av': avatarColor } : undefined,
            title: style?.hint ?? undefined,
            'aria-hidden': true,
          }, isHero ? t('seat.you') : (seat.name?.[0] ?? '?')),
          h('span', { className: 'pk-seat__name' }, seatName(t, seat)),
          style
            ? h('span', {
              className: 'pk-seat__style',
              style: { '--av': style.color },
              title: styleHint(t, style),
            }, styleLabel(t, style))
            : null,
          tag === 'allin' ? h('span', { className: 'pk-seat__tag pk-seat__tag--allin' }, 'ALL-IN') : null,
          tag === 'out' ? h('span', { className: 'pk-seat__tag pk-seat__tag--out' }, 'OUT') : null,
        ),
        h('div', { className: 'pk-seat__stack' }, String(shownStack)),
        h(
          'div',
          { className: 'pk-seat__cards' },
          cards.length
            ? cards.map((c, i) => h(Card, { key: i, value: c, faceDown, deal: true, index: i }))
            : null,
        ),
        h('div', { className: 'pk-seat__status' }, status),
        won && winAmount ? h('span', { className: 'pk-seat__win' }, `+${winAmount}`) : null,
        bubble
          ? h('span', {
            className: 'pk-bubble ' + (bubbleBelow ? 'pk-bubble--below' : 'pk-bubble--above')
              + (bubbleAlign === 'left' ? ' pk-bubble--left' : bubbleAlign === 'right' ? ' pk-bubble--right' : ''),
          }, bubble)
          : null,
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

    /** Rail, felt, board, pot, chips and the seats around the oval. */
    function TableBoard({ state, t, revealed = 0, awarding = false, showResult = false }) {
      const hero = state.seats[0];
      const opponents = state.seats.slice(1);
      const spots = opponentSpots(opponents.length);
      const over = state.phase === 'over';
      const [bubble, setBubble] = React.useState(null);
      const history = state.history ?? [];
      const lastEntry = history[history.length - 1];

      // Show the AI's real reasoning for a beat after its action. This is the
      // same thought already stored in the action log; the bubble just makes
      // the seat feel like a person at the table.
      React.useEffect(() => {
        if (over || !lastEntry || !lastEntry.thought) {
          setBubble(null);
          return undefined;
        }
        setBubble({ seat: lastEntry.seat, text: thoughtText(t, lastEntry) });
        const timer = setTimeout(() => setBubble(null), 2800);
        return () => clearTimeout(timer);
      }, [over, lastEntry?.seat, lastEntry?.thought, lastEntry?.thoughtKey, history.length, t]);

      const winnerList = state.result?.winners ?? [];
      const winners = new Set(winnerList.map((w) => w.name));
      const winAmounts = new Map(winnerList.map((w) => [w.name, w.amount]));
      const shown = new Map((state.result?.shown ?? []).map((s) => [s.name, s.hand]));
      const liveOpponents = opponents.filter((s) => !s.folded);
      const revealedIds = new Set(liveOpponents.slice(0, revealed).map((s) => s.id));
      const showWinner = awarding || showResult;
      const resultPot = (state.result?.pots ?? []).reduce((sum, pot) => sum + (pot.amount ?? 0), 0);

      // The table is driven by the Host's lastAction. If a browser bundle is
      // ahead of the Host (refresh before restart), derive the same information
      // from the action stream so badges still work.
      const derived = new Map();
      for (const entry of state.history ?? []) {
        if (entry.street && entry.street !== state.street) continue;
        derived.set(entry.seat, {
          kind: entry.kind,
          amount: entry.amount ?? 0,
          to: entry.amount ?? 0,
          street: entry.street ?? state.street,
        });
      }

      const board = (state.board ?? []).slice();
      const boardCards = board.map((c, i) => h(Card, {
        key: `${c}-${i}`, value: c, board: true, deal: true, index: i,
      }));
      while (boardCards.length < 5) {
        boardCards.push(h(Card, { key: `slot-${boardCards.length}`, value: null, board: true }));
      }

      const bets = state.seats.map((seat, i) => {
        // The hero's own bet is already in the pot and in the seat's action
        // badge; a floating chip there would sit on top of the pot at narrow
        // widths. Only opponents get a chip marker on the felt.
        if (i === 0 || over || !(seat.streetCommitted > 0)) return null;
        const spot = betSpot(spots[i - 1]);
        return h(
          'div',
          {
            key: `bet-${seat.id}`,
            className: 'pk-bet' + (seat.allIn ? ' pk-bet--allin' : ''),
            style: { left: `${spot.left}%`, top: `${spot.top}%` },
          },
          h('span', { className: 'pk-bet__chips' }, h(ChipStack, { count: 2 })),
          h('span', { className: 'pk-bet__amount' }, String(seat.streetCommitted)),
        );
      });

      const dealer = state.seats[state.dealer];
      const dealerPosition = dealer
        ? (dealer.id === 0 ? { left: 57, top: 64 } : dealerSpot(spots[dealer.id - 1]))
        : null;

      const seat = (target, isHero, spot) => {
        const payout = over && winners.has(target.name) ? (winAmounts.get(target.name) ?? 0) : 0;
        const displayStack = over && !showResult ? Math.max(0, target.stack - payout) : target.stack;
        return h(Seat, {
        key: target.id,
        seat: target,
        state,
        t,
        isHero,
        spot,
        stack: displayStack,
        active: state.toAct === target.id && state.phase === 'betting',
        won: over && winners.has(target.name) && showWinner,
        handName: over && (!over || target.human || revealedIds.has(target.id))
          ? shown.get(target.name) ?? null
          : null,
        winAmount: showResult ? winAmounts.get(target.name) ?? 0 : 0,
        lost: over && showResult && !winners.has(target.name),
        reveal: !over || target.human || revealedIds.has(target.id),
        lastAction: target.lastAction ?? derived.get(target.id) ?? null,
        bubble: bubble && bubble.seat === target.id ? bubble.text : null,
        bubbleBelow: spot.top < 35,
        bubbleAlign: spot.left < 30 ? 'left' : spot.left > 70 ? 'right' : 'center',
        });
      };

      return h(
        'div',
        { className: 'pk-table', role: 'group', 'aria-label': t('panel') },
        h('div', { className: 'pk-felt' }),
        h('div', { className: 'pk-watermark', 'aria-hidden': true }, 'HOLD’EM'),
        h(
          'div',
          { className: 'pk-board' },
          h('div', { className: 'pk-board__label' }, t('board')),
          h('div', { className: 'pk-board__cards' }, boardCards),
        ),
        !over
          ? h(
            'div',
            { className: 'pk-pot' },
            h('span', { className: 'pk-pot__chips' },
              h(ChipStack, { count: Math.min(4, Math.max(2, Math.ceil(state.pot / 40))) })),
            h(
              'span',
              { className: 'pk-pot__line' },
              h('span', { className: 'pk-pot__label' }, t('pot')),
              h('span', { className: 'pk-pot__amount' }, String(state.pot)),
            ),
          )
          : awarding
            ? null
            : h(
              'div',
              { className: 'pk-pot' + (showResult ? ' pk-pot--showdown' : '') },
              showResult
                ? null
                : h('span', { className: 'pk-pot__chips' },
                  h(ChipStack, { count: Math.min(4, Math.max(2, Math.ceil(resultPot / 40))) })),
              h(
                'span',
                { className: 'pk-pot__line' },
                showResult
                  ? h('span', { className: 'pk-pot__amount' }, state.result?.kind === 'bust'
                    ? t('end.bust')
                    : state.result?.kind === 'sweep'
                      ? t('end.sweep')
                      : ((state.result?.shown ?? []).length > 0 ? t('street.showdown') : t('result.foldWin')))
                  : [
                    h('span', { key: 'l', className: 'pk-pot__label' }, t('pot')),
                    h('span', { key: 'a', className: 'pk-pot__amount' }, String(resultPot)),
                  ],
              ),
            ),
        ...bets,
        dealerPosition
          ? h(Dealer, { left: dealerPosition.left, top: dealerPosition.top, t })
          : null,
        seat(hero, true, { left: 50, top: 86 }),
        opponents.map((target, i) => seat(target, false, spots[i])),
        awarding && winnerList.length > 0
          ? h(PotAward, { winners: winnerList, seats: state.seats, spots })
          : null,
      );
    }

    /** Equity / pot-odds readout, the numbers a player actually uses. */
    function StatStrip({ state, t }) {
      const over = state.phase === 'over';
      const eq = over ? null : state.equity;
      // `tie` is already the hero's expected share of tied pots (1/tiedCount
      // per tie), so equity is simply win + tie.
      const pct = eq ? Math.round((eq.win + eq.tie) * 100) : null;
      // The generic `legal` belongs to whoever acts now — often an AI. The
      // "to call / pot odds" readout describes the HUMAN's decision, so read
      // the hero's own view when the Host provides it.
      const hero = state.heroLegal ?? state.legal;
      const odds = !over && hero && hero.callCost > 0
        ? Math.round(hero.potOdds * 100)
        : null;
      const callCost = !over && hero ? hero.callCost ?? 0 : 0;
      const resultPot = over
        ? (state.result?.pots ?? []).reduce((sum, pot) => sum + (pot.amount ?? 0), 0)
        : state.pot;
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
        tile('tocall', over ? '—' : (callCost > 0 ? String(callCost) : '—'),
          odds === null ? null : h('div', { className: 'pk-stat__sub' },
            `${t('potodds')} ${odds}%`)),
        tile('pot', String(resultPot)),
        tile('currentbet', over ? '—' : String(state.currentBet ?? 0)),
      );
    }

    /** Current-hand action log. Four rows; the table carries the immediate cues. */
    function History({ state, t }) {
      const rows = (state.history ?? []).slice(-4);
      const padded = rows.slice();
      while (padded.length < 4) padded.push(null);
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
                ? h('span', { key: 'w', className: 'pk-history__thought' }, `（${thoughtText(t, entry)}）`)
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
                'aria-label': t('raise.amount'),
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

    function ChartIcon({ size }) {
      return h(
        'svg',
        {
          width: size ?? 13, height: size ?? 13, viewBox: '0 0 16 16',
          fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5',
          'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true,
        },
        h('path', { d: 'M2.5 13.5h11' }),
        h('path', { d: 'M3 10.5 6.2 7.3l2.4 2.2L13 4.5' }),
        h('path', { d: 'M10.5 4.5H13v2.5' }),
      );
    }

    /**
     * One flying pot stack. It mounts at the pot and moves to the winner's
     * seat on the next frame, so the CSS left/top transition has a start point.
     */
    function AwardChip({ target, amount, delay }) {
      const [flying, setFlying] = React.useState(false);
      React.useEffect(() => {
        const frame = requestAnimationFrame(() => setFlying(true));
        return () => cancelAnimationFrame(frame);
      }, []);
      return h(
        'div',
        {
          className: 'pk-award',
          style: {
            left: `${flying ? target.left : 50}%`,
            top: `${flying ? target.top : 57}%`,
            transitionDelay: `${delay}ms`,
          },
        },
        h('span', { className: 'pk-award__chips' }, h(ChipStack, { count: 3 })),
        h('span', { className: 'pk-award__amount' }, `+${amount}`),
      );
    }

    function PotAward({ winners, seats, spots }) {
      const hero = seats[0];
      return h(
        React.Fragment,
        null,
        winners.map((winner, i) => {
          let target = { left: 50, top: 86 };
          if (!hero || winner.name !== hero.name) {
            const index = seats.findIndex((seat) => seat.name === winner.name);
            target = index > 0 && spots[index - 1] ? spots[index - 1] : { left: 50, top: 50 };
          }
          return h(AwardChip, {
            key: winner.name,
            target,
            amount: winner.amount,
            delay: i * 130,
          });
        }),
      );
    }

    function TableView({ state, t, busy, onAction, onAdvice, onNext, onHistory, loadFailed, onRetry, loading }) {
      const overNow = state?.phase === 'over';
      const liveCount = state ? state.seats.filter((s) => !s.human && !s.folded).length : 0;
      const [revealed, setRevealed] = React.useState(0);
      const [awarding, setAwarding] = React.useState(false);
      const [showResult, setShowResult] = React.useState(false);
      const runRef = React.useRef(0);

      // Staged settlement: reveal live hands one by one, fly the pot to the
      // winner(s), then swap the waiting bar for the real result. A poll or a
      // re-render cannot restart it because the effect is keyed by the hand.
      React.useEffect(() => {
        if (!overNow) {
          setRevealed(0);
          setAwarding(false);
          setShowResult(false);
          return undefined;
        }
        const result = state?.result;
        const live = state ? state.seats.filter((s) => !s.human && !s.folded) : [];
        const winners = result?.winners ?? [];
        const run = runRef.current + 1;
        runRef.current = run;
        const alive = (fn) => {
          if (runRef.current === run) fn();
        };
        const reduced = typeof window !== 'undefined' && window.matchMedia
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const timers = [];
        if (!result || reduced) {
          setRevealed(live.length);
          setAwarding(false);
          setShowResult(true);
          return () => { runRef.current += 1; };
        }
        setRevealed(0);
        setAwarding(false);
        setShowResult(false);
        const revealStart = 220;
        const step = 280;
        const awardWait = 760 + Math.max(0, winners.length - 1) * 130;
        if (live.length === 0) {
          timers.push(setTimeout(() => alive(() => setAwarding(true)), revealStart));
          timers.push(setTimeout(() => alive(() => { setAwarding(false); setShowResult(true); }), revealStart + awardWait));
        } else {
          for (let i = 0; i < live.length; i += 1) {
            timers.push(setTimeout(() => alive(() => setRevealed(i + 1)), revealStart + i * step));
          }
          timers.push(setTimeout(() => alive(() => setAwarding(true)), revealStart + live.length * step));
          timers.push(setTimeout(
            () => alive(() => { setAwarding(false); setShowResult(true); }),
            revealStart + live.length * step + awardWait,
          ));
        }
        return () => {
          runRef.current += 1;
          timers.forEach(clearTimeout);
        };
      }, [overNow, state?.handNumber]);

      const skip = React.useCallback(() => {
        runRef.current += 1;
        setRevealed(liveCount);
        setAwarding(false);
        setShowResult(true);
      }, [liveCount]);

      if (!state) {
        return h(
          'div',
          { className: 'pk-root' },
          h(
            'div',
            { className: 'pk-empty' },
            loadFailed
              ? [
                h('div', { key: 'm' }, t('error.load')),
                h('button', {
                  key: 'r',
                  className: 'pk-btn',
                  style: { marginTop: '10px' },
                  onClick: onRetry,
                }, t('history.retry')),
              ]
              : h('div', { className: 'pk-dots' }, h('span'), h('span'), h('span')),
          ),
        );
      }
      const myTurn = state.phase === 'betting' && state.toAct === 0;
      const isOver = state.phase === 'over';
      const me = state.seats.find((s) => s.human);
      const iWon = isOver
        && (state.result?.winners ?? []).some((w) => w.name === (me ? me.name : ''));
      const endKind = state.result?.kind ?? null;
      const ended = isOver && (endKind === 'bust' || endKind === 'sweep');

      // Announced to assistive tech: whose turn it is, and how the hand ended.
      const announcement = isOver
        ? (ended
          ? (endKind === 'sweep' ? t('end.sweep') : t('end.bust'))
          : (iWon ? t('a11y.handWon') : t('a11y.handOver')))
        : (myTurn ? t('a11y.yourTurn') : '');

      return h(
        'div',
        { className: 'pk-root' },
        h('div', {
          className: 'pk-sr-only',
          role: 'status',
          'aria-live': 'polite',
          'aria-atomic': 'true',
        }, announcement),
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
          h(
            'div',
            { className: 'pk-topright' },
            h('button', {
              className: 'pk-historybtn',
              onClick: onHistory,
              title: t('history.title'),
              'aria-label': t('history.title'),
            }, h(ChartIcon, { size: 13 }), h('span', null, t('history'))),
            h('span', { className: 'pk-blinds' },
              `${t('blinds')} ${state.smallBlind}/${state.bigBlind}`),
          ),
        ),
        h(TableBoard, { state, t, revealed, awarding, showResult }),
        h(StatStrip, { state, t }),
        h(History, { state, t }),
        h(
          'div',
          { className: 'pk-actionbar' },
          isOver && !showResult
            ? h(
              'div',
              { className: 'pk-result pk-result--waiting' },
              h(
                'div',
                { className: 'pk-result__line' },
                h('span', { className: 'pk-result__verdict' },
                  awarding ? t('showdown.collect') : t('showdown.reveal')),
                h('span', { className: 'pk-result__detail' },
                  awarding ? t('showdown.collect.detail') : t('showdown.reveal.detail')),
              ),
              h(
                'div',
                { className: 'pk-result__line' },
                h('button', { className: 'pk-btn', onClick: skip }, t('showdown.skip')),
              ),
            )
            : ended
              ? h(
              'div',
              { className: 'pk-result' },
              h(
                'div',
                { className: 'pk-result__line' },
                h(
                  'span',
                  {
                    className: 'pk-result__verdict '
                      + (endKind === 'sweep' ? 'pk-result__verdict--win' : 'pk-result__verdict--lose'),
                  },
                  endKind === 'sweep' ? t('end.sweep') : t('end.bust'),
                ),
                h('span', { className: 'pk-result__detail' },
                  endKind === 'sweep' ? t('end.sweep.detail') : t('end.bust.detail')),
              ),
              h(
                'div',
                { className: 'pk-result__line' },
                h('button', {
                  className: 'pk-btn pk-btn--primary',
                  disabled: busy,
                  onClick: onNext,
                }, endKind === 'sweep' ? t('new.game') : t('rebuy')),
              ),
            )
            : isOver
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
                      .map((w) => {
                        if (w.name === (me ? me.name : '')) {
                          return w.hand
                            ? t('result.you.hand', { hand: handLabel(t, w.hand) })
                            : t('result.foldWin');
                        }
                        const label = seatName(t, state.seats.find((s) => s.name === w.name));
                        return w.hand
                          ? t('result.detail', { name: label, hand: handLabel(t, w.hand) })
                          : t('result.winNoHand', { name: label });
                      })
                      .join(t('result.join'))),
                ),
                h(
                  'div',
                  { className: 'pk-result__line' },
                  h('button', { className: 'pk-btn pk-btn--primary', disabled: busy, onClick: onNext }, t('next.hand')),
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
        isOver
          ? null
          : h(
            'div',
            { className: 'pk-actions' },
            h('button', { className: 'pk-coachbtn', disabled: busy, onClick: onAdvice }, t('advice.ask')),
          ),
      );
    }

    function ProfitCurve({ hands, t }) {
      if (!hands || hands.length === 0) {
        return h('div', { className: 'pk-curve' },
          h('div', { className: 'pk-curve__empty' }, t('history.empty.curve')));
      }
      const values = [];
      let sum = 0;
      for (const hand of hands) {
        sum += hand.hero?.net ?? 0;
        values.push(sum);
      }
      let min = Math.min(0, ...values);
      let max = Math.max(0, ...values);
      if (min === max) { min = -1; max = 1; }
      const span = max - min;
      const n = values.length;
      const x = (i) => (n === 1 ? 300 : 12 + (i / (n - 1)) * 576);
      const y = (v) => 16 + ((max - v) / span) * 128;
      const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
      const zeroY = y(0);
      const area = `${line} L${x(n - 1).toFixed(1)} ${zeroY.toFixed(1)} L${x(0).toFixed(1)} ${zeroY.toFixed(1)} Z`;
      const positive = values[n - 1] >= 0;
      const color = positive ? '#4bb07a' : '#e06060';
      const gradient = positive ? 'pk-curve-good' : 'pk-curve-bad';
      return h(
        'div',
        { className: 'pk-curve' },
        h('div', { className: 'pk-curve__y' },
          max > 0 ? h('span', { style: { top: '0%' } }, String(max)) : null,
          h('span', { style: { top: `${(max / span) * 100}%` } }, '0'),
          min < 0 ? h('span', { style: { bottom: '0%' } }, String(min)) : null),
        h(
          'div',
          { className: 'pk-curve__plot' },
          h(
            'svg',
            { viewBox: '0 0 600 180', preserveAspectRatio: 'none', role: 'img', 'aria-label': t('history.curve') },
            h('defs', null, h('linearGradient', { id: gradient, x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '.34' }),
              h('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '.02' }))),
            h('line', {
              x1: 8, y1: zeroY, x2: 592, y2: zeroY,
              stroke: 'currentColor', 'stroke-opacity': '.22', 'stroke-dasharray': '4 5',
              'vector-effect': 'non-scaling-stroke',
            }),
            h('path', { d: area, fill: `url(#${gradient})` }),
            h('path', {
              d: line, fill: 'none', stroke: color, 'stroke-width': 2,
              'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke',
            }),
            values.map((v, i) => h('circle', {
              key: i, cx: x(i), cy: y(v), r: 2.4, fill: color,
            }, h('title', null, `#${hands[i].id} ${formatSigned(hands[i].hero?.net ?? 0)}`))),
          ),
        ),
        h('div', { className: 'pk-curve__x' },
          h('span', null, t('history.hand', { n: hands[0].id })),
          h('span', null, t('history.hand', { n: hands[hands.length - 1].id }))),
      );
    }

    function HandHistoryList({ hands, t, expanded, onToggle }) {
      if (!hands || hands.length === 0) {
        return h('div', { className: 'pk-drawer__state' }, t('history.empty'));
      }
      const rows = hands.slice().reverse();
      return h(
        'div',
        { className: 'pk-handlist' },
        rows.map((hand) => {
          const open = expanded === hand.id;
          const net = hand.hero?.net ?? 0;
          const tone = netTone(net);
          const handText = hand.hero?.folded
            ? t('action.fold')
            : (handLabel(t, hand.hero?.hand) || t('history.noShowdown'));
          return h(
            'div',
            { className: 'pk-handrow', key: hand.id },
            h(
              'div',
              {
                className: 'pk-handrow__head',
                role: 'button',
                tabIndex: 0,
                'aria-expanded': open,
                onClick: () => onToggle(open ? null : hand.id),
                onKeyDown: (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle(open ? null : hand.id);
                  }
                },
              },
              h('span', { className: 'pk-handrow__id' }, `#${hand.id}`),
              h('span', { className: 'pk-handrow__cards' },
                (hand.hero?.cards ?? []).map((c, i) => h(Card, { key: i, value: c, index: i }))),
              h('span', { className: 'pk-handrow__meta' },
                h('span', { className: 'pk-handrow__hand' }, handText),
                h('span', { className: 'pk-handrow__board' }, cardLine(hand.board) || '—')),
              hand.rebuy ? h('span', { className: 'pk-rebuy' }, t('history.rebuy')) : null,
              h('span', { className: `pk-handrow__net pk-handrow__net--${tone}` }, formatSigned(net)),
              h('span', { className: 'pk-handrow__chev' }, open ? '⌄' : '›'),
            ),
            open
              ? h(
                'div',
                { className: 'pk-handrow__detail' },
                h('div', { className: 'pk-handrow__actions' },
                  (hand.actions ?? []).map((action, i) => h(
                    'span',
                    { key: i, className: 'pk-handrow__action' },
                    action.text,
                  ))),
                h('div', { className: 'pk-handrow__foot' },
                  `${t('pot')} ${hand.pot} · ` + (hand.winners ?? [])
                    .map((w) => `${w.name} ${formatSigned(w.amount)}${w.hand ? ` · ${handLabel(t, w.hand)}` : ''}`)
                    .join(' / ')),
                h('div', { className: 'pk-handrow__foot' },
                  (hand.opponents ?? []).map((o) => {
                    const state = o.folded
                      ? t('action.fold')
                      : (o.hand ? handLabel(t, o.hand) : '—');
                    return `${o.name} ${state} ${o.stack}`;
                  }).join(' · ')),
              )
              : null,
          );
        }),
      );
    }

    function HistoryDrawer({ open, data, loading, error, onClose, onRefresh, t }) {
      const [expanded, setExpanded] = React.useState(null);
      const panelRef = React.useRef(null);
      const restoreRef = React.useRef(null);
      React.useEffect(() => {
        if (open) setExpanded(null);
      }, [open]);
      // Focus management: a modal drawer must take focus on open, keep Tab
      // inside itself, and hand focus back to whatever opened it.
      React.useEffect(() => {
        if (!open) return undefined;
        restoreRef.current = typeof document !== 'undefined' ? document.activeElement : null;
        const panel = panelRef.current;
        const focusables = () => {
          if (!panel) return [];
          return Array.from(panel.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          )).filter((node) => !node.disabled && node.offsetParent !== null);
        };
        const first = focusables()[0];
        if (first) first.focus();
        else if (panel) panel.focus();

        const onKey = (e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
            return;
          }
          if (e.key !== 'Tab') return;
          const items = focusables();
          if (items.length === 0) return;
          const firstItem = items[0];
          const lastItem = items[items.length - 1];
          if (e.shiftKey && document.activeElement === firstItem) {
            e.preventDefault();
            lastItem.focus();
          } else if (!e.shiftKey && document.activeElement === lastItem) {
            e.preventDefault();
            firstItem.focus();
          }
        };
        window.addEventListener('keydown', onKey);
        return () => {
          window.removeEventListener('keydown', onKey);
          const restore = restoreRef.current;
          if (restore && typeof restore.focus === 'function') restore.focus();
        };
      }, [open, onClose]);

      if (!open) return null;
      const hands = data?.hands ?? [];
      const summary = data?.summary;
      const hasSummary = summary && typeof summary.net === 'number';
      const net = hasSummary ? summary.net : 0;
      const netClass = net > 0 ? 'win' : net < 0 ? 'lose' : '';
      return h(
        'div',
        { className: 'pk-drawer-backdrop', onClick: onClose },
        h(
          'div',
          {
            className: 'pk-drawer',
            role: 'dialog',
            'aria-modal': true,
            'aria-label': t('history.title'),
            tabIndex: -1,
            ref: panelRef,
            onClick: (e) => e.stopPropagation(),
          },
          h(
            'div',
            { className: 'pk-drawer__head' },
            h(
              'div',
              null,
              h('div', { className: 'pk-drawer__title' }, t('history.title')),
              h('div', { className: 'pk-drawer__sub' },
                t('history.session', { n: summary?.sessionHands ?? hands.length }),
                hasSummary ? ` · ${t('history.current')} ${summary.currentStack}` : ''),
            ),
            h(
              'div',
              { style: { display: 'flex', gap: '6px' } },
              h('button', {
                className: 'pk-drawer__close',
                onClick: onRefresh,
                title: t('history.refresh'),
                'aria-label': t('history.refresh'),
              }, '↻'),
              h('button', {
                className: 'pk-drawer__close',
                onClick: onClose,
                title: t('history.close'),
                'aria-label': t('history.close'),
              }, '×'),
            ),
          ),
          h(
            'div',
            { className: 'pk-drawer__body' },
            loading && !data
              ? h('div', { className: 'pk-drawer__state' }, t('history.loading'))
              : error
                ? h('div', { className: 'pk-drawer__state' },
                  h('div', null, error),
                  h('button', { className: 'pk-btn', onClick: onRefresh }, t('history.retry')))
                : h(
                  React.Fragment,
                  null,
                  hasSummary
                    ? h(
                      'div',
                      { className: 'pk-summary' },
                      h('div', { className: 'pk-summary__tile' },
                        h('div', { className: 'pk-summary__k' }, t('history.hands')),
                        h('div', { className: 'pk-summary__v' }, String(summary.sessionHands ?? summary.hands))),
                      h('div', { className: 'pk-summary__tile' },
                        h('div', { className: 'pk-summary__k' }, t('history.net')),
                        h('div', { className: `pk-summary__v pk-summary__v--${netClass}` }, formatSigned(net))),
                      h('div', { className: 'pk-summary__tile' },
                        h('div', { className: 'pk-summary__k' }, t('history.winrate')),
                        h('div', { className: 'pk-summary__v' }, `${Math.round((summary.winRate ?? 0) * 100)}%`)),
                      h('div', { className: 'pk-summary__tile' },
                        h('div', { className: 'pk-summary__k' }, t('history.biggest')),
                        h('div', { className: 'pk-summary__v' }, String(summary.biggestPot))),
                    )
                    : null,
                  h(ProfitCurve, { hands, t }),
                  hands.length > 0
                    ? h('div', { className: 'pk-drawer__note' }, t('history.note'))
                    : null,
                  h(HandHistoryList, {
                    hands, t, expanded,
                    onToggle: (id) => setExpanded(id),
                  }),
                ),
          ),
        ),
      );
    }

    function Styles() {
      return h('style', { dangerouslySetInnerHTML: { __html: CSS } });
    }

    function Panel(props) {
      const t = props.t;
      const [state, setState] = React.useState(null);
      const [loadFailed, setLoadFailed] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [advice, setAdvice] = React.useState(null);
      const [asking, setAsking] = React.useState(false);
      const [historyOpen, setHistoryOpen] = React.useState(false);
      const [historyData, setHistoryData] = React.useState(null);
      const [historyLoading, setHistoryLoading] = React.useState(false);
      const [historyFailed, setHistoryFailed] = React.useState(false);

      const call = React.useCallback(async (path, body) => {
        const response = await fetch(path, {
          method: body ? 'POST' : 'GET',
          headers: body ? { 'content-type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) throw new Error(`${path} -> ${response.status}`);
        return response.json();
      }, []);

      const refresh = React.useCallback(async () => {
        try {
          setState(await call('/poker/state'));
          setLoadFailed(false);
        } catch {
          setLoadFailed(true);
        }
      }, [call]);

      React.useEffect(() => {
        void refresh();
      }, [refresh]);

      // Poll while the table is live: on mount the first snapshot can show an
      // AI mid-thought, and another window's actions must show up here too.
      React.useEffect(() => {
        if (!state || state.phase === 'over') return undefined;
        const timer = setInterval(() => {
          call('/poker/state').then(setState).catch(() => {});
        }, 1200);
        return () => clearInterval(timer);
      }, [state?.phase, state?.handNumber, call]);

      const loadHistory = React.useCallback(async () => {
        setHistoryLoading(true);
        setHistoryFailed(false);
        try {
          setHistoryData(await call('/poker/history'));
        } catch {
          setHistoryFailed(true);
        } finally {
          setHistoryLoading(false);
        }
      }, [call]);

      const openHistory = React.useCallback(() => {
        setHistoryOpen(true);
        void loadHistory();
      }, [loadHistory]);

      const closeHistory = React.useCallback(() => setHistoryOpen(false), []);

      // A hand can settle while the drawer is already open. Refresh on the
      // transition, not on every poll.
      React.useEffect(() => {
        if (historyOpen && state?.phase === 'over') void loadHistory();
      }, [historyOpen, state?.phase, state?.handNumber, loadHistory]);

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
        h(TableView, {
          state, t, busy, onAction, onAdvice, onNext, onHistory: openHistory,
          loadFailed, onRetry: refresh, loading: !state && !loadFailed,
        }),
        // Coach answers fold in below the controls; the slot collapses when
        // empty so the table gets the vertical space instead.
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
                      `${t('equity')} ${Math.round((advice.equity.win + advice.equity.tie) * 100)}%`)
                    : null,
                ),
                h('p', { className: 'pk-advice__text' }, advice.advice),
              )
              : null,
        ),
        h(HistoryDrawer, {
          open: historyOpen,
          data: historyData,
          loading: historyLoading,
          error: historyFailed ? t('history.error') : null,
          onClose: closeHistory,
          onRefresh: loadHistory,
          t,
        }),
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
