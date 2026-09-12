/**
 * 出身这件事，门禁侧共用的那一小份。
 *
 * 三样东西：把一世摆成某一行（`beOf`）、五格的键名（`ORIGIN_KEYS`）、
 * 一条条件说的是哪几行人（`originsUnder`）。
 * 放一处是同一个理由——**它们各自都曾经被抄过第二份**，
 * 而抄错的那一份不会喊，只会安静地少命中几行。
 */
import './lib/seeded'

import { ORIGINS, originById, type Origin } from '../src/content/origins'
import { useCharacterStore } from '../src/stores/character'
import { rollSideline, useHouseholdStore } from '../src/stores/household'
import type { Condition, OriginId } from '../src/types/game'

/**
 * 把这一世摆成某一行出身。
 *
 * ## 为什么值得单独放一个文件
 *
 * 出身拆成五格之后，走查里那句 `household.trade = '农户'` 变成了五行：
 * 主键、籍、业、产、家世各摆一次。二十几支门禁各抄一遍，
 * **抄错一格没有任何机器会喊**——`{ business: '药铺' }` 那一条会安静地
 * 永不命中，而门禁只会报「这一档没走到」，看着像内容的毛病。
 *
 * 所以这一步只在一个地方写，而且它不自己编数：五格全从出身表那一行取。
 * 表里改一个字，二十几支门禁跟着改，不必有谁记得去同步。
 *
 * ## 它只摆那五格
 *
 * 州府、门牌、家境一概不动——那些是各支门禁自己要挑的条件，
 * 由这里一并盖掉的话，「京城那一档」和「揭不开锅那一档」就没法单独摆了。
 *
 * ## 生产代码里没有这个函数的位置
 *
 * 走查要的是「假设这个人生在药铺」，一次五格一起换；
 * 而人生里的改动从来是一格一格来的——削爵只动 `station`，
 * 盘掉铺子只动 `business`。真出现「整行换掉」的内容需求，
 * 那也不是这个函数，那是又投了一次胎。
 */
export function beOf(id: OriginId): void {
  const row = originById(id)
  const household = useHouseholdStore()
  household.origin = row.id
  household.census = row.census
  household.livelihood = row.livelihood
  household.business = row.business
  household.tenure = row.tenure
  household.station = row.station
  // 贴补不是挑出身的五格之一，可它由行决定：不照表重掷，开 pinia 时随机掷到的那一行的
  // 针线活会留在一个布庄人家身上。要一户「还没有贴补」的农家，摆局之后自己归零
  household.sideline = rollSideline(row)
  /*
   * 五格摆完了才叫醒「人」。**顺序是这一行的全部分量所在。**
   *
   * ⚠️ `character` 的 setup 里掷体质、掷资质、掷寿数，而**立人、立户就发生在
   * 第一次 `useCharacterStore()` 那一刻**（`scripts/lib/staged.ts:90` 那段注释
   * 早写着这件事：「出身要在角色 store 建起来之前定……之后再 `beOf`
   * 只改得了家境四格，改不了已经立起来的户」）。
   *
   * 所以它必须排在五格**之后**：
   *
   *     五格 → 叫醒      户按这一行立　　　　　　✓
   *     叫醒 → 五格      户按默认出身立好了，再改五格只改得动家境
   *                      ——摆 `court` 会得到一个「住在宅里的皇子」，
   *                      而他有东西两邻（`mountain` 第五条当场红）
   *
   * 2026-09-12 我头一版把它放在开头，`mountain` 报「宫里长大的不该有东邻」。
   *
   * 那为什么非叫醒不可：**不叫醒就没有人**。探针 200 世实测——
   * 叫醒的平均身边 8.14 个活人，不叫醒的 0.00 个、200 世里 200 世一个人也没有。
   * 真实运行里 character 一开始就醒着，摆局不碰它就等于跳过了「出生」这一步。
   */
  useCharacterStore()
}

/**
 * 出身那五格的键名。**这一行是「五格」这件事在门禁侧唯一的定义处。**
 *
 * 五个键写在一处，是因为它们是**同一个问题的五种粗细**——
 * 问 `{ station: '宗室' }` 和问 `{ origin: 'court' }` 都是在挑出身，
 * 只是一个挑两行一个挑一行。摊开成五段 `else if` 写的话，
 * 新加一格而忘了在某一支里加一段，后果是那一条**整个不收窄**：
 * 一句只有宫里成立的话会被算成谁都读得到，于是它永远不会红。
 *
 * `satisfies` 那一句是这行字的分量所在：五个键必须真的是 `Condition`
 * 上的键，`Condition` 改名一格，这里当场编译不过。
 */
export const ORIGIN_KEYS = [
  'origin',
  'census',
  'livelihood',
  'business',
  'station',
] as const satisfies readonly (keyof Condition)[]

export type OriginKey = (typeof ORIGIN_KEYS)[number]

/** 这一条条件问了出身那五格里的任意一格吗 */
export function asksOrigin(one: Condition): boolean {
  return ORIGIN_KEYS.some((key) => one[key] !== undefined)
}

/**
 * 这一条条件说的是哪几行人。
 *
 * 从 `ORIGINS` 里筛，不在门禁里另写一张「客栈 → shop」的对照表。
 * 对照表会跟出身表各说各的，而它错的时候是**放行得太宽**——
 * 也就是漏报，比误报难发现得多。
 *
 * 不问五格的条件命中全部十一行：那正是对的，`{ age: ... }` 谁都成立。
 */
export function originsUnder(one: Condition): readonly Origin[] {
  return ORIGINS.filter(
    (row) =>
      (one.origin === undefined || row.id === one.origin) &&
      (one.census === undefined || row.census === one.census) &&
      (one.livelihood === undefined || row.livelihood === one.livelihood) &&
      (one.business === undefined || row.business === one.business) &&
      (one.station === undefined || row.station === one.station),
  )
}
