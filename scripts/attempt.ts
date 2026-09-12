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
import { useWorldStore } from '../src/stores/world'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useLeaningStore } from '../src/stores/leanings'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

const SCENE = 'attempt:first'

/**
 * 摆一局：有书、有知识、没在修炼中，走进 why 入口。
 *
 * `leaning` 决定走哪一条动机分叉。
 * 结果档不从这里控制——见底下第三节：改从目标节点直接演。
 */
function stage(opts: { leaning?: 'heal' | 'strong' | 'rich' }): void {
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
    leanings.stir(opts.leaning, 18, { at: world2.time, text: '（门禁摆局）' }, world2.time)
  }
}

/**
 * 从指定节点演下去，回报走过的节点 id。
 */
function playFrom(
  from: string,
  pick: (options: string[]) => string = () => 'shelve',
  stopAfter = 20,
): string[] {
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
    stage({ leaning })
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
  stage({})
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
  stage({})
  const walked = play((options) => (options.includes('shelve') ? 'shelve' : options[0]!))

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
  stage({})
  const walked = play()
  if (walked.length < 3) {
    console.log(
      `  ✗ 尺子自检：只走了 ${walked.length} 节（${walked.join(' → ')}）——这一卷没有真被演过。`,
    )
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：走了 ${walked.length} 节（${walked.join(' → ')}）。`)
  }
}

/**
 * 效果层：**照着书练那一年，身上落下什么**。
 *
 * 上面那几条验的是「三档各自走得到」——**把 `applyEffects` 整个改成空转，
 * 它们纹丝不动**（2026-09-12 B 刀实测）。
 *
 * 这一卷两层效果，一层在选项上、一层在结果节点上：
 *
 *     read    见识 +5、心志 +4        照着念，念进去了
 *     copy    心志 +6、体魄 -2        照着描，熬了几个通宵
 *     flicker 落「觉出点什么」旗 + 一条知识
 *     hurt    体魄 -8                 练岔了
 *
 * ## 两条路的分别不在多少，在**换的是什么**
 *
 * `read` 换来的是见识，`copy` 换来的是心志而折了身子——
 * **同样坐一年，念的人和描的人，落下的不是同一样东西**。
 *
 * 判「两条各有各的」不判「read 正好 +5」；
 * `flicker` 那一档判「旗落下了」——**那面旗是这条修行线往后的全部入口**，
 * 不落它，后头几卷一个人也读不到。
 */
{
  interface Gained {
    insight: number
    will: number
    body: number
  }

  function gainedBy(pick: string, from = 'open'): Gained {
    stage({})
    /*
     * ⚠️ `read`（一个字一个字地认）要「念过书」——
     * 不设这面旗那条选项**不可选**，`pick` 落空，默认点了第一条。
     * 判据当场报「照着念那一条该长见识，实际 0」——**而他根本没在念**。
     *
     * 「摆局缺一格，判据问的是另一件事」，今天第三次同一形状
     * （`house` 的铺子、`dearth` 的念书、这一处）。
     */
    useWorldStore().setFlag('schooled', true)
    const character = useCharacterStore()
    const before = { ...character.attributes }
    playFrom(from, (opts) => (opts.includes(pick) ? pick : opts[0]!))
    return {
      // 记增量：每次摆局各起各的 pinia，属性起手是现掷的
      insight: character.attributes.insight - before.insight,
      will: character.attributes.will - before.will,
      body: character.attributes.body - before.body,
    }
  }

  const read = gainedBy('read')
  const copy = gainedBy('copy')

  // flicker / hurt 的效果在节点 onEnter 上，从那一节起演
  stage({})
  const world = useWorldStore()
  const character = useCharacterStore()
  playFrom('flicker')
  const felt = world.getFlag('felt-something') === true
  const knows = Object.keys(character.knowledge).length

  stage({})
  const hurtChar = useCharacterStore()
  const bodyBefore = hurtChar.attributes.body
  playFrom('hurt')
  const hurtBody = hurtChar.attributes.body - bodyBefore

  const wrong: string[] = []
  if (read.insight <= 0) wrong.push(`照着念那一条该长见识，实际 ${read.insight}`)
  if (copy.will <= 0) wrong.push(`照着描那一条该长心志，实际 ${copy.will}`)
  if (read.insight === copy.insight && read.will === copy.will) {
    wrong.push('念的和描的落下同样的东西——那一节的两条路没有分别')
  }
  if (!felt) {
    wrong.push('觉出了点什么，却没落下那面旗——后头几卷的入口就此关死')
  }
  if (knows === 0) wrong.push('觉出了点什么，却一条也没记住')
  if (hurtBody >= 0) wrong.push(`练岔了该伤身，体魄却是 ${hurtBody}`)

  if (wrong.length > 0) {
    console.log(`  ✗ first 效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ first 效果层：念的长见识 +${read.insight}、描的长心志 +${copy.will}；` +
        `觉出点什么落了旗记了 ${knows} 条；练岔了伤身 ${hurtBody}。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  坐了一年，有没有觉出什么不一样——三档各自有人走过了，身上也各落各的。\n')
}
