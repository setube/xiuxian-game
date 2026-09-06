/**
 * 「注意力」那一支第三节的单世模拟，从 `scripts/attention.ts` 原样搬出来。
 *
 * 走法一步没动——同一套年表、同样两百回合上限、同样一路随机落笔。
 *
 * 返回的是一世跑完时那两个旗标的原样，不是算好的比例。
 * 「哪两种读法算绕开走了」（`WALKS_AWAY`）、三档怎么分，
 * 连同解释它们的注释，全留在 `attention.ts` 那边——**判据不跟着模拟搬走**。
 *
 * 取不到就记 `null`。原文那两处写的是 `typeof x !== 'string' 就 continue`，
 * 差别只在写法：「没有这一格」和「这一格不是字符串」在那两句判断里
 * 本来就是同一种情形。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useNarrativeStore } from '../../src/stores/narrative'
import { useWorldStore } from '../../src/stores/world'

export interface Observed {
  /** 那天他最后那一趟落在哪一档。没走上过山道就是 null */
  level: string | null
  /** 他把那个人读成了什么 */
  reading: string | null
}

function asText(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function runShard(runs: number): Observed[] {
  const seen: Observed[] = []

  for (let i = 0; i < runs; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const world = useWorldStore()
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()

    let turns = 0
    while (!narrative.ended && turns < 200) {
      const open = narrative.options.filter((option) => !option.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }

    seen.push({
      level: asText(world.getFlag('attention')),
      reading: asText(world.getFlag('wounded-reading')),
    })
  }

  return seen
}
