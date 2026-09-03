import type { LifeEvent, SceneLibrary } from '@/types/game'

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
export const seekingScenes: SceneLibrary = {
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
