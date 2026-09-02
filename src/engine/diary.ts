import { HINDSIGHTS } from '@/content/hindsight'
import { useDiaryStore } from '@/stores/diary'
import { useWorldStore } from '@/stores/world'
import type { DayEntry } from '@/types/game'

import { meetsAll } from './conditions'
import { toChineseNumber } from './describe'

/**
 * 日录：旧日子怎么被后来的事重新点亮。
 *
 * **这是「日志」和「回忆」的分界线。**
 *
 * 把每天的话原样存起来是日志——「今天帮家里收了一下午麦子」
 * 存三百条也还是三百句废话。而当玩家在二十岁那年看见
 *
 *     你十七岁以后，再也没有替家里收过麦子。
 *
 * 那三百句废话忽然全部变成了人生。
 *
 * 所以这一支只做两件事，都不改历史：
 *
 * 1. **点亮**——新知识回头给某些旧日子追一句「原来那天……」
 * 2. **回望**——某件天天做的事，从某年起再也没有出现过
 *
 * 第二件是算出来的，不存。它每次回看时重新数一遍，
 * 因为「再也没有」这句话的真假，取决于回看的那一刻。
 */

/**
 * 回头看看有没有哪一天忽然想明白了。
 *
 * 每次玩家学到新东西之后调一次。它不主动弹给玩家看——
 * **想起一件旧事本来就是安静的**，日录面板里那一行小字就够了。
 *
 * @returns 这一次点亮了几天
 */
export function reconsider(): number {
  const diary = useDiaryStore()
  const world = useWorldStore()
  const now = world.time.year
  let lit = 0

  for (const rule of HINDSIGHTS) {
    if (!meetsAll(rule.needs)) continue
    for (const tag of rule.tags) {
      for (const day of diary.taggedWith(tag)) {
        const gap = now - day.at.year
        // 当场就明白的不叫「多年以后」。这一条是这套东西的分寸所在
        if (gap < rule.after) continue
        const text = rule.text.replace('{years}', toChineseNumber(gap))
        if (diary.realize(day.id, world.time, text)) lit += 1
      }
    }
  }
  return lit
}

/** 一件天天做的事，后来再也没做过 */
export interface Gone {
  tag: string
  /** 最后一次是哪一年 */
  lastYear: number
  /** 从那以后过了多少年 */
  since: number
  /** 一共做过多少天 */
  days: number
}

/** 哪些标记值得回望。太琐碎的东西不值得说「再也没有」 */
const WORTH_MISSING: Record<string, string> = {
  替家里下地: '你{age}岁以后，再也没有替家里下过地。',
  私塾: '你{age}岁以后，再也没有去过私塾。',
  山那边: '你{age}岁以后，再也没有往山那边去过。',
  找孩子玩: '你{age}岁以后，再也没有跟村里的孩子一起疯跑过。',
  镇上: '你{age}岁以后，再也没有一个人去过镇上。',
}

/**
 * 数一数有什么是再也没有发生过的。
 *
 * **这是算出来的，不存。** 因为「再也没有」这句话的真假
 * 取决于回看的那一刻——今天成立，明天他又去了一趟，就不成立了。
 * 存下来的那一刻它就会开始说谎。
 *
 * 三条门槛，缺一不可：
 *
 * - 得**做过足够多次**（做过一两回算不上「再也没有」）
 * - 得**隔了足够久**（去年没去过不叫再也没去过）
 * - 得**真的停了**（还在做的事不算）
 */
export function whatStopped(minDays = 3, minGap = 3): Gone[] {
  const diary = useDiaryStore()
  const world = useWorldStore()
  const now = world.time.year

  const seen = new Map<string, { last: number; days: number }>()
  for (const day of diary.days) {
    for (const tag of day.tags) {
      if (!(tag in WORTH_MISSING)) continue
      const row = seen.get(tag) ?? { last: 0, days: 0 }
      row.days += 1
      row.last = Math.max(row.last, day.at.year)
      seen.set(tag, row)
    }
  }

  const gone: Gone[] = []
  for (const [tag, row] of seen) {
    const since = now - row.last
    if (row.days < minDays || since < minGap) continue
    gone.push({ tag, lastYear: row.last, since, days: row.days })
  }
  return gone.sort((a, b) => b.days - a.days)
}

/** 把一条「再也没有」写成话 */
export function describeGone(gone: Gone): string {
  const world = useWorldStore()
  const age = gone.lastYear - world.bornYear
  return (WORTH_MISSING[gone.tag] ?? '你{age}岁以后，再也没有做过这件事。').replace(
    '{age}',
    toChineseNumber(age),
  )
}

/** 某一年的日子 */
export function daysOfYear(year: number): DayEntry[] {
  return useDiaryStore().days.filter((day) => day.at.year === year)
}
