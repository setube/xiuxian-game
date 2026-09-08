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
 * 库里所有「会把日历推到某月」的卷：入口那句正文、推到几月、卷名。
 *
 * ## 一张表办两件事
 *
 * **一、判据本身。** 每一卷各验各的：它演出来的时候，日历是不是真被推到了
 * 它自己那个月。从前这儿写死找中秋那一句——**那意味着第二个节令进来时
 * 不会被验，而报表照样全绿**。「新加节令不必回来改门禁」那句话当时只有一半是真的
 * （`PUSHER_LINES` 是自动的，判据不是）。
 *
 * **二、互相排除。** 步末读到的月份是那一步里**最后一个推日历的卷**留下的。
 * 中秋进库那天 `newyear` 立刻报出「7 次正月里演在八月」，而八月正是中秋推过去的。
 * 一步之内演了两卷节令，这个读数对两卷都无意义，整步排除。
 *
 * ## 为什么从内容推，不写死
 *
 * 判别式直接取入口节点的 `onEnter` 里有没有 `untilMonth`。写死一张表的话，
 * 第三个节令进来那天这里会静默漏掉它：**判据那一半漏掉是「没人验」，
 * 排除那一半漏掉是「噪声上涨」——前者报表干净，后者看着像内容坏了**。
 * 两种都不会指向真正的原因。（同「判据的标准要从系统取」。）
 */
interface Festival {
  /** 卷名，报表里指名道姓用 */
  id: string
  /** 入口那句正文。判据靠它认出这一卷演了 */
  line: string
  /** 它把日历推到几月 */
  month: number
  /**
   * 它的普遍性是不是由日历这一层决定的。
   *
   * ## 这一格是「拿错尺子量」逼出来的
   *
   * 泛化这一支之后它把 `kindred:newyear` 也纳入了（那一卷同样带 `untilMonth`），
   * 于是三分之一那条线去量它——**4.0%，红**。而那不是机制坏了：
   * 年节的 `requires` 压着「分了家 + 侄儿满三岁」，**那是老屋那条链的稀有度，
   * 不是节令的稀有度**。
   *
   * 三分之一那条线要量的是「日历这一层有没有卡住」。一卷节令要是自己压着
   * 别的前提，它的到达率由那些前提决定，**跟日历这一层无关**——
   * 拿这条线去判它，等于把上游的稀有度算到下游头上
   * （同一晚跟 79 归纳的那条：**多层筛的末端率说的是整条链，不是末端那一层**，
   * 而我转头就踩了）。
   *
   * 所以只有「前提只剩年纪」的节令才受这条线管。判别式从内容取：
   * 指向这一卷的事件有没有写 `requires`。
   */
  universal: boolean
}
const FESTIVALS: readonly Festival[] = Object.values(lifeScenes)
  .map((scene) => {
    const open = scene.nodes[scene.entry]
    const push = (open?.onEnter ?? []).find(
      (one) => one.type === 'time' && one.untilMonth !== undefined,
    )
    if (push === undefined || push.type !== 'time' || push.untilMonth === undefined) return null
    const first = (open?.blocks ?? []).find((one) => 'text' in one)
    const line = first && 'text' in first ? first.text : ''
    if (line.length === 0) return null
    // 指向这一卷的事件压了别的前提没有——压了的，它的到达率不归日历管
    const gated = lifeEvents.some(
      (event) => event.scene === scene.id && (event.requires?.length ?? 0) > 0,
    )
    return { id: scene.id, line, month: push.untilMonth, universal: !gated }
  })
  .filter((one): one is Festival => one !== null)

/**
 * 各卷演出来的那些回：步末的月份。按卷名分开记——**一张总表判不出
 * 「哪一卷坏了」**，而节令一多，那正是要问的第一个问题。
 */
const when = new Map<string, { month: number; before: number }[]>()
/** 各卷演到过的世数。跟上面那个不同：一世可以演好几回 */
const reached = new Map<string, number>()
/**
 * 同一步里演了两卷以上节令、月份读数因而无意义、被排除的回数。
 *
 * **必须印出来**：悄悄扔掉的样本跟没有过的样本长得一模一样。
 */
let ambiguous = 0
/** 节令把日历往前推的月数总和，以及推了几回。**报数不判红——这个数没有作者** */
let pushed = 0
let pushes = 0
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
  /** 这一世见过哪几卷节令。世数按卷分开数——一世演三回中秋仍只算一世 */
  const seenHere = new Set<string>()

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
    const fired = FESTIVALS.filter((one) => fresh.some((line) => line.includes(one.line)))
    for (const one of fired) seenHere.add(one.id)
    if (fired.length > 1) {
      // 两卷同步演，步末那个月份对两卷都无意义
      ambiguous += fired.length
    } else if (fired.length === 1) {
      const one = fired[0]!
      const rows = when.get(one.id) ?? []
      rows.push({ month: world.time.month, before: monthBefore })
      when.set(one.id, rows)
      /*
       * 这一步里节令把日历推了多远。
       *
       * **多卷节令挤在相邻月份时，顺序决定代价，能差十一倍**：
       * 正月走到腊月是 +11 个月，腊月走到正月是 +1。两卷交替演的话，
       * 每一对花掉整整一年——而成年段一回合本来就推两三年，这一年是叠上去的。
       *
       * 这个数不判红（**它没有作者**：改任何一卷的月份、`chance`、窗口都会动它），
       * 只印出来。**印它是为了让「加了一卷之后日历被拖走多少」看得见**——
       * 下一个写节令的人加一卷之前该先看这个数，而不是等玩家觉得日子过得太快。
       */
      pushed += (one.month - monthBefore + 12) % 12
      pushes += 1
    }
  }
  for (const id of seenHere) reached.set(id, (reached.get(id) ?? 0) + 1)
}

console.log(`\n=== 节令：各卷演在几月（${RUNS} 世，${FESTIVALS.length} 卷）===\n`)

let bad = 0

/*
 * 一、每一卷演出来的那些，绝大多数落在它自己那个月。
 *
 * **按卷循环，不合成一张总表**——合起来判的话，一卷坏了会被别几卷的正确
 * 稀释掉，而报表只会说「总体 82%」，指不出是谁。节令一多，
 * 「哪一卷坏了」正是要问的第一个问题。
 *
 * **这一条按比例判，不按零容忍判**——不是判据宽松，是**测量通道有噪声**：
 * 步末读到的月份是那一步里最后一个推日历的卷留下的，而这一卷不一定是最后一个。
 * 同步的节令已经排除了（`FESTIVALS` 那张表），剩下的残噪是**非节令的卷也在推日历**
 * ——库里三百多处 `type: 'time'`，枚举追不完（这一支为此改过三版，见循环里那一段）。
 *
 * 两种情形差着一个数量级，所以比例判分得很开：
 *
 *     untilMonth 好着　　月份绝大多数是目标月（`days` 溢进下个月的算对）
 *     untilMonth 坏了　　那一行被删或算错月 → 随机落月，两个月合计 1/6 上下
 *
 * 门槛取**九成**：中秋实测 98.6%，打断（把 8 改成 3）掉到 0.2%，
 * 九成这条线离两边都远。不贴着实测标——贴着标的阈值会把噪声的正常起伏判成红。
 *
 * 二、**这一条才是这次改造的意义**：演到的世远多于四分之一。
 *
 * 靠 `Condition.month` 守时令的时候，一卷节令能不能演，取决于踏进成年
 * 那一刻碰巧是几月——实测四十世只有十一世到过腊月正月，
 * **四分之三的人一辈子读不到**。改成内容自己推日历之后，「碰巧」这一层没有了。
 *
 * 门槛取**三分之一**，不取四分之一贴着旧值：贴着实测标的阈值分不出
 * 「刚好比旧的好一点」和「真的把开关拆掉了」。三分之一是条语义线。
 *
 * ⚠️ 这一条量的是**演到过的世数占比**，分母是跑了多少世，不是演了多少次
 * （一世可以演好几回）。两个数的差别在 `newyear` 那一支上咬过人：
 * 那边抄了 `kindred` 的率，而两支数的不是同一个量，差五倍。
 */
const MONTH_FLOOR = 0.9
const REACH_FLOOR = 1 / 3
if (FESTIVALS.length === 0) {
  console.log(`  ✗ 库里一卷会推日历的节令也没有——这一支整个没有被测对象。`)
  bad += 1
}
for (const festival of FESTIVALS) {
  const rows = when.get(festival.id) ?? []
  const worldsHere = reached.get(festival.id) ?? 0
  const reach = worldsHere / Math.max(worlds, 1)
  // 目标月，以及 `days` 溢出去的下一个月（腊月溢到正月，按环形算）
  const next = (festival.month % 12) + 1
  const onTime = rows.filter((one) => one.month === festival.month || one.month === next)
  const rate = rows.length === 0 ? 0 : onTime.length / rows.length

  const months = new Map<number, number>()
  for (const one of rows) months.set(one.month, (months.get(one.month) ?? 0) + 1)
  const spread = [...months.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([m, n]) => `${m}月 ${n}`)
    .join('　')

  console.log(
    `  ${festival.id}（该推到 ${festival.month} 月${festival.universal ? '' : '，前提另有条件'}）：` +
      `演到过的 ${worldsHere}/${worlds} 世（${(reach * 100).toFixed(1)}%）、` +
      `月份可判 ${rows.length} 回、落在 ${festival.month}/${next} 月的 ${(rate * 100).toFixed(1)}%` +
      (spread.length > 0 ? `\n      落在各月：${spread}` : ''),
  )

  if (worldsHere === 0) {
    console.log(
      `  ✗ ${festival.id}：${RUNS} 世里一次也没演到，这一卷的两条判据根本没被验过。` +
        `\n    先看它的 requires 是不是压了一件稀事——节令该是年年有的。`,
    )
    bad += 1
    continue
  }
  /*
   * 三分之一那条线**只管前提只剩年纪的节令**。
   *
   * 一卷节令自己压着别的前提（年节要「分了家 + 侄儿满三岁」），它的到达率
   * 由那些前提决定，跟日历这一层无关——**拿这条线去判它，是把上游的
   * 稀有度算到下游头上**。它的月份那一条照样判（那才是日历这一层的事）。
   */
  if (festival.universal && reach < REACH_FLOOR) {
    console.log(
      `  ✗ ${festival.id}：只有 ${(reach * 100).toFixed(1)}% 的世演到过，不足三分之一。` +
        `\n    它的事件没有压别的前提，所以到达率该由日历这一层决定——` +
        `\n    压这么低说明还有什么在按世卡着，那正是这次改造要拆的东西。`,
    )
    bad += 1
  }
  if (rows.length > 0 && rate < MONTH_FLOOR) {
    console.log(
      `  ✗ ${festival.id}：只有 ${onTime.length}/${rows.length}（${(rate * 100).toFixed(1)}%）` +
        `落在 ${festival.month}/${next} 月，不足九成。` +
        `\n    它的 onEnter 里该有 { type: 'time', untilMonth: ${festival.month} }，且排在 days 前面。`,
    )
    bad += 1
  }
}

console.log(
  `\n  覆盖：${worlds} 世 / ${FESTIVALS.length} 卷节令` +
    `（另有 ${ambiguous} 回两卷同步演、月份读数无意义，已排除）` +
    `\n        （采样点：每一步选完之后读月份。同步的节令已排除，剩下的残噪是非节令的卷也在推日历——` +
    `\n        所以按比例判，不按零容忍判）`,
)
/*
 * 节令把日历推走了多少。**报数不判红。**
 *
 * 这个数没有作者：改任何一卷的目标月、`chance`、窗口都会动它，
 * 而没有哪一层的作者认为自己在决定它——给它定阈值，等于让每一处改动
 * 都可能红在别人头上（同一晚跟 79 归纳的那条）。
 *
 * 印它是因为**多卷节令挤在相邻月份时，代价会悄悄涨**：除夕（12 月）和
 * 年节（1 月）只差一个月，而正月走到腊月是 +11、腊月走到正月是 +1，
 * **顺序决定代价，差十一倍**。加一卷之前先看这个数，
 * 别等玩家觉得日子过得太快。
 */
if (pushes > 0) {
  console.log(
    `        日历被节令推走：共 ${pushed} 个月 / ${pushes} 回，` +
      `平均每回 ${(pushed / pushes).toFixed(1)} 个月、每世 ${(pushed / 12 / Math.max(worlds, 1)).toFixed(2)} 年` +
      `　（报数不判红——这个数没有作者，改哪一卷都会动它）`,
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
   * 每一卷的 `onEnter` 里，`untilMonth` 得排在增量前面。
   *
   * **这一条是「顺序写反」那种坏法的打断验证**——它只在月底那几天分道，
   * 违例率一两成，真跑那一半要二十几个样本才抓得住（`newyear` 那一支里
   * 有那张检出力表）。这里直接查结构，一条就够。
   *
   * `FESTIVALS` 那张表已经保证了「有 `untilMonth`」这件事（没有的卷根本不在表里），
   * 所以这儿只查顺序。**表是空的也要红**——那说明库里一卷节令也没有，
   * 上面所有判据都没有被测对象，而空表跑出来的报表是干净的。
   */
  if (FESTIVALS.length === 0) {
    failed.push('库里一卷带 untilMonth 的节令也没有——所有判据都没有被测对象')
  }
  for (const festival of FESTIVALS) {
    const open = lifeScenes[festival.id]?.nodes[lifeScenes[festival.id]!.entry]
    const times = (open?.onEnter ?? []).filter((one) => one.type === 'time')
    const targetAt = times.findIndex((one) => one.type === 'time' && one.untilMonth !== undefined)
    const deltaAt = times.findIndex(
      (one) => one.type === 'time' && (one.days !== undefined || one.months !== undefined),
    )
    if (targetAt >= 0 && deltaAt >= 0 && targetAt > deltaAt) {
      failed.push(
        `${festival.id}：untilMonth 排在了 days 后面——先推天数再推到那个月，月底那几天会差一年`,
      )
    }
  }

  /*
   * **`universal` 这个豁免不许把所有卷都豁免掉。**
   *
   * 它从内容推导（事件写没写 `requires`），好处是新加节令自动归类；
   * 代价是**给一卷加一条 `requires` 就能让它躲开三分之一那条线**。
   * 一卷一卷加下去，某天所有节令都「另有前提」，那条判据一个对象也不剩，
   * **而报表全绿**——那正是这一支存在的理由被架空的样子。
   *
   * 所以这儿盯着：至少得有一卷是「前提只剩年纪」的。这一条不判具体是哪一卷，
   * 只判**那条线还有没有人受它管**。
   */
  if (FESTIVALS.length > 0 && !FESTIVALS.some((one) => one.universal)) {
    failed.push(
      `${FESTIVALS.length} 卷节令全都「另有前提」，三分之一那条线一个对象也没有了——` +
        `节令该是年年有的，至少有一卷不该压别的条件`,
    )
  }

  if (failed.length > 0) {
    console.log(`\n  ✗ 尺子自检没通过：`)
    for (const one of failed) console.log(`      ${one}`)
    bad += 1
  } else {
    const universal = FESTIVALS.filter((one) => one.universal).length
    console.log(
      `\n  ✓ 尺子自检（5 条算术 + ${FESTIVALS.length} 卷的顺序 + 豁免没被架空）：` +
        `当月推 0、同年往前推、腊月跨到正月不往回拨、九月推八月等到明年；\n` +
        `    目标跟增量同写时先到月再加；每一卷的 untilMonth 都排在 days 前面；\n` +
        `    ${FESTIVALS.length} 卷里有 ${universal} 卷前提只剩年纪，三分之一那条线还有人受它管。`,
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
