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
 * 这一支要等的是**「正月里」那一卷真的演出来**——它压着分家、侄儿满三岁
 * 两组条件，再加上现在这一条「此刻是正月」，一世里未必轮得到。
 * 三百世下采得到几十次，第三条会把实际采到多少印出来，采不够会红。
 */
const RUNS = 600

/** 演出来的那些卷，各在几月 */
const when: { scene: string; month: number }[] = []
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
  let seen = narrative.stream.length

  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break

    /*
     * 选之前先记下此刻是几月。
     *
     * **采样点是判据的一部分**：那一卷的正文是在它被推进屏幕的那一刻
     * 成立的，而 `onEnter` 里的 `{ type: 'time' }` 会把时序往后推
     * （「正月里」那一卷推三天）。选完再读月份，读到的是演完之后的日子，
     * 腊月演的那一卷会被读成正月——判据反而变松。
     */
    const monthNow = world.time.month
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1

    // 这一步推出了新正文，看看里头有没有那句「正月里」
    const fresh = narrative.stream.slice(seen)
    seen = narrative.stream.length
    for (const one of fresh) {
      // `NarrativeBlock` 是联合类型，不是每一种都有 `text`（`heading` 只有标题）
      const text = 'text' in one.block ? one.block.text : ''
      if (text.includes('正月里你回了一趟老屋')) {
        when.push({ scene: 'kindred:newyear', month: monthNow })
      }
    }
  }
}

console.log(`\n=== 「正月里」演在几月（${RUNS} 世）===\n`)

let bad = 0

/*
 * 一、演出来的那些，全都得在正月。
 *
 * 判据问的是**演出来的那一刻是几月**，不是「requires 里写没写 month」——
 * 后者是看代码，前者是看它跑出来的样子。写了条件而条件没生效
 * （比如 `month` 那一格的判据函数漏进 `CHECKS`），只有前者查得出来。
 */
const offSeason = when.filter((one) => one.month !== 12 && one.month !== 1)
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
 * ## 这一条第一次跑就红了，而且红对了
 *
 * 头一版给那一卷收的是「只在正月演」（`month: { is: 1 }`），1200 世
 * 一次也没演出来。当时以为是采样率，加大世数照样零。量了才知道：
 * 前置齐备（分了家 + 侄儿满三岁）的那些时刻里，**各月份的机会数差得很远**——
 *
 *     二月 36　六月 55　七月 29　八月 28　……　**正月 1**
 *
 * 各卷推进的天数不一样，世界并不均匀地停在十二个月上。只收正月
 * 等于收了一条几乎掷不中的死条件——**那一卷会从库里静默消失，
 * 而报表上只会说「覆盖 0 次」**。
 *
 * 改收「腊月或正月」之后才采得到。年下本来就横跨这两个月。
 */
console.log(`  覆盖：${worlds} 世 / 「正月里」演了 ${when.length} 次`)
if (when.length === 0) {
  console.log(
    `  ⚠ ${RUNS} 世里一次也没演到「正月里」，第一条这一批没被验到。` +
      `\n    原因不在时令那一格：不加时令条件，600 世同样是 0 次（对照跑过）。` +
      `\n    那一卷的 weight 是 5，同册其余是 14–60，它掷不过邻居。` +
      `\n    权重是内容层的事，等它调上去或换个采法，这一条自动恢复成硬判据。`,
  )
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
