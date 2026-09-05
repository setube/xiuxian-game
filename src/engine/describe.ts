/**
 * 时序与数目的文字化。
 *
 * 这里只剩时间和数字。原先那套「悟性 → 尚可」的程度词已经删掉：
 * 把内部刻度翻译成程度词再列成一栏，仍然是一块传统 RPG 数值面板，
 * 只是把数字换成了词。角色对自己的认知由 Aspect 承担（见 engine/aspects.ts）。
 */
import type { GameTime } from '@/types/game'

const DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const

/** 阿拉伯数字译成汉字，支持 0–999，足够覆盖凡人一生的年月。 */
export function toChineseNumber(value: number): string {
  const n = Math.floor(Math.abs(value))
  if (n < 10) return DIGITS[n] ?? '〇'

  if (n < 20) {
    const ones = n % 10
    return ones === 0 ? '十' : `十${DIGITS[ones]}`
  }

  if (n < 100) {
    const tens = Math.floor(n / 10)
    const ones = n % 10
    return `${DIGITS[tens]}十${ones === 0 ? '' : DIGITS[ones]}`
  }

  const hundreds = Math.floor(n / 100)
  const remainder = n % 100
  if (remainder === 0) return `${DIGITS[hundreds]}百`
  // 一百零五：十位为空时补「零」
  if (remainder < 10) return `${DIGITS[hundreds]}百零${DIGITS[remainder]}`
  return `${DIGITS[hundreds]}百${toChineseNumber(remainder)}`
}

const MONTH_NAMES = [
  '正月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '冬月',
  '腊月',
] as const

export function describeMonth(month: number): string {
  return MONTH_NAMES[month - 1] ?? '正月'
}

/** 初一、十五、廿三、三十。 */
export function describeDay(day: number): string {
  if (day <= 10) return `初${toChineseNumber(day)}`
  if (day < 20) return toChineseNumber(day)
  if (day === 20) return '二十'
  if (day < 30) return `廿${DIGITS[day % 10]}`
  return '三十'
}

/** 「三月初七」 */
export function describeDate(time: GameTime): string {
  return `${describeMonth(time.month)}${describeDay(time.day)}`
}

/** 「第十六年 · 三月初七」 —— 状态栏与编年逐条用。 */
export function describeStamp(time: GameTime): string {
  return `第${toChineseNumber(time.year)}年 · ${describeDate(time)}`
}

/** 「人间 · 第十六年 · 三月初七」 —— 场景标题的完整时序。 */
export function describeTime(time: GameTime): string {
  return `人间 · ${describeStamp(time)}`
}

/**
 * 年龄的文字说法。
 *
 * ## 头一年不说「〇岁」
 *
 * 「〇岁」不是一个年龄，是一个没算出来的数——中文里没人这么说话。
 * 一个刚落地的孩子说「刚出生」，满了月说「三个月」，快满周岁说「快一岁了」。
 *
 * 满一岁之后回到整年，跟从前一样：一个人的岁数在中文里本来就是整年的，
 * 「三岁零四个月」是大人替他算的，不是他自己那一格。
 *
 * @param age 整岁。`year - bornYear`
 * @param months 出生到现在过了几个月。**只有头一年用得着**；
 *   不给就退回整岁的说法（有些地方拿不到出生月，比如构造出来的人）
 */
export function describeAge(age: number, months?: number): string {
  if (age === 0 && months !== undefined) {
    if (months <= 0) return '刚出生'
    if (months >= 11) return '快一岁了'
    return `${toChineseNumber(months)}个月`
  }
  return `${toChineseNumber(age)}岁`
}

/**
 * 出生到此刻过了几个月。
 *
 * 年月都要，因为跨年之后光看月份会倒退（腊月生的，次年正月是「一个月」
 * 不是「负十一个月」）。
 */
export function monthsSince(
  born: { year: number; month: number },
  now: { year: number; month: number },
): number {
  return Math.max(0, (now.year - born.year) * 12 + (now.month - born.month))
}

/** 一段时长。effects 里的 time 据此译成选项右侧的小字 */
export interface TimeSpan {
  years?: number
  months?: number
  days?: number
}

/**
 * 时间的代价。
 *
 * 这一句要出现在选项右侧，因为时间是这个游戏真正稀缺的东西——
 * 读几年书和下一天地，玩家必须在落笔之前就知道自己要付出什么。
 * 反过来说，一个不花时间的选择，右侧就该是空的。
 */
export function describeSpan(span: TimeSpan): string | null {
  const years = span.years ?? 0
  const months = span.months ?? 0
  const days = span.days ?? 0

  if (years > 0) return months > 0 ? `${toChineseNumber(years)}年余` : `${toChineseNumber(years)}年`
  if (months > 0) {
    if (months === 6) return '半年'
    return `${toChineseNumber(months)}个月`
  }
  if (days >= 30) return '一个月'
  if (days >= 15) return '半月'
  if (days > 1) return `${toChineseNumber(days)}日`
  if (days === 1) return '一日'
  return null
}
