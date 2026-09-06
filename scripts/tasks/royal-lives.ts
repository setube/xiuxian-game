/**
 * 「宫里与王府」那一支的单世模拟，从 `scripts/royal.ts` 原样搬出来。
 *
 * 走法一步没动——同样钉死出身、同样两百回合上限、同样一路随机落笔。
 * 改的只是记账落点：原先 `probe()` 一个人跑满 `RUNS` 世往一份 tally 上累加，
 * 现在每片各攒一份，由主线程用 `sumTallies` 加起来。
 *
 * ## 出身经 payload 递进来
 *
 * 这一支要对着同一段内容验两种出身（王府与宫里），而**那两种出身的
 * 户籍五格完全相同，只有主键分得开**——所以钉的是主键，不是掷权重。
 * 主键是个字符串，结构化克隆搬得动，经 `payload` 过来即可。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import { useWorldStore } from '../../src/stores/world'
import type { OriginId } from '../../src/types/game'
import { beOf } from '../origin'

export interface RoyalTally {
  /** 这一片实际跑了多少世。分母要用总数，别拿某一片的去除 */
  n: number
  fell: number
  walkedOut: number
  observatory: number
  entered: number
  guarded: number
  slipped: number
  knew: number
  /** 底下三格是按键计数的普通对象，`sumTallies` 认得，会按键相加 */
  identities: Record<string, number>
  genders: Record<string, number>
  endings: Record<string, number>
}

export function runShard(runs: number, id: OriginId): RoyalTally {
  const tally: RoyalTally = {
    n: 0,
    fell: 0,
    walkedOut: 0,
    observatory: 0,
    entered: 0,
    guarded: 0,
    slipped: 0,
    knew: 0,
    identities: {},
    genders: {},
    endings: {},
  }

  for (let i = 0; i < runs; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const world = useWorldStore()
    const character = useCharacterStore()
    const household = useHouseholdStore()
    // 绕开权重：这一支太稀有，按权重掷根本攒不出样本。
    // 钉的是主键——王府与宫里那五格完全相同，只有主键分得开这两支
    beOf(id)
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

    tally.n += 1
    if (world.hasFlag('the-fall')) tally.fell += 1
    if (world.hasFlag('walked-out')) tally.walkedOut += 1
    if (world.hasFlag('event:royal-observatory')) tally.observatory += 1
    if (world.hasFlag('entered-observatory')) tally.entered += 1
    if (world.hasFlag('guarded')) tally.guarded += 1
    if (world.hasFlag('slipped-the-guards')) tally.slipped += 1
    if (character.knows('cultivators-exist')) tally.knew += 1
    tally.identities[character.identity] = (tally.identities[character.identity] ?? 0) + 1
    tally.genders[household.gender] = (tally.genders[household.gender] ?? 0) + 1
    const ending = narrative.nodeId ?? '(未收尾)'
    tally.endings[ending] = (tally.endings[ending] ?? 0) + 1
  }

  return tally
}
