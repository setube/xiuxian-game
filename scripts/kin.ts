/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 族亲——三卷各自走得到吗。
 *
 * `kin.ts` 里三个场景：
 *
 *   dad:north   父亲曾经去过北边（press/quiet 两条路）
 *   dad:adept   父亲见过修行者（ask/later 两条路）
 *   mom:past    娘以前的事（roll/told/letters/famine/silent 等节点）
 *
 * 核心判据：
 * 一、dad:north press→told / quiet→untold 两条路各自走得到
 * 二、dad:adept ask→the-story / later→slept 两条路各自走得到
 * 三、mom:past 走进去了
 * 四、尺子自检：三卷各自都走进去了
 *
 * 跑法：bun scripts/kin.ts
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

function stage(age = 15): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function enrollFather(): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'father',
    surname: '江',
    given: '大',
    gender: '男',
    bornYear: world.time.year - 45,
    bornMonth: 3,
    temper: '木讷',
    health: 70,
    place: world.place,
    fate: '在',
    history: [],
  })
  people.bind('me', 'father', '生父')
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

console.log('\n=== 族亲——三卷各自走得到吗 ===\n')

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
 * 一、dad:north（父亲曾经去过北边）。
 *
 * press（逼问）→ told，quiet（不问）→ untold。
 */
{
  const SCENE = 'dad:north'

  stage()
  enrollFather()
  const pressWalked = play(SCENE, (opts) => opts.includes('press') ? 'press' : opts[0]!)
  check('dad:north press → told', pressWalked, 'told')

  stage()
  enrollFather()
  const quietWalked = play(SCENE, (opts) => opts.includes('quiet') ? 'quiet' : opts[0]!)
  check('dad:north quiet → untold', quietWalked, 'untold')
}

/**
 * 二、dad:adept（父亲见过修行者）。
 *
 * ask（问了）→ the-story，later（以后再说）→ slept。
 */
{
  const SCENE = 'dad:adept'

  stage()
  enrollFather()
  const askWalked = play(SCENE, (opts) => opts.includes('ask') ? 'ask' : opts[0]!)
  check('dad:adept ask → the-story', askWalked, 'the-story')

  stage()
  enrollFather()
  const laterWalked = play(SCENE, (opts) => opts.includes('later') ? 'later' : opts[0]!)
  check('dad:adept later → slept', laterWalked, 'slept')
}

/**
 * 三、mom:past（娘以前的事）。
 */
{
  stage()
  const walked = play('mom:past')
  if (walked.length === 0) {
    console.log('  ✗ mom:past：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ mom:past：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 四、尺子自检：三卷各自都走进去了。
 */
{
  const scenes = ['dad:north', 'dad:adept', 'mom:past'] as const
  let allIn = true
  for (const scene of scenes) {
    stage()
    enrollFather()
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
  console.log('  族亲三卷，各条路各自有人走过了。\n')
}
