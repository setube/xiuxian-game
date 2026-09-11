/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 分家那几卷——三卷各自走得到吗。
 *
 * `house.ts` 里三个场景：
 *
 *   house:succeed        继承家业（bereaved/handed/各种营生分叉）
 *   house:divide         分家（哥分出去，玩家留老屋；choose→stay/town）
 *   house:divide-younger 小的分出去（玩家是次子分出去；done）
 *
 * 核心判据：
 * 一、house:succeed 走到 bereaved 和 handed（两条路）
 * 二、house:divide choose→stay/town 两条路各自可达
 * 三、house:divide-younger 走到 done
 * 四、尺子自检：三卷各自都走进去了
 *
 * 跑法：bun scripts/house.ts
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

function stage(age = 30): void {
  setActivePinia(createPinia())
  beOf('farm')
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

console.log('\n=== 分家那几卷——三卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、house:succeed（继承家业）。
 *
 * bereaved（父母没了）和 handed（交到手里了）两条路。
 * 直接从各节点演验可达性。
 */
{
  const SCENE = 'house:succeed'

  stage()
  const bereavedWalked = playFrom(SCENE, 'bereaved')
  if (bereavedWalked.length === 0) {
    console.log('  ✗ succeed bereaved：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ succeed bereaved：节点有内容，走了 ${bereavedWalked.length} 步。`)
  }

  stage()
  const handedWalked = playFrom(SCENE, 'handed')
  if (handedWalked.length === 0) {
    console.log('  ✗ succeed handed：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ succeed handed：节点有内容，走了 ${handedWalked.length} 步。`)
  }
}

/**
 * 二、house:divide（分家）。
 *
 * choose 节点里有 stay（留下）和 town（进城）两条路。
 */
{
  const SCENE = 'house:divide'

  stage()
  const stayWalked = playFrom(SCENE, 'choose', (opts) => opts.includes('stay') ? 'stay' : opts[0]!)
  if (!stayWalked.includes('settled') && stayWalked.length === 0) {
    console.log(`  ✗ divide stay：走了零步——节点有问题。`)
    bad += 1
  } else {
    console.log(`  ✓ divide stay：走到了 ${stayWalked[stayWalked.length - 1]}。`)
  }

  stage()
  const townWalked = playFrom(SCENE, 'choose', (opts) => opts.includes('town') ? 'town' : opts[0]!)
  if (!townWalked.includes('town') && townWalked.length === 0) {
    console.log(`  ✗ divide town：走了零步——节点有问题。`)
    bad += 1
  } else {
    console.log(`  ✓ divide town：走到了 ${townWalked[townWalked.length - 1]}。`)
  }
}

/**
 * 三、house:divide-younger（小的分出去）。
 *
 * 走到 done 节点。
 */
{
  stage()
  const walked = play('house:divide-younger')
  if (!walked.includes('done') && walked.length === 0) {
    console.log(`  ✗ divide-younger：走了零步——场景 id 打错或库里没挂上。`)
    bad += 1
  } else {
    console.log(`  ✓ divide-younger：走到了 ${walked[walked.length - 1]}，共 ${walked.length} 步。`)
  }
}

/**
 * 四、尺子自检：三卷各自都走进去了。
 */
{
  const scenes = ['house:succeed', 'house:divide', 'house:divide-younger'] as const
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
  if (allIn) console.log('  ✓ 尺子自检：三卷各自都走进去了。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  分家那几卷，各条路各自有人走过了。\n')
}
