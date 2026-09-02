import type { WorldEvent } from '@/types/game'

/**
 * 世界自己会发生的事。
 *
 * 这一册跟 `content/life/` 是两回事：
 * `life` 里的是**落到玩家头上**的事，这里的是**发生在世界上**的事。
 * 玩家可能碰上，也可能一辈子不知道——他出生在第九年的江陵府，
 * 那个府在第九年是什么样子，是前面八年一点一点变成的。
 *
 * ## 一条铁律：只改条件，不替玩家决定结果
 *
 * 旱灾把粮价推上去，仅此而已。「你家因此卖了地、借了债，还是把孩子送去当学徒」
 * 是玩家那一层的事，世界这一层一概不管。
 *
 * 这一条不守住，「世界事件」就会退化成「系统给你发灾难」——
 * 玩家出生在乱世，三岁死爹、五岁涨价、七岁毁村、九岁失姐，
 * 每一件从模拟角度都合理，但玩家只会觉得系统在针对他。
 *
 * ## 灾难是连锁，不是戏剧性
 *
 * 所以这里只做一条链，把它做透：
 *
 *   降雨异常 → 减产 → 粮价上涨 → 家里紧起来 → 有人囤粮 → 官府限价
 *   → 黑市 → 盗匪多了 → 商路改道 → 村镇衰败 → 人口迁徙
 *
 * 玩家多半只经历其中两三环，甚至一环也碰不上。
 * 这才是要的真实感——不是每个人都活在故事的中心。
 */
const DROUGHT = '旱'

export const WORLD_EVENTS: readonly WorldEvent[] = [
  // —— 旱灾链 ——
  {
    /**
     * 链头。它自己不是灾难，只是「今年雨水少」。
     *
     * 真正的分水岭在下一环：少这一年不要紧，连着少两年才成事。
     * 所以这一条的权重不低——常有的事；但它多数时候不会往下走。
     */
    id: 'dry-spring',
    chain: DROUGHT,
    when: { rain: { atMost: 62 } },
    shift: { rain: -16 },
    weight: 30,
    cooldown: 2,
  },
  {
    id: 'poor-harvest',
    chain: DROUGHT,
    after: 'dry-spring',
    when: { rain: { atMost: 36 } },
    shift: { harvest: -22, grain: 18 },
    weight: 60,
    cooldown: 1,
    chronicle: '这一年雨水不足，秋后收成不到往年的六成。',
  },
  {
    // 粮价起来了。这一条对玩家的意义完全取决于他家有没有余粮——
    // 布庄的孩子只是听大人念叨，佃户的孩子当年就要挨饿
    id: 'grain-price',
    chain: DROUGHT,
    after: 'poor-harvest',
    when: { harvest: { atMost: 40 } },
    shift: { grain: 26 },
    weight: 70,
    chronicle: '米价一日三涨。',
  },
  {
    // 有人囤粮。世界不评判这件事的对错，它只是发生了
    id: 'hoarding',
    chain: DROUGHT,
    after: 'grain-price',
    when: { grain: { atLeast: 140 } },
    shift: { grain: 20, order: -8 },
    weight: 50,
  },
  {
    id: 'price-cap',
    chain: DROUGHT,
    after: 'hoarding',
    when: { grain: { atLeast: 148 } },
    // 官府一限价，明面上的粮就没了。价压下去一点，秩序反而更坏
    shift: { grain: -14, order: -12 },
    weight: 55,
    chronicle: '官府出了告示，粮价不许再涨。米铺关了门。',
  },
  {
    id: 'banditry',
    chain: DROUGHT,
    after: 'price-cap',
    when: { order: { atMost: 42 } },
    shift: { order: -16 },
    weight: 60,
    // 一条道不会年年改、年年闹匪。冷却让链条走过去，而不是卡在原地
    cooldown: 8,
    chronicle: '路上开始不太平。',
  },
  {
    // 商路改道。这一条改变的是「谁会路过这里」——
    // 客栈的孩子从此见不到南来北往的人，那是另一种人生
    id: 'trade-reroute',
    chain: DROUGHT,
    after: 'banditry',
    when: { order: { atMost: 32 } },
    shift: { order: -6, grain: 12 },
    weight: 45,
    cooldown: 10,
    chronicle: '走北路的商队改道了。这一年没什么外乡人过来。',
  },
  {
    id: 'exodus',
    chain: DROUGHT,
    after: 'trade-reroute',
    when: { grain: { atLeast: 160 }, order: { atMost: 28 } },
    shift: { order: 8, grain: -10, harvest: -8 },
    weight: 40,
    cooldown: 12,
    chronicle: '有人开始往南边逃荒。走的多是没地的人家。',
  },

  // —— 疫病：跟着世道坏起来，不单独成链 ——
  {
    id: 'plague-outbreak',
    when: { order: { atMost: 30 }, plague: { atMost: 10 } },
    shift: { plague: 42, order: -10 },
    weight: 22,
    cooldown: 6,
    chronicle: '疫病起来了。街上开始有人抬棺。',
  },
  {
    id: 'plague-wanes',
    when: { plague: { atLeast: 20 } },
    shift: { plague: -26 },
    weight: 65,
  },

  // —— 缓过来：世界不会一直往下掉 ——
  {
    /**
     * 好年景。
     *
     * 没有这几条，世界就是一条只往下走的斜线——
     * 跑到第三十年，每个府都是人间地狱。
     * 而真实的世道是有起有落的，这也正是「灾难不是剧本」的另一面：
     * 它会过去。
     */
    id: 'good-rain',
    when: { rain: { atMost: 58 } },
    shift: { rain: 20, harvest: 14 },
    weight: 46,
  },
  {
    id: 'bumper',
    when: { rain: { atLeast: 58 }, harvest: { atMost: 62 } },
    shift: { harvest: 20, grain: -22 },
    weight: 40,
    chronicle: '今年是个丰年。',
  },
  {
    id: 'order-restored',
    when: { order: { atMost: 50 } },
    shift: { order: 18 },
    weight: 58,
  },
  {
    id: 'trade-returns',
    when: { order: { atLeast: 52 }, grain: { atLeast: 115 } },
    shift: { grain: -14 },
    weight: 38,
    chronicle: '商路通了，米价落下来一些。',
  },
]
