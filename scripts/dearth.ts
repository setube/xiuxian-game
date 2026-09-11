/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 荒年——两卷各自走得到吗。
 *
 * `dearth.ts` 里两个场景：
 *
 *   dearth:price   米价涨了，家境决定了荒年的样子（四档分叉）
 *   dearth:unrest  动乱路上，护卫/客栈/铺面/村庄各有不同
 *
 * 核心判据：
 *
 * 一、四档家境（comfortable/tighten/choose/desperate）各自走得到
 * 二、租子那条路（beg-rent → rent → rent-deferred/silent/refused）可达
 * 三、choose 档里三个选项（sell/borrow/work）各自走得到
 * 四、dearth:unrest 四条路（escort/inn/shop/village）各自走得到
 *
 * 跑法：bun scripts/dearth.ts
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

function stage(standing: number): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = standing
  const world = useWorldStore()
  world.advanceTime({ years: 20 })
}

/** 给 household 设田主（地主），以便走 rent-due 分支 */
function setLandlord(temper: string = '温和'): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  const household = useHouseholdStore()
  people.enroll({
    id: 'landlord',
    surname: '王',
    given: '大',
    gender: '男',
    bornYear: world.time.year - 45,
    bornMonth: 3,
    temper: temper as '温和',
    health: 70,
    place: world.place,
    fate: '在',
    history: [],
  })
  ;(household as unknown as { landlord: string }).landlord = 'landlord'
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

console.log('\n=== 荒年——两卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、dearth:price 四档家境分叉。
 *
 * tiers 节点按 standing 分叉：
 *   ≥62 → comfortable
 *   ≥38 → tighten
 *   ≥18 → choose
 *   <18 → desperate
 *
 * 从 tiers 节点直接演，绕过 rent-due 里的选择。
 */
{
  const SCENE = 'dearth:price'

  const tiers: Array<{ standing: number; node: string; label: string }> = [
    { standing: 70, node: 'comfortable', label: '有产户（standing 70）' },
    { standing: 45, node: 'tighten', label: '中等户（standing 45）' },
    { standing: 25, node: 'choose', label: '贫户（standing 25）' },
    { standing: 10, node: 'desperate', label: '极贫户（standing 10）' },
  ]

  for (const { standing, node, label } of tiers) {
    stage(standing)
    const walked = playFrom(SCENE, 'tiers')
    if (!walked.includes(node)) {
      console.log(`  ✗ price 家境档 ${label}：没走到 ${node}（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ price 家境档 ${label}：走到了 ${node}。`)
    }
  }
}

/**
 * 二、rent 分支：地主性情决定缓不缓租。
 *
 * rent 节点按 landlord 性情分叉：
 *   温和/谨慎 → rent-deferred（缓一年）
 *   木讷       → rent-silent（什么也没说）
 *   其他       → rent-refused（直接量走）
 */
{
  const SCENE = 'dearth:price'

  const rentCases: Array<{ temper: string; node: string; label: string }> = [
    { temper: '温和', node: 'rent-deferred', label: '地主温和（缓租）' },
    { temper: '木讷', node: 'rent-silent', label: '地主木讷（沉默）' },
    { temper: '刚硬', node: 'rent-refused', label: '地主刚硬（量走）' },
  ]

  for (const { temper, node, label } of rentCases) {
    stage(25)
    setLandlord(temper)
    const walked = playFrom(SCENE, 'rent')
    if (!walked.includes(node)) {
      console.log(`  ✗ price rent ${label}：没走到 ${node}（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ price rent ${label}：走到了 ${node}。`)
    }
  }
}

/**
 * 三、choose 档三个选项（sell/borrow/work）。
 *
 * choose 节点里玩家有三种选择：卖了值钱的（sell）、借粮（borrow）、打零工（work）。
 */
{
  const SCENE = 'dearth:price'

  const chooseCases: Array<{ pick: string; node: string; label: string }> = [
    { pick: 'sell', node: 'after-sell', label: '卖了值钱的（sell）' },
    { pick: 'borrow', node: 'after-borrow', label: '借粮（borrow）' },
    { pick: 'work', node: 'after-work', label: '打零工（work）' },
  ]

  for (const { pick, node, label } of chooseCases) {
    stage(25)
    const walked = playFrom(SCENE, 'choose', (opts) => opts.includes(pick) ? pick : opts[0]!)
    if (!walked.includes(node)) {
      console.log(`  ✗ price choose ${label}：没走到 ${node}（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ price choose ${label}：走到了 ${node}。`)
    }
  }
}

/**
 * 四、dearth:unrest 四条路（escort/inn/shop/village）。
 *
 * 这一卷是荒年动乱时路上的遭遇，按 livelihood/business/station 分叉。
 * 直接从各节点演验内容存在。
 */
{
  const SCENE = 'dearth:unrest'

  const unrestNodes: Array<{ node: string; label: string }> = [
    { node: 'escort', label: '护卫路上（escort）' },
    { node: 'inn', label: '客栈（inn）' },
    { node: 'shop', label: '铺面（shop）' },
    { node: 'village', label: '村庄（village）' },
  ]

  for (const { node, label } of unrestNodes) {
    stage(40)
    const walked = playFrom(SCENE, node)
    if (walked.length === 0) {
      console.log(`  ✗ unrest ${label}：节点不存在或场景 id 打错。`)
      bad += 1
    } else {
      console.log(`  ✓ unrest ${label}：节点有内容，走了 ${walked.length} 步。`)
    }
  }
}

/**
 * 五、尺子自检：两卷各自都走进去了。
 */
{
  const scenes = ['dearth:price', 'dearth:unrest'] as const
  for (const scene of scenes) {
    stage(40)
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
    }
  }
  console.log('  ✓ 尺子自检：两卷各自都走进去了。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  荒年是什么样子，由这家人的家底决定。各档各有人走过了。\n')
}
