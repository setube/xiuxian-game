/**
 * 「心愿」那一支第四节的单世模拟，从 `scripts/wishes.ts` 原样搬出来。
 *
 * 走法一步没动——同一套年表、同样五百回合上限、同样一路随机落笔。
 *
 * 返回的是每一世的三件事实：**这个愿望攒到了多高、有没有分岔、
 * 岔去了哪儿**。门槛（`BRANCH_AT`）、「没分岔不算一种落点」那条规矩、
 * 以及「抽到几种 / 一共几种」那两个数各自意味着什么，
 * 全留在 `wishes.ts` 那边——**判据不该跟着模拟一起搬走**。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useLeaningStore } from '../../src/stores/leanings'
import { useNarrativeStore } from '../../src/stores/narrative'
import { useWorldStore } from '../../src/stores/world'

export interface Observed {
  /** 「想活久一点」这辈子攒到过的最高处 */
  peak: number
  /** 有没有真的分过岔 */
  branched: boolean
  /** 岔去了哪个念头。没分岔就是 null */
  into: string | null
}

export function runShard(runs: number): Observed[] {
  const seen: Observed[] = []

  for (let i = 0; i < runs; i += 1) {
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
    const world = useWorldStore()
    seen.push({
      peak: leaning.peakOf('live-long'),
      branched: world.hasFlag('branched:live-long'),
      into: (world.getFlag('branched-into') as string | undefined) ?? null,
    })
  }

  return seen
}
