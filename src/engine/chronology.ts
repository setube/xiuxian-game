import { useCharacterStore } from '@/stores/character'
import { useWorldStore } from '@/stores/world'
import type { LifeEvent } from '@/types/game'

import { meetsAll } from './conditions'
import { flagKey } from './facts'
import { pickWeighted } from './random'

/** 事件发生过就在旗标里留个记号，于是它天然随存档走，也随重开清空。键的拼法登记在 `facts.ts` */
function firedKey(id: string): string {
  return flagKey('event', id)
}

/**
 * 一条链是否已经开了头。
 *
 * 「父亲欠债」发生之后，「父亲去外地做工」才算链上待续。
 * 链的第一环没有前情，跟散事件一样按权重去争。
 */
function chainStarted(
  chain: string,
  events: readonly LifeEvent[],
  hasFired: (id: string) => boolean,
): boolean {
  return events.some((event) => event.chain === chain && hasFired(event.id))
}

/**
 * 挑出此刻该发生的那件事。
 *
 * 这里是全作最容易变成「随机事件模拟器」的地方，三道闸拦着：
 *
 * 1. **窗口不是日程**。window 只说这事最早最晚可能在几岁发生。
 *    条件不满足就一直不发生，过了窗口就永远不发生了——
 *    很多人的一生里，它确实没发生过。
 * 2. **链优先**。已经开了头的因果链排在散事件前面。父亲欠了债，
 *    接下来该来的是他去外地做工，不是随机撞上的一场庙会。
 * 3. **条件即因果**。事件靠前一件事留下的旗标串起来。
 *    链是长出来的，不是编号排出来的。
 *
 * @returns 无事发生时返回 null——那一年就真的什么也没发生
 */
export function pickEvent(events: readonly LifeEvent[]): LifeEvent | null {
  const world = useWorldStore()
  const character = useCharacterStore()
  const age = character.age

  const hasFired = (id: string): boolean => world.hasFlag(firedKey(id))

  const candidates = events.filter(
    (event) =>
      age >= event.window.from &&
      age <= event.window.to &&
      (event.repeatable === true || !hasFired(event.id)) &&
      meetsAll(event.requires),
  )
  if (candidates.length === 0) return null

  const continuing = candidates.filter(
    (event) => event.chain !== undefined && chainStarted(event.chain, events, hasFired),
  )
  const pool = continuing.length > 0 ? continuing : candidates

  return pickWeighted(pool, (event) => event.weight ?? 1) ?? null
}

/** 记下这件事已经发生过，它此后不会再来第二次。 */
export function markFired(event: LifeEvent): void {
  useWorldStore().setFlag(firedKey(event.id), true)
}

export function hasFired(id: string): boolean {
  return useWorldStore().hasFlag(firedKey(id))
}
