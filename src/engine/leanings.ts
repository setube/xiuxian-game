import { DAMPERS, LEANINGS, SPARKS } from '@/content/leanings'
import { WISH_SPARKS, WISHES } from '@/content/wishes'
import { openingById } from '@/content/openings'
import { useLeaningStore } from '@/stores/leanings'
import { useWorldStore } from '@/stores/world'
import type { Leaning } from '@/types/leaning'

import { useCharacterStore } from '@/stores/character'

import { meetsAll } from './conditions'
import { flagKey } from './facts'
import { fillString } from './interpolate'
import { randomBetween } from './random'

/**
 * 念头怎么长起来，又怎么在后面的日子里反复出现。
 *
 * ## 三个阶段，而中间那一层是关键
 *
 *     埋着　什么也不显示，只在日录里留下痕迹
 *     反复　带某些标记的日子里，正文多出一句
 *     明白　他自己说出来了，人物面板上出现那句话
 *
 * 念头一旦冒出来就变成「【任务：成为郎中】」，那是任务系统，
 * 不是一个人的一生。真实的样子是：看见郎中会多看一会儿，
 * 路过药铺会进去问一句——**很多年之后他才发现自己一直在做这件事。**
 *
 * ## 火种不许自带剧情
 *
 * `SPARKS` 只认已经发生过的事：日录里的标记、身上的旗标、
 * 认识的人、知道的事。念头必须从人生里长出来，
 * 不能是另一套平行的剧本。
 */

/** 同一个火种点过没有。记在旗标里，于是随存档走，也随重开清空 */
function sparkKey(id: string): string {
  return flagKey('spark', id)
}

/** 他刚刚说出口的那句话。没有就是 null */
export interface Awakening {
  leaning: Leaning
  says: string
}

/**
 * 这一天过完了，看看有什么念头被推了一把。
 *
 * @param tags 这一天沾着的标记
 * @returns 他是不是**恰好在今天**把某个念头说出了口
 */
export function kindle(tags: readonly string[]): Awakening | null {
  const world = useWorldStore()
  const leaning = useLeaningStore()
  let awakened: Awakening | null = null

  for (const spark of [...SPARKS, ...WISH_SPARKS]) {
    if (spark.once && world.hasFlag(sparkKey(spark.id))) continue
    // 写了标记就得当天沾着，写了条件就得满足。两样都写就都要
    if (spark.tags && !spark.tags.some((tag) => tags.includes(tag))) continue
    if (!meetsAll(spark.requires)) continue
    // 大多数时候，做过就做过了，心里什么也没留下
    if (spark.chance !== undefined && Math.random() > spark.chance) continue

    const justNamed = leaning.stir(
      spark.leaning,
      spark.weight,
      { at: { ...world.time }, text: fillString(spark.text) },
      world.time,
    )
    if (spark.once) world.setFlag(sparkKey(spark.id), true)

    if (justNamed) {
      const definition = LEANINGS.find((item) => item.id === spark.leaning)
      if (definition) awakened = { leaning: definition, says: definition.says }
    }
  }

  return awakened
}

/**
 * 这一天里，他那些念头会不会让他多做一点什么。
 *
 * **不加选项，不加任务，只在他本来就会做的事情上多一句话。**
 * 玩家会先觉得这句话眼熟，很久以后才反应过来自己一直在这么干。
 *
 * @returns 要往这一天的正文里添的那几句
 */
export function echoesOn(tags: readonly string[]): string[] {
  const leaning = useLeaningStore()
  const lines: string[] = []

  for (const item of leaning.atLeast('反复')) {
    const definition = LEANINGS.find((one) => one.id === item.id)
    if (!definition) continue
    for (const echo of definition.echoes) {
      if (echo.tags.some((tag) => tags.includes(tag))) {
        lines.push(fillString(echo.text))
        // 一个念头一天只出一句，否则同一天会絮絮叨叨说三遍
        break
      }
    }
  }
  return lines
}

/**
 * 他心里那个东西，说出口是哪一句。
 *
 * **愿望和念头都要查。** 两者共用一个仓库——他自己分不出心里那个
 * 是「想活得久一点」（愿望）还是「想学看病」（念头），
 * 只查一张表就会漏掉另一层，把 id 直接摆到人面前。
 */
export function saysOf(id: string): string | undefined {
  const found = LEANINGS.find((one) => one.id === id) ?? WISHES.find((one) => one.id === id)
  return found?.says
}

/**
 * 他此刻对自己的说法。
 *
 * 说出来了就是那句话；只到「反复」这一档的，给的是一句
 * **他自己也说不清的话**——那正是这个阶段真实的样子。
 */
export function selfSense(): string[] {
  const leaning = useLeaningStore()
  const lines: string[] = []
  for (const item of leaning.growing) {
    // 愿望和念头都要出现在这里——他分不出自己心里那个是哪一种
    const definition =
      LEANINGS.find((one) => one.id === item.id) ?? WISHES.find((one) => one.id === item.id)
    if (!definition) continue
    const stage = leaning.stageOf(item.id)
    if (stage === '明白') lines.push(definition.says)
    else if (stage === '反复') lines.push(definition.stirring)
  }
  return lines
}

/**
 * 这一天有没有什么事把某个念头压下去了。
 *
 * **念头不能只会越来越强。** 跟 `kindle` 走同一套闸门，
 * 只是方向相反——而且往往顺带把另一个念头顶上来：
 * 一个念头退下去的时候，接上的通常不是空白。
 *
 * @returns 要往这一天的正文里添的那几句
 */
export function dampen(tags: readonly string[]): string[] {
  const world = useWorldStore()
  const leaning = useLeaningStore()
  const lines: string[] = []

  for (const damper of DAMPERS) {
    if (damper.once && world.hasFlag(sparkKey(damper.id))) continue
    if (damper.tags && !damper.tags.some((tag) => tags.includes(tag))) continue
    if (!meetsAll(damper.requires)) continue
    if (damper.chance !== undefined && Math.random() > damper.chance) continue

    // 没长起来的念头压不动。他没想过走，就谈不上打消这个念头
    if (leaning.weightOf(damper.leaning) <= 0) continue

    const moment = { at: { ...world.time }, text: fillString(damper.text) }
    leaning.stir(damper.leaning, -damper.weight, moment, world.time)
    if (damper.instead) {
      leaning.stir(damper.instead.leaning, damper.instead.weight, moment, world.time)
    }
    if (damper.once) world.setFlag(sparkKey(damper.id), true)
    lines.push(moment.text)
  }
  return lines
}

/**
 * 他读到这个机会时，看见的是什么。
 *
 * 头一句谁都读得到——**那是这件事本来的样子**。
 * 心里存着念头的人会多读出一句，但那一句**不添信息，只添注意力**：
 * 「那支商队要往很远的地方去」是他自己想到的，不是别人多告诉他的。
 *
 * 埋着的念头什么也不多添——那时候他自己都还没意识到。
 */
export function readingOf(openingId: string): string[] {
  const opening = openingById(openingId)
  if (!opening) return []

  const leaning = useLeaningStore()
  const lines = [fillString(opening.plain)]
  for (const reading of opening.readings) {
    const stage = leaning.stageOf(reading.leaning)
    if (stage === '反复' || stage === '明白') lines.push(fillString(reading.text))
  }
  return lines
}

/** 一个愿望分岔的结果 */
export interface Branching {
  wish: string
  /** 长成了哪个念头。null 表示什么也没通向 */
  into: string | null
  text: string
}

/**
 * 愿望长到这里才分岔。
 *
 * **这个数不跟着念头的门槛走。** 愿望有自己的一套火种（`WISH_SPARKS`），
 * 攒分量的快慢跟念头不是一回事，所以不能写成「比说出口低一档」——
 * 那样念头门槛一改，这里就会跟着漂，而漂的理由跟愿望本身毫无关系。
 *
 * 它要表达的是另一件事：**一个人先有了模糊的想要，才可能找到一个方向。**
 * 所以分岔必然发生在他说得出口之前。
 */
export const BRANCH_AT = 12

/**
 * 愿望长大了，看看它往哪儿分岔。
 *
 * **分岔取决于他手边有什么。** 一个想活久一点的人，
 * 家里正好开着药铺，他会往医上走；听说过山里那种人的，
 * 会往「想弄明白」上走；什么也没接触过的——**什么也不长**。
 *
 * 最后那一种是这一层最要紧的一格：**愿望不必通向任何地方。**
 * 若一个愿望必然通向某一条路，那条路就是系统偷偷安排的主线。
 *
 * 一个愿望只分岔一次。此后它仍然在，只是不再往外长了——
 * 他找到了一条路，可他当初那份怕并没有消失。
 */
export function branch(): Branching | null {
  const world = useWorldStore()
  const leaning = useLeaningStore()
  const insight = useCharacterStore().attributes.insight

  for (const wish of WISHES) {
    if (leaning.weightOf(wish.id) < BRANCH_AT) continue
    if (world.hasFlag(flagKey('branched', wish.id))) continue

    const feasible = wish.branches.filter((one) => one.leaning && meetsAll(one.requires))
    const blank = wish.branches.find((one) => !one.leaning)

    /**
     * 想不想得通。
     *
     * **手边有路，不等于他找得到。** 同样想活久一点、同样听说过
     * 山里那种人，有的人会把两件事连起来，有的人一辈子也没连上——
     * 他就是怕，而且不知道能怎么办。
     *
     * 没有这一道闸，凡是听说过修士的人都会必然走上那条路，
     * 「愿望不必通向任何地方」就成了一句空话。
     */
    const figuresOut = randomBetween(1, 100) <= 22 + insight * 0.55
    const taken = feasible.length > 0 && figuresOut ? feasible[0]! : blank
    if (!taken) continue

    world.setFlag(flagKey('branched', wish.id), true)
    // 记下它究竟通向了哪儿。走查靠它分辨，而不是去猜最重的那个念头
    if (taken.leaning) world.setFlag('branched-into', taken.leaning)
    const moment = { at: { ...world.time }, text: fillString(taken.text) }
    // 不写 leaning 就是「什么也没通向」——他就是怕，而且不知道能怎么办
    if (taken.leaning) leaning.stir(taken.leaning, taken.weight, moment, world.time)
    else leaning.stir(wish.id, 0, moment, world.time)
    return { wish: wish.id, into: taken.leaning ?? null, text: moment.text }
  }
  return null
}

/** 一个 id 是不是愿望。愿望没有 echoes，所以要分得出来 */
export function isWish(id: string): boolean {
  return WISHES.some((wish) => wish.id === id)
}
