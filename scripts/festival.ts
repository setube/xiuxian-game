/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 节令：到了那个日子，不是碰巧在那个日子。
 *
 * ## 这一支守的是「时令由内容自己推」这个改造真的生效了
 *
 * 节令从前靠 `Condition.month` 守时令（「碰巧在那个月」）。那一版守住了
 * 「不在六月演」，却守出了另一个毛病：成年之后一回合推两三年
 * （`routine:adult` 两年、`routine:prime` 三年），月份几乎不动，于是
 * 「年年可能有」实际成了**按世翻的开关**——踏进成年那一刻碰巧是几月，
 * 就决定了这一世过不过得上节。
 *
 * 现在改成内容自己把日历推过去（`{ type: 'time', untilMonth: 8 }`）。
 * 这一支验的正是这个改造的两头：
 *
 *     演出来的那些，落在八月　　　　　  推过去了，不是碰巧
 *     演到的世**远多于**四分之一　　　  开关拆掉了，不再是按世翻
 *
 * **第二条才是这次改造的意义所在。** 只验第一条的话，
 * 一个「仍旧靠碰巧、只是碰巧的时候在八月」的实现照样全绿——
 * 那正是改造之前的样子。
 *
 * ## 跟 `scripts/newyear.ts` 分工
 *
 * 那一支守年节那一卷（同一个改造的第一个使用者）。这一支守中秋，
 * 外加**那一格本身**（`TimeDelta.untilMonth` 的算术：当月是 0、跨年不往回拨）。
 *
 * 跑法：bun scripts/festival.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'

/**
 * 走多少世。
 *
 * 这一支等的是「有一个不在跟前的哥」——比年节那一串（分家＋侄儿满三岁）松，
 * 但仍要哥活着、且不在身边。300 世下第三条会把实际采到多少印出来。
 *
 * **这个数只为「非零」服务**（第三条），不为检出力：第一条是零容忍
 * （演在八月之外一次就红），撞上一次就认得出。分类见
 * `memory` 里那张三分类表，以及 `scripts/newyear.ts` 里 a8 写的那一段。
 */
const RUNS = 300

/**
 * 库里所有「会把日历推到某月」的卷，各自入口那句正文。
 *
 * ## 为什么要它：节令互相污染对方的观测通道
 *
 * 步末读到的月份，是那一步里**最后一个推日历的卷**留下的。一步之内可以演
 * 好几卷，于是中秋和年节同步演的时候，谁后跑谁说了算——`newyear` 那一支
 * 因此报出「7 次正月里演在八月」，而那正是我这一卷推过去的。
 *
 * **这条噪声会随节令数量增长**：往后还有五个节令要进来，两两都会撞。
 *
 * ## 自动推导，不写死一张表
 *
 * 判别式直接从内容取：入口节点的 `onEnter` 里有没有 `untilMonth`。
 * **新加一个节令不必回来改这儿**——写死一张表的话，第六个节令进来那天
 * 这里会静默地漏掉它，而漏掉的表现是噪声上涨，看着像内容坏了。
 * （同「判据的标准要从系统取」：抄一份就成了两处各自漂。）
 */
const PUSHER_LINES: readonly string[] = Object.values(lifeScenes)
  .filter((scene) => {
    const open = scene.nodes[scene.entry]
    return (open?.onEnter ?? []).some(
      (one) => one.type === 'time' && one.untilMonth !== undefined,
    )
  })
  .map((scene) => {
    const first = (scene.nodes[scene.entry]?.blocks ?? []).find((one) => 'text' in one)
    return first && 'text' in first ? first.text : ''
  })
  .filter((one) => one.length > 0)

/** 中秋那一卷入口那句。判据找的就是它 */
const MID_AUTUMN = '八月十五，月亮上来得早'

/** 演出来的那些卷：步末的月份，以及进这一步之前是几月 */
const when: { month: number; before: number }[] = []
/** 演到过中秋的世数。跟上面那个不同：一世可以演好几回 */
let worldsWithFestival = 0
/**
 * 同一步里还演了别的节令、月份读数因而无意义、被排除的回数。
 *
 * **必须印出来**：悄悄扔掉的样本跟没有过的样本长得一模一样。
 */
let ambiguous = 0
let worlds = 0

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
  worlds += 1
  let turns = 0
  let sawHere = false

  // 收正文用「见过的块 id」，不用下标切片——一步之内可能推进好几块，
  // 而 `stream` 是累积的；按下标切要自己维护游标，漏一次就丢一段
  const kept = new Set<string>()
  const drain = (): string[] => {
    const fresh: string[] = []
    for (const item of narrative.stream) {
      if (kept.has(item.id)) continue
      kept.add(item.id)
      if ('text' in item.block) fresh.push(item.block.text)
    }
    return fresh
  }
  drain()

  while (!narrative.ended && turns < 240) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    // 进这一步之前是几月。判据不直接用它，印在报表里是为了看得见「推了多远」
    const monthBefore = world.time.month
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1

    /*
     * 走没走到那一卷，**看正文不看 `sceneId`**：这一卷没有 `choices`，
     * 引擎一步就把它走完，`sceneId` 在两次 `choose` 之间从来没停在它上面。
     * （`scripts/newyear.ts` 为这件事绕过四轮。）
     *
     * ## ⚠️ 一步之内可能演好几卷，步末的月份不是这一卷演出的月份
     *
     * 这一支为此改过两版，两版都错在同一件事上——**采样点，不是内容**：
     *
     *     头一版　步末读月份　　　　　　报「16 次演在正月」：同步演的年节
     *                                 把日历推到了正月，我读到的是它留下的值
     *     第二版　撞上年节就整步排除　  还剩 14 次散在 4/10/12 月：**推日历的
     *                                 不止年节一卷**，我只堵了看得见的那一种
     *
     * 第二版的错法比头一版隐蔽：它**看起来是在处理这个问题**，而且把 16 降到了 14，
     * 像是修对了一部分。真相是那 14 次跟被排除的 26 次是同一个成因，
     * 只是那些卷我没列进白名单——**枚举「还有谁会推日历」是一场追不完的赛跑**，
     * 库里现在有三百多处 `type: 'time'`。
     *
     * 所以第三版**排除同步演了别的节令的那些步**，并把排除数印出来。
     * 剩下的残噪（非节令的卷也推日历）用比例判兜着：`untilMonth` 坏了的话
     * 落月是随机的，八九月合计 1/6 上下，跟好着的九成以上差一个数量级。
     */
    const fresh = drain()
    if (fresh.some((line) => line.includes(MID_AUTUMN))) {
      sawHere = true
      const pushers = PUSHER_LINES.filter((line) => fresh.some((one) => one.includes(line)))
      if (pushers.length > 1) ambiguous += 1
      else when.push({ month: world.time.month, before: monthBefore })
    }
  }
  if (sawHere) worldsWithFestival += 1
}

console.log(`\n=== 节令：中秋演在几月（${RUNS} 世）===\n`)

let bad = 0

/*
 * 一、演出来的那些，绝大多数落在八月。
 *
 * **这一条按比例判，不按零容忍判**——不是判据宽松，是**测量通道有噪声**：
 * 步末读到的月份是那一步里最后一个推日历的卷留下的，而中秋不一定是最后一个。
 * 库里三百多处 `type: 'time'`，枚举「还有谁会推」追不完（这一支为此改过三版，
 * 见循环里那一段）。
 *
 * 两种情形差着一个数量级，所以比例判分得很开：
 *
 *     untilMonth 好着　　月份绝大多数是 8（`days: 1` 溢进 9 的算对）
 *     untilMonth 坏了　　那一行被删或算错月 → 随机落月，八九月合计 1/6 上下
 *
 * 门槛取**九成**：实测 98.6%，坏掉是 17% 上下，九成这条线离两边都远。
 * 不贴着实测标（98%）——贴着标的阈值会把噪声的正常起伏判成红。
 */
const OFF_SEASON_FLOOR = 0.9
const inSeason = when.filter((one) => one.month === 8 || one.month === 9)
const offSeason = when.filter((one) => one.month !== 8 && one.month !== 9)
const hitRate = when.length === 0 ? 0 : inSeason.length / when.length
if (when.length > 0 && hitRate < OFF_SEASON_FLOOR) {
  const byMonth = new Map<number, number>()
  for (const one of offSeason) byMonth.set(one.month, (byMonth.get(one.month) ?? 0) + 1)
  console.log(
    `  ✗ 只有 ${inSeason.length} / ${when.length}（${(hitRate * 100).toFixed(1)}%）落在八九月，不足九成：`,
  )
  for (const [m, n] of [...byMonth.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`      ${String(m).padStart(2)} 月　${n} 次`)
  }
  console.log(`    那一卷的 onEnter 里有 { type: 'time', untilMonth: 8 }，它该把日历推过去。`)
  bad += 1
}

/*
 * 二、**这一条才是这次改造的意义**：演到的世远多于四分之一。
 *
 * 靠 `Condition.month` 守时令的时候，一卷节令能不能演，取决于踏进成年
 * 那一刻碰巧是几月——实测四十世只有十一世到过腊月正月，
 * **四分之三的人一辈子读不到**。改成内容自己推日历之后，
 * 「碰巧」这一层没有了：条件够了就演，日历自己走过去。
 *
 * 门槛取**三分之一**，不取四分之一贴着旧值：贴着实测标的阈值
 * 分不出「刚好比旧的好一点」和「真的把开关拆掉了」。三分之一是条语义线——
 * 过不了它就说明还有什么在按世卡着。
 *
 * ⚠️ 这一条量的是**演到过的世数占比**，分母是跑了多少世，不是演了多少次
 * （一世可以演好几回）。两个数的差别在 `newyear` 那一支上咬过人：
 * 那边抄了 `kindred` 的率，而两支数的不是同一个量，差五倍。
 */
const reach = worldsWithFestival / Math.max(worlds, 1)
if (worldsWithFestival === 0) {
  console.log(
    `  ✗ ${RUNS} 世里一次也没演到中秋，前两条根本没被验过。` +
      `\n    先看条件：那一卷要「有一个活着、不在跟前的哥」（bond 兄 alive near:false）。`,
  )
  bad += 1
} else if (reach < 1 / 3) {
  console.log(
    `  ✗ 只有 ${worldsWithFestival} / ${worlds} 世（${(reach * 100).toFixed(1)}%）演到过中秋，不足三分之一。` +
      `\n    这一格改造要拆掉的正是「按世翻的开关」——靠 Condition.month 守时令的旧版` +
      `\n    实测只有四分之一的世过得上节。占比压在三分之一以下，说明还有什么在按世卡着。`,
  )
  bad += 1
}

console.log(
  `  覆盖：${worlds} 世 / 演到过中秋的 ${worldsWithFestival} 世（${(reach * 100).toFixed(1)}%）` +
    ` / 月份可判的 ${when.length} 回（另有 ${ambiguous} 回同步演了别的节令，排除）` +
    `，落在八九月的 ${(hitRate * 100).toFixed(1)}%` +
    `\n        （采样点：每一步选完之后读月份。同步的节令已排除，剩下的残噪是非节令的卷也在推日历——` +
    `\n        所以第一条按比例判，不按零容忍判）`,
)
if (when.length > 0) {
  const months = new Map<number, number>()
  for (const one of when) months.set(one.month, (months.get(one.month) ?? 0) + 1)
  console.log(
    `        落在各月：${[...months.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([m, n]) => `${m}月 ${n}`)
      .join('　')}`,
  )
}

/**
 * 三、尺子自检：`untilMonth` 那一格本身得真的在算事。
 *
 * 上面两条验的是「那一卷用对了它」，这一条验的是**它自己算得对**。
 * 少了这一条，`advanceTime` 里那个取模写错（比如漏了 `+ 12`），
 * 上面两条未必立刻红——推到别的月份去也可能碰巧落在八月。
 */
{
  const failed: string[] = []
  setActivePinia(createPinia())
  const world = useWorldStore()

  /** 从 `from` 月推到目标月，落在几月、跨了几年 */
  const jump = (from: number, untilMonth: number): { month: number; years: number } => {
    world.time.year = 10
    world.time.month = from
    world.time.day = 5
    const years = world.advanceTime({ untilMonth })
    return { month: world.time.month, years }
  }

  /*
   * 四种形状，各问一件事。
   *
   * **第三行是这一格最容易写错的地方**：腊月推到正月，`目标 - 此刻` 是 -11，
   * 不取模的话日历会往回拨十一个月。`(1 - 12 + 12) % 12 = 1`，往前一个月，跨年。
   */
  const cases: { from: number; to: number; month: number; years: number; why: string }[] = [
    { from: 8, to: 8, month: 8, years: 0, why: '当月就是 0——已经到了不必再等一年' },
    { from: 3, to: 8, month: 8, years: 0, why: '三月推到八月，同一年往前五个月' },
    { from: 12, to: 1, month: 1, years: 1, why: '腊月推到正月，跨年（这一格最容易写反）' },
    { from: 9, to: 8, month: 8, years: 1, why: '九月推到八月，要等到明年' },
  ]
  for (const one of cases) {
    const got = jump(one.from, one.to)
    if (got.month !== one.month) {
      failed.push(
        `${one.why}：${one.from} 月推到 ${one.to} 月该落在 ${one.month} 月，落在了 ${got.month} 月`,
      )
    }
    if (got.years !== one.years) {
      failed.push(`${one.why}：该跨 ${one.years} 年，跨了 ${got.years} 年`)
    }
  }

  /*
   * 目标跟增量同时写，顺序是「先到那个月，再往后推」。
   *
   * 这一条守的是 `effects.ts` 里那句改过的注释：`untilMonth` 跟增量之间
   * **不满足交换律**，而上下文相是按数组原序结算的。
   */
  world.time.year = 10
  world.time.month = 3
  world.time.day = 5
  world.advanceTime({ untilMonth: 8, months: 2 })
  if (world.time.month !== 10) {
    failed.push(`先推到八月再加两个月该是十月，算出来是 ${world.time.month} 月`)
  }

  /*
   * 那一卷真的收了这一格——有人把 `onEnter` 里那一行删掉，上面几条
   * 未必立刻红（真跑那一半会红，但尺子这一半得自己站得住）。
   *
   * 条件直接从内容里取，不在这儿抄一份：抄一份就成了两处各自漂，
   * 而判据抄错了的表现是误报，比漏报更能骗人。
   */
  const scene = lifeScenes['festival:midautumn']
  if (scene === undefined) {
    failed.push('库里找不到 festival:midautumn 这一卷了')
  } else {
    const open = scene.nodes[scene.entry]
    const pushes = (open?.onEnter ?? []).filter(
      (one) => one.type === 'time' && one.untilMonth === 8,
    )
    if (pushes.length === 0) {
      failed.push('中秋那一卷的 onEnter 里没有 untilMonth: 8——它又变回碰巧演了')
    }
  }

  if (failed.length > 0) {
    console.log(`\n  ✗ 尺子自检没通过：`)
    for (const one of failed) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log(
      `\n  ✓ 尺子自检（5 条）：当月推 0、同年往前推、腊月跨到正月不往回拨、` +
        `九月推八月等到明年；\n    目标跟增量同写时先到月再加——` +
        `而中秋那一卷真的收了 untilMonth: 8。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  中秋到了八月才演，而且不再是四分之一的人才过得上。')
  console.log('  **节令说的是「到了那个日子」——所以日历由内容自己推，不靠碰巧。**\n')
}
