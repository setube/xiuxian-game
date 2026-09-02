import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 家里有人病倒了。
 *
 * ## 这一卷是「需求」，不是「愿望」
 *
 * 需求跟愿望、念头都不一样，区别在三处：
 *
 *     需求　有对象，有期限，会过去。而且**它逼着你做事**
 *     愿望　没有对象，也没有方向。它只是一种模糊的想要
 *     念头　有方向。它改变你注意什么、愿意试什么
 *
 * 「家里有人病重」是需求：它有一个具体的病人，有一段具体的日子，
 * 而且**它会过去**——他好了，或者他没了。此后这个需求就不在了。
 *
 * 可它留下的东西不会过去。那几天守在旁边什么忙也帮不上的滋味，
 * 会往两个方向长：一个是「想学看病」，一个是「想活久一点」。
 *
 * ## 需求不新建数据结构
 *
 * 它由旗标和世界事件承载就够了——`illness-at-home` 是它的全部。
 * 新加一层「需求」的存储只会让三个概念互相打架，
 * 而这一层真正的价值在于**它是愿望的来源**，不在于它自己被记住。
 */
export const illnessScenes: SceneLibrary = {
  'need:illness': {
    id: 'need:illness',
    title: '病',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 3 },
          { type: 'flag', key: 'illness-at-home', value: true },
        ],
        blocks: [
          { kind: 'narration', text: '入秋以后{elder}病了一场。' },
          { kind: 'narration', text: '起先只是咳嗽，后来烧起来，夜里说胡话。' },
          { kind: 'narration', text: '请了郎中，抓了两副药。' },
        ],
        choices: [
          {
            id: 'watch',
            label: '守着',
            hint: '耗 一月',
            echo: '你守在旁边。',
            effects: [
              { type: 'time', months: 1 },
              { type: 'attribute', key: 'will', delta: 2 },
              { type: 'meet', id: 'elder', delta: 6 },
              { type: 'flag', key: 'sat-through-illness', value: true },
              // 需求会过去，可它留下的东西不会。这一句让他当场重新掂量一回
              { type: 'reflect' },
            ],
            next: 'watched',
          },
          {
            id: 'herbs',
            label: '去镇上抓药',
            hint: '耗 半月',
            echo: '你往镇上跑了两趟。',
            effects: [
              { type: 'time', days: 15 },
              { type: 'household', standing: -3 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'flag', key: 'fetched-herbs', value: true },
              {
                type: 'knowledge',
                id: 'what-medicine-costs',
                title: '药钱',
                summary: '两副药去了半吊钱。掌柜的说这还是便宜的。',
                category: '世事',
                contact: '亲历',
                interpretation: '确信',
              },
              { type: 'reflect' },
            ],
            next: 'watched',
          },
          {
            /**
             * 该干的活还是要干。
             *
             * 这一条不写任何责备——**家里病倒一个人，地里的活不会自己少**。
             * 一个十二岁的孩子顶上去，是很多人家真实的样子。
             */
            id: 'work',
            label: '照旧干活，家里不能停',
            hint: '耗 一月',
            echo: '你照旧下地。',
            effects: [
              { type: 'time', months: 1 },
              { type: 'attribute', key: 'body', delta: 2 },
              { type: 'household', standing: 1 },
              { type: 'reflect' },
            ],
            next: 'watched',
          },
        ],
      },

      /**
       * 病好了，还是没好。
       *
       * 掷一次。**世界不看他守得多勤**——这一条跟机缘那边是同一个立场：
       * 他的选择改变的是自己经历了什么，不是把结果掰成对他有利的那一种。
       */
      watched: {
        id: 'watched',
        onEnter: [
          {
            type: 'roll',
            key: 'illness-outcome',
            among: [
              { value: 'recovered', weight: 62 },
              { value: 'lingering', weight: 28 },
              { value: 'died', weight: 10 },
            ],
          },
        ],
        blocks: [],
        branches: [
          { requires: [{ flag: { key: 'illness-outcome', equals: 'died' } }], next: 'died' },
          {
            requires: [{ flag: { key: 'illness-outcome', equals: 'lingering' } }],
            next: 'lingering',
          },
        ],
        next: 'recovered',
      },

      recovered: {
        id: 'recovered',
        onEnter: [
          { type: 'time', months: 1 },
          { type: 'flag', key: 'illness-at-home', value: false },
        ],
        blocks: [
          { kind: 'narration', text: '过了半个月，烧退了。' },
          { kind: 'narration', text: '又躺了些日子才能下地。' },
          { kind: 'narration', text: '此后他一到入秋就咳。', tone: 'faint' },
        ],
      },

      lingering: {
        id: 'lingering',
        onEnter: [
          { type: 'time', months: 2 },
          { type: 'flag', key: 'illness-lingers', value: true },
        ],
        blocks: [
          { kind: 'narration', text: '烧是退了，人却一直没缓过来。' },
          { kind: 'narration', text: '重活干不了了。家里的事你担了不少。' },
          {
            kind: 'narration',
            text: '郎中说这样的多半是拖，拖得住就拖着。',
            tone: 'faint',
          },
        ],
      },

      died: {
        id: 'died',
        onEnter: [
          { type: 'time', months: 2 },
          { type: 'flag', key: 'illness-at-home', value: false },
          { type: 'flag', key: 'lost-someone', value: true },
          { type: 'person', id: 'elder', fate: '殁' },
          { type: 'chronicle', text: '{elder}那年入冬没能熬过去。', tone: 'cinnabar' },
          // 这一夜他想的事，跟从前不一样了
          { type: 'reflect' },
        ],
        blocks: [
          { kind: 'narration', text: '入冬那几天忽然重了。' },
          { kind: 'event', text: '他没能熬过去。', tone: 'cinnabar' },
          { kind: 'narration', text: '办丧事的那几天你几乎没有合眼。' },
          { kind: 'divider', variant: 'ink' },
          {
            kind: 'narration',
            text: '后来很多年你都记得郎中说的那句：早半个月兴许还有法子。',
            tone: 'deep',
          },
        ],
      },
    },
  },
}

export const illnessEvents: readonly LifeEvent[] = [
  {
    /**
     * 家里病倒一个人。
     *
     * 权重不高，可它是这个游戏里少数几件**真的会死人**的事之一——
     * 而一个人对「活着」这件事的全部认识，多半就是从这样一场病开始的。
     */
    id: 'need-illness',
    window: { from: 8, to: 16 },
    requires: [{ bond: { kind: '抚养', alive: true } }],
    scene: 'need:illness',
    weight: 6,
  },
]
