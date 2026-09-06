/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 按出身分组的走查。
 *
 * 加出身最容易犯的错，是加完只有数值不同：
 * 「生在药铺」和「生在镖局」如果走出来的人生一模一样，那就不是出身，是属性面板。
 *
 * 所以这里按出身分组，看每一种是不是真的走出了自己的路——
 * 各自读没读上书、各自撞没撞上属于自己那一卷、各自听没听说过修行、
 * 各自走不走得完一生。
 *
 * 这几列有意都落在**人生前半段**：那几年年表塞得满，出身的差别
 * 正是在那儿显出来的。后半段人人都在过日子，出身早就被自己的经历盖过去了——
 * 底下那段注释记着这件事怎么让一整张表失去了分辨力。
 *
 * 跑法：bun scripts/origins.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { ORIGINS, originById } from '../src/content/origins'
import { lifeEvents } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import type { OriginId } from '../src/types/game'

import { mapShards } from './lib/parallel'
import { beOf } from './origin'
import type { Observed } from './tasks/origins-lives'

/**
 * 走查跑多少世。
 *
 * ## 这一支印的是一张百分比表，可它真正验得动的只有「在不在」
 *
 * 十一种出身按权重掷，最稀的那一行（生在宫里）占 2/205——**一个百分点**。
 * 五百世里那是五个人，而这张表要给它算「读过书 %」「走本行 %」
 * 「知修士 %」五个百分比：五个人算出来的百分比，一个人就是二十个点。
 * 一千世翻倍到十个人，那张表照样不该当真——**稀出身那几行是给人看形状的，
 * 不是给人读数的**，所以底下的门禁一条也没落在百分比上。
 *
 * 一千世的用处在别处：门禁要的是「每种出身都掷到过」和
 * 「每种有专属卷的出身，都有人真的走了本行」。
 * 五百世下最稀那一行期望五个人，两百批里有一批整批落空——那是误报；
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
 * 每一行出身专属的那一卷。撞上它才算「走了自己的路」。
 *
 * ## 键是出身主键，可年表那边认的不是主键
 *
 * 这张表左边写 `cloth`，而 `omen-merchant-1` 的 `requires` 写的是
 * `{ business: '布庄' }`——**两边根本不是同一个字段**。
 * 中间那一步「布庄这行的产是布庄」由出身表担着，谁也没在这里写下来。
 * 所以这张表能错的方式不止「卷名拼错」一种，还有「配错了行」：
 * 把 `escort` 指向 `trade-guest`，两个名字都存在，跑一千世也只会
 * 安静地报一个 0%。底下那一步把这两种错一起兜住。
 *
 * ## 布庄那一行从前写的是 `event:omen-merchant`，而年表上没有这个 id
 *
 * 真正的入口卷叫 `omen-merchant-1`。少了后缀的那个名字
 * **从来不会有任何一世把它设上**，于是这张表里那一格恒为 0%——
 * 而它读起来完全不像坏了：「0%」看上去就像「做买卖的人家走本行的机会很少」，
 * 一个说得通的世界设定。
 *
 * 这一支从前没有门禁，所以这个 0% 印了多少遍也没人管。
 */
const OWN_EVENT: Partial<Record<OriginId, string>> = {
  inn: 'event:trade-guest',
  tavern: 'event:trade-drunk',
  herb: 'event:trade-herb',
  escort: 'event:trade-road',
  office: 'event:trade-archive',
  cloth: 'event:omen-merchant-1',
}

/**
 * 开跑之前先核一遍：这几卷在年表上有没有，以及那一行人**够不够格**走进去。
 *
 * **跑一千世去发现一个配错的映射，是最贵的一种发现方式**，
 * 而且它只在「恰好那一格该有人」的时候才发现得了——
 * 换成一种本来就罕见的出身，0% 会被当成正常结果读过去。
 *
 * 后半条不是照着 `requires` 抄一遍字段名，而是真把那一行摆出来，
 * 拿**引擎自己那把尺**（`meetsAll`）去量。年表那边把
 * `{ business: '布庄' }` 改成 `{ livelihood: '经商' }`，
 * 或者出身表把布庄那一行的产挪走，这里都会当场红。
 *
 * 这一条不花钱，不靠抽样，跑之前一秒钟就能给出答案。
 */
let nameErrors = 0
for (const [id, flag] of Object.entries(OWN_EVENT) as [OriginId, string][]) {
  const eventId = flag.replace(/^event:/, '')
  const event = lifeEvents.find((one) => one.id === eventId)
  if (!event) {
    console.log(`  ✗ 「${id}」认的那一卷叫 ${eventId}，可年表上根本没有这个 id。`)
    nameErrors += 1
    continue
  }
  setActivePinia(createPinia())
  beOf(id)
  if (!meetsAll(event.requires)) {
    console.log(`  ✗ 「${id}」这一行人走不进 ${eventId}——那一卷要的条件他们不满足。`)
    nameErrors += 1
  }
}
if (nameErrors > 0) {
  console.log('    这几格会恒为 0%，而 0% 读起来像是世界设定，不像是配错了。\n')
  process.exitCode = 1
}

const rows = new Map<OriginId, Row>()

function rowOf(id: OriginId): Row {
  let row = rows.get(id)
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
    rows.set(id, row)
  }
  return row
}

/**
 * 这一行人家怎么称呼。
 *
 * 表格第一列是主键（`manor` 和 `court` 只有主键分得开），
 * 第二列给一个认得出的词：有铺面的说铺面，没有的说靠什么过活。
 */
function nameOf(id: OriginId): string {
  const row = originById(id)
  return row.business ?? row.livelihood
}

const observed = (
  await mapShards<Observed[], Partial<Record<OriginId, string>>>({
    task: 'scripts/tasks/origins-lives.ts',
    runs: RUNS,
    payload: OWN_EVENT,
  })
).flat()

for (const one of observed) {
  const row = rowOf(one.origin)
  row.n += 1
  if (one.schooled) row.schooled += 1
  if (one.ownScene) row.ownScene += 1
  if (one.heardOfCultivators) row.heardOfCultivators += 1
  if (one.recognized) row.recognized += 1
  if (one.revealed) row.revealed += 1
  row.endings[one.ending] = (row.endings[one.ending] ?? 0) + 1
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '  —  '
  return `${((part / whole) * 100).toFixed(0)}%`.padStart(5)
}

console.log(`\n=== 按出身分组（${RUNS} 世）===\n`)
console.log('  出身               份额    读过书  走本行   知修士  认出来  被点破')
console.log('  ' + '─'.repeat(64))

// 按配置里的权重顺序列，好跟 content/origins.ts 对着看
for (const origin of ORIGINS) {
  const who = `${origin.id.padEnd(7)}${nameOf(origin.id)}`
  const row = rows.get(origin.id)
  if (!row) {
    // 世数从常量取。从前这里写死「四千世里一次也没掷到」，而 RUNS 是 500——
    // **一句只在出错时才会印出来的话，撒的谎八倍于真相**
    console.log(`  ${who}  （${RUNS} 世里一次也没掷到）`)
    continue
  }
  const own = OWN_EVENT[origin.id] ? pct(row.ownScene, row.n) : '  —  '
  console.log(
    `  ${who}  ${pct(row.n, RUNS)}  ${String(row.n).padStart(4)}  ` +
      `${pct(row.schooled, row.n)}  ${own}  ` +
      `${pct(row.heardOfCultivators, row.n)}  ${pct(row.recognized, row.n)}  ${pct(row.revealed, row.n)}`,
  )
}

/**
 * ## 这儿从前还有第二张表：「十六岁那年的落点，按出身」
 *
 * 它印的是 `narrative.nodeId`——一世走完停在哪一节。旧结构里那是渡口，
 * 十一种出身落在 gone / named-true / unnamed 上各不相同，
 * 是「出身不是属性面板」的一份佐证。
 *
 * 人生模拟那一轮之后它变成了**十一行一模一样的 `gone 100%`**。
 * 不是内容退化了，是那件事本身不再发生：人生不再由十六岁那道检测
 * 分岔成几个结局，**人人都活到老，都走到落幕那一节**。
 * 一张十一行同值的表不证明任何事，读者却会当它是出身的差别。
 *
 * 表撤了，`endings` 的采集留着——底下第四条门禁要拿它查「有没有人卡住」，
 * 那件事跟落点是两回事，而且在新结构下照样验得动。
 */
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

  // 一、每一行出身都得掷得到。最稀那一行占一个百分点，一千世里是十个人上下
  for (const origin of ORIGINS) {
    if ((rows.get(origin.id)?.n ?? 0) === 0) {
      console.log(`  ✗ 「${origin.id}」一世也没掷到——它写在册子上，可谁也生不到那儿去。`)
      bad += 1
    }
  }

  /**
   * 二、有专属卷的出身，都得有人真的走了本行。
   *
   * **这一条才是「不是属性面板」的正面证据。** 份额对得上、读书率有差别，
   * 这些数字全都能在「出身只是几个初始数值」的世界里长出来；
   * 只有「生在药铺的人撞上了药铺那一卷」是钱买不到的。
   *
   * 开跑前那一步已经证明了「这一行人够格走进那一卷」，这一条问的是
   * 另一半：**年表真的把它掷出来过吗**。窗口太窄、权重太低、
   * 或者那几年被别的卷占满，都会让一个够格的人一辈子撞不上。
   */
  for (const [id, event] of Object.entries(OWN_EVENT) as [OriginId, string][]) {
    const row = rows.get(id)
    if (!row || row.n === 0) continue // 上一条已经拦过了
    if (row.ownScene === 0) {
      console.log(`  ✗ 「${id}」的 ${row.n} 个人里，没有一个撞上过 ${event}。`)
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
    const got = (rows.get(origin.id)?.n ?? 0) / RUNS
    const want = origin.weight / weightSum
    if (got < want * 0.6 || got > want * 1.6) {
      console.log(
        `  ✗ 「${origin.id}」占 ${(got * 100).toFixed(1)}%，` +
          `而权重说它该占 ${(want * 100).toFixed(1)}%。`,
      )
      bad += 1
    }
  }

  /**
   * 四、每种出身都得收得了尾。
   *
   * 走不完一生是引擎的事，不是内容的事——可它只会在
   * 某一种出身身上发作（某一卷把人卡在那儿），而按出身分组的表
   * 恰恰是唯一看得见它的地方。两个百分点是留给抽样的余量，
   * 不是留给「有几个人卡住也没关系」的。
   *
   * 「收尾」这个词的所指跟着人生模拟那一轮变过一次：从前指十六岁那年
   * 走进渡口，现在指走到落幕那一卷。**这一条一个字也不用改**——
   * 它读的是 `(未收尾)`，而那一格问的始终是「走没走到头」，
   * 不问头在哪儿。
   */
  for (const origin of ORIGINS) {
    const row = rows.get(origin.id)
    if (!row || row.n === 0) continue
    const stuck = row.endings['(未收尾)'] ?? 0
    if (stuck / row.n > 0.02) {
      console.log(`  ✗ 「${origin.id}」的 ${row.n} 个人里，${stuck} 个走不到收尾。`)
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
