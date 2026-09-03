/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 按出身分组的走查。
 *
 * 加出身最容易犯的错，是加完只有数值不同：
 * 「生在药铺」和「生在镖局」如果走出来的人生一模一样，那就不是出身，是属性面板。
 *
 * 所以这里按出身分组，看每一种是不是真的走出了自己的路——
 * 各自读没读上书、各自撞没撞上属于自己那一卷、
 * 十六岁那年在渡口落在哪个结局上。
 *
 * 跑法：npx vite-node scripts/origins.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { ORIGINS } from '../src/content/origins'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'
import type { Trade } from '../src/types/game'

/**
 * 走查跑多少世。
 *
 * ## 这一支印的是一张百分比表，可它真正验得动的只有「在不在」
 *
 * 十一种出身按权重掷，最稀的皇室占 2/205——**一个百分点**。
 * 五百世里那是五个人，而这张表要给它算「读过书 %」「走本行 %」
 * 「知修士 %」五个百分比：五个人算出来的百分比，一个人就是二十个点。
 * 一千世翻倍到十个人，那张表照样不该当真——**稀出身那几行是给人看形状的，
 * 不是给人读数的**，所以底下的门禁一条也没落在百分比上。
 *
 * 一千世的用处在别处：门禁要的是「每种出身都掷到过」和
 * 「每种有专属卷的出身，都有人真的走了本行」。
 * 五百世下皇室期望五个人，两百批里有一批整批落空——那是误报；
 * 一千世期望十个，落空率降到两万分之一。
 *
 * 一世要走完一辈子，一千世跑一百六十秒上下。
 */
const RUNS = 1000

interface Row {
  n: number
  schooled: number
  ownScene: number
  heardOfCultivators: number
  recognized: number
  revealed: number
  endings: Record<string, number>
}

/**
 * 每种出身专属的那一卷。撞上它才算「走了自己的路」。
 *
 * ## 商户那一行从前写的是 `event:omen-merchant`，而年表上没有这个 id
 *
 * 真正的商户入口卷叫 `omen-merchant-1`（九到十一岁，`requires` 商户）。
 * 少了后缀的那个名字**从来不会有任何一世把它设上**，
 * 于是这张表里商户那一格恒为 0%——而它读起来完全不像坏了：
 * 「商户 0%」看上去就像「商户走本行的机会很少」，
 * 一个说得通的世界设定。
 *
 * 这一支从前没有门禁，所以这个 0% 印了多少遍也没人管。
 * 底下那道「有专属卷的出身都得有人走本行」一开就抓住了它。
 */
const OWN_EVENT: Partial<Record<Trade, string>> = {
  客栈: 'event:trade-guest',
  酒楼: 'event:trade-drunk',
  药铺: 'event:trade-herb',
  镖局: 'event:trade-road',
  官宦: 'event:trade-archive',
  商户: 'event:omen-merchant-1',
}

/**
 * 开跑之前先核一遍这几个名字在年表上有没有。
 *
 * **跑一千世去发现一个拼错的字符串，是最贵的一种发现方式**，
 * 而且它只在「恰好那一格该有人」的时候才发现得了——
 * 换成一种本来就罕见的出身，0% 会被当成正常结果读过去。
 *
 * 这一条不花钱，不靠抽样，跑之前一秒钟就能给出答案。
 */
let nameErrors = 0
for (const [trade, flag] of Object.entries(OWN_EVENT) as [Trade, string][]) {
  const id = flag.replace(/^event:/, '')
  if (!lifeEvents.some((one) => one.id === id)) {
    console.log(`  ✗ 「${trade}」认的那一卷叫 ${id}，可年表上根本没有这个 id。`)
    nameErrors += 1
  }
}
if (nameErrors > 0) {
  console.log('    这几格会恒为 0%，而 0% 读起来像是世界设定，不像是拼错了。\n')
  process.exitCode = 1
}

const rows = new Map<Trade, Row>()

function rowOf(trade: Trade): Row {
  let row = rows.get(trade)
  if (!row) {
    row = {
      n: 0,
      schooled: 0,
      ownScene: 0,
      heardOfCultivators: 0,
      recognized: 0,
      revealed: 0,
      endings: {},
    }
    rows.set(trade, row)
  }
  return row
}

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const world = useWorldStore()
  const character = useCharacterStore()
  const household = useHouseholdStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()

  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }

  const row = rowOf(household.trade)
  row.n += 1
  if (world.getFlag('schooled') === true) row.schooled += 1

  const own = OWN_EVENT[household.trade]
  if (own && world.hasFlag(own)) row.ownScene += 1

  if (character.knows('cultivators-exist')) row.heardOfCultivators += 1
  if (world.hasFlag('saw-a-cultivator')) row.recognized += 1
  if (character.inventory.some((item) => item.formerName !== undefined)) row.revealed += 1

  const ending = narrative.nodeId ?? '(未收尾)'
  row.endings[ending] = (row.endings[ending] ?? 0) + 1
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '  —  '
  return `${((part / whole) * 100).toFixed(0)}%`.padStart(5)
}

console.log(`\n=== 按出身分组（${RUNS} 世）===\n`)
console.log('  出身    份额    读过书  走本行   知修士  认出来  被点破')
console.log('  ' + '─'.repeat(56))

// 按配置里的权重顺序列，好跟 origins.ts 对着看
for (const origin of ORIGINS) {
  const row = rows.get(origin.trade)
  if (!row) {
    // 世数从常量取。从前这里写死「四千世里一次也没掷到」，而 RUNS 是 500——
    // **一句只在出错时才会印出来的话，撒的谎八倍于真相**
    console.log(`  ${origin.trade}  （${RUNS} 世里一次也没掷到）`)
    continue
  }
  const own = OWN_EVENT[origin.trade] ? pct(row.ownScene, row.n) : '  —  '
  console.log(
    `  ${origin.trade}  ${pct(row.n, RUNS)}  ${String(row.n).padStart(4)}  ` +
      `${pct(row.schooled, row.n)}  ${own}  ` +
      `${pct(row.heardOfCultivators, row.n)}  ${pct(row.recognized, row.n)}  ${pct(row.revealed, row.n)}`,
  )
}

console.log(`\n--- 十六岁那年的落点，按出身 ---`)
for (const origin of ORIGINS) {
  const row = rows.get(origin.trade)
  if (!row) continue
  const parts = Object.entries(row.endings)
    .sort((a, b) => b[1] - a[1])
    .map(([node, count]) => `${node} ${pct(count, row.n).trim()}`)
    .join('   ')
  console.log(`  ${origin.trade}  ${parts}`)
}

/**
 * 门禁。
 *
 * 这一支从前**一道门禁也没有**：印完两张表就 exit 0。
 * 可它开头写着的那句话——「加完出身如果人生一模一样，
 * 那就不是出身，是属性面板」——恰恰是验得动的。
 *
 * 四条全都落在「在不在」上，一条也不落在百分比上。
 * 稀出身那几行是十来个人算出来的，**拿它们当门槛，
 * 造出来的不是门禁，是一个隔几批响一次的随机报警器。**
 */
console.log()
{
  let bad = 0

  // 一、每种出身都得掷得到。皇室占一个百分点，一千世里是十个人上下
  for (const origin of ORIGINS) {
    if ((rows.get(origin.trade)?.n ?? 0) === 0) {
      console.log(`  ✗ 「${origin.trade}」一世也没掷到——它写在册子上，可谁也生不到那儿去。`)
      bad += 1
    }
  }

  /**
   * 二、有专属卷的出身，都得有人真的走了本行。
   *
   * **这一条才是「不是属性面板」的正面证据。** 份额对得上、读书率有差别，
   * 这些数字全都能在「出身只是几个初始数值」的世界里长出来；
   * 只有「生在药铺的人撞上了药铺那一卷」是钱买不到的。
   */
  for (const [trade, event] of Object.entries(OWN_EVENT) as [Trade, string][]) {
    const row = rows.get(trade)
    if (!row || row.n === 0) continue // 上一条已经拦过了
    if (row.ownScene === 0) {
      console.log(`  ✗ 「${trade}」的 ${row.n} 个人里，没有一个撞上过 ${event}。`)
      bad += 1
    }
  }

  /**
   * 三、常见出身的份额得对得上配置里的权重。
   *
   * 只查权重十以上的那几种——一千世里都有五十人打底，比值晃不动。
   * 稀的几种十来个人，σ 有三成，**它们只配被查「在不在」。**
   *
   * 这一条拦的是掷法整个坏掉：权重表改了没生效、或者所有人都挤进农户。
   * 那种回归在表面上看不出来，因为表照样印得出十一行。
   */
  const weightSum = ORIGINS.reduce((sum, one) => sum + one.weight, 0)
  for (const origin of ORIGINS) {
    if (origin.weight < 10) continue
    const got = (rows.get(origin.trade)?.n ?? 0) / RUNS
    const want = origin.weight / weightSum
    if (got < want * 0.6 || got > want * 1.6) {
      console.log(
        `  ✗ 「${origin.trade}」占 ${(got * 100).toFixed(1)}%，` +
          `而权重说它该占 ${(want * 100).toFixed(1)}%。`,
      )
      bad += 1
    }
  }

  /**
   * 四、每种出身都得收得了尾。
   *
   * 走不到十六岁那一卷是引擎的事，不是内容的事——可它只会在
   * 某一种出身身上发作（某一卷把人卡在那儿），而按出身分组的表
   * 恰恰是唯一看得见它的地方。两个百分点是留给抽样的余量，
   * 不是留给「有几个人卡住也没关系」的。
   */
  for (const origin of ORIGINS) {
    const row = rows.get(origin.trade)
    if (!row || row.n === 0) continue
    const stuck = row.endings['(未收尾)'] ?? 0
    if (stuck / row.n > 0.02) {
      console.log(`  ✗ 「${origin.trade}」的 ${row.n} 个人里，${stuck} 个走不到收尾。`)
      bad += 1
    }
  }

  console.log()
  if (bad > 0) {
    console.log(`  ✗ ${bad} 项不成立。\n`)
    process.exitCode = 1
  } else {
    console.log('  十一种出身各自掷得到、各自走得上自己那一卷、各自收得了尾。')
    console.log('  **出身不是属性面板上的一行数字。**\n')
  }
}
