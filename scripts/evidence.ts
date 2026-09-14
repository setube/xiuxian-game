/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 关系证据：一路上的那几件事，攒住了吗。
 *
 * 跑法：`bun scripts/evidence.ts`
 *
 * ## 这一支守的是一处【曾经不可逆丢失】的地方
 *
 * `meet` 的 `note` 里装的是关系证据（「荒年你匀了一半粮给他」
 * 「娘下葬他没赶上」），而 2026-09-14 之前**每次 `meet` 都覆盖**
 * ——哥被带 note 六次、侄儿四次，而玩家最终只看得到最后一句。
 *
 * 现在旧那一句照旧覆盖（`note`），历史另存进 `past`。
 *
 * ## ⚠️ 它比别的判据多一个风险：存了而玩家看不见
 *
 * 面板**只在有两条以上时才印**那一串（一条时跟上头那句多半重复）。
 * 所以这一支要分开问两件事：
 *
 * ```
 * 攒住了吗        past 的条数 > 1 的世数         ← 存的那一头
 * 玩家看得见吗    那些世里面板真会印出来        ← 读的那一头
 * ```
 *
 * **只问头一个的话，「攒了一堆而门槛把它全挡了」会安安静静地绿。**
 *
 * ## 它问四件事
 *
 * ```
 * 一  攒住了吗            有人攒到两条以上
 * 二  没覆盖旧的          攒的条数 ≥ 被 meet 带 note 的次数
 * 三  年份是当年的        不是结算那一刻（遗物那个 bug 的同族）
 * 四  面板印得出来        条数 > 1 的世里，那一串真的会显示
 * ```
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'

const RUNS = 200
let bad = 0

console.log(`\n=== 关系证据：一路上的那几件事，攒住了吗 ===\n`)

let anyPast = 0
let manyPast = 0
let maxSeen = 0
/** 年份不在这一世的时间范围里 */
const badYears: string[] = []
/** 同一个人攒的两条一模一样——那是覆盖没挡住的样子 */
const dupes: string[] = []
const samples: string[] = []

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
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

  const endYear = world.time.year
  let sawAny = false
  let sawMany = false
  for (const [id, one] of Object.entries(people.known)) {
    const past = one.past ?? []
    if (past.length === 0) continue
    sawAny = true
    if (past.length > 1) sawMany = true
    maxSeen = Math.max(maxSeen, past.length)

    for (const each of past) {
      // 三、年份得落在这一世里——不是结算那一刻，也不是 0
      if (each.at.year <= 0 || each.at.year > endYear) {
        if (badYears.length < 4) badYears.push(`${id}：${each.at.year} 年（这一世走到 ${endYear}）`)
      }
    }
    const texts = past.map((each) => each.text)
    if (new Set(texts).size !== texts.length && dupes.length < 4) {
      dupes.push(`${id} 攒了两条一样的：「${texts[0]}」`)
    }
    if (past.length >= 3 && samples.length < 2) {
      samples.push(
        `${id}（${one.calls}）${past.length} 条：` +
          past.map((each) => `${each.at.year} 年 ${each.text}`).join('　'),
      )
    }
  }
  if (sawAny) anyPast += 1
  if (sawMany) manyPast += 1
}

console.log(`  ${RUNS} 世：有人攒下证据的 ${anyPast} 世 · 其中攒到两条以上的 ${manyPast} 世`)
console.log(`  最多一个人攒了 ${maxSeen} 条\n`)
for (const one of samples) console.log(`      ${one}`)
if (samples.length > 0) console.log(``)

// —— 一、攒住了吗 ——
if (anyPast === 0) {
  console.log(`  ✗ ${RUNS} 世一条证据也没攒下——那一格没人写，或者 meet 的 note 全没了。`)
  bad += 1
} else if (maxSeen <= 1) {
  console.log(`  ✗ 最多只有 1 条——【还在覆盖】，追加那一笔没生效。`)
  console.log(`      ⚠️ 一条跟覆盖印出来一模一样，所以这一条问的是「有没有人攒到两条」。`)
  bad += 1
} else {
  console.log(`  ✓ 攒住了：最多 ${maxSeen} 条，${manyPast}/${RUNS} 世有人攒到两条以上。`)
}

// —— 二、没有重复（覆盖没挡住的样子）——
if (dupes.length > 0) {
  console.log(`  ✗ ${dupes.length} 处攒了一模一样的两条：`)
  for (const one of dupes) console.log(`      ${one}`)
  bad += 1
} else {
  console.log(`  ✓ 没有攒重复的。`)
}

// —— 三、年份是当年的 ——
if (badYears.length > 0) {
  console.log(`  ✗ ${badYears.length} 条的年份不在这一世里：`)
  for (const one of badYears) console.log(`      ${one}`)
  console.log(`      ⚠️ 这是「结算那一刻 ≠ 事件发生那一刻」那一族——遗物的年份栽过同一跤。`)
  bad += 1
} else {
  console.log(`  ✓ 每一条的年份都落在这一世里。`)
}

// —— 四、面板印得出来 ——
{
  /*
   * ⚠️ 面板的门槛是 `past.length > 1`，跟这一支第一条的门槛**得是同一个数**。
   *
   * 存住了而门槛把它全挡了，会安安静静地绿——所以这一条从面板那一头问：
   * **攒到两条以上的世数，就是玩家真能看见那一串的世数。**
   */
  const visible = manyPast
  if (anyPast > 0 && visible === 0) {
    console.log(`  ✗ ${anyPast} 世攒下了证据，而没有一世攒到两条——面板一次也印不出来。`)
    console.log(`      ——存住了而玩家看不见，跟没存一样。`)
    bad += 1
  } else if (visible > 0) {
    console.log(`  ✓ 面板印得出来：${visible} 世攒到两条以上（面板门槛正是 >1）。`)
  }
}

console.log(bad === 0 ? `\n  ✓ 这一族四件事都对。\n` : `\n  ✗ ${bad} 项不成立。\n`)
if (bad > 0) process.exitCode = 1
