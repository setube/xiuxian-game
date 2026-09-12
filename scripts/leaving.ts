/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 离家——三卷各自走得到吗。
 *
 * `leaving.ts` 里三个场景：
 *
 *   leave:hiring    被雇到货栈去（ask/work/pass 三条路）
 *   leave:caravan   跟镖局的人走（go/stay 两条路）
 *   leave:the-road  已经在路上了
 *
 * 核心判据：
 * 一、leave:hiring 三条路（asked/worked/passed）各自走得到
 * 二、leave:caravan go → went / stay → stayed 各自走得到
 * 三、leave:the-road 走得进去
 * 四、**条件层**：王府里的孩子去不了货栈做短工；两条入场旗各自摆两次局　← A 刀要红的
 * 五、三卷各自都走进去了（尺子自检）
 *
 * ⚠️ 一到三那几条问的是「走得到吗」，**把 `meetsAll` 整个改成恒真它们纹丝不动**。
 * 第四条是 2026-09-12 补的，补的正是那一层。
 *
 * 跑法：bun scripts/leaving.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

function stage(age = 18): void {
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

console.log('\n=== 离家——三卷各自走得到吗 ===\n')

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
 * 一、leave:hiring（被雇到货栈去）。
 *
 * 三条路：ask（去问）→ asked，work（去做）→ worked，pass（不去）→ passed（兜底）。
 */
{
  const SCENE = 'leave:hiring'

  stage()
  const askedWalked = play(SCENE, (opts) => (opts.includes('ask') ? 'ask' : opts[0]!))
  check('hiring ask → asked', askedWalked, 'asked')

  stage()
  const workedWalked = play(SCENE, (opts) => (opts.includes('work') ? 'work' : opts[0]!))
  check('hiring work → worked', workedWalked, 'worked')

  stage()
  const passedWalked = play(SCENE, (opts) => (opts.includes('pass') ? 'pass' : opts[0]!))
  // pass 是「不去」——没有专门的 passed 节点，直接结束
  if (passedWalked.length === 0) {
    console.log('  ✗ hiring pass：走了零步——节点有问题。')
    bad += 1
  } else {
    console.log(`  ✓ hiring pass（不去）：走到了 ${passedWalked[passedWalked.length - 1]}。`)
  }
}

/**
 * 二、leave:caravan（跟镖局的人走）。
 *
 * 两条路：go（跟着走）→ went，stay（留下来）→ stayed。
 */
{
  const SCENE = 'leave:caravan'

  stage()
  const wentWalked = play(SCENE, (opts) => (opts.includes('go') ? 'go' : opts[0]!))
  check('caravan go → went', wentWalked, 'went')

  stage()
  const stayedWalked = play(SCENE, (opts) => (opts.includes('stay') ? 'stay' : opts[0]!))
  check('caravan stay → stayed', stayedWalked, 'stayed')
}

/**
 * 三、leave:the-road（已经在路上了）。
 */
{
  stage()
  const walked = play('leave:the-road')
  if (walked.length === 0) {
    console.log('  ✗ the-road：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ the-road：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 四、条件层：**该被挡住的挡住了吗，没资格的进不进得来**。
 *
 * ## 上面那三条一条也没碰到条件层
 *
 * 它们问的是「选了这个选项，走到那个节点了吗」——而 `next` 写死在内容里，
 * **把 `meetsAll` 整个改成恒真，它们纹丝不动**（2026-09-12 打断实测）。
 * 那不是坏了，是**只守了骨架**。
 *
 * 这一卷真正的条件层有三处，从前一处也没人验：
 *
 *     leave:hiring 的 work 选项   living notIn palace/manor/up-there
 *                                 ——「在货栈做短工」不是王府世子做得出的事
 *     leave-caravan 入场          flag toward-leaving
 *     leave-the-road 入场         flag saw-the-road
 *
 * ## 判法：同一个前提摆两次局
 *
 * 只摆「成立」那一次等于没验——兜底本来就在，条件整个失效也走得到。
 * **两边都摆，才分得出「条件在起作用」和「条件根本没被读」。**
 */
{
  /** 那条选项的条件从内容现取，不在这儿抄第二份 */
  const hiring = lifeScenes['leave:hiring']
  const workChoice = Object.values(hiring?.nodes ?? {})
    .flatMap((node) => node.choices ?? [])
    .find((one) => (one.requires ?? []).some((c) => c.living !== undefined))

  if (workChoice === undefined) {
    console.log('  ✗ 尺子自检：leave:hiring 里找不到那条带 living 条件的选项——结构变了。')
    bad += 1
  } else {
    // 农家子：这条路对他开着
    stage()
    const openToFarmer = meetsAll(workChoice.requires)
    /*
     * 王府里的孩子：同一条路该关着。只改这一处，别处一个字不动。
     *
     * ⚠️ 走 `character.liveAs` 这个正经入口，不去 `$patch` store 内部——
     * `living` 是一条三级解析链上的 computed（`character.ts:359`），
     * 手改任何一级都可能摆出一个真实人生里不存在的局
     * （`household` 上根本没有 `living` 这一格，我头一版写的 `$patch` 类型层当场拦下）。
     */
    stage()
    useCharacterStore().liveAs('manor')
    const openToManor = meetsAll(workChoice.requires)

    if (!openToFarmer) {
      console.log(`  ✗ hiring「${workChoice.id}」：农家子也走不了这条路——条件写得太紧。`)
      bad += 1
    } else if (openToManor) {
      console.log(
        `  ✗ hiring「${workChoice.id}」：王府里的孩子照样去货栈做短工——那条 living 没在管事。`,
      )
      bad += 1
    } else {
      console.log(`  ✓ hiring「${workChoice.id}」：农家子走得了，王府里的孩子走不了。`)
    }
  }

  /*
   * 两条入场旗。同一个前提摆两次：没打过那面旗的进不去，打过的进得去。
   *
   * ⚠️ 旗名从 `lifeEvents` 现取。手抄一个字母，那一条会安静地
   * 永不成立，而判据看起来正在工作（`ruler-standard-must-come-from-system`）。
   */
  const gated: Array<{ event: string; scene: string }> = [
    { event: 'leave-caravan', scene: 'leave:caravan' },
    { event: 'leave-the-road', scene: 'leave:the-road' },
  ]
  for (const { event, scene } of gated) {
    const found = lifeEvents.find((one) => one.id === event)
    const key = found?.requires?.find((c) => c.flag !== undefined)?.flag?.key
    if (found === undefined || key === undefined) {
      console.log(`  ✗ 尺子自检：${event} 取不到那面入场旗——id 打错或条件改了。`)
      bad += 1
      continue
    }

    stage()
    const beforeFlag = meetsAll(found.requires)
    stage()
    useWorldStore().setFlag(key, true)
    const afterFlag = meetsAll(found.requires)

    if (beforeFlag) {
      console.log(`  ✗ ${event} 入场：没打过「${key}」也进得去——那条入场条件没在管事。`)
      bad += 1
    } else if (!afterFlag) {
      console.log(`  ✗ ${event} 入场：打了「${key}」却还是进不去——这一卷在真世里演不到。`)
      bad += 1
    } else {
      console.log(`  ✓ ${event} 入场：没「${key}」进不去，有了才进得去。`)
    }
    void scene
  }
}

/**
 * 五、尺子自检：三卷各自都走进去了。
 */
{
  const scenes = ['leave:hiring', 'leave:caravan', 'leave:the-road'] as const
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
  console.log('  离家那几卷，各条路各自有人走过了。\n')
}
