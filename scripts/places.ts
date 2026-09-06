/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 出生地走查。
 *
 * 从前所有人都挤在「云州 · 临江府」——州府是写死在出身的 homes 里的，
 * 府名和村名绑成一条字符串。现在两边分开掷，这里确认它真的散开了：
 * 每个府都有人生在那里，同一种出身也会落在不同的府。
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { PREFECTURES } from '../src/content/geography'
import { ORIGINS } from '../src/content/origins'
import { useHouseholdStore } from '../src/stores/household'
import type { OriginId } from '../src/types/game'

/**
 * 走查跑多少世。
 *
 * ## 这一支最稀的一格不是「府」，是「门牌」
 *
 * 府只有十个，五百世就能量准占比。可这一支还要报
 * **一共抽到了多少种不重样的门牌**——那是个集齐问题，不是占比问题：
 * 五百世最多攒出五百种，而门牌有五百多种，**它在数学上就报不出全集**。
 * 砍到五百世那一版实测报 268 种，而 README 引着「519 种」——
 * 那个数是从前六千世量的，砍掉世数之后它再也跑不出来，
 * 可文档里那一行没跟着改。
 *
 * 集齐五百多种要 519 × ln(519) ≈ 3200 世起步，六千世才稳。
 * 这一支只掷出身和州府，不走人生，**六千世跑完三秒**——
 * 当初砍到五百省下的是三秒，毁掉的是文档里那个数。
 */
const RUNS = 6000

/**
 * 门牌的全集，算出来的，不是抽出来的。
 *
 * 门牌是三段拼的：`州 · 府 · 街巷村名`（宗室那两行例外，家在京城，是 `京师 · 皇城 · 村名`）。
 * 每种出身有自己的村名池，而每种出身都落得到任何一个府——
 * **那正是底下第二条门禁验的事**——所以全集就是这个笛卡尔积。
 *
 * ## 能算出来的数，不要拿抽样去逼近
 *
 * 从前这里只报「抽到了几种」，于是那一个数同时被两件事推着走：
 * 池子有多大，和跑了多少世。读的人分不开这两件事，
 * 所以砍世数的时候没人看得出报出来的 268 是「地名删了一半」
 * 还是「世数不够」。现在报的是「抽到 N 种，一共 M 种」——
 * **N 掉下去是抽样的事，M 掉下去是内容的事。**
 */
const EVERY_HOME = new Set<string>()
for (const origin of ORIGINS) {
  for (const locale of origin.locales) {
    if (origin.capital) {
      EVERY_HOME.add(`${origin.capital} · ${locale}`)
      continue
    }
    for (const p of PREFECTURES) EVERY_HOME.add(`${p.province} · ${p.name} · ${locale}`)
  }
}

const byPrefecture: Record<string, number> = {}
const homes = new Set<string>()
/**
 * 每一行出身各自落过哪些府。
 *
 * 键是**出身主键**，不是那五格里的某一格：王府与宫里五格一字不差，
 * 拿「宗室」当键的话这两行会并成一格，而底下第二条门禁数的正是
 * 「每一行落过几个府」——并了格，少落府的那一行就被另一行盖住了。
 */
const spread = new Map<OriginId, Set<string>>()

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  const seat = `${household.province} · ${household.prefecture}`
  byPrefecture[seat] = (byPrefecture[seat] ?? 0) + 1
  homes.add(household.home)

  let seen = spread.get(household.origin)
  if (!seen) {
    seen = new Set()
    spread.set(household.origin, seen)
  }
  seen.add(household.prefecture)
}

console.log(`\n=== 出生地走查（${RUNS} 世）===\n`)
console.log('  府              占比')
console.log('  ' + '─'.repeat(24))
for (const p of PREFECTURES) {
  const seat = `${p.province} · ${p.name}`
  const n = byPrefecture[seat] ?? 0
  const pct = ((n / RUNS) * 100).toFixed(1)
  console.log(`  ${seat.padEnd(14)}${pct.padStart(5)}%`)
}

console.log(`\n  不重样的门牌    抽到 ${homes.size} 种，一共 ${EVERY_HOME.size} 种`)
console.log(`\n  每种出身落过几个府（共 ${PREFECTURES.length} 个）：`)
for (const origin of ORIGINS) {
  const seen = spread.get(origin.id)
  const n = seen ? seen.size : 0
  // 宗室生在京城，但州府照掷——那是他日后被贬去的地方
  const note = origin.capital ? '（家在京城，这是贬所）' : ''
  // 主键做行首、籍和业做说明：光印 `manor` 看不出那是什么人家，
  // 光印「宗室 · 食禄」又分不出王府那一行和宫里那一行
  const what = `${origin.census} · ${origin.livelihood}`
  console.log(
    `    ${origin.id.padEnd(7)}${what.padEnd(12)}${String(n).padStart(2)} / ${PREFECTURES.length}  ${note}`,
  )
}

/**
 * 门禁。
 *
 * 这一支从前**一道门禁也没有**，只把数字印出来就 exit 0——
 * 可它验的那件事恰恰全都能验：「所有人都挤在云州·临江府」
 * 是一个真出过的回归，而它重新长出来的时候，
 * 这支走查会一边印着「临江府 100%」一边绿灯放行。
 *
 * **一支没有门禁的走查，等于一份没人读的报告。**
 */
{
  let bad = 0

  // 一、没有哪个府能占掉三成。从前那个 bug 的样子是某一个府占 100%
  for (const p of PREFECTURES) {
    const seat = `${p.province} · ${p.name}`
    const share = (byPrefecture[seat] ?? 0) / RUNS
    if (share === 0) {
      console.log(`\n  ✗ ${seat} 一个人也没生在那里——那这个府等于不存在。`)
      bad += 1
    } else if (share > 0.3) {
      console.log(`\n  ✗ ${seat} 占了 ${(share * 100).toFixed(0)}%——出生地又挤回一个府了。`)
      bad += 1
    }
  }

  /**
   * 二、每种出身都得落过好几个府。
   *
   * 这一条才是那个回归的正面。府名从前写死在出身的 homes 里，
   * 于是**每种出身只落一个府**——占比那一关它照样能过
   * （十一种出身摊开，没有哪个府占到三成），
   * 只有这一条量得出「府和出身又绑回去了」。
   *
   * 门槛照最稀的那一行定：生在宫里那一行权重 2/205，六千世里五十几个人，
   * 落满十个府是常态，取一半留足余量。
   */
  const FLOOR = Math.ceil(PREFECTURES.length / 2)
  for (const origin of ORIGINS) {
    const n = spread.get(origin.id)?.size ?? 0
    if (n < FLOOR) {
      console.log(`\n  ✗ ${origin.id} 只落过 ${n} 个府——府名怕是又跟出身绑死了。`)
      bad += 1
    }
  }

  /**
   * 三、门牌不许塌。这里拆成两条，因为塌的方式有两种，而它们不是一回事。
   *
   * 前一条量**池子本身**：全集是三段名字的笛卡尔积，算出来的，跟跑多少世无关。
   * 村名删掉一批、某种出身的 `locales` 写空了，这个数立刻掉下来。
   *
   * 后一条量**抽样**：六千世该把大半个全集抽出来。它掉下去说明世数不够，
   * 或者掷得太偏（比如某个府/某种出身实际上摸不到）。
   *
   * 从前只有一个数、一条线（`homes.size < 450`），两种塌法混在一起——
   * 而砍世数的那一版正好卡在这条线底下，报的 268 究竟是哪一种，
   * 从输出上根本读不出来。
   */
  const POOL_FLOOR = 500
  if (EVERY_HOME.size < POOL_FLOOR) {
    console.log(`\n  ✗ 门牌全集只剩 ${EVERY_HOME.size} 种，不到 ${POOL_FLOOR}——地名池子塌了。`)
    bad += 1
  }
  const covered = homes.size / EVERY_HOME.size
  if (covered < 0.9) {
    console.log(
      `\n  ✗ ${RUNS} 世只抽到全集的 ${(covered * 100).toFixed(0)}%——` +
        '要么世数不够，要么有一片门牌实际上摸不到。',
    )
    bad += 1
  }

  if (bad > 0) {
    process.exitCode = 1
  } else {
    console.log(
      `\n  十个府都有人生在那里，每种出身都散在各府，` +
        `${EVERY_HOME.size} 种门牌抽到了 ${homes.size} 种。`,
    )
  }
}
console.log()
