import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 回来。
 *
 * 这一册只说一件事：**离开不结束任何关系，回来也不需要重新认识。**
 *
 * ## 它接在哪儿
 *
 * `days.ts` 里镇上那一条：「有个货栈的伙计问你识不识字……那你过些日子来，
 * 兴许有活给你。」那句话从前只喂给念头（`leanings.ts` 的一簇火种），
 * 没有任何地方真的让他去。这一册是那句话的下文。
 *
 * ## 三卷各守一件事
 *
 * - `reunion:apprentice`　**走。** 搬去镇上，`takes` 一个人也不写——
 *   家里人原地不动，从此不在你天天照面的地方。
 * - `reunion:homecoming`　**回来，她还在。** 三年不见，那条边一格没动，
 *   她开口第一句不是「客官找谁」。
 * - `reunion:emptied`　**回来，人不在了。** 同样三年，同样回来，
 *   读到的是另一段。这一卷是上一卷的对照组：
 *   如果「她认得你」不需要任何条件，这两卷就该是同一段文字。
 *
 * ## 这一册刻意不做的事
 *
 * **不因为分开而扣好感。** 三年没见，`affinity` 一格也不动——
 * `if (!nearby) affinity--` 会让亲兄弟离家十年感情必然烂掉，
 * 那不是人生，那是算法。关系变化只能来自具体发生过的事，
 * 不能来自距离本身。
 *
 * **不用好感度判断亲疏。** 她那句「瘦了」的依据是
 * `{ bond: { years: { atLeast: 8 } } }`——她认了你这么多年，
 * 这是世界事实。不是 `affinity > 80`：好感是会变的，
 * 而「认识了十六年」不会因为三年没见就变少。
 */
export const reunionScenes: SceneLibrary = {
  /**
   * 去镇上。
   *
   * 入场只看 `offered-shopwork`——**那是他自己在镇上撞见的**，
   * 不是念头替他招来的。同 `leaving.ts` 的第一条硬规矩。
   */
  'reunion:apprentice': {
    id: 'reunion:apprentice',
    title: '货栈要人',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 3 }],
        blocks: [
          { kind: 'narration', text: '货栈那个伙计说的日子到了。' },
          { kind: 'narration', text: '管事的要一个识字的，管记账，管点数，管扛。' },
          { kind: 'narration', text: '管吃管住，一年两吊钱。要去就得住在镇上。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '{elder}听完没说话，过了一会儿说，你自己拿主意。' },
        ],
        choices: [
          {
            id: 'go',
            label: '去',
            critical: true,
            hint: '耗 三年',
            echo: '你收拾了一个包袱。',
            effects: [
              { type: 'time', years: 3 },
              { type: 'flag', key: 'went-to-town', value: true },
              /**
               * **`takes` 一个人也不写。**
               *
               * 这是这一卷存在的全部理由：他一个人走，家里人原地不动。
               * 他们还活着，那几条边一条没断，只是从这天起他不再天天见着他们。
               *
               * 写成 `takes: '举家'` 的话这一卷就白写了——全家跟着搬去镇上，
               * 谁也没离开谁，后面那两卷也就无从分别。
               */
              { type: 'home', place: '{province} · {prefecture} · 镇上货栈' },
              // 他手上从此有活了。宫里那个洞在这里补的是另一头：
              // 他从一个有家有地的孩子，变成一个自己挣饭吃的伙计
              { type: 'living', living: 'market' },
              { type: 'attribute', key: 'body', delta: 3 },
              { type: 'attribute', key: 'insight', delta: 4 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'meet', id: 'shop-keeper', calls: '货栈的管事', delta: 6 },
              {
                type: 'aspect',
                key: 'body',
                self: '你在货栈扛了三年货。个子没长多少，肩膀宽了一圈。',
              },
              { type: 'chronicle', text: '你去镇上货栈做工，一去三年。', tone: 'deep' },
            ],
            next: 'away',
          },
          {
            id: 'stay',
            label: '没去',
            echo: '你说家里离不开。',
            effects: [
              { type: 'time', days: 5 },
              { type: 'flag', key: 'turned-down-shopwork', value: true },
            ],
            next: 'stayed',
          },
        ],
      },

      /**
       * 这三年。
       *
       * 正文里那句「他们还在村里」是有机制在底下撑着的：
       * 没有任何人被删掉，没有任何一条边被封口。变的只有一件事——
       * 你的门牌换了，于是他们不再算在你身边（见 `engine/nearby.ts`）。
       */
      away: {
        id: 'away',
        blocks: [
          { kind: 'narration', text: '货栈后院有一间通铺，你睡最里头那个位置。' },
          { kind: 'narration', text: '头一年记错过两次账，挨了骂，没扣钱。' },
          { kind: 'narration', text: '第二年管事的开始让你自己去码头点货。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '村子离镇上四十里。头一年你还回去过两趟。' },
          { kind: 'narration', text: '后来货多，年底也走不开，就没再回去。' },
          {
            kind: 'narration',
            text: '你知道他们都还在那儿。只是你不在了。',
            tone: 'faint',
          },
        ],
      },

      stayed: {
        id: 'stayed',
        blocks: [
          { kind: 'narration', text: '你托人给管事的带了句话。' },
          { kind: 'narration', text: '那活后来给了邻村一个孩子。' },
          { kind: 'narration', text: '你有时候在村口看见他，穿着货栈的短褂。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 回来了。人还在。
   *
   * ## 那句「瘦了」凭什么
   *
   * 凭 `{ bond: { kind: '抚养', years: { atLeast: 8 } } }`——
   * **他认了你这么多年**。不是凭好感度：好感是会动的，
   * 而「认识了十六年」这件事不会因为三年没见就变少。
   *
   * 这一卷把两种人放在同一段路上，让分别自己显出来：
   * 客栈伙计跟你说的是「客官住店」，他说的是「瘦了」。
   * 前者不认得你，后者认了你一辈子。两句话之间隔着的东西
   * 就是这一整册要立的那件事。
   *
   * ## 这一卷刻意不加好感
   *
   * 「回家住了两个月」当然可以是一件加好感的事，可这一卷要证明的
   * 恰恰是**不加也仍然在**——那句「瘦了」不是好感度换来的。
   * 真正事件驱动的好感变化在上一卷：他在货栈认识了管事的。
   */
  'reunion:homecoming': {
    id: 'reunion:homecoming',
    title: '回来了',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 4 },
          /**
           * **回的不是一个地名，是那个人还在的地方。**
           *
           * 老家的村名是出生那刻掷出来的，这里写不出它。可它一直记在
           * 没跟你走的那个人身上——`joins: '抚养'` 读的就是他此刻的 `place`。
           *
           * 写的是关系不是 id，理由跟正文里那个 `{dam}` 一样：
           * **养大你的人在不同人生里不是同一个人。** 写死 `'mother'`，
           * 由长姐拉扯大的孩子回的就是一处谁也不在的空地址。
           *
           * 兜底那个 `place` 在这一卷走不到（入场条件里他还活着），
           * 它是留给类型的，不是留给剧情的——真走到了的那一种，
           * 是隔壁 `reunion:emptied`。
           */
          { type: 'home', place: '{province} · {prefecture} · 村里', joins: '抚养' },
        ],
        blocks: [
          { kind: 'narration', text: '腊月里货栈歇了工，管事的说你回去看看吧。' },
          { kind: 'narration', text: '出镇口的时候路过一家客栈，伙计在门口拦客。' },
          { kind: 'dialogue', text: '客官住店？' },
          { kind: 'narration', text: '你说不住，回家。他就不看你了，去拦下一个。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '四十里路走了一天。天擦黑的时候看见村口那棵树。' },
          { kind: 'narration', text: '院门没关。你站在门口，先没敢进去。' },
          /**
           * 这一句是整册的落点，而它成立靠的是刚才那个 `joins`——
           * 先把你搬回他所在的地方，`{dam}` 才认得出他在你身边
           * （`interpolate.ts` 的 `callByBond` 问的是 `isNearby`，不是死活）。
           * 顺序反过来的话，这里会念成「家里的大人从灶间出来」。
           */
          { kind: 'event', text: '{dam}从灶间出来，手在衣襟上擦了两下。' },
          { kind: 'dialogue', text: '瘦了。' },
          {
            kind: 'narration',
            text: '没有问你这三年过得怎么样，先去盛饭。',
          },
          { kind: 'divider', variant: 'dots' },
          {
            kind: 'narration',
            text: '那一晚说的都是些琐碎事。谁家嫁了女儿，哪块地卖了。',
            tone: 'faint',
          },
          {
            kind: 'narration',
            text: '三年没见，{dam}跟你说话的样子跟三年前一模一样。',
            tone: 'cinnabar',
          },
        ],
        choices: [
          {
            id: 'stay-home',
            label: '在家住些日子',
            hint: '耗 两月',
            echo: '你在家住了两个月。',
            effects: [
              { type: 'time', months: 2 },
              { type: 'flag', key: 'came-home', value: true },
              { type: 'attribute', key: 'will', delta: 2 },
              { type: 'chronicle', text: '你从镇上回来，在家过了年。', tone: 'deep' },
            ],
            next: 'stayed',
          },
          {
            /**
             * 住两天就走。
             *
             * 这一条同样不扣任何好感——**急着回去做工不是薄情**，
             * 而系统没有资格替玩家把它读成薄情。
             */
            id: 'back-to-town',
            label: '住两天就回镇上',
            echo: '你住了两天就回去了。',
            effects: [
              { type: 'time', days: 2 },
              { type: 'flag', key: 'came-home', value: true },
              { type: 'home', place: '{province} · {prefecture} · 镇上货栈' },
            ],
            next: 'left',
          },
        ],
      },

      stayed: {
        id: 'stayed',
        blocks: [
          { kind: 'narration', text: '你在家过了年。' },
          { kind: 'narration', text: '劈柴、挑水、扫院子，手比三年前快得多。' },
          { kind: 'narration', text: '邻居来串门，说这孩子出去一趟像个大人了。' },
          {
            kind: 'narration',
            text: '{dam}没接这话，只是又给你添了半碗。',
            tone: 'faint',
          },
        ],
      },

      left: {
        id: 'left',
        blocks: [
          { kind: 'narration', text: '走的那天早上{dam}起得比你早，煮了鸡蛋塞在包袱里。' },
          { kind: 'narration', text: '送到村口那棵树底下就站住了，说路上小心。' },
          {
            kind: 'narration',
            text: '你走出去很远回头看，那个人还站在那儿。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 回来了。人不在了。
   *
   * **这一卷是上一卷的对照组，不是它的悲惨版本。**
   *
   * 同样走了三年，同样在腊月里回来，同样推开那扇门——
   * 分别只在世界里那个人还在不在。如果「他认得你」不需要任何条件，
   * 这两卷就该是同一段文字；它们不一样，那句「瘦了」才有出处。
   *
   * 正文一个称呼也不点。走的时候养着你的是谁，十一种出身各不相同，
   * 而这一卷恰恰是那个人不在了的那一种——**连 `{dam}` 都问不出来了**
   * （`callByBond` 找不到在身边的人，只会念「家里的大人」）。
   * 所以这里索性不写主语：说不出他是谁，本身就是这一卷。
   *
   * 注意这一卷里那几条边**一条也没断**：人殁了，可他养过你这件事
   * 没有被改写。人不在了跟关系没发生过，是两件事。
   */
  'reunion:emptied': {
    id: 'reunion:emptied',
    title: '回来了',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 4 },
          // 这里没有 `joins`：要回的那个人已经不在了，回的只是一处空院子
          { type: 'home', place: '{province} · {prefecture} · 村里' },
          { type: 'flag', key: 'came-home', value: true },
          { type: 'chronicle', text: '你从镇上赶回来，没赶上。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '入冬前有人捎话到镇上，说家里出了事。' },
          { kind: 'narration', text: '你把手上那批货点完才走，走的时候管事的没拦。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '四十里路走了一天。村口那棵树还在。' },
          { kind: 'narration', text: '院门虚掩着。屋里有人，是隔壁的婶子在收拾。' },
          { kind: 'dialogue', text: '你可算回来了。' },
          {
            kind: 'narration',
            text: '她说了事情的经过，说得很慢，怕你听不清。',
          },
          { kind: 'divider', variant: 'dots' },
          {
            kind: 'narration',
            text: '灶还是那个灶。你站了很久，没有生火。',
            tone: 'cinnabar',
          },
          {
            kind: 'narration',
            text: '你想起走的那年，家里没有人拦你。',
            tone: 'faint',
          },
        ],
        /**
         * 这一卷也得让他落一次笔。
         *
         * 隔壁那一卷有两个去处，这一卷一个也没有的话，两卷的对照就只剩正文了——
         * **区别不该只在读到什么，也该在接下来他能做什么。**
         *
         * 而且「一句不问」在这一册里是有代价的：不落笔就不花时间，
         * 年表可以一卷接一卷地连演下去而人不长岁数，最后落进日常那一章的
         * 成年卷——那一卷至今是占位内容。`verify.ts` 的占位内容验收
         * 拦的就是这个，头一版没有选择的写法当场被它拦下来了。
         *
         * 两条都不加任何「悲痛」之类的格子。**这局没有资格替玩家判断
         * 谁更孝顺**，跟隔壁那一卷不给「回家住两个月」加好感是同一条规矩。
         */
        choices: [
          {
            id: 'stay-and-settle',
            label: '留下来把事办完',
            hint: '耗 两月',
            echo: '你在家住了两个月。',
            effects: [
              { type: 'time', months: 2 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'chronicle', text: '你留下来把家里的事办完，才回镇上。', tone: 'deep' },
            ],
            next: 'stayed',
          },
          {
            id: 'back-to-town',
            label: '办完就回镇上',
            echo: '你住了几天就回去了。',
            effects: [
              { type: 'time', days: 6 },
              { type: 'home', place: '{province} · {prefecture} · 镇上货栈' },
            ],
            next: 'left',
          },
        ],
      },

      stayed: {
        id: 'stayed',
        blocks: [
          { kind: 'narration', text: '头七过了，来的人都走了。' },
          /**
           * 这里原先写的是「地里那几亩得有人交代」，被 `upbringing.ts` 当场拦下。
           * 有地的只是七种人家里的一种——**走到这一卷的十一种出身，
           * 谁都可能推开那扇门**，而宫里出来的、铺子里长大的、寺里捡来的，
           * 一亩地也没有。留下来要办的事各家不同，能一句说尽的只有「总得有人认」。
           */
          { kind: 'narration', text: '该还的、该收的，一笔一笔总得有人认下来。' },
          { kind: 'narration', text: '你一件一件办，办得比自己想象的稳当。' },
          { kind: 'divider', variant: 'dots' },
          {
            kind: 'narration',
            text: '走的那天你把门锁上，钥匙揣进怀里，没有交给任何人。',
            tone: 'faint',
          },
        ],
      },

      left: {
        id: 'left',
        blocks: [
          { kind: 'narration', text: '回到货栈那天下着雨，通铺那个位置还空着。' },
          { kind: 'narration', text: '管事的问了一句家里怎么样了。你说办完了。' },
          { kind: 'narration', text: '他没再问，让你先去后院把那批货点了。' },
          {
            kind: 'narration',
            text: '你点到一半才发觉手是抖的，可账没有记错。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

/**
 * 什么时候会撞上这三卷。
 *
 * ## 后两卷是同一件事的两种样子
 *
 * 都要 `went-to-town`，都在回来的那几年，分别只在**养大你的那个人还在不在**。
 * 两条 requires 互斥（`alive: true` / `alive: false`），所以一世里
 * 只会撞上其中一卷——这跟 `royal` 那一章 `fall` / `demote` 的分法
 * 是同一个形状：**按世界状态分卷，不在卷里写 if。**
 *
 * ## 窗口是算出来的，两头都被别的东西钉着
 *
 * 上一卷开在 12–13 岁，走一趟是整三年，所以回来的人是 15 到 17 岁。
 * 那个「三」不是拍的——实测 600 世：12 岁走的 98.3% 在 15 岁回来，
 * 1.7% 因为进场那三天跨了年，拖到 16 岁。所以下游窗口必须留出这一岁的余量，
 * 钉死单独一岁的话，那百分之一二的人永远撞不上自己那一卷。
 *
 * 上沿那个 17 是被**别的东西**钉住的，跟这一章没关系：
 * 日常那一章的成年卷（`routine:adult`）到今天还是占位内容。
 * 只要有任何一件年表事件的窗口越过 17 岁，人就可能演完它掉进那一卷，
 * 读到一段谁也没设计过的东西——`verify.ts` 的占位内容验收专门盯着这条线。
 *
 * 头一版这两卷写的是 16–18，当场被那一道拦下来了。**这不是它管得宽，
 * 是「窗口开到几岁」本来就不是这一章一个人的事。**
 *
 * ## 权重为什么压过收尾那一卷
 *
 * 十六岁起，渡口那一卷以 1000 的权重坐在候选池里等着收尾。
 * 十五岁回来的人赶在它开窗之前，可那一两成拖到 16、17 岁的人会被它直接收走，
 * **对那些人来说这两卷就成了一段永远抽不中的死内容**。
 *
 * 1500 是有意的：他先从镇上回来一趟，然后才走到渡口边。
 * 顺序本来就该是这个顺序——人不会在外做工做到一半直接遇仙。
 */
export const reunionEvents: readonly LifeEvent[] = [
  {
    // 只看他在镇上撞见过那个伙计，不看他想不想走
    id: 'reunion-apprentice',
    window: { from: 12, to: 13 },
    requires: [{ flag: { key: 'offered-shopwork' } }],
    scene: 'reunion:apprentice',
    weight: 12,
  },
  {
    /**
     * 人还在。
     *
     * `years: { atLeast: 8 }` 问的是**这条抚养边牵了多少年**——
     * 十二岁走的人，那条边至少也有十二年了。它不是一道门槛，
     * 是那句「瘦了」的出处：他认得的不是一个客人，是一个他带大的人。
     */
    id: 'reunion-homecoming',
    window: { from: 15, to: 17 },
    requires: [
      { flag: { key: 'went-to-town' } },
      { bond: { kind: '抚养', alive: true, years: { atLeast: 8 } } },
    ],
    scene: 'reunion:homecoming',
    weight: 1500,
  },
  {
    // 「一个都不在了」——正是 `alive: false` 那个 `some(...) === false` 的语义
    id: 'reunion-emptied',
    window: { from: 15, to: 17 },
    requires: [{ flag: { key: 'went-to-town' } }, { bond: { kind: '抚养', alive: false } }],
    scene: 'reunion:emptied',
    weight: 1500,
  },
]
