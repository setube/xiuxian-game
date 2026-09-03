import type { SceneLibrary } from '@/types/game'

/**
 * 日常。
 *
 * 年表挑不出事的时候，人就回到这里。这不是填充物——
 * 一生中绝大多数年头本来就什么也没发生，你只是在过日子。
 *
 * 两条硬规矩：
 *
 * 1. **每个选项都必须花掉时间。** 时间是这局游戏里唯一真正稀缺的东西，
 *    也是日常的唯一出口：不耗时间，年表永远抽不到下一件事，人就卡在原地。
 * 2. **日常改变的是你是谁，不是你有什么。** 下了三年地和读了三年书，
 *    区别不在数值高低，在于十六岁那年站在渡口上的是两个不同的人。
 */
export const routineScenes: SceneLibrary = {
  'routine:child': {
    id: 'routine:child',
    title: '这些日子',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        // 抬头看一眼外头。一年一两句，攒十几年——
        // 玩家那份世界模型就是这么一点一点拼出来的
        onEnter: [{ type: 'signs', limit: 1 }],
        blocks: [
          { kind: 'narration', text: '日子一天一天过去。' },
          { kind: 'narration', text: '你还太小，帮不上什么忙，也没人管你。' },
        ],
        choices: [
          {
            id: 'follow-mother',
            label: '整日跟着{dam}',
            echo: '你整日跟在母亲身后。',
            effects: [
              { type: 'time', months: 8 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'relation', id: 'mother', name: '母亲', delta: 6 },
            ],
            next: null,
          },
          {
            id: 'run',
            label: '在外面疯跑',
            echo: '你成天在外面跑。',
            effects: [
              { type: 'time', months: 8 },
              { type: 'attribute', key: 'body', delta: 3 },
              { type: 'attribute', key: 'fortune', delta: 1 },
            ],
            next: null,
          },
          {
            id: 'alone',
            label: '一个人待着',
            echo: '你常常一个人待着。',
            effects: [
              { type: 'time', months: 8 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'attribute', key: 'insight', delta: 1 },
            ],
            next: null,
          },
        ],
      },
    },
  },

  'routine:youth': {
    id: 'routine:youth',
    title: '这一年',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'signs' }],
        blocks: [{ kind: 'narration', text: '又是一年。' }],
        branches: [{ requires: [{ flag: { key: 'schooled', equals: true } }], next: 'student' }],
        next: 'worker',
      },

      student: {
        id: 'student',
        blocks: [
          { kind: 'narration', text: '早上去私塾，午后散学。回来还要帮家里做点事。' },
          { kind: 'narration', text: '这一年没有什么特别的。' },
        ],
        choices: [
          {
            id: 'study',
            label: '把心思放在书上',
            echo: '这一年你都在念书。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 6 },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: null,
          },
          {
            id: 'help',
            label: '散学后多帮家里干活',
            echo: '散学之后你都在家里帮工。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'attribute', key: 'body', delta: 5 },
              { type: 'household', standing: 2 },
            ],
            next: null,
          },
          {
            id: 'wander',
            label: '跟同窗到处乱跑',
            echo: '你跟几个同窗把附近跑了个遍。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'attribute', key: 'body', delta: 2 },
              { type: 'attribute', key: 'fortune', delta: 4 },
            ],
            next: null,
          },
        ],
      },

      worker: {
        id: 'worker',
        blocks: [
          { kind: 'narration', text: '天不亮就起，天黑才回。' },
          { kind: 'narration', text: '这一年没有什么特别的。' },
        ],
        choices: [
          {
            id: 'field',
            label: '一年都在地里',
            echo: '这一年你都在地里。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'body', delta: 7 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'household', standing: 2 },
            ],
            next: null,
          },
          {
            id: 'watch',
            label: '跟着大人学看天色、认路、辨草木',
            echo: '你留心跟人学了些看天认路的门道。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 5 },
              { type: 'attribute', key: 'body', delta: 3 },
            ],
            next: null,
          },
          {
            id: 'hills',
            label: '农闲时往山里跑',
            echo: '农闲的时候你老往山里跑。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'body', delta: 5 },
              { type: 'attribute', key: 'fortune', delta: 4 },
            ],
            next: null,
          },
        ],
      },
    },
  },

  'routine:teen': {
    id: 'routine:teen',
    title: '这一年',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'signs' }],
        blocks: [
          { kind: 'narration', text: '你个子高了不少，家里人说话开始带上你了。' },
          { kind: 'narration', text: '这一年要怎么过，多少能由自己说了算。' },
        ],
        choices: [
          {
            id: 'earn',
            label: '出去做工，挣几个钱',
            hint: '家里能松一口气',
            echo: '这一年你在外面做工。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'body', delta: 5 },
              { type: 'attribute', key: 'will', delta: 4 },
              { type: 'household', standing: 5, debt: -4 },
            ],
            next: null,
          },
          {
            id: 'train',
            label: '天天练力气',
            echo: '你天天在院子里折腾自己。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'body', delta: 9 },
              { type: 'attribute', key: 'will', delta: 4 },
            ],
            next: null,
          },
          {
            id: 'town',
            label: '有空就往城里跑',
            hint: '路远，来回要两日',
            echo: '你一有空就往城里跑。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 6 },
              { type: 'attribute', key: 'fortune', delta: 5 },
              { type: 'household', standing: -2 },
            ],
            next: null,
          },
          {
            id: 'read',
            label: '把认得的那些字捡起来',
            requires: [{ knowledge: 'literacy' }],
            echo: '你把丢下的书又翻了出来。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 8 },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: null,
          },
        ],
      },
    },
  },

  /**
   * 成年之后的日子。
   *
   * ## 这一卷现在走不到，而这不是漏接
   *
   * `verify.ts` 第五道会把它印进「三百世没人走到」的名单，每一批都在。
   * 别的名单成员是稀——`seek:crossed` 那两卷千分之三，三百世轮不到一个人。
   * 这一卷不一样：它走不到是四个数字凑出来的，凑法写在第六道里。
   *
   *     收尾事件　window 16–99，没有 requires　　到了年纪就一直在候选池里
   *     收尾那一卷　跳转全在卷内　　　　　　　　 演到它就一定演到底，一定 finish()
   *     stageOf　　16 岁仍算「少年」，17 岁才「成年」
   *     连演上限　 顶满要四卷不给玩家落笔，而那些卷的窗口都封顶在 16 岁
   *
   * 前两条堵住「年表抽不出事」，后两条堵住「连演顶到上限」——
   * `enterRoutine()` 只有这两个入口，两条都堵着，人就到不了这一卷。
   *
   * ## 这里原先写错过一次，值得留个记号
   *
   * 原话是「十六岁那年收尾事件必被抽中，所以证得出永远是零」。**那句是错的**：
   * 十六岁之后还有二十来件散事件，权重合起来两百多，收尾权重 1000——
   * 单轮被挤掉的概率将近两成，人照样能活到十七岁。
   *
   * 真正管用的不是「必被抽中」，是**它永远在候选池里**：池子不空，
   * `pickEvent` 就不会返回 null，「年表抽不出事」那条路根本不会发生。
   * 抽中与否无所谓——**差一点就把一条侥幸当成了证明**。
   *
   * 留着它不是忘了删：`lifeRoutine` 的类型要求四个阶段各有一卷，
   * 而凡人这一段总有一天会往后延。**它现在的作用是替那一天占着位子**。
   * 而占位内容没有检查地躺着就会变成隐藏债务——哪天调了年龄分档，
   * 它会从死内容变成活入口，玩家读到一段没人设计过的人生，
   * 却没有任何东西喊一声。第六道就是那个喊的人。
   */
  'routine:adult': {
    id: 'routine:adult',
    title: '此后',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'signs' }],
        blocks: [
          { kind: 'narration', text: '你成年了。' },
          { kind: 'narration', text: '此后的日子，跟村里所有人一样，一年接着一年。' },
        ],
        choices: [
          {
            id: 'live',
            label: '就这样过下去',
            echo: '你就这样过了下去。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: null,
          },
        ],
      },
    },
  },
}
