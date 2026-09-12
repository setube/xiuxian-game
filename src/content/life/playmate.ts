import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 一起长大的那个人。
 *
 * ## 他一直都在，只是没有面目
 *
 * 出生那一刻东西两邻各生 0–3 个孩子（`content/birth.ts`），比玩家大 0–12 岁，
 * 一出生就认得。400 世实测：**84.8% 的人生至少有一个邻家孩子，
 * 而 `{playmate}` 认得出来的是 84.3%**（差的半个百分点被
 * `idOfPlaymate` 那两条门槛挡着：跟户主差不满十六岁的算大人，
 * 跟你差过十二岁的算哥哥辈）。
 * 他们是真人：有姓名、有生年、会老会死、进人口册。
 *
 * **而在这一册之前，全库内容一处也没有具名写过他。** 唯一读到他的是
 * `engine/daily.ts` 的 `alongNow()`——「今天跟谁去玩」按亲疏取第一个，
 * 有哥跟哥去，没哥才轮到他。他是**一个类别，不是一个人**。
 *
 * 而且 `alongNow` 只在童年日常里用得上：一个村里长大的人，
 * 十五岁以后再也见不到邻居家那个同龄人——他没死、没搬走，
 * 人口册上还在，只是没有任何一卷内容再提起他。
 *
 * ## 三回，三个年纪，同一个人
 *
 * 照 `Footing` 那段注释立的规矩（`types/game.ts:486`）：
 *
 * > 同一个人见三回，三回不一样。中间隔着的不是好感度条，
 * > 是**他每一回都重新看了你一眼**。
 *
 * 所以这一册**不加任何状态格**，三卷各自问已经有的东西：
 *
 *     少年　`{playmate}` 在不在身边　　　　　　　 一起干的一件事
 *     成家　他先成的家还是你先成的　　　　　　　 两条路岔开的那一年
 *     中年　这些年还走不走动（`affinity`）　　　 谁也没说破的那句话
 *
 * ## 不做的三件
 *
 * **一、不做好感度刷分。** 没有「一起玩 → +10」那种选项。
 * 三卷之间隔着的是年纪和各自的人生，不是攒出来的数。
 *
 * **二、不做档位。** `Footing` 那五档是修行者对求学者的，语义专用
 * （「我教你一个呼吸法，别出去乱说」）。玩伴之间不是一方培养另一方，
 * 是两个人一起长大——`affinity` 那个连续量已经够了，再加一层档是重复。
 *
 * **三、不给那 16% 保底。** 两户都掷 0 的人生里 `{playmate}` 是
 * `undefined`，这三卷一卷也演不到。**从小没有同龄玩伴是一种真实的人生**，
 * 不为了让内容有人读而发明一个玩伴。
 *
 * ## `{call:playmate}` 是这一册的全部机关
 *
 * 内容层写不出他的 id（`east-child-2` 是出生那一刻随机生成的），
 * 所以走 `roleId('playmate')`——按「邻户里跟你年纪最近、还在身边的孩子」
 * 现算（`engine/interpolate.ts`）。
 *
 * 现算而**结果稳定**：年龄差是固定的，大家一起变老，所以一辈子认同一个人。
 * 会变的只有他不在了或者搬走了——那时它落到下一个，
 * **而那正是对的**：一起玩的人走了，你还是会跟别的孩子玩，只是不再是他。
 */
export const playmateScenes: SceneLibrary = {
  /**
   * 少年：一起干的那件事。
   *
   * 不写「你们成了好朋友」——写一件具体的事，让读的人自己从事里读出来。
   * 三个选项都不给属性、不给旗标：**这一节只是让那个人有一张脸**。
   */
  'playmate:young': {
    id: 'playmate:young',
    title: '一起长大的',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        /*
         * ⚠️ **这一节不推时间，日子记在底下各支上。**
         *
         * 引擎的顺序是 `applyEffects(onEnter)` → 渲染正文 → 判 `branches`
         * （`engine/story.ts:306/307/318`）。时间写在这儿的话，
         * **推完那几个月玩伴可能已经殁了**，而 `{playmate}` 是现算的：
         * 它落到巷子里下一个孩子身上，于是正文里喊你的是另一个人，
         * 分支也按那个人的好感去判。
         *
         * 入场条件 `family playmate present` 挡不住这个——它在 onEnter 之前问。
         * 所以那句话说在当下，日子在之后过去。
         */
        blocks: [
          { kind: 'narration', text: '{call:playmate}比你早起，天没亮就在院墙外头喊。' },
          { kind: 'narration', text: '两家院子只隔一道矮墙，喊一声两边都听得见。' },
        ],
        choices: [
          {
            id: 'go',
            label: '跟他去',
            echo: '你翻过那道墙。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'meet', id: 'playmate', delta: 6, note: '一起爬过那道矮墙。' },
            ],
            next: 'went',
          },
          {
            id: 'later',
            label: '让他先走',
            hint: '家里的活还没做完',
            echo: '你说你等会儿去。',
            effects: [{ type: 'time', days: 1 }],
            next: 'stayed',
          },
        ],
      },

      went: {
        id: 'went',
        onEnter: [{ type: 'time', months: 3 }],
        blocks: [
          { kind: 'narration', text: '那天你们一直走到河滩上，回来的时候裤脚全是泥。' },
          {
            kind: 'narration',
            text: '各自的娘在各自的院子里骂了几句，隔着那道墙，听得清清楚楚。',
            tone: 'faint',
          },
        ],
      },

      stayed: {
        id: 'stayed',
        onEnter: [{ type: 'time', months: 3 }],
        blocks: [
          { kind: 'narration', text: '你把活做完，日头已经高了。' },
          {
            kind: 'narration',
            text: '他傍晚才回来，隔着墙说了句今天河滩上有什么。你嗯了一声。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 成家：两条路岔开的那一年。
   *
   * 这一节不问好感，问的是**谁先成的家**——那是这个时代里
   * 两个同龄人第一次真正分开走的地方。
   *
   * 三支都不判对错：先成家的那个不是赢了，晚成家的也不是输了。
   */
  'playmate:wed': {
    id: 'playmate:wed',
    title: '他成家那年',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        // 不推时间，理由同 `playmate:young` 的 open：推完他可能就不是他了
        blocks: [{ kind: 'narration', text: '{call:playmate}成亲那天，隔壁院子里摆了六桌。' }],
        /*
         * 三支按你自己成没成家分。顺序要紧：`branches` 取第一条成立的，
         * 所以「你也成了家」排在前面——它比「你还没有」更具体。
         */
        branches: [{ requires: [{ bond: { kind: '配偶', alive: true } }], next: 'both' }],
        next: 'notyet',
      },

      both: {
        id: 'both',
        onEnter: [{ type: 'time', months: 4 }],
        blocks: [
          { kind: 'narration', text: '你带着家里人去坐了一桌。两家的孩子在院子里跑。' },
          {
            kind: 'narration',
            text: '散席的时候他送你到门口，说了句这下咱们都是当家的了。',
            tone: 'faint',
          },
        ],
      },

      notyet: {
        id: 'notyet',
        onEnter: [
          { type: 'meet', id: 'playmate', delta: 2, note: '他成亲那天你去帮了忙。' },
          { type: 'time', months: 4 },
        ],
        blocks: [
          { kind: 'narration', text: '你去帮着搬了一天桌椅。' },
          { kind: 'narration', text: '新娘子进门的时候你在院子外头站着，没进去。' },
          {
            kind: 'narration',
            text: '回家路上有人问你什么时候轮到你，你笑了笑没接话。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 中年：还走不走动。
   *
   * 这一节是这一册唯一读 `affinity` 的地方，而它读的不是「好感够不够高」，
   * 是**这些年攒下来的那点交情还在不在**。
   *
   * 两支的分别不在谁对谁错，在**他们各自过了什么日子**——
   * 一个常来常往的和一个多年不说话的，隔着的是几十年，不是几分好感。
   */
  'playmate:years': {
    id: 'playmate:years',
    title: '还走不走动',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        // 不推时间，理由同上两卷的 open。这一卷尤其要紧：
        // 这一节的分支读的正是 `{playmate}` 的好感，换了人就换了那一格
        blocks: [{ kind: 'narration', text: '入冬前你在巷口碰见{call:playmate}。' }],
        /*
         * 6 这个门槛不是「好感度及格线」，它是**少年那一卷跟没跟他去**。
         *
         * 出生时 `meet` 落 0，少年那一卷跟去是 +6、没跟去是 0，
         * 他成亲帮忙是 +2。所以：
         *
         *     跟他去过　　　6 或 8　→ close
         *     没跟他去过　　0 或 2　→ apart
         *
         * ⚠️ **这条线原来写的是 20，而那一档一个人也够不着。**
         * 200 世实测：邻家孩子的好感最低 0、**最高 8**，够到 20 的 0/169。
         * 也就是说 `close` 那一节写完就是死的——而「走得到吗」那类判据
         * 照样全绿，因为摆局里想给多少给多少
         * （CLAUDE.md「拿一生的总数去定一个中途时刻的门槛」那条，
         * 这里连一生的总数都够不着）。
         *
         * 量它的那天：2026-09-12，主干 `87a28f6` 之后，200 世真人生，
         * 分母是「这一世人口册里有邻家孩子」的 169 世。
         *
         * 门槛该跟着内容走：哪天别处添了跟他来往的内容（荒年匀粮、
         * 一起做工、他家出事你去过），分布整个上移，这条线就该抬回去。
         * `scripts/playmate.ts` 那条「两支各有各的人走」判据守着这件事——
         * 全够得着和全够不着，它都会红。
         */
        branches: [
          { requires: [{ family: { id: 'playmate', affinity: { atLeast: 6 } } }], next: 'close' },
        ],
        next: 'apart',
      },

      close: {
        id: 'close',
        onEnter: [{ type: 'time', months: 6 }],
        blocks: [
          { kind: 'narration', text: '他站住了，问你家里都还好。你们在巷口说了半盏茶的话。' },
          {
            kind: 'narration',
            text: '走的时候他说，有事言语一声。这句话你们说了几十年了。',
            tone: 'faint',
          },
        ],
      },

      apart: {
        id: 'apart',
        onEnter: [{ type: 'time', months: 6 }],
        blocks: [
          { kind: 'narration', text: '他点了下头，你也点了下头。' },
          { kind: 'narration', text: '两个人都没停下来。' },
          {
            kind: 'narration',
            text: '小时候翻过的那道墙早就塌了，两家各自砌了新的，比从前高。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

export const playmateEvents: readonly LifeEvent[] = [
  {
    /**
     * 少年那一回。
     *
     * `family playmate present` 是这一族的入场核心：**它不是问「有没有邻居」，
     * 是问「此刻身边有没有一个跟你年纪相近的邻家孩子」**——
     * 400 世实测约 16% 的人生里没有这样一个人，他们这三卷一卷也演不到。
     *
     * 窗口八到十四：`alongNow` 那条「跟谁去玩」管的是更小的时候，
     * 这一卷要的是记事之后、还没出去做事之前那几年。
     */
    id: 'playmate-young',
    window: { from: 8, to: 14 },
    requires: [{ family: { id: 'playmate', present: true } }],
    scene: 'playmate:young',
    weight: 14,
  },
  {
    /**
     * 他成家那一回。
     *
     * 十八到三十：这个时代的人多半在这几年里成家。
     * 不问玩家自己成没成——那是卷里第一节分支的事，不是入场资格。
     */
    id: 'playmate-wed',
    window: { from: 18, to: 30 },
    requires: [{ family: { id: 'playmate', present: true } }],
    scene: 'playmate:wed',
    weight: 12,
  },
  {
    /**
     * 中年碰见那一回。
     *
     * 三十五往后。这一卷问的是「这些年还走不走动」，
     * 而那句话要隔着几十年才说得出口。
     */
    id: 'playmate-years',
    window: { from: 35, to: 70 },
    requires: [{ family: { id: 'playmate', present: true } }],
    scene: 'playmate:years',
    weight: 10,
  },
]
