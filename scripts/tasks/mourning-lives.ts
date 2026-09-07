/**
 * 「丧事之后」那一支的单世模拟，在 worker 线程里跑。
 *
 * 只掷农户，走到十六岁：家里的人（爹娘哥）谁没了、怎么没的；编年里「没能熬过去」那句
 * 点的名是不是没了的那个人；守孝记录上有没有活人、有没有角色名（`elder`）。
 * 判据全在 `scripts/mourning.ts`，这里只记事实。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { ROLE_IDS } from '../../src/engine/interpolate'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'
import { useWorldStore } from '../../src/stores/world'
import { beOf } from '../origin'

export interface MournedLife {
  /** 家里没了的人：谁、怎么没的 */
  deaths: { id: string; cause: string }[]
  /** 编年里「没能熬过去」那句点的名不是没了的人 */
  misnamed: string[]
  /** 守孝记录上的活人 */
  mourningLiving: string[]
  /** 守孝记录上的角色名 */
  mourningRole: string[]
  mourned: number
  over: number
}

const KIN = ['father', 'mother', 'brother'] as const
const UNTIL = 16

function liveALife(): MournedLife {
  setActivePinia(createPinia())
  useHouseholdStore()
  useWorldStore()
  usePeopleStore()
  beOf('farm')
  const character = useCharacterStore()
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  const world = useWorldStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()
  for (let turns = 0; !narrative.ended && turns < 220 && character.age < UNTIL; turns += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
  }
  const out: MournedLife = {
    deaths: [],
    misnamed: [],
    mourningLiving: [],
    mourningRole: [],
    mourned: 0,
    over: 0,
  }
  for (const id of KIN) {
    const person = people.personOf(id)
    if (person && person.fate === '殁')
      out.deaths.push({ id, cause: person.death?.cause ?? '（没记死因）' })
  }
  // 「X那年入冬没能熬过去」：X 得是没了的人的称呼
  for (const entry of world.chronicle) {
    const at = entry.text.indexOf('那年入冬没能熬过去')
    if (at <= 0) continue
    const call = entry.text.slice(0, at)
    const named = Object.values(people.known).find((one) => one.calls === call)
    if (!named || people.isAlive(named.person)) out.misnamed.push(entry.text)
  }
  for (const one of character.undertakings) {
    if (one.id !== 'mourning') continue
    out.mourned += 1
    if (one.until !== null) out.over += 1
    if (one.who === undefined) continue
    if ((ROLE_IDS as readonly string[]).includes(one.who)) out.mourningRole.push(one.who)
    else if (people.isAlive(one.who)) out.mourningLiving.push(one.who)
  }
  return out
}

export function runShard(runs: number): MournedLife[] {
  const lives: MournedLife[] = []
  for (let i = 0; i < runs; i += 1) lives.push(liveALife())
  return lives
}
