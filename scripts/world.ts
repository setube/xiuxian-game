/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 世界走查。
 *
 * 验的不是「有多少人遭遇旱灾」，而是：
 *
 *   **同一个旱灾，在不同家庭、不同地区、不同人物关系下，
 *   能不能自然长出不同的人生？**
 *
 * 这是整个世界系统的验收点。如果所有遭遇旱灾的人生都长得一样，
 * 那这套东西就只是换了个说法的「随机灾难」。
 *
 * 顺带看三件事：
 *
 * 1. 世界大部分年头是不是平的（灾难该是少数，不是常态）
 * 2. 旱灾链能走多远（少雨 → 减产 → 涨价 → 囤粮 → 限价 → 盗匪 → 改道 → 逃荒）
 * 3. 玩家出生时，这个世界已经有多少年历史
 *
 * 跑法：bun scripts/world.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { originById } from '../src/content/origins'
import { WORLD_EVENTS } from '../src/content/world-events'
import { useStory } from '../src/engine/story'
import { newRegion, tickRegion } from '../src/engine/worldclock'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'
import type { OriginId } from '../src/types/game'

// —— 一、单独让一个府跑一百年，看世界自己会不会出事 ——
console.log('\n=== 让一个府自己跑一百年 ===\n')
{
  let region = newRegion()
  const fired: Record<string, number> = {}
  let quietYears = 0
  const timeline: string[] = []

  for (let year = 1; year <= 100; year += 1) {
    const before = region.state.grain
    const result = tickRegion(region, year)
    region = result.region
    const happened = Object.entries(region.last).find(([, y]) => y === year)
    if (happened) fired[happened[0]] = (fired[happened[0]] ?? 0) + 1
    else quietYears += 1
    for (const line of result.chronicles) {
      timeline.push(`    第 ${String(year).padStart(3)} 年（米价 ${Math.round(before)}）  ${line}`)
    }
  }

  console.log(`  什么也没发生的年头：${quietYears} / 100`)
  console.log(`\n  这一百年里被记下来的事：`)
  for (const line of timeline.slice(0, 14)) console.log(line)
  if (timeline.length > 14) console.log(`    ……另有 ${timeline.length - 14} 条`)

  console.log(`\n  旱灾链各环发生过几次：`)
  const chain = WORLD_EVENTS.filter((e) => e.chain === '旱')
  for (const event of chain) {
    console.log(`    ${event.id.padEnd(16)} ${fired[event.id] ?? 0} 次`)
  }
}

// —— 二、同一场旱灾，不同的人生 ——
const RUNS = 300

interface Life {
  origin: OriginId
  standing: number
  branch: string
  outcome: string
}

/**
 * 这一行出身在这张表上怎么称呼。
 *
 * 主键在前，因为 `manor` 和 `court` 五格一字不差，只有主键分得开；
 * 后面那个词现取出身表的产或业，**不在这儿另抄一份对照表**。
 */
function nameOf(id: OriginId): string {
  const row = originById(id)
  return `${id.padEnd(7)}${row.business ?? row.livelihood}`
}

const hit: Life[] = []
let total = 0
const bornYears: number[] = []

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const world = useWorldStore()
  const household = useHouseholdStore()
  // 触发出生：世界会先推到玩家出生那一年
  useCharacterStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()
  bornYears.push(world.bornYear)

  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }

  total += 1
  if (!world.hasFlag('event:dearth-price')) continue

  // 他在那场米贵里走了哪一支
  const text = narrative.stream.map((x) => ('text' in x.block ? x.block.text : '')).join('')
  let branch = '（未知）'
  if (text.includes('家里照常开饭')) branch = '家底厚，照常开饭'
  else if (text.includes('粥比往常稀了些')) branch = '紧一年，没割肉'
  else if (text.includes('家里没有米了')) branch = '揭不开锅，饿过'
  else if (text.includes('家里的米撑不到开春')) branch = '有得选'

  let outcome = ''
  if (world.hasFlag('sold-things')) outcome = '卖了东西'
  else if (world.hasFlag('family-borrowed')) outcome = '借了债'
  else if (world.hasFlag('knew-hunger')) outcome = '饿过'
  else if (branch === '有得选') outcome = '送去做工'

  hit.push({
    origin: household.origin,
    standing: household.standing,
    branch,
    outcome,
  })
}

const pct = (n: number, d = total) => `${((n / d) * 100).toFixed(1)}%`

console.log(`\n\n=== 一千五百世 ===\n`)
const sortedBorn = [...bornYears].sort((a, b) => a - b)
console.log(
  `  玩家出生时世界已有的历史：最短 ${sortedBorn[0]! - 1} 年  ` +
    `中位 ${sortedBorn[Math.floor(sortedBorn.length / 2)]! - 1} 年  ` +
    `最长 ${sortedBorn[sortedBorn.length - 1]! - 1} 年`,
)
console.log(`  一辈子撞上过米贵的：${hit.length}（${pct(hit.length)}）`)

console.log(`\n=== 验收：同一场旱灾，长出了几种人生 ===\n`)
const byBranch: Record<string, number> = {}
const byOutcome: Record<string, number> = {}
const byOrigin: Record<string, Record<string, number>> = {}
for (const life of hit) {
  byBranch[life.branch] = (byBranch[life.branch] ?? 0) + 1
  if (life.outcome) byOutcome[life.outcome] = (byOutcome[life.outcome] ?? 0) + 1
  const key = nameOf(life.origin)
  ;(byOrigin[key] ??= {})[life.branch] = (byOrigin[key]?.[life.branch] ?? 0) + 1
}

console.log('  同一个「米价涨了」，落在不同的家里：')
for (const [branch, n] of Object.entries(byBranch).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${branch.padEnd(18)} ${String(n).padStart(4)}  ${pct(n, hit.length)}`)
}

if (Object.keys(byOutcome).length > 0) {
  console.log('\n  「有得选」那一档，选了什么：')
  for (const [outcome, n] of Object.entries(byOutcome).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${outcome.padEnd(10)} ${String(n).padStart(4)}`)
  }
}

console.log('\n  按出身看（同一场旱灾，不同人家）：')
for (const [who, branches] of Object.entries(byOrigin).sort(
  (a, b) =>
    Object.values(b[1]).reduce((s, n) => s + n, 0) - Object.values(a[1]).reduce((s, n) => s + n, 0),
)) {
  const parts = Object.entries(branches)
    .sort((a, b) => b[1] - a[1])
    .map(([branch, n]) => `${branch} ${n}`)
    .join('　')
  console.log(`    ${who}  ${parts}`)
}

const shapes = Object.keys(byBranch).length
console.log(
  `\n  ${shapes} 种不同的走向${shapes >= 3 ? '——同一场旱灾确实长出了不同的人生。' : '——太少了，世界事件退化成了单一剧本。'}`,
)
if (shapes < 3) process.exitCode = 1
console.log()
