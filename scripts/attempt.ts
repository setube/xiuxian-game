/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 试着照书上说的做——十个节点都走得到吗。
 *
 * `attempt.ts` 是修行纵切的终点：读了书、见了人、知道了「炼气」这件事，
 * 然后他真的坐下来试了。结果有三档：什么也没有（62%）、觉出一点（30%）、坐出毛病（8%）。
 *
 * 这一卷入场条件极苛刻（`thin-book` + `knowledge: qi-refining`），
 * 300 世里几乎没人走进来，verify 里 6/10 节点一直是零。
 * **那不等于内容有问题，但「没人量过」和「量过了全绿」看起来一模一样。**
 * 所以摆局，把每一支都走一遍。
 *
 * ## 十个节点
 *
 *   why / for-long / for-strong / for-rich    动机四支
 *   open                                      开始修行
 *   outcome                                   掷骰
 *   nothing / flicker / hurt                  三种结果
 *   shelved                                   搁置（选择不继续）
 *
 * 跑法：bun scripts/attempt.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useWorldStore } from '../src/stores/world'
import { useHouseholdStore } from '../src/stores/household'
import { useLeaningStore } from '../src/stores/leanings'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

const SCENE = 'attempt:first'

/**
 * 摆一局：有书、有知识、没在修炼中，走进 why 入口。
 *
 * `leaning` 决定走哪一条动机分叉。
 * `outcome` 直接设旗标绕过掷骰，控制走哪个结局档。
 */
function stage(opts: {
  leaning?: 'heal' | 'strong' | 'rich'
}): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: 25 })

  // 给 character 加 thin-book 和 qi-refining knowledge
  applyEffects([
    { type: 'item', id: 'thin-book', name: '薄册子' },
    {
      type: 'knowledge',
      id: 'qi-refining',
      title: '炼气',
      summary: '那个人说，这件事叫炼气。',
      contact: '亲历',
      category: '修行',
    },
  ])

  // 直接操作 leaning store，把 leaning weight 推到反复档（STIRRING_AT = 18）
  if (opts.leaning) {
    const leanings = useLeaningStore()
    const world2 = useWorldStore()
    leanings.stir(
      opts.leaning,
      18,
      { at: world2.time, text: '（门禁摆局）' },
      world2.time,
    )
  }
}

/**
 * 从指定节点演下去，回报走过的节点 id。
 */
function playFrom(from: string, pick: (options: string[]) => string = () => 'shelve', stopAfter = 20): string[] {
  const scene = lifeScenes[SCENE]
  if (!scene) return []
  const walked: string[] = []
  let at: string | undefined = from

  for (let guard = 0; at !== undefined && guard < stopAfter; guard += 1) {
    const node: SceneNode | undefined = scene.nodes[at]
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

function play(pick: (options: string[]) => string = () => 'shelve', stopAfter = 20): string[] {
  return playFrom(lifeScenes[SCENE]?.entry ?? 'why', pick, stopAfter)
}

console.log('\n=== 照书上说的做——十个节点都走得到吗 ===\n')

let bad = 0

/**
 * 一、动机三支都走得到。
 *
 * `why` 按 leaning 分叉：heal→for-long，strong→for-strong，rich→for-rich。
 * 三条各自摆一局，验终点节点在里头。
 */
{
  const cases: Array<{ leaning: 'heal' | 'strong' | 'rich'; node: string; label: string }> = [
    { leaning: 'heal', node: 'for-long', label: '长生（heal）' },
    { leaning: 'strong', node: 'for-strong', label: '权力（strong）' },
    { leaning: 'rich', node: 'for-rich', label: '财富（rich）' },
  ]

  for (const { leaning, node, label } of cases) {
    stage({ leaning, outcome: 'nothing' })
    const walked = play()
    if (!walked.includes(node)) {
      console.log(`  ✗ 动机分叉 ${label}：没走到 ${node}（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ 动机分叉 ${label}：走到了 ${node}。`)
    }
  }
}

/**
 * 二、无动机也能走进去（why 兜底直接到 open）。
 *
 * 不设 leaning，三条 branches 都不成立，兜底 next 走 open。
 */
{
  stage({ outcome: 'nothing' })
  const walked = play()
  if (!walked.includes('open')) {
    console.log(`  ✗ 无动机：没走到 open（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ 无动机：why 兜底走进了 open。')
  }
}

/**
 * 三、三种结果档都走得到。
 *
 * `outcome` 节点的 `onEnter` 会重新掷骰覆盖预设旗标，无法靠提前设旗控制走哪档。
 * 改为从目标节点直接开始演，绕过 outcome 掷骰——**节点内容本身有没有问题**是要验的，
 * 而不是掷骰逻辑，那个 `roll` 效果的正确性由别处守。
 */
{
  const targets: Array<{ node: string; label: string }> = [
    { node: 'nothing', label: '什么也没有（62%）' },
    { node: 'flicker', label: '觉出一点（30%）' },
    { node: 'hurt', label: '坐出毛病（8%）' },
  ]

  for (const { node, label } of targets) {
    stage({})
    const walked = playFrom(node)
    if (walked.length === 0 || !walked.includes(node)) {
      console.log(`  ✗ 结果档 ${label}：从 ${node} 开始演走了零步——节点不存在或场景 id 打错。`)
      bad += 1
    } else {
      console.log(`  ✓ 结果档 ${label}：节点 ${node} 有内容，走了 ${walked.length} 步。`)
    }
  }
}

/**
 * 四、shelved：搁置。open 里有个「算了」选项，选它走 shelved。
 *
 * 这一档守的是「坐了一会儿就放下」这件事是正经的路，有正文。
 */
{
  stage({ outcome: 'nothing' })
  const walked = play((options) => options.includes('shelve') ? 'shelve' : options[0]!)

  if (!walked.includes('shelved')) {
    console.log(`  ✗ shelved：选了「算了」却没走到那一节（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ shelved（搁置）：走到了。')
  }
}

/**
 * 五、尺子自检：场景真的被演过，不是 play() 走了零步。
 */
{
  stage({ outcome: 'nothing' })
  const walked = play()
  if (walked.length < 3) {
    console.log(`  ✗ 尺子自检：只走了 ${walked.length} 节（${walked.join(' → ')}）——这一卷没有真被演过。`)
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
  console.log('  坐了一年，有没有觉出什么不一样——三档各自有人走过了。\n')
}
