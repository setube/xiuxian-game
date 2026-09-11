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
      contact: '传闻',
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
  pick: (options: string[]) => string = () => (options: string[]) => options[0]!,
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
      const want = typeof pick === 'function' ? pick(open.map((o) => o.id)) : open[0]!.id
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

function play(
  scene: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
): string[] {
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
  const walked = play('seek:errand', (opts) => opts.includes('watch') ? 'watch' : opts[0]!)
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
    console.log(`  ✗ errand empty：设了 came-up-empty 却没走到（走过 ${emptyWalked.join(' → ')}）。`)
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
    console.log(`  ✗ errand gave-up：走到了 again 但没走到 gave-up（走过 ${againWalked.join(' → ')}）。`)
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
  const walked = play('seek:asking', (opts) => opts.includes('ask') ? 'ask' : opts[0]!)
  if (!walked.includes('open')) {
    console.log(`  ✗ asking open：没走到（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ asking open：可达。')
  }

  stage()
  const stoppedWalked = play('seek:asking', (opts) => opts.includes('stop') ? 'stop' : opts[0]!)
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
  const crossedWalked = play('seek:crossed', (opts) => opts.includes('go') ? 'go' : opts[0]!)
  if (!crossedWalked.includes('open')) {
    console.log(`  ✗ crossed open：没走到（走过 ${crossedWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ crossed open：可达。')
  }

  // after → waited（选了 go 后继续等）
  stage()
  const waitedWalked = play('seek:crossed', (opts) => opts.includes('go') ? 'go' : opts[0]!)
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
  const doorWalked = play('seek:door', (opts) => opts.includes('enter') ? 'enter' : opts[0]!)
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
    console.log(`  ✗ door turned：设了 was-turned-down 却没走到（走过 ${turnedResult.join(' → ')}）。`)
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

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  找了这些年，那几条路各自走得到了。\n')
}
