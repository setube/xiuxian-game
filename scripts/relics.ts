/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 遗物：当家的人没了，他用过的那几样留下来没有。
 *
 * 跑法：`bun scripts/relics.ts`
 *
 * ## 这一支跟着那一环一起写，不等它先坏
 *
 * 遗物那一环（`content/relics.ts` + `settleHeads` 里那一段）落地当天
 * 就配了这支判据——理由是这个库当天刚撞到的那条：
 *
 * > **一节没有效果，不只是没有可量的世界事实，
 * > 也意味着它可能从未被任何存在性、承接性或可达性判据真正观察过。**
 *
 * `exam:first#let-be-gone` 那一节就是这么躺了很久：只有一句话、
 * 没有效果，于是没有任何判据问过它到不到得了。**东西落下去那一刻，
 * 才第一次有人看见它。**
 *
 * ## 它问四件事
 *
 * ```
 * 一  真世里落得下来吗          门槛是零：一世也没有就是这一环死了
 * 二  只在【殁】的时候落         交出去的不算遗物，他还活着那些家什还是他的
 * 三  落下的是【他的】营生       爹是木匠而留下一把镰刀，那是张冠李戴
 * 四  说不出营生的人不落东西     宁可什么也不落，不落一件说不出来历的
 * ```
 *
 * ⚠️ 第四条是**否定式**的，所以它配了打断验：把校验去掉，判据必须红。
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { RELICS, doingAsLivelihood, relicOf } from '../src/content/relics'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Livelihood } from '../src/types/game'

const BY_ID = new Map(Object.entries(RELICS).map(([kind, one]) => [one.id, kind as Livelihood]))
const RUNS = 300
let bad = 0

console.log(`\n=== 遗物：当家的人没了，他用过的那几样 ===\n`)

let passed = 0
let died = 0
let landed = 0
/** 落下的东西跟那个人的营生对不上 */
const mismatched: string[] = []
/** 没殁而落了东西——`交` 出去的不该留下遗物 */
const tooEager: string[] = []
const byKind = new Map<string, number>()

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const character = useCharacterStore()
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

  const how = world.getFlag('head-passed-how')
  const from = world.getFlag('head-passed-from')
  if (how !== undefined) passed += 1
  if (how === '殁') died += 1

  const relic = character.inventory.find((one) => BY_ID.has(one.id))
  if (relic === undefined) continue
  landed += 1
  byKind.set(relic.id, (byKind.get(relic.id) ?? 0) + 1)

  // 二、交出去的不该留下遗物
  if (how !== '殁' && typeof from === 'string' && relic.keepsake?.from === from) {
    if (tooEager.length < 4) tooEager.push(`${relic.name}（这一户是「${String(how)}」的）`)
  }

  // 三、落下的东西得跟【那个人】的营生对得上
  const owner = relic.keepsake?.from
  if (owner === undefined) {
    mismatched.push(`${relic.name} 没记是谁留下的`)
    continue
  }
  const person = people.personOf(owner)
  const kind = person?.livelihood ?? doingAsLivelihood(person?.doing)
  const want = kind === undefined ? undefined : relicOf(kind)?.id
  if (want !== undefined && want !== relic.id && mismatched.length < 4) {
    mismatched.push(`${people.callOf(owner)}是「${String(kind)}」而留下的是 ${relic.id}`)
  }
}

console.log(`  ${RUNS} 世：换过户主 ${passed} · 其中殁 ${died} · 行囊里真有那件东西 ${landed}`)
console.log(`  按营生分：` + [...byKind.entries()].map(([k, v]) => `${k} ${v}`).join('，') + `\n`)

// —— 一、真世里落得下来吗 ——
if (landed === 0) {
  console.log(`  ✗ ${RUNS} 世一件遗物也没落下——这一环在库里是死的。`)
  console.log(`      ⚠️ 而这种坏法印出来跟「稀有」一模一样。查它要在 settleHeads 那一段插 log`)
  console.log(`      印【这个人的营生取到了没有】——那正是它头两版各栽一次的地方。`)
  bad += 1
} else {
  console.log(`  ✓ 落得下来：${landed}/${died} 世（殁了的里头）。`)
}

// —— 二、交出去的不算 ——
if (tooEager.length > 0) {
  console.log(`  ✗ ${tooEager.length} 处「交」出去也留下了遗物：`)
  for (const one of tooEager) console.log(`      ${one}`)
  console.log(`      ——他还活着，那些家什还是他的。`)
  bad += 1
} else {
  console.log(`  ✓ 只在殁的时候落，交出去的不算。`)
}

// —— 三、张冠李戴 ——
if (mismatched.length > 0) {
  console.log(`  ✗ ${mismatched.length} 处落下的东西跟那个人的营生对不上：`)
  for (const one of mismatched) console.log(`      ${one}`)
  bad += 1
} else {
  console.log(`  ✓ 落下的是他自己那一行的家什。`)
}

// —— 四、说不出营生的人不落东西（打断验）——
{
  const fake = doingAsLivelihood('讨饭的')
  const real = doingAsLivelihood('务农')
  if (fake !== undefined) {
    console.log(`  ✗ 尺子自检：「讨饭的」被当成了营生（${String(fake)}）——校验形同虚设。`)
    bad += 1
  } else if (real !== '务农') {
    console.log(`  ✗ 尺子自检：「务农」没认出来——校验把该过的也挡了。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：「讨饭的」认不出（不落东西），「务农」认得出。`)
  }
}

console.log(
  `\n  ⚠️ 「殁」和「真有」对不上的 ${died - landed} 世＝营生问不出来的人。` +
    `\n  那是有意的：宁可什么也不落，不落一件说不出来历的东西。\n`,
)
console.log(bad === 0 ? `  ✓ 遗物这一环，四件事都对。\n` : `  ✗ ${bad} 项不成立。\n`)
if (bad > 0) process.exitCode = 1
