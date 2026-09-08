/**
 * 「行为史」那一支的单世模拟，在 worker 线程里跑。
 *
 * 随机人生，随机选。每一世记：一生说过几回不是实话、几回实话；第四回起那节正文
 * （「睡得跟平常一样」）见过没有；以及两种不该有的事——次数已经到了四，正文却还是
 * 前三回那两句（「绕开了那个人」）；次数还不到四，正文却已经磨平了。判据全在 `scripts/deeds.ts`。
 *
 * 只引 `src/`、pinia：任务模块不许引任何会装种子的东西（CLAUDE.md）。出身由
 * `useHouseholdStore` 自己掷——这一卷不挑出身。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'
import { useWorldStore } from '../../src/stores/world'

export interface DeedsLife {
  lies: number
  truths: number
  /** 第四回起那节正文出现过 */
  wornSeen: boolean
  /** 次数已到四，正文却还是前三回那两句 */
  freshAfterWorn: number
  /** 次数不到四，正文却已经磨平了 */
  wornEarly: number
  /** 行为史里有没有没填干净的字（还带着 `{`） */
  unfilled: string[]
  /** 行为史里时间倒流的笔数 */
  backwards: number
  /** 十七岁起每个回合站在哪一卷里：sceneId → 回合数。哪一卷把成年段挤光了，从这上面看 */
  adultTurns: Record<string, number>
}

/** 从几岁起算「成年段」：可反复的童年事件（day-ordinary、leave、seek）到十六为止 */
export const ADULT_FROM = 17

/** 前三回那节独有的那句 */
export const FRESH_LINE = '绕开了那个人'
/** 第四回起那节独有的那句 */
export const WORN_LINE = '睡得跟平常一样'
/** 到第几回磨平，照 `candour.ts` 的 `WORN` 抄 */
export const WORN_AT = 4

const ordinal = (at: { year: number; month: number }): number => at.year * 12 + at.month

function liveALife(): DeedsLife {
  setActivePinia(createPinia())
  useHouseholdStore()
  useWorldStore()
  usePeopleStore()
  const character = useCharacterStore()
  const narrative = useNarrativeStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  const out: DeedsLife = {
    lies: 0,
    truths: 0,
    wornSeen: false,
    freshAfterWorn: 0,
    wornEarly: 0,
    unfilled: [],
    backwards: 0,
    adultTurns: {},
  }
  const seen = new Set<string>()
  story.begin()
  for (const item of narrative.stream) seen.add(item.id)
  for (let turns = 0; !narrative.ended && turns < 220; turns += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    if (character.age >= ADULT_FROM) {
      const here = narrative.sceneId ?? '·'
      out.adultTurns[here] = (out.adultTurns[here] ?? 0) + 1
    }
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    // 正文一出来就对照那一刻的次数：那一笔在选项效果里已经落了，所以 fresh 的次数 ≤ 3、worn 的 ≥ 4
    const lies = character.did('lie')
    for (const item of narrative.stream) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      const text = 'text' in item.block ? item.block.text : ''
      if (text.includes(FRESH_LINE) && lies >= WORN_AT) out.freshAfterWorn += 1
      if (text.includes(WORN_LINE)) {
        out.wornSeen = true
        if (lies < WORN_AT) out.wornEarly += 1
      }
    }
  }
  out.lies = character.did('lie')
  out.truths = character.did('truth')
  let last = -1
  for (const one of character.deeds) {
    if (one.text.includes('{')) out.unfilled.push(one.text)
    const now = ordinal(one.at)
    if (now < last) out.backwards += 1
    last = now
  }
  return out
}

export function runShard(runs: number): DeedsLife[] {
  const lives: DeedsLife[] = []
  for (let i = 0; i < runs; i += 1) lives.push(liveALife())
  return lives
}
