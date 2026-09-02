/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 按出身分组的走查。
 *
 * 加出身最容易犯的错，是加完只有数值不同：
 * 「生在药铺」和「生在镖局」如果走出来的人生一模一样，那就不是出身，是属性面板。
 *
 * 所以这里按出身分组，看每一种是不是真的走出了自己的路——
 * 各自读没读上书、各自撞没撞上属于自己那一卷、
 * 十六岁那年在渡口落在哪个结局上。
 *
 * 跑法：npx vite-node scripts/origins.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { ORIGINS } from '../src/content/origins'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'
import type { Trade } from '../src/types/game'

const RUNS = 4000

interface Row {
  n: number
  schooled: number
  ownScene: number
  heardOfCultivators: number
  recognized: number
  revealed: number
  endings: Record<string, number>
}

/** 每种出身专属的那一卷。撞上它才算「走了自己的路」 */
const OWN_EVENT: Partial<Record<Trade, string>> = {
  客栈: 'event:trade-guest',
  酒楼: 'event:trade-drunk',
  药铺: 'event:trade-herb',
  镖局: 'event:trade-road',
  官宦: 'event:trade-archive',
  商户: 'event:omen-merchant',
}

const rows = new Map<Trade, Row>()

function rowOf(trade: Trade): Row {
  let row = rows.get(trade)
  if (!row) {
    row = {
      n: 0,
      schooled: 0,
      ownScene: 0,
      heardOfCultivators: 0,
      recognized: 0,
      revealed: 0,
      endings: {},
    }
    rows.set(trade, row)
  }
  return row
}

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const world = useWorldStore()
  const character = useCharacterStore()
  const household = useHouseholdStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()

  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }

  const row = rowOf(household.trade)
  row.n += 1
  if (world.getFlag('schooled') === true) row.schooled += 1

  const own = OWN_EVENT[household.trade]
  if (own && world.hasFlag(own)) row.ownScene += 1

  if (character.knows('cultivators-exist')) row.heardOfCultivators += 1
  if (world.hasFlag('saw-a-cultivator')) row.recognized += 1
  if (character.inventory.some((item) => item.formerName !== undefined)) row.revealed += 1

  const ending = narrative.nodeId ?? '(未收尾)'
  row.endings[ending] = (row.endings[ending] ?? 0) + 1
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '  —  '
  return `${((part / whole) * 100).toFixed(0)}%`.padStart(5)
}

console.log(`\n=== 按出身分组（${RUNS} 世）===\n`)
console.log('  出身    份额    读过书  走本行   知修士  认出来  被点破')
console.log('  ' + '─'.repeat(56))

// 按配置里的权重顺序列，好跟 origins.ts 对着看
for (const origin of ORIGINS) {
  const row = rows.get(origin.trade)
  if (!row) {
    console.log(`  ${origin.trade}  （四千世里一次也没掷到）`)
    continue
  }
  const own = OWN_EVENT[origin.trade] ? pct(row.ownScene, row.n) : '  —  '
  console.log(
    `  ${origin.trade}  ${pct(row.n, RUNS)}  ${String(row.n).padStart(4)}  ` +
      `${pct(row.schooled, row.n)}  ${own}  ` +
      `${pct(row.heardOfCultivators, row.n)}  ${pct(row.recognized, row.n)}  ${pct(row.revealed, row.n)}`,
  )
}

console.log(`\n--- 十六岁那年的落点，按出身 ---`)
for (const origin of ORIGINS) {
  const row = rows.get(origin.trade)
  if (!row) continue
  const parts = Object.entries(row.endings)
    .sort((a, b) => b[1] - a[1])
    .map(([node, count]) => `${node} ${pct(count, row.n).trim()}`)
    .join('   ')
  console.log(`  ${origin.trade}  ${parts}`)
}
console.log()
