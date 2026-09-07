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
          { kind: 'narration', text: '那家姓秦，也是种地的，隔着两个村，田比你家多两亩。' },
          { kind: 'event', text: '有人来给你说亲。' },
        ],
        /*
         * 家里有长辈的，这门亲先过他们那一关——不是玩家点头就算数。
         * 一个人也没有的，这一节直接落到「你自己拿主意」，
         * 而那本身就是孤儿那一路的样子：没有人替你张罗，也没有人拦着你。
         */
        branches: [
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
        ],        choices: [
          {
            id: 'agree',
            label: '你说，家里定就是了',
            hint: '这门亲由长辈做主',
            echo: '你说，家里定就是了。',
            effects: [
              { type: 'time', months: 4 },
              { type: 'flag', key: 'match-deferred-to-elders', value: true },
            ],
            next: 'settled',
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
        branches: [{ requires: [{ gender: '女' }], next: 'husband' }],
        next: 'wife',
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
            who: { surname: '秦', given: '娘', gender: '女', age: 18, doing: '操持家务' },
            bond: '配偶',
          },
          { type: 'chronicle', text: '你成了亲。', tone: 'deep' },
        ],
        blocks: [{ kind: 'narration', text: '她话不多，手脚很快。' }],
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
          { type: 'chronicle', text: '你成了亲。', tone: 'deep' },
        ],
        blocks: [{ kind: 'narration', text: '他话不多，天不亮就出门。' }],
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
      { standing: { atLeast: 20 } },
    ],
    scene: 'match:offer',
    weight: 8,
  },
]
