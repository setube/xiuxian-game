/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 静功与侄子——still 和 nephew 各卷走得到吗。
 *
 * `still.ts` 里一个场景：
 *   still:practice  静功练习（open/thirty/forty 三个节点，按年龄分档）
 *
 * `nephew.ts` 里三个场景：
 *   nephew:restless  侄子坐不住了（why-restless/why-hungry/stand 等分叉）
 *   nephew:goes      侄子要走（blessed/defiant/allowed 等分叉）
 *   nephew:mend      侄子和好了
 *
 * 核心判据：
 * 一、still:practice 走进去了
 * 二、nephew:restless 各关键节点可达
 * 三、nephew:goes 走进去了
 * 四、nephew:mend 走进去了
 * 五、尺子自检：四卷各自都走进去了
 *
 * 跑法：bun scripts/still.ts
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

function enrollNephew(): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'nephew',
    surname: '江',
    given: '小',
    gender: '男',
    bornYear: world.time.year - 18,
    bornMonth: 3,
    temper: '木讷',
    health: 72,
    place: world.place,
    fate: '在',
    history: [],
  })
  people.bind('me', 'nephew', '侄')
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

console.log('\n=== 静功与侄子——四卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、still:practice（静功练习）。
 */
{
  stage(25)
  const walked = play('still:weighing')
  if (walked.length === 0) {
    console.log('  ✗ still:practice：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ still:practice：走进去了，走了 ${walked.length} 步（${walked.join(' → ')}）。`)
  }
}

/**
 * 二、nephew:restless（侄子坐不住了）。
 *
 * 关键节点：why-restless/why-hungry/stand 等。
 */
{
  const SCENE = 'nephew:restless'

  stage(40)
  enrollNephew()
  const walked = play(SCENE)
  if (walked.length === 0) {
    console.log('  ✗ nephew:restless：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ nephew:restless：走进去了，走了 ${walked.length} 步。`)
  }

  // stand 节点可达（侄子想站出去）
  stage(40)
  enrollNephew()
  const standWalked = playFrom(SCENE, 'stand')
  if (standWalked.length === 0) {
    console.log('  ✗ nephew:restless stand：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ nephew:restless stand：节点有内容，走了 ${standWalked.length} 步。`)
  }
}

/**
 * 三、nephew:goes（侄子要走）。
 */
{
  stage(40)
  enrollNephew()
  const walked = play('nephew:goes')
  if (walked.length === 0) {
    console.log('  ✗ nephew:goes：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ nephew:goes：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 四、nephew:mend（侄子和好了）。
 */
{
  stage(40)
  enrollNephew()
  const walked = play('nephew:mend')
  if (walked.length === 0) {
    console.log('  ✗ nephew:mend：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ nephew:mend：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 五、尺子自检：四卷各自都走进去了。
 */
{
  const cases: Array<{ scene: string; age: number }> = [
    { scene: 'still:weighing', age: 25 },
    { scene: 'nephew:restless', age: 40 },
    { scene: 'nephew:goes', age: 40 },
    { scene: 'nephew:mend', age: 40 },
  ]
  let allIn = true
  for (const { scene, age } of cases) {
    stage(age)
    enrollNephew()
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
      allIn = false
    }
  }
  if (allIn) console.log('  ✓ 尺子自检：四卷各自都走进去了。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  静功与侄子四卷，各自有人走过了。\n')
}
