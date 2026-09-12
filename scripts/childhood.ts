/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 孩童时代——五卷各自走得到吗。
 *
 * `childhood.ts` 里五个场景，都是记事前后那几年：
 *
 *   child:memory   记事了（家里的营生决定了孩子头一眼看到的世界）
 *   child:sick     一场病
 *   child:sibling  添丁（弟弟或妹妹出生）
 *   child:hungry   灶（饿了）
 *   child:harvest  好年景
 *
 * 核心判据：
 * 一、child:memory 按营生走到不同节点（farm/shop/hunt/craft 等）
 * 二、child:sibling sibling 分叉可达
 * 三、child:hungry ask/quiet 两条路各自可达
 * 四、五卷各自都走进去了（尺子自检）
 *
 * 跑法：bun scripts/childhood.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { Choice, OriginId, SceneNode } from '../src/types/game'
import { beOf } from './origin'

/**
 * ⚠️ `origin` 收 `OriginId` 不收 `string`。
 *
 * 从前是 `origin: string` 加一句 `beOf(origin as 'farm')`——那个 `as` 把
 * 类型层的活儿关掉了：出身表里删掉一行、或者这儿打错一个字母，
 * `beOf` 拿不到就落回兜底，**五卷全在同一个出身上跑而门禁照样全绿**
 * （`trades.ts` 的 `'merchant'` 正是这么错了十二处，`87a28f6` 才修）。
 */
function stage(origin: OriginId = 'farm', age = 6): void {
  setActivePinia(createPinia())
  beOf(origin)
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

function play(scene: string, pick: (options: string[]) => string = (opts) => opts[0]!): string[] {
  return playFrom(scene, lifeScenes[scene]?.entry ?? 'open', pick)
}

console.log('\n=== 孩童时代——五卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、child:memory（记事了）——**每种出身各自去了对的地方吗**。
 *
 * ## 这一条从前只摆一种出身，而那等于没验
 *
 * 旧版只摆 `farm`，断言「走到了 farm」。`open` 那一节有十二条 `branches`
 * 按出身分流，而**农户那一条恰好排在最前面**——把条件层整个废掉
 * （`meetsAll` 恒真），`branches` 取第一条成立的，照样走到 farm，判据不红。
 *
 * 「走得到吗」和「不同情形去不同地方」是两种判据。前一种的目的地写死在内容里，
 * 条件层废不废它都走到那儿。**这一支要问的是后一种。**
 *
 * ## 分流表从内容现取，不在这儿抄第二份
 *
 * 抄一份的话，内容里加一种出身而这儿忘了加，**那一条新分流永远没人验**——
 * 而门禁照样全绿（`ruler-standard-must-come-from-system` 那条）。
 * 现取还有一个好处：内容里改了目的地，这儿当场跟着改。
 */
{
  const SCENE = 'child:memory'
  const scene = lifeScenes[SCENE]
  const open = scene?.nodes[scene.entry ?? 'open']

  /** 内容里那张「哪种出身去哪一节」的表 */
  const routes: Array<{ origin: OriginId; to: string }> = []
  for (const branch of open?.branches ?? []) {
    const origin = branch.requires?.find((one) => one.origin !== undefined)?.origin
    if (origin === undefined || branch.next === undefined) continue
    routes.push({ origin, to: branch.next })
  }

  /*
   * ⚠️ 判「落在哪」，不判「路过没路过」。
   *
   * 分流的几个目标常常串在同一条路径上，`includes` 会让错的答案蒙混过关
   * ——`regard` 那支 A 刀实测只红一条，头一档和末一档都逃掉了
   * （2026-09-12，改问第一个落点之后红从 1 变 2）。
   */
  const targets = [...routes.map((one) => one.to), ...(open?.next !== undefined ? [open.next] : [])]
  const landedOn = (walked: readonly string[]): string | undefined =>
    walked.find((one) => targets.includes(one))

  if (routes.length < 2) {
    // 尺子自检：取不到分流表，底下那一圈就什么也没验，而它会安静地全绿
    console.log(`  ✗ 尺子自检：从 ${SCENE} 只取到 ${routes.length} 条分流——结构变了。`)
    bad += 1
  } else {
    const wrong: string[] = []
    for (const { origin, to } of routes) {
      stage(origin)
      const walked = play(SCENE)
      const landed = landedOn(walked)
      if (landed !== to) {
        wrong.push(`${origin} 该落在 ${to}，实际落在 ${landed ?? '哪儿也没落'}`)
      }
    }
    if (wrong.length > 0) {
      console.log(`  ✗ memory 分流：${routes.length} 种出身里有 ${wrong.length} 种去错了地方。`)
      for (const line of wrong) console.log(`      ${line}`)
      bad += wrong.length
    } else {
      console.log(`  ✓ memory 分流：${routes.length} 种出身各自去了对的那一节。`)
    }

    /*
     * 兜底那一条也要验：`next: 'craft'`——**十二条分流一条都不成立时去哪儿**。
     * 它没有 `requires`，所以上面那一圈碰不到它，而它恰恰是最容易死的一条
     * （十二条里加了第十三种出身，兜底就再也轮不到）。
     */
    const listed = new Set(routes.map((one) => one.origin))
    const spare = (['craft', 'farm', 'tenant', 'hunt'] as const).find((one) => !listed.has(one))
    if (spare === undefined) {
      console.log('  ·  memory 兜底：每种出身都有专门的分流，兜底那一条已经没人走得到了。')
    } else {
      stage(spare)
      const walked = play(SCENE)
      const fallback = open?.next
      const landed = landedOn(walked)
      if (fallback !== undefined && landed !== fallback) {
        console.log(
          `  ✗ memory 兜底：${spare} 出身没有专门分流，该落到 ${fallback}，` +
            `实际走过 ${walked.join('→')}。`,
        )
        bad += 1
      } else {
        console.log(`  ✓ memory 兜底：${spare} 出身落到了 ${fallback}。`)
      }
    }
  }

  // close 节点也要走到
  stage('farm')
  const farmWalked = play(SCENE)
  if (!farmWalked.includes('close')) {
    console.log(`  ✗ memory → close：没走到（走过 ${farmWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ memory → close：走到了。')
  }
}

/**
 * 二、child:sick（一场病）。
 */
{
  stage()
  const walked = play('child:sick')
  if (walked.length === 0) {
    console.log('  ✗ sick：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ sick：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 三、child:sibling（添丁）。
 *
 * open 里有 sibling 分叉（弟弟或妹妹出生）。
 */
{
  const SCENE = 'child:sibling'

  stage()
  const walked = play(SCENE)
  if (walked.length === 0) {
    console.log('  ✗ sibling：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ sibling：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 四、child:hungry（灶，饿了）。
 *
 * ask（去问）→ asked，quiet（不说话）→ quiet。
 */
{
  const SCENE = 'child:hungry'

  stage()
  const askWalked = play(SCENE, (opts) => (opts.includes('ask') ? 'ask' : opts[0]!))
  if (!askWalked.includes('asked')) {
    console.log(`  ✗ hungry ask → asked：没走到（走过 ${askWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ hungry ask → asked：走到了。')
  }

  stage()
  const quietWalked = play(SCENE, (opts) => (opts.includes('quiet') ? 'quiet' : opts[0]!))
  if (!quietWalked.includes('quiet')) {
    console.log(`  ✗ hungry quiet → quiet：没走到（走过 ${quietWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ hungry quiet → quiet：走到了。')
  }
}

/**
 * 五、child:harvest（好年景）。
 */
{
  stage()
  const walked = play('child:harvest')
  if (walked.length === 0) {
    console.log('  ✗ harvest：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ harvest：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 六、尺子自检：五卷各自都走进去了。
 */
{
  const scenes = [
    'child:memory',
    'child:sick',
    'child:sibling',
    'child:hungry',
    'child:harvest',
  ] as const
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
  if (allIn) console.log('  ✓ 尺子自检：五卷各自都走进去了。')
}

/**
 * 效果层：**头一眼看见的世界不一样，学到的东西也不一样**。
 *
 * 上面那条十二档分流验的是「落在哪一节」——**把 `applyEffects` 整个改成空转，
 * 它纹丝不动**（2026-09-12 B 刀实测）。落到了那一节，而那一节落下什么没人验。
 *
 * `child:memory` 各出身分档上落的东西各不相同：
 *
 *     shop / inn   知识「很远的地方」   布庄和客栈都见往来客商
 *     tavern       知识「城里的闲话」   酒楼里听的是另一路话
 *     herbs        知识 + 见识 +2       药铺的孩子还多认得几样东西
 *     escort       心志 +2              走镖人家的孩子，胆子是练出来的
 *     farm         （一条也没有）        地里长大的孩子，眼界就在这几亩地上
 *
 * **这一节的分量全在这儿**：出身不是属性面板上的一栏，
 * 是**他头一眼看见的世界有多大**。
 *
 * ## 判「有的学到、有的学不到」，不判「shop 学的是 far-places」
 *
 * 写死哪一档配哪一条知识，内容调一次判据就红；
 * **「种地的孩子学不到开铺子的孩子学到的那些」才是设计**。
 * 效果空转时所有出身都学不到东西，这一条当场塌。
 */
{
  const SCENE = 'child:memory'
  const scene = lifeScenes[SCENE]
  const fork = scene?.nodes[scene.entry ?? 'open']

  interface Gained {
    knows: number
    insight: number
    will: number
  }

  function gainedBy(origin: OriginId): Gained {
    stage(origin)
    const character = useCharacterStore()
    const before = {
      insight: character.attributes.insight,
      will: character.attributes.will,
    }
    playFrom(SCENE, scene?.entry ?? 'open')
    return {
      knows: Object.keys(character.knowledge).length,
      // 记增量：每次摆局各起各的 pinia，属性起手是现掷的
      insight: character.attributes.insight - before.insight,
      will: character.attributes.will - before.will,
    }
  }

  const shop = gainedBy('cloth')
  const herbs = gainedBy('herb')
  const escort = gainedBy('escort')
  const farm = gainedBy('farm')

  const wrong: string[] = []
  if (shop.knows === 0) wrong.push('布庄人家的孩子见往来客商，却一样东西也没记住')
  if (shop.knows <= farm.knows) {
    wrong.push(
      `开铺子的孩子该比地里长大的多知道些：布庄 ${shop.knows} 条、农家 ${farm.knows} 条` +
        '——出身没在这一节上留下分别',
    )
  }
  if (herbs.insight <= 0) wrong.push(`药铺的孩子该多认得几样东西，见识却是 ${herbs.insight}`)
  if (escort.will <= 0) wrong.push(`走镖人家的孩子胆子是练出来的，心志却是 ${escort.will}`)
  if (fork === undefined) {
    console.log(`  ✗ 尺子自检：${SCENE} 取不到入口那一节——结构变了。`)
    bad += 1
  }

  if (wrong.length > 0) {
    console.log(`  ✗ memory 效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ memory 效果层：布庄记住 ${shop.knows} 条、农家 ${farm.knows} 条；` +
        `药铺见识 +${herbs.insight}、走镖心志 +${escort.will}。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  孩童时代那几年，各条路各自有人走过了，各家的孩子也各有各的眼界。\n')
}
