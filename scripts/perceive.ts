/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 世界感知走查。
 *
 * 验的是这一步：
 *
 *   世界状态 → 改变环境 → 改变可观察到的现实 → 玩家理解 → 玩家做选择
 *
 * 重点在**「可观察到的现实」**那一环。玩家不该看到 `grain = 138`，
 * 而是「这阵子的粥稀了」。但那不只是换个说法——要验三件事：
 *
 * 1. **同一年的同一个世界，不同的人看见不同的东西**
 *    （种地的看天，做买卖的看路，孩子只看得见碗里的）
 * 2. **看不全**（一年只给一两处，攒不出精确的世界模型）
 * 3. **可能读错**（街上多了外乡人：商队？还是逃荒的？）
 *
 * 跑法：bun scripts/perceive.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { SIGNS } from '../src/content/signs'
import { originById } from '../src/content/origins'
import { noticeSigns, visibleSigns } from '../src/engine/perceive'
import { fillString } from '../src/engine/interpolate'
import { newRegion, tickRegion } from '../src/engine/worldclock'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { OriginId, RegionState } from '../src/types/game'

import { beOf } from './origin'

/** 把一个府推到旱灾中段，好让所有人面对同一个世界 */
function droughtWorld(): RegionState {
  return { rain: 26, harvest: 30, grain: 162, order: 38, plague: 0 }
}

/**
 * 七行出身，站在同一场旱灾里。
 *
 * 挑的是**出身主键**，而不是那五格里的某一格：`signs.ts` 那边有的条问业
 * （务农、打猎），有的条问产（客栈、药铺、镖局），只有整行摆齐，
 * 这两类条件才能在同一张表里各自现形。挑单格摆的话，
 * 「开客栈的」会摆成一个没有业的人，而那种人不存在。
 */
const PROBED: readonly OriginId[] = ['farm', 'hunt', 'cloth', 'inn', 'herb', 'escort', 'office']

/** 这一行人家怎么称呼。有铺面的说铺面，没有的说靠什么过活 */
function nameOf(id: OriginId): string {
  const row = originById(id)
  return row.business ? `开${row.business}的` : `${row.livelihood}的`
}

// —— 一、同一年，同一个世界，七种人看见什么 ——
console.log('\n=== 同一场旱灾，七个人各看见什么 ===\n')
console.log('  （世界真实状态：雨水 26　收成 30　米价 162　治安 38）')
console.log('  （玩家永远看不到上面这一行）\n')

for (const id of PROBED) {
  setActivePinia(createPinia())
  beOf(id)
  const household = useHouseholdStore()
  const world = useWorldStore()
  useCharacterStore()
  // 把玩家所在的府按成旱灾中段
  world.regions = { [household.prefecture]: { state: droughtWorld(), last: {} } }

  const seen = visibleSigns()
  console.log(`  【${nameOf(id)}】看得见 ${seen.length} 处：`)
  for (const rule of seen) {
    // 落纸前要过占位符，走查看的就该是玩家真正读到的那句话
    console.log(`      ${fillString(rule.says)}`)
    if (rule.reading) console.log(`        └ ${fillString(rule.reading)}`)
  }
  console.log()
}

// —— 二、他一年其实只注意到一两处 ——
console.log('=== 但他一年只注意得到一两处 ===\n')
{
  const tally = new Map<string, number>()
  const ROUNDS = 200
  for (let i = 0; i < ROUNDS; i += 1) {
    setActivePinia(createPinia())
    beOf('farm')
    const household = useHouseholdStore()
    const world = useWorldStore()
    useCharacterStore()
    world.regions = { [household.prefecture]: { state: droughtWorld(), last: {} } }
    for (const sign of noticeSigns()) {
      tally.set(sign.text, (tally.get(sign.text) ?? 0) + 1)
    }
  }
  console.log(`  同一个农家孩子，同一年，跑 ${ROUNDS} 次，他注意到的：\n`)
  for (const [text, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(Math.round((n / ROUNDS) * 100)).padStart(3)}%  ${text}`)
  }
  console.log('\n  没有一次能看全。两个境况相同的人，对同一年的印象也不一样。')
}

// —— 三、可能读错的那些 ——
console.log('\n=== 他自以为看懂了的东西 ===\n')
{
  const misread = SIGNS.filter((rule) => rule.reading)
  for (const rule of misread) {
    console.log(`  「${rule.says}」`)
    console.log(`    └ ${rule.reading}`)
  }
  console.log(`\n  ${misread.length} 处带「理解」的征象。其中最要紧的一处：`)
  console.log('    同一句「村口常有陌生人过」，寻常人以为是过路客商，')
  console.log('    心思细的人才看出那是逃荒的——**同一个事实，两种世界模型。**')
}

// —— 四、世界一年年变，他攒下的印象 ——
console.log('\n=== 一个农家孩子的十六年 ===\n')
{
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  const world = useWorldStore()
  useCharacterStore()

  // 先把世界跑到一个真出过事的年代——太平年景展示不出这一层
  let region = newRegion()
  let start = 1
  for (let probe = 1; probe <= 400; probe += 1) {
    region = tickRegion(region, probe).region
    if (region.state.grain >= 140) {
      start = probe
      break
    }
  }

  for (let year = 0; year < 16; year += 1) {
    region = tickRegion(region, start + year).region
    world.regions = { [household.prefecture]: region }
    const signs = noticeSigns(1)
    const line = signs[0]
    console.log(
      `  ${String(year + 1).padStart(2)}岁  ${line ? line.text : '（这一年没什么可说的）'}`,
    )
    if (line?.reading) console.log(`        └ ${line.reading}`)
  }
  console.log('\n  他从没听说过「旱灾」这两个字。他只是记得有几年粥很稀。')
}
console.log()
