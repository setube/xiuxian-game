/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 感知层：那天他有没有把注意力放在那里。
 *
 * ## 这一支是为一个 0% 开的
 *
 * 山道那一卷的注释写着「机会摆在面前，看不看得见是另一回事」，
 * 而三百世量下来，**三百个人全都看见了**。判定是一行阈值：
 *
 *     insight ≥ 34 || body ≥ 52
 *
 * 十一行出身里只有种地那一行两项都够不着，可童年那些事——下地、跟车、认药——
 * 到十岁之前就把属性推过了线。这一关被童年系统提前替他解决了。
 *
 * ## 可修法不是把那条线抬高
 *
 * 抬高只换来另一句话：**聪明孩子看见，笨孩子看不见**。那是能力检测。
 * 要问的不是他聪不聪明，是**当时的他有没有把注意力放在那里**——
 * 这两件事不一样。所以判定挪进了 `attend()`：
 *
 *     心思细不细　+　那天他心里装着什么　+　路上是什么天
 *
 * `insight` 只占一份，而且不设阈值；剩下两份来自他这一生真发生过的事。
 *
 * ## 两层报法
 *
 * 第一节报**可达性**：这一档有没有可能走到？做法是直接把状态构造出来，
 * 掷够次数看它出不出现。第二节报**分布性**：正常人生里它占多少。
 *
 * 这两个问题得分开问。一件要求「被邪修抓过腕子」的长尾事，
 * 用普通人生模拟去证明它存在本身就是错的目标——
 * **事件概率 × 转化概率 × 行为概率乘出来太小，跑一万世也是零。**
 * 而那不代表它不通。
 *
 * 跑法：npx vite-node scripts/attention.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { attend } from '../src/engine/attention'
import { glance, rollTruth } from '../src/engine/wounded'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'

import { beOf } from './origin'

/**
 * 世数按最稀的那一档定。
 *
 * 三档里最稀的是「没看见」，实测占两成上下——四百世下有八十来个，
 * 连跑两批的差在两个点以内。再往上加买不到更多东西：
 * 这一支没有哪一档是靠 `事件 × 转化 × 行为` 乘出来的长尾，
 * 三条路全都是同一掷的三个面。
 */
const RUNS = 400

/** 走到「他把这人看成什么」之后，读成这两样的人不会停下来 */
const WALKS_AWAY = new Set(['醉汉', '死人'])

let failed = 0

// —— 一、可达性：三档各自走得通吗 ——
console.log('\n=== 一、可达性：把状态构造出来，三档都出得来吗 ===\n')
{
  /**
   * 每一档给一种构造。
   *
   * 这一节**不问「正常人生里有多少」**，只问「这条路通不通」。
   * 所以它有权把旗标直接设进去——那正是这一层该干的事。
   *
   * 三种构造的出身都钉死，属性也钉死：**这一节要是让出身自己掷，
   * 印出来的明细会时有时无**，读的人会以为内容改过。
   * 头一版正是这样，「一个什么也不占的人」那一格印出了「常年在山里走 +10」。
   */
  const plain = (insight: number, body: number): void => {
    // 木工那一行：既不常年在山里走，也不认草木。一个中性的出身
    beOf('craft')
    const character = useCharacterStore()
    character.attributes.insight = insight
    character.attributes.body = body
  }

  const CASES: [string, () => void][] = [
    [
      '心里装着家里那个病人，下着雨，身子已经乏透了',
      () => {
        plain(30, 32)
        const world = useWorldStore()
        world.setFlag('illness-lingers', true)
        world.setFlag('road-weather', '下雨')
      },
    ],
    [
      '同一个人，晴天，家里没事',
      () => {
        plain(30, 32)
        useWorldStore().setFlag('road-weather', '晴')
      },
    ],
    [
      '猎户家的孩子，上回也走过这么一段，心里正想弄明白些什么',
      () => {
        plain(52, 45)
        const world = useWorldStore()
        beOf('hunt')
        world.setFlag('road-weather', '晴')
        world.setFlag('wounded-outcome', 'lift-hunter')
        world.setFlag('leaning:know', true)
      },
    ],
  ]

  const TRIES = 400
  for (const [label, setup] of CASES) {
    const tally = { caught: 0, glimpsed: 0, missed: 0 }
    let score = 0
    let ledger: readonly { id: string; delta: number }[] = []
    for (let i = 0; i < TRIES; i += 1) {
      setActivePinia(createPinia())
      useHouseholdStore()
      useCharacterStore()
      useWorldStore()
      setup()
      const attention = attend()
      tally[attention.level] += 1
      score = attention.score
      ledger = attention.ledger
    }
    console.log(`  【${label}】`)
    console.log(
      `      ${ledger.map((one) => `${one.id} ${one.delta > 0 ? '+' : ''}${one.delta}`).join('　')}`,
    )
    console.log(`      合计 ${score.toFixed(1)} 分`)
    console.log(
      `      看进去 ${((tally.caught / TRIES) * 100).toFixed(0)}%　` +
        `瞥了一眼 ${((tally.glimpsed / TRIES) * 100).toFixed(0)}%　` +
        `没看见 ${((tally.missed / TRIES) * 100).toFixed(0)}%`,
    )
    console.log()
  }

  console.log('  同一段山道，三种当天状态，落点完全不同——')
  console.log('  **而三种人的属性可以是一样的。**')
}

// —— 二、误读那一档也得走得通 ——
console.log('\n=== 二、可达性：看见了却理解成另一回事 ===\n')
{
  /**
   * 「读成醉汉」这一档单独构造。
   *
   * 它跟上一节的三档不是同一掷：那边掷的是**有没有看见**，
   * 这边掷的是**看成了什么**。分开问，因为它们会各自坏掉。
   */
  const TRIES = 400
  let walkedAway = 0
  let reallyWrong = 0
  const readings = new Map<string, number>()

  for (let i = 0; i < TRIES; i += 1) {
    setActivePinia(createPinia())
    useHouseholdStore()
    const character = useCharacterStore()
    useWorldStore()
    // 一个没听说过修士、心思也不算细的人。他最容易把人看成醉汉
    character.attributes.insight = 30
    const truth = rollTruth()
    const seen = glance(truth)
    readings.set(seen.reading, (readings.get(seen.reading) ?? 0) + 1)
    if (WALKS_AWAY.has(seen.reading)) {
      walkedAway += 1
      if (seen.mistaken) reallyWrong += 1
    }
  }

  for (const [reading, n] of [...readings.entries()].sort((a, b) => b[1] - a[1])) {
    const away = WALKS_AWAY.has(reading) ? '　← 这一读会让他走开' : ''
    console.log(`  ${reading}　${String(((n / TRIES) * 100).toFixed(1)).padStart(5)}%${away}`)
  }
  console.log()
  console.log(`  看见了却走开的：${((walkedAway / TRIES) * 100).toFixed(1)}%`)
  console.log(`  其中真读错了的：${((reallyWrong / Math.max(1, walkedAway)) * 100).toFixed(1)}%`)
  console.log()
  console.log('  「读成死人」不全是误读——地上真躺着个死人的时候，走开是判断对了。')
  console.log('  **两种都落在同一个节点里，可它们不是同一件事。**')

  if (walkedAway === 0) {
    console.log('\n  ✗ 一个人也没因为理解错而走开——那 misread 那一档白写了。')
    failed += 1
  }
}

// —— 三、分布性：正常人生里，三档各占多少 ——
console.log(`\n=== 三、分布性：${RUNS} 世真人生，那天他看见了没有 ===\n`)
const share = { caught: 0, glimpsed: 0, missed: 0 }
{
  /**
   * 这三格量的是**最后那一回**。
   *
   * 山道有两个入口：年表上那件事（一辈子只掷一次），
   * 以及「一天」里他自己走出门撞上的。所以同一个人可以走两回山道，
   * 而 `attention` 只有一个格子——第二回会把第一回盖掉。
   * 这跟 `wounded-outcome` 是同一个已知的账，`probe.ts` 里记着。
   */
  let walked = 0
  let stopped = 0
  let walkedAway = 0

  for (let i = 0; i < RUNS; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const world = useWorldStore()
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()

    let turns = 0
    while (!narrative.ended && turns < 200) {
      const open = narrative.options.filter((option) => !option.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }

    const level = world.getFlag('attention')
    if (typeof level !== 'string') continue
    walked += 1
    if (level === 'caught' || level === 'glimpsed' || level === 'missed') share[level] += 1
    if (level !== 'caught') continue
    const reading = world.getFlag('wounded-reading')
    if (typeof reading === 'string' && WALKS_AWAY.has(reading)) walkedAway += 1
    else stopped += 1
  }

  const pct = (n: number) => String(((n / Math.max(1, walked)) * 100).toFixed(1)).padStart(5)
  console.log(`  ${walked} 世走上过那段山道。他们最后那一趟落在哪儿：\n`)
  console.log(`  ${pct(share.missed)}%  unseen　　　　　　　 没有注意到`)
  console.log(`  ${pct(share.glimpsed)}%  noticed-but-ignored  看见了，但没放在心上`)
  console.log(`  ${pct(walkedAway)}%  misread　　　　　　　 看见了，理解成另一回事`)
  console.log(`  ${pct(stopped)}%  interest　　　　　　　 停了下来，于是有得选`)
  console.log()
  console.log('  从前这四行是两行：看见了 100%，没看见 0%。')
  console.log('  **一个满格的过关率读起来像「这一关很宽」，其实是「这一关不存在」。**')
}

// —— 四、同一个人，不同的一天 ——
console.log('\n=== 四、同一个人，不同的一天 ===\n')
{
  /**
   * 这一节回答的是「它到底是不是能力检测」。
   *
   * 做法：属性、出身全都钉死，只换那天他心里装着什么。
   * 如果三档只落在一格上，那它就还是属性判定，只是换了个写法。
   */
  const DAYS: [string, () => void][] = [
    [
      '十岁那年　刚挨过一顿骂，心里想着家里',
      () => {
        const world = useWorldStore()
        world.setFlag('illness-lingers', true)
        world.setFlag('road-weather', '起风')
      },
    ],
    [
      '十五岁那年　一个人在山里走惯了',
      () => {
        const world = useWorldStore()
        world.setFlag('road-weather', '晴')
        world.setFlag('wounded-outcome', 'look-hunter')
      },
    ],
  ]

  const TRIES = 400
  const seen = new Set<string>()
  for (const [label, setup] of DAYS) {
    const tally = { caught: 0, glimpsed: 0, missed: 0 }
    for (let i = 0; i < TRIES; i += 1) {
      setActivePinia(createPinia())
      // 同一个农家孩子。两天里他是同一个人，属性一分不差
      beOf('farm')
      const character = useCharacterStore()
      character.attributes.insight = 38
      character.attributes.body = 44
      useWorldStore()
      setup()
      const level = attend().level
      tally[level] += 1
      seen.add(level)
    }
    console.log(`  【${label}】`)
    console.log(
      `      看进去 ${((tally.caught / TRIES) * 100).toFixed(0)}%　` +
        `瞥了一眼 ${((tally.glimpsed / TRIES) * 100).toFixed(0)}%　` +
        `没看见 ${((tally.missed / TRIES) * 100).toFixed(0)}%`,
    )
    console.log()
  }

  console.log('  同一个孩子，同样的悟性和身子骨，两天走的是两条路。')
  console.log('  **「错过机缘」于是成了人生的一部分，而不是属性不足。**')

  if (seen.size < 3) {
    console.log(`\n  ✗ 同一个人只落到 ${seen.size} 档——那这一层还是属性判定，只是换了个写法。`)
    failed += 1
  }
}

// —— 门禁 ——
console.log()
{
  const total = share.caught + share.glimpsed + share.missed
  if (total === 0) {
    console.log('  ✗ 一个人也没走上山道——这一支量的东西根本没被写进去。')
    failed += 1
  } else {
    /**
     * 三档各自的底线。
     *
     * 「没看见」那一档是这一支开出来的原因：**它从前是 0%。**
     * 而 0% 不会自己喊疼——上一格印的是「看见了 100%，过关率 100%」，
     * 读起来像这一关很宽，其实是这一关不存在。
     */
    for (const [level, label] of [
      ['missed', 'unseen（没有注意到）'],
      ['glimpsed', 'noticed-but-ignored（看见了没放在心上）'],
      ['caught', '看进去了'],
    ] as const) {
      if (share[level] === 0) {
        console.log(`  ✗ ${RUNS} 世里没有一个人落在「${label}」——这一档在真人生里走不到。`)
        failed += 1
      }
    }
    const top = Math.max(share.caught, share.glimpsed, share.missed)
    if (top / total > 0.8) {
      console.log('  ✗ 八成以上落在同一档——那这一掷就没在分人。')
      failed += 1
    }
  }

  if (failed > 0) {
    console.log(`\n  ✗ ${failed} 项不成立。\n`)
    process.exitCode = 1
  } else {
    console.log('  看不看得见，由那天他心里装着什么定；而同一个人不同的一天，答案不一样。')
    console.log('  三种错过各自都有人走到，没有哪一种是写着好看的。\n')
  }
}
