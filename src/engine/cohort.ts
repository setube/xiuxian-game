import type { AttributeKey, Percentile } from '@/types/game'

/**
 * 同龄人里的位次。
 *
 * ## 为什么要有这一层：一个门槛的作者不是它自己
 *
 * `riverman.ts` 那条入场券写的是 `{ attribute: { key: 'fortune', atLeast: 50 } }`。
 * 用户 2026-09-08 亲自把它从 55 改到 50，当时实测换来 **4% → 15%**。
 *
 * **而 2026-09-09 同一个门槛只剩 11.7%。** 门槛数字一个字没改——
 * 是这两天所有人往库里加内容，事件池变大，涨命数的那些选项被稀释了。
 *
 * 这就是「没有作者的数」那一族最难缠的一种：**每个人都在动它，
 * 而没有人认为自己在动它**，改动方也永远不会收到任何提示。
 *
 * 用户的裁决（2026-09-09）：**改成按位次判，不再用绝对值。**
 * 上游加多少内容，「前四分之一的人」永远是四分之一。
 *
 * ## 第二件它顺带修好的：门槛在窗口内是漂的
 *
 * 逐岁实测（1200 世），命数的第九十百分位：
 *
 *     十六岁  45      ← 固定门槛 50 在这个岁数几乎没人够得着
 *     二十岁  44
 *     二十四  48
 *     二十八  51      ← 到这儿才刚好跨过
 *
 * 于是那条「16–28 岁之间够得着 50」的窗口，**实际上是一条
 * 「熬到二十六岁以后才开门」的规则**——而这件事没有写在任何地方，
 * 也不是任何人的本意。
 *
 * 位次判据消掉了这个漂移：`p75` 在十六岁是 38、二十八岁是 45，
 * **而「前四分之一」在哪一岁都是前四分之一。**
 *
 * ## 这张表是实测固化下来的，会过期
 *
 * 它不是算出来的（属性起手值是十三种出身各一组常数，可命数是一路
 * 攒出来的，攒多少取决于他走了什么路）。所以只能实测。
 *
 * **量它的那天、量法、原始数写在下面每一行的注释里**——
 * 一个只写着数字的表，谁也不知道它是哪天、在什么世界里量的。
 */

/**
 * 逐岁的命数分位线。
 *
 * 2026-09-09 实测，1200 世真世跑（`node_modules/.tmp/probe-percentile.ts`）：
 * 每一世走到某一岁的那一刻取一次 `fortune`，按岁分桶排序取分位。
 *
 *     岁    n     p50   p75   p90
 *     14  1056    32    40    45
 *     16  1147    32    38    45
 *     18   123    32    36    43     ← n 小，十八岁那年样本少
 *     20   323    33    37    44
 *     22   378    34    39    46
 *     24   508    35    41    48
 *     26   573    37    43    50
 *     28   585    38    45    51
 *     30   615    39    46    53
 *
 * ⚠️ **十八岁那一行的 n 只有 123**，比邻近的岁数少一个量级。
 * 那不是 bug，是年表在那个岁数的事件密度低（很多人一年跨过去了），
 * 而它意味着**那一行的分位线比别处抖**。列在这里是为了让下一个人
 * 看得见这件事，而不是以为每一行都一样可靠。
 *
 * 没列的岁数按最近的两行线性插值（`lineAt`）。
 */
const FORTUNE_LINES: readonly { age: number; p50: number; p75: number; p90: number }[] = [
  { age: 14, p50: 32, p75: 40, p90: 45 },
  { age: 16, p50: 32, p75: 38, p90: 45 },
  { age: 18, p50: 32, p75: 36, p90: 43 },
  { age: 20, p50: 33, p75: 37, p90: 44 },
  { age: 22, p50: 34, p75: 39, p90: 46 },
  { age: 24, p50: 35, p75: 41, p90: 48 },
  { age: 26, p50: 37, p75: 43, p90: 50 },
  { age: 28, p50: 38, p75: 45, p90: 51 },
  { age: 30, p50: 39, p75: 46, p90: 53 },
]

/** 眼下只有命数量过。别的属性要用这一层，先照同一个法子量一张表 */
const TABLES: Partial<Record<AttributeKey, typeof FORTUNE_LINES>> = {
  fortune: FORTUNE_LINES,
}

const COLUMN: Readonly<Record<Percentile, 'p50' | 'p75' | 'p90'>> = {
  前一半: 'p50',
  前四分之一: 'p75',
  前十分之一: 'p90',
}

/**
 * 这个岁数上，那条分位线画在几分。
 *
 * 表外的岁数按最近两行插值；两头之外就取端点那一行——
 * **不外推**。十岁的命数分布这张表没量过，硬外推出来的数
 * 是一个没有出处的数，而这一层存在的全部理由就是反对那种数。
 */
function lineAt(table: typeof FORTUNE_LINES, age: number, column: 'p50' | 'p75' | 'p90'): number {
  const first = table[0]!
  const last = table[table.length - 1]!
  if (age <= first.age) return first[column]
  if (age >= last.age) return last[column]
  for (let i = 0; i < table.length - 1; i += 1) {
    const lo = table[i]!
    const hi = table[i + 1]!
    if (age >= lo.age && age <= hi.age) {
      const span = hi.age - lo.age
      const t = span === 0 ? 0 : (age - lo.age) / span
      return lo[column] + (hi[column] - lo[column]) * t
    }
  }
  return last[column]
}

/**
 * 他这一项在同龄人里进不进得了前某某。
 *
 * @param key 哪一项。眼下只有 `fortune` 量过表
 * @param age 他今年多大
 * @param value 他此刻这一项是多少
 * @param among 要进的那一档
 */
export function withinTop(
  key: AttributeKey,
  age: number,
  value: number,
  among: Percentile,
): boolean {
  const table = TABLES[key]
  /*
   * 没量过表的属性一律返回 false，**而不是 true**。
   *
   * 返回 true 的话，写错一个 key 就是「这一条对谁都成立」——
   * 那正是 `Condition` 那张登记表当初要防的那种静默放行。
   * 返回 false 至少会让那一卷零次演出，而零次是查得出来的。
   */
  if (table === undefined) return false
  return value >= lineAt(table, age, COLUMN[among])
}

/** 那条线此刻画在几分。门禁和探针拿它印报表，内容层不该直接用 */
export function lineFor(key: AttributeKey, age: number, among: Percentile): number | undefined {
  const table = TABLES[key]
  return table === undefined ? undefined : lineAt(table, age, COLUMN[among])
}
