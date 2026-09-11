/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 情义——regard:homecoming 走得到吗。
 *
 * `regard.ts` 里只有一个场景（`regard:homecoming`），是回到村子里
 * 被邻居迎面碰上的那一刻：东邻主妇（east-wife）或东邻主事（east-head）
 * 会在 seen 块里出现（有活人检查守着）。
 *
 * 关键节点：
 *   open         → gate-east-wife / gate-east-head / indoors（按条件分流）
 *   gate-east-wife  东邻主妇
 *   gate-east-head  东邻主事
 *   indoors      没有遇到东邻
 *   greeted      被人打招呼
 *   empty        空的（人都散了）
 *   after        结束
 *
 * 核心判据：
 * 一、indoors（没遇到东邻）可达
 * 二、greeted（被人打招呼）可达
 * 三、after（结束）可达
 * 四、尺子自检：场景 id 打对了，真的走进去了
 *
 * 跑法：bun scripts/regard.ts
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

const SCENE = 'regard:homecoming'

function stage(age = 28): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function playFrom(
  from: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 20,
): string[] {
  const s = lifeScenes[SCENE]
  if (!s) return []
  const walked: string[] = []
  let at: string | undefined = from

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

function play(
  pick: (options: string[]) => string = (opts) => opts[0]!,
): string[] {
  return playFrom(lifeScenes[SCENE]?.entry ?? 'open', pick)
}

console.log('\n=== 情义——regard:homecoming 走得到吗 ===\n')

let bad = 0

/**
 * 一、indoors（没遇到东邻）→ 继续走。
 */
{
  stage()
  const walked = playFrom('indoors')
  if (walked.length === 0) {
    console.log('  ✗ indoors：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ indoors：节点有内容，走了 ${walked.length} 步。`)
  }
}

/**
 * 二、greeted（被人打招呼）可达。
 */
{
  stage()
  const walked = playFrom('greeted')
  if (walked.length === 0) {
    console.log('  ✗ greeted：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ greeted：节点有内容，走了 ${walked.length} 步。`)
  }
}

/**
 * 三、after（结束）可达。
 */
{
  stage()
  const walked = playFrom('after')
  if (walked.length === 0) {
    console.log('  ✗ after：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ after：节点有内容，走了 ${walked.length} 步。`)
  }
}

/**
 * 四、尺子自检：场景 id 打对了，真的走进去了。
 */
{
  stage()
  const walked = play()
  if (walked.length < 2) {
    console.log(`  ✗ 尺子自检：只走了 ${walked.length} 节——场景 id 打错或库里没挂上。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：走了 ${walked.length} 节（${walked.join(' → ')}）。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  情义那一卷，各条路各自有人走过了。\n')
}
