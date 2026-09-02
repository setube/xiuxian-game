import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 走与不走。
 *
 * 这一册是「念头反过来影响行动」的最小验证，只做一个念头：**想离开**。
 *
 * ## 三条硬规矩
 *
 * ### 一、念头不得创造世界事实
 *
 * 商队本来就要走，短工本来就在招。**世界不因为玩家想要什么而配合他。**
 * 所以这几卷的入场条件里一个念头也没有——它们对所有人都开着。
 *
 * ### 二、选项一个也不多给
 *
 * 想离开的人和想守着家的人，在这里看见的是**同一组选项**。
 * 念头只改一样：他读到的那句话。而读法不同，落笔自然不同——
 * **那是玩家自己下的手，不是引擎替他下的。**
 *
 * ### 三、有一个念头 ≠ 必须实现这个念头
 *
 * 想走了很多年最后没走成的人，比走成的人多得多。
 * 这一卷要跑得出那种人生，否则「念头」就成了隐藏任务。
 */
export const leavingScenes: SceneLibrary = {
  /**
   * 镇上招短工。
   *
   * 这一卷对所有人开着。管事的不认得谁，也不问谁心里想什么。
   */
  'leave:hiring': {
    id: 'leave:hiring',
    title: '招短工',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 2 },
          { type: 'reading', opening: 'hiring' },
        ],
        blocks: [],
        choices: [
          {
            /**
             * 去问一句。
             *
             * `toward-leaving` 记的是**他做过什么**，不是他想什么。
             * 一个从没动过离乡念头、却恰好来问过两回的人，
             * 日后照样会被管事的记住——世界认的是脸，不是心思。
             */
            id: 'ask',
            label: '去问问是什么活',
            echo: '你去问了一句。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'flag', key: 'toward-leaving', value: true },
              { type: 'attribute', key: 'insight', delta: 1 },
              { type: 'meet', id: 'caravan-boss', calls: '货栈的管事', delta: 4 },
            ],
            next: 'asked',
          },
          {
            id: 'work',
            label: '接下来做几天',
            hint: '耗 半月',
            echo: '你在货栈做了几天短工。',
            effects: [
              { type: 'time', days: 15 },
              { type: 'flag', key: 'toward-leaving', value: true },
              { type: 'household', standing: 2 },
              { type: 'attribute', key: 'body', delta: 1 },
              { type: 'meet', id: 'caravan-boss', calls: '货栈的管事', delta: 8 },
            ],
            next: 'worked',
          },
          {
            id: 'pass',
            label: '没去',
            echo: '你没有去。',
            effects: [{ type: 'time', days: 1 }],
            next: null,
          },
        ],
      },

      asked: {
        id: 'asked',
        blocks: [
          { kind: 'narration', text: '管事的把活计说了一遍：装卸、看车、跑腿。' },
          { kind: 'dialogue', text: '要人的时候我叫你。' },
          { kind: 'narration', text: '他记住了你的脸，没记住你的名字。', tone: 'faint' },
        ],
      },

      worked: {
        id: 'worked',
        blocks: [
          { kind: 'narration', text: '装卸、看车、跑腿。半个月下来手上都是口子。' },
          { kind: 'narration', text: '管事的说你还算实在。' },
          { kind: 'narration', text: '走的时候他多给了两文。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 商队要走了。
   *
   * 入场只看 `toward-leaving`——**那是他自己攒出来的**，
   * 不是念头替他攒的。他去问过、去做过，管事的才认得他。
   */
  'leave:caravan': {
    id: 'leave:caravan',
    title: '车队后日动身',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 2 },
          { type: 'reading', opening: 'caravan' },
        ],
        blocks: [],
        choices: [
          {
            id: 'go',
            label: '跟着去',
            critical: true,
            hint: '少说两个月',
            echo: '你跟车队走了。',
            effects: [
              { type: 'time', months: 3 },
              { type: 'flag', key: 'went-with-caravan', value: true },
              { type: 'attribute', key: 'body', delta: 4 },
              { type: 'attribute', key: 'insight', delta: 5 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'household', standing: 3 },
              {
                type: 'knowledge',
                id: 'the-road-north',
                title: '往北那条道',
                summary: '出了府往北，路上要走两个月。你自己走过一趟。',
                category: '地理',
                contact: '亲历',
                interpretation: '确信',
              },
              { type: 'chronicle', text: '你跟着车队往北走了一趟。', tone: 'deep' },
            ],
            next: 'went',
          },
          {
            /**
             * 没走。
             *
             * 这一条不写任何惋惜——**它是大多数人的选择**，
             * 而且没有任何理由把它写得像个错误。
             */
            id: 'stay',
            label: '没去',
            echo: '你说家里离不开。',
            effects: [
              { type: 'time', days: 3 },
              { type: 'flag', key: 'turned-down-caravan', value: true },
            ],
            next: 'stayed',
          },
        ],
      },

      went: {
        id: 'went',
        blocks: [
          { kind: 'narration', text: '头一天走了六十里。夜里睡在车底下。' },
          { kind: 'narration', text: '第五天过了府界。你回头看，什么也认不出了。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '北边的路比人说的更长，也更空。' },
          { kind: 'narration', text: '有一段走了四天没见着人家。' },
          {
            kind: 'narration',
            text: '你想过很多回外头是什么样子。都不是这样。',
            tone: 'deep',
          },
        ],
        next: 'back',
      },

      /**
       * 回来了。
       *
       * `came-back` 那个旗标是 D 那种人生的枢纽——它会把「想离开」
       * 压下去一大截，同时把「想把日子过安稳」顶上来。
       *
       * **他没有失败，他只是知道了。**
       */
      back: {
        id: 'back',
        onEnter: [
          { type: 'time', months: 2 },
          { type: 'flag', key: 'came-back', value: true },
          // 走了一趟回来的那个晚上，他会把这件事重新想一遍
          { type: 'reflect' },
        ],
        blocks: [
          { kind: 'narration', text: '入冬前你跟着回程的车回来了。' },
          { kind: 'narration', text: '村口那条道还是那条道，短得不像话。' },
          { kind: 'narration', text: '{elder}问你路上怎么样。你说还行。' },
          {
            kind: 'narration',
            text: '那天夜里你睡得很沉。',
            tone: 'faint',
          },
        ],
      },

      stayed: {
        id: 'stayed',
        blocks: [
          { kind: 'narration', text: '车队后日一早走了。你没有去送。' },
          { kind: 'narration', text: '那几天你干活比平常卖力。' },
          { kind: 'narration', text: '此后管事的再没问过你。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 山那面那条道上又过了一队车。
   *
   * 这一卷什么也不给，什么也不要——它只是让那条道每隔几年
   * 再出现一次。**世界不管你想不想走，车照样在走。**
   */
  'leave:the-road': {
    id: 'leave:the-road',
    title: '道上的车',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 1 },
          { type: 'reading', opening: 'the-road' },
        ],
        blocks: [{ kind: 'narration', text: '你在坡上坐了一会儿，回去了。', tone: 'faint' }],
      },
    },
  },
}

/**
 * 什么时候会撞上这几卷。
 *
 * **入场条件里一个念头也没有。** 招短工的告示贴在那儿，
 * 想走的人看得见，想守着家的人也看得见。
 */
export const leavingEvents: readonly LifeEvent[] = [
  {
    id: 'leave-hiring',
    window: { from: 12, to: 16 },
    scene: 'leave:hiring',
    weight: 7,
    repeatable: true,
  },
  {
    id: 'leave-caravan',
    window: { from: 13, to: 16 },
    // 只看他做过什么，不看他想什么
    requires: [{ flag: { key: 'toward-leaving' } }],
    scene: 'leave:caravan',
    weight: 8,
  },
  {
    id: 'leave-the-road',
    window: { from: 10, to: 16 },
    requires: [{ flag: { key: 'saw-the-road' } }],
    scene: 'leave:the-road',
    weight: 5,
    repeatable: true,
  },
]
