import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 师承。
 *
 * ## 这一册回答的是：他为什么愿意教你
 *
 * 上一册讲的是两个人互相打量了一回。那一册刻意什么也没给——
 * 见过了就是见过了，没有功法，没有资格，连一句准话都没有。
 *
 * 这一册讲的是那之后的事，而它要回答的问题**不是「玩家够不够格」**，
 * 是：**这个修士为什么会对这个凡人产生「值得教」的判断。**
 *
 * 两个问题听着像一个，其实差着一整套人生：
 *
 *     够不够格　　　　问的是玩家。答案在属性表里，早就定死了
 *     他为什么愿意　　问的是他。答案在他那把尺子、他在意的事、
 *                     他自己身上压着的那件事里，**跟属性表只有部分关系**
 *
 * ## 四种人生同时成立
 *
 *     资质很好 · 修士没看出来 　　　　　　　　　→ 不教
 *     资质普通 · 修士判断很准 · 觉得你适合某事 → 教一点
 *     资质很好 · 修士看出来了 · 可他有自己的事 → 仍旧不教
 *     资质普通 · 修士看错了 · 收下了 　　　　　→ 后来才发现不合适
 *
 * 于是「能不能修仙」跟「有没有人愿意教你」彻底分成两件事。
 * **而玩家分不出自己是哪一种。** 他看见的只有那个人今天理不理他。
 *
 * ## 师承是一格一格长出来的，不是一个开关
 *
 * 不理会 → 搭话 → 使唤 → 带一段 → 教一点。一次最多挪一格，
 * 所以「第一次不教、第二次使唤你干活、第三次才带你走一段」
 * 不需要任何额外分支——同一个人去四回，自然就是四格。
 *
 * 而**走到最后一格他仍旧不是你师父**。界面上不会跳出【师父：陶仲】，
 * 因为那不是关系的样子。关系的样子是他今天多说了一句话。
 *
 * ## 这一册也刻意不发东西
 *
 * 走到「教一点」拿到的是**五句话**。不是功法，不是心法，不是入门资格。
 * 那五句他背不背得下来、明不明白、身上有没有反应，是另外几件事，
 * 在 `rites.ts` 那两条轴上——而**他不知道自己走在哪一条上**。
 *
 * 尤其是那两条轴里藏着的一句：陶仲的教法是「说给你听」，
 * 而守一要的是「让你自己找」。**对不上。** 于是他念得越认真，
 * 学的人越笃定地往错地方使劲。这一册从头到尾没有一个字提这件事，
 * 因为**他自己也不知道**——他只会觉得是自己讲得不够细。
 */
export const tutelageScenes: SceneLibrary = {
  /**
   * 头一回站在药庐门口。
   *
   * ## 玩家最不觉得像修士的那个人，是唯一真的会教他的
   *
   * 他在称药。他手上有茧。他问你会不会数数。
   * 玩家一路找的是仙人，找到的时候那个人正低头拿手指抹平药戥子——
   * `bearing` 里那句「你想他是个郎中」是 `mistaken: '事实'`，
   * 而玩家没有任何办法知道自己读错了。
   *
   * ## 「问他知不知道山上的事」是这一册的第一个陷阱
   *
   * 它看着是最合理的一步：你找了这些年，好不容易碰上个像样的人，
   * 当然要问。可这一问把他当成了消息源——**而他不是。**
   *
   * 这一条不惩罚玩家，也不弹任何提示。它只是让那一天到此为止，
   * 而玩家会觉得是这个郎中不知道，不会觉得是自己问错了。
   */
  'tutor:shed': {
    id: 'tutor:shed',
    title: '药庐',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        /**
         * `meeting` 先跑，`tutelage` 后跑。
         *
         * 两格是分开的，因为它们回答的不是同一个问题：前一格算他量到了什么，
         * 后一格算他拿那个数决定怎么办。**合成一格的话，
         * 「他看得见」就又等于「他愿意」了**，这一整册就白写了。
         */
        onEnter: [
          { type: 'time', days: 3 },
          { type: 'meeting', who: 'herbalist-at-the-shed' },
        ],
        blocks: [
          { kind: 'narration', text: '药庐在镇子西头，门开着，没有招牌。' },
          { kind: 'narration', text: '你在门口站了一会儿才进去。' },
        ],
        choices: [
          {
            /**
             * 站着不走。
             *
             * 这一条什么也没做——**而它是这一整册唯一走得通的那一条**。
             * 玩家不会知道这一点。他多半会觉得站着挺傻的。
             */
            id: 'just-stay',
            label: '站在那儿不走',
            echo: '你没有说话，也没有走。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'tutelage', who: 'herbalist-at-the-shed' },
            ],
            next: 'after',
          },
          {
            /**
             * 问他知不知道山上的事。
             *
             * 把人当成消息源的那一问。他答了，答得很短，那一天就完了。
             * **正文里一个字也不提这是个错**。
             */
            id: 'ask-about-mountain',
            label: '问他知不知道山上那些事',
            echo: '你把打听来的那几句说了一遍。',
            effects: [{ type: 'time', days: 1 }],
            next: 'asked',
          },
          {
            id: 'walk-off',
            label: '什么也没问就走了',
            echo: '你退了出来。',
            effects: [{ type: 'time', days: 1 }],
            next: 'walked',
          },
        ],
      },

      after: {
        id: 'after',
        /**
         * 挪动了没有，正文自己会说。
         *
         * 挪动了，`tutelage` 那一格已经把「你若真想学，明日再来」印出去了；
         * 没挪动，那一格什么也没印——于是这一节接的是同一句话，
         * 而**它在两种情况下读起来完全不同**，玩家不知道自己读到的是哪一种。
         */
        blocks: [
          { kind: 'narration', text: '你走出来的时候天已经擦黑了。' },
          { kind: 'narration', text: '回去的路上你想不明白今天算是怎么回事。', tone: 'faint' },
        ],
      },

      asked: {
        id: 'asked',
        blocks: [
          { kind: 'narration', text: '他一直没抬头。' },
          { kind: 'dialogue', text: '「不知道。」' },
          { kind: 'narration', text: '过了一会儿他又说了一句。' },
          { kind: 'dialogue', text: '「问这个做什么。」' },
          { kind: 'narration', text: '你说不上来。他就没再问了。' },
          {
            kind: 'narration',
            text: '你想这地方问不出什么，走了。',
            tone: 'faint',
          },
        ],
      },

      walked: {
        id: 'walked',
        blocks: [
          { kind: 'narration', text: '你走到街口才想起来，他从头到尾没问你要做什么。' },
          { kind: 'narration', text: '你想大约是没把你当回事。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 第二回。搭话 → 使唤。
   *
   * 「这两日替我做件事」——挑药、翻筐、手指沤黑。
   * **这一格里没有一个字跟修行有关**，而这正是它要说的话：
   * 他在看你能不能守住，而你以为你在等他松口。
   */
  'tutor:errand': {
    id: 'tutor:errand',
    title: '药庐 · 又去',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 2 },
          { type: 'tutelage', who: 'herbalist-at-the-shed' },
        ],
        blocks: [{ kind: 'narration', text: '卯时你又去了。门已经开了。' }],
        branches: [
          {
            requires: [{ flag: { key: 'footing:herbalist-at-the-shed', equals: '使唤' } }],
            next: 'used',
          },
          { requires: [], next: 'nothing' },
        ],
      },

      used: {
        id: 'used',
        blocks: [{ kind: 'narration', text: '天黑的时候他把门闩上，什么也没说。' }],
        choices: [
          {
            id: 'keep-coming',
            label: '第二天还去',
            echo: '你第二天还是卯时到的。',
            effects: [{ type: 'time', days: 30 }],
            next: null,
          },
          {
            /**
             * 走。
             *
             * `footing` 改回「不理会」——**关系是可以断的**，
             * 而断了之后那几个事件的 `requires` 自然就够不着了，
             * 不需要任何额外的开关。
             */
            id: 'give-up',
            label: '不去了',
            critical: true,
            echo: '你没有再去。',
            effects: [
              { type: 'time', days: 30 },
              { type: 'flag', key: 'footing:herbalist-at-the-shed', value: '不理会' },
              { type: 'chronicle', text: '你在镇西那个药庐做了两日活，没有再去。' },
            ],
            next: 'quit',
          },
        ],
      },

      nothing: {
        id: 'nothing',
        /**
         * 他今天没理你。
         *
         * **这是这一册最常见的一节**，而它长得跟「什么内容也没有」一模一样。
         * 那不是缺内容——一个人一年一年地去，一年一年地什么也没等到，
         * 本来就是这个样子。
         */
        blocks: [
          { kind: 'narration', text: '他在称药。称完一味，写一笔，再称下一味。' },
          { kind: 'narration', text: '你站到日头偏西，他没有抬过头。' },
          { kind: 'narration', text: '你想大概是自己哪里做得不对。', tone: 'faint' },
        ],
        choices: [
          {
            id: 'come-again',
            label: '明天再来',
            echo: '你明天还来。',
            effects: [{ type: 'time', days: 1 }],
            next: null,
          },
          {
            id: 'stop-going',
            label: '算了',
            critical: true,
            echo: '你没有再去。',
            effects: [
              { type: 'time', days: 20 },
              { type: 'flag', key: 'footing:herbalist-at-the-shed', value: '不理会' },
            ],
            next: 'quit',
          },
        ],
      },

      quit: {
        id: 'quit',
        blocks: [
          { kind: 'narration', text: '后来你从镇西过，几次都没往那边看。' },
          { kind: 'narration', text: '你说不清是赌气还是别的什么。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 第三回。使唤 → 带一段。
   *
   * 他带你上后山认了七八样草，说完就走，不管你记没记住。
   * 走了大半天，你腿软得站不住，**而他一句跟修行有关的话也没说**。
   *
   * ## 「怀疑」在这一节
   *
   * 走到这里怀疑他是最合理的反应：你替他白干了两个月活，
   * 换来的是背着药篓爬了一趟山。**而怀疑是要付代价的**——
   * 不是因为他小气，是因为你问出口的那一刻，他知道你等的是别的东西。
   */
  'tutor:walk': {
    id: 'tutor:walk',
    title: '后山',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 60 },
          { type: 'tutelage', who: 'herbalist-at-the-shed' },
        ],
        blocks: [{ kind: 'narration', text: '两个月过去了。' }],
        branches: [
          {
            requires: [{ flag: { key: 'footing:herbalist-at-the-shed', equals: '带一段' } }],
            next: 'walked',
          },
          { requires: [], next: 'still-nothing' },
        ],
      },

      walked: {
        id: 'walked',
        blocks: [{ kind: 'narration', text: '下山的时候日头已经偏了。' }],
        choices: [
          {
            id: 'say-nothing',
            label: '什么也没问',
            echo: '你一路没有说话。',
            effects: [{ type: 'time', days: 60 }],
            next: null,
          },
          {
            /**
             * 问他到底要不要教。
             *
             * 这一问不会让他翻脸，也不会让他解释。他只是不再往下走了——
             * `footing` 停在「带一段」，而下一格永远不会来。
             *
             * **玩家不会知道是这一句话的缘故。** 他只会觉得后来那两年
             * 那个人一直没什么变化。
             */
            id: 'press-him',
            label: '问他到底要不要教你',
            critical: true,
            hint: '你等了两个月了',
            echo: '你到底还是问了。',
            effects: [
              { type: 'time', days: 60 },
              { type: 'flag', key: 'asked-him-outright', value: true },
            ],
            next: 'pressed',
          },
        ],
      },

      pressed: {
        id: 'pressed',
        blocks: [
          { kind: 'narration', text: '他把药篓换了个肩。' },
          { kind: 'dialogue', text: '「教什么。」' },
          { kind: 'narration', text: '你说不出来。你连自己想学的是什么都说不清楚。' },
          { kind: 'narration', text: '他嗯了一声，往前走了。' },
          {
            kind: 'narration',
            text: '那天以后他待你还是一样。什么也没少，也什么都没多。',
            tone: 'faint',
          },
        ],
      },

      'still-nothing': {
        id: 'still-nothing',
        blocks: [
          { kind: 'narration', text: '两个月里你翻了四百多筐药。' },
          { kind: 'narration', text: '他一次也没有再多说什么。' },
          { kind: 'narration', text: '你开始想这样下去到底有没有个头。', tone: 'faint' },
        ],
        choices: [
          {
            id: 'keep-at-it',
            label: '接着翻',
            echo: '第二天你照旧卯时到。',
            effects: [{ type: 'time', days: 60 }],
            next: null,
          },
          {
            id: 'had-enough',
            label: '不去了',
            critical: true,
            echo: '你把那筐药放下就走了。',
            effects: [
              { type: 'time', days: 40 },
              { type: 'flag', key: 'footing:herbalist-at-the-shed', value: '不理会' },
              { type: 'chronicle', text: '你在镇西那个药庐做了两个月的活，走了。' },
            ],
            next: 'walked-out',
          },
        ],
      },

      'walked-out': {
        id: 'walked-out',
        blocks: [
          { kind: 'narration', text: '走出巷口的时候你回头看了一眼。他还在称药。' },
          { kind: 'narration', text: '他大概到天黑才发现你没回来。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 第四回。带一段 → 教一点。
   *
   * ## 这一节拿到的是五句话
   *
   * 不是功法，不是心法，不是入门资格，背包里不多一件东西。
   * `teaching` 落进认知层的 `interpretation` 写死 `未理解`——
   * **他听见了，他不懂**，而这两件事同时成立。
   *
   * ## `teaching` 无条件写在 onEnter 里
   *
   * 挪不到「教一点」的时候它自己会返回空，正文里什么也不会出现。
   * 不用在剧本里判一遍——**判两遍的地方迟早会有一遍忘了改**。
   */
  'tutor:words': {
    id: 'tutor:words',
    title: '门槛上',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 90 },
          { type: 'tutelage', who: 'herbalist-at-the-shed' },
          { type: 'teaching', who: 'herbalist-at-the-shed', rite: 'quiet-breath' },
        ],
        blocks: [],
        branches: [
          {
            requires: [{ flag: { key: 'rite:quiet-breath' } }],
            next: 'taught',
          },
          { requires: [], next: 'not-yet' },
        ],
      },

      taught: {
        id: 'taught',
        onEnter: [
          {
            type: 'chronicle',
            text: '镇西药庐那位教了你一个呼吸法。',
            tone: 'deep',
          },
        ],
        blocks: [
          { kind: 'narration', text: '他说完就起身收拾去了，像是刚才那几句不值一提。' },
          { kind: 'narration', text: '你在门槛上又坐了一会儿。' },
          {
            kind: 'narration',
            text: '你把那五句在心里默了两遍，中间那句怎么也接不顺。',
            tone: 'faint',
          },
        ],
      },

      'not-yet': {
        id: 'not-yet',
        blocks: [
          { kind: 'narration', text: '入夏之后他话更少了。' },
          { kind: 'narration', text: '你还是天天去，天天做那些事。' },
          { kind: 'narration', text: '你已经不太去想他哪天会开口了。', tone: 'faint' },
        ],
        choices: [
          {
            /**
             * 接着去。
             *
             * 这一条最要紧的地方是**它读起来像认命**——
             * 而在药庐那位的尺子上，认命跟守得住是同一样东西。
             * 玩家不会知道这一点。
             */
            id: 'go-on-anyway',
            label: '接着去',
            echo: '第二天你还是去了。',
            effects: [{ type: 'time', days: 90 }],
            next: null,
          },
          {
            id: 'let-it-go',
            label: '这事就这么算了',
            critical: true,
            echo: '你没有再去。',
            effects: [
              { type: 'time', days: 60 },
              { type: 'flag', key: 'footing:herbalist-at-the-shed', value: '不理会' },
              { type: 'chronicle', text: '你在镇西那个药庐待了大半年，什么也没学着。' },
            ],
            next: 'let-go',
          },
        ],
      },

      'let-go': {
        id: 'let-go',
        blocks: [
          { kind: 'narration', text: '入秋以后你没有再去过西头。' },
          {
            kind: 'narration',
            text: '有一回在集上远远看见他背着药篓，你绕开了。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 你自己回去试。
   *
   * ## 这一卷可以反复来，而它最常见的结果是什么也没发生
   *
   * 一回打坐同时走两条轴，一次最多各挪一步，**而玩家不知道自己在哪一条上**：
   * 背不全的人和背得滚瓜烂熟却一丝气感也没有的人，
   * 看到的都是同一件事——天亮了，该下地了。
   *
   * ## 这一卷的 `blocks` 是空的，正文全从 `practice` 那一格长出来
   *
   * 不能在这儿写死一段「你坐下练了一回」——那样四种处境就读成同一句话了。
   * `practise()` 返回的正文分两段：先是身上那一格（他做了什么、觉出了什么），
   * 后是脑子里那一关（他把那五句又过了一遍）。
   *
   * 而那两段里各藏着一处**故意看不出来的地方**：
   * 「明白」这一关过与不过写的是同一段话，
   * 「照着做」和「走岔了」两格从头到尾写的也是同一段话。
   * **「我觉得我走对了」和「我真的走对了」，人自己分不出来。**
   */
  'tutor:alone': {
    id: 'tutor:alone',
    title: '夜里',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 20 },
          { type: 'practice', rite: 'quiet-breath' },
        ],
        blocks: [],
      },
    },
  },
}

/**
 * 什么时候会去。
 *
 * ## 一格一个事件，这一条是有意的
 *
 * 四个事件的 `requires` 各自钉死一格 `footing`。看着啰嗦，
 * 可它换来两样东西：**每一格的剧情本来就不同**（站着 / 干活 / 爬山 / 那五句），
 * 以及**关系断了就自然够不着**——「不去了」那一条把 `footing`
 * 改回「不理会」，四个事件的条件全部落空，不需要任何额外的开关。
 *
 * ## 为什么都压在十四到十七岁
 *
 * 跟 `meeting` 那一册同一个理由：**凡人这一册十六七岁就在渡口收尾了**。
 * 写在二十二岁的事今天等于死代码，年表永远抽不到它，
 * 而它看起来跟活的一模一样。
 *
 * 要紧的不是隔了几年，是**隔着四回**。等成年那一段人生写出来，
 * 把窗口往后拉就行，机制一个字不用动。
 */
export const tutelageEvents: readonly LifeEvent[] = [
  {
    /**
     * 头一回。
     *
     * 入场只要一样：心里那个念头还在。**不要求他找着过什么**——
     * 这一册最要紧的一句话就是这个人根本不像玩家要找的那种人，
     * 而玩家是自己撞进去的。
     */
    id: 'tutor-shed',
    window: { from: 12, to: 16 },
    requires: [{ flag: { key: 'leaning:know' } }],
    scene: 'tutor:shed',
    chain: 'tutelage',
    weight: 7,
  },
  {
    id: 'tutor-errand',
    window: { from: 12, to: 16 },
    requires: [{ flag: { key: 'footing:herbalist-at-the-shed', equals: '搭话' } }],
    scene: 'tutor:errand',
    chain: 'tutelage',
    weight: 9,
  },
  {
    id: 'tutor-walk',
    window: { from: 13, to: 16 },
    requires: [{ flag: { key: 'footing:herbalist-at-the-shed', equals: '使唤' } }],
    scene: 'tutor:walk',
    chain: 'tutelage',
    weight: 9,
  },
  {
    /**
     * 那五句。
     *
     * ## 这一件可以反复来，而前三件不行
     *
     * 前三格（搭话 / 使唤 / 带一段）分数够了就过，去一回就挪一格。
     * 最后这一格不是——`reachOf` 要 `regard` 比门槛高出整整三个台阶，
     * 而他每天量出来的数是飘的：**同一个孩子今天量到 84，明天量到 76。**
     *
     * 所以这一格靠的是次数。你一趟一趟地去，多数日子他什么也没说，
     * 直到某一天他量到的那个数恰好够了，他把炉子收了，让你坐下。
     *
     * 少了 `repeatable`，「明日再来」就成了一句空话：去一回没开口，
     * 这辈子就再也没有第二回了。
     */
    id: 'tutor-words',
    repeatable: true,
    window: { from: 13, to: 16 },
    requires: [{ flag: { key: 'footing:herbalist-at-the-shed', equals: '带一段' } }],
    scene: 'tutor:words',
    chain: 'tutelage',
    weight: 9,
  },
  {
    /**
     * 练。
     *
     * `repeatable` 是这一条的要害——**一回打坐两条轴各最多挪一步**，
     * 而身上那条里有一整格是根本挪不出去的（根骨不够就是碰不着）。
     * 一辈子只能练一次的话，「练了三年也没有动静」这种人生就压根写不出来。
     *
     * ## 「拿得住」在这一册里多半走不到，这是老实话
     *
     * `QUIET_BREATH.settles` 要一年半，而这个窗口只有十四到十六岁，
     * 每来一回推二十天。摸着了那一回来得晚一点，日子就不够用了。
     *
     * 不为这个把窗口拉长——**成年之后那一段人生还没写**，
     * 拉长了就是往一个不存在的年纪里塞事。等那一段有了，
     * 把 `to` 往后挪就行，机制一个字不用动。
     */
    id: 'tutor-alone',
    repeatable: true,
    window: { from: 14, to: 16 },
    requires: [{ flag: { key: 'rite:quiet-breath' } }],
    scene: 'tutor:alone',
    weight: 6,
  },
]
