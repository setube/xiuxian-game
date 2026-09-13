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
for (const [shape, values] of Object.entries(rootBy)) {
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  const mean = values.reduce((sum, one) => sum + one, 0) / (values.length || 1)
  medians.push(median)
  means.push(mean)
  console.log(
    `    ${shape.padEnd(6)} n=${String(values.length).padStart(5)}  中位 ${median}  均值 ${mean.toFixed(1)}`,
  )
}
spread = Math.max(...medians) - Math.min(...medians)
console.log(
  `\n  最大差距 ${spread} 分${spread <= 8 ? '——出生境况不决定你能走多远。' : '——太大了，出现了「更强的开局」。'}`,
)
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
 * 均值没有这个毛病：700 个样本的均值标准误不到 1 分。
 * 阈值 3.0 是这么定的——十二颗种子的均值差实测：
 *
 * ```
 * 0.1 0.1 0.4 0.5 0.7 0.9 1.0 1.2 1.2 1.3 1.6 1.7
 * ```
 *
 * 最坏 1.7，取 3.0 留了将近一倍的余量。（用的是量中位数噪声那同一批种子。）
 *
 * ⚠️ 两把尺子都留着，不是冗余：中位数管「分布的腰挪了没有」，
 * 均值管「有没有整体抬升」。只抬尾巴的偏斜动均值不动中位，反过来也一样。
 */
const meanSpread = Math.max(...means) - Math.min(...means)
console.log(
  `  均值差距 ${meanSpread.toFixed(1)} 分${meanSpread <= 3 ? '——两组的整体高度也一样。' : '——太大了，有一组被整体抬高了。'}`,
)
if (meanSpread > 3) process.exitCode = 1
console.log()
