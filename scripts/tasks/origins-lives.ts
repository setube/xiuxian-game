/**
 * 「出身」那一支的单世模拟，从 `scripts/origins.ts` 原样搬出来。
 *
 * 走法一步没动——同一套年表、同样两百回合上限、同样一路随机落笔。
 *
 * ## 返回的是每一世的几件事实，不是算好的那张表
 *
 * 原先循环里直接往 `rowOf(household.origin)` 上累加。这里只把
 * 「这一世是哪种出身、那几格各是真是假」取出来，**归行、算百分比、
 * 以及那些解释为什么这张表不该被当数读的注释，全留在 `origins.ts` 那边**。
 *
 * ## `OWN_EVENT` 是传进来的，不是搬过来的
 *
 * 判断「有没有走自己那一行」要查一张「出身 → 专属卷」的表，
 * 而那张表在 `origins.ts` 里另有四处用到，还带着一整段解释
 * 「键是出身主键、可年表那边认的不是主键」。把它搬过来，那段话就跟
 * 它的另外三个使用者分了家；抄一份过来，则是**两份会各自漂**。
 * 所以经 `payload` 递进来——它是纯数据，结构化克隆搬得动。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import { useWorldStore } from '../../src/stores/world'
import type { OriginId } from '../../src/types/game'

export interface Observed {
  origin: OriginId
  schooled: boolean
  /** 撞上了自己那一行的专属卷 */
  ownScene: boolean
  heardOfCultivators: boolean
  recognized: boolean
  revealed: boolean
  /** 一生停在哪一节。没收尾的那一种也要记，它自己就是一种结果 */
  ending: string
}

export function runShard(runs: number, ownEvent: Partial<Record<OriginId, string>>): Observed[] {
  const seen: Observed[] = []

  for (let i = 0; i < runs; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const world = useWorldStore()
    const character = useCharacterStore()
    const household = useHouseholdStore()
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()

    let turns = 0
    while (!narrative.ended && turns < 200) {
      const open = narrative.options.filter((o) => !o.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }

    const own = ownEvent[household.origin]
    seen.push({
      origin: household.origin,
      schooled: world.getFlag('schooled') === true,
      ownScene: Boolean(own) && world.hasFlag(own!),
      heardOfCultivators: character.knows('cultivators-exist'),
      recognized: world.hasFlag('saw-a-cultivator'),
      revealed: character.inventory.some((item) => item.formerName !== undefined),
      ending: narrative.nodeId ?? '(未收尾)',
    })
  }

  return seen
}
