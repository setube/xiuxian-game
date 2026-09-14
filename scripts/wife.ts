/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 她：天天在场的那个人，被看见了吗。
 *
 * 跑法：`bun scripts/wife.ts`
 *
 * ## 这一支补的是一个占齐三样的空档
 *
 * `wife` 那一章 2026-09-14 一手量下来落在最坏的一格：
 *
 * ```
 * marks: []          坏了世界里一个字也不变
 * 无专属判据          唯一扫到它的是 subject.ts，而那一支【报数不判红】
 * ```
 *
 * ⚠️ **「有门禁在看」和「那支门禁会因为它红」是两件事。**
 * 全库四章 `marks: []`，另外三章（`festival` / `playmate` / `relic`）
 * 都有会判红的判据，只有这一章没有。
 *
 * ## 它验的是那一册自己写下的承诺
 *
 * 那一册的由来是三个一手量的数：
 *
 * ```
 * 她的 doing 一辈子变过几种   1 种
 * 引擎给了她性情，六种都出     而【零处内容读它】
 * 她一辈子说过六句话           全在同一个晚上
 * ```
 *
 * 对照表（全库读性情的处数）：娘 10 · 哥 8 · 儿子 7 · 侄儿 4 ·
 * 田主 2 · 嫂子 2 · **配偶 0**。
 *
 * 所以这一支问：
 *
 * ```
 * 一  内容层真的读她的性情了吗      那是这一册存在的理由
 * 二  六种性情【六支都走得到】吗    五支 branches + 温和走兜底
 * 三  两卷真世里都演得到吗          门槛是零
 * 四  分流问的是【她】的性情吗      问成别人的就是另一回事了
 * ```
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { flagKey } from '../src/engine/facts'
import { useStory } from '../src/engine/story'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'
import type { SceneNode, Temper } from '../src/types/game'

const TEMPERS: readonly Temper[] = ['谨慎', '温和', '刚硬', '精明', '木讷', '暴躁']
let bad = 0

console.log(`\n=== 她：天天在场的那个人，被看见了吗 ===\n`)

// —— 一、内容层真的读她的性情了吗 ——
{
  let reads = 0
  const elsewhere = new Map<string, number>()
  for (const scene of Object.values(lifeScenes)) {
    for (const node of Object.values(scene.nodes) as SceneNode[]) {
      const asks = [
        ...(node.branches ?? []).flatMap((one) => one.requires ?? []),
        ...(node.choices ?? []).flatMap((one) => one.requires ?? []),
        ...(node.seen ?? []).flatMap((one) => one.requires ?? []),
      ]
      for (const one of asks) {
        const who = one.temper?.id
        if (who === undefined) continue
        if (who === 'spouse') reads += 1
        else elsewhere.set(who, (elsewhere.get(who) ?? 0) + 1)
      }
    }
  }
  const others = [...elsewhere.entries()].sort((a, b) => b[1] - a[1])
  console.log(`  ·  全库读性情：` + others.map(([k, v]) => `${k} ${v}`).join('，') + `，spouse ${reads}`)
  if (reads === 0) {
    console.log(`  ✗ 一处也没有内容读她的性情——那一册存在的理由没了。`)
    console.log(`      （立册时的对照表：娘 10 · 哥 8 · 儿子 7 · 侄儿 4 · 田主 2 · 嫂子 2 · 配偶 0）`)
    bad += 1
  } else {
    console.log(`  ✓ 内容层读她的性情 ${reads} 处。`)
  }
}

// —— 二、六种性情六支都走得到 ——
{
  const node = lifeScenes['wife:her-own-way']?.nodes['open']
  if (node === undefined) {
    console.log(`  ✗ 尺子自检：找不到 wife:her-own-way#open——结构变了。`)
    bad += 1
  } else {
    const asked = new Set(
      (node.branches ?? []).flatMap((one) =>
        (one.requires ?? []).flatMap((c) => c.temper?.in ?? []),
      ),
    )
    const fallback = node.next
    /*
     * ⚠️ 兜底那一支【也算一支】。
     *
     * 五条 `branches` 各问一种性情，第六种（温和）走 `next`。
     * 只数 `branches` 会得出「六种只覆盖了五种」——**而那是错的**，
     * 兜底正是第六种的去处。
     *
     * 真正该红的是：**有一种性情既不在 branches 里，又没有兜底**。
     */
    const missing = TEMPERS.filter((one) => !asked.has(one))
    if (missing.length > 1 || (missing.length === 1 && fallback === undefined)) {
      console.log(`  ✗ ${missing.join('、')} 这几种性情没有去处（兜底 ${fallback ?? '没有'}）。`)
      bad += 1
    } else {
      console.log(
        `  ✓ 六种性情都有去处：${asked.size} 支分流 ＋ 兜底「${missing.join('') || '无'}」→ ${fallback ?? '—'}。`,
      )
    }
  }
}

// —— 四、分流问的是【她】的性情 ——
{
  const node = lifeScenes['wife:her-own-way']?.nodes['open']
  const wrong = (node?.branches ?? [])
    .flatMap((one) => one.requires ?? [])
    .map((one) => one.temper?.id)
    .filter((one) => one !== undefined && one !== 'spouse')
  if (wrong.length > 0) {
    console.log(`  ✗ 那一节问的是别人的性情：${wrong.join('、')}`)
    bad += 1
  } else {
    console.log(`  ✓ 分流问的是 spouse 自己的性情。`)
  }
}

// —— 三、两卷真世里都演得到 ——
{
  const RUNS = 300
  const EVENTS = ['wife-her-own-way', 'wife-that-winter'] as const
  const fired = new Map<string, number>()
  let married = 0

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
    while (!narrative.ended && turns < 240) {
      const open = narrative.options.filter((one) => !one.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }
    if (world.hasFlag(flagKey('event', 'match-wed'))) married += 1
    for (const id of EVENTS) {
      if (world.hasFlag(flagKey('event', id))) fired.set(id, (fired.get(id) ?? 0) + 1)
    }
  }

  console.log(`  ·  ${RUNS} 世：` + EVENTS.map((id) => `${id} ${fired.get(id) ?? 0} 世`).join('，'))
  const dead = EVENTS.filter((id) => (fired.get(id) ?? 0) === 0)
  if (dead.length > 0) {
    console.log(`  ✗ ${dead.join('、')} 一世也没演到——写在库里而真跑不到。`)
    console.log(`      ⚠️ 前提多的卷要【逐条单独问】才分得出「哪一条太严」和「它们凑不齐」：`)
    console.log(`      that-winter 那四条单独看都不稀有（117–222/300），是交集低。`)
    bad += 1
  } else {
    console.log(`  ✓ 两卷都演得到。`)
  }
  void married
}

console.log(bad === 0 ? `\n  ✓ 她那一册，四件事都对。\n` : `\n  ✗ ${bad} 项不成立。\n`)
if (bad > 0) process.exitCode = 1
