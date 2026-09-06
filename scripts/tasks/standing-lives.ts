/**
 * 「家境」那一支的单世模拟，从 `scripts/standing.ts` 原样搬出来。
 *
 * 走法一步没动——同一套年表、同样两百回合上限、同样每落一次笔就看一眼
 * 家境有没有挪动（岁数要在那一步**之后**读，因为效果里的 `time` 刚推过它）。
 *
 * ## 这里导出两样，各有各的去处
 *
 * `runShard` 给 worker：批量那 400 世摊开跑。
 *
 * `liveOne` 给主线程：那 400 世之后还有一段补跑，条件是
 * 「十一种出身还没凑齐就再掷一世」。**那一段天生是串行的**——
 * 每掷一世都要回头看已经攒到的集合够不够，摊开跑就不成立了。
 * 两边共用同一份走法，是为了不让批量和补跑悄悄变成两种人生。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import type { OriginId } from '../../src/types/game'

/** 十七岁往后才算数：之前那些是家里给的，不是他自己走出来的 */
const LATER_LIFE_FROM = 17

export interface Life {
  origin: OriginId
  founded: number
  final: number
  finalOutlook: string
}

export interface StandingShard {
  lives: Life[]
  /** 十七岁以后家境往下走过几步 / 一共动过几步。第二条判据的分子分母 */
  downSteps: number
  allSteps: number
}

/** 走一世，返回这一世的落点和它贡献的那几步 */
export function liveOne(): { life: Life; downSteps: number; allSteps: number } {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const household = useHouseholdStore()
  const character = useCharacterStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })

  const origin = household.origin
  const founded = household.standing

  story.begin()

  let downSteps = 0
  let allSteps = 0
  let previous = household.standing
  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1

    const now = household.standing
    // 岁数在每一步之后读，因为效果里的 time 刚刚推过它
    if (character.age >= LATER_LIFE_FROM && now !== previous) {
      allSteps += 1
      if (now < previous) downSteps += 1
    }
    previous = now
  }

  return {
    life: { origin, founded, final: household.standing, finalOutlook: household.outlook },
    downSteps,
    allSteps,
  }
}

export function runShard(runs: number): StandingShard {
  const shard: StandingShard = { lives: [], downSteps: 0, allSteps: 0 }
  for (let i = 0; i < runs; i += 1) {
    const one = liveOne()
    shard.lives.push(one.life)
    shard.downSteps += one.downSteps
    shard.allSteps += one.allSteps
  }
  return shard
}
