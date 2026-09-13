/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 出生境况走查。
 *
 * 验三件事：
 *
 * 1. **十种境况都生成得出来**，且关系网各不相同——
 *    有四口人的，有只剩一个姐姐的，有一个血亲都没有的。
 * 2. **「抚养」和「血缘」确实是两条边。** 姐姐可以同时是姐和抚养人；
 *    老乞丐是抚养人但不是任何血亲。
 * 3. **没有「最强开局」。** 决定能走多远的 root / spirit，
 *    在各种境况下分布必须一致——这是反元游戏的生死线。
 *
 * 跑法：bun scripts/circumstance.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { CIRCUMSTANCES } from '../src/content/circumstances'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import type { Constitution } from '../src/types/game'

/**
 * 世数由第三条（`root` 中位数比对）定，不是由前两条定。
 *
 * ⚠️ **决定它的是最小的那个分组，不是总数。** 「一个血亲也没有」只占 6%，
 * 4000 世里它只有 240 个样本——而判据比的是这 240 个的**中位数**。
 * 2026-09-13 一手量的（`SEED=1q74dvp1ifwl/circumstance` 那颗在全套里报红）：
 *
 * ```
 * RUNS    无血亲 n   六颗种子里最大的那个差距   每跑
 *  4000      240     10 分  ← 越过阈值 8，而它是噪声
 * 12000      720      2 分                      4.2 秒
 * 20000     1200      2 分                      6.5 秒
 * ```
 *
 * 10 分那一颗**不是「无血亲更强」**：同一颗种子把世数抬到 40000，
 * 差距自己塌回 4 分。有血亲那组（n=3760）五颗种子是 49/51/50/50/51 纹丝不动，
 * 晃的自始至终是 240 个样本的那一组。
 *
 * 取 12000 不取 20000：两档最坏都是 2 分，而前者便宜 2.3 秒。
 */
const RUNS = 12000

function born() {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  const character = useCharacterStore()
  const people = usePeopleStore()
  return { household, character, people }
}

// —— 一、每种境况各印一份 ——
console.log(`\n=== ${CIRCUMSTANCES.length} 种出生境况 ===\n`)
{
  const shown = new Set<string>()
  for (let i = 0; i < 900 && shown.size < CIRCUMSTANCES.length; i += 1) {
    const { character, people } = born()
    const guardians = people.guardians
    /**
     * 按「他跟谁连着哪几条边」认这是哪一种境况。
     *
     * 从前这把尺子只量三样：有没有生父、有没有生母、谁把他养大。
     * 于是**「有爹有娘」和「有爹有娘还有个哥」量出来是同一种**——
     * 十种境况里永远只印得出九种，而标题照写「十种」。
     *
     * 谁也不会发现，因为这个循环找不齐就一直找到上界为止，
     * **找不齐和找齐了长得一模一样。** 所以下面补了一道数：
     * 印出来几种，就得是几种。
     */
    const key = people.relations
      .filter((relation) => relation.from === 'me')
      .map((relation) => `${relation.bond}:${relation.to}`)
      .sort()
      .join('|')
    if (shown.has(key)) continue
    shown.add(key)

    console.log(`  ${character.name}（${character.constitution}）`)
    for (const relation of people.relations) {
      if (relation.from !== 'me') continue
      const person = people.personOf(relation.to)
      if (!person) continue
      const gone = person.fate !== '在' ? '　（没见过／不在了）' : ''
      console.log(
        `    ${relation.bond.padEnd(3)} ${person.surname}${person.given}` +
          `　${people.ageOf(relation.to)}岁　${person.doing}${gone}`,
      )
    }
    const guardianNames = guardians.map((id) => {
      const p = people.personOf(id)
      return p ? `${p.surname}${p.given}` : id
    })
    console.log(
      `    └ 把你养大的：${guardianNames.length > 0 ? guardianNames.join('、') : '没有人'}`,
    )
    console.log()
  }

  if (shown.size < CIRCUMSTANCES.length) {
    console.log(`  ✗ 只跑出 ${shown.size} 种，少了 ${CIRCUMSTANCES.length - shown.size} 种。\n`)
    process.exitCode = 1
  }
}

// —— 二、统计分布 ——
// 标题里的世数从常量取。从前这里写死「四千世」，后来 RUNS 被改成四百，
// 这一行照旧宣称四千——**走查自己撒了个谎，还是最不容易被发现的那一种**
console.log(`=== ${RUNS} 世统计 ===\n`)
const byShape: Record<string, number> = {}
const rootBy: Record<string, number[]> = {}
const constitutions: Record<string, number> = {}
let noBloodParents = 0
let raisedByNonParent = 0
let sisterIsBothKinAndGuardian = 0

for (let i = 0; i < RUNS; i += 1) {
  const { character, people } = born()
  const bonds = people.relations.filter((r) => r.from === 'me')
  const hasFather = bonds.some((r) => r.bond === '生父')
  const hasMother = bonds.some((r) => r.bond === '生母')
  const guardians = people.guardians

  const shape =
    !hasFather && !hasMother ? '无血亲' : guardians.length === 0 ? '（无人抚养）' : '有血亲'
  byShape[shape] = (byShape[shape] ?? 0) + 1
  if (!hasFather && !hasMother) noBloodParents += 1

  // 养你的人里，有没有不是爹娘的
  const parentIds = bonds.filter((r) => r.bond === '生父' || r.bond === '生母').map((r) => r.to)
  if (guardians.some((id) => !parentIds.includes(id))) raisedByNonParent += 1

  // 姐姐同时是姐和抚养人
  const sisterBonds = bonds.filter((r) => r.to === 'sister').map((r) => r.bond)
  if (sisterBonds.includes('姐') && sisterBonds.includes('抚养')) sisterIsBothKinAndGuardian += 1

  constitutions[character.constitution] = (constitutions[character.constitution] ?? 0) + 1
  ;(rootBy[shape] ??= []).push(character.attributes.root)
}

const pct = (n: number) => `${((n / RUNS) * 100).toFixed(1)}%`
console.log(`  一个血亲也没有（弃儿、失散）      ${pct(noBloodParents)}`)
console.log(`  养你的人不是爹娘                  ${pct(raisedByNonParent)}`)
console.log(`  姐姐既是姐、又是抚养人            ${pct(sisterIsBothKinAndGuardian)}`)

console.log(`\n  体质分布：`)
for (const [key, n] of Object.entries(constitutions).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${(key as Constitution).padEnd(3)} ${pct(n)}`)
}

// —— 三、铁律：出生境况不影响修行资质 ——
console.log(`\n=== 铁律：没有「最强开局」 ===\n`)
console.log(`  修行资质（root）在各种境况下的中位数——必须一样：\n`)
let spread = 0
const medians: number[] = []
const means: number[] = []
const sizes: number[] = []
/** 各组样本量之和。算上端比例那条的合并比例要用它 */
let total = 0
/** 全体 root 的方差。两组本来同分布，所以标准误用合并方差算，不各算各的 */
let variance = 0
{
  const all = Object.values(rootBy).flat()
  total = all.length
  const mean = all.reduce((sum, one) => sum + one, 0) / Math.max(total, 1)
  variance = all.reduce((sum, one) => sum + (one - mean) ** 2, 0) / Math.max(total - 1, 1)
}
for (const [shape, values] of Object.entries(rootBy)) {
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  const mean = values.reduce((sum, one) => sum + one, 0) / (values.length || 1)
  medians.push(median)
  means.push(mean)
  sizes.push(values.length)
  console.log(
    `    ${shape.padEnd(6)} n=${String(values.length).padStart(5)}  中位 ${median}  均值 ${mean.toFixed(1)}`,
  )
}
spread = Math.max(...medians) - Math.min(...medians)
console.log(
  `\n  最大差距 ${spread} 分${spread <= 8 ? '——出生境况不决定你能走多远。' : '——太大了，出现了「更强的开局」。'}`,
)
/**
 * ⚠️ **这一条只抓得动 ≳11 分的偏移，小于那个数看底下均值那一条。**
 *
 * 它的噪声底是 ±3 分（十二颗种子实测 0/0/0/1/1/1/1/2/2/2/3/3），
 * 而阈值 8——所以一个真实的 9 分优势它三颗种子里会放过一颗（2026-09-13 打断验）。
 *
 * 留着它不是为了跟均值互相印证——**两条并排，一条粗一条细**。
 * 中位数管「分布的腰挪了没有」，它对只抬尾巴的偏斜是瞎的；
 * 均值反过来。两条守的不是同一件事。
 */
if (spread > 8) process.exitCode = 1

/**
 * 第二把尺子：均值。**中位数那把量不到 9 分以内的优势。**
 *
 * 2026-09-13 打断验出来的——给「无血亲」那组注入 +9 分（一个真实的「更强开局」），
 * 三颗种子里中位数只抓住两颗：
 *
 * ```
 * 1q74dvp1ifwl  10 分  红
 * aaa1           7 分  【绿】← 真有 9 分优势，放过去了
 * ddd4           9 分  红
 * ```
 *
 * 病根不是阈值定高了，是**中位数在这个分布上只有 ±3 分的分辨率**：
 * 十二颗种子实测 0/0/0/1/1/1/1/2/2/2/3/3，而世数从 12000 抬到 40000
 * 反倒出现过 4 分——**加样本买不来分辨率**，它是整数统计量卡在分布的平坦段上。
 *
 * 均值没有这个毛病，**而它的线不该由「实测噪声多大」来划。**
 *
 * ⚠️ 头一版我写的是「十二颗种子实测最坏 1.7，取 3.0 留一倍余量」。
 * 那是个**没有作者的门槛**——它回答的是「多大算噪声」，
 * 不是「多大算不公平」，而判据要守的是后者。
 *
 * 设计那一侧一手核过，答案是**零**：
 *
 * ```
 * character.ts:159      root: randomBetween(1, 100)   出生那刻掷，均匀分布
 * circumstances.ts:29   root 和 spirit 在出生那一刻独立掷出
 * circumstances.ts:274  而 root 与 spirit 一律不碰
 * ```
 *
 * **出身跟 `root` 在构造上零耦合**，所以两组本来就是同一个分布，
 * 设计容差是 0，看见的任何差都是抽样噪声。那么这一条守的其实是
 * **回归**——哪天有人接上了一条耦合。
 *
 * 于是线该用**标准误**表达，不是手挑一个分数：均匀分布 1–100 的
 * σ≈28.9，n=700 时均值的标准误≈1.09 分。`k=4` 对应单次误报约
 * 六万分之一，而它**跟着世数自己走**——改 `RUNS` 不必重新量这个数。
 */
const meanSpread = Math.max(...means) - Math.min(...means)
/**
 * 差距量的是最高和最低那一对，所以标准误也只能用那一对的样本量。
 *
 * ⚠️ 头一版我写成了「把各组的 `variance/n` 全加起来再除以组数减一」。
 * 两组时它恰好等于对的答案，**三组以上就错了**——而现在正好是两组，
 * 于是它会一直看着是对的，直到有人往 `rootBy` 里加第三种境况。
 */
const pairSe = (ns: readonly number[], values: readonly number[], v: number): number => {
  const hi = values.indexOf(Math.max(...values))
  const lo = values.indexOf(Math.min(...values))
  return Math.sqrt(v / Math.max(ns[hi] ?? 1, 1) + v / Math.max(ns[lo] ?? 1, 1))
}
const meanSe = pairSe(sizes, means, variance)
const meanSigma = meanSpread / (meanSe || 1)
console.log(
  `  均值差距 ${meanSpread.toFixed(1)} 分（${meanSigma.toFixed(1)}σ，线在 4σ≈${(4 * meanSe).toFixed(1)} 分）${
    meanSigma <= 4 ? '——两组的整体高度也一样。' : '——太大了，有一组被整体抬高了。'
  }`,
)
if (meanSigma > 4) process.exitCode = 1

/**
 * 第三把尺子：**上端的机会**。这一条才正面对上「最强开局」四个字。
 *
 * 前两把量的是「中间在哪」和「整体多高」，而玩家说「最强开局」时
 * 想的不是平均——**是能不能摸到天花板**。一个只把尾巴抬起来的耦合
 * （多数人照旧、少数人特别好），均值动一点点，中位数一动不动，
 * 而它正是元游戏最想要的那种开局。
 *
 * `root` 是均匀 1–100，所以「上端」取 `> 90`，各组该都是 10%。
 * 线同样用标准误：两个比例之差的 SE=√(p(1-p)(1/n₁+1/n₂))，同样 4σ。
 *
 * ⚠️ **这一条不是前两条的保险，它抓的是另一种东西。** 2026-09-13 打断验，
 * 只给无血亲组 `root>80` 的人加 15 分（多数人照旧、少数人特别好）：
 *
 * ```
 *          aaa1    ddd4    j10
 * 中位差    2 分    0 分    0 分   ← 瞎的（线在 8）
 * 均值     0.4σ    1.5σ    0.8σ   ← 瞎的（线在 4σ）
 * 上端     7.1σ    7.5σ    7.8σ   ← 三颗全红
 * ```
 *
 * **而那一种正正好就是「最强开局」。** 另一种打断（一律 +9 的整体抬升）
 * 三把尺子都红：中位 7/9/9 分、均值 6.6/7.8/6.9σ、上端 6.7/6.4/6.6σ。
 *
 * 未打断时十二颗种子的实测：均值最大 1.5σ、上端最大 1.6σ，线在 4σ。
 */
const TOP = 90
const rates = Object.entries(rootBy).map(([shape, values]) => ({
  shape,
  n: values.length,
  rate: values.filter((one) => one > TOP).length / Math.max(values.length, 1),
}))
const rateSpread = Math.max(...rates.map((r) => r.rate)) - Math.min(...rates.map((r) => r.rate))
const pooled = rates.reduce((sum, r) => sum + r.rate * r.n, 0) / Math.max(total, 1)
// 同上：只取差距那一对的样本量，别把第三组也加进来
const rateSe = pairSe(
  rates.map((r) => r.n),
  rates.map((r) => r.rate),
  pooled * (1 - pooled),
)
const rateSigma = rateSpread / (rateSe || 1)
console.log(`\n  摸得到上端（root>${TOP}）的比例——「最强开局」问的就是这个：\n`)
for (const r of rates) {
  console.log(`    ${r.shape.padEnd(6)} ${(r.rate * 100).toFixed(1)}%`)
}
console.log(
  `\n  差距 ${(rateSpread * 100).toFixed(1)} 个百分点（${rateSigma.toFixed(1)}σ，线在 4σ≈${(4 * rateSe * 100).toFixed(1)} 点）${
    rateSigma <= 4 ? '——谁都一样摸得到天花板。' : '——太大了，有一种出身更容易摸到天花板。'
  }`,
)
if (rateSigma > 4) process.exitCode = 1
console.log()
