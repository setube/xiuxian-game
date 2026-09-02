import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 爹娘的过去。
 *
 * 这一册要证明的事只有一件：**父母不是为了玩家而存在的两块牌子。**
 *
 * 沈怀山十八岁跟商队去过北方，二十一岁在路上遇见过一个落魄修士。
 * 这两件事从发生那天起就是真的——写在他的 history 里，
 * 只是 `known: false`。玩家可能到十六岁才第一次听说，也可能一辈子不知道。
 *
 * 所以这里没有一卷是「解锁父亲背景故事」。它们都是**闲聊**：
 * 一场雨、一坛酒、一件旧衣裳，话赶话说到了那儿。
 * 说不到就没说到，那件事照样在他身上。
 *
 * 最要紧的是 `dad:adept` 那一卷：**你爹见过修士，而他一辈子没跟你提过。**
 * 玩家十六岁在渡口撞见青衫人时，如果早知道这件事，
 * 整个凡人阶段的意味都不一样了。
 */
export const kinScenes: SceneLibrary = {
  'dad:north': {
    id: 'dad:north',
    title: '北边',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '连着下了三天雨，地里去不了。' },
          { kind: 'narration', text: '父亲在檐下修一把锄头，你蹲在旁边看。' },
          { kind: 'narration', text: '他忽然说，这天气跟北边不一样。' },
          { kind: 'narration', text: '你问北边怎么不一样。他停了一下，像是有点后悔说了这句。' },
        ],
        choices: [
          {
            id: 'press',
            label: '追问下去',
            echo: '你缠着他问。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'recall', id: 'father', chapter: 'north-journey' },
              { type: 'meet', id: 'father', delta: 6 },
              { type: 'attribute', key: 'insight', delta: 3 },
              {
                type: 'knowledge',
                id: 'the-north',
                title: '北边',
                summary: '父亲年轻时跟商队去过。他说那边的雪能埋到腰，风刮起来像刀子。',
                category: '地理',
              },
            ],
            next: 'told',
          },
          {
            id: 'quiet',
            label: '不问了',
            echo: '你没有再问。',
            effects: [{ type: 'time', days: 1 }],
            next: 'untold',
          },
        ],
      },

      told: {
        id: 'told',
        blocks: [
          { kind: 'narration', text: '他放下锄头，想了很久。' },
          { kind: 'dialogue', speaker: '父亲', text: '十八岁那年，跟商队走过一趟。' },
          { kind: 'narration', text: '他说那边的雪能埋到腰，风刮起来像刀子。' },
          { kind: 'narration', text: '走了大半年，回来的时候人瘦得他娘都没认出来。' },
          { kind: 'event', text: '你从来不知道父亲去过那么远的地方。' },
          { kind: 'narration', text: '他说完就不说了，接着修那把锄头。' },
          {
            kind: 'narration',
            text: '你忽然发现，爹在当爹之前，也是个会到处乱跑的年轻人。',
            tone: 'faint',
          },
        ],
      },

      untold: {
        id: 'untold',
        blocks: [
          { kind: 'narration', text: '他也没有再提。' },
          { kind: 'narration', text: '雨停了，他把锄头扛起来，出门去了。' },
          { kind: 'narration', text: '这件事你后来一直没想起来问。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 你爹见过修士。
   *
   * 全作最有分量的一次「多年以后才明白」，而且它不是关于一件东西，
   * 是关于一个人——你从小认识、天天见面、以为自己了解的那个人。
   *
   * 条件写了必须先知道北方那一趟：话得说到那儿才说得下去。
   * 一层一层往里剥，这才是了解一个人的样子。
   */
  'dad:adept': {
    id: 'dad:adept',
    title: '他没提过的那个人',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '过年那几天，家里来了客，父亲喝了点酒。' },
          { kind: 'narration', text: '客人走后他还坐在桌边，脸是红的，话比平时多。' },
          { kind: 'narration', text: '你顺口又问起北边的事。' },
          { kind: 'narration', text: '他笑了一下，说起路上遇见过一个怪人。' },
        ],
        choices: [
          {
            id: 'ask',
            label: '问那是个什么人',
            critical: true,
            echo: '你问：什么样的怪人？',
            effects: [
              { type: 'time', days: 1 },
              { type: 'recall', id: 'father', chapter: 'met-adept' },
              { type: 'meet', id: 'father', delta: 10 },
              { type: 'attribute', key: 'insight', delta: 4 },
              {
                type: 'knowledge',
                id: 'cultivators-exist',
                title: '修士',
                summary:
                  '这世上有一种人，不是官，不是江湖人。父亲年轻时在路上遇见过一个，同行了几日。他说那人不怎么吃东西。',
                category: '修行',
              },
              { type: 'flag', key: 'heard-of-cultivators', value: true },
              { type: 'flag', key: 'father-met-adept', value: true },
              {
                type: 'chronicle',
                text: '你才知道，父亲年轻时遇见过一个修士。',
                tone: 'cinnabar',
              },
            ],
            next: 'the-story',
          },
          {
            id: 'later',
            label: '他喝多了，扶他去睡',
            echo: '你扶他进屋去了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'meet', id: 'father', delta: 4 },
            ],
            next: 'slept',
          },
        ],
      },

      'the-story': {
        id: 'the-story',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '父亲把杯子推开，两只手放在桌上。' },
          { kind: 'dialogue', speaker: '父亲', text: '同行了四五天。他穿得破，可是不脏。' },
          { kind: 'narration', text: '他说那人几乎不吃东西，也不睡觉，夜里就坐着。' },
          { kind: 'narration', text: '有一回商队的车陷进泥里，七八个人推不动。' },
          { kind: 'dialogue', speaker: '父亲', text: '他一只手按在车辕上。' },
          { kind: 'event', text: '车就出来了。', tone: 'cinnabar' },
          { kind: 'narration', text: '你问后来呢。' },
          { kind: 'dialogue', speaker: '父亲', text: '第二天早上人就不见了。' },
          { kind: 'narration', text: '他沉了很久，又说了一句。' },
          { kind: 'dialogue', speaker: '父亲', text: '那种人，跟咱们不是一路的。' },
          { kind: 'divider', variant: 'ink' },
          {
            kind: 'narration',
            text: '第二天他酒醒了，再问就说记不清了。此后再没提过。',
            tone: 'faint',
          },
          {
            kind: 'narration',
            text: '你在这个家里活了十几年，从来不知道爹见过这样的人。',
            tone: 'deep',
          },
        ],
      },

      slept: {
        id: 'slept',
        blocks: [
          { kind: 'narration', text: '他倒在炕上就睡着了，嘴里还在含混地说着什么。' },
          { kind: 'narration', text: '你听见「不是一路的」几个字，别的没听清。' },
          { kind: 'narration', text: '第二天他什么也不记得了。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 娘也不是天生就是娘。
   *
   * 比父亲那两卷轻，但少了它，母亲就成了灶台边一个没有过去的影子。
   */
  'mom:past': {
    id: 'mom:past',
    title: '娘家',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 1 },
          { type: 'meet', id: 'mother', delta: 8 },
        ],
        blocks: [
          { kind: 'narration', text: '母亲在收拾箱子，翻出一件旧衣裳。' },
          { kind: 'narration', text: '料子比家里现在用的好，只是旧得发白了。' },
          { kind: 'narration', text: '她拿在手里看了很久，然后叠好放了回去。' },
          { kind: 'narration', text: '你问那是什么。' },
        ],
        // 她说什么，取决于她自己有过什么样的人生
        branches: [{ requires: [{ flag: { key: 'mom-told', equals: '娘家' } }], next: 'told' }],
        next: 'roll',
      },

      roll: {
        id: 'roll',
        onEnter: [
          // 说到哪一件，看她身上有哪一件。这一掷玩家看不见
          {
            type: 'roll',
            key: 'mom-told',
            among: [
              { value: '娘家', weight: 30 },
              { value: '认字', weight: 22 },
              { value: '荒年', weight: 26 },
              { value: '不说', weight: 22 },
            ],
          },
        ],
        blocks: [],
        branches: [
          { requires: [{ flag: { key: 'mom-told', equals: '娘家' } }], next: 'told' },
          { requires: [{ flag: { key: 'mom-told', equals: '认字' } }], next: 'letters' },
          { requires: [{ flag: { key: 'mom-told', equals: '荒年' } }], next: 'famine' },
        ],
        next: 'silent',
      },

      told: {
        id: 'told',
        onEnter: [
          { type: 'recall', id: 'mother', chapter: 'mother-far-home' },
          { type: 'attribute', key: 'insight', delta: 2 },
        ],
        blocks: [
          { kind: 'dialogue', speaker: '母亲', text: '出嫁时穿的。' },
          { kind: 'narration', text: '她说娘家在很远的地方，走水路要十几天。' },
          { kind: 'narration', text: '嫁过来以后就没回去过。' },
          { kind: 'narration', text: '你问为什么不回去。她说太远了，也没什么好回的。' },
          { kind: 'narration', text: '说完就去做饭了。', tone: 'faint' },
        ],
      },

      letters: {
        id: 'letters',
        onEnter: [
          { type: 'recall', id: 'mother', chapter: 'mother-learned' },
          { type: 'attribute', key: 'memory', delta: 2 },
        ],
        blocks: [
          { kind: 'dialogue', speaker: '母亲', text: '早先的东西了。' },
          { kind: 'narration', text: '她忽然说，她小时候跟兄长认过几个字。' },
          { kind: 'narration', text: '你很吃惊——你从没见她拿过笔。' },
          { kind: 'narration', text: '她笑了笑，说早忘光了。' },
          {
            kind: 'narration',
            text: '可是那天晚上，你看见她用手指在桌上划了几下。',
            tone: 'faint',
          },
        ],
      },

      famine: {
        id: 'famine',
        onEnter: [
          { type: 'recall', id: 'mother', chapter: 'mother-famine' },
          { type: 'attribute', key: 'will', delta: 3 },
        ],
        blocks: [
          { kind: 'dialogue', speaker: '母亲', text: '逃荒那年带出来的。' },
          { kind: 'narration', text: '她说她九岁那年发大荒，一路往南走了两个月。' },
          { kind: 'narration', text: '同村出来三十几口，到地方剩了不到一半。' },
          { kind: 'narration', text: '她说这些的时候语气很平，像在说别人家的事。' },
          { kind: 'narration', text: '你后来才明白她为什么从不肯剩饭。', tone: 'deep' },
        ],
      },

      silent: {
        id: 'silent',
        blocks: [
          { kind: 'dialogue', speaker: '母亲', text: '没什么。旧东西。' },
          { kind: 'narration', text: '她把箱子盖上了。' },
          { kind: 'narration', text: '你没有再问。', tone: 'faint' },
        ],
      },
    },
  },
}

export const kinEvents: readonly LifeEvent[] = [
  {
    // 话赶话说到那儿的事。撞不上就撞不上，那件事照样在他身上
    id: 'dad-north',
    window: { from: 8, to: 16 },
    requires: [{ family: { id: 'father', alive: true } }],
    scene: 'dad:north',
    weight: 7,
  },
  {
    /**
     * 得先知道北方那一趟，话才说得到修士身上。
     *
     * 一层一层往里剥——这才是了解一个人的样子，
     * 不是点开「父亲」看到一栏完整履历。
     */
    id: 'dad-adept',
    window: { from: 11, to: 16 },
    requires: [{ family: { id: 'father', alive: true } }, { knowledge: 'the-north' }],
    scene: 'dad:adept',
    weight: 6,
  },
  {
    id: 'mom-past',
    window: { from: 9, to: 16 },
    requires: [{ family: { id: 'mother', alive: true } }],
    scene: 'mom:past',
    weight: 6,
  },
]
