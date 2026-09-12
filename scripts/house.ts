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
import type { Choice, SceneNode, Tenure, OriginId } from '../src/types/game'
import { forkingOf } from './lib/forking'
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

/**
 * 效果层：**分出去那天，三种家当各折各的价**。
 *
 * 上面那几条问的是「落在哪一节」——**把 `applyEffects` 整个改成空转，
 * 它们纹丝不动**（2026-09-12 B 刀实测）。分流对了，而那一节落下的东西没人验。
 *
 * `house:divide` 那张分流表的三个落点各有各的代价：
 *
 *     fields  家底 -9              有田的分出去，田分薄了
 *     rented  家底 -6              租的地，分的是租约
 *     shop    家底 -12 + 盘掉铺子   铺子分不开，只能折价
 *
 * ## 判「三档各不相同」，不判「正好降了九」
 *
 * 数值是内容作者的，随时会调；**「三档不该降一样多」才是这一节的设计**
 * ——分田、分租约、盘铺子本来就是三件轻重不同的事。
 * 写死 -9 的话调一次数值判据就红，而那个数不是它的守备范围。
 *
 * ⚠️ 还要问一句**方向**：光问「三档不同」的话，
 * 三档都涨（而不是降）也能满足。
 */
{
  const SCENE = 'house:divide'

  /*
   * ⚠️ 从**分流那一节**演，不是从 `choose`。
   *
   * 头一版写的是 `playFrom(SCENE, 'choose')`，四条判据全报 0——
   * 那三个落点（`fields`/`rented`/`shop`）在分流表下游，
   * 而 `choose` 是另一条路，从那儿演一辈子也走不到。
   *
   * 节点名从 `forkingOf` 现取，不写死：内容改了节点名这里跟着改。
   */
  const forkNode = forkingOf(SCENE)?.node ?? 'open'

  /**
   * @param living 过哪一种日子（决定走分流表的哪一档）
   * @param origin 生在哪一行——**开铺子那一档要真有一间铺子**
   *
   * ⚠️ 头一版两档都用 `beOf('farm')`，于是「盘掉铺子」那一条恒不成立：
   * 农户人家 `business` 本来就是 `null`，效果把它设成 `null` 等于没变，
   * 判据报「分完之后这一家还开着同一间铺子」——**而它压根没有铺子**。
   *
   * 摆局摆不出那个前提，判据问的就是另一件事。
   */
  function costOf(living: string, origin: OriginId): { lost: number; trade: string | null } {
    stage()
    beOf(origin)
    useCharacterStore().liveAs(living)
    const household = useHouseholdStore()
    const before = { standing: household.standing, business: household.business }
    playFrom(SCENE, forkNode)
    return {
      // 记「变了多少」：每次摆局各起各的 pinia，家底起手是现掷的
      lost: household.standing - before.standing,
      trade: household.business === before.business ? null : (household.business ?? '（没了）'),
    }
  }

  const fields = costOf('farm', 'farm')
  const shop = costOf('shop', 'cloth')

  const wrong: string[] = []
  if (fields.lost >= 0) wrong.push(`分出去那天家底该往下走，有田的却是 ${fields.lost}`)
  if (shop.lost >= 0) wrong.push(`分出去那天家底该往下走，开铺子的却是 ${shop.lost}`)
  if (fields.lost === shop.lost) {
    wrong.push(
      `分田和盘铺子折的价一样（都是 ${fields.lost}）——那一节的三档落点没有分别，` +
        '效果一样也没落',
    )
  }
  if (shop.trade === null) {
    wrong.push('铺子分不开，只能折价盘掉——可分完之后这一家还开着同一间铺子')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ divide 效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ divide 效果层：有田的折 ${fields.lost}、开铺子的折 ${shop.lost}，` +
        `铺子那一档还盘掉了营生（${shop.trade}）。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  分家那几卷，各条路各自有人走过了，分出去那天也各折各的价。\n')
}
