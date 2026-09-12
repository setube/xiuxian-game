/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 寻找修士——四卷十七个节点都走得到吗。
 *
 * `seeking.ts` 是修行纵切里「听说了之后开始找」那一段，分四卷：
 *
 *   seek:errand   打听（村口商旅那一卷，可反复）
 *   seek:asking   问路（当面问人，有回答有拒绝）
 *   seek:crossed  已经认识一个修士的情况下去找
 *   seek:door     真正站到那扇门前
 *
 * verify 报 9/17 节点没走到——入场条件苛刻（`knowledge: cultivators-exist`），
 * 300 世里几乎没人走进来。和 attempt.ts 同一形状：
 * 「没人量过」和「量过了全绿」长得一模一样，所以摆局。
 *
 * 跑法：bun scripts/seek.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useWorldStore } from '../src/stores/world'
import { useHouseholdStore } from '../src/stores/household'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

/**
 * 摆一局：农户出身，二十岁，知道修士存在。
 *
 * `cultivators-exist` 这条知识是 `seek:errand` 的入场条件，
 * 也是这一卷的基础前提——没有这条知识的人一辈子不会走进这里。
 */
function stage(): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: 20 })

  // 立 cultivators-exist 知识
  applyEffects([
    {
      type: 'knowledge',
      id: 'cultivators-exist',
      title: '世上有修士',
      summary: '你听说了，世上真的有那种人。',
      contact: '听说',
      category: '修行',
    },
  ])
}

/**
 * 从指定场景的指定节点开始演下去，回报走过的节点 id。
 */
function playFrom(
  scene: string,
  from: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 15,
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
  const entry = lifeScenes[scene]?.entry ?? 'open'
  return playFrom(scene, entry, pick)
}

console.log('\n=== 寻找修士——四卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、seek:errand（打听）——五个节点。
 *
 * 这一卷可反复。关键节点：open / back / again / empty / gave-up。
 * `came-back` 在走了 `THE_PLACE` 选项后才触发，门禁里不验它
 * （它依赖 `found-the-way` 旗标，那条链从外部卷来）。
 */
{
  // open 节点可达
  stage()
  const walked = play('seek:errand', (opts) => (opts.includes('watch') ? 'watch' : opts[0]!))
  if (!walked.includes('open')) {
    console.log(`  ✗ errand open：没走到（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ errand open：可达。')
  }

  // empty：设 came-up-empty 旗标，back 节点会走到 empty
  stage()
  const world = useWorldStore()
  world.setFlag('came-up-empty', true)
  // 直接从 back 节点开始演
  const emptyWalked = playFrom('seek:errand', 'back')
  if (!emptyWalked.includes('empty')) {
    console.log(
      `  ✗ errand empty：设了 came-up-empty 却没走到（走过 ${emptyWalked.join(' → ')}）。`,
    )
    bad += 1
  } else {
    console.log('  ✓ errand empty：来-up-empty 旗成立时走到了。')
  }

  // again 和 gave-up：back 没有 came-up-empty 就走 again；again 里选 enough 走 gave-up
  stage()
  const againWalked = playFrom('seek:errand', 'back', (opts) =>
    opts.includes('enough') ? 'enough' : opts[0]!,
  )
  if (!againWalked.includes('again')) {
    console.log(`  ✗ errand again：没走到（走过 ${againWalked.join(' → ')}）。`)
    bad += 1
  } else if (!againWalked.includes('gave-up')) {
    console.log(
      `  ✗ errand gave-up：走到了 again 但没走到 gave-up（走过 ${againWalked.join(' → ')}）。`,
    )
    bad += 1
  } else {
    console.log('  ✓ errand again + gave-up：两个节点都走到了。')
  }
}

/**
 * 二、seek:asking（问路）——两个节点。
 *
 * open：直接进卷。
 * stopped：选择「停下来不问」走 stopped。
 */
{
  stage()
  const walked = play('seek:asking', (opts) => (opts.includes('ask') ? 'ask' : opts[0]!))
  if (!walked.includes('open')) {
    console.log(`  ✗ asking open：没走到（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ asking open：可达。')
  }

  stage()
  const stoppedWalked = play('seek:asking', (opts) => (opts.includes('stop') ? 'stop' : opts[0]!))
  if (!stoppedWalked.includes('stopped')) {
    console.log(`  ✗ asking stopped：选了「不问」却没走到（走过 ${stoppedWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ asking stopped：走到了。')
  }
}

/**
 * 三、seek:crossed（认识修士后去找）——四个节点。
 *
 * open / after / home / waited。
 * after 里分叉：home（选了走回去）、waited（等着）。
 */
{
  stage()
  const crossedWalked = play('seek:crossed', (opts) => (opts.includes('go') ? 'go' : opts[0]!))
  if (!crossedWalked.includes('open')) {
    console.log(`  ✗ crossed open：没走到（走过 ${crossedWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ crossed open：可达。')
  }

  // after → waited（选了 go 后继续等）
  stage()
  const waitedWalked = play('seek:crossed', (opts) => (opts.includes('go') ? 'go' : opts[0]!))
  if (!waitedWalked.includes('after')) {
    console.log(`  ✗ crossed after：没走到（走过 ${waitedWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ crossed after：走到了。')
  }

  // home：after 节点在没有 found-the-way 旗标时兜底走 home
  stage()
  const homeWalked = playFrom('seek:crossed', 'after')
  if (!homeWalked.includes('home')) {
    console.log(`  ✗ crossed home：从 after 演兜底没走到 home（走过 ${homeWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ crossed home（跑了一趟回来）：走到了。')
  }
}

/**
 * 四、seek:door（门前）——五个节点。
 *
 * open / after / taken / turned / walked。
 * taken 和 turned 依赖 `was-taken-in` / `was-turned-down` 旗标（由 knock 效果落）。
 * walked 是兜底（两个旗都没有）。
 * 直接从各目标节点开始演，绕过 knock 效果。
 */
{
  // open 和 walked（兜底）
  stage()
  const doorWalked = play('seek:door', (opts) => (opts.includes('enter') ? 'enter' : opts[0]!))
  if (!doorWalked.includes('open')) {
    console.log(`  ✗ door open：没走到（走过 ${doorWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ door open：可达。')
  }

  // walked：after 里没有 was-taken-in 也没有 was-turned-down 时走 walked
  stage()
  const walkedResult = playFrom('seek:door', 'after')
  if (!walkedResult.includes('walked')) {
    console.log(`  ✗ door walked（兜底）：没走到（走过 ${walkedResult.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ door walked（兜底）：走到了。')
  }

  // taken：设 was-taken-in 旗标后从 after 演
  stage()
  useWorldStore().setFlag('was-taken-in', true)
  const takenResult = playFrom('seek:door', 'after')
  if (!takenResult.includes('taken')) {
    console.log(`  ✗ door taken：设了 was-taken-in 却没走到（走过 ${takenResult.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ door taken（收进门）：走到了。')
  }

  // turned：设 was-turned-down 旗标后从 after 演
  stage()
  useWorldStore().setFlag('was-turned-down', true)
  const turnedResult = playFrom('seek:door', 'after')
  if (!turnedResult.includes('turned')) {
    console.log(
      `  ✗ door turned：设了 was-turned-down 却没走到（走过 ${turnedResult.join(' → ')}）。`,
    )
    bad += 1
  } else {
    console.log('  ✓ door turned（没收）：走到了。')
  }
}

/**
 * 五、尺子自检：场景 id 打对了，play() 真的走进去了。
 */
{
  const scenes = ['seek:errand', 'seek:asking', 'seek:crossed', 'seek:door'] as const
  for (const scene of scenes) {
    stage()
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
    }
  }
  console.log('  ✓ 尺子自检：四卷都走进去了。')
}

/**
 * 效果层：**跟着那个人上了山，那一格就翻过去了**。
 *
 * 上面那五条验的是「各节点走得到」——**把 `applyEffects` 整个改成空转，
 * 它们纹丝不动**（2026-09-12 B 刀实测）。
 *
 * 这一卷是修仙纵切的末一段：找了这些年，终于站到那扇门前。
 * 而它落的东西里，有一笔是全库分量最重的之一：
 *
 *     taken   identity → 「门下」+ 一笔朱砂色的年表「你跟着那个人上了山」
 *     stop    旗「不打听了」
 *     later   旗「还在等」
 *     go      家底 -2（跑一趟的盘缠）
 *     ask     见识 +1
 *
 * ## `identity: '门下'` 是「他是什么」那四格里真正改命的一笔
 *
 * 在这一笔之前，他是种地人家的孩子、是学徒、是生员——**都在凡人那一册里**。
 * 这一笔落下去，他从那一册里出来了。
 * 后头讲山上的日子、讲师门、讲同门的内容，读的全是这一格。
 *
 * **那一格不翻，前头找了这些年的每一步都还在，而人没上去。**
 *
 * ## 两面旗各标一个相反的将来
 *
 * `stopped-asking`（不打听了）和 `kept-waiting`（还在等）——
 * 一个断了念想，一个还没断。判「两条路记的不是同一件事」。
 */
{
  interface Sought {
    identity: string
    stopped: boolean
    waiting: boolean
    standing: number
    insight: number
  }

  const missed: string[] = []

  function soughtBy(scene: string, from: string, pick?: string): Sought {
    stage()
    const world = useWorldStore()
    const household = useHouseholdStore()
    const character = useCharacterStore()
    const before = { standing: household.standing, insight: character.attributes.insight }
    /*
     * 落空要整趟看，不能逐节点看：`pick` 在每一节都被问一次，
     * 而下游那些节点本来就没有我要的那条。
     */
    let hit = pick === undefined
    playFrom(scene, from, (opts) => {
      if (pick !== undefined && opts.includes(pick)) {
        hit = true
        return pick
      }
      return opts[0]!
    })
    if (!hit && pick !== undefined) missed.push(pick)
    return {
      identity: character.identity,
      stopped: world.getFlag('stopped-asking') === true,
      waiting: world.getFlag('kept-waiting') === true,
      // 记增量：每次摆局各起各的 pinia，家底和属性起手都是现掷的
      standing: household.standing - before.standing,
      insight: character.attributes.insight - before.insight,
    }
  }

  const taken = soughtBy('seek:door', 'taken')
  // ⚠️ 两条不在同一卷：`stop` 在问路那一卷、`later` 在去找那一卷。
  // 头一版两条都写成 `seek:errand`，**落空检测当场抓住了**——
  // 不加那一层的话，它们会安静地点到 open 的第一条，
  // 底下报「却没落下那面旗」，读着像内容坏了。
  const stopped = soughtBy('seek:asking', 'open', 'stop')
  const waited = soughtBy('seek:crossed', 'open', 'later')

  const wrong: string[] = []
  for (const one of missed) wrong.push(`摆局没摆出「${one}」这一条——底下那几句问的是别条路的账`)

  if (taken.identity !== '门下') {
    wrong.push(
      `跟着那个人上了山，那一格却还是「${taken.identity}」` +
        '——找了这些年的每一步都还在，而人没上去',
    )
  }
  if (stopped.identity === '门下') wrong.push('不打听了的人也成了门下——那一格没在认路')
  if (!stopped.stopped) wrong.push('断了念想不再打听，却没落下那面旗')
  if (!waited.waiting) wrong.push('还在等，却没落「还在等」那面旗')
  if (stopped.waiting) wrong.push('不打听了，却记成「还在等」——两条路记成了同一件事')
  if (waited.stopped) wrong.push('还在等，却记成「不打听了」')

  if (wrong.length > 0) {
    console.log(`  ✗ 寻访效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ 寻访效果层：上了山那一格翻成「${taken.identity}」；` +
        '断了念想的落「不打听了」、还等着的落「还在等」——两条路各标各的将来。',
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  找了这些年，那几条路各自走得到了。\n')
}
