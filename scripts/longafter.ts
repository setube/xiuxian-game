/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 那把镰刀：遗物穿过二十年这件事，还成立吗。
 *
 * 跑法：`bun scripts/longafter.ts`
 *
 * ## ⚠️ 这一卷比别的卷更需要判据，因为它【什么也不落】
 *
 * `marks: []`——它不改行囊、不加属性、不立旗，那是有意的
 * （遗物的分量来自它不变）。而代价是：**它坏了不会留下任何痕迹**。
 *
 * 别的卷坏了，多少还有一笔效果落空、一面旗没立；这一卷坏了，
 * 世界里一个字也不会变。**唯一能发现的办法是有人专门去问。**
 *
 * ## 它问四件事，而头一件是这一轮真栽过的
 *
 * ```
 * 一  年数是【他殁的那年】算起的吗    ← 曾经记成结算那一刻，差 55 年
 * 二  两支都走得到吗                  「没有」那一支是另一半，不是兜底
 * 三  门槛跟分布对得上吗              二十年那一档还剩多少人够得着
 * 四  它认不认得「别处捡的同一件」    没有 keepsake 的不该算遗物
 * ```
 *
 * ## 一那一条的由来，写在这儿省得下次重查
 *
 * `settleHeads` 是**按需结算**的：玩家某次推时间时它才补记户主变更，
 * 而那时距那个人殁可能已经几十年。所以 `world.time.year` 是
 * **结算那一刻**，不是**他殁的那一年**：
 *
 * ```
 * 此刻 81　落下 81　差 0　【而爹殁于 26】
 * ```
 *
 * 写错的症状**不是「年份不对」，是「那一族条件恒假」**
 * ——没有人会看到一个错的年份，只会看到那一卷一次也没演到。
 */
import './lib/seeded'

import { born, play } from './lib/staged'
import { RELICS } from '../src/content/relics'
import { lifeEvents, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { useCharacterStore } from '../src/stores/character'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'

const SCENE = 'relic:long-after'
const IDS = new Set(Object.values(RELICS).map((one) => one.id))
let bad = 0

console.log(`\n=== 那把镰刀：遗物穿过二十年 ===\n`)

// 尺子自检：卷和事件都还在
{
  const scene = lifeScenes[SCENE]
  const event = lifeEvents.find((one) => one.id === 'relic-long-after')
  if (scene === undefined || event === undefined) {
    console.log(`  ✗ 尺子自检：库里找不到 ${SCENE} 或事件 relic-long-after。`)
    process.exitCode = 1
    process.exit(1)
  }
  /*
   * ⚠️ 门槛从内容【现取】，不写死在判据里。
   *
   * 写死的话，内容里把二十年改成四十年，这一支照样绿
   * ——而那正是「判据里的数从内容现取」那一条。
   */
  const years = (scene.nodes['open']?.branches ?? [])
    .flatMap((one) => one.requires ?? [])
    .map((one) => one.keepsake?.years?.atLeast)
    .find((one) => one !== undefined)
  if (years === undefined) {
    console.log(`  ✗ 尺子自检：那一节的分流不问 keepsake 的年数了——结构变了。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：卷在、事件在，门槛是 ${years} 年（从内容现取）。`)
  }
}

// —— 一、年数从他殁的那一年算起 ——
{
  const RUNS = 150
  let withRelic = 0
  let fromDeath = 0
  const gaps: number[] = []
  const wrong: string[] = []

  for (let i = 0; i < RUNS; i += 1) {
    const staged = born('farm', 45, [])
    if (staged === null) continue
    const character = useCharacterStore()
    const people = usePeopleStore()
    const world = useWorldStore()
    const relic = character.inventory.find((one) => IDS.has(one.id))
    if (relic?.keepsake === undefined) continue
    withRelic += 1
    gaps.push(world.time.year - relic.keepsake.at)

    const died = people.personOf(relic.keepsake.from)?.death?.year
    if (died === undefined) continue
    if (relic.keepsake.at === died) fromDeath += 1
    else if (wrong.length < 4) {
      wrong.push(`记的是 ${relic.keepsake.at} 而他殁于 ${died}（此刻 ${world.time.year}）`)
    }
  }

  const median = (xs: number[]): number =>
    xs.length === 0 ? 0 : [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!

  console.log(`  ·  ${withRelic}/${RUNS} 世手里有遗物，隔了中位 ${median(gaps)} 年`)
  if (withRelic === 0) {
    console.log(`  ⚠️ 一件遗物也没摆出来，底下三条没验成。`)
  } else if (wrong.length > 0) {
    console.log(`  ✗ ${wrong.length} 处年份不是从他殁那年算的：`)
    for (const one of wrong) console.log(`      ${one}`)
    console.log(`      ——settleHeads 是按需结算的，world.time.year 是【结算那一刻】。`)
    console.log(`      写错的症状不是「年份不对」，是【那一族条件恒假】。`)
    bad += 1
  } else {
    console.log(`  ✓ 年数从他殁那一年算起（${fromDeath}/${withRelic} 对得上卒年）。`)
  }

  // —— 三、门槛跟分布对得上吗（报数不判红）——
  const over20 = gaps.filter((one) => one >= 20).length
  console.log(
    `  ·  隔 ≥20 年的 ${over20}/${gaps.length} 世` +
      `　（这一栏是给写门槛的人看的：门槛画在分布的尾巴上，那一卷就是死的）`,
  )
}

// —— 二、两支都走得到 ——
{
  const RUNS = 120
  let held = 0
  let nothing = 0
  for (let i = 0; i < RUNS; i += 1) {
    const staged = born('farm', 45, [])
    if (staged === null) continue
    const texts = play(SCENE).join('~')
    if (texts.includes('磨得发亮')) held += 1
    if (texts.includes('柜子底下')) nothing += 1
  }
  if (held === 0 || nothing === 0) {
    console.log(`  ✗ 分流有一支走不到（还在 ${held} · 没有 ${nothing}）。`)
    console.log(`      「没有」那一支不是兜底废话——有人没留下过东西，那也是一种人生。`)
    bad += 1
  } else {
    console.log(`  ✓ 两支都走得到：还在 ${held} 世 · 没有 ${nothing} 世。`)
  }
}

// —— 四、别处捡的同一件不算遗物（打断验）——
{
  const staged = born('farm', 45, [])
  if (staged === null) {
    console.log(`  ⚠️ 摆不出局，这一条没验成。`)
  } else {
    const character = useCharacterStore()
    const one = Object.values(RELICS)[0]!
    // 先清掉世界自己落的那件，再放一件【没有来历】的同 id
    character.carry(one.id, one.name, -99, one.unit)
    character.carry(one.id, one.name, 1, one.unit)
    const asks = meetsAll([{ keepsake: { item: one.id, years: { atLeast: 0 } } }])
    const hasIt = meetsAll([{ item: one.id }])
    if (asks) {
      console.log(`  ✗ 尺子自检：没有来历的同一件东西被当成了遗物——那一格形同 { item: … }。`)
      bad += 1
    } else if (!hasIt) {
      console.log(`  ✗ 尺子自检：东西明明在行囊里而 { item: … } 说没有——摆局不成立。`)
      bad += 1
    } else {
      console.log(`  ✓ 尺子自检：别处捡的同一件不算遗物（item 认得出，keepsake 认不出）。`)
    }
  }
}

console.log(bad === 0 ? `\n  ✓ 这一卷四件事都对。\n` : `\n  ✗ ${bad} 项不成立。\n`)
if (bad > 0) process.exitCode = 1
