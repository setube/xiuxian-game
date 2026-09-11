/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 青年时代——三卷各自走得到吗。
 *
 * `youth.ts` 里三个场景：
 *
 *   youth:exam        考试（go→去考/stay→不去）
 *   youth:apprentice  拜师学艺（craft/shop/farm/tenant 四条出身路）
 *   youth:river       渡口（stand/ask-boatman/leave 三条路）
 *
 * 核心判据：
 * 一、youth:exam 两条路（go→result / stay→stayed）各自走得到
 * 二、youth:apprentice 四条出身路（craft/shop/farm/tenant → done）各自走得到
 * 三、youth:river 三条路（stand/ask-boatman/leave → done）各自走得到
 * 四、尺子自检：三卷各自都走进去了
 *
 * 跑法：bun scripts/youth.ts
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

function stage(age = 15): void {
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

console.log('\n=== 青年时代——三卷各自走得到吗 ===\n')

let bad = 0

function check(label: string, walked: string[], expected: string): void {
  if (!walked.includes(expected)) {
    console.log(`  ✗ ${label}：没走到 ${expected}（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log(`  ✓ ${label}：走到了 ${expected}。`)
  }
}

/**
 * 一、youth:exam（考试）。
 *
 * go（去考）→ result，stay（不去）→ stayed。
 */
{
  const SCENE = 'youth:exam'

  stage()
  const goWalked = play(SCENE, (opts) => opts.includes('go') ? 'go' : opts[0]!)
  check('exam go → result', goWalked, 'result')

  stage()
  const stayWalked = play(SCENE, (opts) => opts.includes('stay') ? 'stay' : opts[0]!)
  check('exam stay → stayed', stayWalked, 'stayed')
}

/**
 * 二、youth:apprentice（拜师学艺）。
 *
 * open 里有四个选项：craft/shop/farm/tenant，都通过 effects 处理后走到 done。
 * 直接从 open 演，选不同选项，确认走到 done。
 */
{
  const SCENE = 'youth:apprentice'

  for (const pick of ['craft', 'shop', 'farm', 'tenant'] as const) {
    stage()
    const walked = play(SCENE, (opts) => opts.includes(pick) ? pick : opts[0]!)
    if (!walked.includes('done') && walked.length === 0) {
      console.log(`  ✗ apprentice ${pick}：走了零步——选项不存在或节点有问题。`)
      bad += 1
    } else {
      console.log(`  ✓ apprentice ${pick}：走到了 ${walked[walked.length - 1]}。`)
    }
  }
}

/**
 * 三、youth:river（渡口）。
 *
 * 三条路：stand（站着看）/ask-boatman（问船家）/leave（走开）→ done。
 */
{
  const SCENE = 'youth:river'

  for (const pick of ['stand', 'ask-boatman', 'leave'] as const) {
    stage()
    const walked = play(SCENE, (opts) => opts.includes(pick) ? pick : opts[0]!)
    if (!walked.includes('done') && walked.length === 0) {
      console.log(`  ✗ river ${pick}：走了零步——节点有问题。`)
      bad += 1
    } else {
      console.log(`  ✓ river ${pick}：走到了 ${walked[walked.length - 1]}。`)
    }
  }
}

/**
 * 四、尺子自检：三卷各自都走进去了。
 */
{
  const scenes = ['youth:exam', 'youth:apprentice', 'youth:river'] as const
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
  console.log('  青年时代那几年，各条路各自有人走过了。\n')
}
