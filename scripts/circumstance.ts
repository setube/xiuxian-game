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
 * 跑法：npx vite-node scripts/circumstance.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { CIRCUMSTANCES } from '../src/content/circumstances'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import type { Constitution } from '../src/types/game'

const RUNS = 4000

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
for (const [shape, values] of Object.entries(rootBy)) {
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  medians.push(median)
  console.log(`    ${shape.padEnd(6)} n=${String(values.length).padStart(4)}  中位 ${median}`)
}
spread = Math.max(...medians) - Math.min(...medians)
console.log(
  `\n  最大差距 ${spread} 分${spread <= 8 ? '——出生境况不决定你能走多远。' : '——太大了，出现了「更强的开局」。'}`,
)
if (spread > 8) process.exitCode = 1
console.log()
