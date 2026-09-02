import { useCharacterStore } from '@/stores/character'
import type { AttributeKey, Lens, Observer, Phrase, Reading } from '@/types/game'

/**
 * 观察。
 *
 * 一条链，每一步都可能产生偏差：
 *
 *   真实属性 → 观察能力 → 观察结果 → 语言表达 → 玩家理解
 *
 * 这份文件负责中间三步。第一步在 character store 里（那些数玩家永远看不到），
 * 最后一步在玩家自己脑子里（那正是我们要的）。
 *
 * ## 一条铁律
 *
 * **观察只往认知层写，一个字也不碰真实属性。**
 *
 * 修士说「你悟性一般」，`insight` 一分不动；宗门长老说「资质不错」，
 * `root` 也一分不动。评价改变的是玩家对自己的理解，不是这个人本身。
 * 一旦允许评价写回属性，「别人怎么看你」就变成了「别人决定你是谁」，
 * 整套设计立刻塌掉——那不过是换个说法把属性面板还给玩家。
 */

/** 观察结果最多偏离真值多少分。判断力为 0 时的偏差上限 */
const MAX_DRIFT = 34

/**
 * 拿一把尺子量出来的「真值」。
 *
 * 注意这个真值本身就已经不是任何一个属性了——
 * 先生量的「聪慧」是记性七成加悟性三成，
 * 所以一个记性 95、悟性 48 的人，在他的尺子上是 81 分。
 * 他说「聪慧」没有说谎，他只是量了另一样东西。
 */
function trueReading(lens: Lens, attributes: Record<AttributeKey, number>): number {
  let sum = 0
  let total = 0
  for (const [key, weight] of Object.entries(lens.weights)) {
    if (weight === undefined) continue
    sum += attributes[key as AttributeKey] * weight
    total += weight
  }
  return total === 0 ? 0 : sum / total
}

/**
 * 判断力不足带来的偏差。
 *
 * 判断力越低，看得越不准——但不是随机乱猜，而是有方向的失真：
 * 他会把量到的数往中间拉（看不出极端），再加一点随机的抖动。
 *
 * 往中间拉这一条很要紧。它意味着**判断力低的人看不出天才，也看不出废物**，
 * 这正是现实里外行的样子：在乡下先生眼里，聪明孩子都差不多聪明。
 */
function blur(value: number, acuity: number): number {
  const ignorance = 1 - Math.min(100, Math.max(0, acuity)) / 100

  // 往中间拉：外行看什么都像中等
  const pulled = value + (50 - value) * ignorance * 0.6

  // 再抖一下。同一个人看两次，说的话可能不一样
  const jitter = (Math.random() * 2 - 1) * MAX_DRIFT * ignorance

  return Math.min(100, Math.max(0, pulled + jitter))
}

/** 按分档挑一句话。自上而下取第一个够得着的 */
function phraseFor(phrasing: readonly Phrase[], value: number): string {
  const ordered = [...phrasing].sort((a, b) => b.atLeast - a.atLeast)
  for (const phrase of ordered) {
    if (value >= phrase.atLeast) return phrase.says
  }
  return ordered[ordered.length - 1]?.says ?? ''
}

/** 一次观察落到认知层上的那句话 */
export interface Remark {
  aspect: Reading['lens']['aspect']
  source: string
  text: string
  doubt?: string
}

/**
 * 让一个人打量你一眼，看他会说什么。
 *
 * 这里不写 store，只算话——落笔由 effects.ts 统一做，
 * 好让「谁在什么时候说了什么」这件事只有一个入口。
 */
export function observe(observer: Observer): Remark[] {
  const character = useCharacterStore()
  const attributes = character.attributes

  return observer.readings.map((reading) => {
    const truth = trueReading(reading.lens, attributes)
    const seen = blur(truth, reading.acuity)
    const words = phraseFor(reading.phrasing, seen)
    // 「他管这把尺子叫什么」也是信息：先生说「记性」，修士说「神魂」
    const text = `${reading.calls}${words}`

    return {
      aspect: reading.lens.aspect,
      source: observer.name,
      text,
      // doubt 里写 {} 的地方换成他实际说出口的那句话。
      // 不这么做的话，修士说「尚可」而困惑写着「不知道『一般』是跟谁比」——
      // 玩家会读到一句对不上号的旁白
      ...(reading.doubt ? { doubt: reading.doubt.replace(/\{\}/g, words.replace(/。$/, '')) } : {}),
    }
  })
}
