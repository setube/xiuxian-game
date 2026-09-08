import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 那一点热，后来怎么样了。
 *
 * ## 这一册补的是一个真实的空洞
 *
 * `attempt.ts` 里三成的人「觉出了一点什么」——胸口一点热，很轻，
 * 一会儿就没了。那一节落下两样东西：
 *
 *     flag: felt-something      他觉出过
 *     knowledge: that-warmth    「那一点热」这条认知
 *
 * **然后全库没有一处读它们。** 一个人这辈子唯一一次碰到修行的边，
 * 就此再没有任何事情因此不同——这不是「到此收住」，是断了。
 *
 * （查证：`grep felt-something src/ scripts/` 除 `attempt.ts` 外零命中。）
 *
 * ## 它写的是什么
 *
 * 不是「继续修炼」。是**一个人揣着一件说不清的事过了很多年**。
 *
 * 27.md 拍板的那一条在这儿落地：
 *
 * > **「修仙以后，你还是那个人。」** 只是人生多了一条力量体系，
 * > 不是「进入修仙 UI，以前的世界全部失效」。
 *
 * 所以这一册里他照旧种地、照旧娶亲、照旧送走爹娘。变的只有一样：
 * **夜里睡不着的时候，他会想起那个清早。**
 *
 * ## 三条不做
 *
 * 一、**不做境界。** 他连门都没进，没人有资格给他划一层。
 * 二、**不做功法进度。** 没有「熟练度」「进度条」——他不知道自己在哪儿，
 *     这正是这件事的样子。
 * 三、**不做「坚持就有回报」。** 再试的人多数还是什么也没有，
 *     而那不是惩罚，那是这个世界的实情。
 *
 * ## 公开度：真实存在但极少公开（27.md 拍板）
 *
 * 所以这一册里他**没有人可说**。跟妻子说不出口，跟郎中说不清楚，
 * 跟识字的先生说了对方只当他做梦。**那份说不出口本身就是内容。**
 */

/** 又坐下来试那件事，在 `character.undertakings` 里的 id。跟 `attempt.ts` 同一个 */
const PRACTISING = 'practising'

export const afterwardsScenes: SceneLibrary = {
  /**
   * 隔了几年，他又坐下来试了一次。
   *
   * 起头是**夜里睡不着**，不是「决定继续修行」。他没有那个词，
   * 也没有那个念头——他只是想再确认一次那件事是不是真的。
   */
  'afterwards:again': {
    id: 'afterwards:again',
    title: '那一点热',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', months: 3 }],
        blocks: [
          { kind: 'narration', text: '那年之后又过了几年。日子照旧。' },
          {
            kind: 'narration',
            text: '有一夜你睡不着，忽然想起那个清早胸口那一点热。',
          },
          { kind: 'narration', text: '你已经记不清是哪一年了，可是那个感觉还记得。' },
        ],
        choices: [
          {
            /*
             * 读得懂书的人才谈得上「照着做」。
             *
             * `read-the-book` 那面旗是 `attempt.ts` 落的（识字的人才翻得动那册书），
             * **而在这一册之前全库没有一处读它**——判据 `scripts/afterwards.ts`
             * 第一条一次抓到两面无人读的旗，这是其中一面。
             *
             * 它在这儿的用处很实：**不识字的人手里那册书是一堆看不懂的符号**，
             * 他没法「再照着坐一次」，他只能凭记忆瞎试。两条路的正文不一样。
             */
            id: 'try',
            label: '把书翻出来，再坐一次',
            hint: '你想知道那件事是不是真的',
            requires: [{ flag: { key: 'read-the-book', equals: true } }],
            echo: '你把书翻了出来。',
            effects: [
              { type: 'undertake', undertaking: PRACTISING },
              { type: 'time', months: 8 },
            ],
            next: 'sat',
          },
          {
            /**
             * 不识字的那一路。
             *
             * 书在箱底，可他看不懂。**他只能凭那年记住的样子瞎坐**——
             * 而这一条不是「简化版」，它是另一种处境：
             * 一个人连自己在做什么都说不清楚，还在做。
             */
            id: 'try-blind',
            label: '照着记忆里的样子坐',
            hint: '书上的字你认不全，可那年的姿势还记得',
            requires: [{ flag: { key: 'read-the-book', equals: false } }],
            echo: '你照着记忆里的样子坐了下来。',
            effects: [
              { type: 'undertake', undertaking: PRACTISING },
              { type: 'time', months: 8 },
            ],
            next: 'sat',
          },
          {
            id: 'let-it-be',
            label: '躺着想了很久，天亮了',
            hint: '明天还有明天的事',
            critical: true,
            echo: '你躺着想了很久。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'flag', key: 'let-the-warmth-go', value: true },
            ],
            next: 'let-go',
          },
        ],
      },

      /**
       * 又坐了大半年。
       *
       * **掷的是「这一次有没有」，而不是「进步了多少」。**
       * 一成再觉出，九成什么也没有——比头一回还低，
       * 因为头一回那次多半本来就是错觉。
       *
       * 这个数不是难度设计，是这一册的立场：
       * **他没有在变强，他只是在确认一件事。**
       */
      sat: {
        id: 'sat',
        onEnter: [
          {
            type: 'roll',
            key: 'second-attempt',
            among: [
              { value: 'nothing', weight: 90 },
              { value: 'again', weight: 10 },
            ],
          },
        ],
        blocks: [
          { kind: 'narration', text: '入秋之后你每天早起半个时辰，照着书上说的坐。' },
          { kind: 'narration', text: '家里人问你怎么醒得那么早，你说睡不着。' },
        ],
        branches: [
          { requires: [{ flag: { key: 'second-attempt', equals: 'again' } }], next: 'came-back' },
        ],
        next: 'nothing-again',
      },

      /**
       * 又来了一次。
       *
       * 这一节是这一册唯一「往前走了一步」的地方，而它走的这一步
       * 小得几乎看不见：**他现在确定那不是错觉了。**
       *
       * 不给境界、不给功法、不开宗门——它只落一样东西：
       * 一条改了口径的认知。从前那条写着「你不确定那是什么」，
       * 现在他确定它是真的，**仍然不知道它是什么**。
       */
      'came-back': {
        id: 'came-back',
        onEnter: [
          { type: 'undertake', undertaking: PRACTISING, done: true },
          { type: 'flag', key: 'warmth-came-back', value: true },
          {
            type: 'knowledge',
            id: 'that-warmth',
            title: '那一点热',
            summary: '它又来了一次。你现在确定那不是错觉——可你仍然不知道那是什么。',
            contact: '亲历',
            category: '修行',
            interpretation: '确信',
          },
          { type: 'chronicle', text: '那一点热又来了一次。你确定它是真的。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '腊月里的一个清早，它又来了。' },
          { kind: 'event', text: '这一次比上回久一些。你睁着眼，一动不敢动。', tone: 'deep' },
          { kind: 'narration', text: '过去以后你坐在炕沿上，手心全是汗。' },
          {
            kind: 'narration',
            text: '你想找个人说说这件事，想了一圈，没有人可说。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 什么也没有。
       *
       * 九成的人落在这儿——而**这一节写得比上一节厚**，是有意的：
       * 这是多数人的结局，它不该比稀有的那一路薄。
       */
      'nothing-again': {
        id: 'nothing-again',
        onEnter: [
          { type: 'undertake', undertaking: PRACTISING, done: true },
          { type: 'flag', key: 'warmth-never-again', value: true },
          { type: 'chronicle', text: '那一年你又试了半年，什么也没有。' },
        ],
        blocks: [
          { kind: 'narration', text: '坐了整整一个冬天，什么也没有。' },
          { kind: 'narration', text: '开春以后你把书收回箱底，日子照旧过。' },
          {
            kind: 'narration',
            text: '有时候你会怀疑那年清早那一下究竟有没有发生过。',
            tone: 'faint',
          },
          {
            kind: 'narration',
            text: '可是你记得那天的天色，记得窗纸的颜色。那种事记不错。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 没再试。
       *
       * 这一节跟上面两节是同一层的结局，不是「放弃」。
       * 一个有家有口的人夜里想起一件说不清的事，第二天照旧下地——
       * **那是这个世界里最常见的反应，也是最真实的一种。**
       */
      'let-go': {
        id: 'let-go',
        onEnter: [{ type: 'chronicle', text: '那件事你再没提起过。' }],
        blocks: [
          { kind: 'narration', text: '天亮了。你起来喂了鸡，那件事就过去了。' },
          { kind: 'narration', text: '后来偶尔想起，也只是想起，不再打算做什么。' },
          {
            kind: 'narration',
            text: '你有时候会想，要是那年接着坐下去，会不会不一样。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 老了之后想起那件事。
   *
   * 这一卷跟上一卷是两回事：上一卷是「他还想再试」，
   * 这一卷是**他已经不打算试了，只是把这件事想清楚了**。
   *
   * 它是这一册的收尾，也是 27.md 那条「你还是那个人」最实的落点——
   * **一辈子过完了，那件事仍然没有答案，而他已经不需要答案了。**
   */
  'afterwards:late': {
    id: 'afterwards:late',
    title: '那件事',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', months: 6 }],
        blocks: [
          { kind: 'narration', text: '你上了年纪，坐着的时候比走动的时候多。' },
          { kind: 'narration', text: '有一天晒着太阳，你忽然又想起那件事。' },
        ],
        branches: [
          {
            requires: [{ flag: { key: 'warmth-came-back', equals: true } }],
            next: 'twice',
          },
        ],
        next: 'once',
      },

      /**
       * 只有过一次。
       *
       * 他到死也不知道那是什么，**而这一节不给他答案**——
       * 给了就等于世界替他兜了底，而这一册的立场恰恰相反。
       */
      once: {
        id: 'once',
        onEnter: [
          { type: 'chronicle', text: '你到老也没弄明白那一年清早是怎么回事。', tone: 'faint' },
        ],
        blocks: [
          { kind: 'narration', text: '那年清早那一下，一辈子只有过那一次。' },
          { kind: 'narration', text: '你想不出它是什么。想了几十年，还是想不出。' },
          {
            kind: 'narration',
            text: '有时候你觉得那只是年轻时候身子好，坐久了岔了气。',
            tone: 'faint',
          },
          { kind: 'narration', text: '有时候你又不那么想。', tone: 'faint' },
        ],
      },

      /**
       * 来过两次。
       *
       * 他确定那件事是真的，**而这反而更难受**：
       * 真的存在，可他这辈子就摸到了那么两下，此后再没有过。
       */
      twice: {
        id: 'twice',
        onEnter: [
          { type: 'chronicle', text: '你知道那件事是真的，可你这辈子只碰到过两次。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '你确定那件事是真的——它来过两次。' },
          { kind: 'narration', text: '可是这几十年再没有过。你想不明白差在哪儿。' },
          {
            kind: 'narration',
            text: '书还在箱底。你有时候摸出来看看，字还是那些字。',
            tone: 'faint',
          },
          {
            kind: 'narration',
            text: '你想过找人问问，可是这么多年，你连一个能问的人都没遇上。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

export const afterwardsEvents: readonly LifeEvent[] = [
  {
    /**
     * 隔了几年又想起那件事。
     *
     * 三条 requires 把它锁在一小撮人身上：
     *
     *   觉出过　　　`flag felt-something`——这一卷的全部前提
     *   还没了结　　`flag let-the-warmth-go` 不成立、`warmth-never-again` 不成立
     *   没在做别的　`undertaking not: practising`
     *
     * `window` 从二十二起：`attempt` 那一卷最早十六岁，
     * 中间要隔几年才谈得上「又想起」。
     */
    id: 'afterwards-again',
    window: { from: 22, to: 55 },
    requires: [
      { flag: { key: 'felt-something', equals: true } },
      { flag: { key: 'let-the-warmth-go', equals: false } },
      { flag: { key: 'warmth-never-again', equals: false } },
      { flag: { key: 'warmth-came-back', equals: false } },
      { undertaking: { not: PRACTISING } },
      { undertaking: { not: 'mourning' } },
    ],
    scene: 'afterwards:again',
    weight: 14,
  },
  {
    /**
     * 老了之后想起那件事。
     *
     * 不问「有没有再试过」——**试过的和没试过的都会想起它**，
     * 只是想起的内容不同（`branches` 按 `warmth-came-back` 分岔）。
     *
     * 五十五起：这一卷说的是「一辈子过完了」，不是中年回顾。
     */
    id: 'afterwards-late',
    window: { from: 55, to: 90 },
    requires: [
      { flag: { key: 'felt-something', equals: true } },
      { undertaking: { not: PRACTISING } },
    ],
    scene: 'afterwards:late',
    weight: 12,
  },
]
