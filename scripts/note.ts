/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 人物面板上那一行字，说的是不是真话。
 *
 * ## 这一支是从「28岁。还在襁褓里」长出来的
 *
 * 人际面板上出现过这么一行：
 *
 *     程安　子
 *     28岁。还在襁褓里
 *
 * `Person.doing` 这一格**出生那天写下就再也不变**。从前人生到十六岁为止，
 * 家里添的孩子最多几岁，「还在襁褓里」一直是真的；
 * 人生拉长到六十几岁之后，同一句话就成了这个样子。
 *
 * 病根不在那个孩子，在**往这一格里填了一句不是营生的话**：
 * 「还在襁褓里」「还没成人」回答的是「他多大」，而年龄就写在它左边，
 * 同一行里说了两遍，还说岔了一遍。
 *
 * ## 跟 `scripts/savefile.ts` 分工
 *
 * 那一支构造残缺的人喂给 `engine/note.ts`，守的是「不许印出英文」。
 * 这一支跑**真的人生**，守的是「那一行字到死都还成立」——
 * 这个坏法只在活过几十年之后才显形，构造数据量不到。
 *
 * 跑法：npx vite-node scripts/note.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { HOUSEHOLD_BONDS, noteOf } from '../src/engine/note'
import { useStory } from '../src/engine/story'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'

/**
 * 走多少世。
 *
 * 这一支要等的是**家里的孩子长到成年**——得先掷中生孩子那一节，
 * 再活够十几二十年。三百世下这样的人有几十个，够第一条踩实。
 * 第五条会把实际采到多少个印出来，采不够会红。
 */
const RUNS = 300

/**
 * 这一格里不该出现的话。
 *
 * **这是一本登记簿，不是一张完备的表。** 它登记的是这一格真的犯过的错：
 * 往「他做什么营生」里填了「他多大」。判据靠它是有局限的——
 * 换一句没登记过的年龄话（「尚在总角」），这一条照样绿。
 *
 * 之所以还是要它，是因为**这一格是自由字符串，故意不枚举**
 * （世上的营生数不完，见 `types/game.ts`）。没有一个「什么算营生」的集合
 * 可以照着判，能判的只有「什么明显不是」。
 * 再往这儿填年龄话的时候，加一行到这里来。
 */
const NOT_A_LIVELIHOOD: readonly string[] = ['襁褓', '成人', '岁']

/** 一个人的那一行字，连同他当时多大 */
interface Line {
  who: string
  age: number
  doing: string
  text: string
}

const grown: Line[] = []
const offenders: Line[] = []
/** 落回了家业的外人。一个也不该有 */
const strangersWorkingTheFarm: Line[] = []
let people_seen = 0

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
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

  // 咽气那年，人物面板上每个人那一行。这是这一格能被读到的最后一刻，
  // 也是它最容易变成假话的一刻——它是几十年前写下的
  for (const person of Object.values(people.roster)) {
    people_seen += 1
    const age = people.ageOf(person.id)
    const bonds = people.bondsWith(person.id)
    const athome = bonds.some((bond) => HOUSEHOLD_BONDS.includes(bond))
    // 照人际面板的算法来：只有自家人落回家业
    const line: Line = {
      who: person.id,
      age,
      doing: person.doing ?? '',
      text: noteOf({
        person,
        age,
        vanished: '再没有消息。',
        fallback: athome ? household.livelihood : undefined,
      }),
    }

    if (person.doing && NOT_A_LIVELIHOOD.some((word) => person.doing!.includes(word))) {
      offenders.push(line)
    }
    // 外人身上不许出现这家的营生。他自己写着「教你认字」的不算——
    // 那是他自己的，落回来的才算
    if (!athome && !person.doing && line.text.includes(household.livelihood)) {
      strangersWorkingTheFarm.push(line)
    }
    // 家里的孩子长到成年——这一条是第一条的踩实处
    if ((person.id === 'son' || person.id === 'daughter') && age >= 16) grown.push(line)
  }
}

console.log(`\n=== 面板上那一行字（${RUNS} 世）===\n`)

if (grown.length > 0) {
  console.log('  家里的孩子长到成年之后，那一行写的是：')
  const shown = new Set<string>()
  for (const line of grown) {
    const key = line.text
    if (shown.has(key)) continue
    shown.add(key)
    console.log(`    ${line.who.padEnd(9)}${line.text}`)
    if (shown.size >= 6) break
  }
  console.log()
}

let bad = 0

/**
 * 一、这一格里不许写年龄话。
 *
 * 它守的是「营生」和「多大」不许混成一格。混了的后果不是当场难看——
 * 「0岁。还在襁褓里」读着毫无问题——**是二十八年后才难看**。
 */
if (offenders.length > 0) {
  console.log(`  ✗ ${offenders.length} 个人的营生那一格里写着年龄话：`)
  for (const one of offenders.slice(0, 5)) {
    console.log(`      ${one.who}　${one.age} 岁，而这一格写着「${one.doing}」→「${one.text}」`)
  }
  console.log(`    「他多大」已经写在这一行左边了。这一格该写「他做什么」，说不上就空着。`)
  bad += 1
}

/**
 * 二、家业只落回自家人身上。
 *
 * 这一条是上一条那个 `fallback` 的对照组，缺了它落回就是没人管的：
 * **一个「谁都落回」的实现照样能让面板好看**，而那样先生会变成务农的，
 * 路过的商旅会跟着你家打猎。
 */
if (strangersWorkingTheFarm.length > 0) {
  console.log(`  ✗ ${strangersWorkingTheFarm.length} 个外人身上落回了这家的营生：`)
  for (const one of strangersWorkingTheFarm.slice(0, 5)) {
    console.log(`      ${one.who}　「${one.text}」`)
  }
  console.log(`    他不是这家的人，不做这家的活。`)
  bad += 1
}

/**
 * 三、第一条得真有人踩在上头。
 *
 * 没有一个孩子活到成年的话，第一条会安安静静地全绿——
 * **没查到和查过了长得一模一样。**
 */
if (grown.length === 0) {
  console.log(
    `  ✗ ${RUNS} 世里没有一个孩子长到十六岁，第一条根本没被验过。` +
      `\n    这个坏法只在人活过几十年之后才显形，采不到那样的人就等于没查。`,
  )
  bad += 1
}

console.log(
  `  覆盖：${RUNS} 世 / 读到 ${people_seen} 个人的那一行 / ` +
    `其中长到成年的自家孩子 ${grown.length} 个`,
)

/**
 * 四、尺子自检：把改前那句话放回去，第一条必须红。
 *
 * 不自检的话第一条可能是空的——`NOT_A_LIVELIHOOD` 拼错一个字、
 * `person.doing` 因为改成可空而永远取不到值，它都会一声不吭地绿着。
 */
{
  const wrong = { id: 'son', doing: '还在襁褓里' }
  const caught = NOT_A_LIVELIHOOD.some((word) => wrong.doing.includes(word))
  if (!caught) {
    console.log(`  ✗ 尺子自检没通过：把「${wrong.doing}」摆到跟前，这把尺子没认出来。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：「${wrong.doing}」摆到跟前，认得出来。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  没有谁的营生那一格里写着他多大。')
  console.log('  **一格只说一件事，否则说的那件事会随着人一起变老。**\n')
}
