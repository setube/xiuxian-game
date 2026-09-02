import type { Condition, InkTone, RegionKey } from '@/types/game'

/**
 * 世界的征象。
 *
 * 这一册回答的是：**玩家怎么知道外头出事了？**
 *
 * 他不会看到 `grain = 138`。他看到的是他这个位置上、这个年纪、
 * 这种出身的人会注意到的东西：
 *
 * - 六岁的农家孩子：饭桌上的粥稀了
 * - 十四岁的商户之子：进货的路不好走了
 * - 猎户：山里的兽比往年少
 * - 客栈的孩子：住店的人换了一种
 *
 * 同一个世界状态，五个人看见五样东西，而且**没有人看见全貌**。
 *
 * ## 三条性质
 *
 * 1. **不是人人都看得见**（`who`）
 * 2. **不精确**——「贵了许多」对应一段区间，两个不同的粮价给出同一句话
 * 3. **可能被读错**（`reading`）——街上多了外乡人，是商队还是逃荒的？
 *
 * 第三条最要紧。玩家建立的世界模型**可以是错的**，
 * 而这正是「纯文字游戏的游戏性」：不是隐藏数值，是让他自己去拼。
 */
export interface SignRule {
  id: string
  /** 什么光景下看得见 */
  when: Partial<Record<RegionKey, { atLeast?: number; atMost?: number }>>
  /** 谁会注意到。不写就是人人都看得见 */
  who?: Condition[]
  says: string
  /** 玩家自以为看懂了的东西。未必对 */
  reading?: string
  from: RegionKey
  tone?: InkTone
  /** 挑征象时的相对权重 */
  weight?: number
}

export const SIGNS: readonly SignRule[] = [
  // ============================================================
  // 粮价：最普遍的一条。人人有份，但看见的东西不一样
  // ============================================================
  {
    id: 'grain-cheap',
    when: { grain: { atMost: 82 } },
    says: '今年的米便宜。粮铺门口堆到了街上。',
    from: 'grain',
    tone: 'faint',
    weight: 20,
  },
  {
    /** 家底厚的人家，粮价只是一句闲话 */
    id: 'grain-up-talk',
    when: { grain: { atLeast: 126 } },
    who: [{ standing: { atLeast: 55 } }],
    says: '{elder}跟人说话时提过两回米价。',
    reading: '你听见了，但没往心里去。',
    from: 'grain',
    tone: 'faint',
    weight: 30,
  },
  {
    /**
     * 同一个粮价，在紧巴的人家是饭桌上的事。
     *
     * 小孩子看不见「粮价」这个东西，他只看得见自己碗里的。
     */
    id: 'grain-thin-porridge',
    when: { grain: { atLeast: 126 } },
    who: [{ standing: { atMost: 44 } }],
    says: '这阵子的粥稀了。',
    reading: '你还小，不懂这是为什么，只知道饿得快。',
    from: 'grain',
    weight: 40,
  },
  {
    id: 'grain-high',
    when: { grain: { atLeast: 150 } },
    says: '米价比往年贵了许多。买米的人排到了巷口。',
    from: 'grain',
    weight: 35,
  },
  {
    id: 'grain-shut',
    when: { grain: { atLeast: 178 } },
    says: '米铺白天也上着门板。',
    reading: '有人说是没货了，也有人说是不肯卖。',
    from: 'grain',
    tone: 'deep',
    weight: 30,
  },

  // ============================================================
  // 天时：只有靠天吃饭的人看得出来
  // ============================================================
  {
    id: 'rain-short',
    when: { rain: { atMost: 34 } },
    who: [{ trade: '农户' }],
    says: '入夏之后没下过透雨。地里裂了缝。',
    from: 'rain',
    weight: 45,
  },
  {
    /** 猎户不看地，看山 */
    id: 'rain-short-hills',
    when: { rain: { atMost: 34 } },
    who: [{ trade: '猎户' }],
    says: '山泉细了。今年的兽也比往年瘦。',
    from: 'rain',
    weight: 45,
  },
  {
    id: 'harvest-poor',
    when: { harvest: { atMost: 34 } },
    who: [{ trade: '农户' }],
    says: '秋后打下来的粮，装不满往年的仓。',
    from: 'harvest',
    tone: 'deep',
    weight: 40,
  },
  {
    id: 'harvest-good',
    when: { harvest: { atLeast: 68 } },
    who: [{ trade: '农户' }],
    says: '今年是个好年景。场院上晒得满满的。',
    from: 'harvest',
    tone: 'faint',
    weight: 25,
  },

  // ============================================================
  // 秩序：路上太不太平。谁走路谁知道
  // ============================================================
  {
    id: 'order-strangers',
    when: { order: { atMost: 44 } },
    says: '村口这阵子常有陌生人过。',
    // 这一条是全册最要紧的一处误读：他看见的是人，不是原因
    reading: '你以为是过路的客商。',
    from: 'order',
    weight: 35,
  },
  {
    /** 见过世面的人读得出那些人是什么人 */
    id: 'order-refugees',
    when: { order: { atMost: 44 } },
    who: [{ attribute: { key: 'insight', atLeast: 52 } }],
    says: '村口这阵子常有陌生人过，拖家带口，走得很慢。',
    reading: '那是逃荒的。',
    from: 'order',
    tone: 'deep',
    weight: 40,
  },
  {
    id: 'order-watch',
    when: { order: { atMost: 36 } },
    says: '入夜以后没什么人出门了。村里排了守夜的。',
    from: 'order',
    tone: 'deep',
    weight: 40,
  },
  {
    id: 'order-escort-busy',
    when: { order: { atMost: 40 } },
    who: [{ trade: '镖局' }],
    says: '局里的活多了。走一趟的价钱涨了一倍。',
    reading: '你那时候只觉得高兴。',
    from: 'order',
    weight: 50,
  },
  {
    id: 'order-inn-empty',
    when: { order: { atMost: 40 } },
    who: [{ trade: '客栈' }],
    says: '店里空了。住进来的多是给不出房钱的。',
    from: 'order',
    tone: 'deep',
    weight: 50,
  },
  {
    id: 'order-shop-road',
    when: { order: { atMost: 40 } },
    who: [{ trade: '商户' }],
    says: '进货的路不好走了。铺子里的货卖一件少一件。',
    from: 'order',
    weight: 50,
  },
  {
    id: 'order-good',
    when: { order: { atLeast: 66 } },
    says: '这两年外头太平。夜里也听得见更夫的梆子。',
    from: 'order',
    tone: 'faint',
    weight: 18,
  },

  // ============================================================
  // 太平年景。
  //
  // 这几条不是凑数：没有它们，玩家只在灾年才「看得见世界」，
  // 那等于世界只在出事的时候才存在。
  // 真实的感受是——大部分年头你也看得见外头，只是没什么可说的。
  // ============================================================
  {
    id: 'calm-market',
    when: { grain: { atLeast: 84, atMost: 122 }, order: { atLeast: 48 } },
    says: '镇上的集照常开。米价跟去年差不多。',
    from: 'grain',
    tone: 'faint',
    weight: 22,
  },
  {
    id: 'calm-fields',
    when: { rain: { atLeast: 42, atMost: 68 }, harvest: { atLeast: 42 } },
    who: [{ trade: '农户' }],
    says: '雨水还算匀。地里的活跟往年一样多。',
    from: 'rain',
    tone: 'faint',
    weight: 20,
  },
  {
    id: 'calm-road',
    when: { order: { atLeast: 50 } },
    says: '官道上照常有车马过。',
    from: 'order',
    tone: 'faint',
    weight: 16,
  },
  {
    id: 'calm-inn',
    when: { order: { atLeast: 50 } },
    who: [{ trade: '客栈' }],
    says: '店里住得七八分满。南来北往的，什么口音都有。',
    from: 'order',
    tone: 'faint',
    weight: 26,
  },

  // ============================================================
  // 疫病
  // ============================================================
  {
    id: 'plague-coffins',
    when: { plague: { atLeast: 28 } },
    says: '街上开始有人抬棺。抬的时候不敢走大路。',
    from: 'plague',
    tone: 'cinnabar',
    weight: 60,
  },
  {
    id: 'plague-herbs',
    when: { plague: { atLeast: 20 } },
    who: [{ trade: '药铺' }],
    says: '抓药的人从早排到晚。有几味药早就没了。',
    reading: '{elder}把门槛外的人挡了回去，那天他一句话也没说。',
    from: 'plague',
    tone: 'deep',
    weight: 70,
  },
]

export interface SignMeta {
  tone?: InkTone
}

/** 按 id 取一条征象的元信息 */
export function signRuleById(id: string): SignRule | undefined {
  return SIGNS.find((rule) => rule.id === id)
}
