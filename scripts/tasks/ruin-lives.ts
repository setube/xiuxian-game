/**
 * 「家业毁掉」那一支的单世模拟，在 worker 线程里跑。
 *
 * 只掷农户：地抵债这一卷只有种地的人家走得到，别的出身掷出来是白跑。
 * 每一世记四样：父债链走没走到尽头（客死或杳）、地抵没抵债、抵债之后
 * 田那一格是什么、抵债之后正文里还有没有把地当自家的那几句。
 *
 * 判据全在 `scripts/ruin.ts` 那边，这里只记事实。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'
import { useWorldStore } from '../../src/stores/world'
import { beOf } from '../origin'

export interface RuinedLife {
  /** 父债链走到了尽头：父亲客死或再没消息 */
  fatherLost: boolean
  /** 地抵了债那一卷演过了 */
  ruined: boolean
  /** 抵债那一刻田那一格是什么、债还剩多少 */
  atRuin: { tenure: string | null; debt: number } | null
  /** 这一世结束时田那一格 */
  tenureAtEnd: string | null
  /** 抵债那一刻父亲的下落：殁／杳，以及死因——链尾之外的死法也会走到这一卷 */
  father: { fate: string; cause: string } | null
  /** 地抵了债之后，正文里还把地当自家的那几句 */
  ownedAfter: string[]
}

/** 抵了债之后不该再出现的话：这几句都默认地是自家的 */
const OWNING: readonly string[] = ['如今是你的', '地按亩分', '把家里的地', '家里的地接了过来']

function liveALife(): RuinedLife {
  setActivePinia(createPinia())
  useHouseholdStore()
  useWorldStore()
  usePeopleStore()
  beOf('farm')
  useCharacterStore()
  const household = useHouseholdStore()
  const narrative = useNarrativeStore()
  const world = useWorldStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  const out: RuinedLife = {
    fatherLost: false,
    ruined: false,
    atRuin: null,
    tenureAtEnd: null,
    father: null,
    ownedAfter: [],
  }
  const people = usePeopleStore()
  const seen = new Set<string>()
  story.begin()
  for (const item of narrative.stream) seen.add(item.id)
  for (let turns = 0; !narrative.ended && turns < 220; turns += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    if (!out.ruined && world.hasFlag('event:debt-fields')) {
      out.ruined = true
      const father = people.personOf('father')
      out.father = { fate: father?.fate ?? '（没有这个人）', cause: father?.death?.cause ?? '' }
    }
    if (!out.ruined) continue
    // 年表挑中那一卷时旗就立了，可正文还停在第一节等你选——田那一格要等这一卷演完再看
    if (out.atRuin === null) {
      if ((narrative.sceneId ?? '') === 'debt:fields') continue
      out.atRuin = { tenure: household.tenure, debt: household.debt }
      // 这一卷自己的正文不算「之后」
      for (const item of narrative.stream) seen.add(item.id)
      continue
    }
    for (const item of narrative.stream) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      const text = 'text' in item.block ? item.block.text : ''
      if (OWNING.some((word) => text.includes(word))) out.ownedAfter.push(text)
    }
    for (const option of narrative.options) {
      if (option.locked) continue
      const label = option.choice.label
      if (OWNING.some((word) => label.includes(word))) out.ownedAfter.push(`选项：${label}`)
    }
  }
  out.fatherLost = world.hasFlag('event:debt-death') || world.hasFlag('event:debt-silence')
  out.tenureAtEnd = household.tenure
  return out
}

export function runShard(runs: number): RuinedLife[] {
  const lives: RuinedLife[] = []
  for (let i = 0; i < runs; i += 1) lives.push(liveALife())
  return lives
}
