/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一天走查：他能不能觉得自己在过日子。
 *
 * 到这一步为止，玩家所有的行为都是被事件叫出来的。这一册反过来——
 * 没有人叫他，**他自己决定今天干什么**。
 *
 * 而这一支要验的最要紧的一件事，恰恰是**大多数行动什么也不发生**：
 *
 *     无事　什么也没发生。绝大多数日子都在这一档
 *     处境　家里紧了一点、手上多了个泡、跟谁近了一点
 *     见闻　问出了什么、看见了什么、认识了谁
 *     转折　这一天真的改了后面的路
 *     大事　撞上了一件事，这一天整个被它占了
 *
 * 长尾形状必须存在。每次行动都给知识给属性给奖励，那是操作游戏；
 * 真实的一天最常见的结果本来就是「没什么特别的」——
 * **也正因为如此，真的改变了什么的那些日子才显得要紧。**
 *
 * 跑法：bun scripts/day.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { DOINGS } from '../src/content/days'
import { beatLines, doingsAt, spend, SLOTS, type Slot, type Tier } from '../src/engine/daily'
import { applyEffects } from '../src/engine/effects'
import { fillString } from '../src/engine/interpolate'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { OriginId, RegionState } from '../src/types/game'

import { beOf } from './origin'

/**
 * 走查跑多少天。
 *
 * ## 世数照最稀那一格定，而这一支最稀的一格是「大事」
 *
 * 这一支验的是长尾，那就得让**尾巴上那一格稳定出现**。
 * 「大事」占半个点上下：四百天里期望两三次，三批里有两批是零。
 * 而零在「一档比一档少」那条检查下照样通过——**空的一档
 * 和最少的一档，在那把尺子下长得一模一样。**
 *
 * 期望要到十以上才不会整批落空，反推是两千。
 * 这一支一天只是一次结算，跑得快，两千不心疼。
 */
const RUNS = 2000

/** 太平年景 */
function calm(): RegionState {
  return { rain: 55, harvest: 58, grain: 112, order: 66, plague: 0 }
}

/** 旱灾中段：米铺已经关门，路上不太平 */
function dearth(): RegionState {
  return { rain: 24, harvest: 28, grain: 166, order: 38, plague: 0 }
}

/**
 * 起一个新的人生。
 *
 * **顺序要紧。** 建 character store 会把世界时钟往前跑到他出生那年——
 * 所以府况必须在那之后再设，否则会被出生前那些年的世界演化冲掉。
 * 头一版把两行写反了，结果旱年和丰年抽的是同一个池，
 * 而输出看上去很正常，只是「地是干的」那一条永远不出现。
 */
function fresh(age = 12, origin: OriginId = 'farm', state = calm(), schooled = true) {
  setActivePinia(createPinia())
  beOf(origin)
  const household = useHouseholdStore()
  const world = useWorldStore()
  const character = useCharacterStore()
  usePeopleStore()
  world.bornYear = world.time.year - age
  world.regions = { [household.prefecture]: { state, last: {} } }
  if (schooled) world.setFlag('schooled', true)
  return { character, world, household }
}

const TIERS: readonly Tier[] = ['无事', '处境', '见闻', '转折', '大事']

// —— 一、一天是什么样子 ——
console.log('\n=== 一个十二岁的孩子，自己安排的一天 ===\n')
{
  const { world } = fresh(12, 'farm', dearth())
  const picks: [Slot, string][] = [
    ['上午', 'work'],
    ['下午', 'town'],
    ['傍晚', 'elder'],
  ]
  for (const [slot, doing] of picks) {
    const label = DOINGS.find((d) => d.id === doing)!.label
    console.log(`  【${slot}】${fillString(label)}`)
    world.setFlag(`day-${slot}`, doing)
    const beat = spend(slot, doing)
    if (!beat) {
      console.log('      （这一段没有可落的地方）\n')
      continue
    }
    for (const line of beatLines(beat)) console.log(`      ${fillString(line)}`)
    const echoes = applyEffects(beat.effects)
    for (const block of echoes) {
      if ('text' in block) console.log(`      〔${block.text}〕`)
    }
    console.log(`      ——${beat.tier}\n`)
  }
  console.log('  这一天读起来像一天，而不像三次抽奖。')
}

// —— 二、长尾 ——
// 标题里的次数从常量取。从前这里写死「一万次行动的形状」，
// 而 RUNS 是 400——**差了二十五倍，README 照抄了那句「一万次」**
console.log(`\n=== ${RUNS} 次行动的形状 ===\n`)
{
  const tally = new Map<Tier, number>()
  for (let i = 0; i < RUNS; i += 1) {
    const state = i % 3 === 0 ? dearth() : calm()
    const origin = (['farm', 'hunt', 'cloth', 'craft'] as OriginId[])[i % 4]!
    fresh(7 + (i % 10), origin, state, i % 5 !== 0)
    const slot = SLOTS[i % SLOTS.length]!
    const doings = doingsAt(slot)
    const doing = doings[i % doings.length]!
    const beat = spend(slot, doing.id)
    if (!beat) continue
    tally.set(beat.tier, (tally.get(beat.tier) ?? 0) + 1)
  }

  const total = [...tally.values()].reduce((sum, n) => sum + n, 0)
  const bar = (pct: number) => '█'.repeat(Math.max(1, Math.round(pct / 2)))
  for (const tier of TIERS) {
    const n = tally.get(tier) ?? 0
    const pct = (n / total) * 100
    console.log(`  ${tier}　${String(pct.toFixed(1)).padStart(5)}%  ${bar(pct)}`)
  }

  console.log()
  const shares = TIERS.map((tier) => ((tally.get(tier) ?? 0) / total) * 100)
  const [none, minor, news, turn, big] = shares as [number, number, number, number, number]

  let bad = 0
  if (none < 55) {
    console.log('  ✗ 「无事」不到 55%——每次行动都在给东西，这是台老虎机，不是人生。')
    bad += 1
  }
  /**
   * 空的一档不是「最少的一档」。
   *
   * 下面那条单调收窄的检查有个洞：**一档抽到零，它照样「比上一档少」**，
   * 于是形状检查放行，而实际情况是那条路根本没跑到。
   * 「大事」只占半个点上下，四百世里期望两三个人——
   * 三批里有两批是 0.0%，门禁一次也没响。
   *
   * 所以先查在不在，再查形状。**没抽到和最少长得不一样。**
   */
  for (const tier of TIERS) {
    if ((tally.get(tier) ?? 0) === 0) {
      console.log(`  ✗ 「${tier}」一次也没跑出来——这不是长尾，是断头。`)
      bad += 1
    }
  }
  // 长尾必须是单调收窄的：越往下越少
  for (let i = 1; i < shares.length; i += 1) {
    if (shares[i]! > shares[i - 1]!) {
      console.log(`  ✗ 「${TIERS[i]}」比「${TIERS[i - 1]}」还多——长尾形状不成立。`)
      bad += 1
    }
  }
  if (bad === 0) {
    console.log('  长尾成立：越往下越少，一路收窄。')
    console.log(`  绝大多数日子（${none.toFixed(0)}%）什么也没发生，`)
    console.log(`  只有 ${(turn + big).toFixed(1)}% 真的改了后面的路。`)
  } else {
    process.exitCode = 1
  }
  void minor
  void news
}

// —— 三、同一个去处，不同的年景 ——
console.log('\n=== 同一块地，旱年和丰年不是一件事 ===\n')
{
  for (const [label, state] of [
    ['太平年景', calm()],
    ['旱灾中段', dearth()],
  ] as [string, RegionState][]) {
    const seen = new Map<string, number>()
    for (let i = 0; i < 200; i += 1) {
      fresh(12, 'farm', state)
      const beat = spend('上午', 'work')
      if (!beat) continue
      const first = beatLines(beat)[0]!
      seen.set(first, (seen.get(first) ?? 0) + 1)
    }
    console.log(`  【${label}】去地里干活，头一句是：`)
    for (const [line, n] of [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
      console.log(`      ${String(Math.round((n / 200) * 100)).padStart(3)}%  ${fillString(line)}`)
    }
    console.log()
  }
  console.log('  玩家读的每一句「无事」，同时也是在读这一年的光景。')
}

// —— 四、可做什么，本身就是处境 ——
console.log('\n=== 能去哪儿，本身就是处境的一部分 ===\n')
{
  for (const [label, schooled, hasElder] of [
    ['上着私塾、家里有人管的孩子', true, true],
    ['没上过学的孩子', false, true],
    ['没有人管的孩子', true, false],
  ] as [string, boolean, boolean][]) {
    fresh(12, 'farm', calm(), schooled)
    if (!hasElder) {
      /**
       * 把抚养关系整个摘掉。
       *
       * 关系存在 `relations` 里，不是 `known` 里——`known` 只是「认得谁」，
       * 而「谁在管你」是图上的一条边。头一版清错了字段，
       * 于是这一节印出来的话跟实际跑出来的选项对不上：
       * 嘴上说没人管的孩子看不见这一条，屏幕上它还在。
       */
      const people = usePeopleStore()
      people.relations = []
    }
    const morning = doingsAt('上午').map((d) => fillString(d.label))
    const evening = doingsAt('傍晚').map((d) => fillString(d.label))
    console.log(`  ${label}`)
    console.log(`      上午：${morning.join('　')}`)
    console.log(`      傍晚：${evening.join('　')}`)
  }
  console.log('\n  没上私塾的人没有「去私塾」，没人管的孩子没有「找人说话」。')
  console.log('  这不是锁选项，是他本来就没有那个去处。')
}

// —— 五、去哪儿决定撞上什么 ——
console.log('\n=== 去哪儿，决定你可能撞上什么 ===\n')
{
  /**
   * 这一节的次数单独定，因为它量的是**这一支最稀的那两格**。
   *
   * 「往山那边走走」撞上山道上那个人约四个点，「去镇上」撞上那册书约三个点。
   * 从前跑三百次，那是九个人和十个人——σ 一个百分点上下，
   * 而 README 抄的是「4.5%」「2.9%」这样的写法。
   * **一整册「机缘不是年表发下来的」全靠这两个数说话，而它俩晃着。**
   *
   * 一天只是一次结算，两千次跑几秒，两格都稳到半个点以内。
   */
  const TRIES = 2000
  for (const doing of ['hill', 'town', 'work', 'home']) {
    const omens = new Map<string, number>()
    let n = 0
    for (let i = 0; i < TRIES; i += 1) {
      fresh(13, 'farm', calm())
      const beat = spend('上午', doing)
      if (!beat) continue
      n += 1
      if (beat.omen) omens.set(beat.omen, (omens.get(beat.omen) ?? 0) + 1)
    }
    const label = fillString(DOINGS.find((d) => d.id === doing)!.label)
    const hits =
      omens.size === 0
        ? '什么也撞不上'
        : [...omens.entries()]
            .map(([omen, count]) => `${omen} ${((count / n) * 100).toFixed(1)}%`)
            .join('　')
    console.log(`  ${label.padEnd(14)} ${hits}`)
  }
  console.log('\n  山那边才有山道上那个人，镇上才有货郎摊上那册书。')
  console.log('  **机缘不是年表发下来的，是他自己走过去的。**')
}

console.log()
