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
 * 2. **机会摆在面前，看不看得见是另一回事。** 而「没看见」不是一件事，是三件：
 *
 *        unseen                没有注意到
 *        noticed-but-ignored   看见了，但没放在心上
 *        misread               看见了，理解成另一回事
 *
 *    这三种在人生意义上完全不同。第一种他这辈子不知道自己错过了什么；
 *    第二种他记得草丛里好像有点什么；第三种他记得自己当时那句
 *    「不过是个醉汉」。压成一个 `miss` 节点，等于把三种人生写成同一句话。
 *
 *    分档的依据也不是属性高低。**决定他看不看得见的是那天他心里装着什么**——
 *    详见 `src/engine/attention.ts`。
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
          // 那天的天。它谁都拦不住，可它决定他抬不抬头
          {
            type: 'roll',
            key: 'road-weather',
            among: [
              { value: '晴', weight: 42 },
              { value: '阴', weight: 26 },
              { value: '起风', weight: 20 },
              { value: '下雨', weight: 12 },
            ],
          },
          // 心思细不细 + 那天他心里装着什么 + 路上是什么天，合起来掷一次
          { type: 'attend' },
        ],
        blocks: [
          { kind: 'narration', text: '那天你走山道去邻村。' },
          {
            kind: 'narration',
            text: '路很长，走了大半日。日头偏西的时候，你在下坡那一段歇了歇脚。',
          },
        ],
        /**
         * ① 注意。
         *
         * 从前这里是一行阈值：`insight ≥ 34 || body ≥ 52`。
         * 读起来像一道筛子，量出来三百世三百个人全都过了——
         * **十一种出身里只有农户两项都够不着，而童年那些事
         * 到十岁之前就把属性推过了线。** 这一关被童年系统提前解决了。
         *
         * 可修法不是把线抬高。抬高只会换来「聪明孩子看见、笨孩子看不见」，
         * 那是能力检测。要问的是**当时的他有没有把注意力放在那里**——
         * 一个心思很细的孩子，在满脑子想着家里那个还没退烧的人的下午，
         * 一样什么都看不见。判定挪进了 `attend`，这里只认它掷出来的结果。
         */
        branches: [
          { requires: [{ flag: { key: 'attention', equals: 'caught' } }], next: 'notice' },
          {
            requires: [{ flag: { key: 'attention', equals: 'glimpsed' } }],
            next: 'noticed-but-ignored',
          },
        ],
        next: 'unseen',
      },

      /**
       * 第一种错过：**没有注意到。**
       *
       * 正文里根本不会提有人躺着。他这一生都不知道那天错过了什么——
       * 但他读得到自己那天心里装着什么，那一句由 `attend` 印在上一节末尾。
       */
      unseen: {
        id: 'unseen',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '歇够了，你接着赶路。' },
          { kind: 'narration', text: '天黑前到了邻村，事情办完，第二天就回去了。' },
          { kind: 'narration', text: '这一趟没有什么可说的。', tone: 'faint' },
        ],
      },

      /**
       * 第二种错过：**看见了，但没放在心上。**
       *
       * 这一档跟上一档在人生意义上完全是两回事。他确实看见了，
       * 而且他会记得——「那天草丛里好像有点什么」。多年以后
       * 若有人说起山道上的事，他心里会响一下。
       *
       * 走开的理由不是他冷漠，是天色、是脚程、是心里那件更要紧的事。
       */
      'noticed-but-ignored': {
        id: 'noticed-but-ignored',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '路边的草丛好像被压过。你多看了半眼。' },
          { kind: 'narration', text: '没停。天色不早，还有半程路要走。' },
          { kind: 'narration', text: '走出去几十步，那点念头就散了。', tone: 'faint' },
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
        /**
         * 理解决定他停不停下来。
         *
         * 从前这里无条件接 `interest`，等于「看见了就一定会考虑要不要管」。
         * 可认定那是个醉汉的人根本不会停——**他不是不管，他是觉得没什么可管的。**
         *
         * 「读成死人」也走这一支，但它跟「读成醉汉」不是一回事：
         * 地上真躺着个死人的时候，走开是判断对了。两种都落在这一节里，
         * 分开哪一种是走查的事——`wounded-misread` 那面旗子记着他到底读错没有。
         */
        branches: [
          { requires: [{ flag: { key: 'wounded-reading', equals: '醉汉' } }], next: 'misread' },
          { requires: [{ flag: { key: 'wounded-reading', equals: '死人' } }], next: 'misread' },
        ],
        next: 'interest',
      },

      /**
       * 第三种错过：**看见了，理解成另一回事。**
       *
       * 这一档最容易被压扁成「没看见」，可它跟没看见差得最远：
       * 他看清了，判断了，然后走了。多年以后若有人点破那天山道上是什么人，
       * 他想起的不是一片空白，是自己当时那句「不过是个醉汉」。
       */
      misread: {
        id: 'misread',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '你绕开那片草丛，接着赶路。' },
          { kind: 'narration', text: '天黑前到了邻村，事情办完，第二天就回去了。' },
          { kind: 'narration', text: '路上你没再想起这件事。', tone: 'faint' },
        ],
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

  /**
   * 走北路的那个商旅。
   *
   * 前两支机缘验的是玩家跟**世界**打交道：山道上躺着的是个人，但对玩家
   * 而言他跟一册书没有区别——不会争辩，不会含糊其辞，不会自己就理解错了。
   *
   * 这一支验的是玩家跟**另一个人**打交道。而人跟物最要紧的区别是：
   *
   *   **一个人对世界的理解，本身就是另一个人的局部世界。**
   *
   * 所以这一卷会来很多次。同一个商旅，同一条北路，隔两年再坐到你家檐下——
   * 而这中间**你已经不是原来那个你了**：你上次问出来的那句话，
   * 决定了你这次会问什么。
   */
  'omen:merchant': {
    id: 'omen:merchant',
    title: '外乡人',
    entry: 'open',
    nodes: {
      // 一、注意：屋檐下坐着一个不是本地人的人
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 3 }],
        blocks: [],
        branches: [
          // 不是头一回了。他记得你，你也记得他
          { requires: [{ flag: { key: 'met-merchant' } }], next: 'again' },
        ],
        next: 'first',
      },

      first: {
        id: 'first',
        onEnter: [
          {
            type: 'meet',
            id: 'merchant',
            calls: '走北路的商旅',
            delta: 4,
            note: '收粗布往北边贩。每隔一两年从这儿过一趟。',
          },
          { type: 'flag', key: 'met-merchant', value: true },
        ],
        blocks: [
          { kind: 'narration', text: '入秋以后，来了个外乡商旅。' },
          { kind: 'narration', text: '他要收一批粗布，说是往北边走。' },
          { kind: 'narration', text: '货谈了三天，晚上就住在后院。' },
          { kind: 'narration', text: '第三天夜里下雨，他坐在檐下喝酒，看见你在旁边。' },
        ],
        next: 'notice',
      },

      /**
       * 他又来了。
       *
       * 这一节是这支机缘跟前两支最不一样的地方：**他是个持续存在的人。**
       * 山道上那个人只出现一次，货郎摊上那册书更是一件死物；
       * 而这个人会记得你，也会老。
       */
      again: {
        id: 'again',
        onEnter: [
          { type: 'time', days: 2 },
          { type: 'meet', id: 'merchant', delta: 4 },
        ],
        blocks: [
          { kind: 'narration', text: '入秋以后，那个走北路的商旅又来了。' },
          { kind: 'narration', text: '他还认得你，说你长高了。' },
          { kind: 'narration', text: '夜里他仍旧坐在檐下喝酒。' },
        ],
        next: 'notice',
      },

      /**
       * 二、理解：你怎么看待这个人。
       *
       * 这一节没有掷骰——**你看他的方式，就是你上次谈完之后留下的那句话**。
       * 一个还没听说过修士的孩子看见的是「一个走过很多路的人」；
       * 一个确信修士是江湖高手的少年看见的是「一个可能见过高手的人」。
       * 同一个人，同一张脸。
       */
      notice: {
        id: 'notice',
        blocks: [
          { kind: 'narration', text: '他脸上有风吹出来的红，手背上一道旧疤。' },
          { kind: 'narration', text: '他不问你的事，也不赶你走。' },
        ],
        next: 'interest',
      },

      /**
       * 三、兴趣：要不要凑过去。
       *
       * 跟前两支一样，这一节**一个条件也不带**：
       * 觉得他有意思的人可以凑过去，觉得没意思的人可以回屋睡觉。
       * 引擎不替玩家决定他对什么感兴趣。
       */
      interest: {
        id: 'interest',
        blocks: [],
        choices: [
          {
            id: 'talk',
            label: '凑过去跟他说话',
            echo: '你在他旁边坐下了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'hearsay' },
            ],
            next: 'after',
          },
          {
            /**
             * 先给他把酒满上。
             *
             * 这一条不改变他知道什么，只改变他肯说多少——
             * **知道和肯说是两回事**，这一条在打听系统里就立住了。
             */
            id: 'pour',
            label: '先给他把酒满上',
            hint: '他还没开口',
            echo: '你给他把酒满上。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 2 },
              { type: 'flag', key: 'poured-for-merchant', value: true },
              { type: 'meet', id: 'merchant', delta: 8 },
              { type: 'hearsay' },
            ],
            next: 'after',
          },
          {
            id: 'listen',
            label: '在门边站着听，不出声',
            echo: '你在门边站着。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 3 },
            ],
            next: 'overheard',
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

      // 四、他答了。五、你把那句话收进了自己的框里
      after: {
        id: 'after',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '雨下到后半夜。他没再说什么，把杯子里的酒喝完就进屋了。' },
          { kind: 'narration', text: '第二天他走了。他说过两年还从这儿过。', tone: 'faint' },
        ],
      },

      /**
       * 站着听。
       *
       * 他没有在跟你说话，所以他没有把话说浅——**你听见的是他跟别人的原话**。
       * 但没头没尾，你接不上前因后果。
       * 这一条给的是心思，不是答案。
       */
      overheard: {
        id: 'overheard',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '他在跟掌柜的说话，说的是路上的事。' },
          { kind: 'dialogue', text: '……那一段我如今是绕着走的。' },
          { kind: 'narration', text: '掌柜的问为什么。' },
          { kind: 'dialogue', text: '前年那趟，我在渡口看见点东西。' },
          { kind: 'narration', text: '后面他压低了声音，你一句也没听清。' },
          {
            kind: 'narration',
            text: '你站了很久，直到脚站麻了。你知道他刚才说了一件要紧的事，可你不知道是什么。',
            tone: 'faint',
          },
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
  /**
   * 走北路那个商旅，隔一两年从这儿过一趟。
   *
   * 拆成三次是有意的：**这一支的验收本来就需要多次对话。**
   * 一次谈话只能证明「NPC 会作答」，三次才看得出
   * 「他的世界模型是怎么一年一年长歪的」——
   * 而那正是这一支真正要证明的事。
   *
   * 三条 id 不同，所以年表把它们当三件事；scene 相同，
   * 所以走进去的是同一个人、同一条北路。他会记得你，也会老。
   */
  {
    // 南来北往的人歇脚的地方：铺子、客栈、酒楼。田里的孩子碰不上这一幕
    id: 'omen-merchant-1',
    window: { from: 9, to: 11 },
    requires: [{ business: '布庄' }],
    scene: 'omen:merchant',
    weight: 8,
  },
  {
    id: 'omen-merchant-2',
    window: { from: 11, to: 14 },
    requires: [{ flag: { key: 'met-merchant' } }],
    scene: 'omen:merchant',
    weight: 10,
  },
  {
    id: 'omen-merchant-3',
    window: { from: 14, to: 16 },
    requires: [{ flag: { key: 'met-merchant' } }],
    scene: 'omen:merchant',
    weight: 10,
  },
  {
    // 客栈和酒楼一样住得下外乡人。头一回碰上的窗口比商户晚些——
    // 掌柜的孩子在柜台后头，跑堂的孩子在灶间，凑到檐下要更大一点
    id: 'omen-merchant-inn',
    window: { from: 10, to: 13 },
    requires: [{ business: '客栈' }],
    scene: 'omen:merchant',
    weight: 8,
  },
  {
    id: 'omen-merchant-tavern',
    window: { from: 10, to: 13 },
    requires: [{ business: '酒楼' }],
    scene: 'omen:merchant',
    weight: 8,
  },
]
