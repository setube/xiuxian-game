/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * NPC 实体走查。
 *
 * 验四件事，每一件都是这套系统的立身之本：
 *
 * 1. **父母是人，不是牌子。** 有名有姓、有年纪、有脾气，比玩家早出生二十几年。
 * 2. **他们在玩家出生前就有过人生。** 那些事是真的，但玩家一开始一件不知道。
 * 3. **离家不等于消失。** 父亲去外地做工之后，人还在册子上，还在某个地方。
 * 4. **玩家的认知是分层的。** 认识他 ≠ 知道他叫什么 ≠ 知道他的过去。
 *
 * 跑法：npx vite-node scripts/people.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'

const RUNS = 500

function live() {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const character = useCharacterStore()
  const people = usePeopleStore()
  const household = useHouseholdStore()
  const world = useWorldStore()
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
  return { character, people, household, world }
}

// —— 一、随便挑一世，把爹娘印出来 ——
console.log('\n=== 你爹是谁 ===\n')
{
  const { character, people, world } = live()
  for (const id of ['father', 'mother']) {
    const person = people.personOf(id)
    if (!person) continue
    const acquaintance = people.known[id]
    console.log(`  ${person.surname}${person.given}`)
    console.log(`    ${people.ageOf(id)}岁 · ${person.gender} · ${person.trade} · ${person.temper}`)
    console.log(`    此刻在：${person.place}`)
    console.log(`    下落：${person.fate}`)
    console.log(`    玩家叫他：${acquaintance?.calls ?? '（不认识）'}`)
    console.log(`    玩家知道他叫什么吗：${acquaintance?.knowsName ? '知道' : '不知道'}`)
    console.log(`    他这辈子的事（★ = 玩家知道了）：`)
    for (const chapter of person.history) {
      console.log(`      ${chapter.known ? '★' : '　'} ${chapter.atAge}岁：${chapter.what}`)
    }
    console.log()
  }
  console.log(`  （玩家今年 ${character.age} 岁，此刻是第 ${world.time.year} 年）\n`)
}

// —— 二、统计 ——
console.log('=== 五百世统计 ===\n')
let sameSurname = 0
let fatherHasPast = 0
let learnedSomething = 0
let learnedAdept = 0
let fatherAwayStillPlaced = 0
let fatherGoneButOnRoster = 0
const parentAges: number[] = []

for (let i = 0; i < RUNS; i += 1) {
  const { character, people, world } = live()
  const father = people.personOf('father')
  if (!father) continue

  // 玩家随父姓
  if (character.name.slice(0, 1) === father.surname) sameSurname += 1
  if (father.history.length > 0) fatherHasPast += 1
  if (father.history.some((c) => c.known)) learnedSomething += 1
  if (father.history.some((c) => c.id === 'met-adept' && c.known)) learnedAdept += 1

  // 离家之后，人还在某个地方——不是被删掉
  if (world.hasFlag('father-away') && father.place !== '' && father.fate === '在') {
    fatherAwayStillPlaced += 1
  }
  // 死了、失踪了，人也还在册子上
  if (father.fate !== '在') fatherGoneButOnRoster += 1

  parentAges.push(world.time.year - father.bornYear)
}

const pct = (n: number) => `${((n / RUNS) * 100).toFixed(1)}%`
console.log(`  玩家随父姓                        ${pct(sameSurname)}`)
console.log(`  父亲有自己的过去                  ${pct(fatherHasPast)}`)
console.log(`  玩家知道了他过去的至少一件事      ${pct(learnedSomething)}`)
console.log(`  玩家知道了「爹见过修士」          ${pct(learnedAdept)}`)
console.log(`  父亲在外地，但人还在世界上        ${pct(fatherAwayStillPlaced)}`)
console.log(`  父亲已故／失踪，但仍在册子上      ${pct(fatherGoneButOnRoster)}`)

const sorted = [...parentAges].sort((a, b) => a - b)
console.log(
  `\n  玩家十六岁时父亲的年纪：最小 ${sorted[0]}  中位 ${sorted[Math.floor(sorted.length / 2)]}  最大 ${sorted[sorted.length - 1]}`,
)

// —— 三、铁律：人不因离开视野而消失 ——
console.log('\n=== 铁律：离家 ≠ 消失 ===\n')
{
  let checked = 0
  let vanished = 0
  for (let i = 0; i < 300 && checked < 40; i += 1) {
    const { people, world } = live()
    if (!world.hasFlag('father-away')) continue
    checked += 1
    const father = people.personOf('father')
    // 无论死活，他都该还在册子上，而且有个地方
    if (!father || !father.place) vanished += 1
  }
  console.log(`  查了 ${checked} 个父亲离过家的人生`)
  console.log(
    `  其中「父亲从世界上消失了」的：${vanished} 个${vanished === 0 ? '。人一直都在。' : '——这是重大缺陷。'}`,
  )
  if (vanished > 0) process.exitCode = 1
}
console.log()
