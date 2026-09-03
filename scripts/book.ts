/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 庙前那册书：长期机缘走查。
 *
 * `omen:wounded` 证明了五节点框架成立，这一支要证明它
 * **装得下性质完全相反的一种机缘**：
 *
 *   山道：看见人 → 判断 → 是否管 → 行动 → 当场知道结果
 *   旧书：看见书 → 判断 → 是否在意 → 是否取得 → 揣十年 → 多年后才明白
 *
 * 验收四条：
 *
 *   ① 看到书时可以形成不同的 reading
 *   ② reading 可以是错的
 *   ③ 「是否在意」与 reading 分离——引擎不拿判断去卡选项
 *   ④ 错误认知可以长期保存，直到多年以后被新的经历修正
 *
 * 最后看一个指标：**同一册书，不同的人生路径能不能长出不同的认知历史。**
 *
 * 跑法：npx vite-node scripts/book.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import {
  appraise,
  nameIt,
  rollBookTruth,
  type BookReading,
  type BookTruth,
} from '../src/engine/book'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { KnowledgeEntry, Trade } from '../src/types/game'

/**
 * 走查跑多少次。
 *
 * ## 世数照最稀那一格定，而这一支最稀的一格是「揣了一辈子，始终以为是旧纸」
 *
 * 这一支报的是一张七八行的人生分布表，**而 README 把整张表抄了过去**，
 * 一路抄到小数位。表尾那两行各占六七个点，三百次里是二十个人上下，
 * σ 有一个半百分点——「6.0%」这个写法比它量得准的东西多了一位。
 *
 * 一次结算跑得快，三百次五秒。两千次三十几秒，
 * 换来的是那张表说的话跟它印出来的位数对得上。
 */
const RUNS = 2000

function fresh(trade: Trade = '农户', literate = true, insight = 45) {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  const character = useCharacterStore()
  const world = useWorldStore()
  household.trade = trade
  character.attributes = { ...character.attributes, insight }
  if (literate) {
    character.learn({
      id: 'literacy',
      title: '识字',
      summary: '你认得字。',
      category: '世事',
      at: world.time,
      contact: '亲历',
      interpretation: '确信',
    })
  }
  return { household, character, world }
}

function bookEntry(): KnowledgeEntry | undefined {
  return useCharacterStore().knowledge.find((k) => k.id === 'the-pedlar-book')
}

function show(entry: KnowledgeEntry): string {
  const wrong = entry.mistaken ? ' · 他不知道自己错了' : ''
  return `〔${entry.contact} · ${entry.interpretation}${wrong}〕${entry.summary}`
}

let failed = 0

// —— ① 同一册书，不同的人看出不同的东西 ——
console.log('\n=== ① 三个人站在同一个摊子前，看见的是三册不同的书 ===\n')
{
  const CASES: [string, Trade, boolean, number][] = [
    ['药铺的孩子', '药铺', true, 45],
    ['商户的孩子', '商户', true, 45],
    ['农家的孩子（认字）', '农户', true, 45],
    ['农家的孩子（不认字）', '农户', false, 45],
    ['心思很细的孩子', '农户', true, 68],
  ]
  for (const [label, trade, literate, insight] of CASES) {
    const tally = new Map<BookReading, number>()
    for (let i = 0; i < 200; i += 1) {
      fresh(trade, literate, insight)
      const seen = appraise('符书')
      tally.set(seen.reading, (tally.get(seen.reading) ?? 0) + 1)
    }
    const parts = [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([reading, n]) => `${reading} ${Math.round((n / 200) * 100)}%`)
    console.log(`  ${label.padEnd(20)} ${parts.join('　')}`)
  }
  console.log('\n  同一册符书：药铺的孩子看见方子，商户的孩子看见账，不认字的只看见纸。')
}

// —— ② reading 可以是错的 ——
console.log('\n=== ② 判断可以是错的，而且当场不揭晓 ===\n')
{
  const TRUTHS: BookTruth[] = ['废纸', '符书', '账册', '药方', '残卷', '禁书']
  let anyRight = false
  let anyWrong = false
  for (const truth of TRUTHS) {
    let wrong = 0
    for (let i = 0; i < 200; i += 1) {
      fresh('农户', true, 45)
      if (appraise(truth).mistaken) wrong += 1
    }
    const rate = (wrong / 200) * 100
    if (rate < 100) anyRight = true
    if (rate > 0) anyWrong = true
    console.log(`  真相【${truth}】　读错的：${rate.toFixed(0)}%`)
  }
  if (!anyRight || !anyWrong) {
    console.log('\n  ✗ 判断不是全对就是全错——那就不叫判断了。')
    failed += 1
  } else {
    console.log('\n  没有哪一种真相是必然读对或必然读错的。')
  }
}

// —— ③ 兴趣与判断分离 ——
console.log('\n=== ③ 「是否在意」与「读成什么」是分开的 ===\n')
{
  /**
   * 这一条不做统计，做**静态检查**。
   *
   * 统计只能说明「目前没有相关性」，证明不了「引擎不会拿判断去卡选项」。
   * 而后者是一条结构性质：`interest` 那一节的四个选项若带上 `requires`，
   * 兴趣就被引擎替玩家决定了——把它钉在场景数据上才拦得住以后的人。
   */
  const scene = lifeScenes['omen:book']!
  const interest = scene.nodes['interest']!
  const gated = (interest.choices ?? []).filter((choice) => choice.requires !== undefined)
  const hasBranches = interest.branches !== undefined

  console.log(`  interest 一节共 ${interest.choices?.length ?? 0} 个选项：`)
  for (const choice of interest.choices ?? []) {
    console.log(`    ○ ${choice.label}`)
  }
  if (gated.length === 0 && !hasBranches) {
    console.log('\n  没有一个带条件，也没有分流。读成废纸的人照样可以买，')
    console.log('  看出「不该声张」的人照样可以走开——决定权整个在玩家手里。')
  } else {
    console.log(`\n  ✗ ${gated.length} 个选项带了条件${hasBranches ? '，而且有分流' : ''}——`)
    console.log('  兴趣被引擎替玩家决定了。')
    failed += 1
  }
}

// —— ④ 错误认知能不能揣很多年 ——
console.log('\n=== ④ 同一册书，四种人生，四种认知历史 ===\n')
{
  /**
   * 走一趟：看见 → 判断 → 做事 →（可能）多年以后被点破。
   *
   * `wants` 钉死他这一次读成什么——`appraise()` 是带权重的一掷，
   * 不钉的话标签会跟实际掷出来的对不上，**走查自己先说了谎**。
   */
  function live(
    label: string,
    truth: BookTruth,
    trade: Trade,
    wants: BookReading,
    acts: readonly ('买' | '问' | '守' | '走')[],
    reachFerry: boolean,
  ): void {
    const { character, world } = fresh(trade, true, 45)
    world.setFlag('pedlar-book', truth)
    let seen = appraise(truth)
    for (let i = 0; i < 400 && seen.reading !== wants; i += 1) seen = appraise(truth)
    world.setFlag('pedlar-book-reading', seen.reading)
    character.learn({
      id: 'the-pedlar-book',
      title: '庙前买的那册书',
      summary: seen.believes,
      category: '器物',
      at: world.time,
      contact: '见过',
      interpretation: '猜想',
      mistaken: seen.mistaken ? '事实' : undefined,
    })

    const trail: string[] = [`看见时：${show(bookEntry()!)}`]
    for (const act of acts) {
      applyEffects([{ type: 'book', act }])
      const entry = bookEntry()
      if (entry) trail.push(`${act}　　　${show(entry)}`)
    }
    if (reachFerry) {
      applyEffects([{ type: 'book-named' }])
      trail.push(`渡口　　${show(bookEntry()!)}`)
    }

    console.log(`  ${label}　（真相【${truth}】，他读成【${seen.reading}】）`)
    for (const line of trail) console.log(`      ${line}`)
    const held = character.inventory.find((item) => item.id === 'pedlar-book')
    if (held) {
      console.log(
        `      行囊里：${held.name}${held.formerName ? `（原先叫「${held.formerName}」）` : ''}`,
      )
    }
    console.log()
  }

  live('A　误读 → 买下 → 揣着 → 十六岁被点破', '符书', '农户', '值钱的', ['买', '守'], true)
  live(
    'B　读对方向 → 问 → 买下 → 揣着，没走到渡口',
    '残卷',
    '农户',
    '古怪的字',
    ['问', '买', '守'],
    false,
  )
  live('C　没在意，走开了', '残卷', '农户', '古怪的字', ['走'], false)
  live('D　误读成账册 → 去问 → 问出了别的东西', '符书', '客栈', '账册', ['问', '买', '守'], false)
}

// —— 认知历史真的不一样吗 ——
console.log('=== 同一册书能长出多少种认知历史 ===\n')
{
  const endings = new Map<string, number>()
  let misreadHeld = 0
  let corrected = 0
  let held = 0

  for (let i = 0; i < RUNS; i += 1) {
    const trade = (['农户', '商户', '药铺', '客栈', '官宦'] as Trade[])[i % 5]!
    const { character, world } = fresh(trade, i % 7 !== 0, 40 + (i % 30))
    const truth = rollBookTruth()
    world.setFlag('pedlar-book', truth)
    const seen = appraise(truth)
    world.setFlag('pedlar-book-reading', seen.reading)
    character.learn({
      id: 'the-pedlar-book',
      title: '庙前买的那册书',
      summary: seen.believes,
      category: '器物',
      at: world.time,
      contact: '见过',
      interpretation: '猜想',
      mistaken: seen.mistaken ? '事实' : undefined,
    })

    // 玩家自己决定在不在意。走查里随机替他挑
    const roll = Math.random()
    if (roll < 0.25) {
      applyEffects([{ type: 'book', act: '走' }])
      endings.set('走开了，一生不知道', (endings.get('走开了，一生不知道') ?? 0) + 1)
      continue
    }
    if (roll < 0.4) applyEffects([{ type: 'book', act: '问' }])
    applyEffects([
      { type: 'book', act: '买' },
      { type: 'book', act: '守' },
    ])
    held += 1

    const before = bookEntry()!
    if (before.mistaken) misreadHeld += 1

    // 六成的人生走到了渡口，且那人恰好看了他怀里
    if (Math.random() < 0.6) {
      applyEffects([{ type: 'book-named' }])
      const after = bookEntry()!
      if (before.mistaken && !after.mistaken) corrected += 1
      endings.set(
        `揣了多年，后来知道那是${truth}`,
        (endings.get(`揣了多年，后来知道那是${truth}`) ?? 0) + 1,
      )
    } else {
      const key = `揣了一辈子，始终以为是${before.summary.slice(0, 8)}…`
      endings.set(key, (endings.get(key) ?? 0) + 1)
    }
  }

  const sorted = [...endings.entries()].sort((a, b) => b[1] - a[1])
  for (const [ending, n] of sorted.slice(0, 12)) {
    console.log(`  ${String(((n / RUNS) * 100).toFixed(1)).padStart(5)}%  ${ending}`)
  }
  if (sorted.length > 12) console.log(`         ……另有 ${sorted.length - 12} 种`)

  console.log(`\n  一共 ${sorted.length} 种不同的认知历史。`)
  console.log(
    `  买下并揣着的 ${held} 人里，${misreadHeld} 人揣的是一个错的理解（${((misreadHeld / held) * 100).toFixed(0)}%）。`,
  )
  console.log(`  其中 ${corrected} 人在渡口那天被纠正过来，其余的带着它走完了这一卷。`)

  if (sorted.length < 6) {
    console.log('\n  ✗ 认知历史太少——这册书对谁都是同一本，长期机缘没有落地。')
    failed += 1
  }
  if (corrected === 0) {
    console.log('\n  ✗ 没有一次纠正落地——错误认知永远醒不过来。')
    failed += 1
  }
}

// —— 六种真相各自的收梢 ——
console.log('\n=== 六种真相，六种余味 ===\n')
{
  for (const truth of ['废纸', '符书', '账册', '药方', '残卷', '禁书'] as BookTruth[]) {
    const naming = nameIt(truth)
    console.log(`  【${truth}】${naming.said}`)
    console.log(`      行囊里改叫「${naming.name}」`)
    console.log(`      ${naming.aftermath}`)
    console.log()
  }
  console.log('  六种收梢的余味完全不同。一句通用的结语会把它们抹平成同一种人生。')
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  四条验收全部成立：判断因人而异、判断可以错、兴趣与判断分离、')
  console.log('  错误认知揣得住也醒得来。五节点装得下长期机缘。\n')
}
