import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 节令。
 *
 * ## 这一册跟别的册子差在哪：时令是它自己推的
 *
 * 一卷叫「中秋」的内容，说的是**到了八月十五**，不是**碰巧在八月十五**。
 * 这两句话的差别不是措辞，是这一册能不能被人读到：
 *
 * 成年之后一回合推两三年（`routine:adult` 两年、`routine:prime` 三年），
 * 月份几乎不动。拿 `Condition.month` 守时令的话，「年年可能有」实际成了
 * **按世翻的开关**——踏进成年那一刻碰巧是几月，就决定了这一世过不过得上节。
 * 实测四十世里只有十一世到过腊月正月。年节那一卷正是这么写的，
 * 于是一卷本该年年有的内容，四分之三的人一辈子读不到。
 *
 * 所以这一册的卷一律在 `onEnter` 里自己把日历推过去：
 *
 *     onEnter: [{ type: 'time', untilMonth: 8 }, { type: 'time', days: 1 }]
 *
 * `untilMonth` 是**目标**不是增量（`stores/world.ts` 的 `TimeDelta`）：
 * 当月就是 0，否则往前走到下一次。**两条的顺序有意义**——先到那个月，
 * 再推过节本身花掉的日子；反过来写在月底那几天会分道。
 * 条件层只管「有没有这个人、他在不在跟前」。
 *
 * ## 中秋说的是不在一处的人
 *
 * 跟年节分工：年节是**回去**（`kindred:newyear` 走一趟老屋，看见那一年里
 * 变了什么——侄儿长了几岁、婆媳那顿饭有没有人说话）。中秋不回去，
 * 它说的是**今晚不在跟前的那些人**。所以它问的是 `bond.near`，
 * 而不是谁还活着：一个在镇上做工的哥，活得好好的，只是今晚不在。
 *
 * ## ⚠️ 「缺席」是分支，不是前提——头一版写反了
 *
 * 头一版把「有一个不在跟前的哥」写进了事件的 `requires`。**实测 300 世
 * 只有 3.3% 演到**——哥多半就在隔壁村，真离家的只有他去镇上做木匠那一路。
 *
 * 那正是这次改造要治的病，只是换了个原因：从前是「碰巧不在那个月」，
 * 那一版是「碰巧没有人不在跟前」。**一卷四分之三的人读不到的节令，
 * 不管卡在哪一层都是同一个毛病。**
 *
 * 所以前提只剩年纪：**中秋年年有，谁都过**。谁不在跟前是那一卷进门之后
 * 才问的事，问完落到哪一支就说哪一支的话；一个人也不缺的那一年
 * 也有它自己的一句——**人齐不是「没内容」，是另一种内容**。
 *
 * ## 往后五个节令进这一册
 *
 * 上元、端午、中元、除夕、祭灶。**每一卷得先说清自己说的是什么**——
 * 六卷都写成「过节了，家里人聚在一起」的话，等于同一卷演了六遍。
 * 中秋占了「不在一处的人」，别的卷各找各的：中元是死了的人，
 * 除夕是一年到头的账，端午是身上的病。
 */

/**
 * 谁不在跟前。**这几条是分支的条件，不是整卷的前提**——头一版写成前提，
 * 300 世只有 3.3% 演得到（见文件头那一段）。
 *
 * 三条各问一个人，按「最该在这张桌子上的人」排：孩子、哥、爹娘。
 * `alive: true` 加 `near: false` 是两问不是一问——先得有这么个人活着，
 * 再问他今晚在不在。少了前一问，一个没有孩子的人也会算成「孩子不在」
 * （空集合上 `some` 恒为假，`conditions.ts` 那一段记着这个坑）。
 */
const CHILD_AWAY = { bond: { kind: '子', alive: true, near: false } } as const
const BROTHER_AWAY = { bond: { kind: '兄', alive: true, near: false } } as const
const PARENT_AWAY = { bond: { kind: '生母', alive: true, near: false } } as const

export const festivalScenes: SceneLibrary = {
  /**
   * 中秋。
   *
   * 一格好感也不改——跟年节同一个规矩：**见不着面不等于关系变差**
   * （`relations-continuity`）。这一卷只是让玩家看见那个空位。
   */
  'festival:midautumn': {
    id: 'festival:midautumn',
    title: '八月十五',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        /*
         * 先把日历推到八月，再推过节那一天。**顺序有意义**：
         * `untilMonth` 是目标（走到八月为止），`days` 是增量。
         * 反过来写的话，七月底那两天会先被推进八月，再等一整年。
         */
        onEnter: [
          { type: 'time', untilMonth: 8 },
          { type: 'time', days: 1 },
        ],
        blocks: [
          {
            kind: 'narration',
            text: '八月十五，月亮上来得早。家里在院子里摆了张矮桌，切了瓜。',
          },
        ],
        branches: [
          { requires: [CHILD_AWAY], next: 'child-away' },
          { requires: [BROTHER_AWAY], next: 'brother-away' },
          { requires: [PARENT_AWAY], next: 'parent-away' },
        ],
        next: 'together',
      },
      /**
       * 孩子不在。排在最前面：一个人到了这个年纪，桌上最先空的是这个位置。
       */
      'child-away': {
        id: 'child-away',
        blocks: [
          { kind: 'narration', text: '孩子今年没回来。你摆碗的时候还是摆了那一只。' },
          {
            kind: 'narration',
            text: '月亮上来得很快。你听见隔壁院子里有人在数月饼，数到第三个就笑起来了。',
            tone: 'faint',
          },
        ],
        next: 'done',
      },
      /**
       * 哥不在。
       *
       * 不写他在哪、也不写他好不好——**你不知道**。这一卷不是探亲，
       * 是坐在院子里想起一个不在的人。世界里他此刻在做什么由别的册子管
       * （`away.ts`：在镇上做木匠的那些年），这里只说你这头看见的。
       */
      'brother-away': {
        id: 'brother-away',
        blocks: [
          { kind: 'narration', text: '哥今年没回来。娘留了半块瓜在碗里，谁也没动。' },
          {
            kind: 'narration',
            text: '月亮爬过屋脊的时候，你想起小时候也是这张桌子，那会儿人是齐的。',
            tone: 'faint',
          },
        ],
        next: 'done',
      },
      /** 娘不在跟前。她还在，只是不在这儿——出嫁、入赘、迁徙之后都可能这样 */
      'parent-away': {
        id: 'parent-away',
        blocks: [{ kind: 'narration', text: '娘不在这儿过节。你切瓜的时候想起她切得比你薄。' }],
        next: 'done',
      },
      /**
       * 人齐。
       *
       * **这一支不是「没内容」，是另一种内容。** 头一版让人齐的那些年
       * 整卷不演，理由写着「人齐的那一年反而没什么可记」——
       * 那句话是错的：一个人一辈子里人齐的中秋本来就没有几个，
       * 而正因为没几个，它才值得有一句。
       */
      together: {
        id: 'together',
        blocks: [
          {
            kind: 'narration',
            text: '今年谁也没缺。瓜切了两轮，最后那半块在桌上放到月亮偏西。',
          },
        ],
        next: 'done',
      },
      done: { id: 'done', blocks: [] },
    },
  },
}

export const festivalEvents: readonly LifeEvent[] = [
  {
    /**
     * 中秋。
     *
     * ## 条件里没有一格时令，也没有一格「谁不在」
     *
     * 时令由那一卷自己推（`onEnter` 的 `untilMonth: 8`）。
     *
     * **「谁不在跟前」也不写在这儿**——头一版写在这儿，实测 300 世只有
     * 3.3% 演到（哥多半就在隔壁村，真离家的只有他去镇上那一路）。
     * 那正是这次改造要治的病换了个原因：从前是「碰巧不在那个月」，
     * 那一版是「碰巧没有人不在跟前」。**卡在哪一层都是同一个毛病。**
     *
     * 所以前提只剩年纪：中秋年年有，谁都过。谁不在跟前是进门之后分支的事。
     *
     * `window` 从 22 起：跟年节同一条线，成年之后才有「人不在一处」这回事。
     *
     * ## `chance` 是发条
     *
     * 宽窗口、低门槛的事没有它会成为唯一候选、回回都来
     * （`chapters.ts` 里 candour 那一段记着这个教训：头一版一世演一百多回，
     * 把十二岁之后的日常挤光了）。0.2 按成年段七八个回合算，
     * 一世演一两回——**中秋是年年有的，但不是年年值得记一笔**。
     */
    id: 'festival-midautumn',
    window: { from: 22, to: 80 },
    scene: 'festival:midautumn',
    weight: 6,
    chance: 0.2,
    repeatable: true,
  },
]
