import { PRIME_UP } from '@/engine/stages'
import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 山上下来的人。
 *
 * ## 这一册回答的是：修仙界在哪儿，一个凡人能看见它的哪一面
 *
 * 30.md 那句话：**修仙世界同样先有世界、组织、人物、资源、规则和因果，玩家再进入其中。**
 * 从前库里三个修士各是一个人，谁也不属于哪儿——药庐那位为什么在镇上开药庐，
 * 山道上那个人为什么从山上下来，世界里没有答案。这一册补的是那个答案的第一片：
 *
 *     山上有人。药庐那位是山上的，替上头看着这间药庐几十年了。
 *     山上隔几年打发一个人下来，把备好的药背上去。
 *
 * 玩家在药庐里翻了几年的药，翻的就是往山上送的那几筐——**而他不知道。**
 * 这一册让他撞见一次：某天卯时门关着，里头有人说话，门开了，出来一个背篓子的年轻人。
 *
 * ## 三条不做
 *
 * 一、**不写「山上」是什么。** 叫什么、几个人、什么规矩，一样也不写。一个凡人能看见的
 *     是一个下来取药的人和一只篓子——「历史上存在 ≠ 当前要实例化」（王府那一片定的）。
 * 二、**不收人。** 下来的那个人没有资格挑人，他只是来取药的。走到最后拿到的是一句
 *     「上头问起你了」——山上知道有你这么个人。收不收，是 29.md 那一片的事。
 * 三、**不给认知层任何他没亲眼见、没亲耳听的东西。** 没问的人只知道「有人下山来取药」；
 *     问了而处得不够的人，药庐那位不答；处到了带一段往后他才说那两个字。
 *
 * ## 公开度：真实存在但极少公开（27.md 拍板）
 *
 * 药庐那位说完就是一句「别出去乱说」。玩家知道了山上有人，**没有人可说**——
 * 壮年那一卷读到的是「这些年你没跟谁说过」。
 *
 * ## 为什么挂在药庐那条上，不挂在「觉出了一点什么」上
 *
 * 52 建议这一片从 flicker 之后起头。量过（2026-09-09，600 世有心人）：觉出了什么 9 世，
 * 跟药庐那位处到「使唤」62 世、「教一点」47 世。修仙界的接触点得挂在真世里走得到的地方，
 * 而药庐那条是眼下唯一一条有心人十个里一个走得到的路。
 */

const SHED = 'herbalist-at-the-shed'
const FOOTING = `footing:${SHED}`
/** 山上下来的那个人。见 `content/cultivators.ts` */
const VISITOR = 'the-one-who-comes-down'
/** 他上回肯多说两句了没有。`engine/meeting.ts` 记的 */
const OPENED = `opened:${VISITOR}`

/** 处到了这几格，他才在药庐里——下山的人来的时候他才看得见 */
const AT_THE_SHED = ['使唤', '带一段', '教一点'] as const

export const mountainScenes: SceneLibrary = {
  /**
   * 第一回。门关着，里头有人说话。
   *
   * `meeting` 写在 `onEnter` 里：先看见门开了、人出来了，再轮到他看你、你看他。
   * 他理不理你看他量到什么（`opensAt`）——多数时候他从头到尾没看你一眼。
   */
  'mountain:down': {
    id: 'mountain:down',
    title: '山上下来的人',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 1 },
          { type: 'meeting', who: VISITOR },
        ],
        blocks: [
          { kind: 'narration', text: '卯时你到的时候，门关着。' },
          { kind: 'narration', text: '里头有人说话。药庐那位的声音你听得出来，另一个不是。' },
          { kind: 'narration', text: '你在门外站了一刻。门开了。' },
        ],
        choices: [
          {
            /**
             * 问他那是谁。
             *
             * 答不答看处到了哪一格：使唤那一格他不答，带一段往后他答两个字。
             * **正文里不说这是为什么**——玩家只会觉得他今天不想说话。
             */
            id: 'ask-who',
            label: '问药庐那位那是谁',
            echo: '你问了。',
            effects: [{ type: 'time', days: 1 }],
            next: 'asked',
          },
          {
            id: 'say-nothing',
            label: '什么也没问',
            echo: '你没有问。',
            effects: [{ type: 'time', days: 1 }],
            next: 'quiet',
          },
        ],
      },

      asked: {
        id: 'asked',
        blocks: [],
        branches: [{ requires: [{ flag: { key: FOOTING, in: ['带一段', '教一点'] } }], next: 'told' }],
        next: 'brushed',
      },

      /**
       * 他答了。两个字，外加一句嘱咐。
       *
       * `recall` 翻的是他身上那一页——「从山上下来，替上头看着这间药庐」。
       * 那件事从他入册那一刻起就是真的（`Cultivator.history`），玩家今天才知道。
       * **认知跟事实分两层**，跟「原来爹年轻时去过北方」是同一套。
       */
      told: {
        id: 'told',
        onEnter: [
          { type: 'recall', id: SHED, chapter: 'keeps-the-shed' },
          {
            type: 'knowledge',
            id: 'the-mountain-above',
            title: '山上',
            summary: '山上有人。药庐那位是替他们看着这间药庐的，那些药是往山上送的。',
            category: '修行',
            contact: '亲历',
            interpretation: '确信',
          },
          { type: 'chronicle', text: '药庐那位说，他是替山上看着这间药庐的。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'dialogue', text: '「山上的。」' },
          { kind: 'narration', text: '他没有抬头。' },
          { kind: 'dialogue', text: '「我替他们看着这儿。」' },
          { kind: 'narration', text: '你想问山上是哪儿。他已经低头去称下一味了。' },
          { kind: 'dialogue', text: '「别出去乱说。」' },
          { kind: 'narration', text: '你翻了几年的那几筐药，原来是往山上送的。', tone: 'deep' },
        ],
      },

      /**
       * 他没答。
       *
       * 这一节跟「他今天没理你」是同一种东西：**不答也是一种答**。
       * 认知层落的是「有人下山来取药，你问了，他没说」——不多一个字。
       */
      brushed: {
        id: 'brushed',
        onEnter: [
          {
            type: 'knowledge',
            id: 'the-mountain-above',
            title: '山上',
            summary: '有人从山上下来取药。你问药庐那位那是谁，他没说。',
            category: '修行',
            contact: '见过',
            interpretation: '猜想',
          },
          { type: 'chronicle', text: '有人从山上下来，取走了两筐药。' },
        ],
        blocks: [
          { kind: 'narration', text: '他称完了那一味才抬头。' },
          { kind: 'dialogue', text: '「翻你的药。」' },
          { kind: 'narration', text: '你翻你的药。那天他一句话也没再说。', tone: 'faint' },
        ],
      },

      quiet: {
        id: 'quiet',
        onEnter: [
          {
            type: 'knowledge',
            id: 'the-mountain-above',
            title: '山上',
            summary: '有人从山上下来取药。你没有问那是谁。',
            category: '修行',
            contact: '见过',
            interpretation: '猜想',
          },
          { type: 'chronicle', text: '有人从山上下来，取走了两筐药。' },
        ],
        blocks: [
          { kind: 'narration', text: '药庐那位回来的时候看了你一眼，什么也没说。' },
          { kind: 'narration', text: '你接着翻药。那两筐是空的了。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 再下来。
   *
   * 隔几年，还是那只篓子。这一回要紧的不是他，是**他走之前跟药庐那位说了什么**——
   * 处到了「教一点」的人，药庐那位会提一句；提了，山上就知道有你这么个人。
   *
   * 这一节到「上头问起你了」为止。问起之后怎样——收不收、叫不叫你上去——一个字不写。
   */
  'mountain:again': {
    id: 'mountain:again',
    title: '又下来了',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '隔了几年，那个人又下来了。' },
          { kind: 'narration', text: '还是那只篓子。' },
        ],
        /*
         * 三处分流写成 `branches` 不写成 `seen`：随机人生里走到这一卷的不足千分之二，
         * `seen.ts` 那一层判的是「常到的节上哪一句没人读到」，这里的样本它永远凑不齐，
         * 只会一批红一批绿。这几句该不该出，由 `scripts/mountain.ts` 在有心人那一批里验。
         *
         * 上回他肯多说两句的（`opened:` 那面旗，量到的数够着门槛那一刻世界记下的），这回进门先看了你一眼。
         */
        branches: [
          { requires: [{ flag: { key: OPENED } }], next: 'recognised' },
        ],
        next: 'split',
      },

      recognised: {
        id: 'recognised',
        blocks: [{ kind: 'narration', text: '他进门的时候朝你这边看了一眼，像是认出来了。' }],
        next: 'split',
      },

      /** 处到了教一点的，药庐那位会跟他提一句；身上有了那样东西的，他进门时你正坐着 */
      split: {
        id: 'split',
        blocks: [],
        branches: [
          {
            requires: [
              { flag: { key: FOOTING, equals: '教一点' } },
              { flag: { key: 'rite:quiet-breath:hold', in: ['摸着了', '拿得住'] } },
            ],
            next: 'sitting',
          },
          { requires: [{ flag: { key: FOOTING, equals: '教一点' } }], next: 'noticed' },
        ],
        next: 'same',
      },

      /**
       * 他进门的时候你正坐着。
       *
       * 不写「门槛」：`upbringing.ts` 那张表把它归给有自家门的人——这儿是药庐的门，可机器分不出。
       */
      sitting: {
        id: 'sitting',
        blocks: [
          {
            kind: 'narration',
            text: '他进门的时候你正在门边坐着，照那五句坐着。你没听见他进来，是他站在你跟前你才睁开眼的。',
          },
        ],
        next: 'noticed',
      },

      /**
       * 上头问起你了。
       *
       * 药庐那位跟他说了什么，你没听见。走的时候那个人在门口站了一会儿。
       * 几天后药庐那位说了五个字——**这五个字是这一册的落点**，也是它的边界。
       */
      noticed: {
        id: 'noticed',
        onEnter: [
          { type: 'time', days: 5 },
          { type: 'flag', key: 'known-on-the-mountain', value: true },
          {
            type: 'knowledge',
            id: 'the-mountain-above',
            title: '山上',
            summary: '山上有人，药庐那位是替他们看着这间药庐的。他们知道有你这么个人了。',
            category: '修行',
            contact: '亲历',
            interpretation: '确信',
          },
          { type: 'chronicle', text: '山上的人问起了你。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '他清点的时候，药庐那位在他旁边说了几句。你没听见说的是什么。' },
          { kind: 'narration', text: '走的时候他在门口站了一会儿，看着你。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '过了几天，药庐那位收炉子的时候没让你走。' },
          { kind: 'dialogue', text: '「上头问起你了。」' },
          { kind: 'narration', text: '你等他往下说。他没有往下说。', tone: 'faint' },
        ],
      },

      same: {
        id: 'same',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '他清点，背篓，走。跟上回一样。' },
          { kind: 'narration', text: '你翻你的药。', tone: 'faint' },
        ],
      },
    },
  },
}

/**
 * 什么时候下来。
 *
 * 两条都在 `tutelage` 那条链上：他下来取药的时候你得在药庐里，而你在不在药庐里，
 * 看的是跟药庐那位处到了哪一格（`footing` 在使唤／带一段／教一点三格里的任一格——
 * `flag.in` 那一格就是为这儿加的，三格演的是同一件事，不必写成三条事件）。
 *
 * `chance` 是发条：这条链一开头就排在所有散事件前面（`pickEvent` 第二道闸），
 * 少了它就是回回都来。山上几年才下来一趟人。
 */
export const mountainEvents: readonly LifeEvent[] = [
  {
    id: 'mountain-down',
    window: { from: 13, to: PRIME_UP },
    requires: [{ flag: { key: FOOTING, in: [...AT_THE_SHED] } }],
    scene: 'mountain:down',
    chain: 'tutelage',
    weight: 5,
    chance: 0.3,
  },
  {
    /**
     * 再下来。要头一回下来过（`event:` 旗），而你还在药庐里。
     *
     * 不写「处到了教一点」——没处到的人也看得见他再来一趟，只是那一趟跟上回一样。
     * 「上头问起你了」那一支在卷里分，不在事件上分。
     */
    id: 'mountain-again',
    window: { from: 14, to: PRIME_UP },
    requires: [
      { flag: { key: 'event:mountain-down' } },
      { flag: { key: FOOTING, in: [...AT_THE_SHED] } },
    ],
    scene: 'mountain:again',
    chain: 'tutelage',
    weight: 4,
    chance: 0.25,
  },
]
