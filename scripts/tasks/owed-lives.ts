/**
 * 「遗债」那一支的单世模拟，在 worker 线程里跑。
 *
 * 只掷农户：哥没了那一卷只有分了家的农户走得到。每一世记：哥没了没有、他没那一刻
 * 两家之间欠着几笔、丧事那一卷演过之后还开着几笔、怎么了结的；以及哥没了之后
 * 正文里有没有「他也没提」那种让殁了的人开口的句子。判据全在 `scripts/owed.ts`。
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

export interface OwedLife {
  /** 哥没了那一卷演过了 */
  brotherGone: boolean
  /** 哥没那一刻，两家之间还开着的债 */
  debtsAtDeath: number
  /** 丧事那一卷演过之后还开着的 */
  openAfter: number
  forgiven: boolean
  repaid: boolean
  /** 哥没了之后，正文里让他「没提」的句子 */
  deadSpoke: string[]
}

const between = (one: { debtor: string; creditor: string }): boolean =>
  (one.debtor === 'me' && one.creditor === 'brother') ||
  (one.debtor === 'brother' && one.creditor === 'me')

function liveALife(): OwedLife {
  setActivePinia(createPinia())
  useHouseholdStore()
  useWorldStore()
  usePeopleStore()
  beOf('farm')
  useCharacterStore()
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  const world = useWorldStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  const out: OwedLife = {
    brotherGone: false,
    debtsAtDeath: 0,
    openAfter: 0,
    forgiven: false,
    repaid: false,
    deadSpoke: [],
  }
  const seen = new Set<string>()
  let deadAt: number | null = null
  story.begin()
  for (const item of narrative.stream) seen.add(item.id)
  for (let turns = 0; !narrative.ended && turns < 220; turns += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    const brother = people.personOf('brother')
    if (deadAt === null && brother && brother.fate === '殁') {
      deadAt = turns
      out.debtsAtDeath = people.ious.filter((one) => between(one) && one.settled === null).length
      for (const item of narrative.stream) seen.add(item.id)
      continue
    }
    if (deadAt === null) continue
    if (!out.brotherGone && world.hasFlag('event:kindred-brother-gone')) out.brotherGone = true
    for (const item of narrative.stream) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      const text = 'text' in item.block ? item.block.text : ''
      if (text.includes('他也没提')) out.deadSpoke.push(text)
    }
  }
  if (out.brotherGone && (narrative.sceneId ?? '') !== 'kindred:brother-gone') {
    out.openAfter = people.ious.filter((one) => between(one) && one.settled === null).length
  }
  out.forgiven = people.ious.some((one) => between(one) && one.how === '免')
  out.repaid = people.ious.some(
    (one) => one.debtor === 'me' && one.creditor === 'brother' && one.how === '还',
  )
  return out
}

export function runShard(runs: number): OwedLife[] {
  const lives: OwedLife[] = []
  for (let i = 0; i < runs; i += 1) lives.push(liveALife())
  return lives
}
