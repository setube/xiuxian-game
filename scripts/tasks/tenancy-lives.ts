/**
 * 「兼业与租佃」那一支的单世模拟，在 worker 线程里跑。
 *
 * 随机人生，随机选。每一世记：生在哪一行；生下来田是谁的、田主在不在册、活着没有；
 * 荒年求过缓租没有、他怎么答的；家里后来多了哪样贴补；以及咽气那年六问那段话
 * 跟家境两格对不对得上。判据全在 `scripts/tenancy.ts`。
 *
 * 只引 `src/` 与 pinia：任务模块不许引任何会装种子的东西（CLAUDE.md）。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { pathWords, pathsNow } from '../../src/engine/lotpath'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'
import { useWorldStore } from '../../src/stores/world'
import type { OriginId, Sideline, Tenure } from '../../src/types/game'

export type Policy = 'random' | 'keen'

export interface TenancyPayload {
  policy: Policy
}

/** 有心人：荒年里这几条路开着就走它。存在性那一批用，分布那一批照旧随机 */
const KEEN_CHOICES: ReadonlySet<string> = new Set(['beg-rent', 'peddle', 'needle'])

export interface TenancyLife {
  origin: OriginId
  /** 出生那一刻 */
  bornTenure: Tenure | null
  bornLandlord: string | null
  landlordEnrolled: boolean
  /** 田主在孩子十六岁前就没了。他会老会死，这不是错，只报个数 */
  landlordDiedYoung: boolean
  /** 生下来就有的贴补（出身表那一格掷的），没有是 null */
  bornSideline: Sideline | null
  /** 咽气那年 */
  tenure: Tenure | null
  landlord: string | null
  sideline: Sideline | null
  livelihood: string
  /** 荒年求过缓租：他怎么答的（缓／照收／量走），没求过是 null */
  rentAnswer: string | null
  /** 簿上有没有一笔欠田主的租子 */
  rentOwed: boolean
  /** 六问那段话 */
  said: string[]
  /** 田主的姓（六问该说出它） */
  landlordSurname: string | null
}

function liveALife(policy: Policy): TenancyLife {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  const world = useWorldStore()
  const people = usePeopleStore()
  const character = useCharacterStore()
  const narrative = useNarrativeStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()
  const bornTenure = household.tenure
  const bornLandlord = household.landlord
  const bornSideline = household.sideline
  const landlordEnrolled = people.personOf('landlord') !== undefined
  let landlordDiedYoung = false
  for (let turns = 0; !narrative.ended && turns < 220 && character.died === null; turns += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    if (!landlordDiedYoung && landlordEnrolled && character.age < 16 && !people.isAlive('landlord'))
      landlordDiedYoung = true
    const wanted = policy === 'keen' ? open.find((o) => KEEN_CHOICES.has(o.choice.id)) : undefined
    story.choose((wanted ?? open[Math.floor(Math.random() * open.length)]!).choice)
  }
  const answer = world.getFlag('rent-answer')
  const landlordPerson =
    household.landlord === null ? undefined : people.personOf(household.landlord)
  return {
    origin: household.origin,
    bornTenure,
    bornLandlord,
    bornSideline,
    landlordEnrolled,
    landlordDiedYoung,
    tenure: household.tenure,
    landlord: household.landlord,
    sideline: household.sideline,
    livelihood: household.livelihood,
    rentAnswer: typeof answer === 'string' ? answer : null,
    rentOwed: people.ious.some((one) => one.creditor === 'landlord' && one.what === '一年的租子'),
    said: pathWords(pathsNow()),
    landlordSurname: landlordPerson?.surname ?? null,
  }
}

export function runShard(runs: number, payload: TenancyPayload): TenancyLife[] {
  const lives: TenancyLife[] = []
  for (let i = 0; i < runs; i += 1) lives.push(liveALife(payload.policy))
  return lives
}
