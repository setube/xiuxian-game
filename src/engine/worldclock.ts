import { WORLD_EVENTS } from '@/content/world-events'
import type { RegionKey, RegionState, WorldEvent } from '@/types/game'

/**
 * 世界自己走。
 *
 * 这一支回答一个问题：**玩家不在场的时候，世界在做什么？**
 *
 * 答案是：跟他在场时一模一样。旱灾不会因为玩家还没出生就不发生，
 * 也不会因为玩家在私塾念书就暂停。玩家出生在第九年的江陵府，
 * 那个府在第九年是什么样子，是前面八年一年一年变成的。
 *
 * ## 为什么不做成「随机灾难」
 *
 * 因为那会变成「系统在给玩家发灾难」。
 * 这里的每一件事都必须**有前因**：粮价涨是因为收成差，收成差是因为少雨，
 * 少雨是因为去年也少雨。链条上任何一环没凑上，后面就不会发生。
 *
 * 所以世界大部分年头是平的。这正是要的——**不是每个人都活在故事的中心。**
 */

/** 常年的光景。所有的数都以此为基准往两边偏 */
export function normalRegion(): RegionState {
  return { rain: 50, harvest: 50, grain: 100, order: 55, plague: 0 }
}

/** 各项的取值范围。粮价可以翻倍，别的都在百分制里 */
const BOUNDS: Record<RegionKey, { min: number; max: number }> = {
  rain: { min: 0, max: 100 },
  harvest: { min: 0, max: 100 },
  grain: { min: 40, max: 260 },
  order: { min: 0, max: 100 },
  plague: { min: 0, max: 100 },
}

function clampTo(key: RegionKey, value: number): number {
  const bound = BOUNDS[key]
  return Math.min(bound.max, Math.max(bound.min, value))
}

/** 一个府的账本：光景，加上各件事上一次发生在哪一年 */
export interface Region {
  state: RegionState
  /** 事件 id → 上次发生的年份。用来做冷却与「上一环有没有发生过」 */
  last: Record<string, number>
}

export function newRegion(): Region {
  return { state: normalRegion(), last: {} }
}

function meets(event: WorldEvent, region: Region): boolean {
  for (const [key, range] of Object.entries(event.when)) {
    const value = region.state[key as RegionKey]
    if (range.atLeast !== undefined && value < range.atLeast) return false
    if (range.atMost !== undefined && value > range.atMost) return false
  }
  return true
}

/**
 * 世上的事往回收。
 *
 * 没有这一步，任何一条链都会一路走到底——少一年雨就必然饿死人。
 * 而真实的世道是有惯性也有回弹的：雨水会回到常年，粮价会慢慢落，
 * 秩序会自己恢复一点。灾难之所以是灾难，是因为它跑赢了这个回弹。
 */
/**
 * 各项恢复得多快。
 *
 * 分项是必须的：粮价和秩序会自己回来（商路通了、官府剿了匪），
 * 但天时不听人的——雨水该少还是少。
 *
 * 这几个数决定了「灾年能拖多久」。收得太快，链条走不到后段；
 * 收得太慢，世界会卡在永久乱世里出不来。
 */
const RECOVERY: Record<RegionKey, number> = {
  rain: 0.34,
  harvest: 0.24,
  grain: 0.2,
  order: 0.22,
  plague: 0.3,
}

/**
 * 世上的事往回收。
 *
 * 没有这一步，任何一条链都会一路走到底——少一年雨就必然饿死人。
 * 而真实的世道是有惯性也有回弹的：雨水会回到常年，粮价会慢慢落，
 * 秩序会自己恢复一点。灾难之所以是灾难，是因为它跑赢了这个回弹。
 */
function driftToNormal(state: RegionState): RegionState {
  const normal = normalRegion()
  const next = { ...state }
  for (const key of Object.keys(normal) as RegionKey[]) {
    const gap = normal[key] - next[key]
    next[key] = clampTo(key, next[key] + gap * RECOVERY[key])
  }
  return next
}

export interface TickResult {
  region: Region
  /** 这一年发生的、值得记进编年史的事 */
  chronicles: string[]
}

/**
 * 让一个府过一年。
 *
 * 一年最多发生一件事——世界不该在同一年里又旱又涝又闹匪。
 * 链上的事优先于散事：粮价已经涨起来了，接下来该来的是囤粮，
 * 不是忽然天降丰收。
 */
export function tickRegion(region: Region, year: number): TickResult {
  const drifted: Region = { state: driftToNormal(region.state), last: { ...region.last } }

  const candidates = WORLD_EVENTS.filter((event) => {
    if (!meets(event, drifted)) return false
    // 上一环没发生过，这一环就轮不到
    if (event.after !== undefined && drifted.last[event.after] === undefined) return false
    const previous = drifted.last[event.id]
    if (previous !== undefined && year - previous < (event.cooldown ?? 3)) return false
    return true
  })

  if (candidates.length === 0) return { region: drifted, chronicles: [] }

  /**
   * 大部分年头什么也不该发生。
   *
   * 没有这一档，只要条件够了世界就一定出事，跑一百年会有八十几年在出事——
   * 那不是世界，那是灾难流水线。真实的年景大多是平的，
   * 平到没有人会把它记进编年史。
   *
   * 链上的事不适用：粮价已经涨起来了，接下来该来的就是该来的。
   */
  const onChain = candidates.some((event) => event.chain !== undefined && event.after !== undefined)
  if (!onChain && Math.random() < 0.58) return { region: drifted, chronicles: [] }

  // 链上的事排在散事前面。这是「有前因」的机制表达
  const continuing = candidates.filter(
    (event) => event.chain !== undefined && event.after !== undefined,
  )
  const pool = continuing.length > 0 ? continuing : candidates

  const total = pool.reduce((sum, event) => sum + (event.weight ?? 10), 0)
  let roll = Math.random() * total
  let chosen = pool[pool.length - 1]!
  for (const event of pool) {
    roll -= event.weight ?? 10
    if (roll <= 0) {
      chosen = event
      break
    }
  }

  const state = { ...drifted.state }
  for (const [key, delta] of Object.entries(chosen.shift)) {
    const attribute = key as RegionKey
    state[attribute] = clampTo(attribute, state[attribute] + (delta ?? 0))
  }

  return {
    region: { state, last: { ...drifted.last, [chosen.id]: year } },
    chronicles: chosen.chronicle ? [chosen.chronicle] : [],
  }
}
