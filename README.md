# dsh-poker · 德州扑克

一个跑在 [DeepSeek Harness](https://github.com/deepseek-ai) 里的无限注德州扑克面板：你坐一桌，3 个风格不同的 AI 对手陪打，点「问 AI 教练」可以让当前会话的模型给你一手牌的建议。

![宽屏](docs/screenshot-wide.png)

## 玩法

- 起始筹码 1000，盲注 5/10，每手牌结束后点「下一手」继续。
- 对手有 4 种性格（紧凶、松凶、石头、疯狗），按座位轮换；下注前会有 0.25–1.4 秒的思考停顿，所以你能看见他们轮流行动，而不是整条街一次性出结果。
- 你行动时给出 弃牌 / 过牌 / 跟注 / 加注，加注面板带滑杆和 1/2 池、满池、全下三个快捷键。
- 顶部一条街进度条（翻牌前 → 翻牌 → 转牌 → 河牌），左侧实时显示胜率、需跟注、底池、当前注。
- 全下会正确切分边池，无人跟的多余下注会退回；摊牌亮出的牌型（两对、顺子等）会标在赢家座位上。

## 安装

### 方式一：npm（推荐）

已发布在 npm：**`dsh-texas-poker`**。在 Harness 的插件管理里安装 bundle，spec 填：

```
dsh-texas-poker
```

Harness 会用 pnpm 把它装进当前 profile，并把 `dsh-texas-poker` 加进 `dsh.profile.bundles`，然后重启即可。升级：`pnpm update dsh-texas-poker` 再重启。

### 方式二：直接从 GitHub 装

spec 填下面任意一个，效果和 npm 一样（Harness 用 pnpm 从仓库克隆）：

```
github:garyleelty/dsh-poker
https://github.com/garyleelty/dsh-poker
```

git 形式的安装会钉在安装当时的 commit 上，想升级要重新装一次（`pnpm update dsh-texas-poker`，或卸掉再装一遍），然后重启 Harness。

### 方式三：克隆到本地改代码

```bash
git clone https://github.com/garyleelty/dsh-poker.git ~/code/dsh-poker
```

编辑你的 profile（例如 `~/.dsh/profiles/desktop/package.json`）：

```jsonc
{
  "dependencies": {
    // 必须是绝对路径；link: 会跟着本地改动实时生效
    "dsh-texas-poker": "link:/Users/你/code/dsh-poker"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-texas-poker"   // ← 加这一行
      ]
    }
  }
}
```

然后在该 profile 目录下 `pnpm install`，重启 Harness。装好后侧边栏底部会多出一个德州扑克图标。

> 包名出现在四个地方，改名字的话要一起改：`package.json` 的 `name`、`cordis.patch.yml` 里 insert 行的 `name`、`client.js` 里 `__ModuleLoader__.load({ id })`、以及 profile 的依赖名和 `dsh.profile.bundles`。

## 配置

配置写在 bundle 自带的 `cordis.patch.yml` 里（也可以在 profile 的 `cordis.patch.yml` 里按 `id: texas-poker` 覆盖）：

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `stack` | `1000` | 每人起始筹码 |
| `smallBlind` / `bigBlind` | `5` / `10` | 盲注 |
| `opponents` | `3` | AI 对手数量 |
| `equityTrials` | `400` | 胜率蒙特卡洛模拟次数，越大越准也越慢 |
| `adviceMaxTokens` | `400` | 教练回答的长度上限 |
| `thinkPace` | `1` | 对手思考时长倍率，`0` 表示不等待 |

## 它是怎么工作的

插件是标准的 DSH bundle，一半在 Host、一半在浏览器：

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半边。注册 `/poker/state`、`/poker/action`、`/poker/new-hand`、`/poker/advice` 四个 HTTP 路由，驱动 AI 行动，并用 `llm` + `agentDefaultModel` 服务向当前默认模型要建议 |
| `client.js` | 浏览器半边。通过 `slots` 注册侧边栏条目和主面板，界面全部是原生 CSS |
| `lib/table.js` | 无限注状态机：盲注、各条街下注轮、边池、退回多余下注、摊牌 |
| `lib/hand.js` | 7 张牌取最优 5 张的牌型比较 |
| `lib/odds.js` | 确定性 xorshift32 随机数 + 蒙特卡洛胜率 |
| `lib/ai.js` | 4 种对手风格的下注决策 |

界面不依赖任何 UI 框架，只用 Harness 的 `--dsw-*` 主题变量，所以自动跟随亮/暗主题。

### 桌子尺寸自适应

整个牌桌的尺寸都由面板自己那一格的宽度推导：面板是 CSS 容器（`container-type: inline-size`），牌宽 `clamp(24px, 3.6cqw, 40px)`，其余尺寸（公共牌位、座位高、毛毡最小高度、字号）全部是牌宽的函数。用 `cqw` 而不是 `vw` 是因为侧边栏展开/收起时窗口宽度不变、只有主区域变了。窄屏下牌小、座位窄，但永远是一行、不会换行——换行会让面板高度在游戏中变化。

![窄屏](docs/screenshot-narrow.png)

## 开发

```bash
node --check client.js && node --check index.js   # 语法
```

客户端改动刷新页面即可生效；Host 改动需要重启 Harness。

`lib/` 是纯函数，可以直接在 Node 里跑：`node -e "import('./lib/table.js').then(...)"`。改动状态机后建议跑一遍筹码守恒 soak（固定盲注下打完 N 手，所有座位筹码 + 底池应恒等于初始总额）。

## 已知边界

- 只有单桌，所有人共用一份服务端状态，换窗口看到的是同一桌。
- AI 教练依赖当前会话的默认模型；没有可用模型时会退回规则引擎给建议。
- 仅供娱乐与策略练习，不涉及任何真实货币。
