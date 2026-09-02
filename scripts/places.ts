/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 出生地走查。
 *
 * 从前所有人都挤在「云州 · 临江府」——州府是写死在出身的 homes 里的，
 * 府名和村名绑成一条字符串。现在两边分开掷，这里确认它真的散开了：
 * 每个府都有人生在那里，同一种出身也会落在不同的府。
 */
import { createPinia, setActivePinia } from 'pinia'

import { PREFECTURES } from '../src/content/geography'
import { ORIGINS } from '../src/content/origins'
import { useHouseholdStore } from '../src/stores/household'
import type { Trade } from '../src/types/game'

const RUNS = 6000

const byPrefecture: Record<string, number> = {}
const homes = new Set<string>()
const spread = new Map<Trade, Set<string>>()

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  const seat = `${household.province} · ${household.prefecture}`
  byPrefecture[seat] = (byPrefecture[seat] ?? 0) + 1
  homes.add(household.home)

  let seen = spread.get(household.trade)
  if (!seen) {
    seen = new Set()
    spread.set(household.trade, seen)
  }
  seen.add(household.prefecture)
}

console.log(`\n=== 出生地走查（${RUNS} 世）===\n`)
console.log('  府              占比')
console.log('  ' + '─'.repeat(24))
for (const p of PREFECTURES) {
  const seat = `${p.province} · ${p.name}`
  const n = byPrefecture[seat] ?? 0
  const pct = ((n / RUNS) * 100).toFixed(1)
  console.log(`  ${seat.padEnd(14)}${pct.padStart(5)}%`)
}

console.log(`\n  不重样的门牌    ${homes.size} 种`)
console.log(`\n  每种出身落过几个府（共 ${PREFECTURES.length} 个）：`)
for (const origin of ORIGINS) {
  const seen = spread.get(origin.trade)
  const n = seen ? seen.size : 0
  // 皇室生在京城，但州府照掷——那是他日后被贬去的地方
  const note = origin.capital ? '（家在京城，这是贬所）' : ''
  console.log(`    ${origin.trade}  ${String(n).padStart(2)} / ${PREFECTURES.length}  ${note}`)
}
console.log()
