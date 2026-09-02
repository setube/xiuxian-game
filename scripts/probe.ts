/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 那册书的漏斗。
 *
 * 「多年以后才明白当年捡到的不是普通书」是整个凡人阶段的落点。
 * 全量走查只给一个总数，说不清是哪一环卡住了：
 * 是没走上山道、没看见人、掷出来的不是修士、还是在渡口没走过去。
 *
 * 这里把几道关卡逐级数出来，好知道该拧哪一颗螺丝。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'

const RUNS = 2000

const gates = {
  上了山道: 0,
  看见了人: 0,
  走过去了: 0,
  '他是修士（拿到书）': 0,
  在渡口走上前: 0,
  有人点破: 0,
}

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const world = useWorldStore()
  const character = useCharacterStore()
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

  if (world.hasFlag('event:omen-wounded')) gates.上了山道 += 1
  // 掷了骰就说明进过 notice 之前那一节；看见与否由 branches 定
  const noticed =
    world.hasFlag('saw-wounded-man') ||
    world.hasFlag('fled-wounded-man') ||
    world.hasFlag('met-adept') ||
    world.hasFlag('saved-a-man') ||
    world.hasFlag('touched-by-wicked') ||
    character.has('thin-book')
  if (noticed) gates.看见了人 += 1
  if (
    world.hasFlag('met-adept') ||
    world.hasFlag('saved-a-man') ||
    world.hasFlag('touched-by-wicked')
  ) {
    gates.走过去了 += 1
  }
  if (character.has('thin-book')) gates['他是修士（拿到书）'] += 1
  if (
    world.hasFlag('met-stranger') ||
    world.hasFlag('knows-the-book') ||
    world.hasFlag('marked-known')
  ) {
    gates.在渡口走上前 += 1
  }
  if (world.hasFlag('knows-the-book')) gates.有人点破 += 1
}

console.log(`\n=== 那册书的漏斗（${RUNS} 世）===\n`)
let previous = RUNS
for (const [label, count] of Object.entries(gates)) {
  const ofAll = ((count / RUNS) * 100).toFixed(1)
  const ofPrev = previous === 0 ? '—' : `${((count / previous) * 100).toFixed(0)}%`
  console.log(
    `  ${label.padEnd(20)} ${String(count).padStart(5)}   占全体 ${ofAll.padStart(5)}%   过关率 ${ofPrev}`,
  )
  previous = count
}
console.log()
