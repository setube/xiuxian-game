import { useCharacterStore } from '@/stores/character'
import { useWorldStore } from '@/stores/world'
import type { NarrativeBlock } from '@/types/game'

import { pickWeighted } from './random'

/**
 * 山道上那个人。
 *
 * 这一支把「机缘」拆成五节点，每一节都可以断：
 *
 *   注意 → 理解 → 兴趣 → 行动 → 世界回应
 *
 * ## 三条硬要求
 *
 * ### 一、真相与认知分开存
 *
 *   世界：wounded-man = 修士
 *   玩家：reading = 醉汉，mistaken = true
 *
 * 两个都留在存档里。所以多年以后可以有一次
 * 「原来那天遇见的是修士」——**而如果玩家一辈子没走过去，
 * 这一句就永远不会出现**。他到死都以为那是个醉汉。
 *
 * ### 二、误读必须自洽，不能是随机发错答案
 *
 * 误读从三样东西长出来：他看得多细（insight）、他见过什么世面
 * （knowledge / trade）、以及现场本来是什么样。
 *
 * 进过山的猎户会读成「伤了」，因为他见过被野猪拱的人；
 * 镇上的孩子读成「喝多了」，因为他只见过醉汉躺在街边。
 * 两种误读都讲得通，两种都可能错。
 *
 * ### 三、行动不保证结果
 *
 * `resolve()` 不看 fortune。它看的是**这个动作、这个人、这具身子骨、
 * 这个时机**——扶一个昏迷的壮汉，body 低就是拖不动；
 * 而扶一个修士，body 再高也不管用，因为那件事根本不取决于力气。
 */

/** 地上那人究竟是谁。世界事实，玩家永远看不到这一行 */
export type WoundedTruth = '猎户' | '武人' | '死人' | '修士' | '弟子' | '邪修'

/** 玩家看了一眼之后，心里认定的那个 */
export type Reading = '醉汉' | '伤者' | '死人' | '歹人' | '异人'

const TRUTH_ODDS: readonly { value: WoundedTruth; weight: number }[] = [
  { value: '猎户', weight: 24 },
  { value: '武人', weight: 18 },
  { value: '死人', weight: 12 },
  { value: '修士', weight: 24 },
  { value: '弟子', weight: 12 },
  { value: '邪修', weight: 10 },
]

/** 掷定他是谁。在玩家抬头之前就已经定了 */
export function rollTruth(): WoundedTruth {
  return pickWeighted(TRUTH_ODDS, (item) => item.weight)?.value ?? '猎户'
}

/**
 * 一种误读的候选。
 *
 * `fits` 是它跟真相搭不搭：读成「伤者」在多数情况下都对，
 * 读成「异人」只有真是修士或邪修时才算看准了。
 */
interface Guess {
  reading: Reading
  says: string
  /** 哪几种真相下这算读对了 */
  fits: readonly WoundedTruth[]
  /** 相对权重的基数 */
  base: number
}

const GUESSES: readonly Guess[] = [
  {
    reading: '醉汉',
    says: '像是喝多了，倒在这儿睡着了。',
    fits: [],
    base: 22,
  },
  {
    reading: '伤者',
    says: '伤得不轻。看样子撑不了多久。',
    fits: ['猎户', '武人', '弟子'],
    base: 34,
  },
  {
    reading: '死人',
    says: '一动不动。多半是已经没气了。',
    fits: ['死人'],
    base: 20,
  },
  {
    reading: '歹人',
    says: '不像什么好人。这种地方躺着的，八成不干净。',
    fits: ['邪修'],
    base: 18,
  },
  {
    reading: '异人',
    says: '哪里不对。他身上的衣裳、佩的东西，都不像本地人。',
    fits: ['修士', '邪修', '弟子'],
    base: 10,
  },
]

/** 这一眼看出来的东西 */
export interface Glance {
  reading: Reading
  /** 玩家心里那句话 */
  says: string
  /** 他读错了。玩家看不见 */
  mistaken: boolean
}

/**
 * 他看了片刻，心里有了个判断。
 *
 * 判断从他自己的见识长出来，不是随机发错：
 *
 * - **看得细的人**（insight 高）更容易读到「异人」这种细处
 * - **见过血的人**（猎户、镖局，或者身板硬朗常在外走的）更容易读成「伤者」
 * - **镇上长大的孩子**更容易读成「醉汉」——他只见过醉汉躺街边
 * - **听说过修士的人**才有可能往「异人」上想；没听说过的，
 *   连这个念头都不会有
 */
export function glance(truth: WoundedTruth): Glance {
  const character = useCharacterStore()
  const attributes = character.attributes
  const knowsAdepts = character.knows('cultivators-exist') || character.knows('immortal-tale')

  const weighted = GUESSES.map((guess) => {
    let weight = guess.base

    if (guess.reading === '异人') {
      /**
       * 「不对劲」和「那是修士」是两回事。
       *
       * 一个没听说过修士的人，照样看得出这人的衣裳料子太好、
       * 腰上挂的东西没见过式样——他只是说不出那是什么。
       * 所以这条路不该被知识完全掐死，知识只是让它更容易走通。
       *
       * 真正的门槛是**看得多细**：粗心的人一眼扫过去，
       * 只看得见血和一个不动的人。
       */
      weight += Math.max(0, attributes.insight - 38) * 1.1
      if (knowsAdepts) weight += 14
    }

    if (guess.reading === '伤者') {
      // 见过血的人一眼看出这是伤，不是醉
      weight += Math.max(0, attributes.body - 40) * 0.7
      weight += Math.max(0, attributes.insight - 45) * 0.4
    }

    if (guess.reading === '醉汉') {
      // 看得越细，越不会把一个流血的人当成喝多了
      weight -= Math.max(0, attributes.insight - 35) * 0.8
      weight = Math.max(2, weight)
    }

    if (guess.reading === '死人') {
      // 真的已经死了的时候，这个判断本来就更容易成立
      if (truth === '死人') weight += 28
    }

    if (guess.reading === '歹人') {
      weight += Math.max(0, attributes.will - 50) * 0.3
    }

    return { guess, weight }
  }).filter((item) => item.weight > 0)

  const chosen = pickWeighted(weighted, (item) => item.weight)?.guess ?? GUESSES[1]!

  return {
    reading: chosen.reading,
    says: chosen.says,
    mistaken: !chosen.fits.includes(truth),
  }
}

/** 玩家决定做的事 */
export type Approach =
  /** 走过去，把他扶起来 */
  | '扶'
  /** 只是走近看看，不碰他 */
  | '看'
  /** 跑回村里叫人 */
  | '叫人'

/** 世界给的回应 */
export interface Outcome {
  id: string
  blocks: NarrativeBlock[]
  /** 玩家事后会怎么描述这件事 */
  summary: string
  /** 他弄明白那人是谁了吗 */
  learnedTruth: boolean
  /**
   * 这一趟他从世界上带走了什么。
   *
   * **必须由结果携带，不能散在场景里。** 从前这几件东西写在
   * 六个既定结局节点的 `onEnter` 上，改成五节点时那些节点被删了，
   * 于是「他给了你一册书」照样在正文里说，行囊里却什么也没有——
   * 而十六岁渡口那一场认得的正是这册书，整条线就那么断了。
   */
  grants?: { id: string; name: string; note: string }
  /** 这一趟在他身上留下的、日后还会被人看见的痕迹 */
  marks?: string
}

/**
 * 世界怎么回应这个动作。
 *
 * **刻意不看 fortune。** 用气运决定机缘成不成，那机缘就还是抽奖。
 * 这里看的是：这个动作、这个人有多重伤得多沉、玩家这具身子骨、
 * 以及他花了多少时间。
 *
 * 于是会出现这样的事：body 很高的人扶不动一个修士——
 * 那件事根本不取决于力气；而 body 一般的人把猎户拖下了山，
 * 因为猎户只是腿上一道口子，人是清醒的。
 */
export function resolve(truth: WoundedTruth, approach: Approach, reading: Reading): Outcome {
  const character = useCharacterStore()
  const body = character.attributes.body
  const will = character.attributes.will

  if (approach === '叫人') return resolveFetchHelp(truth)
  if (approach === '看') return resolveInspect(truth, reading)
  return resolveLift(truth, body, will, reading)
}

// —— 跑回村里叫人：最稳，但最慢 ——
function resolveFetchHelp(truth: WoundedTruth): Outcome {
  if (truth === '死人') {
    return {
      id: 'help-dead',
      summary: '你叫了人来。是个外乡人，已经死了。埋在山脚下，坟很小。',
      learnedTruth: true,
      blocks: [
        { kind: 'narration', text: '你跑回村里叫人。里正带着几个汉子上了山。' },
        { kind: 'event', text: '人早就没气了。' },
        { kind: 'narration', text: '没人认得他。埋在山脚下，坟很小。' },
        { kind: 'narration', text: '那几天你夜里睡不好。', tone: 'faint' },
      ],
    }
  }

  // 走这一趟要大半天。等人回来，能走的都走了
  if (truth === '修士' || truth === '邪修' || truth === '弟子') {
    return {
      id: 'help-gone',
      summary: '你叫了人回来，草丛里已经空了。血还在，人不见了。',
      learnedTruth: false,
      blocks: [
        { kind: 'narration', text: '你跑回村里叫人。等你带着人回到那段路上，天已经擦黑。' },
        { kind: 'event', text: '草丛压平了一片。人不在了。', tone: 'deep' },
        { kind: 'narration', text: '血还在草叶上。同来的人说你八成是看花了眼。' },
        {
          kind: 'narration',
          text: '你争辩了两句，后来就不说了。',
          tone: 'faint',
        },
      ],
    }
  }

  return {
    id: 'help-saved',
    summary: '你叫了人来，把他抬下了山。他后来好了。',
    learnedTruth: true,
    blocks: [
      { kind: 'narration', text: '你跑回村里叫人。几个汉子跟你上了山。' },
      { kind: 'narration', text: '人还有气。用门板抬下来的。' },
      { kind: 'narration', text: '养了半个月，那人能下地走了。走之前来道过谢。' },
      { kind: 'narration', text: '你后来才知道，晚半日他就没了。', tone: 'faint' },
    ],
  }
}

// —— 走近看看，不碰他 ——
function resolveInspect(truth: WoundedTruth, reading: Reading): Outcome {
  if (truth === '邪修') {
    return {
      id: 'look-wicked',
      summary: '你走近看了一眼，那人忽然睁开眼。你跑了。',
      learnedTruth: true,
      blocks: [
        { kind: 'narration', text: '你走近了几步，蹲下来看。' },
        { kind: 'event', text: '他忽然睁开了眼。', tone: 'cinnabar' },
        { kind: 'narration', text: '那双眼睛是往上翻的。他在看你，又像不是在看你。' },
        { kind: 'narration', text: '你没有再往前。你退了两步，转身就跑。' },
        { kind: 'narration', text: '跑出很远才敢回头。路上什么也没有。', tone: 'faint' },
      ],
    }
  }

  if (truth === '修士' || truth === '弟子') {
    return {
      id: 'look-strange',
      summary:
        reading === '异人' ? '你看清了他不是寻常人，但没敢碰他。' : '你走近看了看，没敢碰他。',
      learnedTruth: false,
      blocks: [
        { kind: 'narration', text: '你走近了几步，没有伸手。' },
        { kind: 'narration', text: '他的衣裳料子很好，可是没有一处补丁——不像走远路的人。' },
        { kind: 'narration', text: '腰上挂着个东西，你没见过那种式样。' },
        { kind: 'narration', text: '看了一会儿，你站起来走了。' },
        { kind: 'narration', text: '走出十几步，你回头看了一眼。他还在那里。', tone: 'faint' },
      ],
    }
  }

  if (truth === '死人') {
    /**
     * 不碰他，就不会知道他是死是活。
     *
     * 探鼻息是要伸手的，而这条路上玩家**没有伸手**。
     * 所以他带走的是一个悬案：那人一动不动，可他到底断没断气，
     * 这辈子都没有答案。`learnedTruth: false`——他没弄明白。
     */
    return {
      id: 'look-still',
      summary: '你走近看了看。他一动不动。你没有碰他，也就一直不知道他是死是活。',
      learnedTruth: false,
      blocks: [
        { kind: 'narration', text: '你走近了几步，蹲下来看。' },
        { kind: 'narration', text: '是个中年汉子。脸朝下，一动不动。' },
        {
          kind: 'narration',
          text:
            reading === '死人'
              ? '你在旁边站了很久，等他动一下。他没有动。'
              : '你等他喘一口气。等了很久，没有等到。',
        },
        { kind: 'narration', text: '要探鼻息就得伸手，而你没有伸手。' },
        { kind: 'narration', text: '你最后是退着走开的。', tone: 'faint' },
        { kind: 'narration', text: '那人是死是活，你这辈子都没弄清楚。', tone: 'faint' },
      ],
    }
  }

  return {
    id: 'look-plain',
    summary: '你走近看了看。是个受了伤的人。你没有动他。',
    learnedTruth: true,
    blocks: [
      { kind: 'narration', text: '你走近了几步，蹲下来看。' },
      { kind: 'narration', text: '是个中年汉子，腿上一道大口子，血把裤子浸透了。' },
      { kind: 'narration', text: '还有气，但已经不省人事。' },
      { kind: 'narration', text: '你站在那里想了很久，最后什么也没做。' },
      { kind: 'narration', text: '这件事你后来跟谁也没提过。', tone: 'faint' },
    ],
  }
}

// —— 走过去把他扶起来。这是唯一一条真会失败的路 ——
function resolveLift(truth: WoundedTruth, body: number, will: number, reading: Reading): Outcome {
  if (truth === '死人') {
    return {
      id: 'lift-dead',
      summary: '你伸手碰了他。手是凉的。那是个死人。',
      learnedTruth: true,
      blocks: [
        { kind: 'narration', text: '你蹲下去，伸手探了探他的鼻息。' },
        { kind: 'narration', text: '没有气了。手是凉的。' },
        { kind: 'event', text: '这是个死人。' },
        {
          kind: 'narration',
          text:
            reading === '醉汉'
              ? '你原以为他只是喝多了。'
              : '你早看出来了，可真碰到的时候还是不一样。',
          tone: 'faint',
        },
        { kind: 'narration', text: '你跑回村里叫了人。埋在山脚下，坟很小。' },
      ],
    }
  }

  if (truth === '邪修') {
    return {
      id: 'lift-wicked',
      summary: '你伸手去扶他。那只手抓住了你的手腕，很凉。',
      learnedTruth: true,
      // 左腕那圈疤。十六岁那年渡口上有人一眼就看见了它
      marks: 'touched-by-wicked',
      blocks: [
        { kind: 'narration', text: '你蹲下去，伸手去扶他的肩膀。' },
        { kind: 'event', text: '他抓住了你的手腕。', tone: 'cinnabar' },
        { kind: 'narration', text: '那只手很凉，凉得不像是人的手。' },
        { kind: 'narration', text: '他抬起头。你看见他在笑。' },
        {
          kind: 'narration',
          text:
            reading === '醉汉'
              ? '你到这时才知道，那不是个醉汉。'
              : '你早觉得不对，可你还是伸了手。',
          tone: 'deep',
        },
        { kind: 'narration', text: '你在床上躺了将近一个月，一直在发热。' },
        { kind: 'narration', text: '左腕上留了一圈疤，五个指头的形状。', tone: 'faint' },
      ],
    }
  }

  if (truth === '修士') {
    // 修士这一档，力气完全不起作用——他睁不睁眼跟你扶不扶得动无关
    return {
      id: 'lift-adept',
      summary: '你的手刚碰到他，他就睁开了眼。他给了你一册书，然后不见了。',
      learnedTruth: true,
      // 跟货郎摊上那册不是同一件东西，玩家却分不出来——两本都看不懂，也就都只是「一册书」
      grants: {
        id: 'thin-book',
        name: '一册薄书',
        note: '山道上那个人塞给你的。纸很薄，字歪歪扭扭，你一个也认不出。',
      },
      blocks: [
        { kind: 'narration', text: '你蹲下去，手刚碰到他的肩膀。' },
        { kind: 'event', text: '他睁开了眼。', tone: 'cinnabar' },
        {
          kind: 'narration',
          text:
            reading === '醉汉'
              ? '你原以为他只是喝多了。可那双眼睛太亮了，伤成那样还是亮的。'
              : '那双眼睛很亮。伤成那样，眼睛还是亮的。',
        },
        { kind: 'narration', text: '他看了你很久，久到你想跑。' },
        { kind: 'narration', text: '然后他从怀里摸出一册薄薄的书，塞进你手里。' },
        { kind: 'dialogue', text: '……别给人看见。' },
        { kind: 'narration', text: '后面还有一句，很短，你没听懂。' },
        { kind: 'narration', text: '你眨了一下眼。' },
        { kind: 'event', text: '草丛里没有人了。', tone: 'cinnabar' },
      ],
    }
  }

  if (truth === '弟子') {
    // 这一档要把人挪到路边等他同门来，扛得动扛不动是真问题
    if (body < 42) {
      return {
        id: 'lift-fail-disciple',
        summary: '你想把他拖到路边，可你拖不动。后来来了两个人，把他接走了。',
        learnedTruth: false,
        blocks: [
          { kind: 'narration', text: '你蹲下去，架起他的胳膊，想把他拖到路边去。' },
          { kind: 'event', text: '你拖不动。' },
          { kind: 'narration', text: '你试了三回，最后一回摔坐在地上，手心磨破了。' },
          { kind: 'narration', text: '你只好守在旁边等。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '天快黑的时候来了两个人，走路很快，穿的衣裳跟他一样。' },
          { kind: 'narration', text: '他们看了你一眼，没多问，把人抬走了。' },
          { kind: 'narration', text: '你连一句话也没来得及说。', tone: 'faint' },
        ],
      }
    }
    return {
      id: 'lift-disciple',
      summary: '你把他弄到草棚里守了一夜。第二天来了两个人，给了你两块碎银子。',
      learnedTruth: true,
      blocks: [
        { kind: 'narration', text: '还有气。是个年轻人，比你大不了几岁，衣裳很干净。' },
        { kind: 'narration', text: '你把他弄到路边的草棚里，守了一夜。' },
        { kind: 'divider', variant: 'dots' },
        { kind: 'narration', text: '第二天来了两个人，走路很快，穿的衣裳跟他一样。' },
        { kind: 'narration', text: '其中一个丢下两块碎银子。' },
        { kind: 'dialogue', text: '多谢。' },
        { kind: 'narration', text: '扶人走的时候，你听见其中一个说了两个字：玄清。' },
        { kind: 'narration', text: '你不知道那是人名、地名，还是别的什么。', tone: 'faint' },
      ],
    }
  }

  if (truth === '武人') {
    // 挎刀的汉子沉，而且他不肯让人碰。心性不够的人会被吓退
    if (will < 40) {
      return {
        id: 'lift-fail-fighter',
        summary: '你刚碰到他，他就摸刀。你吓得跑了。',
        learnedTruth: false,
        blocks: [
          { kind: 'narration', text: '你蹲下去，手刚搭上他的肩。' },
          { kind: 'event', text: '他的手往腰上摸。' },
          { kind: 'narration', text: '那里挎着一把刀。' },
          { kind: 'narration', text: '你缩回手，站起来退了几步，转身就走。' },
          { kind: 'narration', text: '走出很远才发现自己在发抖。', tone: 'faint' },
        ],
      }
    }
    if (body < 46) {
      return {
        id: 'lift-half-fighter',
        summary: '你把他弄到破庙里，可你搬不动他，只能给他找水。他自己走的。',
        learnedTruth: true,
        blocks: [
          { kind: 'narration', text: '还有气。他睁了一下眼，又闭上了。' },
          { kind: 'narration', text: '你想背他，背不动。只能拖，拖了十几步就没力气了。' },
          { kind: 'narration', text: '最后你去溪边打了水回来，给他灌了几口。' },
          { kind: 'narration', text: '天黑前你得赶路。你把水囊留下了。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '第二天你回来看，人不在了。水囊空着放在石头上。' },
          { kind: 'narration', text: '你不知道他是死是活。', tone: 'faint' },
        ],
      }
    }
    return {
      id: 'lift-fighter',
      summary: '你把他背到破庙里。他躺了三天，教了你一个呼吸的法子。',
      learnedTruth: true,
      blocks: [
        { kind: 'narration', text: '还有气。他睁了一下眼，又闭上了。' },
        { kind: 'narration', text: '你把他背到山下的破庙里，找了些水。' },
        { kind: 'narration', text: '他在庙里躺了三天。腰上一直挎着刀，睡着也没解下来。' },
        { kind: 'narration', text: '第四天早上他能坐起来了。' },
        { kind: 'dialogue', text: '我没有钱谢你。' },
        { kind: 'narration', text: '他想了想，让你把手伸出来，按在自己肋下。' },
        { kind: 'dialogue', text: '走山路的时候这样喘气，脚下数着数。走一天不喘。' },
        { kind: 'narration', text: '他教了你两遍，第二天就走了。' },
      ],
    }
  }

  // 猎户：人是清醒的，只要肯扶就能成
  if (body < 34) {
    return {
      id: 'lift-half-hunter',
      summary: '你扶不动他，只好去叫人。等人来的时候，他已经自己爬到路边了。',
      learnedTruth: true,
      blocks: [
        { kind: 'narration', text: '还有气。是个中年汉子，腿上一道大口子。' },
        { kind: 'dialogue', text: '……野猪。' },
        { kind: 'narration', text: '你想扶他起来，可他太沉了，你架不住。' },
        { kind: 'narration', text: '你只好往村里跑。' },
        { kind: 'divider', variant: 'dots' },
        { kind: 'narration', text: '等你带人回来，他已经自己爬到路边了。' },
        { kind: 'narration', text: '他没说什么，只是拍了拍你的头。', tone: 'faint' },
      ],
    }
  }
  return {
    id: 'lift-hunter',
    summary: '你把他弄下了山。半个月后他提着一只野兔找上门来。',
    learnedTruth: true,
    blocks: [
      { kind: 'narration', text: '还有气。你把他翻过来，是个中年汉子，腿上一道大口子。' },
      { kind: 'dialogue', text: '……野猪。' },
      { kind: 'narration', text: '他只说得出这两个字。' },
      { kind: 'narration', text: '你把他半拖半扶弄下了山，送到最近的村子。' },
      { kind: 'divider', variant: 'dots' },
      { kind: 'narration', text: '半个月后，那人拄着棍子找上门来，提了一只野兔。' },
      { kind: 'dialogue', text: '往后进山有事，到山那边打听我。' },
    ],
  }
}

/** 把这一趟的结果写进世界。玩家的认知与世界的真相分开存 */
export function recordEncounter(glanceResult: Glance, truth: WoundedTruth): void {
  const world = useWorldStore()
  world.setFlag('wounded-man', truth)
  world.setFlag('wounded-reading', glanceResult.reading)
  world.setFlag('wounded-misread', glanceResult.mistaken)
}

/**
 * 这个真相「本该」被读成什么。
 *
 * 只用来判断玩家事后记下的那句话对不对——
 * 他没弄明白那人是谁，可他的判断也许碰巧是对的。
 */
export function truthToReading(truth: WoundedTruth): Reading {
  if (truth === '死人') return '死人'
  if (truth === '邪修') return '歹人'
  if (truth === '修士') return '异人'
  return '伤者'
}
