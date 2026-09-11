/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 日常例行——六卷各自走得到吗。
 *
 * `routine.ts` 是按年龄段分的六卷日常生活，库里频率最高的内容文件之一：
 *
 *   routine:child   孩童时代的日常
 *   routine:youth   少年时代的日常
 *   routine:teen    青少年时代的日常
 *   routine:adult   成年时代的日常
 *   routine:prime   壮年时代的日常
 *   routine:old     老年时代的日常
 *
 * 核心判据：六卷各自走进去了，尺子自检。
 *
 * 跑法：bun scripts/routine.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

function stage(age: number): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function play(
  scene: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 20,
): string[] {
  const s = lifeScenes[scene]
  if (!s) return []
  const walked: string[] = []
  let at: string | undefined = s.entry

  for (let guard = 0; at !== undefined && guard < stopAfter; guard += 1) {
    const node: SceneNode | undefined = s.nodes[at]
    if (!node) break
    walked.push(at)
    if (node.onEnter) applyEffects(node.onEnter)

    const open: Choice[] = (node.choices ?? []).filter((one) => meetsAll(one.requires))
    if (open.length > 0) {
      const want = pick(open.map((o) => o.id))
      const chosen: Choice = open.find((one) => one.id === want) ?? open[0]!
      if (chosen.effects) applyEffects(chosen.effects)
      at = chosen.next ?? undefined
      continue
    }
    const branch = node.branches?.find((one) => meetsAll(one.requires))
    at = branch?.next ?? node.next ?? undefined
  }
  return walked
}

console.log('\n=== 日常例行——六卷各自走得到吗 ===\n')

let bad = 0

const ageCases: Array<{ scene: string; age: number; label: string }> = [
  { scene: 'routine:child', age: 8, label: '孩童（8岁）' },
  { scene: 'routine:youth', age: 13, label: '少年（13岁）' },
  { scene: 'routine:teen', age: 17, label: '青少年（17岁）' },
  { scene: 'routine:adult', age: 25, label: '成年（25岁）' },
  { scene: 'routine:prime', age: 40, label: '壮年（40岁）' },
  { scene: 'routine:old', age: 65, label: '老年（65岁）' },
]

for (const { scene, age, label } of ageCases) {
  stage(age)
  const walked = play(scene)
  if (walked.length === 0) {
    console.log(`  ✗ ${label}（${scene}）：走了零步——场景 id 打错或库里没挂上。`)
    bad += 1
  } else {
    console.log(`  ✓ ${label}（${scene}）：走进去了，走了 ${walked.length} 步（…${walked[walked.length - 1]}）。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  日常例行六卷，各年龄段各自有人走过了。\n')
}
