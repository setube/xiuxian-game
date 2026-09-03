import { ERRANDS } from '@/content/errands'
import { toChineseNumber } from '@/engine/describe'
import type { Choice, LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 找。
 *
 * ## 修行的第一关不是学不会，是不知道去哪找
 *
 * 一个有了「想弄明白修行」这个念头的人，能做的只有打听。
 * 而他打听到的东西里绝大多数是假的——**他手里没有任何工具可以分辨**。
 *
 * 唯一的两样办法都要花时间，而且都可能白花：跑一趟看看，
 * 或者听第二个人说同一件事。
 *
 * ## 这一册刻意不碰功法、炼气、境界
 *
 * 那些是门里的事。这一册讲的是一个人怎么走到门口——
 * **而绝大多数人一辈子也没走到。**
 *
 * ## 入场只看念头，不看资质
 *
 * 一个天生资质极好、却从没听说过修士的人，这几卷一辈子碰不上。
 * 而资质平平但找了很多年的人会一路走到门前，
 * 然后被人摸一下腕子打发回来。**顺序是有意的。**
 */

/**
 * 四趟寻访做成的四个选项。
 *
 * ## 天数只有一处真相
 *
 * `hint` 上那句「耗 三日」、`time` 里推的那三天、
 * `errand` 落地时用的那个 id——三样东西都从 `ERRANDS` 那一条取。
 * 手抄第二遍就会漂：改了数据忘了改剧本，玩家看见的是「耗 两日」，
 * 世界走掉的是三天，**而没有任何东西会吭一声**。
 *
 * ## 为什么 `time` 和 `errand` 分开写
 *
 * 一批效果是一个时刻：上下文相（`time`）先跑，事实相（`errand`）后跑。
 * 于是这一趟落进认知和日录的时间戳，是**他回到家那一刻**，
 * 而不是动身那一刻。让 `errand` 自己推时间的话这条就破了。
 *
 * ## `requires` 决定他看得见几条路
 *
 * 四条都写着「心里得存着那个念头」。没有念头的人站在同一个村口，
 * 一条也看不见——`lockedHint` 也不写，**他不该知道此处有路**。
 */
const TRIPS: Choice[] = ERRANDS.map((errand) => ({
  id: errand.id,
  label: errand.label,
  hint: `耗 ${toChineseNumber(errand.days)}日`,
  echo: errand.echo,
  requires: [...(errand.requires ?? [])],
  effects: [
    { type: 'time', days: errand.days },
    { type: 'errand', id: errand.id },
  ],
  next: 'back',
}))

/**
 * 认准了一处地方，跑一趟。
 *
 * 这一条平时不在——`sure-of` 那个旗标只有在他从某一趟里
 * 听到一句让他当场就信的话之后才落。
 *
 * 走的是 `follow()`，跟「两条不相干的消息对上了」那条路同一个出口。
 * **他自己分不出这一回的把握是从哪儿来的**，剧本也不替他分。
 */
const THE_PLACE: Choice = {
  id: 'go-there',
  label: '收拾东西，跑一趟',
  critical: true,
  hint: '少说十来日',
  echo: '你跟家里说去看个亲戚，第二天一早就走了。',
  requires: [{ flag: { key: 'sure-of' } }],
  effects: [{ type: 'time', days: 8 }, { type: 'household', standing: -2 }, { type: 'follow' }],
  next: 'came-back',
}

const ENOUGH: Choice = {
  id: 'enough',
  label: '不找了',
  echo: '你没有再去。',
  effects: [
    { type: 'time', days: 2 },
    { type: 'flag', key: 'stopped-asking', value: true },
  ],
  next: 'gave-up',
}

export const seekingScenes: SceneLibrary = {
  /**
   * 近处的寻访。
   *
   * ## 这一卷的入场不看念头
   *
   * 村口来了个外乡商旅，这是一件寻常事，谁都碰得上。
   * **变的不是世界，是他站在这儿能看见几条路**——
   * 没起过那个心思的人只有一条「看看热闹」，
   * 起过的人眼前多出四个去处。
   *
   * 这比「有念头的人成功率高些」硬得多：那种写法玩家一辈子
   * 感觉不到，而这一种他一眼就看得见。
   *
   * ## 一趟一趟地去，一趟一趟地空
   *
   * 四张落点表里「白跑」占过半。找了这些年一件对得上的也没有，
   * 这件事本身会把念头压下去——**而那不是玩家点了「算了」那一下，
   * 是空手回来的次数攒够了。**
   */
  'seek:errand': {
    id: 'seek:errand',
    title: '打听',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        // 他明天就走。这个旗标是那个商旅在不在村里的唯一真相
        onEnter: [{ type: 'flag', key: 'trader-here', value: true }],
        blocks: [
          { kind: 'narration', text: '村口那棵树底下停了一辆车。' },
          { kind: 'narration', text: '是个外乡的商旅，说明天一早就走。' },
          { kind: 'narration', text: '村里的人围着看他车上的针线和布。' },
        ],
        seen: [
          {
            /**
             * 只添注意力，不添信息。
             *
             * 那个人本来就走南闯北，这句话没有一个字是新的世界事实——
             * **变的只是他听见了。**
             *
             * 这一格平时是给人生事实用的（经历过丧事的孩子多看一眼），
             * 这里拿念头来驱动：念头落在世界上就是 `leaning:know` 这个旗标，
             * 写得进 `Condition`。分工的实质是那半条纪律——
             * 只添注意力，不添信息——而不是驱动源是哪一种。
             */
            requires: [{ flag: { key: 'leaning:know' } }],
            text: '你听见他跟人说起北边的路。你站住了。',
          },
        ],
        choices: [
          ...TRIPS,
          THE_PLACE,
          {
            id: 'watch',
            label: '看看热闹就回去',
            echo: '你看了一会儿就回家了。',
            effects: [{ type: 'time', days: 1 }],
            next: null,
          },
        ],
      },

      /**
       * 一趟回来了。
       *
       * 空手回来的次数攒够了就走 `empty`——**而那一句不是判决，
       * 是他自己得出的结论**：这些事大概只是传说。
       */
      back: {
        id: 'back',
        blocks: [],
        branches: [{ requires: [{ flag: { key: 'came-up-empty' } }], next: 'empty' }],
        next: 'again',
      },

      again: {
        id: 'again',
        blocks: [{ kind: 'narration', text: '过了些日子，你还是想着那件事。' }],
        choices: [
          ...TRIPS,
          THE_PLACE,
          {
            id: 'rest',
            label: '先这样吧',
            echo: '你先没再去。',
            effects: [{ type: 'time', months: 2 }],
            next: null,
          },
          ENOUGH,
        ],
      },

      /**
       * 跑那一趟回来了。
       *
       * 万一他认准的那处地方碰巧是真的，他就该走到门前——
       * 所以这里留着那道分流。南山不是，可这条路不是为南山写的。
       */
      'came-back': {
        id: 'came-back',
        onEnter: [{ type: 'time', days: 6 }],
        blocks: [],
        branches: [{ requires: [{ flag: { key: 'found-the-way' } }], next: 'seek:door' }],
        next: 'again',
      },

      /**
       * 什么也没找到。
       *
       * 这一卷写的就是用户点名的那条完整人生的末一段：
       * 想弄明白 → 找了三年 → 什么都没找到 → 觉得这些只是传说。
       *
       * **不写惋惜。** 他没有失败，他只是长大了。
       * 念头那一层会读 `came-up-empty` 把「想弄明白」压下去，
       * 换上「过日子」——那也是一种活法。
       */
      empty: {
        id: 'empty',
        blocks: [
          { kind: 'narration', text: '你把这些年跑过的地方在心里数了一遍。' },
          { kind: 'narration', text: '没有一件对得上。' },
          { kind: 'narration', text: '镇上说书的那一段，你现在听着也就是一段书。' },
          {
            kind: 'narration',
            text: '你没有跟谁说过这件事，所以也不用跟谁交代。',
            tone: 'faint',
          },
        ],
      },

      'gave-up': {
        id: 'gave-up',
        blocks: [
          { kind: 'narration', text: '农忙起来，你就没再往外跑了。' },
          {
            kind: 'narration',
            text: '不过听见有人说起那种事，你还是会站住脚。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 打听。
   *
   * 这一卷可以反复发生——**找这件事本来就是一年一年地问**。
   */
  'seek:asking': {
    id: 'seek:asking',
    title: '打听',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        blocks: [
          { kind: 'narration', text: '这一年你逢人就绕着弯问。' },
          { kind: 'narration', text: '问得小心，怕人当你疯了。' },
        ],
        choices: [
          {
            id: 'ask',
            label: '接着问',
            hint: '耗 一月',
            echo: '你又问了一圈。',
            effects: [
              { type: 'time', months: 1 },
              { type: 'attribute', key: 'insight', delta: 1 },
              { type: 'ask-around' },
            ],
            next: null,
          },
          {
            /**
             * 不问了。
             *
             * 这一条不写惋惜——**大多数人问了两年就不问了**，
             * 而那没有任何不对。
             */
            id: 'stop',
            label: '算了',
            echo: '你没有再问。',
            effects: [
              { type: 'time', days: 3 },
              { type: 'flag', key: 'stopped-asking', value: true },
            ],
            next: 'stopped',
          },
        ],
      },

      stopped: {
        id: 'stopped',
        blocks: [
          { kind: 'narration', text: '问了这些年，听来的没有一件对得上。' },
          { kind: 'narration', text: '你不再逢人就问了。' },
          {
            kind: 'narration',
            text: '不过听见有人说起那种事，你还是会站住脚。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 有两个不相干的人说了同一件事。
   *
   * **这是玩家唯一能用的工具。** 他分不出真假，可他数得清有几个人
   * 说了同一处地方——而假消息是各说各的，真消息会撞在一起。
   *
   * 这不是保证：说书人那一段和卖符的那一段也可能凑巧撞上。
   */
  'seek:crossed': {
    id: 'seek:crossed',
    title: '对上了',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 5 }],
        blocks: [
          { kind: 'narration', text: '有天夜里你把听来的那些话在心里排了一遍。' },
          { kind: 'event', text: '有两个人说的是同一个地方。', tone: 'deep' },
          { kind: 'narration', text: '他们互相不认得，也没有见过面。' },
          { kind: 'narration', text: '你一夜没睡好。' },
        ],
        choices: [
          {
            id: 'go',
            label: '跑一趟',
            critical: true,
            hint: '少说十几日',
            echo: '你收拾了两件衣裳就上路了。',
            effects: [
              { type: 'time', days: 12 },
              { type: 'household', standing: -2 },
              { type: 'follow' },
            ],
            next: 'after',
          },
          {
            id: 'later',
            label: '再等等',
            echo: '你想着等农闲了再说。',
            effects: [
              { type: 'time', months: 4 },
              { type: 'flag', key: 'kept-waiting', value: true },
            ],
            next: 'waited',
          },
        ],
      },

      after: {
        id: 'after',
        onEnter: [{ type: 'time', days: 10 }],
        blocks: [],
        branches: [{ requires: [{ flag: { key: 'found-the-way' } }], next: 'seek:door' }],
        next: 'home',
      },

      home: {
        id: 'home',
        blocks: [
          { kind: 'narration', text: '你回来了。家里问你去哪儿了，你说去看个亲戚。' },
          { kind: 'narration', text: '那几件衣裳磨破了一件。', tone: 'faint' },
        ],
      },

      /**
       * 再等等。
       *
       * 等是最常见的那一种。**而等着等着，那件事就淡了。**
       */
      waited: {
        id: 'waited',
        blocks: [
          { kind: 'narration', text: '农闲的时候家里又有别的事。' },
          { kind: 'narration', text: '这一等就是大半年。' },
          {
            kind: 'narration',
            text: '后来你还想着那件事，只是不像刚听说那阵子那么急了。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 站在门前。
   *
   * ## 收不收，他永远不知道是凭什么
   *
   * 那个人看了他一眼，让他把手伸出来，两根指头搭在腕子上停了两息，
   * 然后说了一句话——**而那句话他听不懂**。
   *
   * 引擎这边看的是 `root`：那个数在他出生那一刻就定了，
   * 跟出身、跟努力、跟他有多想都没有关系。
   * **王府的孩子和农户的孩子在这一掷上平等**，
   * 而两个人谁也不知道自己那一个数是多少。
   */
  'seek:door': {
    id: 'seek:door',
    title: '门前',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        blocks: [
          { kind: 'narration', text: '那个人站在三步开外，等你说话。' },
          { kind: 'narration', text: '你想过很多回这一刻要说什么。一句也想不起来了。' },
        ],
        choices: [
          {
            id: 'enter',
            label: '说你是来找他们的',
            critical: true,
            echo: '你说了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'knock', enter: true },
            ],
            next: 'after',
          },
          {
            /**
             * 说自己只是路过。
             *
             * **走到这一步的人里，真有一部分会这么说。**
             * 不是因为怕，也不是因为不想——他们自己也说不清。
             */
            id: 'pass',
            label: '说你只是路过',
            echo: '你说你只是路过。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'knock', enter: false },
            ],
            next: 'after',
          },
        ],
      },

      after: {
        id: 'after',
        onEnter: [{ type: 'time', months: 1 }],
        blocks: [],
        branches: [
          { requires: [{ flag: { key: 'was-taken-in' } }], next: 'taken' },
          { requires: [{ flag: { key: 'was-turned-down' } }], next: 'turned' },
        ],
        next: 'walked',
      },

      taken: {
        id: 'taken',
        onEnter: [
          { type: 'identity', identity: '门下' },
          { type: 'chronicle', text: '你跟着那个人上了山。', tone: 'cinnabar' },
        ],
        blocks: [
          {
            kind: 'narration',
            text: '此后的事，是另一段人生了。',
            tone: 'deep',
          },
        ],
      },

      turned: {
        id: 'turned',
        onEnter: [{ type: 'chronicle', text: '你找到了那座山，人家没有收你。', tone: 'deep' }],
        blocks: [
          { kind: 'narration', text: '你在山下的镇子住了半个月才动身回家。' },
          { kind: 'narration', text: '路上你把那两根指头搭在腕子上的两息想了很多遍。' },
          {
            kind: 'narration',
            text: '你这辈子都没弄明白他摸的是什么。',
            tone: 'deep',
          },
        ],
      },

      walked: {
        id: 'walked',
        onEnter: [{ type: 'chronicle', text: '你走到了那座山下，然后回来了。', tone: 'deep' }],
        blocks: [
          { kind: 'narration', text: '回来以后你还是照常过日子。' },
          {
            kind: 'narration',
            text: '偶尔夜里醒着，你会想那天要是换一句话说，会怎么样。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

/**
 * 什么时候会走到这几卷。
 *
 * **入场只看念头到了哪一档，不看资质。** 一个天生资质极好、
 * 却从没听说过修士的人，这几卷一辈子碰不上。
 */
export const seekingEvents: readonly LifeEvent[] = [
  {
    /**
     * 村口来了个外乡商旅。
     *
     * **入场不看念头**——这是一件寻常事，谁都碰得上。
     * 念头改变的是他站在这儿看得见几条路，不是这件事发不发生。
     *
     * 要求 `schooled` 之类的一概不写：四个去处各自带着自己的门槛，
     * 门槛写在去处上，不写在事件上。
     */
    id: 'seek-errand',
    window: { from: 11, to: 15 },
    requires: [{ knowledge: 'cultivators-exist' }],
    scene: 'seek:errand',
    weight: 9,
    repeatable: true,
  },
  {
    id: 'seek-asking',
    window: { from: 12, to: 16 },
    // 「想弄明白」攒到了「反复」那一档，他才会开口问。
    // 这是他自己的行动，所以看念头是合法的——世界并没有为他改变什么
    requires: [{ knowledge: 'cultivators-exist' }, { flag: { key: 'leaning:know' } }],
    scene: 'seek:asking',
    weight: 10,
    repeatable: true,
  },
  {
    id: 'seek-crossed',
    window: { from: 13, to: 16 },
    requires: [{ flag: { key: 'leads-crossed' } }],
    scene: 'seek:crossed',
    weight: 12,
  },
]
