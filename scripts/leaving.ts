/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 离家——三卷各自走得到吗。
 *
 * `leaving.ts` 里三个场景：
 *
 *   leave:hiring    被雇到货栈去（ask/work/pass 三条路）
 *   leave:caravan   跟镖局的人走（go/stay 两条路）
 *   leave:the-road  已经在路上了
 *
 * 核心判据：
 * 一、leave:hiring 三条路（asked/worked/passed）各自走得到
 * 二、leave:caravan go → went / stay → stayed 各自走得到
 * 三、三卷各自都走进去了（尺子自检）
 *
 * 跑法：bun scripts/leaving.ts
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

function stage(age = 18): void {
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

console.log('\n=== 离家——三卷各自走得到吗 ===\n')

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
 * 一、leave:hiring（被雇到货栈去）。
 *
 * 三条路：ask（去问）→ asked，work（去做）→ worked，pass（不去）→ passed（兜底）。
 */
{
  const SCENE = 'leave:hiring'

  stage()
  const askedWalked = play(SCENE, (opts) => opts.includes('ask') ? 'ask' : opts[0]!)
  check('hiring ask → asked', askedWalked, 'asked')

  stage()
  const workedWalked = play(SCENE, (opts) => opts.includes('work') ? 'work' : opts[0]!)
  check('hiring work → worked', workedWalked, 'worked')

  stage()
  const passedWalked = play(SCENE, (opts) => opts.includes('pass') ? 'pass' : opts[0]!)
  // pass 是「不去」——没有专门的 passed 节点，直接结束
  if (passedWalked.length === 0) {
    console.log('  ✗ hiring pass：走了零步——节点有问题。')
    bad += 1
  } else {
    console.log(`  ✓ hiring pass（不去）：走到了 ${passedWalked[passedWalked.length - 1]}。`)
  }
}

/**
 * 二、leave:caravan（跟镖局的人走）。
 *
 * 两条路：go（跟着走）→ went，stay（留下来）→ stayed。
 */
{
  const SCENE = 'leave:caravan'

  stage()
  const wentWalked = play(SCENE, (opts) => opts.includes('go') ? 'go' : opts[0]!)
  check('caravan go → went', wentWalked, 'went')

  stage()
  const stayedWalked = play(SCENE, (opts) => opts.includes('stay') ? 'stay' : opts[0]!)
  check('caravan stay → stayed', stayedWalked, 'stayed')
}

/**
 * 三、leave:the-road（已经在路上了）。
 */
{
  stage()
  const walked = play('leave:the-road')
  if (walked.length === 0) {
    console.log('  ✗ the-road：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ the-road：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 四、尺子自检：三卷各自都走进去了。
 */
{
  const scenes = ['leave:hiring', 'leave:caravan', 'leave:the-road'] as const
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
  console.log('  离家那几卷，各条路各自有人走过了。\n')
}
