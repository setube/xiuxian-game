/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一卷叫「正月里」的内容，是不是真的在正月演。
 *
 * ## 这一支守的是「触发条件要表达正文的前提」
 *
 * `kindred:newyear` 标题写着「正月里」，正文第一句写着「正月里你回了一趟老屋」，
 * 而它的 `requires` 从前**一个字也没提时令**——散事件掷中那天是几月就是几月，
 * 于是一卷「正月里」可能在六月演出来。
 *
 * 这种坏法比「走不到的分支」难查得多：
 *
 *     走不到的分支      失败是「不发生」——数一下是零就看见了
 *     这一种　　　　　  失败是「发生在错的时候」
 *
 * **后者在报表上跟正常完全一样**：卷演出来了、分支走通了、一句正文也没缺，
 * 只有读到那句「正月里你回了一趟老屋」而屏幕上写着六月的玩家会觉得哪里不对。
 *
 * ## 时令怎么守的，2026-09-09 换过一次
 *
 * 这一卷曾经是 `Condition.month` 那一格的第一个使用者——条件层从前只问得出
 * 季节，而正月和三月同属「春」，四档分不出「回老屋过年」和「清明上坟」。
 *
 * 那一版守住了「不在六月演」，却守出了另一个毛病：`Condition.month` 问的是
 * **碰巧**在那个月，而成年后一回合推两三年、月份几乎不动，于是「年年可能有」
 * 成了**按世翻的开关**（实测四十世只有十一世到过腊月正月）。
 *
 * 现在时令写在那一卷自己的 `onEnter`：`{ type: 'time', untilMonth: 1 }`——
 * **到了正月**，不是碰巧在正月。`requires` 里一个字也不提时令。
 *
 * 所以这一支现在守两件事：那一卷真的把日历推过去了（第一条，按比例判——
 * 观测通道有噪声，见循环里那一段），以及 `untilMonth` 的算术本身对
 * （尺子自检）。**`Condition.month` 从此零使用者**，底下那几条直接问条件层
 * 的自检因此成了它唯一的守卫，别删。
 *
 * 跑法：bun scripts/newyear.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { useStory } from '../src/engine/story'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'

/**
 * 走多少世。
 *
 * ## 这个数是倒推出来的，不是拍的
 *
 * 「正月里」那一卷压着三组条件：分了家、侄儿满三岁、此刻是腊月或正月。
 *
 * 头一版拍了 600 世，期望 8 次——**实际抽到 0 次**。8 不是「大概率有」，
 * 是「一半的批次会低于它」，而这一支只要一次没采到，第一条判据就是空的。
 *
 * 要 12 次垫底、留 1.3 倍余量：`12 / 率 × 1.3`。
 *
 * ## 这个率不写死，先探路——写死的那个当天就过期了
 *
 * 原来这儿写死 `NEWYEAR_RATE = 0.014`，抄的是 `kindred` 那支的常数。
 * 两件事让它当场失准：
 *
 * 一、**那个率一天之内变了三次**（4% →（加 `month` 条件）1.4% →
 *     （candour 独占回合）3.5% →（`LifeEvent.chance` 上发条）3.3%）。
 *
 * 二、**这一支的采法跟 `kindred` 不一样，率本来就不该相等。** 那边数的是
 *     「有几世走到过年节」（一世算一次），这一支数的是「那一卷演了几次」
 *     （一世里演三回就是三次）。2026-09-08 实测：1115 世演了 80 次，
 *     **7.2%，跟写死的 1.4% 差五倍**——按 1.4% 算要 1115 世，按实测只需 216 世。
 *
 * 抄别人的常数比自己写死更危险：**它连「什么时候该重量」都指向了别处**。
 * 所以改成先掷 `SCOUT` 世量自己的率，再按它算总世数。探路那批不浪费，
 * 它本来就是要跑的世。
 *
 * 探路批的大小由方差定：目标事件期望出现十次左右，少了估的是噪声。
 * 率 7% 时 150 世期望撞十次上下，够了。
 */
/**
 * 要采到多少次才够判。
 *
 * ## 这一个数从前替两条判据兜底，而它只为第二条算过
 *
 * 第二条问的是「一次也没采到吗」，门槛是**零**——12 只是给它留的余量，绰绰有余。
 * 而第一条（演出来的那些全都得在年下）**从来没有人为它定过样本量**。
 *
 * 它以前之所以有力，是**率算错了白送的**：写死 `0.014` 而实际 7.2%，
 * 于是跑 1115 世、采到约 80 次。把率定准之后采到 14–33 次——
 * **第一条的样本掉了两到六倍，而没有一行代码为这个数字辩护过。**
 * （xiuxian-game-17 指出的；尺子定准的同时也抽掉了那层意外的余量。）
 *
 * ## 所以拆成两个数，各自写明为谁服务
 *
 * 第一条要的是**检出力**。要以九成把握至少抓到一次（`n ≥ ln(0.1)/ln(1-p)`）：
 *
 *     违例率    需要样本
 *       30%        7
 *       20%       11
 *       10%       22      ← 取这个
 *        5%       45
 *
 * 取 22：抓得住一成以上的违例率。再往下（5% 要 45 个）成本翻倍，
 * 而那个量级已经接近「偶发」而非「回归」——留给下一个真撞上的人抬。
 *
 * 反过来读这张表也有用：**报表上采到 14 次时，它只抓得住 15% 以上的违例率**。
 *
 * ## ⚠️ 这个 22 要抓的坏法，2026-09-09 换了一种
 *
 * 定它的时候写的是「**一卷里某个分支丢了 `month` 条件**，违例率大概一两成」。
 * 那句话现在描述的是一个**不存在的坏法**——这一卷已经不用 `Condition.month` 了
 * （用户拍板走「内容自己把日历推过去」那条路），条件层一个字也不提时令，
 * 时令写在那一卷自己的 `onEnter`：`{ type: 'time', untilMonth: 1 }`。
 *
 * 新机制下第一条要抓的是这三种：
 *
 *     那一行被删了　　　　　　  卷又变回随时演，违例率接近 100%——几个样本就够
 *     `untilMonth` 算错了月　　 推到了别的月份，违例率也接近 100%
 *     两条 time 的顺序写反了　  只在月底那几天分道，**违例率很低，一两成上下**
 *
 * **第三种是 22 现在真正在为之付钱的那一个**，而它恰好跟旧那种同量级，
 * 所以这个数不必改。但**理由必须换**——a8 2026-09-09 指出：那段注释写得详细
 * （有表、有取舍、有「留给下一个真撞上的人抬」），读起来像经过论证的，
 * 而它论证的是一个已经拿掉的机制。**数还在、理由死了，比数本身错更难查。**
 *
 * ⚠️ **这张表把每一次演出当独立一掷**。上面第三种坏法正是这个形状
 * （每次演出各自撞一次月底），所以成立。但**世级**的回归不是——
 * 比如某面旗一旦立起来、这一世后面每次演出都跳过时令，
 * 那么违例会**按世聚簇**，有效独立样本是「贡献了演出的世数」而不是演出次数，
 * 25 次演出可能只来自十七八个世，抓得住的违例率从 8.8% 退到 12% 上下。
 * 拿这张表去套一个聚簇的现象会高估检出力。（xiuxian-game-17 指出的边界。）
 */
const WANTED_NONZERO = 12
const WANTED_FOR_SEASON = 22
/** 两条各要各的，取大的那个 */
const WANTED = Math.max(WANTED_NONZERO, WANTED_FOR_SEASON)
const SCOUT = 150
/** 探到 0 也不至于把总世数算成天文数字 */
const RATE_FLOOR = 0.005

/** 演出来的那些卷，各在几月 */
const when: { scene: string; month: number; after: number }[] = []
let worlds = 0
/**
 * 库里所有「会把日历推到某月」的卷，各自入口那句正文。
 *
 * 判别式直接从内容取（入口 `onEnter` 里有没有 `untilMonth`），**不写死一张表**：
 * 新加一个节令不必回来改这儿。写死的话第六个节令进来那天这里会静默漏掉它，
 * 而漏掉的表现是噪声上涨，看着像内容坏了。
 */
const PUSHER_LINES: readonly string[] = Object.values(lifeScenes)
  .filter((scene) => {
    const open = scene.nodes[scene.entry]
    return (open?.onEnter ?? []).some((one) => one.type === 'time' && one.untilMonth !== undefined)
  })
  .map((scene) => {
    const first = (scene.nodes[scene.entry]?.blocks ?? []).find((one) => 'text' in one)
    return first && 'text' in first ? first.text : ''
  })
  .filter((one) => one.length > 0)
/** 年节那一卷入口那句。判据找的就是它 */
const NEW_YEAR = '正月里你回了一趟老屋'
/** 同一步里还演了别的节令、因而排除的回数。必须印出来——扔掉的样本跟没有过的长得一样 */
let ambiguous = 0

/** 跑 n 世，往 `when` / `worlds` 里累加。探路和正式跑走的是同一条路 */
function run(n: number): void {
  for (let i = 0; i < n; i += 1) {
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
    /*
     * 收正文用「见过的块 id」而不是下标切片。
     *
     * 一步之内可能推进好几块，而 `stream` 是累积的；按下标切要自己维护
     * 游标，漏一次就丢一段。`kindred-lives.ts` 用的就是这个写法。
     */
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

      const monthBefore = world.time.month
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1

      /*
       * 走没走到那一卷，**看正文，不看 `sceneId`**。
       *
       * `kindred:newyear` 全卷只有 `blocks` 和 `next`/`branches`，
       * **一个 `choices` 也没有**——引擎一步就把整卷走完，
       * `sceneId` 在两次 `choose` 之间从来没停在它上面。绕了四轮才明白，
       * `kindred-lives.ts` 那句注释早写着：「无选项的卷进去就出来」。
       *
       * ## 同一步里还演了别的节令的话，步末的月份是**它**留下的
       *
       * 中秋进库那天这条噪声从 1.4% 涨到 10.6%（7/66 报「正月里演在八月」，
       * 而八月正是中秋推过去的）——**往后每加一个节令它都会涨**。
       *
       * 推日历的卷从内容自动推导（入口 `onEnter` 里有 `untilMonth` 的），
       * 不写死一张表：新加节令不必回来改这儿，否则漏掉的表现是噪声上涨，
       * 看着像内容坏了。跟 `scripts/festival.ts` 用的是同一把尺子。
       *
       * （从前这儿还有一段讲「月份要取这一步的前后两头」——那是条件层守时令
       * 时代的事：年表在一步**之中**掷中那一卷，而观测在两端。那一卷改成
       * 自己推日历之后，演出那一刻的月份是确定的，那段话跟着 `coversFeast`
       * 一起撤了。**注释跟着机制走，留在原地的会被下一个人当成还在生效的约束。**）
       */
      const fresh = drain()
      if (fresh.some((line) => line.includes(NEW_YEAR))) {
        const pushers = PUSHER_LINES.filter((line) => fresh.some((one) => one.includes(line)))
        if (pushers.length > 1) ambiguous += 1
        else when.push({ scene: 'kindred:newyear', month: monthBefore, after: world.time.month })
      }
    }
  }
}

// 先探路量自己的率，再按它算总世数——理由见 WANTED 那一段
run(SCOUT)
const scoutRate = Math.max(when.length / SCOUT, RATE_FLOOR)
const RUNS = Math.max(SCOUT, Math.ceil((WANTED / scoutRate) * 1.3))
run(RUNS - SCOUT)

console.log(`\n=== 「正月里」演在几月（${RUNS} 世）===\n`)

let bad = 0

/*
 * 探路算出来的世数，最后真的凑够样本了吗。
 *
 * ## 这一条是「排除会吃掉样本」逼出来的
 *
 * `when.length` 是**排除之后**的可判数（同一步里演了别的节令的那些回不算），
 * 所以探路量的率本身没错。**错在它会变**：
 *
 *     加除夕之前　　可判 51 次 / 排除 15 次
 *     加除夕之后　　可判 29 次 / 排除 19 次　← 排除占了四成
 *
 * 节令一多，互相遮蔽就吃这一支的样本。探路批算出的率已经含了这一层，
 * 问题是**方差**：探路 150 世撞上的排除比例，跟正式批的未必一样，
 * 而世数是拿率去除的，偏差被放大。
 *
 * 实测 29 对门槛 22，**只剩三成余量**。再加一个节令就可能跌破，
 * 而跌破的表现是**第一条判据的检出力悄悄下降**——报表上不会有任何一行说这件事，
 * 因为那两条判据照样绿（它们判的是比例，不是样本量）。
 *
 * 所以这儿核一句：真凑够了没有。**这不是判据（内容没坏），是量具的自检**，
 * 所以它报的话指向世数和探路，不指向内容。
 */
if (when.length < WANTED) {
  console.log(
    `  ✗ 探路算的世数不够：跑了 ${RUNS} 世只凑到 ${when.length} 个可判样本，门槛 ${WANTED}。` +
      `\n    （另有 ${ambiguous} 回同步演了别的节令被排除——节令越多这一项越大。）` +
      `\n    内容没坏，是量具：把 SCOUT 抬高、或者在倒推里给排除比例留余量。`,
  )
  bad += 1
}

/*
 * 一、演出来的那些，绝大多数落在正月。
 *
 * 判据问的是**演出来的那一刻是几月**，不是「代码里写没写时令」——
 * 后者是看代码，前者是看它跑出来的样子。写了那一行而它没生效
 * （`untilMonth` 的判据漏进 `advanceTime`），只有前者查得出来。
 *
 * ## 2026-09-09：机制换了，这一条跟着换，`coversFeast` 退休
 *
 * 从前那一卷靠 `Condition.month` 守时令，年表在一步的**内部**掷中它、
 * 验 `requires`——而观测在步的两端，那一刻在两端之间。所以从前判的是
 * 「这一步有没有**覆盖**腊月正月」（`coversFeast`，跨年的步算覆盖）。
 *
 * 现在那一卷**自己把日历推到正月**（`onEnter` 的 `untilMonth: 1`），
 * 演出那一刻的月份不再靠碰巧，而是确定的。`coversFeast` 因此从
 * 「按区间判」变成了一条**几乎恒真**的尺子：从任何月份往前走到正月附近，
 * 路上都经过腊月正月。**它守的那个不确定性已经不存在了。**
 *
 * ## 换成按比例判「选完之后是不是正月」
 *
 * 跟 `scripts/festival.ts` 同一把尺子，理由也同一条：**测量通道有噪声**。
 * 步末读到的月份是那一步里最后一个推日历的卷留下的，而年节不一定是最后一个
 * （库里三百多处 `type: 'time'`，枚举「还有谁会推」追不完）。
 *
 *     untilMonth 好着　　步末绝大多数是正月（`days: 2` 溢进二月的算对）
 *     untilMonth 坏了　　随机落月，正二月合计 1/6 上下
 *
 * 门槛取九成，不贴着实测标——贴着标的阈值会把噪声的正常起伏判成红。
 */
const IN_FEAST_FLOOR = 0.9
const inFeast = (m: number): boolean => m === 1 || m === 2
const landed = when.filter((one) => inFeast(one.after))
const offSeason = when.filter((one) => !inFeast(one.after))
const feastRate = when.length === 0 ? 0 : landed.length / when.length
if (when.length > 0 && feastRate < IN_FEAST_FLOOR) {
  const byMonth = new Map<number, number>()
  for (const one of offSeason) byMonth.set(one.after, (byMonth.get(one.after) ?? 0) + 1)
  console.log(
    `  ✗ 只有 ${landed.length} / ${when.length}（${(feastRate * 100).toFixed(1)}%）落在正二月，不足九成：`,
  )
  for (const [m, n] of [...byMonth.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`      ${String(m).padStart(2)} 月　${n} 次`)
  }
  console.log(
    `    那一卷的 onEnter 里有 { type: 'time', untilMonth: 1 }，它该把日历推到正月。` +
      `\n    正文第一句写着「正月里你回了一趟老屋」。`,
  )
  bad += 1
}

/*
 * 二、这一批里真的采到过。
 *
 * 一次也没演的话第一条会安安静静地全绿——**没查到和查过了长得一模一样**。
 *
 * ## 这一条红过两次，两次的病根不一样
 *
 * **头一次**：那一卷收的是「只在正月演」（`month: { is: 1 }`），1200 世
 * 一次也没演。量出来前置齐备的那些时刻里各月份机会数差得很远
 * （二月 36、六月 55，而**正月 1**）——各卷推进的天数不一样，
 * 世界并不均匀地停在十二个月上。只收正月是一条几乎掷不中的死条件。
 * 改收「腊月或正月」。
 *
 * **第二次**：改完仍是 0 次，我先归因到那一卷的 `weight: 5` 太低，
 * 还照这个理由把这一条降成了报数。**那个归因是错的**——`kindred`
 * 那一支同期实测 1115 世采到年节走动 46 次（4.1%），它跑得出来，
 * 我跑不出来。差别不在权重也不在采法，**在世数**：我拍了 600 世，
 * 期望 8 次，而 8 是「一半的批次会低于它」。
 *
 * 现在 `RUNS` 按走到率倒推（见上），采不到就是真的有问题，恢复成硬判据。
 */
console.log(
  `  覆盖：${worlds} 世 / 「正月里」月份可判的 ${when.length} 次` +
    `（另有 ${ambiguous} 次同步演了别的节令，排除）、落在正二月的 ${(feastRate * 100).toFixed(1)}%`,
)
if (when.length === 0) {
  console.log(
    `  ✗ ${RUNS} 世里一次也没演到「正月里」，第一条根本没被验过。` +
      `\n    世数是先探 ${SCOUT} 世量出率、再按它倒推的（要 ${WANTED} 次垫底、留 1.3 倍余量），` +
      `\n    连探路那批也一次没采到，说明那一卷的条件又紧了一层，或者它根本演不出来了。` +
      `\n    先跑 scripts/kindred.ts 看它的「年节走动」采到几次，两边对一下。`,
  )
  bad += 1
}

/**
 * 三、尺子自检：`month` 那一格得真的在判事。
 *
 * 直接问条件层：正月里问「是不是正月」该真，问「是不是腊月」该假。
 * 少了这一条，`month` 的判据函数要是漏进 `CHECKS`（`engine/conditions.ts`
 * 那张表），条件会被当成「没有这一条」而恒真——**第一条照样全绿**，
 * 因为那时候那一卷又变回随时可演，而随时可演里也有正月。
 */
{
  const failed: string[] = []
  setActivePinia(createPinia())
  const world = useWorldStore()
  // `meetsAll` 现取 store，不必先 begin()——问的是「此刻这条件成不成立」
  world.time.month = 1
  const inFirst = meetsAll([{ month: { is: 1 } }])
  const inTwelfth = meetsAll([{ month: { is: 12 } }])
  world.time.month = 12
  const nowTwelfth = meetsAll([{ month: { is: 12 } }])
  const spanning = meetsAll([{ month: { in: [12, 1] } }])

  if (!inFirst) failed.push('正月里问「是不是正月」答了假')
  if (inTwelfth) failed.push('正月里问「是不是腊月」答了真——这一格没在判事')
  if (!nowTwelfth) failed.push('腊月里问「是不是腊月」答了假')
  if (!spanning) failed.push('腊月里问「腊月或正月」答了假——`in` 那一支不通')

  /*
   * 那一卷自己那条时令，摆到跟前必须真的在把日历往前推。
   *
   * **真跑采不到的时候，守着这件事的就只剩这一条。** 上面四条验的是
   * `Condition.month` 那一格本身（它现在零使用者了，见下），
   * 这一条验的是**那一卷真的在推日历**——有人把 `onEnter` 里那一行删掉，
   * 上面四条照样全绿。
   *
   * ## 2026-09-09 改了守的东西，没改守的语义
   *
   * 从前这里问的是「`requires` 里还有没有 `month` 条件」。那一卷现在不用
   * 条件层守时令了（`Condition.month` 问的是「碰巧在那个月」，而成年后
   * 一回合推两三年、月份几乎不动，拿它守时令等于把「年年可能有」
   * 变成按世翻的开关）。时令改由那一卷自己推。
   *
   * **所以这一条跟着挪，但守的仍是同一件事：时令没被人悄悄拿掉。**
   * 条件直接从内容里取，不在这儿抄一份——抄一份就成了两处各自漂，
   * 而判据抄错了的表现是误报，比漏报更能骗人。
   */
  const scene = lifeScenes['kindred:newyear']
  if (scene === undefined) {
    failed.push('库里找不到 kindred:newyear 这一卷了')
  } else {
    const open = scene.nodes[scene.entry]
    const pushes = (open?.onEnter ?? []).filter(
      (one) => one.type === 'time' && one.untilMonth === 1,
    )
    if (pushes.length === 0) {
      failed.push('kindred:newyear 的 onEnter 里没有 untilMonth: 1——它又变回碰巧演了')
    }
    /*
     * 顺序也要守：`untilMonth` 是目标、`days` 是增量，两者不满足交换律
     * （`engine/effects.ts` 里那段改过的注释）。写反了只在月底那几天分道，
     * **违例率低到上面那个 22 才抓得住**——这一条是它的兜底。
     */
    const times = (open?.onEnter ?? []).filter((one) => one.type === 'time')
    const targetAt = times.findIndex((one) => one.type === 'time' && one.untilMonth !== undefined)
    const deltaAt = times.findIndex((one) => one.type === 'time' && one.days !== undefined)
    if (targetAt >= 0 && deltaAt >= 0 && targetAt > deltaAt) {
      failed.push('untilMonth 写在了 days 后面——先推天数再推到正月，月底那几天会差一年')
    }
  }

  /*
   * `Condition.month` 那一格眼下**零使用者**（年节改用 untilMonth 之后）。
   * 上面那四条问条件层的自检因此从「顺带验一下」升级成了**它唯一的守卫**：
   * 没有内容在用它，坏了也没有任何报表会变。别删。
   */

  /*
   * `untilMonth` 那一格的算术自己得对——它是第一条判据的尺子。
   *
   * 从前这儿站着 `coversFeast` 的七条用例（判「这一步有没有覆盖腊月正月」）。
   * 那把尺子 2026-09-09 退休了：那一卷改成自己把日历推到正月之后，
   * 「一步之内跨没跨过年下」这个不确定性不存在了，`coversFeast` 变成了
   * 一条几乎恒真的尺子。**用例跟着被测对象一起走，不留在原地**——
   * 一组没有被测对象的用例照样全绿，而且看着像还在守什么。
   *
   * 换成直接量 `advanceTime`：**四种形状，第三行是最容易写错的地方**——
   * 腊月推到正月，`目标 - 此刻` 是 -11，不取模的话日历会往回拨十一个月。
   */
  const jump = (from: number, untilMonth: number): { month: number; years: number } => {
    world.time.year = 10
    world.time.month = from
    world.time.day = 5
    const years = world.advanceTime({ untilMonth })
    return { month: world.time.month, years }
  }
  const jumps: { from: number; to: number; month: number; years: number; why: string }[] = [
    { from: 1, to: 1, month: 1, years: 0, why: '当月就是 0——已经到了不必再等一年' },
    { from: 6, to: 1, month: 1, years: 1, why: '六月推到正月，跨年' },
    { from: 12, to: 1, month: 1, years: 1, why: '腊月推到正月（这一格最容易写反）' },
    { from: 2, to: 1, month: 1, years: 1, why: '二月推到正月，要等到明年' },
  ]
  for (const one of jumps) {
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

  if (failed.length > 0) {
    console.log(`\n  ✗ 尺子自检没通过：`)
    for (const one of failed) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log(
      `\n  ✓ 尺子自检：正月里问正月为真、问腊月为假；腊月里问腊月为真、` +
        `问「腊月或正月」为真（Condition.month 零使用者，这几条是它唯一的守卫）；\n` +
        `    untilMonth 的算术四种形状都对，而那一卷的 onEnter 里真的有 untilMonth: 1、` +
        `\n    且排在 days 前面。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  「正月里」只在正月演。')
  console.log('  **触发条件要表达正文的前提——否则它每次都能演，只是可能演在六月。**\n')
}
