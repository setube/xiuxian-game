/**
 * 「一生长出了什么念头」那一支的单世模拟，从 `scripts/leanings.ts` 原样搬出来。
 *
 * 搬出来只为一件事：**让它能在 worker 线程里跑**。
 * 走法一步没动——同一套年表、同样五百回合上限、同样一路随机落笔。
 * 改的只是驱动：原先在脚本里一世一世 push 进数组，
 * 现在每片跑自己那几世，返回自己那一段，由主线程接起来。
 *
 * 判据和报表一格没动，全留在 `leanings.ts` 那边。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useLeaningStore } from '../../src/stores/leanings'
import { useNarrativeStore } from '../../src/stores/narrative'

export interface Lived {
  named: string[]
  stirring: string[]
  age: number
  trace: { at: number; text: string }[]
}

/** 随机走完一世，看他心里长出了什么 */
function liveALife(): Lived {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()
  let turns = 0
  while (!narrative.ended && turns < 500) {
    const open = narrative.options.filter((option) => !option.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }
  const leaning = useLeaningStore()
  return {
    named: leaning.named.map((item) => item.id),
    stirring: leaning
      .atLeast('反复')
      .filter((item) => item.namedAt === null)
      .map((item) => item.id),
    age: useCharacterStore().age,
    trace: leaning.growing
      .flatMap((item) => item.moments)
      .map((moment) => ({ at: moment.at.year, text: moment.text })),
  }
}

/** 这一片的那几世。合并就是把各片接起来——顺序不影响任何一格判据 */
export function runShard(runs: number): Lived[] {
  const lives: Lived[] = []
  for (let i = 0; i < runs; i += 1) lives.push(liveALife())
  return lives
}
