import { SIGNS, type SignRule } from '@/content/signs'
import { useWorldStore } from '@/stores/world'
import type { NarrativeBlock, RegionKey, Sign } from '@/types/game'

import { meetsAll } from './conditions'
import { fillString } from './interpolate'

/**
 * 玩家怎么看世界。
 *
 * 这一支是「世界状态 → 玩家可观察到的现实」那一步。
 * 它跟 `observe.ts` 是同一个立场的两面：
 * 那边是**别人怎么看你**，这边是**你怎么看世界**。
 * 两边都不给数字，都可能失真，都要玩家自己拼。
 *
 * ## 一次只给一两处
 *
 * 这一条比什么都要紧。如果每年把粮价、雨水、治安、疫病
 * 四样一起报给玩家，那跟直接把 RegionState 打印出来没有区别——
 * 他会立刻建立起精确的世界模型，然后开始算。
 *
 * 只给一两处，玩家就只能靠这几年断续的印象去猜：
 * 「今年粥稀了」「村口有生人」「守夜的排上了」——
 * 他多半到很久以后才反应过来，这些是同一件事。
 */

/** 一年最多让玩家注意到几处。多了就等于把数值摊开给他看 */
const MAX_SIGNS = 2

function meetsRegion(rule: SignRule, state: Record<RegionKey, number>): boolean {
  for (const [key, range] of Object.entries(rule.when)) {
    const value = state[key as RegionKey]
    if (range.atLeast !== undefined && value < range.atLeast) return false
    if (range.atMost !== undefined && value > range.atMost) return false
  }
  return true
}

/**
 * 此刻这个人能看见的所有征象。
 *
 * 「能看见」由两重条件决定：世界得是那个样子（`when`），
 * 而且他得是那种会注意到的人（`who`）——
 * 农户看得出今年雨水不对，城里孩子看不出。
 */
export function visibleSigns(): SignRule[] {
  const world = useWorldStore()
  const state = world.regionState() as unknown as Record<RegionKey, number>
  return SIGNS.filter((rule) => meetsRegion(rule, state) && meetsAll(rule.who))
}

/**
 * 挑出这一年他真正留意到的那一两处。
 *
 * 按权重掷——同样看得见的几处里，哪一处进了他的眼，也是随机的。
 * 所以两个境况完全相同的人，对同一年的印象可以不一样。
 */
export function noticeSigns(limit = MAX_SIGNS): Sign[] {
  const pool = [...visibleSigns()]
  const picked: Sign[] = []

  while (picked.length < limit && pool.length > 0) {
    const total = pool.reduce((sum, rule) => sum + (rule.weight ?? 20), 0)
    let roll = Math.random() * total
    let index = pool.length - 1
    for (let i = 0; i < pool.length; i += 1) {
      roll -= pool[i]!.weight ?? 20
      if (roll <= 0) {
        index = i
        break
      }
    }
    const rule = pool.splice(index, 1)[0]!
    // 同一个刻度不重复报：说了「粥稀了」就不必再说「米价贵了」
    for (let i = pool.length - 1; i >= 0; i -= 1) {
      if (pool[i]!.from === rule.from) pool.splice(i, 1)
    }
    picked.push({
      id: rule.id,
      text: fillString(rule.says),
      ...(rule.reading ? { reading: fillString(rule.reading) } : {}),
      from: rule.from,
      ...(rule.tone ? { tone: rule.tone } : {}),
    })
  }

  return picked
}

/**
 * 把征象落成正文。
 *
 * 「他自以为看懂了的东西」用淡墨跟在后面——
 * 那句话的地位跟观察系统里的 `doubt` 一样：
 * 它是玩家的理解，不是世界的事实，而且**可能是错的**。
 */
export function signBlocks(signs: readonly Sign[]): NarrativeBlock[] {
  const blocks: NarrativeBlock[] = []
  for (const sign of signs) {
    blocks.push({ kind: 'narration', text: sign.text, ...(sign.tone ? { tone: sign.tone } : {}) })
    if (sign.reading) blocks.push({ kind: 'narration', text: sign.reading, tone: 'faint' })
  }
  return blocks
}
