import type { Bond, Condition, Contact, Interpretation, RegionKey, Topic } from '@/types/game'

/**
 * 打听。
 *
 * 这一册回答的是：**玩家主动去问，能问出什么？**
 *
 * 前一层（signs）是世界给他看的，这一层是他自己去要的。
 * 但要来的**不是正确答案，是那个人的局部世界**：
 *
 *   同样问「最近粮食是不是涨价了」——
 *   爹说：是贵了些，家里省着吃吧。
 *   粮商说：今年不太好做，你别多问。
 *   邻居说：你家是不是也开始借粮了？
 *   官府说：本月米价仍在官府限价之内。
 *
 * 四句话都不假，四句话拼不出真相。玩家得自己判断信谁。
 *
 * ## 三条铁律
 *
 * 1. **玩家不是全知调查员。** 对方可能不知道、可能只知道自己那摊事、
 *    可能觉得你年纪小不肯说、可能自己就理解错了、也可能骗你。
 * 2. **同一个人同一个问题，答案未必一样。** 掷一次——他今天心情怎么样，
 *    你在他眼里够不够格问这个。
 * 3. **答案只写进认知层。** 它不改世界，也不改真实属性；
 *    它只改变玩家脑子里那份世界模型，而那份模型可能是错的。
 */

/** 一个可以问的对象 */
export interface Informant {
  id: string
  /** 玩家会怎么称呼他 */
  name: string
  /** 得先认识他。写了就要求这条关系在场 */
  bond?: Bond
  /** 还要满足什么才问得着 */
  requires?: Condition[]
  /** 他能答什么 */
  answers: readonly Answer[]
}

export interface Answer {
  topic: Topic
  /**
   * 他对这件事的了解程度，0–100。
   *
   * 跟观察系统的 acuity 是一回事：低不是会说谎，是**真的不知道**。
   * 粮商对年景的了解是 88，对修士是 6。
   */
  knows: number
  /**
   * 他肯不肯说，0–100。
   *
   * 跟「知不知道」完全是两回事。粮商知道得一清二楚，
   * 但他不会跟一个孩子交底——那是他的生意。
   */
  tells: number
  /** 什么光景下他才会这么说 */
  when?: Partial<Record<RegionKey, { atLeast?: number; atMost?: number }>>
  /** 他真会说的那句话 */
  says: string
  /** 说完之后玩家心里的那句。可能是误读 */
  reading?: string
  /** 他这一次离这件事有多近。别人说的，缺省就是「听说」 */
  contact?: Contact
  /** 听完之后他形成了什么样的解释 */
  interpretation?: Interpretation
  /** 问到了什么见闻 */
  learns?: {
    id: string
    title: string
    summary: string
    category: '世事' | '修行' | '地理' | '人物' | '器物'
  }
  /**
   * 他这句话其实是错的——而他自己不知道。
   *
   * 跟「知不知道」「肯不肯说」完全独立：一个人可以
   * 知道 = true、肯说 = true、而理解错了 = true。
   * **他不是撒谎，他是把自己看见的现象解释错了。**
   *
   * `事实` 容易撞破（他说北边打仗，玩家哪天亲眼看见北边没打）；
   * `因果` 却可能跟玩家一辈子——他验证了「北边的人在南逃」，
   * 但仍然以为那是因为兵灾。**因果错误比事实错误活得久。**
   */
  mistaken?: '事实' | '因果'
}

/**
 * 他知道，但不肯说。
 *
 * 这几句本身就是信息——**「他不肯说」跟「他不知道」是两回事**，
 * 而玩家分得出来。分不出来的那些，日后会吃亏。
 *
 * 不带主语：调用处会在前面补上称呼。
 */
export const DEFLECTIONS: readonly string[] = [
  '含混地应了一声，没有往下说。',
  '看了你一眼，说小孩子问这些做什么。',
  '摆摆手，转身去忙别的了。',
  '说了句「不清楚」，可你觉得他清楚。',
]

/** 他是真不知道。不带主语，调用处补称呼 */
export const IGNORANCE: readonly string[] = [
  '想了半天，说他也不晓得。',
  '说他成天在自家门口，哪知道外头的事。',
  '反问你听谁说的。',
]

export const INFORMANTS: readonly Informant[] = [
  {
    /**
     * 家里的大人。
     *
     * 他对年景知道得不少（那是他每天在操心的事），
     * 但对修士几乎一无所知——除非他年轻时真遇见过一个。
     * 而且他肯不肯跟孩子说实话，是另一回事。
     */
    id: 'elder',
    name: '{elder}',
    bond: '抚养',
    answers: [
      {
        topic: '年景',
        knows: 72,
        tells: 66,
        when: { grain: { atLeast: 130 } },
        says: '是贵了些。家里省着点吃。',
        reading: '他说得很轻，你却记住了。',
        interpretation: '确信',
        learns: {
          id: 'lean-year',
          title: '年景',
          summary: '今年米贵。家里的大人说要省着吃。',
          category: '世事',
        },
      },
      {
        topic: '年景',
        knows: 72,
        tells: 70,
        when: { grain: { atMost: 118 } },
        says: '今年还成。你操心这个做什么。',
        interpretation: '确信',
      },
      {
        topic: '家里',
        knows: 95,
        tells: 40,
        says: '过得去。你别管这些。',
        reading: '你不知道他是真的过得去，还是不想让你知道。',
      },
      {
        topic: '世道',
        knows: 48,
        tells: 62,
        when: { order: { atMost: 42 } },
        says: '这阵子别往远处跑。天黑就回来。',
        interpretation: '确信',
        learns: {
          id: 'unsafe-roads',
          title: '路上不太平',
          summary: '家里的大人不许你天黑以后出门，也不许往远处跑。',
          category: '世事',
        },
      },
      {
        // 绝大多数长辈这一条 knows 极低，问了也是白问——
        // 除非他年轻时真在路上遇见过一个
        topic: '修士',
        knows: 14,
        tells: 55,
        says: '那是说书的编出来哄人的。',
        reading: '你觉得他答得太快了。',
      },
    ],
  },
  {
    id: 'grain-dealer',
    name: '米铺的掌柜',
    requires: [{ age: { atLeast: 8 } }],
    answers: [
      {
        /**
         * 他知道得一清二楚，但他不会跟一个孩子交底。
         *
         * `knows 88 / tells 22` 是这一册最典型的一组数：
         * **知道 ≠ 肯说。** 玩家多半只能得到一句打发。
         */
        topic: '年景',
        knows: 88,
        tells: 22,
        when: { grain: { atLeast: 140 } },
        says: '今年不好做。你别多问。',
        reading: '他一边说一边把米袋往里挪了挪。',
        interpretation: '猜想',
        learns: {
          id: 'grain-hoarded',
          title: '米铺的米',
          summary: '掌柜说今年不好做，可他后堂里的米袋堆得很高。',
          category: '世事',
        },
      },
      {
        topic: '年景',
        knows: 88,
        tells: 48,
        when: { grain: { atMost: 128 } },
        says: '跟去年差不多。你要买多少？',
        interpretation: '确信',
      },
      { topic: '世道', knows: 62, tells: 34, says: '路上的事我不清楚。我又不走远道。' },
    ],
  },
  {
    id: 'neighbour',
    name: '同村的老人',
    requires: [{ age: { atLeast: 6 } }],
    answers: [
      {
        topic: '年景',
        knows: 54,
        tells: 84,
        when: { grain: { atLeast: 132 } },
        says: '早年闹过一回，比现在还狠。那年我才这么高。',
        reading: '他讲了很久，讲的都是几十年前的事。',
        interpretation: '猜想',
        learns: {
          id: 'old-famine',
          title: '老辈说的那场荒年',
          summary: '村里的老人说，早年闹过一场更狠的。饿死了不少人。',
          category: '世事',
        },
      },
      {
        /**
         * 他说的是真话，可他的解释是错的。
         *
         * 那些人确实是从北边来的、确实在南逃——**事实全对**。
         * 但北边闹的是旱，不是兵。老人不是撒谎，
         * 他只是这辈子听惯了「兵灾」，就这么解释了。
         *
         * 玩家会带着这个因果走很多年。他哪天真去了北边，
         * 会发现那里并没有打过仗——可他多半仍然记得
         * 「是打仗把人赶下来的」。**因果错误比事实错误活得久。**
         */
        topic: '生人',
        knows: 66,
        tells: 88,
        when: { order: { atMost: 44 } },
        says: '往南边去的。听口音是北边来的——北边怕是又打起来了。',
        reading: '你问他怎么知道。他说，不打仗谁往外跑。',
        interpretation: '确信',
        mistaken: '因果',
        learns: {
          id: 'refugees',
          title: '逃荒的人',
          summary: '村口过的那些人是从北边来的。老人说，北边打起来了，所以人往南跑。',
          category: '世事',
        },
      },
      {
        topic: '修士',
        knows: 26,
        tells: 92,
        says: '我年轻时听人说过，山里有那种人。信不信由你。',
        reading: '他讲得有鼻子有眼，可你不知道是真是假。',
        interpretation: '猜想',
        learns: {
          id: 'immortal-tale',
          title: '山里的那种人',
          summary: '村里的老人说，山里有一种人，不吃不喝也能活。他说他年轻时听人讲过。',
          category: '修行',
        },
      },
    ],
  },
  {
    id: 'clerk',
    name: '衙门口的差役',
    requires: [{ age: { atLeast: 10 } }],
    answers: [
      {
        /**
         * 官府的说法。
         *
         * 它是对的——按官府的账本确实如此。
         * 但玩家在街上看到的米铺已经关了门。
         * **两个都是真的，合不到一起。**
         */
        topic: '年景',
        knows: 70,
        tells: 90,
        when: { grain: { atLeast: 148 } },
        says: '本月米价仍在官府限价之内。',
        reading: '你想起街口那家米铺已经三天没开门了。',
        interpretation: '猜想',
        learns: {
          id: 'price-cap-known',
          title: '官府的限价',
          summary: '官府说米价在限价之内。可是米铺关着门，买不到米。',
          category: '世事',
        },
      },
      { topic: '世道', knows: 58, tells: 44, says: '本县太平。莫要听人乱传。' },
    ],
  },
]

/** 按 id 取一个可以问的人 */
export function informantById(id: string): Informant | undefined {
  return INFORMANTS.find((item) => item.id === id)
}
