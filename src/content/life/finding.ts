import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 认得出与认不出。
 *
 * ## 这一册守的是一句话：名字不在东西上，在人身上
 *
 * 31.md 第一节反对的是这个：
 *
 *     拾取：赤炎石 × 3      ← 玩家自动知道它是什么
 *
 * 要的是这个：
 *
 *     看到一块暗红色矿石 → 不知道 → 听人说过 → 见过 → 拿给炼器师看
 *     → 知道名称 → 知道用途 → 知道产地 → 知道真假 → 知道品质
 *
 * **地基早就在了**，不必新建：`InventoryItem.name` 明写「是你此刻会怎么称呼它，
 * 不是它究竟是什么」，`formerName` 记着「原先你叫它……」，改名靠 `reveal`；
 * 而认知层的 `Interpretation` 三档（未理解／猜想／确信）里，
 * **`'确信'` 的注释自己写着「可能仍然是错的」**——那正是 31.md 要的「认错」。
 *
 * ## 那么缺的是什么：缺东西，不缺链
 *
 * 动手前数过：**全库只有两处 `type: 'item'`**——`odd-root`（药铺那一卷，
 * 采药人挑来的那截根）和 `thin-book`（山道上那个人给的）。**两样都是白给的，
 * 而且都被一步点破了。** 九级链没有东西可以走。
 *
 * 而 `trade-herb` 那一卷压着 `business: '药铺'`、窗口 9–16——
 * **认得出与认不出这件事，眼下只属于药铺家的孩子，而且一辈子只发生一次。**
 *
 * 所以这一册不建材料表、不建生态表、不建九级链。它只做一件事：
 * **让「认不出的东西」在普通人的日子里出现，并且让它停在「认不出」上。**
 *
 * ## 三条界线
 *
 * **一、这一册全在凡人这一侧。** 一个采药人、一截根、一个翻药书的爹——
 * 没有一处需要「修仙界和凡间是什么关系」（31.md 末尾那个未决问题）。
 * 再往下一格（拿给炼器师看、知道产地真假品质）就会撞上它，**那时候等地基**。
 *
 * **二、认错不是惩罚。** 「你猜它是什么」猜错了，世界不纠正你，
 * 也不扣什么——`interpretation: '猜想'` 就是它本来的样子。
 * 一个人一辈子把一截根当柴火，那不是失败，是绝大多数人的实情。
 *
 * **三、不给「鉴定」这个动作。** 没有一个按钮叫「鉴定物品」。
 * 名字来自具体的人在具体的时候说的一句话——`trade:herb` 那一卷
 * 「{elder}翻了三本药书，一本也没有」是这一册的范本：
 * **认不出是靠一个动作说出来的，不是靠一个标签。**
 */

/** 家里靠山吃饭：打猎、采药、砍柴的人家，才会有人真进山 */
const MOUNTAIN_TRADES = { livelihood: '打猎' } as const

export const findingScenes: SceneLibrary = {
  /**
   * 石头缝里那一株。
   *
   * 跟药铺那一卷（`trade:herb`）分工：那一卷是**别人挑上门来卖**，
   * 你家有药书可翻；这一卷是**你自己在山里撞见**，家里没有一本药书。
   *
   * 所以两卷的「认不出」是两种：那边是查过了查不到，这边是**根本没处查**。
   */
  'finding:root': {
    id: 'finding:root',
    title: '石头缝里',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '跟着{elder}上山，走到半坡上歇脚。' },
          {
            kind: 'narration',
            text: '背阴的石头缝里有一株草，叶子厚，边上发暗红。旁边几步的草都枯了，只有它还绿着。',
          },
        ],
        choices: [
          {
            id: 'dig',
            label: '挖出来带回去',
            echo: '你把它挖了出来。',
            effects: [
              { type: 'time', days: 1 },
              {
                type: 'item',
                id: 'odd-herb',
                name: '一株没见过的草',
                count: 1,
                unit: '株',
                note: '山上背阴的石头缝里挖的。旁边的草都枯了，它没枯。',
              },
              /*
               * `interpretation: '未理解'` 是这一卷的落点：
               * **他知道有这么件事，可他说不出那是什么。**
               *
               * 不写 `summary`——那一格是「他会怎么说这件事」，
               * 而此刻他说不出来。留空比编一句话诚实。
               */
              {
                type: 'knowledge',
                id: 'the-odd-herb',
                title: '石头缝里那一株',
                summary: null,
                category: '器物',
                interpretation: '未理解',
              },
            ],
            next: 'asked',
          },
          {
            id: 'leave',
            label: '看两眼就走',
            echo: '你没动它。',
            effects: [{ type: 'time', days: 1 }],
            next: 'left',
          },
        ],
      },
      /**
       * 带回去问大人。
       *
       * **他也不知道**——这是这一卷要说的那句话。家里没有药书，
       * 而一个打猎的人认得出兽迹、认得出天气，不认得这个。
       *
       * 他给的那句「不认得」不是敷衍，是这个世界里绝大多数东西的真实处境：
       * **没有人认得，也没有地方可查。**
       */
      asked: {
        id: 'asked',
        blocks: [
          { kind: 'narration', text: '回去给{elder}看。他捏了捏，闻了闻。' },
          { kind: 'dialogue', speaker: '{elder}', text: '不认得。' },
          {
            kind: 'narration',
            text: '他又说：不认得的东西别往嘴里放。搁着吧，反正它也不烂。',
            tone: 'faint',
          },
        ],
        next: 'done',
      },
      left: {
        id: 'left',
        blocks: [
          {
            kind: 'narration',
            text: '下山的时候你回头看了一眼，那株草还在石头缝里绿着。',
            tone: 'faint',
          },
        ],
        next: 'done',
      },
      done: { id: 'done', blocks: [] },
    },
  },
}

export const findingEvents: readonly LifeEvent[] = [
  {
    /**
     * 石头缝里那一株。
     *
     * ## 条件只压「家里靠山吃饭」和年纪
     *
     * 不压 `business`（那是药铺那一卷的事）、不压家境、不压悟性——
     * **撞见一样认不出的东西不需要任何资格**，那正是这一册的立场。
     *
     * 窗口 8–16：跟着大人上山的年纪。成年之后自己进山是另一件事，
     * 等有一卷写它再说。
     *
     * `chance` 0.3：一辈子撞见一两回。**它不该是每年都有的事**——
     * 山里的东西绝大多数是柴和草，稀奇的本来就少。
     */
    id: 'finding-root',
    window: { from: 8, to: 16 },
    requires: [MOUNTAIN_TRADES, { family: { id: 'father', alive: true, present: true } }],
    scene: 'finding:root',
    weight: 8,
    chance: 0.3,
  },
]
