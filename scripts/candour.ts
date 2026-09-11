/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 说不是实话，还是说实话——那几节都走得到吗。
 *
 * `candour.ts` 是这个项目里第一个真正落地「习惯形成」的内容卷：
 * 撒一次谎是一次选择，撒了四次以后就是另一个人了——
 * 而那个人**不会觉得自己变了**。这正是 7.md 要证明的那件事。
 *
 * 它也是 `DeedKind` 最早的两个使用者（`lie` / `truth`），
 * 所以门禁要守两件事：
 *
 * 一、**三个场景里「说不是实话」和「说实话」的路都走得到。**
 * 二、**「worn」那一节——第四次之后——走得到，且门槛是真的。**
 *     少于四次走不进去，正好四次走得进去。
 *
 * 跑法：bun scripts/candour.ts
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

const SCENE = 'candour:small'

function stage(): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: 20 })
}

function play(
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 20,
  from?: string,
): string[] {
  const scene = lifeScenes[SCENE]
  if (!scene) return []
  const walked: string[] = []
  let at: string | undefined = from ?? scene.entry

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

/** 制造 n 次 lie deed，不经过场景本身，直接用 applyEffects */
function plantLies(n: number): void {
  for (let i = 0; i < n; i++) {
    applyEffects([{ type: 'deed', kind: 'lie', text: `（门禁摆局）第 ${i + 1} 次。` }])
  }
}

console.log('\n=== 说不是实话——那几节都走得到吗 ===\n')

let bad = 0

/**
 * 一、三个场景各走一遍撒谎路。
 *
 * 入口是 `open`，场景随机进入 money/where/blame 之一——实际上
 * candour:small 的入口是 open，open 里的 branches 决定走哪个场景，
 * 直接从各场景节点开始演更稳定。
 */
{
  const lieScenes: Array<{ node: string; label: string }> = [
    { node: 'money', label: '问钱那一场（money）' },
    { node: 'where', label: '问去哪了（where）' },
    { node: 'blame', label: '问谁的错（blame）' },
  ]

  for (const { node, label } of lieScenes) {
    stage()
    const walked = play((opts) => opts.includes('lie') ? 'lie' : opts[0]!, 10, node)
    if (!walked.includes('lie') && !walked.includes('after-lie')) {
      console.log(`  ✗ ${label} 撒谎路：没走到（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ ${label} 撒谎路：走到了。`)
    }
  }
}

/**
 * 二、三个场景各走一遍说实话路。
 */
{
  const truthScenes: Array<{ node: string; label: string }> = [
    { node: 'money', label: '问钱那一场（money）' },
    { node: 'where', label: '问去哪了（where）' },
    { node: 'blame', label: '问谁的错（blame）' },
  ]

  for (const { node, label } of truthScenes) {
    stage()
    const walked = play((opts) => opts.includes('truth') ? 'truth' : opts[0]!, 10, node)
    if (!walked.includes('truth') && !walked.includes('after-truth')) {
      console.log(`  ✗ ${label} 说实话路：没走到（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ ${label} 说实话路：走到了。`)
    }
  }
}

/**
 * 三、worn（习惯形成）那一节——第四次之后才走得到。
 *
 * WORN 常量是 `{ deeds: { kind: 'lie', atLeast: 4 } }`。
 * 验两件事：
 *   a. 三次谎走不到 worn（从 after-lie 直接演，不再落新 lie deed）
 *   b. 四次谎走得到 worn（同上）
 *
 * 注意：从 money/where/blame 节点演时，lie 选项本身会落一次 deed，
 * 所以 plantLies(3) + 走一次 lie 选项 = 4 次，worn 就触发了——这是正确行为。
 * 门禁里用 plantLies + 直接从 after-lie 演，才能单独测「n 次已有 deed 的条件」。
 */
{
  // a. 三次谎：worn 不该出现（直接从 after-lie 演，没有新的 lie deed 落入）
  stage()
  plantLies(3)
  const walkedThree = play((opts) => opts[0]!, 5, 'after-lie')
  if (walkedThree.includes('worn')) {
    console.log('  ✗ worn 门槛：三次谎直接到 after-lie 就走到了 worn——门槛没有守住。')
    bad += 1
  } else {
    console.log('  ✓ worn 门槛（三次谎走不到）：门槛成立。')
  }

  // b. 四次谎：worn 应该出现
  stage()
  plantLies(4)
  const walkedFour = play((opts) => opts[0]!, 5, 'after-lie')
  if (!walkedFour.includes('worn')) {
    console.log(`  ✗ worn 节点：四次谎但没走到 worn（走过 ${walkedFour.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ worn 节点（四次谎走到了）：习惯形成那一节有人走过了。')
  }
}

/**
 * 四、fresh（第一次撒谎那一节）。
 *
 * 没有任何先前 lie deed 时，after-lie 里走的是 fresh（新鲜的愧疚）。
 */
{
  stage()
  // 没有先前谎话，直接从 after-lie 演
  const walked = play((opts) => opts[0]!, 10, 'after-lie')
  if (!walked.includes('fresh')) {
    console.log(`  ✗ fresh 节点：没有先前谎话却没走到 fresh（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ fresh 节点（第一次愧疚）：走到了。')
  }
}

/**
 * 五、after-truth 节点。
 */
{
  stage()
  const walked = play((opts) => opts[0]!, 10, 'after-truth')
  if (walked.length === 0) {
    console.log('  ✗ after-truth：走了零步——节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ after-truth（说了实话之后）：走到了，走了 ${walked.length} 步。`)
  }
}

/**
 * 六、尺子自检：场景 id 打对了，play() 真的走进去了。
 */
{
  stage()
  const walked = play()
  if (walked.length < 2) {
    console.log(`  ✗ 尺子自检：只走了 ${walked.length} 节——这一卷没有真被演过。`)
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
  console.log('  说不是实话，说实话，和习惯了之后，三档各自有人走过了。\n')
}
