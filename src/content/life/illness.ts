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
            /*
             * 高墙里头的人没有「地里的活」。
             *
             * 照 `routine.ts:258` 那条写：问 `living`（他现在过什么日子）
             * 而不是 `station`（玉牒上写着什么）——削爵之后日子变成 `fallen`，
             * 这扇门自己就开了，那正是那一册要说的话。
             *
             * `scripts/sequestered.ts` 实测抓到的三处之一：从前王府里病倒了人，
             * 世子也会读到「照旧下地」。
             */
            requires: [{ living: { notIn: ['palace', 'manor'] } }],
            hint: '耗 一月',
            echo: '你照旧下地。',
            effects: [
              { type: 'time', months: 1 },
              { type: 'attribute', key: 'body', delta: 2 },
              { type: 'household', standing: 1 },
              // 他没能熬过去的话，这面旗是「那半个月你在地里」那句话的来历
              { type: 'flag', key: 'kept-working', value: true },
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
          { type: 'person', id: 'elder', fate: '殁', cause: '病' },
          /**
           * 从这一天起守孝。
           *
           * 这是「过程中状态」的第二个使用者（第一个是议亲）。它在这儿
           * 头一回让两件事撞上：**守孝期间不许嫁娶**——`match:offer` 那一卷
           * 的 `requires` 里写着 `{ undertaking: { not: 'mourning' } }`，
           * 于是这三年里媒人不上门。
           *
           * ⚠️ **没有人替它计时。** 三年到了自己不会结束——`Undertaking`
           * 上没有 deadline，那是有意的（用户拍板的三条边界之一：
           * 不拥有自己的流转规则）。结束它的是底下 `mourning:over` 那一卷，
           * 它是个散事件，`window` 从十一岁起、要求 `undertaking is mourning`。
           * **所以「什么时候孝满」不精确**——可能第三年，也可能第五年，
           * 而那正是这件事本来的样子：孝满不是一个日子，
           * 是家里人某一天忽然发现门上那块白布早就取下来了。
           */
          { type: 'undertake', undertaking: 'mourning', who: 'elder' },
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
        /**
         * 同一场丧事，各人各是一种反应（用户 2026-09-07 拍板：不进引擎，一卷一卷写）。
         *
         * 你自己的那一句看你那阵子做了什么：守着的记得他醒过那一回；跑镇上抓药的记得那两副药；
         * 照旧下地的，后来很多年都想那半个月。**自责不自责，跟关系多亲无关，跟你当时在哪有关。**
         * 娘的那一句看她的性情；哥的那一句看他的性情——暴躁的把郎中骂了一顿，那是「归咎于某人」。
         * 这几句只在爹是没了的那个、娘和哥活着在家的时候才说得出来。
         */
        seen: [
          {
            requires: [{ flag: { key: 'sat-through-illness' } }],
            text: '你守着的那些天，他有一回醒了，看了你很久，没说话。',
          },
          {
            requires: [{ flag: { key: 'fetched-herbs' } }],
            text: '你跑了两趟镇上抓回来的那两副药，一副也没喝完。',
          },
          {
            requires: [{ flag: { key: 'kept-working' } }],
            text: '那半个月你在外头干活。后来很多年你都想，要是那半个月你在屋里呢。',
          },
          {
            requires: [
              { family: { id: 'father', alive: false } },
              { family: { id: 'mother', alive: true, present: true } },
              { temper: { id: 'mother', in: ['刚硬', '暴躁'] } },
            ],
            text: '娘一滴泪没掉。出殡回来她把他的东西收进箱子，锁上，从此不提。',
          },
          {
            requires: [
              { family: { id: 'father', alive: false } },
              { family: { id: 'mother', alive: true, present: true } },
              { temper: { id: 'mother', in: ['温和'] } },
            ],
            text: '娘哭了好几夜。饭还是照做，只是常做多一个人的量。',
          },
          {
            requires: [
              { family: { id: 'father', alive: false } },
              { family: { id: 'mother', alive: true, present: true } },
              { temper: { id: 'mother', in: ['谨慎', '精明'] } },
            ],
            text: '娘把郎中的药方留了下来。她说，往后家里再有人病，先照这个抓。',
          },
          {
            requires: [
              { family: { id: 'father', alive: false } },
              { family: { id: 'mother', alive: true, present: true } },
              { temper: { id: 'mother', in: ['木讷'] } },
            ],
            text: '娘没说什么。那几天她说的话加起来不到十句。',
          },
          {
            requires: [
              { family: { id: 'father', alive: false } },
              { family: { id: 'brother', alive: true, present: true } },
              { temper: { id: 'brother', in: ['暴躁'] } },
            ],
            text: '哥把郎中骂了一顿，说是他拖的。郎中没还嘴。',
          },
          {
            requires: [
              { family: { id: 'father', alive: false } },
              { family: { id: 'brother', alive: true, present: true } },
              { temper: { id: 'brother', in: ['刚硬', '木讷', '谨慎', '温和', '精明'] } },
            ],
            text: '哥那几天把爹留下的活全接了过去，一句话也没说。',
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
