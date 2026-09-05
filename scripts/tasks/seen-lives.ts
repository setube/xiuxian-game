/**
 * 「所见」那一支的单世模拟，从 `scripts/seen.ts` 原样搬出来。
 *
 * 搬出来只为一件事：**让它能在 worker 线程里跑**。
 * 走法一步没动——同一套年表、同样五百回合上限、同样每落一次笔就把
 * 新写进卷轴的正文捞一遍（`drain`）。
 *
 * `drain` 里那个 `kept` 是必须的，别在搬运时顺手简化掉：卷轴是
 * 一直往下写的，每次读到的是**整条流**而不是增量，不按 id 去重
 * 就会把同一句反复记进去，而那正是这一支要数的东西。
 *
 * 判据和报表一格没动，全留在 `seen.ts` 那边。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useNarrativeStore } from '../../src/stores/narrative'

function liveALife(): string[] {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  const kept = new Set<string>()
  const texts: string[] = []
  const drain = (): void => {
    for (const item of narrative.stream) {
      if (kept.has(item.id)) continue
      kept.add(item.id)
      if ('text' in item.block) texts.push(item.block.text)
    }
  }

  story.begin()
  drain()
  let turns = 0
  while (!narrative.ended && turns < 500) {
    const open = narrative.options.filter((option) => !option.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    drain()
    turns += 1
  }
  return texts
}

/** 这一片的那几世。合并就是把各片接起来——顺序不影响任何一格判据 */
export function runShard(runs: number): string[][] {
  const lives: string[][] = []
  for (let i = 0; i < runs; i += 1) lives.push(liveALife())
  return lives
}
