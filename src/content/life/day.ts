import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 一天。
 *
 * 到这一卷为止，玩家所有的行为都是**被事件叫出来的**：年表挑中一卷，
 * 他在里面做选择。这一卷反过来——没有人叫他，**他自己决定今天干什么**。
 *
 * 一天分三段，每段自己挑一个去处。而绝大多数时候的结果是
 * 「没什么特别的」：割了半晌草、念了一上午旧课、在门槛上坐到天黑。
 * 那不是缺内容，是立场——**每次行动都给奖励，那是操作游戏，不是人生。**
 *
 * 也正因为绝大多数日子什么也没发生，那些真的改变了什么的日子才显得要紧。
 *
 * ## 去哪儿决定你可能撞上什么
 *
 * 每一段结算完都看一眼 `day-omen`：山那边才有山道上那个人，
 * 镇上才有货郎摊上那册书。撞上了，这一天就整个交给它——
 * 机缘不是年表发下来的，是**他自己走过去的**。
 */
export const dayScenes: SceneLibrary = {
  'day:ordinary': {
    id: 'day:ordinary',
    title: '这一天',
    entry: 'morning',
    nodes: {
      // —— 上午：他自己挑一个去处 ——
      morning: {
        id: 'morning',
        onEnter: [{ type: 'signs', limit: 1 }],
        blocks: [
          { kind: 'narration', text: '天亮了。' },
          { kind: 'narration', text: '今天没有人指派你做什么。' },
        ],
        choices: [
          {
            id: 'work',
            label: '帮家里干活',
            echo: '你去帮家里干活。',
            effects: [{ type: 'flag', key: 'day-上午', value: 'work' }],
            next: 'morning-out',
          },
          {
            id: 'school',
            label: '去私塾',
            requires: [{ flag: { key: 'schooled', equals: true } }],
            echo: '你去了私塾。',
            effects: [{ type: 'flag', key: 'day-上午', value: 'school' }],
            next: 'morning-out',
          },
          {
            id: 'town',
            label: '去镇上',
            echo: '你往镇上去了。',
            effects: [{ type: 'flag', key: 'day-上午', value: 'town' }],
            next: 'morning-out',
          },
          {
            id: 'hill',
            label: '往山那边走走',
            echo: '你往山那边去了。',
            effects: [{ type: 'flag', key: 'day-上午', value: 'hill' }],
            next: 'morning-out',
          },
          {
            id: 'kids',
            label: '找村里的孩子玩',
            echo: '你跑出去找人玩。',
            effects: [{ type: 'flag', key: 'day-上午', value: 'kids' }],
            next: 'morning-out',
          },
          {
            id: 'home',
            label: '待在家里',
            echo: '你待在家里。',
            effects: [{ type: 'flag', key: 'day-上午', value: 'home' }],
            next: 'morning-out',
          },
          {
            id: 'idle',
            label: '什么也不做',
            echo: '你什么也没做。',
            effects: [{ type: 'flag', key: 'day-上午', value: 'idle' }],
            next: 'morning-out',
          },
        ],
      },

      // 世界回应他这一段。撞上一件事，这一天就交给它
      'morning-out': {
        id: 'morning-out',
        onEnter: [{ type: 'daily', slot: '上午' }],
        blocks: [],
        branches: [
          { requires: [{ flag: { key: 'day-omen', equals: 'wounded' } }], next: 'omen:wounded' },
          { requires: [{ flag: { key: 'day-omen', equals: 'book' } }], next: 'omen:book' },
          { requires: [{ flag: { key: 'day-omen', equals: 'merchant' } }], next: 'omen:merchant' },
        ],
        next: 'afternoon',
      },

      // —— 下午：他自己挑一个去处 ——
      afternoon: {
        id: 'afternoon',
        blocks: [{ kind: 'narration', text: '过了晌午。' }],
        choices: [
          {
            id: 'work',
            label: '帮家里干活',
            echo: '你去帮家里干活。',
            effects: [{ type: 'flag', key: 'day-下午', value: 'work' }],
            next: 'afternoon-out',
          },
          {
            id: 'school',
            label: '去私塾',
            requires: [{ flag: { key: 'schooled', equals: true } }],
            echo: '你去了私塾。',
            effects: [{ type: 'flag', key: 'day-下午', value: 'school' }],
            next: 'afternoon-out',
          },
          {
            id: 'town',
            label: '去镇上',
            echo: '你往镇上去了。',
            effects: [{ type: 'flag', key: 'day-下午', value: 'town' }],
            next: 'afternoon-out',
          },
          {
            id: 'hill',
            label: '往山那边走走',
            echo: '你往山那边去了。',
            effects: [{ type: 'flag', key: 'day-下午', value: 'hill' }],
            next: 'afternoon-out',
          },
          {
            id: 'elder',
            label: '找{elder}说话',
            requires: [{ bond: { kind: '抚养', alive: true } }],
            echo: '你去找{elder}说话。',
            effects: [{ type: 'flag', key: 'day-下午', value: 'elder' }],
            next: 'afternoon-out',
          },
          {
            id: 'kids',
            label: '找村里的孩子玩',
            echo: '你跑出去找人玩。',
            effects: [{ type: 'flag', key: 'day-下午', value: 'kids' }],
            next: 'afternoon-out',
          },
          {
            id: 'home',
            label: '待在家里',
            echo: '你待在家里。',
            effects: [{ type: 'flag', key: 'day-下午', value: 'home' }],
            next: 'afternoon-out',
          },
          {
            id: 'idle',
            label: '什么也不做',
            echo: '你什么也没做。',
            effects: [{ type: 'flag', key: 'day-下午', value: 'idle' }],
            next: 'afternoon-out',
          },
        ],
      },

      // 世界回应他这一段。撞上一件事，这一天就交给它
      'afternoon-out': {
        id: 'afternoon-out',
        onEnter: [{ type: 'daily', slot: '下午' }],
        blocks: [],
        branches: [
          { requires: [{ flag: { key: 'day-omen', equals: 'wounded' } }], next: 'omen:wounded' },
          { requires: [{ flag: { key: 'day-omen', equals: 'book' } }], next: 'omen:book' },
          { requires: [{ flag: { key: 'day-omen', equals: 'merchant' } }], next: 'omen:merchant' },
        ],
        next: 'evening',
      },

      // —— 傍晚：他自己挑一个去处 ——
      evening: {
        id: 'evening',
        blocks: [{ kind: 'narration', text: '天开始暗下来。' }],
        choices: [
          {
            id: 'elder',
            label: '找{elder}说话',
            requires: [{ bond: { kind: '抚养', alive: true } }],
            echo: '你去找{elder}说话。',
            effects: [{ type: 'flag', key: 'day-傍晚', value: 'elder' }],
            next: 'evening-out',
          },
          {
            id: 'home',
            label: '待在家里',
            echo: '你待在家里。',
            effects: [{ type: 'flag', key: 'day-傍晚', value: 'home' }],
            next: 'evening-out',
          },
          {
            id: 'idle',
            label: '什么也不做',
            echo: '你什么也没做。',
            effects: [{ type: 'flag', key: 'day-傍晚', value: 'idle' }],
            next: 'evening-out',
          },
        ],
      },

      // 世界回应他这一段。撞上一件事，这一天就交给它
      'evening-out': {
        id: 'evening-out',
        onEnter: [{ type: 'daily', slot: '傍晚' }],
        blocks: [],
        branches: [
          { requires: [{ flag: { key: 'day-omen', equals: 'wounded' } }], next: 'omen:wounded' },
          { requires: [{ flag: { key: 'day-omen', equals: 'book' } }], next: 'omen:book' },
          { requires: [{ flag: { key: 'day-omen', equals: 'merchant' } }], next: 'omen:merchant' },
        ],
        next: 'close',
      },

      /**
       * 一天过去了。
       *
       * 时间在这里一次性扣掉——一天就是一天，不必把它切成三段账。
       * 这一节刻意不做总结：**没有人会在睡前给自己的一天打分。**
       */
      close: {
        id: 'close',
        /**
         * 一天过完了。
         *
         * 时间在这里扣掉的不止一天——**日录记的是被拎出来的那些天，
         * 不是每一天**。一年三百六十日全写进去，既读不完，
         * 人生也走不动：十六年是五千八百多天，年表推不到那么远。
         *
         * 所以这一卷是「这一年里的某一天」，后面那句
         * 「后来的日子跟这一天差不多」把其余的时间一并交代掉。
         */
        onEnter: [{ type: 'time', days: 1 }, { type: 'diary' }, { type: 'time', months: 3 }],
        blocks: [
          { kind: 'narration', text: '这一天过去了。' },
          { kind: 'narration', text: '后来的日子跟这一天差不多。', tone: 'faint' },
        ],
      },
    },
  },
}

/**
 * 什么时候会摊上这样一天。
 *
 * 权重压得比机缘还高：**这才是人生里最常发生的事。**
 * 从记事起到十六岁都可能落到这一卷上，而落到这一卷
 * 并不意味着「今天没事发生」——恰恰相反，
 * 那些真正改变人生的事，多半是他自己走过去撞上的。
 */
export const dayEvents: readonly LifeEvent[] = [
  {
    id: 'day-ordinary',
    window: { from: 7, to: 16 },
    scene: 'day:ordinary',
    // 一个人过的日子成千上万。它要是只能发生一次，日录里就只会躺着一条
    repeatable: true,
    weight: 9,
  },
]
