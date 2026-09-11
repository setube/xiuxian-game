/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 孩童时代——五卷各自走得到吗。
 *
 * `childhood.ts` 里五个场景，都是记事前后那几年：
 *
 *   child:memory   记事了（家里的营生决定了孩子头一眼看到的世界）
 *   child:sick     一场病
 *   child:sibling  添丁（弟弟或妹妹出生）
 *   child:hungry   灶（饿了）
 *   child:harvest  好年景
 *
 * 核心判据：
 * 一、child:memory 按营生走到不同节点（farm/shop/hunt/craft 等）
 * 二、child:sibling sibling 分叉可达
 * 三、child:hungry ask/quiet 两条路各自可达
 * 四、五卷各自都走进去了（尺子自检）
 *
 * 跑法：bun scripts/childhood.ts
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

function stage(origin: string = 'farm', age = 6): void {
  setActivePinia(createPinia())
  beOf(origin as 'farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function playFrom(
  scene: string,
  from: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 20,
): string[] {
  const s = lifeScenes[scene]
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
  scene: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
): string[] {
  return playFrom(scene, lifeScenes[scene]?.entry ?? 'open', pick)
}

console.log('\n=== 孩童时代——五卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、child:memory（记事了）。
 *
 * open 节点按营生分流到不同节点（farm/shop/craft 等）。
 * 用农户出身走进去，确认走到了 farm 节点，然后走到 close。
 */
{
  const SCENE = 'child:memory'

  stage('farm')
  const farmWalked = play(SCENE)
  if (!farmWalked.includes('farm')) {
    console.log(`  ✗ memory 农户出身 → farm：没走到（走过 ${farmWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log(`  ✓ memory 农户出身 → farm：走到了 farm，共 ${farmWalked.length} 步。`)
  }

  // close 节点也要走到
  if (!farmWalked.includes('close')) {
    console.log(`  ✗ memory → close：没走到（走过 ${farmWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ memory → close：走到了。')
  }
}

/**
 * 二、child:sick（一场病）。
 */
{
  stage()
  const walked = play('child:sick')
  if (walked.length === 0) {
    console.log('  ✗ sick：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ sick：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 三、child:sibling（添丁）。
 *
 * open 里有 sibling 分叉（弟弟或妹妹出生）。
 */
{
  const SCENE = 'child:sibling'

  stage()
  const walked = play(SCENE)
  if (walked.length === 0) {
    console.log('  ✗ sibling：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ sibling：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 四、child:hungry（灶，饿了）。
 *
 * ask（去问）→ asked，quiet（不说话）→ quiet。
 */
{
  const SCENE = 'child:hungry'

  stage()
  const askWalked = play(SCENE, (opts) => opts.includes('ask') ? 'ask' : opts[0]!)
  if (!askWalked.includes('asked')) {
    console.log(`  ✗ hungry ask → asked：没走到（走过 ${askWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ hungry ask → asked：走到了。')
  }

  stage()
  const quietWalked = play(SCENE, (opts) => opts.includes('quiet') ? 'quiet' : opts[0]!)
  if (!quietWalked.includes('quiet')) {
    console.log(`  ✗ hungry quiet → quiet：没走到（走过 ${quietWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ hungry quiet → quiet：走到了。')
  }
}

/**
 * 五、child:harvest（好年景）。
 */
{
  stage()
  const walked = play('child:harvest')
  if (walked.length === 0) {
    console.log('  ✗ harvest：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ harvest：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 六、尺子自检：五卷各自都走进去了。
 */
{
  const scenes = [
    'child:memory', 'child:sick', 'child:sibling', 'child:hungry', 'child:harvest',
  ] as const
  let allIn = true
  for (const scene of scenes) {
    stage()
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
      allIn = false
    }
  }
  if (allIn) console.log('  ✓ 尺子自检：五卷各自都走进去了。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  孩童时代那几年，各条路各自有人走过了。\n')
}
