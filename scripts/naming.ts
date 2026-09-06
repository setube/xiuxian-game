/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 名字要有人告诉你才知道。
 *
 * ## 这一道守的是一条硬规矩（用户 2026-09-07，26.md）
 *
 * 世界里的人先独立存在，玩家对他的姓名、身份、家世的认识必须从真实接触里来——在玩家还不知道
 * 他叫什么之前，正文和选项里不得写出他的姓名。「王家的那个孩子」「卖柴的年轻人」是认知不足时
 * 的自然指代，不是人物实体；人口册上的「陈安」是人物实体，不是玩家嘴里的称呼。
 *
 * 库里这条线早就分开了：`roster` 是世界人物库（有姓有名），`known` 是玩家认知库（`calls` 是玩家
 * 此刻怎么叫他，`knowsName` 单独一格，要 `meet` 带 `name: true` 才置真）。`callOf` 不知道名字就绝
 * 不落名字。**可正文是人写的**：作者知道那个先生叫周敬之，手一滑就写进正文了——这一支就是量这个。
 *
 * ## 判据
 *
 *   一、随机人生里，凡是人口册上有名有姓的人，玩家还不 `knowsName` 的时候，正文、选项、回响里
 *       不得出现他的全名（姓+名）。爹娘也一样：一出生就认得，不等于知道他叫什么。
 *   二、`callOf` 对不知道名字的人不落名字；知道了才落。
 *   三、尺子自检：往正文里塞一句带全名的话，抓得到。
 *
 * 跑法：bun scripts/naming.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'

const RUNS = 120

interface Leak {
  id: string
  name: string
  where: '正文' | '选项'
  text: string
}

const leaks: Leak[] = []
/** 玩家知道名字之后正文里写了名字的次数——尺子咬得到的地方 */
let namedFine = 0
let personsSeen = 0
let namedPersons = 0
let callWrong = 0

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()
  const kept = new Set<string>()
  const drain = (): string[] => {
    const fresh: string[] = []
    for (const item of narrative.stream) {
      if (kept.has(item.id)) continue
      kept.add(item.id)
      if ('text' in item.block && item.block.text) fresh.push(item.block.text)
      if (item.block.kind === 'dialogue' && item.block.speaker) fresh.push(item.block.speaker)
    }
    return fresh
  }
  drain()
  for (let turn = 0; !narrative.ended && turn < 240; turn += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    const fresh = drain()
    const labels = narrative.options.map((o) => o.choice.label)
    for (const person of Object.values(people.roster)) {
      // 「氏」不是名，「秦娘」的「娘」是名——全名得两个字以上才认，一个字的姓名撞上别的词不算数
      const name = `${person.surname}${person.given}`
      if (person.given === '氏' || name.length < 2) continue
      const knows = people.known[person.id]?.knowsName === true
      const hits = fresh.filter((text) => text.includes(name))
      const labelHits = labels.filter((label) => label.includes(name))
      if (knows) {
        namedFine += hits.length + labelHits.length
        continue
      }
      for (const text of hits) leaks.push({ id: person.id, name, where: '正文', text })
      for (const text of labelHits) leaks.push({ id: person.id, name, where: '选项', text })
    }
  }
  // 二、callOf 不知道名字不落名字
  for (const person of Object.values(people.roster)) {
    if (!people.known[person.id]) continue
    personsSeen += 1
    const name = `${person.surname}${person.given}`
    const called = people.callOf(person.id)
    const knows = people.known[person.id]?.knowsName === true
    if (knows) namedPersons += 1
    if (!knows && called === name) callWrong += 1
    if (knows && called !== name) callWrong += 1
  }
}

console.log(`\n=== 名字要有人告诉你才知道（${RUNS} 世）===\n`)
let bad = 0

const dedup = [
  ...new Set(
    leaks.map((one) => `${one.where}　${one.name}（${one.id}）　${one.text.slice(0, 40)}`),
  ),
]
if (dedup.length > 0) {
  console.log(`  ✗ 一、${dedup.length} 处玩家还不知道名字，正文或选项里却写出了全名：`)
  for (const line of dedup.slice(0, 20)) console.log(`      ${line}`)
  bad += 1
} else {
  console.log(
    `  ✓ 一、玩家不知道名字的人，正文和选项里一处全名也没有。（知道名字之后写了名字的 ${namedFine} 处，尺子咬得到）`,
  )
}

if (callWrong > 0) {
  console.log(`  ✗ 二、${callWrong} 处 callOf 把不知道的名字落到了纸上，或知道了却不用。`)
  bad += 1
} else
  console.log(
    `  ✓ 二、${personsSeen} 个认得的人里知道名字的 ${namedPersons} 个：不知道的一律按称呼叫，知道的才叫名字。`,
  )

// 三、尺子自检
{
  // 要一个生下来有爹的人生。有的境况生下来就没爹（种子 19sygn95try1 撞上过），掷到有为止
  let people = usePeopleStore()
  for (let tries = 0; tries < 60; tries += 1) {
    setActivePinia(createPinia())
    people = usePeopleStore()
    useStory(lifeScenes, { events: lifeEvents, routine: lifeRoutine, finale: lifeFinale }).begin()
    if (people.personOf('father')) break
  }
  const father = people.personOf('father')
  const wrong: string[] = []
  if (!father) wrong.push('掷了六十世没有一世生下来有爹，摆不出局')
  else {
    const name = `${father.surname}${father.given}`
    const knows = people.known['father']?.knowsName === true
    if (knows) wrong.push('一出生就知道爹叫什么——「爹」是称呼，名字是另一回事')
    if (people.callOf('father') === name) wrong.push('不知道名字，callOf 却落了名字')
    const probe = `你听见有人在门外喊${name}。`
    if (!probe.includes(name)) wrong.push('尺子自检：塞进去的全名没找着')
    people.learnName('father')
    if (people.callOf('father') !== name)
      wrong.push(`知道了名字，callOf 却还叫「${people.callOf('father')}」`)
  }
  if (wrong.length > 0) {
    console.log(`  ✗ 三、尺子自检：${wrong[0]}`)
    bad += 1
  } else console.log('  ✓ 三、尺子自检：出生时不知道爹叫什么、callOf 不落名字；有人告诉了才落。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else console.log('  名字要有人告诉你才知道：全部成立。\n')
