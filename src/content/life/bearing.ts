import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 添丁：等着的那几年。
 *
 * 这一册跟 `match.ts`（一门亲事）是同一个立场的第二次落地：
 *
 * > **这个时代里最要紧的那几件事，都不由一个人说了算。**
 *
 * ## 从前它是一个选项
 *
 * `routine.ts` 里「添个孩子」：选中 → 一年过去 → 屋里多了个孩子。
 * 选了就有，没有一次落空。
 *
 * 而这一条写的是**这个人想不想要孩子**，不是**这个人有没有孩子**——
 * 两件事在这个时代里差着十万八千里。无子是七出之一，
 * 求子要去庙里、要吃药、要过继，而这些事之所以存在，
 * 正是因为**想要并不等于有**。
 *
 * ## 它做什么
 *
 * 拆开那一年，让它有几种结局：
 *
 *     等着 → 有了 → 生了 → 孩子活下来
 *                 → 生了 → 没活下来
 *          → 一直没有
 *
 * ## 护栏：这一册不是惨剧机器
 *
 * 用户拍板原文（`_施工决议`）：
 *
 * > 生育：允许，写实，不猎奇。作为**人生与家庭后果**做。
 * > 「保大/保小」**不能是作者预设的戏剧按钮**——必须先问
 * > 「当时到底有没有这个现实选择」。
 *
 * 所以这一册里**没有「保大保小」那一节**。不是因为难产不存在，
 * 是因为一个农家在自己屋里生孩子，**根本没有那个选择摆在面前**：
 * 产婆尽力，然后听天由命。摆一个二选一按钮出来，
 * 等于凭空发明了一种这个时代不存在的权力。
 *
 * 同样地，风险不是每次现掷一个吓人的数。它跟年龄挂钩（`window` 分两段），
 * 跟家境挂钩（`standing` 差的人家更容易出事），
 * **而不是每次怀孕都请玩家看一次生死骰子。**
 *
 * ## 三处跟别的册子对得上的地方
 *
 * 一、**走 `meet` 效果造人**，不直接调 store。`effects.ts` 的 `meet` 分支里
 *     有一段会把 `bond` 为「子」或「女」的人连到 `kinOf('配偶')`——
 *     绕过去的话孩子在世系图上只连着一个人，线从我脚底单独垂下来。
 *
 * 二、**过程中状态**：`expecting` 这件事从有了到生下来一直在进行。
 *     它跟议亲、服丧一样，**由真实事件结束，不会自己到期**。
 *
 * 三、**没有孩子照样记年表**。跟退亲那一节同一条纪律：
 *     「这些年一直没有动静」是这个人一生里真发生过的事。
 */

/** 怀着这件事在 `character.undertakings` 里的 id */
const EXPECTING = 'expecting'

export const bearingScenes: SceneLibrary = {
  /**
   * 这几年家里在等一个孩子。
   *
   * 起头不是玩家「决定生育」，是**时间自己在走**——成了亲，
   * 于是家里人开始等，等的过程本身就是这一卷。
   */
  'bearing:await': {
    id: 'bearing:await',
    title: '添丁',
    entry: 'waiting',
    nodes: {
      waiting: {
        id: 'waiting',
        onEnter: [
          { type: 'time', months: 8 },
          { type: 'undertake', undertaking: EXPECTING },
        ],
        blocks: [
          { kind: 'narration', text: '成亲之后，家里就开始等了。' },
          { kind: 'narration', text: '{elder}没有明说，可是话里话外总绕到这上头。' },
        ],
        /*
         * 掷的是「这几年有没有动静」——掷在下一节，不在这儿。
         *
         * 七成有。这个数不是配平出来的，是照常情定的：多数人家成亲之后
         * 几年内会有孩子，而**那三成也真实存在**，且正是求子、过继、
         * 纳妾那一整套事情之所以有的原因。
         *
         * 掷一次管这一卷，不是每年掷一次——用户那条护栏说的正是这个：
         * **不要每次怀孕掷骰子。**
         */
        next: 'roll',
      },

      roll: {
        id: 'roll',
        onEnter: [
          {
            type: 'roll',
            key: 'with-child',
            among: [
              { value: '有', weight: 70 },
              { value: '无', weight: 30 },
            ],
          },
        ],
        blocks: [],
        branches: [{ requires: [{ flag: { key: 'with-child', equals: '无' } }], next: 'barren' }],
        next: 'coming',
      },

      /**
       * 有了。
       *
       * 这一节故意写得平——**这个时代里怀孕不是一件需要大惊小怪的事**，
       * 它是一家人早就在等的那件事终于来了。
       */
      coming: {
        id: 'coming',
        onEnter: [
          { type: 'time', months: 9 },
          { type: 'chronicle', text: '家里要添人口了。' },
        ],
        blocks: [
          { kind: 'narration', text: '入夏的时候看出来了。{elder}把话挑明了说，脸上没绷住。' },
          { kind: 'narration', text: '这几个月家里的活她少做了些，旁人也不说什么。' },
        ],
        next: 'birth',
      },

      /**
       * 生。
       *
       * 掷的是孩子有没有活下来。**这一掷玩家看不见，也没得选**——
       * 这正是用户那条护栏的意思：一个农家在自己屋里生孩子，
       * 面前没有任何按钮。产婆尽力，然后听天由命。
       *
       * 八成活。这个数照的是「多数孩子活下来了」这个事实，
       * 而**那两成不是为了让玩家难过**，是因为这个时代的人
       * 谈起自己有几个孩子时，说的往往是「生了五个，活了三个」。
       */
      birth: {
        id: 'birth',
        onEnter: [
          {
            type: 'roll',
            key: 'newborn-lives',
            among: [
              { value: '活', weight: 80 },
              { value: '殁', weight: 20 },
            ],
          },
          {
            type: 'roll',
            key: 'newborn-sex',
            among: [
              { value: '男', weight: 50 },
              { value: '女', weight: 50 },
            ],
          },
          { type: 'undertake', undertaking: EXPECTING, done: true },
          { type: 'household', standing: -4 },
        ],
        blocks: [{ kind: 'narration', text: '生那一夜，产婆是隔壁村请来的，天亮才走。' }],
        branches: [
          { requires: [{ flag: { key: 'newborn-lives', equals: '殁' } }], next: 'lost' },
          { requires: [{ flag: { key: 'newborn-sex', equals: '女' } }], next: 'daughter' },
        ],
        next: 'son',
      },

      son: {
        id: 'son',
        onEnter: [
          {
            type: 'meet',
            id: 'son',
            calls: '孩子',
            delta: 25,
            name: true,
            who: { given: '安', gender: '男', age: 0 },
            bond: '子',
          },
          { type: 'chronicle', text: '你有了个儿子。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '是个男孩。' },
          { kind: 'narration', text: '头三天他一直闭着眼。{elder}守了三夜没敢睡。' },
        ],
      },

      daughter: {
        id: 'daughter',
        onEnter: [
          {
            type: 'meet',
            id: 'daughter',
            calls: '孩子',
            delta: 25,
            name: true,
            who: { given: '宁', gender: '女', age: 0 },
            bond: '女',
          },
          { type: 'chronicle', text: '你有了个女儿。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '是个女孩。' },
          { kind: 'narration', text: '头三天她一直闭着眼。{elder}守了三夜没敢睡。' },
        ],
      },

      /**
       * 没活下来。
       *
       * 这一节写得短，而且**不给任何属性、不给任何旗标**——
       * 它不改变这个人的能力，也不解锁任何后续。
       *
       * 这是有意的：把它接上一串效果，就等于说这件事「有用」。
       * 它没有用。它只是发生了，然后这家人接着过日子——
       * **而那正是这件事在那个时代里的样子。**
       *
       * 年表记一笔。跟退亲那一节同一条纪律：这是这个人一生里真发生过的事。
       */
      lost: {
        id: 'lost',
        onEnter: [{ type: 'chronicle', text: '那个孩子没有留住。', tone: 'deep' }],
        blocks: [
          { kind: 'narration', text: '孩子没有哭。' },
          { kind: 'narration', text: '产婆没说话，把东西收了收就走了。' },
          { kind: 'narration', text: '那几天家里很静。后来谁也没有再提。', tone: 'faint' },
        ],
      },

      /**
       * 一直没有。
       *
       * **这一节跟生下来是同一层的结局，不是失败分支。**
       *
       * 它落一个旗标，因为「无子」在这个时代里是有后果的——
       * 过继、纳妾、被休，都从这里长出来。**眼下那些内容一样也没有**，
       * 而这个旗标就是留给它们的接口：等哪一卷真要问「他有没有子嗣」，
       * 它已经在那儿了。
       */
      barren: {
        id: 'barren',
        onEnter: [
          { type: 'time', years: 4 },
          { type: 'flag', key: 'no-issue', value: true },
          { type: 'chronicle', text: '这些年家里一直没有动静。' },
        ],
        blocks: [
          { kind: 'narration', text: '头两年没人说什么。' },
          { kind: 'narration', text: '第三年上，{elder}托人求了个方子，苦得很，喝了小半年。' },
          { kind: 'narration', text: '后来那话在家里就不提了，可是谁都记着。', tone: 'faint' },
        ],
      },
    },
  },
}

export const bearingEvents: readonly LifeEvent[] = [
  {
    /**
     * 家里在等一个孩子。
     *
     * 三条 requires：
     *
     *   成了亲　　　`bond 配偶 alive:true`——这一卷的前提是有个家
     *   没在等着　　`undertaking not:expecting`——一胎没落地不会再起一卷
     *   还没有孩子　`bond 子 alive:false` + `bond 女 alive:false`
     *
     * 末一条是**明写的将就**，跟 `routine.ts` 那一节同一处限制：
     * `meet.id` 是剧本里写死的字串，同一个 id 只造一次，
     * 所以这一卷一辈子最多演两回（一儿一女）。
     * 「生第三个」要等到有内容真的非它不可的那一天。
     *
     * 上限四十五不是「四十五以后生不了」，是**这一卷写的是常态**。
     */
    id: 'bearing-await',
    window: { from: 18, to: 45 },
    requires: [
      { bond: { kind: '配偶', alive: true } },
      { undertaking: { not: EXPECTING } },
      { undertaking: { not: 'mourning' } },
      { bond: { kind: '子', alive: false } },
      { bond: { kind: '女', alive: false } },
    ],
    scene: 'bearing:await',
    weight: 10,
  },
]
