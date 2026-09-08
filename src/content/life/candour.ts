import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 一件小事上，你说了不是实话。
 *
 * ## 这一册是「习惯形成」的第一个使用者
 *
 * 5/7/8 三份文档共同指向一个缺口（`_人格与关系方案.md`）：
 *
 * ```
 * 第一次骗人 → 愧疚      第二次 → 还是愧疚
 * 十次之后 → 觉得骗人没什么      多年之后 → 已经习惯性撒谎
 * ```
 *
 * 而那份方案自己写着这一梯队**不宜单独施工**，理由是：
 *
 * > 习惯形成需要**有反复做的事**——现在长尾日常有了，
 * > 但可反复的道德性行为（骗、偷、救、背）还没写
 *
 * 查证（2026-09-08）：`grep 撒谎|骗|偷|赌|救人|背叛 src/content/life/` **零命中**。
 * 那句话今天仍然成立。
 *
 * **所以这一册先做那个前置**：一件真会反复发生的小事，落一笔可以被累加的痕迹。
 * 痕迹落在行为史（`Deed`，`character.deeds`）：每说一回追加一笔，「做过几次」数出来。
 *
 * ## 习惯形成落在哪
 *
 * 不落在数字上，落在**同一件事的正文变了**（`after-lie` 那一节）：
 *
 *     前三回　　那天晚上你睡得比平常晚一点。第二天你绕开了那个人。
 *     第四回起　你转身去做别的事了。那天晚上你睡得跟平常一样。
 *
 * 引擎不说「你变了」，玩家自己发现那天晚上睡得跟平常一样。
 * 阈值四是按实测定的（见下面 `WORN`），不是「十次」——十次太稀，多数人一辈子到不了。
 *
 * ## 为什么是「说了不是实话」
 *
 * 挑它不是因为它戏剧性强，恰恰因为它**平常**：
 *
 * - 它不需要任何前提（不像偷要有东西可偷、救要有人落难）
 * - 它在任何出身、任何年纪、任何一种日子里都可能发生
 * - **它小到玩家第一次做的时候不会觉得自己在做一个道德选择**
 *
 * 而那正是 8.md 要的那句话的条件：
 *
 * > 玩家一直觉得自己是好人……到最后回头看：
 * > **「我究竟是什么时候变成这样的？」**
 *
 * 一件从一开始就写着「这是撒谎」的事产生不了那个效果。
 *
 * ## 三条不做
 *
 * 一、**不做善恶值。** 这一册只记「做过几次」，不记「你是好人还是坏人」——
 *     那个判断该由玩家自己在回头看的时候做出来。
 * 二、**不做即时惩罚。** 撒了谎不掉属性、不掉家境。多数谎话没有后果，
 *     **而那正是它会变成习惯的原因**。
 * 三、**不写「你感到愧疚」。** 心理描写留给玩家。正文只写他做了什么、
 *     以及那件事在他身上留下了什么痕迹（手心出汗、第二天绕开那个人）。
 */

/**
 * 磨平了：说不是实话这件事，做到第几回起不再留痕迹。
 *
 * 这一卷一世演 1–15 回、中位 6（`chance: 0.25` 下 80 世实测，2026-09-08，数行为史笔数），
 * 玩家还不是回回都选那一条：随机选的 80 世里到了第四回的 37 世。
 * 取四：一半上下的人这辈子到得了，又不是第二回就麻木。它是内容定的一个数，
 * 不是引擎里的「习惯阈值」——别的事该几回，等那一卷自己量。
 */
const WORN = { deeds: { kind: 'lie', atLeast: 4 } } as const

export const candourScenes: SceneLibrary = {
  /**
   * 有人问了一句，你顺口答了不是实话。
   *
   * 三个不同的场合，掷中哪个由 `roll` 定——**同一件事在不同处境里
   * 不是同一件事**，而这一册要的正是「它反复发生」。
   */
  'candour:small': {
    id: 'candour:small',
    title: '一句话',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          {
            type: 'roll',
            key: 'lie-occasion',
            among: [
              { value: 'money', weight: 40 },
              { value: 'whereabouts', weight: 35 },
              { value: 'blame', weight: 25 },
            ],
          },
        ],
        blocks: [],
        branches: [
          { requires: [{ flag: { key: 'lie-occasion', equals: 'whereabouts' } }], next: 'where' },
          { requires: [{ flag: { key: 'lie-occasion', equals: 'blame' } }], next: 'blame' },
        ],
        next: 'money',
      },

      /** 钱上的事。最常见的那一种 */
      money: {
        id: 'money',
        blocks: [
          { kind: 'narration', text: '{elder}问你那笔钱花在哪儿了。' },
          { kind: 'narration', text: '其实有一半你自己留下了。' },
        ],
        choices: [
          {
            id: 'lie',
            label: '你说都花完了',
            hint: '这话说出口比你想的容易',
            echo: '你说都花完了。',
            effects: [
              { type: 'deed', kind: 'lie', text: '{elder}问那笔钱花在哪儿了，你说都花完了。' },
              { type: 'time', months: 2 },
            ],
            next: 'after-lie',
          },
          {
            id: 'truth',
            label: '你说留了一半',
            echo: '你说留了一半。',
            effects: [
              { type: 'deed', kind: 'truth', text: '{elder}问那笔钱花在哪儿了，你说留了一半。' },
              { type: 'time', months: 2 },
            ],
            next: 'after-truth',
          },
        ],
      },

      /** 去过哪儿 */
      where: {
        id: 'where',
        blocks: [
          { kind: 'narration', text: '有人问起你昨天下午去了哪儿。' },
          { kind: 'narration', text: '那个地方你不太想说。' },
        ],
        choices: [
          {
            id: 'lie',
            label: '你说在家',
            hint: '没有人会去查',
            echo: '你说在家。',
            effects: [
              { type: 'deed', kind: 'lie', text: '有人问你昨天下午去了哪儿，你说在家。' },
              { type: 'time', months: 2 },
            ],
            next: 'after-lie',
          },
          {
            id: 'truth',
            label: '你照实说了',
            echo: '你照实说了。',
            effects: [
              { type: 'deed', kind: 'truth', text: '有人问你昨天下午去了哪儿，你照实说了。' },
              { type: 'time', months: 2 },
            ],
            next: 'after-truth',
          },
        ],
      },

      /**
       * 事情办砸了，有人问是谁的错。
       *
       * 这一支比前两支重一点：**推给别人跟隐瞒自己不是一回事**。
       * 可它仍然是同一件事的一种——玩家不会在选的时候觉得自己在做大事。
       */
      blame: {
        id: 'blame',
        blocks: [
          { kind: 'narration', text: '那件事办砸了，有人问是怎么回事。' },
          { kind: 'narration', text: '错在你，可当时旁边还有一个人。' },
        ],
        choices: [
          {
            id: 'lie',
            label: '你说不清楚，当时那人也在',
            hint: '你没有指名道姓',
            echo: '你说当时那人也在。',
            effects: [
              {
                type: 'deed',
                kind: 'lie',
                text: '那件事办砸了，有人问是怎么回事，你说当时那人也在。',
              },
              { type: 'time', months: 2 },
            ],
            next: 'after-lie',
          },
          {
            id: 'truth',
            label: '你说是自己疏忽',
            echo: '你说是自己疏忽。',
            effects: [
              {
                type: 'deed',
                kind: 'truth',
                text: '那件事办砸了，有人问是怎么回事，你说是自己疏忽。',
              },
              { type: 'time', months: 2 },
            ],
            next: 'after-truth',
          },
        ],
      },

      /**
       * 说完之后。
       *
       * **不写「你感到愧疚」**——心理描写留给玩家。
       * 只写身体上的痕迹和第二天的一个小动作。
       *
       * 也**不落任何惩罚**：多数谎话没有后果，而那正是它会变成习惯的原因。
       */
      'after-lie': {
        id: 'after-lie',
        blocks: [],
        branches: [{ requires: [WORN], next: 'worn' }],
        next: 'fresh',
      },

      /** 前三回：话说出去了，可它在他身上留下了点什么 */
      fresh: {
        id: 'fresh',
        blocks: [
          { kind: 'narration', text: '话说出去了，没有人追问。' },
          { kind: 'narration', text: '那天晚上你睡得比平常晚一点。' },
          {
            kind: 'narration',
            text: '第二天你绕开了那个人。也说不上为什么。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 第四回起：什么也没留下。
       *
       * **这一节就是习惯形成。** 没有一句「你已经习惯了」——只是上一节里
       * 那两句痕迹不见了，换成他转身去做别的事。玩家要过很久才反应过来，
       * 那天晚上自己睡得跟平常一样。
       */
      worn: {
        id: 'worn',
        blocks: [
          { kind: 'narration', text: '话说出去了，没有人追问。' },
          { kind: 'narration', text: '你转身去做别的事了。' },
          { kind: 'narration', text: '那天晚上你睡得跟平常一样。', tone: 'faint' },
        ],
      },

      /**
       * 说了实话之后。
       *
       * **这一节跟上一节是同一层**，不是「正确选项的奖励」。
       * 它同样不给属性、不给家境——说实话也可能什么好处都没有，
       * 而那也是真的。
       */
      'after-truth': {
        id: 'after-truth',
        blocks: [
          { kind: 'narration', text: '说完之后有一阵沉默。' },
          { kind: 'narration', text: '那件事后来也就过去了，没有人再提。' },
          {
            kind: 'narration',
            text: '你不知道自己这么说是对是错，只是当时没想别的。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

export const candourEvents: readonly LifeEvent[] = [
  {
    /**
     * 有人问了一句。
     *
     * **前提极少，这是有意的**：这一册要的是「它真的会反复发生」。
     * 加一条 `requires` 就少一批人碰得到，而习惯形成需要的是次数。
     *
     * `window` 从十二起：小孩子说谎是另一回事（那是 `childhood` 那一册的事），
     * 这一册说的是一个知道自己在说什么的人。
     */
    id: 'candour-small',
    window: { from: 12, to: 70 },
    requires: [{ undertaking: { not: 'mourning' } }],
    scene: 'candour:small',
    repeatable: true,
    /*
     * 权重 7，跟别的可反复事件同档（`day-ordinary` 是 9，`kindred` 那条是 5）。
     *
     * **但权重挡不住它。** 库里别的可反复事件要么窗口窄（`day-ordinary` 到十六）要么有前提
     * （要侄儿、要师父），这一卷 12–70 只要不在服丧，从十六岁起它几乎是唯一候选，
     * 而 `pickEvent` 有候选就不过日常——头一版没有 `chance`，一世演 137–199 回、最长连演 192 回
     * （2026-09-08，8 世，数正文里开场那三句），十二岁之后的日常被它挤光了。
     *
     * ⚠️ 当天报出来的「一世演 1–13 回、中位 6」是数错了：按 `sceneId` 翻面数「进入这一卷」的次数，
     * 而它演完紧接着又是它，`sceneId` 不翻面，连演一百多回只记一段。再往前一版按 `sceneId`
     * 逐步采样，数出 60973 次——一卷有好几个节点，一次演出被数成好几次。
     * **数一卷演了几回，数它留下的痕迹**：行为史的笔数，或正文里那一卷独有的那句。
     *
     * 六回上下是这一册要的：**够攒出「做过很多次」，又不至于每年都在撒谎**。
     * 太少攒不出来，太多就成了骗子模拟器——`scripts/deeds.ts` 守着上限。
     */
    weight: 7,
    chance: 0.25,
  },
]
