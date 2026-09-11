/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 营生里那几次遭遇——五卷各自走得到吗。
 *
 * `trades.ts` 里五个场景各自绑在一种出身（客栈/酒楼/药铺/护送/仕宦）的孩子身上。
 * 入场条件是 `business: '客栈'` / `business: '酒楼'` 等，不算苛刻——
 * 但 verify 里部分节点一直零命中，因为「行当合适的人不算多，且孩子时期的散事件
 * 300 世里能走进来几卷已经是上限」。
 *
 * 每一卷各摆两个局：一个走「近看/深入」路线，一个走「不在意/睡觉」路线。
 * 核心判据是：每卷至少走进入口、关键分叉各有人走到。
 *
 * 跑法：bun scripts/trades.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import { usePeopleStore } from '../src/stores/people'
import type { Choice, SceneNode, OriginId } from '../src/types/game'
import { beOf } from './origin'

/**
 * 摆一局：指定出身，推到指定年纪。
 *
 * trades 系列的入场都要求特定 business（客栈/酒楼/药铺/护送），
 * 而 business 来自出身表的 `sidelines`。直接设 `household.business`。
 */
function stage(
  origin: OriginId,
  business: string,
  age = 12,
  withFather = false,
): void {
  setActivePinia(createPinia())
  beOf(origin)
  const household = useHouseholdStore()
  household.standing = 40
  ;(household as unknown as { business: string }).business = business
  const world = useWorldStore()
  world.advanceTime({ years: age })

  if (withFather) {
    const people = usePeopleStore()
    people.enroll({
      id: 'father',
      surname: '江',
      given: '大',
      gender: '男',
      bornYear: world.time.year - 40,
      bornMonth: 3,
      temper: '木讷',
      health: 70,
      place: world.place,
      fate: '在',
      history: [],
    })
    people.bind('me', 'father', '生父')
  }
}

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

function play(
  scene: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
): string[] {
  return playFrom(scene, lifeScenes[scene]?.entry ?? 'open', pick)
}

console.log('\n=== 营生里那几次遭遇——五卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、trade:guest（半夜的客人）——客栈出身。
 *
 * 三个选项：serve（下楼近看）→ close-look，peek（楼梯看）→ from-afar，sleep（回去睡）→ missed。
 * 核心节点：close-look（落 cultivators-exist 知识）。
 */
{
  const SCENE = 'trade:guest'

  // serve → close-look
  stage('merchant', '客栈')
  const closeWalked = play(SCENE, (opts) => opts.includes('serve') ? 'serve' : opts[0]!)
  if (!closeWalked.includes('close-look')) {
    console.log(`  ✗ guest close-look：选了「下楼」却没走到（走过 ${closeWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ guest close-look（下楼近看）：走到了。')
  }

  // peek → from-afar
  stage('merchant', '客栈')
  const farWalked = play(SCENE, (opts) => opts.includes('peek') ? 'peek' : opts[0]!)
  if (!farWalked.includes('from-afar')) {
    console.log(`  ✗ guest from-afar：选了「楼梯看」却没走到（走过 ${farWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ guest from-afar（楼梯看）：走到了。')
  }

  // sleep → missed
  stage('merchant', '客栈')
  const missedWalked = play(SCENE, (opts) => opts.includes('sleep') ? 'sleep' : opts[0]!)
  if (!missedWalked.includes('missed')) {
    console.log(`  ✗ guest missed：选了「回去睡」却没走到（走过 ${missedWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ guest missed（回去睡）：走到了。')
  }
}

/**
 * 二、trade:drunk（酒楼听书）——酒楼出身。
 *
 * 选项：listen（倒酒去听）/ refill（倒了一壶又听）/ work（走开干活）。
 * 核心节点：heard（听到修士传说的那一节）。
 */
{
  const SCENE = 'trade:drunk'

  stage('merchant', '酒楼')
  const heardWalked = play(SCENE, (opts) => opts.includes('listen') ? 'listen' : opts[0]!)
  if (!heardWalked.includes('heard')) {
    console.log(`  ✗ drunk heard：选了「倒酒去听」却没走到（走过 ${heardWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ drunk heard（听到修士传说）：走到了。')
  }

  // ignored：选 work（走开干活）
  stage('merchant', '酒楼')
  const ignoredWalked = play(SCENE, (opts) => opts.includes('work') ? 'work' : opts[0]!)
  if (!ignoredWalked.includes('ignored')) {
    console.log(`  ✗ drunk ignored：选了「走开干活」却没走到（走过 ${ignoredWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ drunk ignored（走开干活）：走到了。')
  }
}

/**
 * 三、trade:herb（药铺认药材）——药铺出身。
 *
 * 选项：buy（买了那株）/ record（记下来）/ pass（走开）。
 * 核心节点：drawn（走近了查看）、passed（没理会）。
 */
{
  const SCENE = 'trade:herb'

  // buy → drawn 或 kept
  stage('merchant', '药铺')
  const drawnWalked = play(SCENE, (opts) => opts.includes('buy') ? 'buy' : opts[0]!)
  if (!drawnWalked.includes('drawn') && !drawnWalked.includes('kept')) {
    console.log(`  ✗ herb drawn/kept：选了「买了」却没走到核心节点（走过 ${drawnWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log(`  ✓ herb 积极路线（drawn/kept）：走到了 ${drawnWalked[drawnWalked.length - 1]}。`)
  }

  // pass → passed
  stage('merchant', '药铺')
  const passedWalked = play(SCENE, (opts) => opts.includes('pass') ? 'pass' : opts[0]!)
  if (!passedWalked.includes('passed')) {
    console.log(`  ✗ herb passed：选了「走开」却没走到（走过 ${passedWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ herb passed（走开不理会）：走到了。')
  }
}

/**
 * 四、trade:road（镖局丢人）——护送出身，父亲在。
 *
 * 选项：ask（问爹那件事）/ map（问地图）/ quiet（不问）。
 * 核心节点：told（问出来了）、mapped（问了地图）、unasked（没问）。
 */
{
  const SCENE = 'trade:road'

  stage('merchant', '护送', 12, true)
  const toldWalked = play(SCENE, (opts) => opts.includes('ask') ? 'ask' : opts[0]!)
  if (!toldWalked.includes('told')) {
    console.log(`  ✗ road told：选了「问爹」却没走到（走过 ${toldWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ road told（问出来了）：走到了。')
  }

  stage('merchant', '护送', 12, true)
  const unaskedWalked = play(SCENE, (opts) => opts.includes('quiet') ? 'quiet' : opts[0]!)
  if (!unaskedWalked.includes('unasked')) {
    console.log(`  ✗ road unasked：选了「不问」却没走到（走过 ${unaskedWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ road unasked（不问）：走到了。')
  }
}

/**
 * 五、trade:archive（卷宗室那一卷）——仕宦出身，父亲在。
 *
 * 选项：ask（问爹）/ read（自己翻）/ back（走开）。
 * 核心节点：confronted（问了，爹脸色变了）、scavenged（自己翻出来了）、unseen（没看到）。
 */
{
  const SCENE = 'trade:archive'

  stage('merchant', '仕宦', 12, true)
  // 设 station，因为 trade-archive 要求 station: '仕宦'
  const household = useHouseholdStore()
  ;(household as unknown as { station: string }).station = '仕宦'
  const confrontedWalked = play(SCENE, (opts) => opts.includes('ask') ? 'ask' : opts[0]!)
  if (!confrontedWalked.includes('confronted')) {
    console.log(`  ✗ archive confronted：选了「问爹」却没走到（走过 ${confrontedWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ archive confronted（问了，爹脸色变了）：走到了。')
  }

  stage('merchant', '仕宦', 12, true)
  const household2 = useHouseholdStore()
  ;(household2 as unknown as { station: string }).station = '仕宦'
  const unseen = play(SCENE, (opts) => opts.includes('back') ? 'back' : opts[0]!)
  if (!unseen.includes('unseen')) {
    console.log(`  ✗ archive unseen：选了「走开」却没走到（走过 ${unseen.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ archive unseen（走开没看到）：走到了。')
  }
}

/**
 * 六、尺子自检：五卷各自真走进去了，不是零步就结束。
 */
{
  const checks: Array<{ scene: string; business: string; withFather?: boolean }> = [
    { scene: 'trade:guest', business: '客栈' },
    { scene: 'trade:drunk', business: '酒楼' },
    { scene: 'trade:herb', business: '药铺' },
    { scene: 'trade:road', business: '护送', withFather: true },
    { scene: 'trade:archive', business: '仕宦', withFather: true },
  ]

  for (const { scene, business, withFather } of checks) {
    stage('merchant', business, 12, withFather)
    if (withFather) {
      const h = useHouseholdStore()
      if (business === '仕宦') {
        ;(h as unknown as { station: string }).station = '仕宦'
      }
    }
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
    }
  }
  console.log('  ✓ 尺子自检：五卷各自都走进去了。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  长大的那几年，那几间铺子里发生的事各自有人走过了。\n')
}
