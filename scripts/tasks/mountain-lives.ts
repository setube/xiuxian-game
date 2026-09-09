/**
 * 「山上下来的人」那一支的单世模拟，在 worker 线程里跑。
 *
 * 两种走法（跟 `ascent-lives.ts` 同一套）：随机选，和有心人（链上往前走的选项开着就选它）。
 * 每一世记：跟药庐那位处到过哪几格、山上的人下来过没有、问了没有、他答了没有、
 * 他肯不肯多说两句、再来过没有、上头问起没有；咽气那年认知层那一条落成什么。
 * 判据全在 `scripts/mountain.ts`。
 *
 * 只引 `src/` 与 pinia：任务模块不许引任何会装种子的东西（CLAUDE.md）。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'
import { useWorldStore } from '../../src/stores/world'
import type { Contact, Interpretation } from '../../src/types/game'
import { KEEN_CHOICES } from './ascent-lives'

export type Policy = 'random' | 'keen'

export interface MountainPayload {
  policy: Policy
}

export interface MountainLife {
  /** 跟药庐那位处到过的最高一格（咽气那年的旗；没处过是 null） */
  footing: string | null
  /** 到过使唤（旗曾落到使唤／带一段／教一点任一格） */
  atShed: boolean
  /** 到过教一点 */
  taught: boolean
  /** 山上的人下来过 */
  down: boolean
  /** 问了那是谁 */
  asked: boolean
  /** 药庐那位答了「山上的」 */
  told: boolean
  /** 下山的人肯多说两句（`opened:` 旗） */
  opened: boolean
  /** 他又下来过 */
  again: boolean
  /** 再来时认出你（那一句读到了） */
  recognised: boolean
  /** 他进门时你正坐着（那一句读到了） */
  sitting: boolean
  /** 身上到过摸着了／拿得住 */
  held: boolean
  /** 上头问起你了 */
  known: boolean
  /** 咽气那年认知层「山上」那一条 */
  knowledge: { contact: Contact; interpretation: Interpretation } | null
  /** 药庐那位身上那一页翻开了没有（recall） */
  recalled: boolean
  /** 下山的人入了册、带 realm */
  visitorEnrolled: boolean
  /** 壮年那一卷读到的两句 */
  readKnows: boolean
  readAsked: boolean
}

const AT_SHED: readonly string[] = ['使唤', '带一段', '教一点']

function liveALife(policy: Policy): MountainLife {
  setActivePinia(createPinia())
  const world = useWorldStore()
  const character = useCharacterStore()
  const people = usePeopleStore()
  useHouseholdStore()
  const narrative = useNarrativeStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()
  const kept = new Set<string>()
  let atShed = false
  let taught = false
  let asked = false
  let told = false
  let recognised = false
  let sitting = false
  let held = false
  let readKnows = false
  let readAsked = false
  for (let turns = 0; !narrative.ended && turns < 240 && character.died === null; turns += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    const footing = world.getFlag('footing:herbalist-at-the-shed')
    if (typeof footing === 'string' && AT_SHED.includes(footing)) atShed = true
    if (footing === '教一点') taught = true
    const hold = world.getFlag('rite:quiet-breath:hold')
    if (hold === '摸着了' || hold === '拿得住') held = true
    // 边走边收：卷轴只留最后四百条
    for (const item of narrative.stream) {
      if (kept.has(item.id)) continue
      kept.add(item.id)
      if (!('text' in item.block)) continue
      const text = item.block.text
      if (text.includes('我替他们看着这儿')) told = true
      if (text.includes('像是认出来了')) recognised = true
      if (text.includes('照那五句坐着')) sitting = true
      if (text.includes('你知道山上有人。这些年你没跟谁说过')) readKnows = true
      if (text.includes('山上的人问起过你')) readAsked = true
    }
    let pick = open[Math.floor(Math.random() * open.length)]!
    if (policy === 'keen') {
      const ranked = open
        .map((o) => ({ o, rank: KEEN_CHOICES.indexOf(o.choice.id) }))
        .filter((one) => one.rank >= 0)
        .sort((a, b) => a.rank - b.rank)
      if (ranked[0]) pick = ranked[0].o
    }
    if (pick.choice.id === 'ask-who') asked = true
    story.choose(pick.choice)
  }
  const footing = world.getFlag('footing:herbalist-at-the-shed')
  const entry = character.knowledge.find((one) => one.id === 'the-mountain-above')
  const visitor = people.personOf('the-one-who-comes-down')
  return {
    footing: typeof footing === 'string' ? footing : null,
    atShed,
    taught,
    down: world.hasFlag('event:mountain-down'),
    asked,
    told,
    opened: world.hasFlag('opened:the-one-who-comes-down'),
    again: world.hasFlag('event:mountain-again'),
    recognised,
    sitting,
    held,
    known: world.hasFlag('known-on-the-mountain'),
    knowledge: entry ? { contact: entry.contact, interpretation: entry.interpretation } : null,
    recalled:
      people
        .personOf('herbalist-at-the-shed')
        ?.history.some((one) => one.id === 'keeps-the-shed' && one.known) ?? false,
    visitorEnrolled: visitor !== undefined && visitor.realm !== undefined,
    readKnows,
    readAsked,
  }
}

export function runShard(runs: number, payload: MountainPayload): MountainLife[] {
  const lives: MountainLife[] = []
  for (let i = 0; i < runs; i += 1) lives.push(liveALife(payload.policy))
  return lives
}
