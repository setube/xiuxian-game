import { LEANINGS, SPARKS } from '@/content/leanings'
import { useLeaningStore } from '@/stores/leanings'
import { useWorldStore } from '@/stores/world'
import type { Leaning } from '@/types/leaning'

import { meetsAll } from './conditions'
import { fillString } from './interpolate'

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
  return `spark:${id}`
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

  for (const spark of SPARKS) {
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

/** 按 id 取一个念头的定义 */
export function leaningById(id: string): Leaning | undefined {
  return LEANINGS.find((item) => item.id === id)
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
    const definition = LEANINGS.find((one) => one.id === item.id)
    if (!definition) continue
    const stage = leaning.stageOf(item.id)
    if (stage === '明白') lines.push(definition.says)
    else if (stage === '反复') lines.push(definition.stirring)
  }
  return lines
}
