import { useCharacterStore } from '@/stores/character'
import { useWorldStore } from '@/stores/world'
import type { Interpretation, NarrativeBlock } from '@/types/game'

import { pickWeighted, randomBetween } from './random'

/**
 * 走北路的那个商旅。
 *
 * 前两支机缘验的是玩家跟**世界**打交道：山道上躺着的人是个死物，
 * 货郎摊上那册书更是。这一支验的是玩家跟**另一个人**打交道——
 * 而人跟物最要紧的区别是：
 *
 *   **一个人对世界的理解，本身就是另一个人的局部世界。**
 *
 * ## 两道理解，真话在中间走样
 *
 * 从「世界真相」到「玩家脑子里那句话」，中间隔着两道各自会失真的关口：
 *
 *     世界真相
 *       ↓  ① 商旅自己怎么理解的（他可能就错了，而他不知道）
 *     他心里那句
 *       ↓  ② 他肯说多少、说得多明白（他多半说得很含糊）
 *     他嘴里那句
 *       ↓  ③ 玩家怎么听的（他会往自己已有的框里塞）
 *     玩家脑子里那句
 *
 * 所以会出现这一支最要紧的一种结果：**他说的是真话，玩家还是理解错了。**
 *
 *     玩家确信：修士就是江湖上很厉害的人。
 *     商旅想说：不是江湖人。
 *     他只说了：不是一路人。
 *     玩家听成：哦，修士是另一种江湖人。
 *
 * 没有人撒谎，没有人失误，而玩家的世界模型**更自信了，也更错了**。
 *
 * ## 越笃定越难被撼动
 *
 * 这一条是「越来越自信但越来越错」真正的发条。一个还在猜的人
 * 听见「不是一路人」会楞一下；一个确信多年的人只会把这句话
 * 收编进自己那套解释里。所以扰动的力度要看玩家原来有多笃定——
 * **认知不是越问越对的。**
 */

/**
 * 商旅自己对「修士」这件事知道什么。
 *
 * 这是他的局部世界，不是世界真相——玩家永远看不到这一行。
 * 注意第三种：**他自己就错了，而他不知道自己错了**。
 * 他不是骗子，他只是把见过的东西归错了类。
 */
export type MerchantLore =
  /** 他真在渡口见过一个。说得准 */
  | '亲眼见过'
  /** 行里人传的。方向对，细节靠不住 */
  | '听行里人说的'
  /** 他把江湖上的高手当成了修士。他自己不知道这是错的 */
  | '把江湖人当修士'
  /** 他真不知道。走了半辈子北路，也没撞上过 */
  | '什么也不知道'

const LORE_ODDS: readonly { value: MerchantLore; weight: number }[] = [
  { value: '亲眼见过', weight: 24 },
  { value: '听行里人说的', weight: 30 },
  { value: '把江湖人当修士', weight: 28 },
  { value: '什么也不知道', weight: 18 },
]

/** 掷定这个商旅究竟知道什么。一个人的见识不会因为你多问两次就变，所以只掷一次 */
export function merchantLore(): MerchantLore {
  const world = useWorldStore()
  const kept = world.getFlag('merchant-lore') as MerchantLore | undefined
  if (kept) return kept
  const rolled = pickWeighted(LORE_ODDS, (item) => item.weight)?.value ?? '听行里人说的'
  world.setFlag('merchant-lore', rolled)
  return rolled
}

/**
 * 玩家此刻认为「修士」是什么。
 *
 * 只有最后一种是对的。前面几种都能自洽地活很多年——
 * **一个错的世界模型跟一个对的一样好用**，直到它撞上什么。
 */
export type AdeptView =
  | '没听说过'
  | '说书人编的'
  | '很厉害的江湖人'
  | '山里的怪人'
  /** 对的那一种：那是另一套东西，跟江湖、跟官府都不搭界 */
  | '另一套东西'

/** 这些说法哪些是错的，错在哪一层 */
const VIEW_TRUTH: Record<AdeptView, '事实' | '因果' | null> = {
  没听说过: null,
  说书人编的: '事实',
  很厉害的江湖人: '因果',
  山里的怪人: '因果',
  另一套东西: null,
}

/** 他此刻会怎么跟自己说这件事 */
const VIEW_WORDS: Record<AdeptView, string> = {
  没听说过: '你没听说过这种人。',
  说书人编的: '说书的编出来哄人的。世上哪有那种人。',
  很厉害的江湖人: '修士就是江湖上很厉害的那种人。',
  山里的怪人: '山里有一种人，不吃不喝也能活。',
  另一套东西: '修士不是江湖人，也不是官。那是另一套东西。',
}

export function viewWords(view: AdeptView): string {
  return VIEW_WORDS[view]
}

/** 玩家现在的说法。没有就是没听说过 */
export function currentView(): AdeptView {
  const world = useWorldStore()
  return (world.getFlag('adept-view') as AdeptView | undefined) ?? '没听说过'
}

/** 这一趟谈完之后的样子 */
export interface Exchange {
  blocks: NarrativeBlock[]
  /** 他这一次实际得到的变化 */
  turn: '没问出什么' | '加深' | '动摇' | '有了别的说法' | '弄明白了'
  /** 谈完之后玩家的说法 */
  view: AdeptView
  /** 他现在有多笃定 */
  interpretation: Interpretation
  /** 一个并排放着、他还没采信的说法 */
  rival?: string
  /** 这条认知现在是不是错的。null 表示明确纠正 */
  mistaken?: '事实' | '因果' | null
}

/** 玩家问出口的那句。**他问什么，取决于他已经以为了什么** */
const ASKS: Record<AdeptView, string> = {
  没听说过: '你走那么远的路，见过什么稀奇事？',
  说书人编的: '说书的讲的那种人，真有吗？',
  很厉害的江湖人: '你在外头见过很厉害的人吗？',
  山里的怪人: '山里真有那种不吃不喝的人？',
  另一套东西: '你见过的那种人，后来还见过吗？',
}

/**
 * 谈一次。
 *
 * `willing` 是他今天肯不肯说——**跟他知不知道完全是两回事**，
 * 这一条在打听系统里已经立住了，这里继续沿用。
 */
export function talk(lore: MerchantLore, view: AdeptView, willing: boolean): Exchange {
  const character = useCharacterStore()
  const insight = character.attributes.insight
  const held: Interpretation = view === '没听说过' ? '未理解' : viewFirmness()

  const blocks: NarrativeBlock[] = [{ kind: 'dialogue', speaker: '你', text: ASKS[view] }]

  // —— 他知道，但今天不想说 ——
  if (!willing && lore !== '什么也不知道') {
    blocks.push(
      { kind: 'narration', text: '他没有立刻答话，先把杯子里的酒喝完了。' },
      { kind: 'dialogue', text: '走远道的事，说了你也不懂。' },
      { kind: 'narration', text: '他往院门外看了一眼，没有再说下去。' },
      { kind: 'narration', text: '你觉得他是知道些什么的。', tone: 'faint' },
    )
    return { blocks, turn: '没问出什么', view, interpretation: held }
  }

  // —— 他是真不知道 ——
  if (lore === '什么也不知道') {
    /**
     * 他老老实实说不知道。
     *
     * 但如果玩家问得笃定，他会顺着搭一句——**不是撒谎，是应酬**。
     * 而这一句应酬会让玩家更确信自己原来那个（可能是错的）说法。
     * 这是这一支里最不起眼、也最常发生的一种加固。
     */
    blocks.push(
      { kind: 'narration', text: '他想了想，摇头。' },
      { kind: 'dialogue', text: '我走了半辈子北路，没撞见过。' },
    )
    if (held === '确信' && view !== '没听说过') {
      blocks.push(
        { kind: 'dialogue', text: '不过你这么说……兴许真有吧。' },
        { kind: 'narration', text: '他是顺口应的。你却听得很认真。', tone: 'faint' },
      )
      return {
        blocks,
        turn: '加深',
        view,
        interpretation: '确信',
        mistaken: VIEW_TRUTH[view] ?? undefined,
      }
    }
    return { blocks, turn: '没问出什么', view, interpretation: held }
  }

  // —— 他自己就错了，而他不知道 ——
  if (lore === '把江湖人当修士') {
    /**
     * 他说的每一个字都是他亲眼所见，而他归错了类。
     *
     * **这不是撒谎，是真诚的错误。** 玩家几乎没有办法分辨——
     * 他讲得有细节、有地点、有人名，比那个真见过修士的人讲得还生动。
     */
    blocks.push(
      { kind: 'narration', text: '他来了兴致，把杯子推到一边。' },
      { kind: 'dialogue', text: '见过。北边有个姓卓的，一个人挡过十几号马贼。' },
      { kind: 'dialogue', text: '刀都没出鞘，那些人自己跪下了。' },
      { kind: 'narration', text: '他说得有名有姓，有地方有年份。' },
      { kind: 'dialogue', text: '那种人，就叫修士。' },
      {
        kind: 'narration',
        text: '你听得很入神。他讲的这些，比谁讲的都实在。',
        tone: 'faint',
      },
    )
    return {
      blocks,
      turn: view === '很厉害的江湖人' ? '加深' : '有了别的说法',
      view: '很厉害的江湖人',
      interpretation: view === '很厉害的江湖人' ? '确信' : '猜想',
      mistaken: '因果',
      ...(view === '很厉害的江湖人'
        ? {}
        : { rival: '走北路的商旅说，修士就是江湖上顶厉害的那种人。' }),
    }
  }

  // —— 他说的是对的。剩下的问题在玩家这边 ——
  return hearTruth(lore, view, held, insight, blocks)
}

/**
 * 他说了真话。玩家听不听得进去，是另一回事。
 *
 * 三样东西决定结果：
 *
 * - **他说得多明白**（亲眼见过的人说得准，听来的含糊）
 * - **玩家心思多细**（听不听得出弦外之音）
 * - **玩家原来多笃定**（越笃定越会把新话收编进旧框）
 *
 * 最后一条是「越来越自信但越来越错」的发条：
 * 一个还在猜的人听见「不是一路人」会楞一下；
 * 一个确信多年的人只会点点头，说「对，不是一个门派的」。
 */
function hearTruth(
  lore: MerchantLore,
  view: AdeptView,
  held: Interpretation,
  insight: number,
  blocks: NarrativeBlock[],
): Exchange {
  const vivid = lore === '亲眼见过'

  if (vivid) {
    blocks.push(
      { kind: 'narration', text: '他喝了一口，往院子外面看了一眼。' },
      { kind: 'dialogue', text: '有一年在渡口，我见过一个人。' },
      { kind: 'dialogue', text: '他站在船头。那条船走得飞快，可是水面上一点波纹都没有。' },
    )
  } else {
    blocks.push(
      { kind: 'narration', text: '他没有正面答，先绕了一圈。' },
      { kind: 'dialogue', text: '这种事，行里人偶尔提两句。' },
      { kind: 'dialogue', text: '说是有那么一种人，不归官管，也不走江湖那一路。' },
    )
  }

  // 玩家追问：这跟江湖上的高手有什么不一样
  if (view === '很厉害的江湖人' || view === '山里的怪人') {
    blocks.push({ kind: 'narration', text: '你问他，那跟江湖上的高手有什么不一样。' })
    /**
     * 他想说的是「完全不是一回事」。
     *
     * 但他是个商人，不是先生——他说不出那个分别，只能给一句
     * **含糊而准确**的话。真话被压缩了，而压缩就是失真的入口。
     */
    blocks.push({ kind: 'dialogue', text: '不是一路人。' })
  }

  /**
   * 听不听得出他在划一道界，而不是在比高低。
   *
   * 三项相加，再抖一下：
   *
   * - **心思**：底子。
   * - **他说得多具体**：亲眼见过的人举得出时间地点，含糊的话没有抓手。
   * - **原来多笃定**：这一项是负的，而且很重——**越笃定越听不进去**。
   *   一个确信多年的人，心思再细也会先把新话往旧框里塞。
   *
   * 抖动那一下不是为了随机而随机：同一个人在不同的夜里听同一句话，
   * 反应本来就不一样。没有它，「心思」就成了一道硬闸——
   * 60 分的人必然听懂，59 分的人必然听不懂，那是查表，不是对话。
   */
  const catches = insight + (vivid ? 12 : 0) - (held === '确信' ? 18 : 0) + randomBetween(-10, 10)

  if (catches >= 62) {
    // 他听懂了那句话的分量
    blocks.push(
      { kind: 'narration', text: '你没有马上接话。' },
      { kind: 'narration', text: '你想的是「不是一路人」这五个字。' },
      { kind: 'narration', text: '他不是在说那个人更厉害。他是在说，那根本不是同一种东西。' },
    )
    return {
      blocks,
      turn: '弄明白了',
      view: '另一套东西',
      interpretation: vivid ? '确信' : '猜想',
      mistaken: null,
    }
  }

  if (catches >= 46 && view !== '没听说过') {
    /**
     * 他觉出不对，可接不上。这里分两种，差别在**他手里有没有一个能对立的说法**。
     *
     * 商旅亲眼见过的，举得出时间、地点、那条船——玩家记得住这么一件事，
     * 于是心里从此有两个版本并排放着（**有了别的说法**）。
     *
     * 而含糊那一种给不出抓手，玩家只剩一个说不清的疙瘩——
     * 他没弄明白任何东西，只是不再那么肯定了（**纯动摇**）。
     * 这两种对玩家的体验完全不同，不能合成一种。
     */
    if (vivid) {
      blocks.push(
        { kind: 'narration', text: '你想接着问，可是不知道该问什么。' },
        { kind: 'narration', text: '他说的那句话你听懂了每一个字，合起来却不明白。' },
        { kind: 'narration', text: '那天夜里你躺着想了很久。', tone: 'faint' },
      )
      return {
        blocks,
        turn: '有了别的说法',
        view,
        interpretation: '猜想',
        rival: '那个走北路的商旅说，他们不是江湖那一路人。',
      }
    }
    blocks.push(
      { kind: 'narration', text: '你想再问细些，他却摆了摆手。' },
      { kind: 'dialogue', text: '我也是听来的。当不得真。' },
      { kind: 'narration', text: '这一夜你什么也没弄明白。' },
      {
        kind: 'narration',
        text: '只是从这天起，你原先笃定的那件事，忽然就不那么笃定了。',
        tone: 'faint',
      },
    )
    return { blocks, turn: '动摇', view, interpretation: held }
  }

  /**
   * 他把真话塞回了自己原来那个框里。
   *
   * **这是这一支最要紧的一格。** 商旅说了真话，玩家采信了，
   * 而玩家的世界模型比谈话之前更自信、也更错。
   * 没有人撒谎，没有人失误。
   */
  if (view === '没听说过' || view === '说书人编的') {
    blocks.push(
      { kind: 'narration', text: '你听得入了神。' },
      { kind: 'narration', text: '原来这世上真有那种人。' },
    )
    return {
      blocks,
      turn: '加深',
      view: '很厉害的江湖人',
      interpretation: '猜想',
      mistaken: '因果',
    }
  }

  blocks.push(
    { kind: 'narration', text: '你点了点头。' },
    { kind: 'narration', text: '不是一路人——那就是不同门派的意思吧。' },
    { kind: 'narration', text: '你把这一句记住了，此后再没有怀疑过。', tone: 'faint' },
  )
  return {
    blocks,
    turn: '加深',
    view,
    interpretation: '确信',
    mistaken: VIEW_TRUTH[view] ?? undefined,
  }
}

/** 他现在有多笃定。从知识条目里读回来 */
function viewFirmness(): Interpretation {
  const character = useCharacterStore()
  const entry = character.knowledge.find((item) => item.id === 'cultivators-exist')
  return entry?.interpretation ?? '猜想'
}

/** 他今天肯不肯说。同一个人，同一个问题，不同的日子未必一样 */
export function willingToday(): boolean {
  const world = useWorldStore()
  const poured = world.getFlag('poured-for-merchant') === true
  // 给他满过酒的人，问什么他都愿意多说两句
  return randomBetween(1, 100) <= (poured ? 88 : 62)
}
