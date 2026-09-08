/**
 * 「修仙第一条纵切」那一支的单世模拟，在 worker 线程里跑。
 *
 * 随机人生，两种走法：随机选（`random`），或者「有心人」（`keen`——碰到链上往前走的
 * 那个选项就选它，别的随机）。每一世记链上每一环到没到，**全部用留下的痕迹反推**
 * （旗标、知识、`event:` 旗），不数 `sceneId`。判据全在 `scripts/ascent.ts`。
 *
 * 只引 `src/` 与 pinia：任务模块不许引任何会装种子的东西（CLAUDE.md）。出身由
 * `useHouseholdStore` 自己掷——这条链不挑出身。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'
import { useWorldStore } from '../../src/stores/world'

export type Policy = 'random' | 'keen'

export interface AscentPayload {
  policy: Policy
}

/**
 * 有心人会选的那些选项。链上各卷里「往前走」的那一条，照库里的 `id` 抄。
 *
 * **按先后排**：同一回合开着好几条时挑排在前面的。先打听（喂念头——成年段没有一卷收日，
 * 念头只靠这一条长）、再往外走（涨命数——渡口那道门槛是走出来的），再是链上各卷的动作。
 * 头一版不排序、也没有「往外走」那几条，于是有心人守着地打听，命数十六到二十八岁间
 * 最高中位 42，渡口门槛 55 一辈子够不着（2026-09-08 实测）。
 *
 * 同名的 `id` 别的卷也有（`ask` 在十来卷里），有心人在那些卷里也会选它——
 * 那是「一个什么都想问一句的人」，正好是这条路上的人。
 */
export const KEEN_CHOICES: readonly string[] = [
  // 成年、壮年日常：接着打听、还在琢磨
  'ask',
  'seek',
  // 往外走：远处走一趟、再走一趟远路、往城里跑、往山里跑、到处乱跑
  'far',
  'once-more',
  'town',
  'hills',
  'wander',
  // 山道伤者：扶他起来（书只在这一条上）
  'lift',
  'inspect',
  // 渡口：走过去、认出他、支开跟着的人
  'approach',
  'recognize',
  'shake',
  'call',
  // 找人：跑一趟、说你是来找他们的
  'go',
  'enter',
  'follow-him',
  'go-in',
  // 药庐：站着不走、第二天还去、明天再来、接着翻、接着去
  'just-stay',
  'ask-about-mountain',
  'keep-coming',
  'come-again',
  'keep-at-it',
  'press-him',
  'go-on-anyway',
  // 那册书：认、坐、再坐一次
  'read',
  'copy',
  'try',
  'try-blind',
  'that-warmth',
  // 货郎与酒客
  'buy',
  'buy-after',
  'listen',
  'talk',
  'pour',
  'serve',
  'refill',
]

/** 链上的每一环。`after` 是算条件转化率用的上一环 */
export interface Stage {
  key: string
  label: string
  after?: string
}

export const STAGES: readonly Stage[] = [
  { key: 'heard', label: '听说有修士' },
  { key: 'know', label: '起了「想弄明白」的念头' },
  // 甲、药庐
  { key: 'shed', label: '甲一　药庐那位（tutor-shed）', after: 'know' },
  { key: 'again', label: '甲一′　又去了一趟（tutor-shed-again）', after: 'shed' },
  { key: 'errand', label: '甲二　使唤（tutor-errand）', after: 'shed' },
  { key: 'walk', label: '甲三　带一段（tutor-walk）', after: 'errand' },
  { key: 'words', label: '甲四　那五句（tutor-words）', after: 'walk' },
  { key: 'rite', label: '甲五　会了门路（rite:quiet-breath）', after: 'words' },
  { key: 'alone', label: '甲六　自己坐过（tutor-alone）', after: 'rite' },
  // 乙、书
  { key: 'wounded', label: '乙一　山道伤者（omen-wounded）' },
  { key: 'book', label: '乙二　得了那册薄书（thin-book）', after: 'wounded' },
  { key: 'river', label: '乙三　渡口青衫人（riverman）' },
  { key: 'bookriver', label: '乙三′　带着书到了渡口', after: 'book' },
  { key: 'qi', label: '乙四　被点破（qi-refining）', after: 'bookriver' },
  { key: 'attempt', label: '乙五　第一次修炼（attempt-first）', after: 'qi' },
  { key: 'felt', label: '乙六　觉出了一点什么（felt-something）', after: 'attempt' },
  { key: 'after', label: '乙七　之后（afterwards-*）', after: 'felt' },
  // 丙、找人
  { key: 'ask', label: '丙一　问过人（seek-asking）', after: 'know' },
  { key: 'lead', label: '丙二　拿到线索（lead:*）', after: 'ask' },
  // 观里那一卷要的是「北边那个观」那一条线索（`lead:the-northern-temple`），不是两条对上——
  // 对上通向的是 `seek:crossed` 门前那一段。两条都从「拿到线索」分出去，头一版把它们写成一串，门禁当场抓到
  { key: 'crossed', label: '丙三　线索对上（leads-crossed）', after: 'lead' },
  { key: 'temple', label: '丙三′　观里那次（meet-temple）', after: 'lead' },
]

export interface AscentLife {
  /** 到过哪些环 */
  hit: Record<string, boolean>
  /** 第一次修炼那一卷落旗时几岁 */
  attemptAt: number | null
  finished: boolean
}

function hits(): Record<string, boolean> {
  const w = useWorldStore()
  const c = useCharacterStore()
  const has = (key: string) => w.hasFlag(key)
  return {
    heard: c.knows('cultivators-exist'),
    know: has('leaning:know'),
    shed: has('event:tutor-shed'),
    again: has('event:tutor-shed-again'),
    errand: has('event:tutor-errand'),
    walk: has('event:tutor-walk'),
    words: has('event:tutor-words'),
    rite: has('rite:quiet-breath'),
    alone: has('event:tutor-alone'),
    wounded: has('event:omen-wounded'),
    book: c.has('thin-book'),
    river: has('event:riverman'),
    bookriver: c.has('thin-book') && has('event:riverman'),
    qi: c.knows('qi-refining'),
    attempt: has('event:attempt-first'),
    felt: has('felt-something'),
    after: has('event:afterwards-again') || has('event:afterwards-late'),
    ask: has('event:seek-asking'),
    lead: c.knowledge.some((one) => one.id.startsWith('lead:')),
    crossed: has('leads-crossed'),
    temple: has('event:meet-temple'),
  }
}

function liveALife(policy: Policy): AscentLife {
  setActivePinia(createPinia())
  const world = useWorldStore()
  const character = useCharacterStore()
  useHouseholdStore()
  usePeopleStore()
  const narrative = useNarrativeStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()
  let attemptAt: number | null = null
  for (let turns = 0; !narrative.ended && turns < 220 && character.died === null; turns += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    if (attemptAt === null && world.hasFlag('event:attempt-first')) attemptAt = character.age
    let pick = open[Math.floor(Math.random() * open.length)]!
    if (policy === 'keen') {
      // 开着好几条时挑 KEEN_CHOICES 里排得最前的那一条
      const ranked = open
        .map((o) => ({ o, rank: KEEN_CHOICES.indexOf(o.choice.id) }))
        .filter((one) => one.rank >= 0)
        .sort((a, b) => a.rank - b.rank)
      if (ranked[0]) pick = ranked[0].o
    }
    story.choose(pick.choice)
  }
  if (attemptAt === null && world.hasFlag('event:attempt-first')) attemptAt = character.age
  return { hit: hits(), attemptAt, finished: character.died !== null }
}

export function runShard(runs: number, payload: AscentPayload): AscentLife[] {
  const lives: AscentLife[] = []
  for (let i = 0; i < runs; i += 1) lives.push(liveALife(payload.policy))
  return lives
}
