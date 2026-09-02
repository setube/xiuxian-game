import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 机缘。
 *
 * 这一份文件只做一件事：不让「机缘」变成幸运抽奖。
 *
 * 三条守则：
 *
 * 1. **真相在你看见之前就定了。** 山道上躺着的那个人是猎户、是修士、还是邪修，
 *    由 roll 在进场那一刻掷出来，写进旗标。玩家的选择改变的是自己撞上什么，
 *    不是把他变成对自己有利的那一种。
 * 2. **机会摆在面前，看不看得见是另一回事。** 走神的人从这段山道上走过去，
 *    正文里根本不会提有人躺着。他这一生都不会知道那天错过了什么。
 * 3. **抓住了也未必懂。** 你可以捡到一本书、听到一句话、收下一样东西，
 *    然后很多年都不知道那是什么。真正的转折不在拿到的那一刻，
 *    在多年以后有人随口点破的那一刻。
 */
export const encounterScenes: SceneLibrary = {
  'omen:wounded': {
    id: 'omen:wounded',
    title: '山道',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 1 },
          // 他是谁，在你抬头之前就已经定了。玩家永远看不到这一掷
          {
            type: 'roll',
            key: 'wounded-man',
            among: [
              { value: '猎户', weight: 24 },
              { value: '武人', weight: 18 },
              { value: '死人', weight: 12 },
              { value: '修士', weight: 24 },
              { value: '弟子', weight: 12 },
              { value: '邪修', weight: 10 },
            ],
          },
        ],
        blocks: [
          { kind: 'narration', text: '那天你走山道去邻村。' },
          {
            kind: 'narration',
            text: '路很长，走了大半日。日头偏西的时候，你在下坡那一段歇了歇脚。',
          },
        ],
        branches: [
          // 看得见与看不见，是这一卷唯一的分水岭。
          // 两种人都能留意到路边：心思细的，和常年在山里走的。
          // 看不见的那条路上，正文里根本不会提有人躺着——
          // 那个人这一生都不知道自己错过了什么
          { requires: [{ attribute: { key: 'insight', atLeast: 34 } }], next: 'notice' },
          { requires: [{ attribute: { key: 'body', atLeast: 52 } }], next: 'notice' },
        ],
        next: 'miss',
      },

      miss: {
        id: 'miss',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '歇够了，你接着赶路。' },
          { kind: 'narration', text: '天黑前到了邻村，事情办完，第二天就回去了。' },
          { kind: 'narration', text: '这一趟没有什么可说的。', tone: 'faint' },
        ],
      },

      /**
       * ② 理解。
       *
       * 从前这里直接跳选项，等于「看见 = 知道那是什么」。
       * 现在中间插一层：他看了片刻，心里有了个判断，
       * 而**那个判断可能是错的**——错了也照样往下走。
       *
       * 判断从他自己的见识长出来，不是随机发错：
       * 没听说过修士的人不会往「异人」上想，
       * 见过血的人一眼看出这是伤不是醉。
       */
      notice: {
        id: 'notice',
        onEnter: [{ type: 'glance' }],
        blocks: [
          { kind: 'event', text: '路旁的草丛里有个人。' },
          { kind: 'narration', text: '他侧躺着，身上有血。看不清脸，也看不出是死是活。' },
          { kind: 'narration', text: '四下无人。风把草吹得哗哗响。' },
        ],
        next: 'interest',
      },

      /**
       * ③ 兴趣 + ④ 行动。
       *
       * 「兴趣」刻意不做成属性判定——那等于系统替玩家决定这条命值不值得管。
       * 它就是这几个选项本身：**看见了，理解了，然后你自己决定要不要付代价。**
       *
       * 三条路的代价各不相同：扶最快也最险，叫人最稳但要走大半天，
       * 走近看看什么也不用付，但也多半什么也得不到。
       */
      interest: {
        id: 'interest',
        blocks: [],
        choices: [
          {
            id: 'lift',
            label: '走过去，把他扶起来',
            critical: true,
            hint: '你不知道会碰到什么',
            echo: '你拨开草丛，蹲了下去。',
            effects: [
              { type: 'time', days: 2 },
              { type: 'encounter', approach: '扶' },
            ],
            next: 'after',
          },
          {
            id: 'inspect',
            label: '走近看看，但不碰他',
            echo: '你走近了几步。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'encounter', approach: '看' },
            ],
            next: 'after',
          },
          {
            id: 'fetch',
            label: '跑回村里叫人',
            hint: '一来一回要大半天',
            echo: '你转身往村里跑。',
            effects: [
              { type: 'time', days: 2 },
              { type: 'attribute', key: 'will', delta: 2 },
              { type: 'encounter', approach: '叫人' },
            ],
            next: 'after',
          },
          {
            /**
             * 不管。
             *
             * 这一条永远留着，而且**它不是「错误选项」**。
             * 一个人看见路边躺着个不认识的人，转身走开，
             * 是这世上最寻常的事。
             *
             * 走开的人不会知道那是谁——世界记着，他不知道，
             * 而且一辈子不会知道。
             */
            id: 'leave',
            label: '不关自己的事，接着赶路',
            echo: '你没有过去。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'flag', key: 'left-wounded-man', value: true },
            ],
            next: 'walked-on',
          },
        ],
      },

      /** ⑤ 世界回应之后。他做了什么、得到什么，都已经在正文里了 */
      after: {
        id: 'after',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '你接着赶路。天黑前到了邻村。', tone: 'faint' },
        ],
      },

      'walked-on': {
        id: 'walked-on',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '你贴着路的另一边走过去，没有回头。' },
          { kind: 'narration', text: '天黑前到了邻村，事情办完，第二天就回去了。' },
          { kind: 'narration', text: '回程时你特意看了那一段路。草丛压平了一片，人不在了。' },
          {
            kind: 'narration',
            text: '此后很多年，你偶尔还会想起这件事。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 庙前货郎那一册书。
   *
   * 跟山道上那个人走的是同一套五节点，验的却是相反的一种机缘：
   *
   *   山道：看见人 → 判断 → 是否管 → 行动 → 当场知道结果
   *   旧书：看见书 → 判断 → 是否在意 → 是否取得 → 揣十年 → 多年后才明白
   *
   * **抓住机会不等于当场获得答案。** 山道上的误读伸手就被戳破；
   * 这一册的误读可以揣着走十年，而且越揣越笃定。
   */
  'omen:book': {
    id: 'omen:book',
    title: '旧书',
    entry: 'open',
    nodes: {
      // 一、注意：你看见了摊角那一叠
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '镇上有个货郎在庙前摆摊，卖些针头线脑。' },
          { kind: 'narration', text: '摊角堆着一叠旧纸，说是从一户人家的破屋里收的，论斤称。' },
          { kind: 'narration', text: '最下面压着一册薄书，封皮已经没了。' },
        ],
        branches: [
          // 山道上那个人塞给你的东西还在箱子里：站在同一个摊子前，你看见的不是旧纸。
          // 两件事本来毫不相干，是你自己把它们接上的
          { requires: [{ item: 'thin-book' }], next: 'already' },
        ],
        next: 'notice',
      },

      // 二、理解：你把它看成什么。这一判断可能是错的，而且不会当场揭晓
      notice: {
        id: 'notice',
        onEnter: [{ type: 'appraise' }],
        blocks: [],
        next: 'interest',
      },

      /**
       * 三、兴趣：要不要管这件事。
       *
       * **这一节刻意与他读成什么无关。** 把它当废纸的人照样可能顺手买下，
       * 看出「不该声张」的人也照样可能怕惹事走开。
       * 引擎在这里不掷骰、不做属性判定——决定权整个交给玩家。
       */
      interest: {
        id: 'interest',
        blocks: [{ kind: 'narration', text: '货郎在招呼别的客人，没顾上你。' }],
        choices: [
          {
            id: 'buy',
            label: '把那册书买下来',
            hint: '几文钱',
            echo: '你把那册书买了下来。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'household', standing: -1 },
              { type: 'book', act: '买' },
            ],
            next: 'bought',
          },
          {
            id: 'ask',
            label: '问问货郎这是什么',
            echo: '你把书翻给货郎看。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'book', act: '问' },
            ],
            next: 'asked',
          },
          {
            id: 'leaf',
            label: '翻一翻就放回去',
            echo: '你翻了两页，把它放回原处。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 1 },
              { type: 'book', act: '翻' },
            ],
            next: null,
          },
          {
            id: 'away',
            label: '不关自己的事，走开',
            echo: '你走开了。',
            effects: [{ type: 'book', act: '走' }],
            next: null,
          },
        ],
      },

      /**
       * 问完之后仍然要决定买不买。
       *
       * 打听不该把行动机会消耗掉——他多知道了一点，但那一点未必
       * 指向正确的方向。玩家问错了问题，得到的是一个跟这册书无关
       * 却真实有用的答案。
       */
      asked: {
        id: 'asked',
        blocks: [],
        choices: [
          {
            id: 'buy-after',
            label: '还是买下来',
            hint: '几文钱',
            echo: '你把那册书买了下来。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'household', standing: -1 },
              { type: 'book', act: '买' },
            ],
            next: 'bought',
          },
          {
            id: 'drop',
            label: '放回去',
            echo: '你把它放回那叠旧纸里。',
            effects: [{ type: 'book', act: '走' }],
            next: null,
          },
        ],
      },

      // 四、取得
      bought: {
        id: 'bought',
        blocks: [],
        branches: [
          // 认得字的人看得懂「这不是普通的字」——
          // 不认字的人连这一层都不知道，那对他只是一册废纸
          { requires: [{ knowledge: 'literacy' }], next: 'literate' },
        ],
        next: 'kept',
      },

      /**
       * 认字的人多走一步：他拿去问了先生，而先生也不认得。
       *
       * 先生那句「别到处给人看」是这一支唯一一条外部信号，
       * 但它**不揭晓任何东西**——它只是让这件事更可疑，
       * 而玩家会把这份可疑织进他原本那个（可能是错的）判断里。
       */
      literate: {
        id: 'literate',
        onEnter: [{ type: 'attribute', key: 'insight', delta: 3 }],
        blocks: [
          { kind: 'narration', text: '你在私塾念过几年，认得的字不算少。' },
          { kind: 'narration', text: '你拿去问过先生。先生看了半晌，把书还给你。' },
          { kind: 'dialogue', speaker: '周先生', text: '不认得。' },
          { kind: 'narration', text: '他又补了一句：也别到处给人看。' },
        ],
        next: 'kept',
      },

      /**
       * 五、多年持有。
       *
       * 这一节是这支机缘跟山道那一支最不一样的地方：
       * **时间在这里不推进剧情，只加固错误。**
       * 他每隔一阵翻一次，一次也没看懂，于是那个最初的判断
       * 从「像是」变成「就是」——更确信，但没有更接近真相。
       */
      kept: {
        id: 'kept',
        onEnter: [
          { type: 'time', months: 1 },
          { type: 'book', act: '守' },
        ],
        blocks: [{ kind: 'narration', text: '往后很多年，这册书一直在箱子底下。', tone: 'faint' }],
      },

      /**
       * 箱底已经压着一册看不懂的书的人，站在同一个摊子前，看见的东西不一样。
       * 他没有得到任何新东西——他只是问了一句，然后知道了「这种纸不是本地货」。
       * 一条线索，不是一个答案。
       */
      already: {
        id: 'already',
        onEnter: [
          { type: 'time', days: 3 },
          { type: 'attribute', key: 'insight', delta: 2 },
        ],
        blocks: [
          { kind: 'narration', text: '你在那叠旧纸前站住了。' },
          { kind: 'narration', text: '你想起箱子底下压着的那一册。纸的样子，你记得很清楚。' },
          { kind: 'narration', text: '第二天你把书揣着来了，摊开给货郎看。' },
          { kind: 'narration', text: '货郎捻了捻纸角，摇头。' },
          { kind: 'dialogue', text: '不是我这一路的货。' },
          { kind: 'narration', text: '他又捻了一下，忽然凑近了些。' },
          { kind: 'dialogue', text: '这纸……府城当铺里我见过一回。人家不收。' },
          { kind: 'narration', text: '你问为什么不收。' },
          { kind: 'dialogue', text: '不知道。掌柜的看了一眼就摆手，脸都白了。' },
          { kind: 'narration', text: '他把书还给你，转身去招呼别的客人了。' },
          {
            kind: 'narration',
            text: '你把书重新包好。这一天你什么也没得到，只是多了一件不明白的事。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  'omen:merchant': {
    id: 'omen:merchant',
    title: '外乡人',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 3 }],
        blocks: [
          { kind: 'narration', text: '入秋以后，铺子里来了个外乡商旅。' },
          { kind: 'narration', text: '他要收一批粗布，说是往北边走。' },
          { kind: 'narration', text: '货谈了三天，晚上就住在后院。' },
          { kind: 'narration', text: '第三天夜里下雨，他坐在檐下喝酒，看见你在旁边。' },
        ],
        choices: [
          {
            id: 'ask-road',
            label: '问他北边是什么样子',
            echo: '你问他，北边是什么样子。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 4 },
              {
                type: 'knowledge',
                id: 'the-north',
                title: '北边',
                summary: '出了关往北，是三千里的荒原。他说走一趟要半年，路上死人是常事。',
                category: '地理',
              },
            ],
            next: 'talked',
          },
          {
            id: 'pour',
            label: '给他把酒满上，不说话',
            echo: '你给他把酒满上。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'attribute', key: 'will', delta: 2 },
              { type: 'flag', key: 'poured-for-merchant', value: true },
            ],
            next: 'talked',
          },
          {
            id: 'away',
            label: '回屋去',
            echo: '你回屋去了。',
            effects: [{ type: 'time', days: 1 }],
            next: 'missed',
          },
        ],
      },

      talked: {
        id: 'talked',
        onEnter: [
          { type: 'time', days: 2 },
          { type: 'attribute', key: 'fortune', delta: 2 },
          {
            type: 'relation',
            id: 'merchant',
            name: '走北路的商旅',
            delta: 12,
            note: '在你家住过三天。见过修士。',
          },
          {
            type: 'knowledge',
            id: 'cultivators-exist',
            title: '修士',
            summary:
              '这世上有一种人，不是官，不是江湖人。商旅说他亲眼见过一个，站在船头，船底下的水不动。',
            category: '修行',
          },
          { type: 'flag', key: 'heard-of-cultivators', value: true },
          {
            type: 'chronicle',
            text: '你第一次听人说起修士。说的人是个走北路的商旅。',
            tone: 'deep',
          },
        ],
        blocks: [
          { kind: 'narration', text: '他喝了几杯，话就多了起来。' },
          { kind: 'narration', text: '说北边的荒原，说路上的马贼，说去年冻死在车上的伙计。' },
          { kind: 'narration', text: '说到一半他停了停，往院子外面看了一眼。' },
          { kind: 'dialogue', text: '有一年在渡口，我见过一个人。' },
          { kind: 'dialogue', text: '他站在船头。那条船走得飞快，可是水面上一点波纹都没有。' },
          { kind: 'narration', text: '你问他那是什么人。' },
          { kind: 'dialogue', text: '修士。' },
          { kind: 'event', text: '你第一次听见这两个字。', tone: 'deep' },
          { kind: 'narration', text: '他没有再往下说，把杯子里的酒喝完就进屋了。' },
          { kind: 'narration', text: '第二天他走了。此后再没来过。', tone: 'faint' },
        ],
      },

      missed: {
        id: 'missed',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '夜里你听见檐下有人在自言自语，说了很久。' },
          { kind: 'narration', text: '雨太大，一句也没听清。' },
          { kind: 'narration', text: '第二天他就走了。', tone: 'faint' },
        ],
      },
    },
  },
}

export const encounterEvents: readonly LifeEvent[] = [
  {
    // 走山道的机会人人都有，权重压过散事件——
    // 它是通往这个游戏核心体验的唯一一条路。
    // 看不看得见那个人、他又是谁，才是真正的筛子
    id: 'omen-wounded',
    window: { from: 10, to: 16 },
    scene: 'omen:wounded',
    weight: 14,
  },
  {
    /**
     * 货郎每年都来，那一册在他摊上压了很久。
     *
     * 权重给得比山道低不了多少，是有意的：多数人这一生真正会遇上的，
     * 不是山道上濒死的修士，而是庙前一册几文钱的旧纸。
     * 它十六岁那年也会被人点破——点破的是「这东西没用」。
     * 「多年以后才明白」不保证明白过来的是好消息。
     */
    id: 'omen-book',
    window: { from: 9, to: 16 },
    scene: 'omen:book',
    weight: 9,
  },
  {
    // 铺子里才有外乡人过夜。生在田里的孩子这辈子碰不上这一幕
    id: 'omen-merchant',
    window: { from: 10, to: 16 },
    requires: [{ trade: '商户' }],
    scene: 'omen:merchant',
    weight: 6,
  },
]
