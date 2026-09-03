/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 找：一个凡人怎么从「听说有仙人」走到「站在修仙门前」。
 *
 * ## 修行的第一关不是学不会，是不知道去哪找
 *
 * 这一支刻意不碰功法、炼气、境界——**那些是门里的事**。
 * 这里要验的是门外那一段，而绝大多数人一辈子也没走到门口。
 *
 * 五种结果：
 *
 *   A　找到真线索
 *   B　找到假线索
 *   C　什么也没找到　　← 最常见的一种
 *   D　找到入口但自己放弃
 *   E　找到入口但没有资格
 *
 * 跑法：npx vite-node scripts/seeking.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { LEADS, PLACES } from '../src/content/leads'
import { askAround, crossed, follow, knock, leadsHeard } from '../src/engine/seeking'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'

/**
 * 走查跑多少世。
 *
 * ## 换算到玩家的尺度，跟量得够准，是两件事
 *
 * 「没有人会玩八千世」是对的，可它是一句关于**报什么**的话，
 * 不是一句关于**量多少**的话。这两件事从前混在一起，代价挺大：
 *
 * 头一版跑八千世，报的是「A 占 1.1%」——那个小数点后一位
 * 谁也不会经历。正确的答复是最后一节：把每一格换算成
 * 「玩十世的人有多大概率见过一次」。**那一节现在就在。**
 *
 * 可当时还顺手把世数从八千砍到四百，理由是「四百世够看清形状了」。
 * 不够。A、D、E 各占一个点上下，四百世里各是四五个人，
 * 抽多抽少能差出一倍——于是第六节那张表跟着一起晃：
 * 同一份代码连跑两批，「玩十世能见到 A 一次」一次报 5%，一次报 14%。
 *
 * **砍样本量毁掉的，恰恰是那张要给玩家看的表。**
 *
 * 所以按老规矩重定：世数照最稀那一格定。A 大约百分之一，
 * 要把它量到 ±0.3 个点，得四千世上下——跑完七秒，不值当省。
 * 而报出来的，仍然只报十世尺度上的那一张。
 */
const RUNS = 4000

/** 一个人大概会玩几世。所有分布最后都要换算到这个尺度上 */
const A_PLAYER_PLAYS = 10

let failed = 0

function fresh(insight = 50, root = 50) {
  setActivePinia(createPinia())
  useHouseholdStore()
  const character = useCharacterStore()
  character.attributes = { ...character.attributes, insight, root }
  return { character, world: useWorldStore() }
}

// —— 一、假的比真的多得多 ——
console.log('\n=== 一、他听到的东西里，假的占大头 ===\n')
{
  const byTruth = new Map<string, number>()
  for (const lead of LEADS) {
    byTruth.set(lead.truth, (byTruth.get(lead.truth) ?? 0) + lead.weight)
  }
  const total = [...byTruth.values()].reduce((a, b) => a + b, 0)
  for (const truth of ['假', '半真', '真']) {
    const n = byTruth.get(truth) ?? 0
    console.log(
      `  ${truth}　${String(((n / total) * 100).toFixed(0)).padStart(3)}%  ${'█'.repeat(Math.round((n / total) * 40))}`,
    )
  }
  console.log()
  console.log('  而他分不出来。手里唯一的工具有两样：跑一趟看看，')
  console.log('  或者听第二个人说同一件事——两样都要花时间，都可能白花。')
  console.log()
  console.log('  最要紧的是**假的讲得比真的还清楚**：')
  const fake = LEADS.find((lead) => lead.id === 'the-storyteller')!
  const real = LEADS.find((lead) => lead.id === 'the-march-climb')!
  console.log(`      〔假〕${fake.says}`)
  console.log(`      〔真〕${real.says}`)
  console.log()
  console.log('  编的人不需要顾忌事实，所以他有名有姓有年份。')
  console.log('  而真的那一句，说话的人自己都不知道那是什么。')

  const fakeShare = (byTruth.get('假') ?? 0) / total
  if (fakeShare < 0.4) {
    console.log('\n  ✗ 假消息不到四成——那打听就成了一条可靠的路。')
    failed += 1
  }
}

// —— 二、打听多半什么也听不着 ——
console.log('\n=== 二、问一回，多半什么也听不着 ===\n')
{
  for (const insight of [30, 50, 70]) {
    let got = 0
    for (let i = 0; i < 300; i += 1) {
      fresh(insight)
      if (askAround()) got += 1
    }
    console.log(`  心思 ${insight}　问一回听着东西的：${((got / 300) * 100).toFixed(0)}%`)
  }
  console.log()
  console.log('  心思细的人问得多、问得对——**可这一条帮不了他分辨真假**。')
  console.log('  它只让他听到更多消息，而消息里假的仍然占大头。')
}

// —— 三、跑一趟 ——
console.log('\n=== 三、跟着一条线索跑一趟 ===\n')
{
  for (const place of PLACES) {
    const tally = new Map<string, number>()
    for (let i = 0; i < 200; i += 1) {
      fresh(55)
      const outcome = follow(place.id).outcome
      tally.set(outcome, (tally.get(outcome) ?? 0) + 1)
    }
    const parts = [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => `${key} ${Math.round((n / 200) * 100)}%`)
    console.log(
      `  ${place.calls.padEnd(12)} ${place.real ? '（真的）' : '（没有）'}　${parts.join('　')}`,
    )
  }
  console.log()
  console.log('  世界怎么回应，只看那地方到底是什么，不看他多想找到。')
  console.log('  而**真地方也未必看得出来**——它没有牌子，也没有人迎出来。')
}

// —— 四、门前 ——
console.log('\n=== 四、站在门前，他永远不知道人家凭什么 ===\n')
{
  for (const root of [30, 55, 75, 90]) {
    let taken = 0
    for (let i = 0; i < 200; i += 1) {
      fresh(50, root)
      if (knock(true).outcome === '收下了') taken += 1
    }
    console.log(`  资质 ${String(root).padStart(2)}　收下的：${((taken / 200) * 100).toFixed(0)}%`)
  }
  console.log()
  fresh(50, 40)
  const turned = knock(true)
  for (const block of turned.blocks) {
    if ('text' in block) console.log(`      ${block.text}`)
  }
  console.log()
  console.log('  那个数在他出生那一刻就定了，跟出身、跟努力、跟他有多想都没关系。')
  console.log('  **而他到死也不知道那两根指头摸的是什么。**')
}

// —— 五、五种结果 ——
console.log('\n=== 五、五种结果 ===\n')

const LABELS: Record<string, string> = {
  A: '找到真线索（其中极少数进了门）',
  B: '找到的全是假的，或者跑空了',
  C: '什么也没找到',
  D: '找到入口，自己没进',
  E: '找到入口，人家没收',
}

/** 一个人找了一辈子，最后落在哪一格 */
function oneLife(): { key: string; line: string; heard: number } {
  /**
   * 每个变量各掷各的。
   *
   * 头一版全从 i 派生，结果「他问了几年」和「他到门前进不进」
   * 悄悄相关了——问得少的人恰好也是不进门的那一批，
   * 于是 D 那一格永远是空的。**走查里的变量必须互相独立。**
   */
  const insight = 30 + Math.floor(Math.random() * 50)
  const root = 20 + Math.floor(Math.random() * 75)
  fresh(insight, root)

  /**
   * 他问了几年。
   *
   * **大多数人问一两年就不问了**——场景那一层由「算了」那个选项承载，
   * 这里按同样的形状模拟：一半的人只问一两回，少数人问上五六年。
   */
  const rounds =
    Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 6)
  for (let n = 0; n < rounds; n += 1) askAround()

  const heard = leadsHeard()
  const where = crossed()

  /**
   * 哪儿也去不了。
   *
   * **手里有几句话，跟找到线索是两回事。** 没有两条撞在一起，
   * 他就没有任何理由动身——那些话只是攒在心里，
   * 跟一句也没听着的人比，他多的只是几件说不清的事。
   */
  if (!where) {
    return {
      key: 'C',
      heard: heard.length,
      line:
        heard.length === 0
          ? '问了几年，一句也没问着。'
          : `听着 ${heard.length} 件事，没有两件对得上。哪儿也没去。`,
    }
  }

  const trip = follow(where)
  if (!trip.closer) {
    return { key: 'B', heard: heard.length, line: `两条对上了，跑了一趟——${trip.outcome}。` }
  }

  // 走到门前了。进不进是他自己的事
  const door = knock(Math.random() < 0.8)
  if (door.outcome === '没进去')
    return { key: 'D', heard: heard.length, line: '走到了门前，说自己只是路过。' }
  if (door.outcome === '收下了')
    return { key: 'A', heard: heard.length, line: '走到了门前，人家让他跟上。' }
  return { key: 'E', heard: heard.length, line: '走到了门前，人家摸了摸他的腕子，说不成。' }
}

const shapes: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 }
{
  const samples: Record<string, string> = {}
  /** C 里头听到过东西的有几个。**这一格 README 引着，所以它得有个出处** */
  let heardSomethingButStuck = 0
  for (let i = 0; i < RUNS; i += 1) {
    const { key, line, heard } = oneLife()
    shapes[key] = (shapes[key] ?? 0) + 1
    if (key === 'C' && heard > 0) heardSomethingButStuck += 1
    if (!samples[key]) samples[key] = line
  }

  for (const key of ['C', 'B', 'E', 'A', 'D']) {
    const n = shapes[key] ?? 0
    console.log(
      `  ${key}　${LABELS[key]!.padEnd(30)} ${String(((n / RUNS) * 100).toFixed(1)).padStart(5)}%`,
    )
  }

  /**
   * C 不是一种人，是两种。
   *
   * 「一句也没问着」和「攒了五件事，没有两件对得上」落在同一格里，
   * 可这两个人夜里想的完全不是一回事。README 里写着
   * 「C 里头有一大半人其实听到过东西」——**那句话从前是照着
   * 十世样本用眼睛估的，走查根本不报这个数**，正是「文档自己
   * 犯了自己写的规矩」那一条。这一行让它有个出处。
   */
  const cTotal = shapes.C ?? 0
  const heardShare = cTotal > 0 ? heardSomethingButStuck / cTotal : 0
  console.log(
    `\n  其中 C 那一格里，听到过东西却哪儿也去不了的占 ${(heardShare * 100).toFixed(0)}%——`,
  )
  console.log('  剩下的是问了几年一句也没问着。**这两种人夜里想的不是一回事。**')

  console.log('\n  各举一例：\n')
  for (const key of ['C', 'B', 'A', 'D', 'E']) {
    if (samples[key]) console.log(`  ${key}　${samples[key]}`)
  }

  console.log()
  const atTheDoor = ((shapes.A ?? 0) + (shapes.D ?? 0) + (shapes.E ?? 0)) / RUNS
  if ((shapes.C ?? 0) / RUNS < 0.5) {
    console.log('  ✗ 一半以上的人都找着了什么——那打听就成了一条可靠的路。')
    failed += 1
  } else if (atTheDoor > 0.2) {
    console.log('  ✗ 两成以上的人都走到了门前——那这条路太好走了。')
    failed += 1
  } else {
    console.log(`  走到门前的一共 ${(atTheDoor * 100).toFixed(1)}%。`)
    console.log('  **修行的第一关不是学不会，是不知道去哪找。**')
  }
}

// —— 六、一个玩十世的人看得到什么 ——
/**
 * ## 分布不是玩家会经历的东西
 *
 * 上面那张表是四千世量出来的，可**玩家一辈子玩不了那么多**。
 * 1% 那一格在四千世里是四十个人，在十世里通常一个也没有——
 * 也就是说，**那件事对绝大多数玩家等于不存在**。
 *
 * 所以真正该看的不是「占比多少」，是「玩十世的人有多大概率见过一次」。
 * 这一节把上面每一格都换算到那个尺度上，再跑十世给人读。
 *
 * 换算不能替上一节把数量得准：这一节报的每一个百分数，
 * 精度都是上一节那张表给的。上面晃，这里就跟着晃。
 */
console.log(`\n=== 六、一个玩 ${A_PLAYER_PLAYS} 世的人看得到什么 ===\n`)
{
  for (const key of ['C', 'B', 'E', 'A', 'D']) {
    const p = (shapes[key] ?? 0) / RUNS
    const seen = 1 - (1 - p) ** A_PLAYER_PLAYS
    const bar = '█'.repeat(Math.round(seen * 30))
    console.log(
      `  ${key}　${LABELS[key]!.padEnd(30)} ${String(Math.round(seen * 100)).padStart(3)}%  ${bar}`,
    )
  }
  console.log(`\n  「至少见过一次」的概率。**这才是玩家会经历的那张表。**`)

  const doorOnce =
    1 - (1 - ((shapes.A ?? 0) + (shapes.D ?? 0) + (shapes.E ?? 0)) / RUNS) ** A_PLAYER_PLAYS
  console.log(`\n  玩 ${A_PLAYER_PLAYS} 世，至少站到过一次门前：${Math.round(doorOnce * 100)}%`)
  console.log(`  也就是说有 ${Math.round((1 - doorOnce) * 100)}% 的人玩完十世，连门口都没见过。`)

  console.log(`\n  那 ${A_PLAYER_PLAYS} 世具体是什么样：\n`)
  for (let i = 0; i < A_PLAYER_PLAYS; i += 1) {
    const { key, line } = oneLife()
    console.log(`    ${String(i + 1).padStart(2)}　〔${key}〕${line}`)
  }
  console.log('\n  十世里多半整整齐齐全是 C。**而那正是这一册要的样子**——')
  console.log('  一个人打听了一辈子什么也没打听着，是常态，不是失败。')
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  他听到的多半是假的，跑一趟多半白跑，而走到门前的是极少数——')
  console.log('  其中还有一部分自己没进去，另一部分被人摸了摸腕子打发回来。\n')
}
