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

/** 多嘴的人：有心人的走法，外加有人问起药庐那边就说 */
export type Policy = 'random' | 'keen' | 'talker'

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
  /** 第二片：他嘱咐过你别出去乱说 */
  toldByShed: boolean
  /** 夜里配偶问起过；巷口邻家户主问起过 */
  askedHome: boolean
  askedLane: boolean
  /** 跟配偶说了；跟邻家说了；瞒住了 */
  toldSpouse: boolean
  talked: boolean
  kept: boolean
  /** 他不再让你去了 */
  shutOut: boolean
  /** 咽气那年跟药庐那位处在哪一格 */
  footingAtEnd: string | null
  /** 第三片：发觉他不老（认知 he-does-not-age 落成什么） */
  unaged: { contact: Contact; interpretation: Interpretation } | null
  /** 「想活得久一点」那个愿望被这件事点过 */
  sparked: boolean
  /** 壮年那一卷读到「还是那个样子」 */
  readUnaged: boolean
  /** 第四片：造册那年在场（认知 what-the-register-says 落成什么） */
  census: { contact: Contact; interpretation: Interpretation } | null
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
  let askedHome = false
  let askedLane = false
  let readUnaged = false
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
      if (text.includes('镇西那边，到底是个什么去处')) askedHome = true
      if (text.includes('我怎么没见它挂过招牌')) askedLane = true
      if (text.includes('你已经不去想这件事了')) readUnaged = true
    }
    let pick = open[Math.floor(Math.random() * open.length)]!
    if (policy !== 'random') {
      const ranked = open
        .map((o) => ({ o, rank: KEEN_CHOICES.indexOf(o.choice.id) }))
        .filter((one) => one.rank >= 0)
        .sort((a, b) => a.rank - b.rank)
      if (ranked[0]) pick = ranked[0].o
      // 多嘴的人：有人问起药庐那边就说
      if (policy === 'talker') {
        const tell = open.find((o) => o.choice.id === 'tell-mountain')
        if (tell) pick = tell
      }
    }
    if (pick.choice.id === 'ask-who') asked = true
    story.choose(pick.choice)
  }
  const footing = world.getFlag('footing:herbalist-at-the-shed')
  const entry = character.knowledge.find((one) => one.id === 'the-mountain-above')
  const unagedEntry = character.knowledge.find((one) => one.id === 'he-does-not-age')
  const censusEntry = character.knowledge.find((one) => one.id === 'what-the-register-says')
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
    toldByShed: world.hasFlag('told-by-the-shed'),
    askedHome,
    askedLane,
    toldSpouse: world.hasFlag('told-spouse-about-the-mountain'),
    talked: world.hasFlag('talked-about-the-mountain'),
    kept: world.hasFlag('kept-the-mountain'),
    shutOut: world.hasFlag('shut-out-by-the-shed'),
    footingAtEnd: typeof footing === 'string' ? footing : null,
    unaged: unagedEntry
      ? { contact: unagedEntry.contact, interpretation: unagedEntry.interpretation }
      : null,
    sparked: world.hasFlag('spark:saw-one-who-does-not-age'),
    readUnaged,
    census: censusEntry
      ? { contact: censusEntry.contact, interpretation: censusEntry.interpretation }
      : null,
  }
}

export function runShard(runs: number, payload: MountainPayload): MountainLife[] {
  const lives: MountainLife[] = []
  for (let i = 0; i < runs; i += 1) lives.push(liveALife(payload.policy))
  return lives
}
