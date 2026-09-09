import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 有人来问你一句话。
 *
 * ## 19.md 那条链，和这个库能承载的那一节
 *
 * 文档给的是一整条政治道路：
 *
 *     不满 → 结社 → 秘密联络 → 地方冲突 → 聚众 → 攻掠 → 起事
 *     → 地方响应／不响应 → 官军镇压 → 逃亡／投降／被擒
 *
 * 整条做出来是另一个游戏。而同一节里还有一句，**它才是这个世界里
 * 一个普通人跟造反的真实关系**：
 *
 * > 你本人没有参加起事，但因为知情不报，被牵连。
 *
 * 所以这一卷不写造反，写**造反从你门口经过**。这跟整册的立意是同一句话：
 * 主角只是世界中的一个人——大事发生在他身边，而他要做的
 * 不是「加不加入」，是「说不说」。
 *
 * ## 四种结局，一个好的也没有
 *
 * 而它们**不是选择的报应**，是选择跟世界状态的交叉：
 *
 *               散了（62%）                闹起来了（38%）
 *     不说      什么也没发生               官府来查，问到你头上
 *     报官      那几个人再没回来过         你没事，而村里人知道是谁报的
 *
 * 「散了 + 不说」那一格尤其要紧：**什么也没发生**。你担了三个月的心，
 * 夜里听见狗叫就坐起来，然后开春了，地里的活照旧。
 * 一个没有这一格的版本会把「不说」写成赌博，而真实世界里
 * 绝大多数这种事就是这么过去的。
 *
 * ## 同一个形状在库里的另一处：`life/going-up.ts`
 *
 * 那一卷（29.md，山上派人来叫他）的开口那一下同样不由玩家：
 * **人家来问他，他只能答去或不去。**
 *
 * 两处合起来是同一句话：**把玩家的能动性限制在「回应」而不是「发起」上。**
 * 而这正是 19.md 和 29.md 各自那句「不要变成菜单」的机制版本——
 * 菜单的本质不是选项多，是**玩家可以主动挑一件事去做**。
 *
 * ## 散还是闹，由掷决定，不由玩家的选择决定
 *
 * 19.md 明写着「根本没人响应，几天后就散了」也是一种结果。
 * 用 `roll` 而不是拿玩家的选择去推：**他报不报官改变不了几十个饿肚子的人
 * 会不会跟着走**——那件事由年景、由别的村跟不跟、由官军来得快不快决定，
 * 而这几样这个世界还没有细到能算。掷一个，明写权重，比假装算得出诚实。
 *
 * 62/38 的依据：历史上绝大多数聚众都是散了的，成事的是极少数。
 *
 * ## 入场为什么这么稀
 *
 * `{ region: { order: { atMost: 34 } } }`。实测 300 世：**成年以后碰上
 * 这个治安的只有 3%**（治安的中位数是 55，而且 p10 到 p75 全是 55——
 * 这几个数平常纹丝不动，只有灾年才掉）。
 *
 * 稀是对的。19.md 说这条路径「极稀有」，而**稀有不等于没有**：
 * 一个人一辈子多半碰不上这种事，碰上的那一次会记一辈子。
 */
export const unrestScenes: SceneLibrary = {
  'unrest:word': {
    id: 'unrest:word',
    title: '夜里那趟',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 2 },
          /**
           * 散还是闹，这一刻就掷定了——**在他做选择之前**。
           *
           * 这个次序是有意的，跟 `wounded.ts` 那一卷同一条规矩：
           * 世界不看你怎么选。掷在后头的话，「不说」就成了一场赌，
           * 而那正是这一卷不想写的东西。
           */
          {
            type: 'roll',
            key: 'unrest-outcome',
            among: [
              { value: '散', weight: 62 },
              { value: '闹', weight: 38 },
            ],
          },
        ],
        blocks: [
          { kind: 'narration', text: '那年秋后，路上开始有生面孔。' },
          { kind: 'narration', text: '先是过路的，后来有些人不走了，在庙里、在河滩上歇着。' },
          { kind: 'narration', text: '里长挨家挨户问过一遍，问完也没说什么。' },
          { kind: 'narration', text: '入冬以后，夜里常有人往后山那边去。', tone: 'faint' },
        ],
        next: 'asked',
      },

      /**
       * 来找你的是隔壁那户的当家。
       *
       * **他不是朋友。** 你们两家挨着住了一辈子，逢年过节点个头，
       * 谁家办事互相搭把手——可他从来没有在夜里敲过你的门。
       *
       * 这一层机制上是准的：邻居是 `meet` 立的，跟玩家**没有任何一条
       * 关系边**（`content/birth.ts`）。所以 `{hail:east-head}` 落到
       * 第三层，他按你此刻的身份称呼你——**一个认了你一辈子的人，
       * 开口却是客气的**，而那份客气正是他要说的话有多重。
       *
       * ⚠️ 他说的话里一个「反」字也没有。真要拉人的人不会把那个字
       * 说出口——**他只问你「听没听见」**，剩下的让你自己听懂。
       * 这也是为什么第三条选项是「装作没听懂」而不是「拒绝」：
       * 他根本没有正经提过，你也就无从拒绝。
       */
      asked: {
        id: 'asked',
        onEnter: [{ type: 'time', months: 1 }],
        blocks: [
          { kind: 'narration', text: '腊月里的一夜，有人敲门。是隔壁那户的当家。' },
          { kind: 'narration', text: '他没进屋，站在门口，手揣在袖子里。' },
          { kind: 'dialogue', text: '{hail:east-head}后山那边，你听见没有？' },
          { kind: 'narration', text: '你说听见了。' },
          { kind: 'narration', text: '他点点头，又站了一会儿。' },
          { kind: 'dialogue', text: '往后要是有人问起，你就说不知道。' },
          { kind: 'narration', text: '他说完就走了。一句多的也没有。' },
        ],
        choices: [
          {
            id: 'keep',
            label: '应下',
            hint: '两家挨着住了一辈子',
            echo: '你说了句「知道了」，关上门。',
            /*
             * 只落一面旗。
             *
             * ⚠️ 这儿从前还落一面 `unrest-kept`（「他没报官」），
             * **而内容层一处也没读过它**——底下 `storm` 那一节的分岔读的是
             * `unrest-told`（报了官的走 `storm-told`，其余走 `storm-kept`），
             * 「没报官」是那一条的补集，不需要单独一面旗。
             *
             * 唯一读它的是 `scripts/unrest.ts`。而那是**尺子在量它，
             * 不是内容在用它**——一面只有门禁读的旗，意味着
             * **判据在守一条内容根本没用上的东西**。
             *
             * 两个人从两个方向漏掉了同一件事：79 扫全库旗标的探针只扫 `src/`，
             * 看不见门禁那处；而我自查时读岔了一行（把 `unrest-said-yes`
             * 那处 `requires` 当成了它的读者），**偏偏没拿自己刚提的
             * 那条标准去判自己这一面**。
             */
            effects: [
              // 应下和装没听懂，往后的事一模一样——不一样的只在他自己心里
              { type: 'flag', key: 'unrest-said-yes', value: true },
            ],
            next: 'winter',
          },
          {
            id: 'dodge',
            label: '装作没听懂',
            hint: '他也没明说什么',
            echo: '你说了句「哦」，关上门。',
            // 什么也不落。**「装作没听懂」在世界看来就是没报官**，
            // 而那件事由 `unrest-told` 的补集表达
            next: 'winter',
          },
          {
            id: 'tell',
            label: '第二天去了一趟里长家',
            hint: '知情不报也是罪',
            echo: '你在里长家门口站了很久才进去。',
            effects: [
              { type: 'time', months: 1 },
              { type: 'flag', key: 'unrest-told', value: true },
            ],
            next: 'winter',
          },
        ],
      },

      /**
       * 冬天。
       *
       * 三条选择在这里汇合——**因为接下来的事跟他选了什么没有关系**。
       * 汇合本身就是这一卷要说的话：他做了一个决定，然后等着，
       * 而决定的分量要等世界先动。
       */
      winter: {
        id: 'winter',
        onEnter: [{ type: 'time', months: 3 }],
        blocks: [
          { kind: 'narration', text: '那个冬天特别长。' },
          { kind: 'narration', text: '夜里听见狗叫就会坐起来，坐一会儿再躺下。' },
        ],
        branches: [
          { requires: [{ flag: { key: 'unrest-outcome', equals: '闹' } }], next: 'storm' },
        ],
        next: 'quiet',
      },

      /**
       * 散了。
       *
       * **这一节是这一卷里最要紧的一节，因为它什么也没有发生。**
       *
       * 六成二的人生走到这里：开春了，人散了，地里的活照旧。
       * 他担了三个月的心，而那三个月没有换来任何东西——
       * 没有奖赏、没有报应、没有一句「你做对了」。
       *
       * 没有这一节的话，「不说」就成了一场赌局，而真实世界里
       * 绝大多数这种事就是这么过去的：**你以为要出大事，
       * 结果什么也没出，而你到死都不知道那几十个人后来去了哪儿。**
       */
      quiet: {
        id: 'quiet',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'chronicle', text: '那年冬天后山聚过一伙人，开春散了。' },
        ],
        blocks: [
          { kind: 'narration', text: '开春以后，后山那边没有动静了。' },
          { kind: 'narration', text: '听说有的往南去了，有的回了原籍，也有的就地不见了。' },
          { kind: 'event', text: '什么也没有发生。' },
        ],
        seen: [
          {
            // 报了官那一支：三个人被带走，没有回来。而没有人说这跟你有关
            requires: [{ flag: { key: 'unrest-told' } }],
            text: '正月里衙门来过一趟，带走了三个人。后来那三个人没有回来。',
          },
          {
            requires: [{ flag: { key: 'unrest-said-yes' } }],
            text: '你应下的那句话，他后来一次也没提过。你也没有提。',
          },
        ],
        next: 'after-quiet',
      },

      /** 散了之后。这一节短，因为那三个月本来就没换来什么 */
      'after-quiet': {
        id: 'after-quiet',
        onEnter: [{ type: 'time', years: 1 }],
        blocks: [
          { kind: 'narration', text: '地里的活照旧。' },
          {
            kind: 'narration',
            text: '那几十个人后来去了哪儿，你这辈子也没有再听说。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 闹起来了。
       *
       * 三成八。而**这一节的重心不在起事，在清算**——起事离这个村
       * 有六十里地，玩家一步也没参与，可官府查的是整个县。
       *
       * 19.md 那句「你本人没有参加起事，但因为知情不报，被牵连」
       * 落在这一节底下那两支。
       */
      storm: {
        id: 'storm',
        onEnter: [
          { type: 'time', months: 5 },
          { type: 'chronicle', text: '那年后山那伙人闹了起来，官军来了。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'narration', text: '二月里出的事。先是邻县的粮仓，后来是县城。' },
          { kind: 'narration', text: '三月官军到了。打了不到十天。' },
          { kind: 'narration', text: '四月里开始查。一个村一个村地查。' },
        ],
        branches: [{ requires: [{ flag: { key: 'unrest-told' } }], next: 'storm-told' }],
        next: 'storm-kept',
      },

      /**
       * 没报官 + 闹起来了。
       *
       * **知情不报。** 而这一节刻意不写他被怎样——因为在明代，
       * 这种事的处置极不确定：《大明律》对谋反的同谋、知情不告、
       * 窝藏各有条文，可具体落到一个偏村的农户身上，
       * 多半是「问了几句，放回来了」。
       *
       * 真正留下的是别的东西：**从此有一笔记在他名下，而他自己看不见。**
       * 这比杖责重得多，也真实得多。
       */
      'storm-kept': {
        id: 'storm-kept',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'household', standing: -10 },
          { type: 'flag', key: 'unrest-implicated', value: true },
          { type: 'chronicle', text: '你被叫去问过话。放回来了。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '来的是县里的人，带着册子，一户一户问。' },
          { kind: 'narration', text: '问你腊月里家中来过什么人。' },
          { kind: 'narration', text: '你说来过隔壁的，说的是借粮的事。' },
          { kind: 'event', text: '他们把你的名字记了下来。' },
          { kind: 'narration', text: '关了六天，问了三回，放回来了。' },
          {
            kind: 'narration',
            text: '那六天里家里的地没人管。回来的时候麦子已经黄了一半。',
            tone: 'faint',
          },
          { kind: 'narration', text: '往后再有事，册子上有你的名字。而你不知道有那本册子。' },
        ],
        next: 'after-storm',
      },

      /**
       * 报了官 + 闹起来了。
       *
       * 他没事——而**这一节要写的正是「没事」有多难受**。
       *
       * 官府不会张榜说是谁报的。可一个村子里，谁腊月里去过里长家、
       * 谁家没被带走人，这些事不用谁说。**最后那句「没有人当面提过」
       * 是这一节的全部**：没有人骂他，也没有人再跟他说话。
       */
      'storm-told': {
        id: 'storm-told',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'flag', key: 'unrest-marked', value: true },
          { type: 'chronicle', text: '查得很紧，你家没有事。' },
        ],
        blocks: [
          { kind: 'narration', text: '来的是县里的人，带着册子，一户一户问。' },
          { kind: 'narration', text: '到你家门口看了一眼，问了两句就走了。' },
          { kind: 'event', text: '你家没有事。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '隔壁那户带走了两个，一个是当家的。' },
          { kind: 'narration', text: '那年秋里，村口那棵树底下不再有人叫住你说话。' },
          {
            kind: 'narration',
            text: '没有人当面提过这件事。一次也没有。',
            tone: 'faint',
          },
        ],
        next: 'after-storm',
      },

      /**
       * 那一年之后。
       *
       * 两支共用，因为**过去的方式是一样的**：日子接着过。
       * 不作结论、不给评价——这一卷从头到尾没有一句话说他做得对不对，
       * 那是玩家自己的事。
       */
      'after-storm': {
        id: 'after-storm',
        onEnter: [{ type: 'time', years: 1 }],
        blocks: [
          { kind: 'narration', text: '那年的收成不好，可也没到揭不开锅。' },
          {
            kind: 'narration',
            text: '再往后几年，这件事村里就没有人提了。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

export const unrestEvents: readonly LifeEvent[] = [
  {
    /**
     * 治安坏到这个地步。
     *
     * `order <= 34` 跟 `dearth:unrest` 那一卷是同一道门槛——
     * **同一个世界状态，孩子看见的是路上的生面孔，
     * 大人碰上的是有人夜里来敲门。**
     *
     * ## 窗口十八到四十二，而 `to` 那个数是被人量出来的
     *
     * 头一版写的是六十，理由是「这是大人的事」——那句话没错，
     * **可窗口的后三分之一根本开不了**。xiuxian-game-79 逐年量过：
     *
     *     玩家 18 岁   东家户主 64% 还在世
     *          30 岁                31%
     *          45 岁                 8%
     *          60 岁                 0%
     *
     * 成因是两个条件朝相反方向走：邻居立起来那刻就比玩家大 24–50 岁
     * （`content/birth.ts`），**玩家越老，窗口越往后开，而来敲门的那个人
     * 越不可能还在**。窗口末尾他八十四到一百一十岁，一个也活不到。
     *
     * 那条 `alive: true` 不能删——**一个死人不能来敲门**。所以收的是窗口：
     * 四十二那年他六十六到九十二，尾巴上仍然稀，但不是零。
     *
     * 六十那个数属于「写下去而永远不生效的东西」那一族，
     * 跟落了没人读的旗同源：**它看着是一段内容，实际是一段空白**，
     * 而没有任何东西会说。
     *
     * 还问了两件事：
     *
     *     east-head 在世    来敲门的得是个真人
     *     living: 'farm'    后山、地里、收成——这一卷通篇是种地人家的事
     *
     * ## 头一版这里写的是 `{ livelihood: '务农' }`，而那两格不是一回事
     *
     * `upbringing.ts` 当场抓出两句：`after-quiet` 的「地里的活照旧」、
     * `after-storm` 的「那年的收成不好」。**它问的是 `living`（他过什么日子），
     * 而我限的是 `livelihood`（这一家靠什么过活）。**
     *
     * 两格在绝大多数人身上一致，恰恰在这一卷要排除的那种人身上分家：
     * 一个户籍务农、自己却在镇上做工的人（`living: 'hired'`），
     * 他家里的营生是务农，可**他自己没有地，说不出「地里的活照旧」**。
     *
     * 判据是对的，而且它盯的正是这个分别——这一格改成 `living` 之后
     * 两句话都成立了，一个字也不用改。
     */
    id: 'unrest-word',
    window: { from: 18, to: 42 },
    requires: [
      { region: { order: { atMost: 34 } } },
      { family: { id: 'east-head', alive: true } },
      { living: { is: 'farm' } },
    ],
    scene: 'unrest:word',
    weight: 40,
  },
]
