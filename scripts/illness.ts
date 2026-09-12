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

function play(pick: (options: string[]) => string = (opts) => opts[0]!): string[] {
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
    const walked = play((opts) => (opts.includes(pick) ? pick : opts[0]!))
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
 *
 * ⚠️ 这一条**从结果节点直接开演**，绕过了上面 `watched` 那道分流——
 * 它问的是「这个节点有内容吗」，不是「病成那样的人去了那儿吗」。
 * 所以它验不了条件层，`meetsAll` 恒真也纹丝不动。真正的那一问在第三条。
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
 * 三、条件层：**掷出来是哪一档，人就去哪一节吗**。
 *
 * `watched` 那一节按 `illness-outcome` 分三档：
 *
 *     equals 'died'        → died
 *     equals 'lingering'   → lingering
 *     （都不成立）          → recovered     ← 兜底，没有 requires
 *
 * ## ⚠️ 这面旗不是外部输入，是这一节自己掷的
 *
 * 头一版我在 `stage()` 之后 `setFlag('illness-outcome', 'died')` 再从 `watched` 演，
 * 报「设了 died 却走到 lingering」「设了 lingering 却走到 recovered」——
 * **整体错位一档，看着像内容坏了**。
 *
 * 真因是 `watched` 的 `onEnter` 里有一条 `roll`（62/28/10），
 * **进这一节就重掷这面旗**，我预设的值当场被覆盖，
 * 我读到的是那一次重掷的结果。内容一个字没错，是判法错了。
 *
 * （「我改的不等于原因」那一族：报错的位置是分流，而坏的是我喂进去的输入。）
 *
 * ## 所以改成问「掷出来什么，就去了那一节吗」
 *
 * 掷很多次，每次记下**这一节掷出的值**和**实际走到的节点**，
 * 最后核对这张对应表。这比钉死一个值更强：它同时验了
 * 「三档都掷得到」和「每一档都去对了地方」。
 *
 * 分流表从内容现取，不在这儿抄第二份。
 */
{
  const scene = lifeScenes[SCENE]
  const watched = scene?.nodes['watched']

  /** 内容里那张「旗是什么值就去哪儿」的表 */
  const routes = new Map<string, string>()
  let flagKey: string | undefined
  for (const branch of watched?.branches ?? []) {
    const flag = branch.requires?.find((one) => one.flag !== undefined)?.flag
    if (flag?.equals === undefined || branch.next === undefined) continue
    flagKey = flag.key
    routes.set(String(flag.equals), branch.next)
  }
  const fallback = watched?.next

  if (routes.size < 2 || fallback === undefined || flagKey === undefined) {
    console.log(
      `  ✗ 尺子自检：从 ${SCENE}/watched 只取到 ${routes.size} 档分流` +
        `（兜底 ${fallback ?? '没有'}）——结构变了。`,
    )
    bad += 1
  } else {
    const ROLLS = 300
    const seen = new Map<string, number>()
    const wrong: string[] = []
    for (let n = 0; n < ROLLS; n += 1) {
      stage()
      const walked = playFrom('watched')
      // 这一节掷出来的那个值——不是我喂的，是它自己掷的
      const rolled = String(useWorldStore().getFlag(flagKey) ?? '(没掷)')
      seen.set(rolled, (seen.get(rolled) ?? 0) + 1)
      const want = routes.get(rolled) ?? fallback
      if (!walked.includes(want) && wrong.length < 5) {
        wrong.push(`掷出 ${rolled} 该去 ${want}，实际走过 ${walked.join('→')}`)
      }
    }

    const tally = [...seen.entries()].sort((a, b) => b[1] - a[1])
    console.log(
      `  ·  ${ROLLS} 次：` + tally.map(([v, n]) => `${v} ${n}`).join('，'),
    )

    // 三档都要掷得到——有一档一次没掷出来，那一节的判据这一轮什么也没量
    const missing = [...routes.keys(), '兜底'].filter((v) =>
      v === '兜底' ? !tally.some(([k]) => !routes.has(k)) : !seen.has(v),
    )
    if (missing.length > 0) {
      console.log(`  ✗ watched 分流：${ROLLS} 次里有几档一次也没掷出来（${missing.join('、')}）。`)
      bad += 1
    } else if (wrong.length > 0) {
      console.log(`  ✗ watched 分流：掷出来的值跟走到的节点对不上。`)
      for (const line of wrong) console.log(`      ${line}`)
      bad += wrong.length
    } else {
      console.log(`  ✓ watched 分流：${routes.size} 档加兜底，掷出什么就去了那一节。`)
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
