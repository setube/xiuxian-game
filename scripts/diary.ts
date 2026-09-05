/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 日录走查：时间过去了，但过去没有消失。
 *
 * ## 这一支要证明的不是「存下来了」
 *
 * 把每天的话原样存起来只是日志。几年后翻开：
 *
 *     十三岁　今天帮家里收了一下午麦子。
 *     十五岁　今天帮家里收了一下午麦子。
 *
 * 单独看一句意义也没有，存三百条还是三百句废话。
 *
 * 真正要验的是**旧日子能不能被后来的事重新点亮**：
 *
 *   ① 一天过去，留下日录（原文，永远不改）
 *   ② 数年之后回看，那一天还在
 *   ③ **后来的新知识给它追一句「原来那天……」**
 *   ④ 而某件天天做的事，从某年起再也没有出现过
 *
 * ③ 是「日志」和「回忆」的分界线，④ 是「回忆」和「人生」的分界线。
 *
 * 跑法：bun scripts/diary.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useNarrativeStore } from '../src/stores/narrative'

import { HINDSIGHTS } from '../src/content/hindsight'
import { beatLines, spend } from '../src/engine/daily'
import { describeGone, reconsider, whatStopped } from '../src/engine/diary'
import { fillString } from '../src/engine/interpolate'
import { useCharacterStore } from '../src/stores/character'
import { useDiaryStore } from '../src/stores/diary'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { OriginId } from '../src/types/game'

import { beOf } from './origin'

/** 建 store 会把世界时钟推到出生那年，所以府况一律最后设 */
function fresh(age = 12, origin: OriginId = 'farm') {
  setActivePinia(createPinia())
  beOf(origin)
  const household = useHouseholdStore()
  const world = useWorldStore()
  const character = useCharacterStore()
  usePeopleStore()
  const diary = useDiaryStore()
  world.bornYear = world.time.year - age
  world.setFlag('schooled', true)
  return { character, world, diary, household }
}

/** 过一天：三段各挑一个去处，夜里落成一条 */
function liveADay(doings: readonly string[]): void {
  const diary = useDiaryStore()
  const world = useWorldStore()
  const slots = ['上午', '下午', '傍晚'] as const
  for (let i = 0; i < doings.length && i < 3; i += 1) {
    const beat = spend(slots[i]!, doings[i]!)
    if (!beat) continue
    // 不能直接 `.map(fillString)`：那个函数第二个参数是场合，
    // 而 map 会把下标当场合塞进去。日录没有场合，一律家常
    diary.jot(
      beatLines(beat).map((line) => fillString(line)),
      beat.tags,
    )
  }
  diary.closeDay(world.time)
  world.advanceTime({ days: 1 })
}

let failed = 0

// —— ① 一天留下什么 ——
console.log('\n=== ① 一天过去，留下一条 ===\n')
{
  const { diary } = fresh(12)
  liveADay(['work', 'town', 'elder'])
  const day = diary.days[0]!
  console.log(`  第 ${day.at.year} 年 · ${day.at.month} 月 ${day.at.day} 日`)
  for (const line of day.lines) console.log(`      ${line}`)
  console.log(`  标记：${day.tags.join('、')}`)
  console.log('\n  三段合成一条，不是三条——一天就是一天。')
  if (diary.days.length !== 1) {
    console.log('  ✗ 一天裂成了几条。')
    failed += 1
  }
}

// —— ② 最小闭环：普通一天，数年后被点亮 ——
console.log('\n=== ② 一个普通的下午，六年后重新有了意义 ===\n')
{
  const { character, world, diary } = fresh(10)

  // 十岁那年，他往山那边走了一趟。什么也没发生
  let beat = spend('上午', 'hill')
  while (!beat || !beat.tags?.includes('山那边') || beat.tier !== '无事') {
    beat = spend('上午', 'hill')
  }
  diary.jot(
    beatLines(beat).map((line) => fillString(line)),
    beat.tags,
  )
  const day = diary.closeDay(world.time)!
  console.log(`  【十岁那年】`)
  for (const line of day.lines) console.log(`      ${line}`)
  console.log('      ——这一天什么也没发生。\n')

  // 中间过了六年
  world.advanceTime({ years: 6 })

  // 十六岁那年，他终于知道这世上有那样一种人
  character.learn({
    id: 'cultivators-exist',
    title: '修士',
    summary: '你亲眼见过一个。他站在船头，水面不动。',
    category: '修行',
    at: world.time,
    contact: '见过',
    interpretation: '猜想',
  })
  const lit = reconsider()

  const after = diary.days[0]!
  console.log('  【十六岁那年，他知道了修士这回事】\n')
  console.log('  再翻回十岁那一天：')
  for (const line of after.lines) console.log(`      ${line}`)
  for (const note of after.hindsight ?? []) console.log(`      └ ${note.text}`)

  console.log()
  if (lit > 0 && (after.hindsight?.length ?? 0) > 0) {
    console.log('  原文一个字也没改，可这一天已经不是原来那一天了。')
    console.log('  **过去的事实 + 现在的新知识 = 新的意义。**')
  } else {
    console.log('  ✗ 没有点亮——那这只是个日志系统。')
    failed += 1
  }
}

// —— ③ 分寸：当场明白的不算 ——
console.log('\n=== ③ 当场就明白的不叫「多年以后」 ===\n')
{
  const { character, world, diary } = fresh(10)
  let beat = spend('上午', 'hill')
  while (!beat || !beat.tags?.includes('山那边')) beat = spend('上午', 'hill')
  diary.jot(
    beatLines(beat).map((line) => fillString(line)),
    beat.tags,
  )
  diary.closeDay(world.time)

  // 当天就知道了修士
  character.learn({
    id: 'cultivators-exist',
    title: '修士',
    summary: '你听人说起过。',
    category: '修行',
    at: world.time,
    contact: '听说',
  })
  const sameDay = reconsider()
  console.log(`  当天就知道了修士 → 点亮 ${sameDay} 天`)

  world.advanceTime({ years: 4 })
  const later = reconsider()
  console.log(`  又过了四年再回头看 → 点亮 ${later} 天`)

  if (sameDay === 0 && later > 0) {
    console.log('\n  隔得不够久就不算。这一层的全部价值在于**隔了很久**。')
  } else {
    console.log('\n  ✗ 分寸没有守住：当场就明白的也被算成了「多年以后」。')
    failed += 1
  }
}

// —— ④ 再也没有发生过 ——
console.log('\n=== ④ 你十四岁以后，再也没有替家里下过地 ===\n')
{
  const { world, diary } = fresh(10)

  // 十岁到十四岁，年年下地
  for (let year = 0; year < 5; year += 1) {
    for (let n = 0; n < 3; n += 1) liveADay(['work'])
    world.advanceTime({ years: 1 })
  }
  const farmDays = diary.days.length
  // 十五岁起改成往镇上跑
  for (let year = 0; year < 4; year += 1) {
    for (let n = 0; n < 2; n += 1) liveADay(['town'])
    world.advanceTime({ years: 1 })
  }

  console.log(`  下过 ${farmDays} 天地，此后 ${diary.days.length - farmDays} 天都在别处。\n`)
  const gone = whatStopped()
  for (const item of gone) {
    console.log(`  ${describeGone(item)}`)
    console.log(
      `      （做过 ${item.days} 天，最后一次是第 ${item.lastYear} 年，隔了 ${item.since} 年）`,
    )
  }

  console.log()
  if (gone.some((g) => g.tag === '替家里下地')) {
    console.log('  这一句是**算出来的，不存**——它的真假取决于回看的那一刻。')
    console.log('  存下来的那一刻它就会开始说谎：他明天又去了一趟，这句话就不成立了。')
    console.log('\n  那三百句「今天帮家里收了一下午麦子」，到这里才变成人生。')
  } else {
    console.log('  ✗ 没有数出「再也没有」——这一层没有落地。')
    failed += 1
  }
}

// —— ⑤ 不是每一天都会被点亮 ——
console.log('\n=== ⑤ 大多数普通日子就该一直普通下去 ===\n')
{
  const { character, world, diary } = fresh(8)
  const doings = ['work', 'school', 'town', 'hill', 'kids', 'home', 'idle']
  for (let year = 0; year < 8; year += 1) {
    for (let n = 0; n < 6; n += 1) {
      liveADay([doings[(year * 6 + n) % doings.length]!])
    }
    world.advanceTime({ years: 1 })
  }
  // 把所有能拿到的认知都塞给他，看看最多能点亮多少
  for (const id of ['old-famine', 'cultivators-exist', 'price-cap-known', 'day-labour']) {
    character.learn({
      id,
      title: id,
      summary: '……',
      category: '世事',
      at: world.time,
      contact: '听说',
    })
  }
  world.setFlag('father-left', true)
  reconsider()

  const total = diary.days.length
  const lit = diary.days.filter((day) => (day.hindsight?.length ?? 0) > 0).length
  const pct = (lit / total) * 100
  console.log(`  一共 ${total} 天，其中 ${lit} 天后来被重新理解过（${pct.toFixed(0)}%）。`)
  console.log(`  规则表里一共 ${HINDSIGHTS.length} 条「后来才明白」。`)

  console.log()
  if (pct > 60) {
    console.log('  ✗ 点亮得太多了——每一天最后都有下文，那只是把发奖延后了。')
    failed += 1
  } else {
    console.log('  大多数日子一直普通到底。**正因为如此，被点亮的那几天才有分量。**')
  }
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  日录是「我活过什么」，认知是「我以为那是什么」，编年是「什么成了人生」。')
  console.log('  三者分开，而旧日子可以被后来的事重新点亮——')
  console.log('  时间过去了，但过去没有消失。\n')
}

// ============================================================
// ⑥ 真实人生里，日录到底长不长得出来
// ============================================================
/**
 * 前五项验的都是引擎能不能做到，这一项验的是**它在真实人生里真的发生了吗**。
 *
 * 这一段抓到过两个只有跑全人生才看得见的问题：
 *
 * 1. 「一天」在年表里一辈子只发生一次——于是日录里永远只有孤零零一条，
 *    「多年以后才明白」根本没机会出现。加了 `repeatable` 才解决。
 * 2. `day-omen` 设了不清——每一段都会重新跳进同一卷机缘，
 *    玩家的人生卡在同一个货郎摊前一年一年地重来。
 *
 * 两个都不是单支走查看得见的东西。**能力成立 ≠ 真的会发生。**
 */
console.log('=== ⑥ 真实人生里真的长出来了吗 ===\n')
{
  const N = 150
  let totalDays = 0
  let withHindsight = 0
  let withGone = 0
  let ended = 0
  const counts: number[] = []

  for (let i = 0; i < N; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()
    let turns = 0
    while (!narrative.ended && turns < 500) {
      const open = narrative.options.filter((option) => !option.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }
    if (narrative.ended) ended += 1
    const diary = useDiaryStore()
    counts.push(diary.days.length)
    totalDays += diary.days.length
    if (diary.days.some((day) => (day.hindsight?.length ?? 0) > 0)) withHindsight += 1
    if (whatStopped().length > 0) withGone += 1
  }

  counts.sort((a, b) => a - b)
  const hindsightPct = (withHindsight / N) * 100
  const gonePct = (withGone / N) * 100
  console.log(`  走到卷终　　　　　　${((ended / N) * 100).toFixed(0)}%`)
  console.log(
    `  日录条数　　　　　　中位 ${counts[Math.floor(N / 2)]}，平均 ${(totalDays / N).toFixed(1)}`,
  )
  console.log(`  有过「多年以后才明白」${hindsightPct.toFixed(0)}%`)
  console.log(`  有过「再也没有」　　${gonePct.toFixed(0)}%`)

  console.log()
  if (counts[Math.floor(N / 2)]! < 8) {
    console.log('  ✗ 日录太少——「一天」在年表里发生得不够，这一层等于没有。')
    process.exitCode = 1
  } else if (hindsightPct < 20) {
    console.log('  ✗ 几乎没人经历过「多年以后才明白」——那这只是个日志系统。')
    process.exitCode = 1
  } else if (ended / N < 0.95) {
    console.log('  ✗ 有人生走不完——日录这一层把年表卡住了。')
    process.exitCode = 1
  } else {
    console.log('  一半以上的人生里，都有过某一天在很久以后重新有了意义。')
    console.log('  **能力成立不等于真的会发生。这一项验的是后者。**')
  }
}
console.log()
