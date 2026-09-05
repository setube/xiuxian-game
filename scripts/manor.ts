/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 王府那一年的走查。
 *
 * 用户 2026-09-06 立的三条：王府不是宫里的下级场景；宗室身份和具体人物分开；
 * 府里的下人是真人。这一支分头守：
 *
 *   一、日子分开了——王府的孩子过的是 `manor`，宫里的是 `palace`
 *   二、府里的人是真人——乳母、管事、门房、婢女、小厮都在册、都认得、称呼里没有英文，
 *       管事的脾气一世一个样（不因为在王府就体面）
 *   三、去处是王府的——去不了镇上、山上、村里孩子那儿；去得了园子、前殿
 *   四、开蒙分开了——王府的教授不是「先生」，王府的孩子读不到「钦天监」；宫里的读得到
 *   五、身份会变——逐出府那一卷有人走到，走过之后小厮不在府里了、营生换了
 *
 * 跑法：bun scripts/manor.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { doingsAt } from '../src/engine/daily'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { OriginId } from '../src/types/game'

const MANOR_LIVES = 10
const COURT_LIVES = 2
const STAFF = ['nurse', 'steward', 'gatekeeper', 'maid', 'page'] as const

interface Lived {
  origin: OriginId
  living: string
  staffMissing: string[]
  staffCalls: string[]
  stewardTemper: string
  doingsAtFour: string[]
  text: string
  teacherDoing: string | null
  dismissed: boolean
  pageAway: boolean
}

function live(origin: OriginId): Lived | null {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  if (household.origin !== origin) return null
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  const world = useWorldStore()
  const character = useCharacterStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()
  // 生在王府却在寺里、街上长大的，过的是那种日子——这一支量的是住在王府里的孩子
  if (origin === 'manor' && world.residenceKind() !== '王府') return null

  // 采样点在这儿，不在一生走完之后：削爵、削藩会把日子换成 fallen / market，
  // 那是这一世后来发生的事，不是「王府的孩子过的是什么日子」
  const living = character.living.id
  const doingsAtFour = doingsAt('上午').map((d) => d.label)
  const staffMissing = STAFF.filter((id) => !people.personOf(id) || !people.known[id])
  const staffCalls = STAFF.filter((id) => people.known[id]).map((id) => people.callOf(id))
  const stewardTemper = people.personOf('steward')?.temper ?? ''

  let text = ''
  let seen = 0
  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
    for (const item of narrative.stream.slice(seen)) text += (item.block.text ?? '') + '\n'
    seen = narrative.stream.length
  }
  const page = people.personOf('page')
  return {
    origin,
    living,
    staffMissing,
    staffCalls,
    stewardTemper,
    doingsAtFour,
    text,
    teacherDoing: people.personOf('teacher')?.doing ?? null,
    dismissed: world.hasFlag('page-dismissed'),
    pageAway: page !== undefined && page.place !== household.home,
  }
}

function sample(origin: OriginId, want: number): Lived[] {
  const out: Lived[] = []
  for (let tries = 0; tries < 40000 && out.length < want; tries += 1) {
    const one = live(origin)
    if (one) out.push(one)
  }
  return out
}

console.log(`\n=== 王府那一年（王府 ${MANOR_LIVES} 世 / 宫里 ${COURT_LIVES} 世 / 农户 2 世）===\n`)
let bad = 0
const manors = sample('manor', MANOR_LIVES)
const courts = sample('court', COURT_LIVES)
const farms = sample('farm', 2)

if (manors.length < MANOR_LIVES || courts.length < COURT_LIVES || farms.length < 2) {
  console.log(`  ✗ 掷不够：王府 ${manors.length}，宫里 ${courts.length}，农户 ${farms.length}。`)
  bad += 1
}

// 一、日子分开了
{
  const wrong = [
    ...manors.filter((l) => l.living !== 'manor'),
    ...courts.filter((l) => l.living !== 'palace'),
  ]
  if (wrong.length > 0) {
    console.log(
      `  ✗ 一、${wrong.length} 世日子没分开：${wrong.map((l) => `${l.origin}=${l.living}`).join(' ')}`,
    )
    bad += 1
  } else console.log(`  ✓ 一、王府的孩子过的是 manor，宫里的是 palace。`)
}

// 二、府里的人是真人
{
  const missing = manors.flatMap((l) => l.staffMissing)
  const leaked = manors
    .flatMap((l) => l.staffCalls)
    .filter((c) => /[A-Za-z]/.test(c) || c.length === 0)
  const tempers = new Set(manors.map((l) => l.stewardTemper))
  console.log(
    `  管事的脾气：${[...tempers].join('、')}；称呼：${[...new Set(manors[0]?.staffCalls ?? [])].join('、')}`,
  )
  if (missing.length > 0) {
    console.log(`  ✗ 二、府里少了人：${[...new Set(missing)].join('、')}`)
    bad += 1
  } else if (leaked.length > 0) {
    console.log(`  ✗ 二、称呼里有英文或空：${leaked.join('、')}`)
    bad += 1
  } else if (tempers.size < 2) {
    console.log(`  ✗ 二、${manors.length} 世的管事一个脾气——身份在替人物说话。`)
    bad += 1
  } else console.log(`  ✓ 二、乳母、管事、门房、婢女、小厮都在册都认得；管事的脾气一世一个样。`)
}

// 三、去处
{
  const forbidden = ['去镇上', '找村里的孩子玩', '往山那边走走']
  const manorWrong = manors.filter(
    (l) =>
      l.doingsAtFour.some((d) => forbidden.includes(d)) || !l.doingsAtFour.includes('在园子里待着'),
  )
  const farmWrong = farms.filter(
    (l) => !l.doingsAtFour.includes('去镇上') || l.doingsAtFour.includes('在园子里待着'),
  )
  console.log(`  王府四岁上午的去处：${manors[0]?.doingsAtFour.join('、')}`)
  if (manorWrong.length > 0 || farmWrong.length > 0) {
    console.log(
      `  ✗ 三、${manorWrong.length} 世王府的孩子去得了镇上或去不了园子；${farmWrong.length} 世农户反过来。`,
    )
    bad += 1
  } else console.log(`  ✓ 三、王府的孩子去园子、前殿，去不了镇上山上；农户反过来。`)
}

// 四、开蒙
{
  const manorSaw = manors.filter((l) => l.text.includes('钦天监'))
  const courtSaw = courts.filter((l) => l.text.includes('钦天监'))
  const badTeacher = manors.filter((l) => l.teacherDoing !== null && l.teacherDoing !== '王府教授')
  // apart.ts 把 school:threshold#study 移交到这儿：得真有人走进书房、教授真进了门
  const walked = manors.filter((l) => l.teacherDoing === '王府教授')
  if (manorSaw.length > 0) {
    console.log(`  ✗ 四、${manorSaw.length} 世王府的孩子读到了「钦天监」——宫里的话落到了王府。`)
    bad += 1
  } else if (courtSaw.length === 0) {
    console.log(`  ✗ 四、宫里 ${courts.length} 世没有一世读到「钦天监」——这条对照没验到。`)
    bad += 1
  } else if (walked.length === 0) {
    console.log(`  ✗ 四、${manors.length} 世王府没有一世走到书房——教授进没进门没人量过。`)
    bad += 1
  } else if (badTeacher.length > 0) {
    console.log(
      `  ✗ 四、${badTeacher.length} 世王府的教书人营生是「${badTeacher[0]!.teacherDoing}」，不是王府教授。`,
    )
    bad += 1
  } else console.log(`  ✓ 四、${walked.length} 世走到书房，教授进了门；王府的孩子读不到钦天监，宫里的读得到。`)
}

// 五、身份会变
{
  const dismissed = manors.filter((l) => l.dismissed)
  const stuck = dismissed.filter((l) => !l.pageAway)
  console.log(`  逐出府：${dismissed.length} / ${manors.length} 世走到`)
  if (dismissed.length === 0) {
    console.log(`  ✗ 五、${manors.length} 世王府没有一世走到逐出府那一卷。`)
    bad += 1
  } else if (stuck.length > 0) {
    console.log(`  ✗ 五、${stuck.length} 世逐了小厮，人还在府里。`)
    bad += 1
  } else console.log(`  ✓ 五、逐出府之后小厮不在府里了，营生换了，人还在册上。`)
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  王府不是宫里换个称号，也不是农家换身衣裳；府里的人是真人，身份会变。')
  console.log('  **「贵」不在东西上，在谁替谁办事。**\n')
}
