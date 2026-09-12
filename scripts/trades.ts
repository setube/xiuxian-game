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

import { lifeEvents, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode, OriginId } from '../src/types/game'
import { standing } from './lib/standing'
import { beOf } from './origin'

/**
 * 摆一局：指定出身，推到指定年纪。
 *
 * trades 系列的入场都要求特定 business（客栈/酒楼/药铺/护送），
 * 而 business 来自出身表的 `sidelines`。直接设 `household.business`。
 */
function stage(origin: OriginId, business: string, age = 12, withFather = false): void {
  setActivePinia(createPinia())
  beOf(origin)
  const household = useHouseholdStore()
  household.standing = 40
  ;(household as unknown as { business: string }).business = business
  const world = useWorldStore()
  world.advanceTime({ years: age })

  if (withFather) {
    /*
     * ⚠️ 走 `standing()` 不直接 `enroll`：**立基可能已经造过父亲了**，
     * 而 `enroll` 对在册的人不改写——我摆的「在身边」静默落空，
     * 于是 `trade-road`/`trade-archive` 两条入场条件报「开护送的人家进不去」。
     *
     * 这一支先前**单跑绿、批次红**：立基造的那个爹恰好在身边时绿，
     * 流位置一挪就红。判据的红取决于随机流，那不是绿，是碰上了。
     */
    standing({ id: 'father', bond: '生父', older: 40, given: '大' })
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

function play(scene: string, pick: (options: string[]) => string = (opts) => opts[0]!): string[] {
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
  stage('inn', '客栈')
  const closeWalked = play(SCENE, (opts) => (opts.includes('serve') ? 'serve' : opts[0]!))
  if (!closeWalked.includes('close-look')) {
    console.log(`  ✗ guest close-look：选了「下楼」却没走到（走过 ${closeWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ guest close-look（下楼近看）：走到了。')
  }

  // peek → from-afar
  stage('inn', '客栈')
  const farWalked = play(SCENE, (opts) => (opts.includes('peek') ? 'peek' : opts[0]!))
  if (!farWalked.includes('from-afar')) {
    console.log(`  ✗ guest from-afar：选了「楼梯看」却没走到（走过 ${farWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ guest from-afar（楼梯看）：走到了。')
  }

  // sleep → missed
  stage('inn', '客栈')
  const missedWalked = play(SCENE, (opts) => (opts.includes('sleep') ? 'sleep' : opts[0]!))
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

  stage('tavern', '酒楼')
  const heardWalked = play(SCENE, (opts) => (opts.includes('listen') ? 'listen' : opts[0]!))
  if (!heardWalked.includes('heard')) {
    console.log(`  ✗ drunk heard：选了「倒酒去听」却没走到（走过 ${heardWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ drunk heard（听到修士传说）：走到了。')
  }

  // ignored：选 work（走开干活）
  stage('tavern', '酒楼')
  const ignoredWalked = play(SCENE, (opts) => (opts.includes('work') ? 'work' : opts[0]!))
  if (!ignoredWalked.includes('ignored')) {
    console.log(
      `  ✗ drunk ignored：选了「走开干活」却没走到（走过 ${ignoredWalked.join(' → ')}）。`,
    )
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
  stage('herb', '药铺')
  const drawnWalked = play(SCENE, (opts) => (opts.includes('buy') ? 'buy' : opts[0]!))
  if (!drawnWalked.includes('drawn') && !drawnWalked.includes('kept')) {
    console.log(
      `  ✗ herb drawn/kept：选了「买了」却没走到核心节点（走过 ${drawnWalked.join(' → ')}）。`,
    )
    bad += 1
  } else {
    console.log(`  ✓ herb 积极路线（drawn/kept）：走到了 ${drawnWalked[drawnWalked.length - 1]}。`)
  }

  // pass → passed
  stage('herb', '药铺')
  const passedWalked = play(SCENE, (opts) => (opts.includes('pass') ? 'pass' : opts[0]!))
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

  stage('escort', '护送', 12, true)
  const toldWalked = play(SCENE, (opts) => (opts.includes('ask') ? 'ask' : opts[0]!))
  if (!toldWalked.includes('told')) {
    console.log(`  ✗ road told：选了「问爹」却没走到（走过 ${toldWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ road told（问出来了）：走到了。')
  }

  stage('escort', '护送', 12, true)
  const unaskedWalked = play(SCENE, (opts) => (opts.includes('quiet') ? 'quiet' : opts[0]!))
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

  stage('office', '仕宦', 12, true)
  // 设 station，因为 trade-archive 要求 station: '仕宦'
  const household = useHouseholdStore()
  ;(household as unknown as { station: string }).station = '仕宦'
  const confrontedWalked = play(SCENE, (opts) => (opts.includes('ask') ? 'ask' : opts[0]!))
  if (!confrontedWalked.includes('confronted')) {
    console.log(
      `  ✗ archive confronted：选了「问爹」却没走到（走过 ${confrontedWalked.join(' → ')}）。`,
    )
    bad += 1
  } else {
    console.log('  ✓ archive confronted（问了，爹脸色变了）：走到了。')
  }

  stage('office', '仕宦', 12, true)
  const household2 = useHouseholdStore()
  ;(household2 as unknown as { station: string }).station = '仕宦'
  const unseen = play(SCENE, (opts) => (opts.includes('back') ? 'back' : opts[0]!))
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
  /*
   * 出身跟行当写在同一行。
   *
   * ⚠️ 从前这里出身写死成 `'merchant'`——**而那根本不是一个合法的 `OriginId`**
   * （合法的是 farm/tenant/hunt/craft/cloth/inn/tavern/herb/escort/office/yamen/manor/court）。
   * `beOf` 拿不到就落回兜底那一行，于是五卷全在同一个出身上跑，
   * 而这支门禁照样全绿：**它验的是「走得到吗」，摆错出身也走得到。**
   *
   * 增量类型检查一直没报（`vue-tsc --build` 读 tsbuildinfo），
   * `--build --force` 才当场六条。
   */
  const checks: Array<{
    scene: string
    origin: OriginId
    business: string
    withFather?: boolean
  }> = [
    { scene: 'trade:guest', origin: 'inn', business: '客栈' },
    { scene: 'trade:drunk', origin: 'tavern', business: '酒楼' },
    { scene: 'trade:herb', origin: 'herb', business: '药铺' },
    { scene: 'trade:road', origin: 'escort', business: '护送', withFather: true },
    { scene: 'trade:archive', origin: 'office', business: '仕宦', withFather: true },
  ]

  for (const { scene, origin, business, withFather } of checks) {
    stage(origin, business, 12, withFather)
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

/**
 * 七、条件层：**这五卷各自落在开那种铺子的人家吗**。
 *
 * 上面那几条问的是「选了这个选项走到那个节点了吗」——`next` 写死在内容里，
 * **`meetsAll` 恒真它们纹丝不动**（2026-09-12 打断实测）。
 *
 * 这五卷的条件层全在**入场**上，一卷一种行当：
 *
 *     trade-guest    business 客栈
 *     trade-drunk    business 酒楼
 *     trade-herb     business 药铺
 *     trade-road     livelihood 护送 + 爹还在
 *     trade-archive  station 仕宦 + 爹还在
 *
 * 判法是「同一个前提摆两次局」：**开这种铺子的进得去，
 * 开别家铺子的进不去**。只摆前一半等于没验——那一卷本来就挂在那儿。
 *
 * ⚠️ 入场条件从 `lifeEvents` 现取，不复用上面那张 `checks` 表：
 * 那张表是门禁自己写的，**它跟内容可能分家**，而分家的时候
 * 判据会安静地守着一个已经不存在的条件
 * （`ruler-standard-must-come-from-system` 那条）。
 */
{
  /** 哪种出身开哪种铺子——这一半只能靠门禁自己知道，摆局要用 */
  const shops: Array<{ event: string; origin: OriginId; business: string; father?: boolean }> = [
    { event: 'trade-guest', origin: 'inn', business: '客栈' },
    { event: 'trade-drunk', origin: 'tavern', business: '酒楼' },
    { event: 'trade-herb', origin: 'herb', business: '药铺' },
    { event: 'trade-road', origin: 'escort', business: '护送', father: true },
    { event: 'trade-archive', origin: 'office', business: '仕宦', father: true },
  ]

  let wrong = 0
  for (const { event, origin, business, father } of shops) {
    const found = lifeEvents.find((one) => one.id === event)
    if (found === undefined) {
      console.log(`  ✗ 尺子自检：库里没有事件「${event}」——id 打错或没注册。`)
      bad += 1
      wrong += 1
      continue
    }
    const requires = found.requires ?? []
    if (requires.length === 0) {
      console.log(`  ✗ 尺子自检：${event} 一条入场条件也没有——这一卷谁都读得到。`)
      bad += 1
      wrong += 1
      continue
    }

    // 开这种铺子的：进得去
    stage(origin, business, 12, father)
    if (business === '仕宦') {
      ;(useHouseholdStore() as unknown as { station: string }).station = '仕宦'
    }
    const canEnter = meetsAll(requires)

    // 开别家铺子的：进不去。只改行当这一处，别处一个字不动
    const other = shops.find((one) => one.business !== business)!
    stage(other.origin, other.business, 12, father)
    const strangerEnters = meetsAll(requires)

    if (!canEnter) {
      console.log(`  ✗ ${event} 入场：开${business}的人家进不去——这一卷在真世里演不到。`)
      bad += 1
      wrong += 1
    } else if (strangerEnters) {
      console.log(`  ✗ ${event} 入场：开${other.business}的人家也进得去——那条入场条件没在管事。`)
      bad += 1
      wrong += 1
    }
  }

  if (wrong === 0) {
    console.log(`  ✓ 五卷入场：各自只落在开那种铺子的人家，别家进不去。`)
  }
}

/**
 * 效果层：**这几间铺子是修仙那条路的入口**。
 *
 * 上面那几条验的是「各支分叉走得到」和五卷入场——
 * **把 `applyEffects` 整个改成空转，它们纹丝不动**（2026-09-12 B 刀实测）。
 *
 * 这一卷跟别的卷不一样的地方在**它落的不是几点属性**：
 *
 *     close-look  旗 heard-of-cultivators + 认知「修士」+ 运气 3
 *     listen      旗 heard-immortal-tale  + 认知「跑山人说的那件事」+ 见识 3
 *     refill      同一面旗、同一条认知，**家底 -2 换见识 5、运气 2**
 *
 * ## 两面旗是「这世上有修士」这件事进到他脑子里的唯一路径
 *
 * 后头拜师那一卷问的就是它（`heard-of-cultivators`）。旗不落，
 * 修仙那条纵切**整条对这个人关死**——他一辈子都不知道有那种人。
 * 那不是少了三点运气，是**少了一种可能**。
 *
 * ## 花钱那一条要换来更多，否则那两文钱白花
 *
 * `listen` 站着白听，`refill` 把酒满上——家底掉两分，
 * 换来的见识从 3 到 5、多两分运气，连认知的 summary 都更详细
 * （「往北边去了」「他回头看过他一眼」）。
 * **判「花了钱的那条拿得更多」，不判「正好 5」**。
 */
{
  interface Got {
    heardCultivators: boolean
    heardTale: boolean
    knows: string[]
    insight: number
    fortune: number
    standing: number
  }

  const missed: string[] = []

  function gotBy(scene: string, from: string, pick?: string): Got {
    stage('tavern', '酒楼')
    const world = useWorldStore()
    const household = useHouseholdStore()
    const character = useCharacterStore()
    const before = {
      insight: character.attributes.insight,
      fortune: character.attributes.fortune,
      standing: household.standing,
    }
    playFrom(scene, from, (opts) => {
      if (pick === undefined) return opts[0]!
      // 落空不许安静过去：点不到那一条时，底下几句问的是别条路的账
      if (!opts.includes(pick)) missed.push(`${pick}（当时只有 ${opts.join('、')}）`)
      return opts.includes(pick) ? pick : opts[0]!
    })
    return {
      heardCultivators: world.getFlag('heard-of-cultivators') === true,
      heardTale: world.getFlag('heard-immortal-tale') === true,
      knows: character.knowledge.map((one) => one.id),
      // 记增量：每次摆局各起各的 pinia，属性和家底起手都是现掷的
      insight: character.attributes.insight - before.insight,
      fortune: character.attributes.fortune - before.fortune,
      standing: household.standing - before.standing,
    }
  }

  const sawGuest = gotBy('trade:guest', 'close-look')
  const listened = gotBy('trade:drunk', 'open', 'listen')
  const refilled = gotBy('trade:drunk', 'open', 'refill')

  const wrong: string[] = []
  for (const one of missed) wrong.push(`摆局没摆出「${one}」这一条——底下那几句问的是别条路的账`)

  if (!sawGuest.heardCultivators) {
    wrong.push('看清了那位客人，却没落「听说过修士」那面旗——修仙那条路对他整个关死了')
  }
  if (!sawGuest.knows.includes('cultivators-exist')) {
    wrong.push('看清了那位客人，「修士」那条认知却没进脑子')
  }
  if (!listened.heardTale) wrong.push('站着听完了，却没落「听过那个传闻」的旗')
  if (!listened.knows.includes('immortal-tale')) {
    wrong.push('站着听完了，「跑山人说的那件事」却没进脑子')
  }
  if (!refilled.heardTale) wrong.push('把酒满上听完了，却没落那面旗')
  if (refilled.standing >= 0) {
    wrong.push(`那壶酒记在自家账上，家底该掉，实际 ${refilled.standing}`)
  }
  if (refilled.insight <= listened.insight) {
    wrong.push(
      `花了钱的那条该听到更多（站着听 ${listened.insight} 见识、满上酒 ${refilled.insight}）` +
        '——那两文钱白花了',
    )
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 铺子里效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ 铺子里效果层：看清客人落了「听说过修士」旗和那条认知；` +
        `站着听 +${listened.insight} 见识，满上酒折 ${refilled.standing} 家底换 +${refilled.insight} 见识。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  长大的那几年，那几间铺子里发生的事各自有人走过了。\n')
}
