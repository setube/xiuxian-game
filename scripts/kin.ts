/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 族亲——三卷各自走得到吗。
 *
 * `kin.ts` 里三个场景：
 *
 *   dad:north   父亲曾经去过北边（press/quiet 两条路）
 *   dad:adept   父亲见过修行者（ask/later 两条路）
 *   mom:past    娘以前的事（roll/told/letters/famine/silent 等节点）
 *
 * 核心判据：
 * 一、dad:north press→told / quiet→untold 两条路各自走得到
 * 二、dad:adept ask→the-story / later→slept 两条路各自走得到
 * 三、mom:past 走进去了
 * 四、**条件层**：mom:past 那一节掷出什么，就去了那一节吗　← A 刀要红的
 * 五、尺子自检：三卷各自都走进去了
 *
 * ⚠️ 一到三那几条问「走得到吗」，next 写死在内容里，
 * `meetsAll` 恒真它们纹丝不动。第四条是 2026-09-12 补的。
 *
 * 跑法：bun scripts/kin.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import { usePeopleStore } from '../src/stores/people'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

function stage(age = 15): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function enrollFather(): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'father',
    surname: '江',
    given: '大',
    gender: '男',
    bornYear: world.time.year - 45,
    bornMonth: 3,
    temper: '木讷',
    health: 70,
    place: world.place,
    fate: '在',
    history: [],
  })
  people.bind('me', 'father', '生父')
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

console.log('\n=== 族亲——三卷各自走得到吗 ===\n')

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
 * 一、dad:north（父亲曾经去过北边）。
 *
 * press（逼问）→ told，quiet（不问）→ untold。
 */
{
  const SCENE = 'dad:north'

  stage()
  enrollFather()
  const pressWalked = play(SCENE, (opts) => (opts.includes('press') ? 'press' : opts[0]!))
  check('dad:north press → told', pressWalked, 'told')

  stage()
  enrollFather()
  const quietWalked = play(SCENE, (opts) => (opts.includes('quiet') ? 'quiet' : opts[0]!))
  check('dad:north quiet → untold', quietWalked, 'untold')
}

/**
 * 二、dad:adept（父亲见过修行者）。
 *
 * ask（问了）→ the-story，later（以后再说）→ slept。
 */
{
  const SCENE = 'dad:adept'

  stage()
  enrollFather()
  const askWalked = play(SCENE, (opts) => (opts.includes('ask') ? 'ask' : opts[0]!))
  check('dad:adept ask → the-story', askWalked, 'the-story')

  stage()
  enrollFather()
  const laterWalked = play(SCENE, (opts) => (opts.includes('later') ? 'later' : opts[0]!))
  check('dad:adept later → slept', laterWalked, 'slept')
}

/**
 * 三、mom:past（娘以前的事）。
 */
{
  stage()
  const walked = play('mom:past')
  if (walked.length === 0) {
    console.log('  ✗ mom:past：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ mom:past：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 四、条件层：**娘那天说了什么，就去了那一节吗**。
 *
 * 上面几条问的是「选了这个选项走到那个节点了吗」——`next` 写死在内容里，
 * **把 `meetsAll` 改成恒真它们纹丝不动**（2026-09-12 打断实测）。
 *
 * `mom:past` 的 `roll` 那一节按 `mom-told` 分四档：
 *
 *     娘家 → told      认字 → letters      荒年 → famine      （不说）→ silent
 *
 * ## ⚠️ 这面旗是那一节自己掷的，不能喂
 *
 * `onEnter` 里有一条 `roll`（娘家/认字/荒年/不说，带权重），
 * 摆局喂进去的值会被当场覆盖——`illness` 那一支为这个栽过一次，
 * 报「设了 died 却走到 lingering」，整体错位一档，看着像内容坏了。
 *
 * 所以不喂，改成掷很多次，记下**这一节掷出的值**和**实际走到的节点**，
 * 再核对对应表。这同时验了两件事：四档都掷得到、每一档都去对了地方。
 * （`scripts/lib/forking.ts` 的文件头写明了它不管这一种。）
 */
{
  const SCENE = 'mom:past'
  const scene = lifeScenes[SCENE]
  const node = scene?.nodes['roll']

  const routes = new Map<string, string>()
  let flagKey: string | undefined
  for (const branch of node?.branches ?? []) {
    const flag = branch.requires?.find((one) => one.flag !== undefined)?.flag
    if (flag?.equals === undefined || branch.next === undefined) continue
    flagKey = flag.key
    routes.set(String(flag.equals), branch.next)
  }
  const fallback = node?.next

  if (routes.size < 2 || fallback === undefined || flagKey === undefined) {
    console.log(
      `  ✗ 尺子自检：从 ${SCENE}/roll 只取到 ${routes.size} 档分流` +
        `（兜底 ${fallback ?? '没有'}）——结构变了。`,
    )
    bad += 1
  } else {
    const ROLLS = 300
    const seen = new Map<string, number>()
    const wrong: string[] = []
    for (let n = 0; n < ROLLS; n += 1) {
      stage()
      const walked = playFrom(SCENE, 'roll')
      const rolled = String(useWorldStore().getFlag(flagKey) ?? '(没掷)')
      seen.set(rolled, (seen.get(rolled) ?? 0) + 1)
      const want = routes.get(rolled) ?? fallback
      if (!walked.includes(want) && wrong.length < 5) {
        wrong.push(`掷出 ${rolled} 该去 ${want}，实际走过 ${walked.join('→')}`)
      }
    }

    const tally = [...seen.entries()].sort((a, b) => b[1] - a[1])
    console.log(`  ·  ${ROLLS} 次：` + tally.map(([v, n]) => `${v} ${n}`).join('，'))

    // 每一档都要掷得到——有一档一次没掷出来，那一节的判据这一轮什么也没量
    const missed = [...routes.keys()].filter((v) => !seen.has(v))
    if (missed.length > 0) {
      console.log(`  ✗ mom:past 分流：${ROLLS} 次里有几档一次也没掷出来（${missed.join('、')}）。`)
      bad += 1
    } else if (wrong.length > 0) {
      console.log('  ✗ mom:past 分流：掷出来的值跟走到的节点对不上。')
      for (const line of wrong) console.log(`      ${line}`)
      bad += wrong.length
    } else {
      console.log(`  ✓ mom:past 分流：${routes.size} 档加兜底，掷出什么就去了那一节。`)
    }
  }
}

/**
 * 五、尺子自检：三卷各自都走进去了。
 */
{
  const scenes = ['dad:north', 'dad:adept', 'mom:past'] as const
  let allIn = true
  for (const scene of scenes) {
    stage()
    enrollFather()
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
  console.log('  族亲三卷，各条路各自有人走过了。\n')
}
