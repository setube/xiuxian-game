/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 生病——need:illness 各条路走得到吗。
 *
 * `illness.ts` 里只有一个场景（`need:illness`），是家里有人病了：
 *
 *   open     家里有人病了，三个选项：watch（守着）/herbs（去抓药）/work（出去做活）
 *   watched  守着看
 *   recovered  好了
 *   lingering  拖着
 *   died     没了
 *
 * 核心判据：
 * 一、watch → watched 可达
 * 二、herbs → watched（抓了药）可达
 * 三、work → watched（出去做活了）可达
 * 四、结果节点（recovered/lingering/died）各自可达
 * 五、尺子自检：场景 id 打对了，真的走进去了
 *
 * 跑法：bun scripts/illness.ts
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

const SCENE = 'need:illness'

function stage(age = 20): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function playFrom(
  from: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 20,
): string[] {
  const s = lifeScenes[SCENE]
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
  pick: (options: string[]) => string = (opts) => opts[0]!,
): string[] {
  return playFrom(lifeScenes[SCENE]?.entry ?? 'open', pick)
}

console.log('\n=== 生病——need:illness 各条路走得到吗 ===\n')

let bad = 0

/**
 * 一、open 三条选项各自走到 watched。
 */
{
  for (const pick of ['watch', 'herbs', 'work'] as const) {
    stage()
    const walked = play((opts) => opts.includes(pick) ? pick : opts[0]!)
    if (!walked.includes('watched')) {
      console.log(`  ✗ open ${pick} → watched：没走到（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ open ${pick} → watched：走到了。`)
    }
  }
}

/**
 * 二、结果节点（recovered/lingering/died）各自可达。
 */
{
  for (const node of ['recovered', 'lingering', 'died'] as const) {
    stage()
    const walked = playFrom(node)
    if (walked.length === 0) {
      console.log(`  ✗ 结果 ${node}：节点不存在或场景 id 打错。`)
      bad += 1
    } else {
      console.log(`  ✓ 结果 ${node}：节点有内容，走了 ${walked.length} 步。`)
    }
  }
}

/**
 * 三、尺子自检：场景 id 打对了，真的走进去了。
 */
{
  stage()
  const walked = play()
  if (walked.length < 2) {
    console.log(`  ✗ 尺子自检：只走了 ${walked.length} 节——场景 id 打错或库里没挂上。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：走了 ${walked.length} 节（${walked.join(' → ')}）。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  生病那一卷，各条路各自有人走过了。\n')
}
