import type { Beat, Doing } from '@/engine/daily'
import type { Condition } from '@/types/game'

/**
 * 城里、镇上的孩子的去处。
 *
 * 「去镇上」是村里人的话：走半天山道到镇上去。住在府城街上的孩子没有这句——
 * 他出了门就是街。「找村里的孩子玩」同理：他找的是巷子里的孩子，玩的地方
 * 是巷口和城墙根，不是打谷场和河边。
 *
 * 这一册是「去镇上」按住处限定之后补的：不写它，城里的孩子就只剩「待在家里」——
 * **内容差异不能被模板变量掩盖**（用户 2026-09-06），也不能被删成空白。
 * 京师的坊街还没有那种出身，条件先写上，等它来。
 */

const IN_TOWN: Condition = { dwelling: { settlement: ['镇', '城', '京师'], kind: ['宅', '无'] } }

export const CITY_DOINGS: readonly Doing[] = [
  {
    id: 'street',
    label: '上街',
    slots: ['上午', '下午'],
    requires: [IN_TOWN],
    echo: '你上街去了。',
  },
  {
    id: 'lane-kids',
    label: '找巷子里的孩子玩',
    slots: ['上午', '下午'],
    requires: [IN_TOWN],
    echo: '你跑出去找人玩。',
  },
]

export const CITY_BEATS: readonly Beat[] = [
  // ============================================================
  // 上街
  // ============================================================
  {
    doing: 'street',
    tags: ['街上'],
    tier: '无事',
    weight: 40,
    text: ['街上跟昨天没什么两样。', '你从街头走到街尾，什么也没买。'],
  },
  {
    doing: 'street',
    tags: ['街上'],
    tier: '无事',
    weight: 26,
    when: { order: { atMost: 44 } },
    text: ['街上的铺子关了两家。', '巡街的比往日多，走得慢。', '你没有多待。'],
  },
  {
    doing: 'street',
    tags: ['街上'],
    tier: '处境',
    weight: 14,
    text: ['你在街上站了半日，看人来人往。', '回来的时候腿是酸的。'],
    effects: [{ type: 'attribute', key: 'insight', delta: 1 }],
  },
  {
    doing: 'street',
    tags: ['街上'],
    tier: '见闻',
    weight: 9,
    when: { grain: { atLeast: 148 } },
    text: ['米铺门口排着人，排到了街那头。', '你听见有人说，今年的米是从外府运来的。'],
    effects: [
      {
        type: 'knowledge',
        id: 'grain-from-afar',
        title: '外府运来的米',
        summary: '街上的米是从外府运来的。排队的人排到了街那头。',
        category: '世事',
        contact: '听说',
        interpretation: '猜想',
      },
    ],
  },
  {
    doing: 'street',
    tags: ['街上'],
    tier: '转折',
    weight: 8,
    requires: [{ age: { atLeast: 12 } }],
    text: ['有个货栈的伙计问你识不识字。', '你说认得一些。他说，那你过些日子来，兴许有活给你。'],
    effects: [{ type: 'flag', key: 'offered-shopwork', value: true }],
  },

  // ============================================================
  // 找巷子里的孩子玩
  // ============================================================
  {
    doing: 'lane-kids',
    tags: ['找孩子玩'],
    tier: '无事',
    weight: 44,
    text: ['一群人在巷口疯了半天。', '出了一身汗，回家挨了一句骂。'],
  },
  {
    doing: 'lane-kids',
    tags: ['找孩子玩'],
    tier: '无事',
    weight: 26,
    text: ['今天人不齐。', '你们在城墙根下扔了会儿瓦片，就各自散了。'],
  },
  {
    doing: 'lane-kids',
    tags: ['找孩子玩'],
    tier: '处境',
    weight: 18,
    text: ['疯跑了一天，膝盖上蹭破一块皮。', '不疼，就是回家不好交代。'],
    effects: [{ type: 'attribute', key: 'body', delta: 1 }],
  },
  {
    doing: 'lane-kids',
    tags: ['找孩子玩'],
    tier: '转折',
    weight: 7,
    text: [
      '不知道为着什么，你跟人动了手。',
      '两边都挂了彩。大人来了，各自骂了几句。',
      '此后好些日子，那一伙人没有再叫过你。',
    ],
    effects: [
      { type: 'flag', key: 'fell-out-with-kids', value: true },
      { type: 'attribute', key: 'will', delta: 2 },
    ],
  },
]
