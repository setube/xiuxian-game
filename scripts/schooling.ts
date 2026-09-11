/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 私塾——四卷各自走得到吗。
 *
 * `schooling.ts` 里四个场景：
 *
 *   school:threshold  入学那年，能不能去、去不去（含贫困路线：没去/窗外偷听）
 *   school:praise     先生夸了你
 *   school:strength   你有个强项（算学/记忆/书法）
 *   school:fair       庙会/集市上（说书/耍杂/糖人三条路）
 *
 * 核心判据：
 * 一、threshold 两条路（进私塾 vs 没去）各自走得到
 * 二、lessons 三档（diligent/ordinary/skip）各自走得到
 * 三、无法入学时（cannot）：work 和 peek（窗外偷听）各自走得到
 * 四、fair 三条路（storyteller/acrobat/candy）各自走得到
 * 五、尺子自检：四卷各自都走进去了
 *
 * 跑法：bun scripts/schooling.ts
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

function stage(standing: number, age = 7): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = standing
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

console.log('\n=== 私塾——四卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、school:threshold 入学那年。
 *
 * open 里有选项：hall（去私塾）、study（在家读）、cannot（去不了）。
 * lessons 节点按行为分三档：diligent/ordinary/skip。
 * cannot 分两条：work（去做活）和 peek（窗外偷听）。
 */
{
  const SCENE = 'school:threshold'

  // lessons 三档：从 lessons 节点演，选不同选项
  const lessonsCases: Array<{ pick: string; node: string; label: string }> = [
    { pick: 'diligent', node: 'first-year', label: '用功（diligent）' },
    { pick: 'ordinary', node: 'first-year', label: '普通（ordinary）' },
    { pick: 'skip', node: 'first-year', label: '逃课（skip）' },
  ]

  for (const { pick, node, label } of lessonsCases) {
    stage(50)
    const walked = playFrom(SCENE, 'lessons', (opts) => opts.includes(pick) ? pick : opts[0]!)
    if (!walked.includes(node) && walked.length === 0) {
      console.log(`  ✗ threshold lessons ${label}：没走到（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ threshold lessons ${label}：走到了（${walked.join(' → ')}）。`)
    }
  }

  // cannot 两条路
  stage(20)
  const workWalked = playFrom(SCENE, 'cannot', (opts) => opts.includes('work') ? 'work' : opts[0]!)
  if (!workWalked.includes('worked')) {
    console.log(`  ✗ threshold cannot→work：没走到 worked（走过 ${workWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ threshold cannot→work（家境不够去做活）：走到了。')
  }

  stage(20)
  const peekWalked = playFrom(SCENE, 'cannot', (opts) => opts.includes('peek') ? 'peek' : opts[0]!)
  if (!peekWalked.includes('peeked')) {
    console.log(`  ✗ threshold cannot→peek：没走到 peeked（走过 ${peekWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ threshold cannot→peek（窗外偷听）：走到了。')
  }
}

/**
 * 二、school:praise（先生夸了）。
 */
{
  const SCENE = 'school:praise'
  stage(50, 10)
  const walked = play(SCENE)
  if (walked.length === 0) {
    console.log('  ✗ praise：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ praise（先生夸了）：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 三、school:strength（强项）。
 *
 * 有 after 节点（强项被认出来了）。
 */
{
  const SCENE = 'school:strength'
  stage(50, 10)
  const walked = play(SCENE)
  if (!walked.includes('after')) {
    console.log(`  ✗ strength after：没走到（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ strength after（强项被认出来了）：走到了。')
  }
}

/**
 * 四、school:fair 庙会/集市三条路。
 *
 * 选项：storyteller（听说书）/acrobat（看杂耍）/candy（买糖人）。
 * 各自走到对应节点。
 */
{
  const SCENE = 'school:fair'

  const fairCases: Array<{ pick: string; node: string; label: string }> = [
    { pick: 'storyteller', node: 'tale', label: '听说书（storyteller）' },
    { pick: 'acrobat', node: 'acrobat', label: '看杂耍（acrobat）' },
    { pick: 'candy', node: 'candy', label: '买糖人（candy）' },
  ]

  for (const { pick, node, label } of fairCases) {
    stage(50, 10)
    const walked = play(SCENE, (opts) => opts.includes(pick) ? pick : opts[0]!)
    if (!walked.includes(node)) {
      console.log(`  ✗ fair ${label}：没走到 ${node}（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ fair ${label}：走到了。`)
    }
  }
}

/**
 * 五、尺子自检：四卷各自都走进去了。
 */
{
  const scenes = ['school:threshold', 'school:praise', 'school:strength', 'school:fair'] as const
  for (const scene of scenes) {
    stage(50, 10)
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
    }
  }
  console.log('  ✓ 尺子自检：四卷各自都走进去了。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  私塾那几年，各条路各自有人走过了。\n')
}
