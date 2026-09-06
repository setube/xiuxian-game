/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 占位符走查。
 *
 * 起因是一个真实的 bug：点完选项，状态栏上写着 `{home}`。
 * 根子在于占位符只替换正文，而 effect 的参数、选项上的字都绕过了那一道加工。
 *
 * 这里跑完一整世之后，把所有会上界面的字符串翻一遍，
 * 只要还剩一个 `{`，就是漏了一处出口。
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { ORIGINS } from '../src/content/origins'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'

import { beOf } from './origin'

const RUNS = 400
const leaks: string[] = []

function check(where: string, text: string | null | undefined): void {
  if (typeof text === 'string' && text.includes('{')) leaks.push(`${where}: ${text}`)
}

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const world = useWorldStore()
  const character = useCharacterStore()
  const household = useHouseholdStore()
  const people = usePeopleStore()
  // 轮着钉死出身，好让十一种都被扫到
  beOf(ORIGINS[i % ORIGINS.length]!.id)
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()

  let turns = 0
  while (!narrative.ended && turns < 200) {
    // 选项上的字也要查——它和正文一样是给玩家读的
    for (const option of narrative.options) {
      check('选项', option.choice.label)
      check('选项提示', option.choice.hint)
      check('锁定提示', option.choice.lockedHint)
    }
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }

  // 正文
  for (const item of narrative.stream) {
    const block = item.block
    if ('text' in block) check('正文', block.text)
    if (block.kind === 'heading') check('标题', block.title)
    if (block.kind === 'dialogue') check('说话人', block.speaker)
  }
  // 状态栏与足迹
  check('所在', world.place)
  for (const place of world.visited) check('足迹', place)
  // 各个面板
  check('身份', character.identity)
  check('姓名', character.name)
  check('家乡', household.home)
  for (const entry of world.chronicle) check('编年', entry.text)
  for (const k of character.knowledge) {
    check('见闻标题', k.title)
    check('见闻', k.summary)
  }
  for (const it of character.inventory) {
    check('物件', it.name)
    check('物件注', it.note)
    check('物件旧名', it.formerName)
  }
  // 人际现在只有一个来源：人口册。玩家自己也是图里的一个节点
  for (const [id, acquaintance] of Object.entries(household ? people.known : {})) {
    check('称呼', acquaintance.calls)
    check('人际注', acquaintance.note)
    const person = people.personOf(id)
    if (person) {
      check('姓', person.surname)
      check('名', person.given)
      check('手上的活', person.doing)
      check('所在', person.place)
      for (const chapter of person.history) check('往事', chapter.what)
    }
  }
  for (const m of household.members) check('家人', m.relation)
  for (const aspect of Object.values(character.aspects)) {
    check('自述', aspect.self)
    for (const claim of aspect.claims) {
      check('评说', claim.text)
      check('评说来源', claim.source)
      check('疑问', claim.doubt)
    }
  }
}

console.log(`\n=== 占位符走查（${RUNS} 世，十一种出身轮流钉死）===\n`)
if (leaks.length === 0) {
  console.log('  没有漏网的占位符。\n')
} else {
  const unique = [...new Set(leaks)]
  console.log(`  漏了 ${leaks.length} 处（去重后 ${unique.length} 种）：\n`)
  for (const leak of unique.slice(0, 40)) console.log(`    ${leak}`)
  console.log()
  process.exitCode = 1
}
