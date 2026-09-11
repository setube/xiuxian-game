/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 重逢——三卷各自走得到吗。
 *
 * `reunion.ts` 里三个场景，都是「走了几年回来了」的那一刻：
 *
 *   reunion:apprentice   学徒生涯结束回来（go/stay 两条路）
 *   reunion:homecoming   外出打工回来（stay-home/back-to-town 两条路）
 *   reunion:emptied      家里已经空了（stay-and-settle/back-to-town 两条路）
 *
 * 核心判据：
 * 一、reunion:apprentice go→away / stay→stayed 两条路各自可达
 * 二、reunion:homecoming stay-home→stayed / back-to-town→left 两条路各自可达
 * 三、reunion:emptied stay-and-settle→stayed / back-to-town→left 两条路各自可达
 * 四、尺子自检：三卷各自都走进去了
 *
 * 跑法：bun scripts/reunion.ts
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

function stage(age = 25): void {
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

console.log('\n=== 重逢——三卷各自走得到吗 ===\n')

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
 * 一、reunion:apprentice（学徒生涯结束回来）。
 *
 * go（走了）→ away，stay（留下来）→ stayed。
 */
{
  const SCENE = 'reunion:apprentice'

  stage()
  const goWalked = play(SCENE, (opts) => opts.includes('go') ? 'go' : opts[0]!)
  check('apprentice go → away', goWalked, 'away')

  stage()
  const stayWalked = play(SCENE, (opts) => opts.includes('stay') ? 'stay' : opts[0]!)
  check('apprentice stay → stayed', stayWalked, 'stayed')
}

/**
 * 二、reunion:homecoming（外出打工回来）。
 *
 * stay-home（留家里）→ stayed，back-to-town（回城里）→ left。
 */
{
  const SCENE = 'reunion:homecoming'

  stage()
  const stayHomeWalked = play(SCENE, (opts) => opts.includes('stay-home') ? 'stay-home' : opts[0]!)
  check('homecoming stay-home → stayed', stayHomeWalked, 'stayed')

  stage()
  const backWalked = play(SCENE, (opts) => opts.includes('back-to-town') ? 'back-to-town' : opts[0]!)
  check('homecoming back-to-town → left', backWalked, 'left')
}

/**
 * 三、reunion:emptied（家里已经空了）。
 *
 * stay-and-settle（留下来安家）→ stayed，back-to-town（回城里）→ left。
 */
{
  const SCENE = 'reunion:emptied'

  stage()
  const settleWalked = play(SCENE, (opts) => opts.includes('stay-and-settle') ? 'stay-and-settle' : opts[0]!)
  check('emptied stay-and-settle → stayed', settleWalked, 'stayed')

  stage()
  const backWalked = play(SCENE, (opts) => opts.includes('back-to-town') ? 'back-to-town' : opts[0]!)
  check('emptied back-to-town → left', backWalked, 'left')
}

/**
 * 四、尺子自检：三卷各自都走进去了。
 */
{
  const scenes = ['reunion:apprentice', 'reunion:homecoming', 'reunion:emptied'] as const
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
  console.log('  重逢那几卷，各条路各自有人走过了。\n')
}
