/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 外出那几年——六卷各自走得到吗。
 *
 * `away.ts` 里六个场景，都发生在玩家不在家的那段岁月：
 *
 *   away:lends       有人要借银子（take/refuse 两条路）
 *   away:i-repay     还了哥的银子（deed keep 效果，本轮已补写）
 *   away:hurt        受伤了
 *   away:old         人老了
 *   away:father-old  父亲老了
 *   away:journeyman  游历那几年
 *
 * 核心判据：
 * 一、away:lends 两条路（take→taken / refuse→refused）各自走得到
 * 二、away:i-repay 两条路（in-town/at-home）各自走得到
 * 三、away:hurt/old/father-old/journeyman 各自走进去了
 * 四、尺子自检：六卷各自都走进去了
 *
 * 跑法：bun scripts/away.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import { usePeopleStore } from '../src/stores/people'
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

function enrollBrother(): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'brother',
    surname: '江',
    given: '大',
    gender: '男',
    bornYear: world.time.year - 30,
    bornMonth: 3,
    temper: '木讷',
    health: 70,
    place: world.place,
    fate: '在',
    history: [],
  })
  people.bind('me', 'brother', '兄')
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

console.log('\n=== 外出那几年——六卷各自走得到吗 ===\n')

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
 * 一、away:lends（有人要借银子）。
 *
 * take（借出去）→ taken，refuse（不借）→ refused。
 */
{
  const SCENE = 'away:lends'

  stage()
  const takenWalked = play(SCENE, (opts) => opts.includes('take') ? 'take' : opts[0]!)
  check('lends take → taken', takenWalked, 'taken')

  stage()
  const refusedWalked = play(SCENE, (opts) => opts.includes('refuse') ? 'refuse' : opts[0]!)
  check('lends refuse → refused', refusedWalked, 'refused')
}

/**
 * 二、away:i-repay（还了哥的银子）。
 *
 * 两条路：in-town（在镇上还）和 at-home（回家还）。
 */
{
  const SCENE = 'away:i-repay'

  stage()
  enrollBrother()
  const inTownWalked = playFrom(SCENE, 'in-town')
  if (inTownWalked.length === 0) {
    console.log('  ✗ i-repay in-town：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ i-repay in-town：节点有内容，走了 ${inTownWalked.length} 步。`)
  }

  stage()
  enrollBrother()
  const atHomeWalked = playFrom(SCENE, 'at-home')
  if (atHomeWalked.length === 0) {
    console.log('  ✗ i-repay at-home：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ i-repay at-home：节点有内容，走了 ${atHomeWalked.length} 步。`)
  }
}

/**
 * 三、away:hurt/old/father-old/journeyman 各自走进去了。
 */
{
  const scenes: Array<{ id: string; label: string }> = [
    { id: 'away:hurt', label: '受伤' },
    { id: 'away:old', label: '人老了' },
    { id: 'away:father-old', label: '父亲老了' },
    { id: 'away:journeyman', label: '游历那几年' },
  ]

  for (const { id, label } of scenes) {
    stage()
    const walked = play(id)
    if (walked.length === 0) {
      console.log(`  ✗ ${label}（${id}）：走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
    } else {
      console.log(`  ✓ ${label}（${id}）：走进去了，走了 ${walked.length} 步。`)
    }
  }
}

/**
 * 四、尺子自检：六卷各自都走进去了。
 */
{
  const scenes = [
    'away:lends', 'away:i-repay', 'away:hurt',
    'away:old', 'away:father-old', 'away:journeyman',
  ] as const
  let allIn = true
  for (const scene of scenes) {
    stage()
    enrollBrother()
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
      allIn = false
    }
  }
  if (allIn) console.log('  ✓ 尺子自检：六卷各自都走进去了。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  外出那几年，六卷各有人走过了。\n')
}
