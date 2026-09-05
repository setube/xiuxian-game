/**
 * 「那册书的漏斗」那一支的单世模拟，从 `scripts/probe.ts` 原样搬出来。
 *
 * 走法一步没动——同一套年表、同样两百回合上限、同样一路随机落笔。
 *
 * 返回的是一世跑完时那几个旗标的**原样**，不是算好的漏斗。
 * 「哪几种读法会让他绕开走」（`WALKS_AWAY`）、「书在手里却没走修士那一档
 * 算被覆盖」这些判法，连同解释它们的注释，全留在 `probe.ts` 那边。
 *
 * 取不到的旗标一律记成 `null`。原文那几处写的是 `typeof x === 'string'`，
 * 差别只在写法：**「没有这一格」和「这一格不是字符串」在那几句判断里
 * 本来就是同一种情形**，都该落到「这一卷根本没结算过」那一档去。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useNarrativeStore } from '../../src/stores/narrative'
import { useWorldStore } from '../../src/stores/world'

export interface Observed {
  /** 那天他上了山道 */
  onTrail: boolean
  /** 那天他有没有把注意力放在那儿 */
  attentionCaught: boolean
  /** 他把那个人读成了什么 */
  reading: string | null
  /** 这一卷最后结算成了哪一档 */
  outcome: string | null
  /** 一生走完，那册书在不在他手里 */
  hasBook: boolean
  metStranger: boolean
  knowsBook: boolean
  markedKnown: boolean
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
    const character = useCharacterStore()
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

    seen.push({
      onTrail: world.hasFlag('event:omen-wounded'),
      attentionCaught: world.getFlag('attention') === 'caught',
      reading: asText(world.getFlag('wounded-reading')),
      outcome: asText(world.getFlag('wounded-outcome')),
      hasBook: character.has('thin-book'),
      metStranger: world.hasFlag('met-stranger'),
      knowsBook: world.hasFlag('knows-the-book'),
      markedKnown: world.hasFlag('marked-known'),
    })
  }

  return seen
}
