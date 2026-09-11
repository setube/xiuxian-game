import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 一门亲事。
 *
 * 这一册是「过程中状态」那一格的第一个真实使用者（用户 2026-09-07 拍板，
 * 见 `_施工决议`）。它要证明的不是「婚姻系统做完了」，而是一件更基础的事：
 *
 * > **一门亲事从有人提起到成或不成，中间那段时间真的存在过。**
 *
 * ## 从前它是一步跳过去的
 *
 * `routine.ts` 里「说一门亲事」那一条：选中 → 一年过去 → 屋里多了一个人。
 * 那不是娶亲，那是**把结果直接写进世界**。而婚姻恰恰是这个时代里
 * 最不由一个人说了算的事——《大明律》上婚姻由尊长主婚，媒妁、婚书、
 * 聘财都有制度约束，卑幼在外经商仕宦，长辈仍可能替他定婚。
 *
 * 所以这一册把那一步拆开：
 *
 *     有人提起 → 谁提的 → 两家的家境和关系 → 你自己愿不愿意
 *     → 议 → 成 / 不成 / 拖着
 *
 * ## 它不做什么
 *
 * 不做媒妁制度、不做聘财清单、不做婚书文本、不做纳采问名那六礼的每一步。
 * 用户明说「先做一门真实亲事，不做婚姻大全」。**这一册跑通了，
 * 那些才谈得上该不该做**——它们各自要等自己的第一个使用者。
 *
 * ## 议亲不成不是失败分支
 *
 * 这一册里「没成」和「成了」是同一层的两个结局，不是主线和惩罚。
 * 大多数人一辈子说过不止一门亲，成的那门未必是头一门。
 * 所以退亲那一节照样给年表记一笔——**它是这个人一生里真发生过的事。**
 */

/** 议亲这件事在 `character.undertakings` 里的 id */
const BETROTHAL = 'betrothal'

export const matchScenes: SceneLibrary = {
  /**
   * 有人来提亲。
   *
   * 起头不是玩家「决定成家」，是**别人先动**——媒人上门、长辈托人、
   * 邻村捎话。玩家在这一卷里能决定的是应不应、催不催、退不退，
   * 决定不了「有没有人来」。
   *
   * 这跟这一册的立场是一回事：`window` 开在十六到四十，可它是散事件，
   * 掷不到就是没人来提。**一辈子没人上门提亲的人生是成立的。**
   */
  'match:offer': {
    id: 'match:offer',
    title: '说亲',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 2 },
          // 这件事从今天起开始了。谁结束它、什么时候结束，由底下那几节定
          { type: 'undertake', undertaking: BETROTHAL },
          { type: 'chronicle', text: '有人来给你说亲。' },
        ],
        blocks: [
          { kind: 'narration', text: '媒人是隔壁村的，来过两回，第二回带了那家的年庚。' },
          { kind: 'event', text: '有人来给你说亲。' },
        ],
        /*
         * 家里有长辈的，这门亲先过他们那一关——不是玩家点头就算数。
         * 一个人也没有的，这一节直接落到「你自己拿主意」，
         * 而那本身就是孤儿那一路的样子：没有人替你张罗，也没有人拦着你。
         *
         * ⚠️ **顺序要紧**：`branches` 取第一条满足的就走，所以
         * 「打听到了不好听的话」那一条得排在前面——它比「有长辈」更具体，
         * 排在后面的话永远轮不到。
         */
        branches: [
          {
            /*
             * 媒人这半个月打听到了什么。**行为史的第一个外部读者。**
             *
             * ## 为什么挂在这一节而不是 `elders`
             *
             * 头一版挂在 `elders` 上，实测 **0 次走到**。查出来是引擎的判定时机：
             * `engine/story.ts:316` 那行注释写着「**无可选项则**自然续接下一节」
             * ——`branches` 只在节点没有选项时才判，而 `elders` 有三个选项。
             *
             * **写在有选项的节点上的 `branches` 是死的**，而且不报错。
             * （这一处值得单记：它跟「落了没人读的旗」是同一族，
             * 只不过这次是「写了永远不判的分支」。）
             *
             * ## 门槛这个 3 是怎么定的
             *
             * 头一版写 6，拿的是**一辈子的总数**（400 世实测平均每世 7.17 条谎）。
             * **那个数用错了地方**：议亲在人生前半段，而谎话是一辈子慢慢攒的。
             * 实测「走到议亲那一刻」攒了几条：
             *
             *     0 条 190 世　1 条 122 世　2 条 44 世　3 条 12 世　4 条 3 世
             *
             * **最多才 4 条**，6 那条线一个人也够不着。改成 3——
             * 十五世里有一世，稀有但不是零，一个把说谎当习惯的人才到得了。
             *
             * 拿一生的分布去定一个中途时刻的门槛，跟今天在 `identity` 上栽的那两跤
             * 是同一族：**那个数是在什么条件下量出来的，跟它用在哪儿必须对得上。**
             *
             * ⚠️ 会过期（同 `gate-thresholds-drift`）：往 `candour` 加内容、
             * 或把它的窗口往前挪，都会抬高「那一刻」的条数。
             *
             * ## 量它的基线，重量过一次
             *
             *     2026-09-08　主干 `02ac64b`　　0条190 1条122 2条44 3条12 4条3　　15 世走到
             *     2026-09-09　主干 `5608640` 后　0条171 1条108 2条55 3条29　　　　15 世走到
             *     　　　　　　（第二颗种子）　　 0条183 1条108 2条42 3条14 4条3 5条1　7 世走到
             *
             * 第二次重量是因为 17 加了一整章（节令）进 `CHAPTERS`——**新事件进池子
             * 会改变所有门禁的随机序列**，而那一章带 `chance: 0.2`、窗口 22–80，
             * 跟成年段所有散事件抢候选。
             *
             * **重量不是因为怀疑它坏了，是因为注释里那行「在什么基线上量的」
             * 指向了一个不存在的世界**——而那正是写那行字的理由。
             *
             * 门槛 3 在两个基线上都成立（走到 7–15 世）。**尾部厚度在 18–29 之间晃**，
             * 所以这个门槛没有余量可削：改成 4 就会掉到个位数。
             */
            requires: [
              { deeds: { kind: 'lie', atLeast: 3 } },
              { family: { id: 'father', present: true } },
            ],
            next: 'elders-heard',
          },
          {
            requires: [
              { deeds: { kind: 'lie', atLeast: 3 } },
              { family: { id: 'mother', present: true } },
            ],
            next: 'elders-heard',
          },
          {
            requires: [{ family: { id: 'father', present: true } }],
            next: 'elders',
          },
          {
            requires: [{ family: { id: 'mother', present: true } }],
            next: 'elders',
          },
        ],
        next: 'alone',
      },

      elders: {
        id: 'elders',
        blocks: [
          // 问的是那家有几口人，不是问你自己的爹娘。原先写「爹娘在不在」，
          // 而判据按字面抓「爹娘」——它分不出这两个字指的是对方家里的人，
          // 于是缺生母的那 23 世被报成穿帮。改写规避，语义反而更清楚
          { kind: 'narration', text: '{elder}问了那家几亩地、几口人、上头还有谁。' },
          { kind: 'narration', text: '问完没说行，也没说不行，只说再打听打听。' },
          { kind: 'narration', text: '过了半个月，媒人又来了一趟。' },
        ],
        choices: [
          {
            id: 'agree',
            label: '你说，家里定就是了',
            hint: '这门亲由长辈做主',
            echo: '你说，家里定就是了。',
            effects: [
              { type: 'time', months: 4 },
              { type: 'flag', key: 'match-deferred-to-elders', value: true },
            ],
            // 先过 pre-settle——家境极差时还要看对方家里的意思
            next: 'pre-settle',
          },
          {
            id: 'ask',
            label: '想先见一面',
            hint: '不合规矩，但也不是没有人这么做',
            echo: '你说想先见一面。',
            effects: [
              { type: 'time', months: 3 },
              { type: 'attribute', key: 'will', delta: 3 },
            ],
            next: 'glimpse',
          },
          {
            id: 'refuse',
            label: '你不想成这门亲',
            critical: true,
            echo: '你说你不想。',
            effects: [{ type: 'time', months: 2 }],
            next: 'refused',
          },
        ],
      },

      /**
       * 媒人打听回来了，而她听到的话不太好听。
       *
       * ## 这一节不惩罚，它只是让那件事被人知道
       *
       * **没有属性扣减、没有旗标、没有「亲事因此黄了」。** 三个选项跟
       * `elders` 那一节一模一样——他照样可以答应、可以要求见一面、可以不成。
       *
       * 变的只有一样：**他知道别人是怎么说他的**。
       *
       * 这是那条护栏的意思：不是「诚实度低于 X 就怎样」，是**这半个月里
       * 街坊跟媒人说了一句话，而那句话是真的**。至于这件事要不要紧、
       * 长辈信不信、他自己在不在乎——**都不由引擎决定**。
       *
       * ## 为什么不写「长辈因此不同意」
       *
       * 那会把它变成一条隐藏的失败条件，而**说过谎的人照样成亲**，
       * 那个时代尤其如此。写成「有人这么说」而不是「因此如何」，
       * 才留得住「他自己怎么看待这件事」那一层。
       */
      'elders-heard': {
        id: 'elders-heard',
        blocks: [
          { kind: 'narration', text: '这一趟她说得比上回慢。' },
          {
            kind: 'dialogue',
            speaker: '媒人',
            text: '那边托人问了几家，有说好的，也有说……话不大实在的。',
          },
          { kind: 'narration', text: '{elder}没接话，看了你一眼。' },
          {
            kind: 'narration',
            text: '你想不起来是哪一回被人记住了。这些年说过的话太多。',
            tone: 'faint',
          },
        ],
        choices: [
          {
            id: 'agree',
            label: '你说，家里定就是了',
            hint: '这门亲由长辈做主',
            echo: '你说，家里定就是了。',
            effects: [
              { type: 'time', months: 4 },
              { type: 'flag', key: 'match-deferred-to-elders', value: true },
            ],
            // 先过 pre-settle——家境极差时还要看对方家里的意思
            next: 'pre-settle',
          },
          {
            id: 'ask',
            label: '想先见一面',
            hint: '不合规矩，但也不是没有人这么做',
            echo: '你说想先见一面。',
            effects: [
              { type: 'time', months: 3 },
              { type: 'attribute', key: 'will', delta: 3 },
            ],
            next: 'glimpse',
          },
          {
            id: 'refuse',
            label: '你不想成这门亲',
            critical: true,
            echo: '你说你不想。',
            effects: [{ type: 'time', months: 2 }],
            next: 'refused',
          },
        ],
      },

      /**
       * 没有长辈的那一路。
       *
       * 这一节不是「简化版」，它是另一种人生：没有人替你相看，
       * 也没有人替你拿主意。媒人直接问你，而你答完就算数。
       */
      alone: {
        id: 'alone',
        blocks: [
          { kind: 'narration', text: '媒人问的是你，因为这个家里没有别人可问。' },
          { kind: 'narration', text: '她说那家不嫌你，只问你自己怎么想。' },
        ],
        choices: [
          {
            id: 'agree',
            label: '你答应了',
            echo: '你点了头。',
            effects: [{ type: 'time', months: 4 }],
            next: 'settled',
          },
          {
            id: 'refuse',
            label: '你不想成这门亲',
            critical: true,
            echo: '你说你不想。',
            effects: [{ type: 'time', months: 2 }],
            next: 'refused',
          },
        ],
      },

      glimpse: {
        id: 'glimpse',
        blocks: [
          { kind: 'narration', text: '在庙会上远远看了一眼。人多，只看见半边脸。' },
          { kind: 'narration', text: '回来的路上{elder}没提这事，你也没提。' },
          { kind: 'event', text: '你说不上喜欢，也说不上不喜欢。' },
        ],
        choices: [
          {
            id: 'go',
            label: '就这么定吧',
            echo: '你说就这么定吧。',
            effects: [{ type: 'time', months: 4 }],
            next: 'settled',
          },
          {
            id: 'refuse',
            label: '还是算了',
            critical: true,
            echo: '你说还是算了。',
            effects: [{ type: 'time', months: 2 }],
            next: 'refused',
          },
        ],
      },

      /**
       * 谈成了：议亲这件事到此结束，人进门。
       *
       * `undertake done` 那一笔是这一册的关键——**结束它的是这一节，
       * 不是它自己到期**。过程中状态没有 deadline，也不该有。
       */
      /**
       * 「答应」之后等对方回话的那几天。
       *
       * 这一节是「答应」选项的实际落点——它不是「玩家答应了、事就成了」。
       * 家境极差（standing ≤ 22）时，对方家里还没开口，得先过 `their-verdict`。
       * 其余情况直接走 `settled`。
       *
       * ## 为什么要这一节
       *
       * `elders`/`alone`/`glimpse` 里「答应」的 `next` 是写死的，
       * 无法在一个 `choices` 节点的 `next` 里按条件分叉。
       * 需要一个中间节点，让 `branches` 在进节点时判家境。
       *
       * 这一节没有 `onEnter`、没有 `blocks`——它是纯路由，对玩家不可见。
       */
      'pre-settle': {
        id: 'pre-settle',
        blocks: [],
        branches: [
          // 家境极差时对方还会掂量——不是必被拒，是有这个可能
          { requires: [{ standing: { atMost: 22 } }], next: 'their-verdict' },
        ],
        next: 'settled',
      },

      'their-verdict': {
        id: 'their-verdict',
        onEnter: [
          {
            type: 'roll',
            key: 'their-answer',
            among: [
              // 家境极差时，对方有三成概率婉拒；其余情况直接成
              // 权重只在 standing ≤ 22 的路径上有意义（那条 branch 才走这一节）
              { value: '拒', weight: 30 },
              { value: '成', weight: 70 },
            ],
          },
        ],
        blocks: [],
        branches: [
          { requires: [{ flag: { key: 'their-answer', equals: '拒' } }], next: 'their-refused' },
        ],
        next: 'settled',
      },

      /**
       * 对方家里婉拒。
       *
       * 不写「为什么不成」——媒人回来只说「那边没应」，具体缘由
       * 你不知道，也不会知道。**这是这一节唯一的设计原则**：
       * 不替对方立一个「家境差所以嫌弃」的标签，只把那件事发生了这个事实还给玩家。
       *
       * 年表记一笔，undertaking 封口。跟「没成」是同一层的结局。
       */
      'their-refused': {
        id: 'their-refused',
        onEnter: [
          { type: 'undertake', undertaking: BETROTHAL, done: true },
          { type: 'chronicle', text: '那门亲事没有成。' },
        ],
        blocks: [
          { kind: 'narration', text: '媒人回来说，那边没有应。' },
          { kind: 'narration', text: '她说话的时候没看你，走得也比平时快。' },
          { kind: 'narration', text: '你没有问为什么。', tone: 'faint' },
        ],
      },

      /**
       * 谈成了：议亲这件事到此结束，人进门。
       *
       * `undertake done` 那一笔是这一册的关键——**结束它的是这一节，
       * 不是它自己到期**。过程中状态没有 deadline，也不该有。
       */
      settled: {
        id: 'settled',
        onEnter: [
          { type: 'undertake', undertaking: BETROTHAL, done: true },
          { type: 'flag', key: 'betrothed', value: true },
          { type: 'chronicle', text: '这门亲事定下来了。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '定亲那天两家换了帖子，摆了一桌。' },
          { kind: 'narration', text: '往后还要过礼、择日、迎亲，都是大人们的事。' },
        ],
        next: 'wedding',
      },

      wedding: {
        id: 'wedding',
        onEnter: [{ type: 'time', months: 8 }],
        blocks: [
          { kind: 'narration', text: '过礼、迎亲、拜堂，几个月就过去了。' },
          { kind: 'narration', text: '从这一天起，{home}这间屋子里多了一个人。' },
        ],
        /*
         * 五条路，顺序要紧：`branches` 是从上往下第一条成立的算数。
         *
         *   女的 → 嫁过去（husband）
         *   男的、家里穷、又没田可继承 → 入赘（uxorial）
         *   其余的男的，按家境分三档：
         *     有产（standing > 70）→ wife-rich（林家商户之女）
         *     贫户（standing ≤ 30）→ wife-poor（陈家佃户之女）
         *     中间 → wife（秦家普通农户之女，兜底）
         *
         * ⚠️ 顺序设计：入赘排在娶妻三档之前，否则它一次也走不到。
         * 娶妻三档里，有产排最前，贫户次之，普通兜底（不写 requires）。
         * 「有产」的 standing > 70 和「入赘」的 standing ≤ 26 是两个不同的条件，
         * 不会互相拦截——入赘还要求「务农且有兄」，两者的交集极小。
         */
        branches: [
          { requires: [{ gender: '女' }], next: 'husband' },
          {
            requires: [
              { gender: '男' },
              { standing: { atMost: 26 } },
              // 有田的男丁不去做赘婿
              { livelihood: '务农' },
              /*
               * 入赘要问的不是「他当不当家」，是「家里有没有东西给他」。
               * 有哥的次子分不到什么，是赘婿最常见的来处。
               */
              { bond: { kind: '兄', alive: true } },
            ],
            next: 'uxorial',
          },
          // 有产户——standing > 70，媒人来的是镇上林家这样的人家
          {
            requires: [{ gender: '男' }, { standing: { atLeast: 71 } }],
            next: 'wife-rich',
          },
          // 贫户——standing ≤ 30，媒人来的是陈家这样的佃户
          {
            requires: [{ gender: '男' }, { standing: { atMost: 30 } }],
            next: 'wife-poor',
          },
        ],
        // 中间档（standing 31–70）兜底走普通农户之女
        next: 'wife',
      },

      /**
       * 入赘那一路。
       *
       * ## 它不是「嫁的男版」
       *
       * 户口这一层的动作确实一样（进一户已经在那儿的人家，当家的不是你），
       * 可**处境差得远**：赘婿在这个时代是要被指指点点的，
       * 「养老女婿」「接脚夫」都不是好话。所以这一节的正文
       * 不是把出嫁那几句性别对调，它得说出那份别扭。
       *
       * ## 谁会走到这里
       *
       * 两个条件卡得很死：**家里穷**（`standing atMost 26`），
       * 而且**没有田让他继承**。这个时代一个有田有兄弟的男丁不会去做赘婿，
       * 去的多半是家里养不起、或者干脆没家的。
       *
       * 所以它出现得少——而**那正是它该有的频率**。
       */
      uxorial: {
        id: 'uxorial',
        onEnter: [
          {
            type: 'meet',
            id: 'spouse',
            calls: '妻子',
            delta: 16,
            name: true,
            who: { surname: '秦', given: '娘', gender: '女', age: 20, doing: '操持家务' },
            bond: '配偶',
          },
          // 同一套户口簿记反过来用：他进的是妻家那一户，当家的是老丈人那一辈
          { type: 'wed-into', spouse: 'spouse', uxorial: true },
          { type: 'chronicle', text: '你入赘到了秦家。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '那家没有儿子，只有这一个女儿。' },
          { kind: 'narration', text: '过门那天你没有骑马，是走过去的。' },
          {
            kind: 'narration',
            text: '村里有人说了几句难听的。你听见了，没接话。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 娶妻三路，按玩家家境分叉。
       *
       * 「门当户对」是这个时代的议亲基础——穷户的媒人不去跑殷实人家，
       * 殷实人家的媒人也不去穷户。三档对应的配偶家庭都是**与玩家大致同阶**的
       * 人家，不是往上攀。
       *
       * standing 三档：贫（≤ 30）/ 普通（31–70）/ 有产（> 70）。
       */
      'wife-poor': {
        id: 'wife-poor',
        onEnter: [
          {
            type: 'meet',
            id: 'spouse',
            calls: '妻子',
            delta: 20,
            name: true,
            // 佃户或极贫农家之女：聘礼轻，婚后两家都要数着过
            who: { surname: '陈', given: '娘', gender: '女', age: 17, doing: '操持家务' },
            bond: '配偶',
          },
          { type: 'chronicle', text: '你成了亲。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '那家也是种地的，地还比你家少两亩。' },
          { kind: 'narration', text: '聘礼薄，媒人说两家都知道，没有人多说什么。' },
          {
            kind: 'narration',
            /*
             * 原先写「你娘把家里压箱底的布拿出来」——娘是主语，而这一节
             * 在娘已经不在了的人生里同样触发（`present.ts` 逼出来的）。
             * 按 `as-reader` / `as-apprentice` 的同一原则：去掉那个人，
             * 只写发生了什么。「家里」是一个没有具体所指的主语，
             * 娘在的时候读出来的是娘，娘不在的时候读出来的是那件事本身。
             */
            text: '过门那天，家里把压箱底的布拿出来让她做了件新衣。',
            tone: 'faint',
          },
        ],
      },

      wife: {
        id: 'wife',
        onEnter: [
          {
            type: 'meet',
            id: 'spouse',
            calls: '妻子',
            delta: 20,
            name: true,
            // 普通农户之女：与玩家出身相当，无特别加减
            who: { surname: '秦', given: '娘', gender: '女', age: 18, doing: '操持家务' },
            bond: '配偶',
          },
          { type: 'chronicle', text: '你成了亲。', tone: 'deep' },
        ],
        blocks: [{ kind: 'narration', text: '她话不多，手脚很快。' }],
      },

      'wife-rich': {
        id: 'wife-rich',
        onEnter: [
          {
            type: 'meet',
            id: 'spouse',
            calls: '妻子',
            delta: 20,
            name: true,
            // 商户或小地主之女：家里开着铺子或有几十亩地，嫁妆带进来的陪嫁让家境略好
            who: { surname: '林', given: '娘', gender: '女', age: 18, doing: '管着家里的账' },
            bond: '配偶',
          },
          // 嫁妆让家境好了一些——但聘礼已先出去，两相抵消后略涨
          { type: 'household', standing: 4 },
          { type: 'chronicle', text: '你成了亲，娶的是镇上林家的姑娘。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '她家在镇上开着一间杂货铺，嫁妆抬了六抬。' },
          { kind: 'narration', text: '进门那天，她看了看屋里，没说话。' },
          {
            kind: 'narration',
            text: '此后她管着家里的账，村里那些没有字的婆子见了她都客气几分。',
            tone: 'faint',
          },
        ],
      },

      husband: {
        id: 'husband',
        onEnter: [
          {
            type: 'meet',
            id: 'spouse',
            calls: '丈夫',
            delta: 20,
            name: true,
            who: { surname: '秦', given: '大', gender: '男', age: 22, doing: '做工' },
            bond: '配偶',
          },
          /*
           * 你嫁过去了。
           *
           * **这一笔补的是这一册留下的洞**：从前女玩家成亲，世界里唯一变的是
           * 屋里多了个丈夫——她没出嫁，还在娘家户里，户主还是她爹。
           *
           * `house.ts` 早写着「女儿出嫁是另一卷，等第一个真实使用者来逼」，
           * 而这一册就是那个使用者。
           *
           * 不带人走：陪嫁的丫头、改嫁带过去的孩子是另一回事，这一卷里没有。
           */
          { type: 'wed-into', spouse: 'spouse' },
          { type: 'chronicle', text: '你嫁过去了。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '他话不多，天不亮就出门。' },
          { kind: 'narration', text: '头一个月你总在半夜醒，认不出屋顶的椽子。' },
        ],
      },

      /**
       * 没成。
       *
       * 这一节跟 `settled` 是同一层的两个结局，不是失败分支。
       * 年表照记——**这个人一生里真的有过这么一门亲事，只是没成。**
       * 日后媒人再上门，两家都记得上一回（那一格靠 `undertakings` 里
       * 那条封了口的记录，它不删）。
       */
      refused: {
        id: 'refused',
        onEnter: [
          { type: 'undertake', undertaking: BETROTHAL, done: true },
          { type: 'chronicle', text: '那门亲事没有成。' },
        ],
        blocks: [
          { kind: 'narration', text: '媒人又来过一次，这回没坐下。' },
          { kind: 'narration', text: '那家后来把姑娘许给了邻村一个木匠。' },
          { kind: 'narration', text: '这件事在村里说了小半年，后来也就没人提了。', tone: 'faint' },
        ],
      },
    },
  },
}

export const matchEvents: readonly LifeEvent[] = [
  {
    /**
     * 有人来提亲。
     *
     * 十六起：庶人婚礼「男十六、女十四以上听婚」（《明会典》）。
     * 上限四十不是「四十以后没人成亲」，是**这一卷写的是头一门亲事**——
     * 中年再娶那是另一件事（续弦、填房），有它自己的社会含义。
     *
     * 三条 requires：
     *
     *   还没成过家　　　`bond 配偶 alive:false`——空集合上 `some` 恒为假，
     *                   所以它问的是「没有在世的配偶」，未婚和鳏寡都算
     *   没有正在议的　　`undertaking not:betrothal`——**这一条是过程中状态的
     *                   第一个真实用途**：一门亲事没了局之前，媒人不会再提第二门
     *   家里过得下去　　`standing atLeast:20`——揭不开锅的人家没人来提亲
     */
    id: 'match-offer',
    window: { from: 16, to: 40 },
    requires: [
      { bond: { kind: '配偶', alive: false } },
      { undertaking: { not: BETROTHAL } },
      /*
       * 守孝期间不许嫁娶。**这是过程中状态第一次让两件事撞上**——
       * 不是拿旗标挡的（旗标打上去就不会落下来），是问「此刻有没有一件
       * 叫服丧的事在进行」。它会结束，而结束的那一天媒人才又上门。
       */
      { undertaking: { not: 'mourning' } },
      { standing: { atLeast: 20 } },
      /*
       * 人得在凡间。
       *
       * ⚠️ **这一条是 2026-09-09 补的**，起因是 29.md 那一卷落地：
       * 一个被叫上山、在半山腰挑水的人，**村里的媒人照旧会来给他说亲**。
       *
       * 实测：上山之后（`living: 'up-there'` + `home: 云台`），
       * 窗口跨过三十四岁、要求家里人或户的三十三个事件里，
       * **`requires` 仍然成立的只剩这一个**——别的都被那两笔顺带关上了
       * （它们问的是户、是同住的人，而他的住处已经不在村里）。
       *
       * 这一条问 `living` 不问 `place`：媒人不上山，**不是因为山远，
       * 是因为他过的不是那种日子了**。同 `sequestered.ts` 那支的立场
       * ——判据该跟被测对象用同一个维度。
       */
      { living: { notIn: ['up-there'] } },
    ],
    scene: 'match:offer',
    weight: 8,
  },
]
