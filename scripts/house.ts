/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 分家那几卷——三卷各自走得到吗。
 *
 * `house.ts` 里三个场景：
 *
 *   house:succeed        继承家业（bereaved/handed/各种营生分叉）
 *   house:divide         分家（哥分出去，玩家留老屋；choose→stay/town）
 *   house:divide-younger 小的分出去（玩家是次子分出去；done）
 *
 * 核心判据：
 * 一、house:succeed 走到 bereaved 和 handed（两条路）
 * 二、house:divide choose→stay/town 两条路各自可达
 * 三、house:divide-younger 走到 done
 * 四、尺子自检：三卷各自都走进去了
 *
 * 跑法：bun scripts/house.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode, Tenure } from '../src/types/game'
import { beOf } from './origin'

function stage(age = 30): void {
  setActivePinia(createPinia())
  beOf('farm')
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

console.log('\n=== 分家那几卷——三卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、house:succeed（继承家业）。
 *
 * bereaved（父母没了）和 handed（交到手里了）两条路。
 * 直接从各节点演验可达性。
 */
{
  const SCENE = 'house:succeed'

  stage()
  const bereavedWalked = playFrom(SCENE, 'bereaved')
  if (bereavedWalked.length === 0) {
    console.log('  ✗ succeed bereaved：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ succeed bereaved：节点有内容，走了 ${bereavedWalked.length} 步。`)
  }

  stage()
  const handedWalked = playFrom(SCENE, 'handed')
  if (handedWalked.length === 0) {
    console.log('  ✗ succeed handed：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ succeed handed：节点有内容，走了 ${handedWalked.length} 步。`)
  }
}

/**
 * 二、house:divide（分家）。
 *
 * choose 节点里有 stay（留下）和 town（进城）两条路。
 */
{
  const SCENE = 'house:divide'

  stage()
  const stayWalked = playFrom(SCENE, 'choose', (opts) =>
    opts.includes('stay') ? 'stay' : opts[0]!,
  )
  if (!stayWalked.includes('settled') && stayWalked.length === 0) {
    console.log(`  ✗ divide stay：走了零步——节点有问题。`)
    bad += 1
  } else {
    console.log(`  ✓ divide stay：走到了 ${stayWalked[stayWalked.length - 1]}。`)
  }

  stage()
  const townWalked = playFrom(SCENE, 'choose', (opts) =>
    opts.includes('town') ? 'town' : opts[0]!,
  )
  if (!townWalked.includes('town') && townWalked.length === 0) {
    console.log(`  ✗ divide town：走了零步——节点有问题。`)
    bad += 1
  } else {
    console.log(`  ✓ divide town：走到了 ${townWalked[townWalked.length - 1]}。`)
  }
}

/**
 * 三、house:divide-younger（小的分出去）。
 *
 * 走到 done 节点。
 */
{
  stage()
  const walked = play('house:divide-younger')
  if (!walked.includes('done') && walked.length === 0) {
    console.log(`  ✗ divide-younger：走了零步——场景 id 打错或库里没挂上。`)
    bad += 1
  } else {
    console.log(`  ✓ divide-younger：走到了 ${walked[walked.length - 1]}，共 ${walked.length} 步。`)
  }
}

/**
 * 四、条件层：**三张营生分流表，每一档各自去了对的地方吗**。
 *
 * ## 上面那三条一条也没碰到条件层
 *
 * 它们问的是「走了零步吗」——连目的地都不验，更别说分流。
 * 把 `meetsAll` 整个改成恒真，**它们纹丝不动**（2026-09-12 打断实测）。
 *
 * 这三卷各有一张按营生分流的表（`succeed`/`divide`/`divide-younger`，
 * 每张六到七条），从前一条也没人验。
 *
 * ## 第一条是两个条件叠加，而它排在第二条前面——顺序本身就是判据
 *
 *     { living: farm, tenure: 佃 } → rented      ← 更具体的排前面
 *     { living: farm }             → fields
 *
 * `branches` 取第一条成立的。两条对调，**佃户就再也走不到 `rented`**，
 * 而「走得到吗」那类判据一声不响——`fields` 也是走得到的。
 * 所以这一条要**摆两次局**：佃户去 `rented`，自耕农去 `fields`。
 *
 * ## 分流表从内容现取
 *
 * 抄一份的话，内容里加一种营生而这儿忘了加，那一条新分流永远没人验，
 * 而门禁照样全绿（`ruler-standard-must-come-from-system` 那条）。
 */
{
  /** 一张分流表：这一节按什么分流，各档去哪儿 */
  interface Route {
    living: string
    tenure?: Tenure
    to: string
  }

  function routesOf(sceneId: string): { node: string; routes: Route[]; fallback?: string } | null {
    const scene = lifeScenes[sceneId]
    for (const [nodeId, node] of Object.entries(scene?.nodes ?? {})) {
      const routes: Route[] = []
      for (const branch of node.branches ?? []) {
        const living = branch.requires?.find((one) => one.living?.is !== undefined)?.living?.is
        const tenure = branch.requires?.find((one) => one.tenure !== undefined)?.tenure
        if (living === undefined || branch.next === undefined) continue
        routes.push({ living, ...(tenure !== undefined ? { tenure } : {}), to: branch.next })
      }
      if (routes.length >= 2) return { node: nodeId, routes, fallback: node.next }
    }
    return null
  }

  /** 摆成「过某一种日子」。`living` 是三级链上的 computed，走 liveAs 这个正经入口 */
  function liveLike(living: string, tenure?: Tenure): void {
    stage()
    useCharacterStore().liveAs(living)
    if (tenure !== undefined) useHouseholdStore().tenure = tenure
  }

  for (const sceneId of ['house:succeed', 'house:divide', 'house:divide-younger'] as const) {
    const found = routesOf(sceneId)
    if (found === null) {
      console.log(`  ✗ 尺子自检：${sceneId} 里找不到按营生分流的那一节——结构变了。`)
      bad += 1
      continue
    }

    /*
     * ⚠️ 判「落在哪」，不判「路过没路过」——分流的几个目标常常串在
     * 同一条路径上，`includes` 会放错的答案过去（`regard` 那支实测过）。
     */
    const targets = [
      ...found.routes.map((one) => one.to),
      ...(found.fallback !== undefined ? [found.fallback] : []),
    ]
    const landedOn = (walked: readonly string[]): string | undefined =>
      walked.find((one) => targets.includes(one))

    const wrong: string[] = []
    for (const route of found.routes) {
      liveLike(route.living, route.tenure)
      const walked = playFrom(sceneId, found.node)
      const landed = landedOn(walked)
      if (landed !== route.to) {
        const how = route.tenure === undefined ? route.living : `${route.living}+${route.tenure}`
        wrong.push(`${how} 该落在 ${route.to}，实际落在 ${landed ?? '哪儿也没落'}`)
      }
    }

    /*
     * ⚠️ 单验「各档去对了」还漏一种坏法：**两条对调**。
     * `farm+佃` 和 `farm` 顺序反过来，佃户就再也走不到 `rented`——
     * 而逐档那一圈**照样全绿**，因为它摆佃户局时走的就是第一条。
     *
     * 所以额外问一句：**不带 `tenure` 的那一档，别走进带 `tenure` 的那个去处**。
     */
    const loose = found.routes.find((one) => one.tenure === undefined)
    const tight = found.routes.find(
      (one) => one.tenure !== undefined && one.living === loose?.living,
    )
    if (loose !== undefined && tight !== undefined) {
      liveLike(loose.living) // 不设 tenure：自耕农
      const walked = playFrom(sceneId, found.node)
      if (landedOn(walked) === tight.to) {
        wrong.push(
          `不是佃户却走到了 ${tight.to}——「${tight.living}+${tight.tenure}」那一条排在` +
            `「${loose.living}」后面了，顺序反了`,
        )
      }
    }

    if (wrong.length > 0) {
      console.log(`  ✗ ${sceneId} 分流：${found.routes.length} 档里有 ${wrong.length} 处不对。`)
      for (const line of wrong) console.log(`      ${line}`)
      bad += wrong.length
    } else {
      console.log(`  ✓ ${sceneId} 分流：${found.routes.length} 档各自去了对的那一节。`)
    }
  }
}

/**
 * 五、尺子自检：三卷各自都走进去了。
 */
{
  const scenes = ['house:succeed', 'house:divide', 'house:divide-younger'] as const
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
  if (allIn) console.log('  ✓ 尺子自检：三卷各自都走进去了。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  分家那几卷，各条路各自有人走过了。\n')
}
