/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 日常生活——早中晚三段各条路走得到吗。
 *
 * `day.ts` 里只有一个场景（`day:ordinary`），但它是全库频率最高的场景之一：
 * 早上做什么、下午做什么、晚上做什么，三段各有选项，汇入 close（这一天结束了）。
 *
 * 核心判据：
 * 一、morning 段选 work 走到 morning-out，选 idle 走到 morning-out（兜底）
 * 二、afternoon 段选 work/town/elder 各自走到 afternoon-out
 * 三、evening 段走到 close（这一天结束了）
 * 四、全程走一遍：open → morning → afternoon → evening → close
 * 五、尺子自检：场景 id 打对了，真的走进去了
 *
 * 跑法：bun scripts/day.ts
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

const SCENE = 'day:ordinary'

function stage(age = 25): void {
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
  stopAfter = 30,
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
  return playFrom(lifeScenes[SCENE]?.entry ?? 'morning', pick)
}

console.log('\n=== 日常生活——早中晚三段各条路走得到吗 ===\n')

let bad = 0

/**
 * 一、morning 段：选 work 和选 idle 都走到 morning-out。
 */
{
  stage()
  const workWalked = playFrom('morning', (opts) => opts.includes('work') ? 'work' : opts[0]!)
  if (!workWalked.includes('morning-out')) {
    console.log(`  ✗ morning work → morning-out：没走到（走过 ${workWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ morning work → morning-out：走到了。')
  }

  stage()
  const idleWalked = playFrom('morning', (opts) => opts.includes('idle') ? 'idle' : opts[0]!)
  if (!idleWalked.includes('morning-out')) {
    console.log(`  ✗ morning idle → morning-out：没走到（走过 ${idleWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ morning idle → morning-out：走到了。')
  }
}

/**
 * 二、afternoon 段：work/town/elder 三条路各自走到 afternoon-out。
 */
{
  for (const pick of ['work', 'town', 'elder'] as const) {
    stage()
    const walked = playFrom('afternoon', (opts) => opts.includes(pick) ? pick : opts[0]!)
    if (!walked.includes('afternoon-out')) {
      console.log(`  ✗ afternoon ${pick} → afternoon-out：没走到（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ afternoon ${pick} → afternoon-out：走到了。`)
    }
  }
}

/**
 * 三、evening 段：走到 close（这一天结束了）。
 */
{
  stage()
  const walked = playFrom('evening')
  if (!walked.includes('close') && !walked.includes('evening-out')) {
    console.log(`  ✗ evening → close：没走到（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log(`  ✓ evening → close/evening-out：走到了 ${walked[walked.length - 1]}。`)
  }
}

/**
 * 四、全程走一遍：morning → afternoon → evening → close。
 */
{
  stage()
  const walked = play()
  if (!walked.includes('close')) {
    console.log(`  ✗ 全程：没走到 close（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log(`  ✓ 全程：走到了 close，共 ${walked.length} 节（${walked.join(' → ')}）。`)
  }
}

/**
 * 五、尺子自检：场景 id 打对了，真的走进去了。
 */
{
  stage()
  const walked = play()
  if (walked.length < 3) {
    console.log(`  ✗ 尺子自检：只走了 ${walked.length} 节——场景 id 打错或库里没挂上。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：走了 ${walked.length} 节。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  早中晚三段，各条路各自有人走过了。\n')
}
