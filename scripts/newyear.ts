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
 * ## 它同时是 `Condition.month` 那一格的第一个使用者
 *
 * 条件层从前只问得出季节（`Condition.season`，14 做的），而**正月和三月
 * 同属「春」**——四档分不出「回老屋过年」和「清明上坟」。
 * `types/game.ts` 那条注释早写着「要问得更细就直接问月份」，
 * 而月份那一格一直没人做。这一卷是逼出它的那个使用者。
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
 * 第一条要的是**检出力**：一卷里某个分支丢了 `month` 条件，违例率大概一两成，
 * 这种局部回归才是它真正该抓的（整条被删是率接近 100%，几个样本就够）。
 * 要以九成把握至少抓到一次：
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
       * ## 月份要取「这一步的前后两头」，不是其中一头
       *
       * 那一卷是在 `choose` **之中**被年表掷中的：先验 `requires`（此刻是腊月
       * 或正月），再跑 `onEnter`（`{ type: 'time', days: 2 }` 推两天）。
       * 于是两头都不是「它演出的那一刻」：
       *
       *     选之前　　上一步留下的日子，那一卷还没发生　　400 世里 12 次落在时令外
       *     选之后　　推完两天的日子，正月廿九会变成二月　1115 世里 6 次落在二月
       *
       * 两头取并集才对——**只要有一头在腊月正月，那一卷就是在年下演的**。
       * 一月三十日，推两天正好能跨月，那不是内容的错，是「一步之内时序会走」。
       */
      if (drain().some((line) => line.includes('正月里你回了一趟老屋'))) {
        when.push({ scene: 'kindred:newyear', month: monthBefore, after: world.time.month })
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
 * 一、演出来的那些，全都得在年下。
 *
 * 判据问的是**演出来的那一刻是几月**，不是「requires 里写没写 month」——
 * 后者是看代码，前者是看它跑出来的样子。写了条件而条件没生效
 * （比如 `month` 那一格的判据函数漏进 `CHECKS`），只有前者查得出来。
 *
 * ## 「那一刻」要按一步的**区间**算，不是按两端的点
 *
 * 成年之后 `routine:adult` 一回合推两年、`routine:prime` 推三年
 * （22 量的：22 岁起一世见过的不同月份中位只有 2–5 个）。年表在这一步的
 * **内部**掷中那一卷、验 `requires`、跑 `onEnter`——而我在步的两端观测，
 * 那一刻在两端之间，两端都看不到。实测落在时令外的两次正是这个形状：
 *
 *     47 岁　选前 11 月 → 选后 2 月　（跨三个月，中间必经腊月正月）
 *     35 岁　选前 10 月 → 选后 9 月　（跨将近一年）
 *
 * **这不是内容演错了时候，是判据的观测粒度粗于系统的推进粒度。**
 * 一步跨过了年下，条件就是在年下成立的。所以判「这一步有没有覆盖腊月正月」，
 * 而不是「两端是不是腊月正月」——跨年的步（11 月 → 2 月）算覆盖。
 *
 * 剩下真正该红的形状是：**一步之内没跨过年下，却演了年节**。
 */
const inFeast = (m: number): boolean => m === 12 || m === 1
/** 这一步从 `from` 月走到 `to` 月，路上经过腊月或正月吗。跨年按环形算 */
function coversFeast(from: number, to: number): boolean {
  if (inFeast(from) || inFeast(to)) return true
  // 一步跨了一年以上，十二个月全经过了
  if (to === from) return true
  for (let m = from; m !== to; m = (m % 12) + 1) {
    if (inFeast(m)) return true
  }
  return false
}
const offSeason = when.filter((one) => !coversFeast(one.month, one.after))
if (offSeason.length > 0) {
  const byMonth = new Map<number, number>()
  for (const one of offSeason) byMonth.set(one.month, (byMonth.get(one.month) ?? 0) + 1)
  console.log(`  ✗ ${offSeason.length} 次「正月里」演在了别的月份：`)
  for (const [m, n] of [...byMonth.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`      ${String(m).padStart(2)} 月　${n} 次`)
  }
  console.log(`    那一卷的正文第一句写着「正月里你回了一趟老屋」，只该在腊月或正月演。`)
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
console.log(`  覆盖：${worlds} 世 / 「正月里」演了 ${when.length} 次`)
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
   * 那一卷自己那条时令条件，摆到六月必须不成立。
   *
   * **真跑采不到的时候，守着这件事的就只剩这一条。** 上面四条验的是
   * `month` 这一格本身，这一条验的是**那一卷真的收了这一格**——
   * 有人把 `requires` 里那一行删掉，上面四条照样全绿。
   *
   * 条件直接从内容里取，不在这儿抄一份：抄一份就成了两处各自漂，
   * 而判据抄错了的表现是「误报」，比漏报更能骗人。
   */
  const newyear = lifeEvents.find((one) => one.id === 'kindred-newyear')
  if (newyear === undefined) {
    failed.push('库里找不到 kindred-newyear 这一卷了')
  } else {
    const timing = newyear.requires?.filter((one) => 'month' in one) ?? []
    if (timing.length === 0) {
      failed.push('kindred-newyear 的 requires 里没有时令条件——它又变回随时可演了')
    } else {
      world.time.month = 6
      if (meetsAll(timing)) failed.push('六月里那一卷的时令条件照样成立')
      world.time.month = 1
      if (!meetsAll(timing)) failed.push('正月里那一卷的时令条件反而不成立')
    }
  }

  /*
   * `coversFeast` 自己得分得开对错——它是第一条判据的尺子，
   * 而**一条「跨一年就恒真」的尺子等于没有尺子**。
   *
   * 成年段一步能推两三年，那种步确实覆盖了年下，判它真是对的；
   * 可要是连「三月走到五月」也判真，第一条就再也红不了了。
   */
  const covers: [number, number, boolean, string][] = [
    [12, 12, true, '腊月原地'],
    [1, 1, true, '正月原地'],
    [11, 2, true, '十一月跨到二月，路上经过腊月正月'],
    [1, 2, true, '正月演完推进二月'],
    [3, 5, false, '三月走到五月，没到年下'],
    [6, 9, false, '六月走到九月，没到年下'],
    [2, 11, false, '二月走到十一月，正好绕开年下'],
  ]
  for (const [from, to, want, why] of covers) {
    if (coversFeast(from, to) !== want) {
      failed.push(`${why}：coversFeast(${from}, ${to}) 该是 ${want}`)
    }
  }

  if (failed.length > 0) {
    console.log(`\n  ✗ 尺子自检没通过：`)
    for (const one of failed) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log(
      `\n  ✓ 尺子自检：正月里问正月为真、问腊月为假；腊月里问腊月为真、` +
        `问「腊月或正月」为真；\n` +
        `    六月里那一卷的时令条件不成立、正月里成立——它真的收了这一格。`,
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
