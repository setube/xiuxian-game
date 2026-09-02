/**
 * 掷骰。
 *
 * 全作的随机只有一个用处：让每一世的世界不同。
 * 它绝不出现在界面上——没有「随机事件」提示，没有抽取动画，
 * 没有一屏四张卡让你挑一个开局。玩家看到的永远是既成事实：
 * 「你生在柳溪村，家里有六亩薄田。」
 *
 * 这是本作与开局词条抽卡的分界：抽卡把随机性做成界面，这里把随机性做成世界。
 */

/** [0, max) 的整数 */
export function randomInt(max: number): number {
  return Math.floor(Math.random() * max)
}

/** 闭区间 [min, max] 的整数 */
export function randomBetween(min: number, max: number): number {
  return min + randomInt(max - min + 1)
}

/** 概率为 chance（0–1）时为真 */
export function chance(probability: number): boolean {
  return Math.random() < probability
}

/** 等概率取一个。空数组返回 undefined，调用方自行兜底 */
export function pick<T>(items: readonly T[]): T | undefined {
  return items[randomInt(items.length)]
}

/**
 * 按权重取一个。weight 缺省为 1，非正数视为 0（永不选中）。
 * @returns 空数组或权重全为零时返回 undefined
 */
export function pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number): T | undefined {
  let total = 0
  for (const item of items) total += Math.max(0, weightOf(item))
  if (total <= 0) return undefined

  let roll = Math.random() * total
  for (const item of items) {
    roll -= Math.max(0, weightOf(item))
    if (roll < 0) return item
  }
  return items[items.length - 1]
}
