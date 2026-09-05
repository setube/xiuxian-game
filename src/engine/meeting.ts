import { cultivatorById, type Bearing, type Cultivator } from '@/content/cultivators'
import { observerById } from '@/content/observers'
import { useCharacterStore } from '@/stores/character'
import { useDiaryStore } from '@/stores/diary'
import { makePerson, usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import type { AspectKey, NarrativeBlock } from '@/types/game'

import { observe, type Remark } from './observe'
import { pick } from './random'

/**
 * 见着人了。
 *
 * ## 这一层不是「鉴定」，是两个人互相打量了一回
 *
 * 从前找着人以后只有一句判决：摸一下腕子，`root >= 72`，收或者不收。
 * 那一句里没有人——玩家事后连对方姓什么、多大年纪、穿什么都说不出。
 *
 * 这一层要的是那中间的一段。它同时往两个方向走：
 *
 *     他怎么看你　　拿他的尺子量，量得准不准他自己也不知道
 *          ↕
 *     你怎么看他　　你没有尺子。你看得见的只有衣裳、年纪、手
 *
 * **两边都会看错，两边都不知道自己看错了。** 这是全作最早立下的那条
 * 「世界事实 ≠ 第三方判断 ≠ 玩家认知」头一回在同一个场景里两头都用上。
 *
 * ## 三条规矩
 *
 * 1. **一个字也不碰真实属性。** 跟 `observe.ts` 那条铁律同一条，
 *    只是这里多了一头：玩家对修士的认知也只落在认知层，
 *    不会因为「他其实是筑基」就让玩家知道他是筑基。
 *
 * 2. **他怎么待你，按他量到的数，不按真值。** 一个看不见资质的炼气修士
 *    量到你「悟性一般」就随口应付两句走了——哪怕你是万里挑一的胚子。
 *    看错的后果是真的，而你这辈子不会知道为什么。
 *
 * 3. **走到这一步不发任何东西。** 没有功法，没有境界，没有资格，
 *    连一件物事也没有。他只是第一次站在一个自己完全不了解的世界门口，
 *    而且**多半连门在哪儿都没看清**。
 */

/** 他打量你之后说的一句 */
export interface Verdict {
  aspect: AspectKey
  text: string
  doubt?: string
  /**
   * 这一句他说岔了没有。
   *
   * **玩家永远看不到这个字段**，它不落 store，也不进正文。
   * 一次会面里既可能有说对的，也可能有说岔的——
   * 而玩家听见的是同样平淡的两句话。
   */
  astray: boolean
}

/** 一次会面 */
export interface Meeting {
  /** 他是谁。人口册里的 id */
  who: string
  /** 他说的那几句 */
  says: Verdict[]
  /**
   * 他量到的分数平均。
   *
   * **他肯不肯多说，看的是这个数。** 它跟玩家究竟是什么样的人
   * 只有部分关系——中间隔着他有没有那双眼睛、准不准。
   */
  regard: number
  /** 他肯多说两句吗 */
  opened: boolean
  blocks: NarrativeBlock[]
}

/** 玩家一次能留意到几处。给全了就等于把这个人摊开给他看 */
const NOTICES = 3

/**
 * 让玩家跟一个修士照面。
 *
 * 顺序是有意的：**先他看你，再你看他，最后才轮到他开不开口。**
 * 他开不开口取决于前面量到的东西，所以量这一步必须在前头；
 * 而玩家看他跟他量到什么毫无关系，所以夹在中间也不影响。
 */
export function encounterCultivator(cultivatorId: string): Meeting | null {
  const cultivator = cultivatorById(cultivatorId)
  if (!cultivator) {
    console.error(`剧本让人去见一个不存在的修士：${cultivatorId}`)
    return null
  }

  const world = useWorldStore()
  const people = usePeopleStore()

  // 他是一个人，不是一句「一个人」。有姓有名有年纪，而且早就活着
  people.enroll(
    makePerson({
      id: cultivator.id,
      surname: cultivator.surname,
      given: cultivator.given,
      gender: cultivator.gender,
      bornYear: world.time.year - cultivator.bornBefore,
      doing: '修行',
      temper: cultivator.temper,
      place: cultivator.place,
    }),
  )
  // 认识了，可不知道名字。这两件事本来就是两回事
  people.meet(cultivator.id, cultivator.calls)

  const says = hisReading(cultivator)
  const regard = says.length === 0 ? 0 : says.reduce((sum, one) => sum + one.held, 0) / says.length
  const opened = regard >= cultivator.opensAt

  const noticed = yourReading(cultivator)

  const blocks: NarrativeBlock[] = [
    ...noticed.blocks,
    ...(opened ? cultivator.opens : cultivator.closes).map((text): NarrativeBlock => ({
      kind: 'narration',
      text,
    })),
  ]

  /**
   * 这一天进日录。
   *
   * 非进不可：多年以后再遇上一个修士、听见一句不一样的话，
   * 要靠 tag 把这一天翻回来。**这一天要是没落在日录上，
   * 后来的重新理解就没有地方落脚。**
   */
  useDiaryStore().jot(
    blocks.map((block) => ('text' in block ? block.text : '')).filter((text) => text.length > 0),
    ['门口', cultivator.place],
  )

  return {
    who: cultivator.id,
    says: says.map(({ aspect, text, doubt, astray }) => ({
      aspect,
      text,
      ...(doubt ? { doubt } : {}),
      astray,
    })),
    regard,
    opened,
    blocks,
  }
}

/**
 * 他打量你。
 *
 * 走的是 `observe()` 那一套原样——**这里不另造一把尺子**。
 * 先生看孩子和修士看孩子用的是同一段代码，不同的只是手里那把尺，
 * 而那正是这套设计想说的话：评价的差别来自尺子，不来自身份。
 *
 * ## 说出口的话只增不改
 *
 * 落 `claim` 而不是覆盖。于是多年以后另一位修士再看你一回，
 * 两句话并排放在同一面下——**「三十六岁你终于知道当年那句是错的」
 * 那一刻不需要任何新机制，它就是这两条记录挨在一起。**
 */
function hisReading(cultivator: Cultivator): Remark[] {
  const observer = observerById(cultivator.observer)
  if (!observer) {
    console.error(`这个修士手里那把尺子不存在：${cultivator.observer}`)
    return []
  }

  const character = useCharacterStore()
  const world = useWorldStore()
  const remarks = observe(observer)
  for (const remark of remarks) {
    character.claim(remark.aspect, remark.source, remark.text, world.time, remark.doubt)
  }
  return remarks
}

/**
 * 你打量他。
 *
 * ## 这一头你没有尺子
 *
 * 修士好歹还有一把量得不准的尺；玩家手里什么也没有。
 * 他看得见的只有衣裳、年纪、手上有没有茧——**每一处都是真的，
 * 而他从每一处读出来的意思多半是错的。**
 *
 * ## 读错得越多，他越笃定
 *
 * 这一条看着反常，其实最像真的：几处错误解释是会互相印证的。
 * 他看着年轻、衣裳旧、手上没茧——三处凑到一起，
 * 「不过是个穷道士」这个结论就变得非常结实。
 *
 * 而真相是他一样也没看懂。**一个人最笃定的时候，
 * 往往正是他错得最整齐的时候。**
 */
function yourReading(cultivator: Cultivator): { blocks: NarrativeBlock[] } {
  const character = useCharacterStore()
  const world = useWorldStore()

  const noticed = take(cultivator.bearing, NOTICES)
  const blocks: NarrativeBlock[] = []
  for (const one of noticed) {
    blocks.push({ kind: 'narration', text: one.sees })
    // 他自以为看懂的那句用淡墨。跟征象那一层同一个地位：它是理解，不是事实
    blocks.push({ kind: 'narration', text: one.reads, tone: 'faint' })
  }

  const wrong = noticed.filter((one) => one.mistaken !== undefined)
  character.learn({
    id: `met:${cultivator.id}`,
    title: `你见过的那个人`,
    summary: `你见过${cultivator.calls}。${noticed.map((one) => one.reads).join('')}`,
    category: '人物',
    at: world.time,
    // 见过了。这一档只能往上走，此后再听人说一嘴也退不回「听说」
    contact: '见过',
    // 错得越整齐越笃定
    interpretation: wrong.length >= 2 ? '确信' : '猜想',
    ...(deepest(wrong) ? { mistaken: deepest(wrong) } : {}),
  })

  return { blocks }
}

/**
 * 他这一回错在哪一层。
 *
 * 既把事情认错了、道理又想歪了的时候，记的是**因果**——
 * 因为那一层更深也更难破。事实错误撞一回就散了
 * （他后来知道了那人一百多岁）；而「穿得旧所以本事不大」这条道理
 * 可以跟他一辈子，撞破一次也不会动摇，他只会觉得那是个例外。
 */
function deepest(wrong: readonly Bearing[]): '事实' | '因果' | undefined {
  if (wrong.some((one) => one.mistaken === '因果')) return '因果'
  if (wrong.some((one) => one.mistaken === '事实')) return '事实'
  return undefined
}

/** 从几处里随手挑几处。同一个人两次见面留意到的未必一样 */
function take(pool: readonly Bearing[], count: number): Bearing[] {
  const rest = [...pool]
  const picked: Bearing[] = []
  while (picked.length < count && rest.length > 0) {
    const one = pick(rest)
    if (!one) break
    rest.splice(rest.indexOf(one), 1)
    picked.push(one)
  }
  return picked
}
