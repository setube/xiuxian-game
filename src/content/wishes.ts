import type { Spark, Wish } from '@/types/leaning'

/**
 * 愿望。
 *
 * ## 需求、愿望、念头，是三样东西
 *
 *     需求　有对象，有期限，会过去。而且**它逼着你做事**
 *           家里有人病重，要救命
 *
 *     愿望　没有对象，也没有方向。**它只是一种模糊的想要**
 *           想活久一点
 *
 *     念头　有方向。它改变你注意什么、愿意试什么
 *           想学看病 / 想弄明白 / 想守着家
 *
 * 这个区分是有代价才立起来的：从前「想活久一点」被当成一个念头，
 * 于是它得有 `echoes`——可一个只是「怕死」的人，
 * 在山上、在镇上、在家里到底会多做什么？答不上来。
 * **因为它根本不指向任何行动。**
 *
 * ## 愿望长大之后会分岔
 *
 * 而且**分岔取决于他手边有什么**：
 *
 *     见过郎中、家里开药铺　→　想学看病
 *     听说过修士　　　　　　→　想弄明白那些说不通的事
 *     家里有人要照顾　　　　→　想把日子过安稳
 *     吃过亏、见过武人　　　→　不想再被人按住
 *     什么也没接触过　　　　→　**什么也不长，它就一直是个愿望**
 *
 * 最后一条最要紧。一个愿望若必然通向某一条路，那条路就是系统
 * 偷偷安排的主线——而这里，同一个「想活久一点」通向五个地方，
 * 其中一个是「什么也没通向」。
 */
export const WISHES: readonly Wish[] = [
  {
    id: 'live-long',
    says: '你想活得久一点。',
    stirring: '你怕的东西跟从前不一样了。',
    branches: [
      {
        /**
         * 见过郎中，或者家里就是干这个的。
         *
         * 排在最前，因为它是最近的一条路：一个想活久一点的人，
         * 手边正好有药有方子，他会先往那儿走。
         */
        leaning: 'heal',
        weight: 8,
        requires: [{ knowledge: 'what-medicine-costs' }],
        text: '你开始留意郎中怎么看脉、怎么开方。你说不出为什么。',
      },
      {
        leaning: 'heal',
        weight: 8,
        requires: [{ business: '药铺' }],
        text: '柜台后头那些抽屉，你从前只当是家里的营生。',
      },
      {
        /**
         * 听说过那种人。
         *
         * **这一条是通往修行的那一条，而它只是五条之一。**
         * 而且它长出来的不是「我要修仙」，只是「想弄明白」——
         * 中间还隔着很远。
         */
        leaning: 'know',
        weight: 8,
        requires: [{ knowledge: 'cultivators-exist' }],
        text: '有人说那种人不吃不喝也能活。你想的是「活」那个字。',
      },
      {
        leaning: 'know',
        weight: 7,
        requires: [{ knowledge: 'immortal-tale' }],
        text: '老人讲的那些山里的人，你翻来覆去想了很多回。',
      },
      {
        leaning: 'settle',
        weight: 7,
        requires: [{ flag: { key: 'illness-lingers' } }],
        text: '家里那个人一直没缓过来。你把能担的都担了。',
      },
      {
        leaning: 'strong',
        weight: 6,
        requires: [{ flag: { key: 'wounded-outcome', equals: 'lift-wicked' } }],
        text: '左腕那圈疤在阴天会痒。你开始留意谁的身手好。',
      },
      /**
       * 什么也不长。
       *
       * 这一条没有 `leaning`，所以它什么也不点着——
       * **他就是怕，而且不知道能怎么办。** 这是最常见的一种，
       * 也是这一册最要紧的一格：愿望不必通向任何地方。
       */
      {
        weight: 0,
        text: '你想过这件事很多回，每回都想不出个头绪来。',
      },
    ],
  },
]

/**
 * 点着愿望的那些事。
 *
 * 跟念头的火种走同一套闸门，区别只在它们点的是愿望——
 * 而愿望**不会改变他注意什么**，它只是攒着，直到某一天分岔。
 */
export const WISH_SPARKS: readonly Spark[] = [
  {
    /**
     * 家里没了一个人。
     *
     * 这是最重的一条。一个人对「活着」这件事的全部认识，
     * 多半就是从这样一场丧事开始的。
     */
    id: 'lost-someone',
    leaning: 'live-long',
    weight: 6,
    requires: [{ flag: { key: 'lost-someone' } }],
    once: true,
    text: '办完丧事那天夜里，你想的是人怎么就没了。',
  },
  {
    id: 'sat-through-illness',
    leaning: 'live-long',
    weight: 5,
    requires: [{ flag: { key: 'sat-through-illness' } }],
    once: true,
    text: '守在旁边的那些天，你什么忙也帮不上。',
  },
  {
    id: 'illness-lingers',
    leaning: 'live-long',
    weight: 4,
    requires: [{ flag: { key: 'illness-lingers' } }],
    once: true,
    text: '他重活干不了了。郎中说拖得住就拖着。',
  },
  {
    id: 'father-gone',
    leaning: 'live-long',
    weight: 5,
    requires: [{ bond: { kind: '生父', alive: false } }],
    once: true,
    text: '有人问起你爹的时候，你答得很快，快得像是练过。',
  },
  {
    id: 'famine-dead',
    leaning: 'live-long',
    weight: 3,
    requires: [{ knowledge: 'old-famine' }],
    once: true,
    text: '老人说早年饿死过不少人。他说的时候很平常。',
  },
  {
    id: 'long-lived-ones',
    leaning: 'live-long',
    weight: 4,
    requires: [{ knowledge: 'immortal-tale' }],
    once: true,
    text: '山里那种人据说不吃不喝也能活。你问了两遍能活多久。',
  },
  {
    /**
     * 他老了。
     *
     * 这一条是慢的那种——不是某一天忽然明白，
     * 是一年一年看着一个人瘦下去。
     */
    id: 'elder-thinner',
    leaning: 'live-long',
    weight: 2,
    tags: ['家里的大人'],
    chance: 0.12,
    text: '你留意到他今年比去年瘦。',
  },
  {
    id: 'sick-in-the-night',
    leaning: 'live-long',
    weight: 1,
    tags: ['在家'],
    chance: 0.1,
    text: '你半夜醒过一次，听了很久屋里的动静。',
  },
]
