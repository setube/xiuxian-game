import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 少年（十三岁到十五岁）。
 *
 * 这一段的分岔在十三岁前就已经注定：进了私塾的，等着县里的院试；
 * 下地干活的，开始被送去学一门手艺。三岁看老在游戏里不是玄学——
 * 是七岁那年家里供不供得起书。
 */
export const youthScenes: SceneLibrary = {
  'youth:exam': {
    id: 'youth:exam',
    title: '院试',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        blocks: [
          { kind: 'narration', text: '年初县里贴出告示，今年开院试。' },
          { kind: 'narration', text: '先生把你叫到跟前，问你想不想去。' },
          { kind: 'dialogue', speaker: '周先生', text: '去试一试。不见得中，见识总是好的。' },
          { kind: 'narration', text: '你见他眼神里有点别的东西，但他没有说。' },
          { kind: 'narration', text: '家里的意思，全看你爹娘一句话。' },
        ],
        choices: [
          {
            id: 'go',
            label: '去考',
            echo: '你点点头。',
            effects: [
              { type: 'time', months: 5 },
              { type: 'place', place: '{province} · {prefecture} · 县学' },
              { type: 'attribute', key: 'insight', delta: 6 },
              { type: 'attribute', key: 'will', delta: 4 },
            ],
            next: 'result',
          },
          {
            id: 'stay',
            label: '不去',
            echo: '你摇了摇头。',
            effects: [
              { type: 'time', months: 1 },
              { type: 'attribute', key: 'will', delta: 2 },
              {
                type: 'relation',
                id: 'teacher',
                name: '周先生',
                delta: -4,
                note: '教了你几年书。',
              },
            ],
            next: 'stayed',
          },
        ],
      },

      result: {
        id: 'result',
        onEnter: [
          { type: 'chronicle', text: '你去了县里考院试。', tone: 'deep' },
          { type: 'place', place: '{home}' },
        ],
        blocks: [
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '放榜那天，你站在人堆里仰着头看。' },
          { kind: 'narration', text: '你的名字不在上面。' },
          { kind: 'narration', text: '你一句一句从头看到了尾，又看了一遍。还是没有。' },
          { kind: 'narration', text: '回去的路上下着雨。', tone: 'faint' },
        ],
        choices: [
          {
            id: 'again',
            label: '这一年，再读',
            echo: '你把书又翻开了。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 5 },
              { type: 'attribute', key: 'will', delta: 3 },
              {
                type: 'aspect',
                key: 'learning',
                self: '院试落了榜。你觉得自己认得字，但不大会写文章。',
              },
            ],
            next: null,
          },
          {
            id: 'quit',
            label: '不考了，回家',
            echo: '你把县里那条路走了最后一趟。',
            effects: [
              { type: 'time', months: 2 },
              { type: 'attribute', key: 'will', delta: 5 },
              { type: 'flag', key: 'quit-exam', value: true },
              {
                type: 'aspect',
                key: 'learning',
                self: '院试落了榜，你没再考。你认得字，够用了。',
              },
            ],
            next: null,
          },
        ],
      },

      stayed: {
        id: 'stayed',
        blocks: [
          { kind: 'dialogue', speaker: '周先生', text: '也好。' },
          { kind: 'narration', text: '他再没有提这件事。' },
          { kind: 'narration', text: '你后来偶尔想，如果那时去了，会怎样。', tone: 'faint' },
        ],
      },
    },
  },

  'youth:apprentice': {
    id: 'youth:apprentice',
    title: '学手艺',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'attribute', key: 'body', delta: 4 },
        ],
        blocks: [
          { kind: 'narration', text: '这一年年景不好，家里商量着要给你寻个正经出路。' },
          {
            kind: 'narration',
            text: '读书是不必提了。学门手艺，或者去铺子里当学徒，好歹算个营生。',
          },
        ],
        choices: [
          {
            id: 'craft',
            label: '跟着师傅学一门手艺',
            echo: '你拜了师傅。',
            effects: [
              { type: 'time', years: 2 },
              { type: 'identity', identity: '学徒' },
              { type: 'attribute', key: 'insight', delta: 6 },
              { type: 'attribute', key: 'body', delta: 6 },
              { type: 'attribute', key: 'will', delta: 4 },
              {
                type: 'aspect',
                key: 'learning',
                self: '你学了一门手艺。师傅说你还算灵，打出来的东西能卖钱。',
              },
              {
                type: 'knowledge',
                id: 'a-trade',
                title: '一门手艺',
                summary: '你跟着师傅学了两年，能做出拿得出手的活计。',
                category: '世事',
              },
              { type: 'flag', key: 'has-craft', value: true },
            ],
            next: 'done',
          },
          {
            id: 'shop',
            label: '去铺子里当伙计',
            echo: '你进了铺子。',
            effects: [
              { type: 'time', years: 2 },
              { type: 'identity', identity: '伙计' },
              { type: 'attribute', key: 'insight', delta: 8 },
              { type: 'attribute', key: 'fortune', delta: 4 },
              { type: 'attribute', key: 'body', delta: 2 },
              {
                type: 'aspect',
                key: 'learning',
                self: '你在铺子当伙计。会看秤，会算账，见的人多。',
              },
              { type: 'flag', key: 'has-shopwork', value: true },
            ],
            next: 'done',
          },
          {
            id: 'farm',
            label: '哪也不去，把家里的地种好',
            // 得先有地。城里破落下来的人家没有田可回，
            // 这一条对他们整条隐去——他只剩下学手艺和当伙计两条路
            requires: [{ livelihood: '务农' }],
            echo: '你把自家的活计接了过来。',
            effects: [
              { type: 'time', years: 2 },
              { type: 'identity', identity: '农家子' },
              { type: 'attribute', key: 'body', delta: 10 },
              { type: 'attribute', key: 'will', delta: 6 },
              {
                type: 'aspect',
                key: 'body',
                self: '你种了两年地。犁、耙、锄，样样都顺。',
              },
              { type: 'flag', key: 'full-farmer', value: true },
            ],
            next: 'done',
          },
        ],
      },

      done: {
        id: 'done',
        blocks: [
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '两年下来，你算是个半大的人了。', tone: 'faint' },
        ],
      },
    },
  },

  'youth:river': {
    id: 'youth:river',
    title: '临江',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        blocks: [
          { kind: 'narration', text: '{prefecture}的渡口，你早就听说过。' },
          { kind: 'narration', text: '这一天你终于得空去了一趟城。' },
          { kind: 'narration', text: '江面很宽，一眼望不到对岸。' },
          { kind: 'event', text: '这是你第一次见到这样大的水。', tone: 'deep' },
        ],
        choices: [
          {
            id: 'stand',
            label: '在渡口站着看了很久',
            echo: '你站了很久，看船来船往。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 3 },
              { type: 'attribute', key: 'fortune', delta: 1 },
              {
                type: 'knowledge',
                id: 'the-river',
                title: '临江',
                summary: '江上走船，一头通着海，一头通着关外。你头一回知道这世上有这么大的水路。',
                category: '地理',
              },
            ],
            next: 'done',
          },
          {
            id: 'ask-boatman',
            label: '向船家打听江水通到哪里',
            echo: '你跟船家搭了几句话。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 5 },
              {
                type: 'knowledge',
                id: 'the-river',
                title: '临江',
                summary:
                  '顺流三千里到海口，逆流可以走到关外。船家说，江上偶尔有古怪的船，不听风，不看水。',
                category: '地理',
              },
              {
                type: 'claim',
                key: 'learning',
                source: '船家',
                text: '你这娃儿，倒爱留心这些。',
                doubt: '你不知道他这话是夸你，还是笑你多事。',
              },
            ],
            next: 'done',
          },
          {
            id: 'leave',
            label: '看了一眼就走',
            echo: '你看了一眼，就跟着人往回走了。',
            effects: [{ type: 'time', days: 1 }],
            next: 'done',
          },
        ],
      },

      done: {
        id: 'done',
        blocks: [
          { kind: 'narration', text: '回村的路上你在想，江的那一头，是什么样子。', tone: 'faint' },
        ],
      },
    },
  },
}

export const youthEvents: readonly LifeEvent[] = [
  {
    // 辍学的人 schooled 已被改回 false，不必再写一条排除条件。
    // 本朝女子不应举，所以这一卷她这辈子都不会遇到——
    // 这不是设定上的偷懒，是那个世道本来的样子
    id: 'youth-exam',
    window: { from: 13, to: 16 },
    requires: [{ flag: { key: 'schooled', equals: true } }, { gender: '男' }],
    scene: 'youth:exam',
    weight: 5,
  },
  {
    id: 'youth-apprentice',
    window: { from: 13, to: 16 },
    requires: [{ flag: { key: 'working', equals: true } }],
    scene: 'youth:apprentice',
    weight: 6,
  },
  {
    // 谁都可以去一次渡口。去没去成、看了多少，全看那几年怎么过的
    id: 'youth-river',
    window: { from: 13, to: 16 },
    scene: 'youth:river',
    weight: 5,
  },
]
