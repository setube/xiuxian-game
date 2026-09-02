import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 米贵了。
 *
 * 这一册是「世界 → 玩家」那条路的第一次落地，也是整个世界系统的验收点。
 *
 * 它的入场条件不是年龄、不是家世、不是旗标，而是**这个府此刻的粮价**——
 * 而粮价是前面几年少雨、减产、囤粮一环一环推上去的，
 * 跟玩家一点关系也没有。玩家只是恰好活在这条链里。
 *
 * ## 同一场旱灾，长出不同的人生
 *
 * 这一卷刻意不写「你家因此如何」，只写「米贵了」这个事实，
 * 然后按**家里的光景**分流：
 *
 * - 家底厚的：米贵了也就是贵了，大人念叨两句
 * - 过得去的：紧一紧，少吃一顿肉
 * - 紧巴的：要做选择了——卖东西、借钱、还是让孩子出去做工
 * - 揭不开锅的：已经没得选
 *
 * 于是同一个世界事件，在四种家庭里长出四种不同的东西。
 * **这才是「世界事件改变条件，不替玩家决定结果」的样子。**
 */
export const dearthScenes: SceneLibrary = {
  'dearth:price': {
    id: 'dearth:price',
    title: '米价',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        /**
         * 开场交给感知层。
         *
         * 从前这里写的是「入秋以后，米价一天一个样」——那是**作者知道的世界**。
         * 可玩家未必知道米价，他可能只看见自己碗里的粥稀了。
         *
         * 两套叙事来源不一致，后果不是代码不整洁，是玩家会凭空得到
         * 他本不该有的认知：一个六岁农家孩子不该知道「米价」这个概念。
         */
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'signs', limit: 2 },
        ],
        blocks: [],
        // 同一个消息，落在不同的家里是不同的东西
        branches: [
          { requires: [{ standing: { atLeast: 62 } }], next: 'comfortable' },
          { requires: [{ standing: { atLeast: 38 } }], next: 'tighten' },
          { requires: [{ standing: { atLeast: 18 } }], next: 'choose' },
        ],
        next: 'desperate',
      },

      comfortable: {
        id: 'comfortable',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'household', standing: -3 },
          {
            type: 'knowledge',
            id: 'lean-year',
            title: '年景',
            summary: '收成好的年头和收成坏的年头，外头的米价是不一样的。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '家里照常开饭。' },
          { kind: 'narration', text: '{elder}跟人说话时提过两回米价，语气跟说天气差不多。' },
          { kind: 'narration', text: '你听见了，但没往心里去。' },
          {
            kind: 'narration',
            text: '很多年以后你才知道，那一年有人饿死。',
            tone: 'faint',
          },
        ],
      },

      tighten: {
        id: 'tighten',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'household', standing: -7 },
          {
            type: 'knowledge',
            id: 'lean-year',
            title: '年景',
            summary: '收成坏的年头，家里的饭桌是会变样的。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '粥比往常稀了些。' },
          { kind: 'narration', text: '过年没有割肉。{elder}说明年再说。' },
          { kind: 'narration', text: '也就是紧了一年。第二年秋天，日子又回去了。' },
        ],
      },

      /**
       * 有得选的那一档。
       *
       * 这是整卷的重心——**世界把条件推到这里，然后闭嘴**。
       * 卖东西、借钱、还是让孩子出去做工，三条路都通，
       * 三条路的后果不一样，而世界不替玩家挑。
       */
      choose: {
        id: 'choose',
        blocks: [
          { kind: 'narration', text: '家里的米撑不到开春。' },
          { kind: 'narration', text: '晚饭后没有人说话。{elder}坐在门口，坐了很久。' },
        ],
        choices: [
          {
            id: 'sell',
            label: '把值钱的东西卖了',
            hint: '换来的钱撑不了太久',
            echo: '家里把能卖的都卖了。',
            effects: [
              { type: 'time', months: 5 },
              { type: 'household', standing: -9 },
              { type: 'flag', key: 'sold-things', value: true },
              { type: 'attribute', key: 'will', delta: 3 },
            ],
            next: 'after-sell',
          },
          {
            id: 'borrow',
            label: '去借',
            hint: '借了是要还的',
            echo: '{elder}去镇上借了一笔。',
            effects: [
              { type: 'time', months: 5 },
              { type: 'household', standing: 4, debt: 14 },
              { type: 'flag', key: 'family-borrowed', value: true },
              { type: 'attribute', key: 'insight', delta: 2 },
            ],
            next: 'after-borrow',
          },
          {
            id: 'work',
            label: '你出去做工',
            hint: '书就念不成了',
            echo: '你被送去做工了。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'household', standing: 6 },
              { type: 'flag', key: 'schooled', value: false },
              { type: 'flag', key: 'working', value: true },
              { type: 'attribute', key: 'body', delta: 7 },
              { type: 'attribute', key: 'will', delta: 5 },
              {
                type: 'aspect',
                key: 'body',
                self: '你从小就出去做过工。手上有茧，也不怕生人。',
              },
              { type: 'chronicle', text: '那年米贵，你被送出去做工。', tone: 'deep' },
            ],
            next: 'after-work',
          },
        ],
      },

      'after-sell': {
        id: 'after-sell',
        blocks: [
          { kind: 'narration', text: '箱子空了一半。那只镯子是{dam}的陪嫁。' },
          { kind: 'narration', text: '她没说什么，只是把箱子锁上了。' },
          { kind: 'narration', text: '那年冬天家里没有添过一件新东西。', tone: 'faint' },
        ],
      },

      'after-borrow': {
        id: 'after-borrow',
        blocks: [
          { kind: 'narration', text: '钱是借到了。米缸重新满了一半。' },
          { kind: 'narration', text: '此后每年秋后，家里都要先想着还债的事。' },
          { kind: 'narration', text: '{elder}夜里常坐在门槛上。', tone: 'faint' },
        ],
      },

      'after-work': {
        id: 'after-work',
        blocks: [
          { kind: 'narration', text: '你去了镇上一家铺子，管饭，没有工钱。' },
          { kind: 'narration', text: '干了一年。年底回家时，家里的米缸是满的。' },
          { kind: 'event', text: '这一年你没有念书。' },
          {
            kind: 'narration',
            text: '同龄的孩子还在私塾。你从他们门口过，没有停。',
            tone: 'faint',
          },
        ],
      },

      desperate: {
        id: 'desperate',
        onEnter: [
          { type: 'time', months: 6 },
          { type: 'household', standing: -6 },
          { type: 'attribute', key: 'body', delta: -5 },
          { type: 'attribute', key: 'will', delta: 8 },
          { type: 'flag', key: 'knew-hunger', value: true },
          {
            type: 'knowledge',
            id: 'lean-year',
            title: '年景',
            summary: '荒年是什么样子，你亲身经历过。那不是米贵，是没有米。',
            category: '世事',
          },
          { type: 'chronicle', text: '那一年闹饥荒。你饿过。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'narration', text: '家里没有米了。' },
          { kind: 'narration', text: '那阵子吃的是掺了糠的饼，再后来是野菜。' },
          { kind: 'narration', text: '{dam}把自己那份分得越来越少。' },
          { kind: 'event', text: '你饿过。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '开春以后，日子慢慢回来了。' },
          {
            kind: 'narration',
            text: '此后很多年，你都不肯剩饭。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 路上不太平。
   *
   * 旱灾链走到后段才会有的事。跟米价那一卷一样，
   * 它对不同的人是不同的东西——镖局的孩子看见父亲往刀上抹油，
   * 客栈的孩子看见店里空了一半。
   */
  'dearth:unrest': {
    id: 'dearth:unrest',
    title: '路上',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        // 同上：他看见什么由感知层决定。
        // 「那些人是逃荒的」这个判断，得他自己够得着才有
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'signs', limit: 2 },
        ],
        blocks: [],
        branches: [
          { requires: [{ trade: '镖局' }], next: 'escort' },
          { requires: [{ trade: '客栈' }], next: 'inn' },
          { requires: [{ trade: '商户' }], next: 'shop' },
        ],
        next: 'village',
      },

      escort: {
        id: 'escort',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'household', standing: 5 },
          { type: 'attribute', key: 'will', delta: 4 },
        ],
        blocks: [
          { kind: 'narration', text: '局里的生意反倒好了。要押的货多，肯走的人少。' },
          { kind: 'narration', text: '{elder}那阵子每天都在磨刀。' },
          { kind: 'narration', text: '走一趟的价钱翻了一倍。他还是接了。' },
          { kind: 'narration', text: '你后来才明白，那一年他为什么总是很晚才睡。', tone: 'faint' },
        ],
      },

      inn: {
        id: 'inn',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'household', standing: -12 },
          { type: 'attribute', key: 'insight', delta: 3 },
        ],
        blocks: [
          { kind: 'narration', text: '店里空了。商队改了道，一个月也来不了几个人。' },
          { kind: 'narration', text: '后来住进来的多是逃荒的，给不出房钱。' },
          { kind: 'narration', text: '{elder}让他们住柴房，一天一碗粥。' },
          { kind: 'narration', text: '那年冬天，柴房里死过一个人。', tone: 'faint' },
        ],
      },

      shop: {
        id: 'shop',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'household', standing: -8 },
          { type: 'attribute', key: 'insight', delta: 5 },
          {
            type: 'knowledge',
            id: 'the-market',
            title: '世道与生意',
            summary: '路不通的时候，货就烂在手里。做买卖的人比谁都关心外头太不太平。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '进货的路断了。铺子里的货卖一件少一件。' },
          { kind: 'narration', text: '{elder}把伙计辞了两个。' },
          { kind: 'narration', text: '你头一回听见他跟人说「撑一撑」这三个字。' },
        ],
      },

      village: {
        id: 'village',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'household', standing: -6 },
          { type: 'attribute', key: 'will', delta: 3 },
        ],
        blocks: [
          { kind: 'narration', text: '村里开始有人守夜。' },
          { kind: 'narration', text: '入冬后丢过两回粮，还伤了人。' },
          { kind: 'narration', text: '那阵子天一黑就没人出门了。' },
        ],
      },
    },
  },
}

export const dearthEvents: readonly LifeEvent[] = [
  {
    /**
     * 入场条件是**这个府的粮价**，不是玩家的年龄或家世。
     *
     * 这就是「世界 → 玩家」那条路：粮价是前面几年少雨、减产、
     * 囤粮一环一环推上去的，跟玩家一点关系也没有。
     * 他只是恰好活在这条链里。
     *
     * 也因此，玩家很可能一辈子碰不上——那正是对的。
     */
    id: 'dearth-price',
    window: { from: 5, to: 16 },
    requires: [{ region: { grain: { atLeast: 138 } } }],
    scene: 'dearth:price',
    weight: 24,
  },
  {
    id: 'dearth-unrest',
    window: { from: 7, to: 16 },
    requires: [{ region: { order: { atMost: 34 } } }],
    scene: 'dearth:unrest',
    weight: 18,
  },
]
