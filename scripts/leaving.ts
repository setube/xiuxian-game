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
import { usePeopleStore } from '../src/stores/people'
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

/**
 * 效果层：**离家那一趟，你认识了一个人**。
 *
 * 上面那几条验的是「各条路走得到」——**把 `applyEffects` 整个改成空转，
 * 它们纹丝不动**（2026-09-12 B 刀实测）。
 *
 * 这一卷落的东西里有一样别处很少见：`meet`——**它立一个真人进册**。
 *
 *     ask   问一句     旗「动了离家的念头」+ 见识 1 + 认识那位管事，交情 4
 *     work  替他干活   同一面旗 + 家底 2 + 体魄 1 + 同一个人，交情 8
 *     go    跟商队走   旗「跟商队走了」+ 见识 5、体魄 4、心志 3 + 一条认知
 *     stay  没去       旗「回绝了商队」
 *
 * ## 同一个人，两种认识法，交情深浅不同
 *
 * 沈管事这个人两条路都碰得到，而**问一句是 4 分，替他干了一天活是 8 分**。
 * 这一格是他后半辈子关系网的起点：认识了，后头才有人可找。
 *
 * 判「替他干活比问一句认得更深」不判「正好 8」。
 *
 * ## 两面旗是相反的，各标一个未来
 *
 * `went-with-caravan` 和 `turned-down-caravan`——去了和没去，
 * 后头读的是不同的那一面。
 */
{
  interface Went {
    towardLeaving: boolean
    withCaravan: boolean
    turnedDown: boolean
    regard: number
    metBoss: boolean
    insight: number
    body: number
    standing: number
  }

  const missed: string[] = []

  function wentBy(scene: string, pick: string): Went {
    stage(18)
    const character = useCharacterStore()
    const household = useHouseholdStore()
    const people = usePeopleStore()
    const world = useWorldStore()
    const before = {
      insight: character.attributes.insight,
      body: character.attributes.body,
      standing: household.standing,
    }
    /*
     * 落空要整趟看，不能逐节点看：`pick` 在每一节都被问一次，
     * 而下游那些节点本来就没有我要的那条。
     */
    let hit = false
    play(scene, (opts) => {
      if (opts.includes(pick)) {
        hit = true
        return pick
      }
      return opts[0]!
    })
    if (!hit) missed.push(pick)
    return {
      towardLeaving: world.getFlag('toward-leaving') === true,
      withCaravan: world.getFlag('went-with-caravan') === true,
      turnedDown: world.getFlag('turned-down-caravan') === true,
      regard: people.known['caravan-boss']?.affinity ?? 0,
      metBoss: people.personOf('caravan-boss') !== undefined,
      // 记增量：每次摆局各起各的 pinia，属性和家底起手都是现掷的
      insight: character.attributes.insight - before.insight,
      body: character.attributes.body - before.body,
      standing: household.standing - before.standing,
    }
  }

  const asked = wentBy('leave:hiring', 'ask')
  const worked = wentBy('leave:hiring', 'work')
  const went = wentBy('leave:caravan', 'go')
  const stayed = wentBy('leave:caravan', 'stay')

  const wrong: string[] = []
  for (const one of missed) wrong.push(`摆局没摆出「${one}」这一条——底下那几句问的是别条路的账`)

  if (!asked.metBoss) wrong.push('去问了一句，那位管事却没进人口册——他后半辈子少认识一个人')
  if (!worked.metBoss) wrong.push('替他干了一天活，那位管事却没进人口册')
  if (worked.regard <= asked.regard) {
    wrong.push(
      `替他干活该比问一句认得更深（问一句 ${asked.regard}、干了活 ${worked.regard}）——那一天白干了`,
    )
  }
  if (!asked.towardLeaving) wrong.push('问了雇工的事，却没落「动了离家的念头」那面旗')
  if (worked.standing <= 0) wrong.push(`替人干了一天活该有工钱，家底却是 ${worked.standing}`)
  if (!went.withCaravan) wrong.push('跟商队走了，却没落那面旗——后头没人知道他出过门')
  if (!stayed.turnedDown) wrong.push('没跟商队走，却没落「回绝了」那面旗')
  if (went.turnedDown) wrong.push('跟着走了，却记成「回绝了」')
  if (went.insight <= 0) wrong.push(`跟商队跑一趟该长见识，实际 ${went.insight}`)

  if (wrong.length > 0) {
    console.log(`  ✗ 离家效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ 离家效果层：问一句认得 ${asked.regard} 分、替他干活认得 ${worked.regard} 分；` +
        `跟商队走 +${went.insight} 见识并落了旗，没走的落「回绝了」——各标一个未来。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  离家那几卷，各条路各自有人走过了。\n')
}
