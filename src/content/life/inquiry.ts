import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 打听。
 *
 * 这一卷是整套设计里第一次**玩家自己提出问题**，而不是回答系统的问题。
 *
 * 从前的循环是：
 *
 *   事件找上门 → 给你三个选项 → 你挑一个
 *
 * 这一卷是：
 *
 *   你看见了什么 → 你自己觉得不对劲 → 你决定去问谁 → 问出的是他的说法
 *
 * ## 问出来的不是真相
 *
 * 同一个「今年米价如何」，爹说「是贵了些，省着吃」，
 * 掌柜说「你别多问」，老人扯起几十年前的荒年，
 * 差役说「仍在官府限价之内」——**而街口那家米铺已经三天没开门了。**
 *
 * 四句话都不假，四句话拼不出真相。玩家得自己判断信谁，
 * 而且他可能判断错。
 *
 * ## 什么都不问也是一种选择
 *
 * 所以这一卷永远留着「接着干活去」那一条。世界把征象推到他面前，
 * 然后闭嘴——问不问、问谁、信不信，全是他自己的事。
 */
export const inquiryScenes: SceneLibrary = {
  'ask:around': {
    id: 'ask:around',
    title: '打听',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        // 先让他看见点什么。没有征象就没有疑问，没有疑问就不会去问
        onEnter: [{ type: 'signs', limit: 1 }],
        blocks: [{ kind: 'narration', text: '这阵子你总觉得有点不对。' }],
        choices: [
          {
            id: 'ask-elder',
            label: '问家里的大人',
            hint: '他多半不肯细说',
            requires: [{ bond: { kind: '抚养', alive: true } }],
            echo: '你问了{elder}。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'ask', who: 'elder', about: '年景' },
            ],
            next: 'after',
          },
          {
            id: 'ask-neighbour',
            label: '去问村里的老人',
            hint: '他话多',
            requires: [{ age: { atLeast: 6 } }],
            echo: '你跑去找村里那位老人。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'ask', who: 'neighbour', about: '年景' },
            ],
            next: 'after',
          },
          {
            id: 'ask-dealer',
            label: '去米铺看看',
            hint: '掌柜未必肯跟你说',
            requires: [{ age: { atLeast: 8 } }],
            echo: '你在米铺门口站了一会儿，跟掌柜搭了句话。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'ask', who: 'grain-dealer', about: '年景' },
            ],
            next: 'after',
          },
          {
            /** 什么都不做，也是一种选择。世界不会因此责怪他 */
            id: 'let-it-be',
            label: '接着干活去',
            echo: '你没有多想。',
            effects: [{ type: 'time', days: 1 }],
            next: 'after',
          },
        ],
      },

      after: {
        id: 'after',
        onEnter: [{ type: 'time', months: 2 }],
        blocks: [
          {
            kind: 'narration',
            text: '日子照旧往下过。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 村口那些人是谁。
   *
   * 感知层给了他一句「村口这阵子常有陌生人过」，
   * 而寻常人的理解是「过路的客商」——**那是错的**。
   * 这一卷让他有机会去查证，但也可能查不出来。
   */
  'ask:strangers': {
    id: 'ask:strangers',
    title: '村口的人',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        blocks: [
          { kind: 'narration', text: '村口那几个陌生人还没走。' },
          { kind: 'narration', text: '他们在树底下坐着，带的东西不多。' },
        ],
        choices: [
          {
            id: 'look',
            label: '走近些，看他们带了什么',
            echo: '你绕过去看了看。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 3 },
              {
                type: 'knowledge',
                id: 'refugees',
                title: '村口那些人',
                summary: '他们带的东西很少，都是些锅碗和铺盖。孩子光着脚。',
                contact: '见过',
                category: '世事',
              },
            ],
            next: 'looked',
          },
          {
            id: 'ask-old',
            label: '问村里的老人他们是什么人',
            requires: [{ age: { atLeast: 6 } }],
            echo: '你去问了村里那位老人。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'ask', who: 'neighbour', about: '生人' },
            ],
            next: 'looked',
          },
          {
            id: 'ignore',
            label: '绕开走',
            echo: '你绕开了。',
            effects: [{ type: 'time', days: 1 }],
            next: 'looked',
          },
        ],
      },

      looked: {
        id: 'looked',
        onEnter: [{ type: 'time', months: 1 }],
        blocks: [
          { kind: 'narration', text: '过了几日，那些人不见了。' },
          { kind: 'narration', text: '又过了几日，来了另外几个。', tone: 'faint' },
        ],
      },
    },
  },
}

export const inquiryEvents: readonly LifeEvent[] = [
  {
    /**
     * 世道有点不对的时候，他才会起疑心。
     *
     * 太平年景不会有这一卷——**没有征象就没有疑问**，
     * 一个孩子不会无缘无故跑去问米价。
     */
    id: 'ask-around',
    window: { from: 7, to: 16 },
    requires: [{ region: { grain: { atLeast: 128 } } }],
    scene: 'ask:around',
    weight: 16,
  },
  {
    id: 'ask-strangers',
    window: { from: 6, to: 16 },
    requires: [{ region: { order: { atMost: 44 } } }],
    scene: 'ask:strangers',
    weight: 14,
  },
]
