import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import { observerById } from '@/content/observers'
import type { Effect, InkTone, NarrativeBlock } from '@/types/game'

import { toChineseNumber } from './describe'
import { fillString } from './interpolate'
import { observe } from './observe'
import { pickWeighted } from './random'

/**
 * effect 里面向玩家的文本字段。
 *
 * 占位符原本只在正文（NarrativeBlock）里被替换，可 effect 的参数也会上界面——
 * `place` 进状态栏和足迹，`note` 进行囊，`text` 进编年。
 * 漏掉它们的结果就是状态栏上明晃晃写着 `{home}`。
 *
 * 刻意不含 `id` 与 `key`：那些是引擎内部的标识，替换了会把旗标和条目对不上。
 * 也不含 `value`：`flag` 的值和 `roll` 的候选是掷给引擎看的，不是给人读的。
 */
const TEXT_FIELDS = [
  'place',
  'identity',
  'text',
  'title',
  'summary',
  'name',
  'note',
  'trade',
  'self',
  'source',
  'doubt',
] as const

/** 把一条 effect 里所有面向玩家的文本换成这一世的实情 */
function localize<T extends Effect>(effect: T): T {
  const draft: Record<string, unknown> = { ...effect }
  for (const field of TEXT_FIELDS) {
    const value = draft[field]
    if (typeof value === 'string') draft[field] = fillString(value)
  }
  return draft as T
}

type WorldStore = ReturnType<typeof useWorldStore>
type CharacterStore = ReturnType<typeof useCharacterStore>
type HouseholdStore = ReturnType<typeof useHouseholdStore>
type PeopleStore = ReturnType<typeof usePeopleStore>

function record(text: string, tone?: InkTone): NarrativeBlock {
  return { kind: 'record', text, ...(tone ? { tone } : {}) }
}

/**
 * @returns 需要报给玩家看的回执，没有就返回 null
 *
 * 只有「得到了什么」才出回执：见闻、人、物、境界。
 * 时与地常驻在状态栏上，不必在正文里再说一遍；
 * 属性、旗标、家境是引擎的内部刻度，玩家本来就不该看见——
 * 家里穷下去这件事要靠「今年没扯新布」读出来，不是靠一行「家产 -50」。
 */
function applyOne(
  effect: Effect,
  world: WorldStore,
  character: CharacterStore,
  household: HouseholdStore,
  people: PeopleStore,
): NarrativeBlock | NarrativeBlock[] | null {
  switch (effect.type) {
    case 'time': {
      // 年龄跟着时序走，不必单独加
      const years = world.advanceTime(effect)
      // 玩家在私塾念书的那几年，在外地做工的父亲也在老去。
      // NPC 不因离开玩家视野而停止存在，就落实在这一行
      people.live(years)
      return null
    }
    case 'attribute':
      character.adjustAttribute(effect.key, effect.delta)
      return null
    case 'flag':
      world.setFlag(effect.key, effect.value)
      return null
    case 'place':
      world.moveTo(effect.place)
      return null
    case 'home':
      // 搬了家，人自然也在新家。两个都要改，否则状态栏和「回家」会各说各的
      household.moveHome(effect.place)
      world.moveTo(effect.place)
      return null
    case 'realm':
      character.setRealm(effect.realm)
      return record(`境界 · ${effect.realm}`, 'cinnabar')
    case 'identity':
      character.setIdentity(effect.identity)
      return record(`身份 · ${effect.identity}`)
    case 'aspect':
      character.note(effect.key, effect.self)
      return null
    case 'claim':
      // 评说本身由对话说出，此处不重复报账；底栏「人物」会亮起未读点
      character.claim(effect.key, effect.source, effect.text, world.time, effect.doubt)
      return null
    case 'observe': {
      /**
       * 有人打量了你一眼。
       *
       * 铁律在这里落地：这个分支只调 character.claim，
       * 一行 adjustAttribute 也没有。别人怎么看你，改变的是你对自己的理解，
       * 不是你这个人——否则「评价」不过是换个说法把属性面板还给玩家。
       *
       * 说出口的话当场落进正文（剧本没法写死，它是算出来的），
       * 同时存进认知层，供玩家日后翻看时发现两句话对不上。
       */
      const observer = observerById(effect.observer)
      if (!observer) {
        console.error(`剧本请了一个不存在的人来看：${effect.observer}`)
        return null
      }
      const spoken: NarrativeBlock[] = []
      for (const remark of observe(observer)) {
        character.claim(remark.aspect, remark.source, remark.text, world.time, remark.doubt)
        spoken.push({ kind: 'dialogue', speaker: remark.source, text: remark.text })
      }
      return spoken
    }
    case 'relation': {
      const isNew = character.adjustRelation(effect.id, effect.name, effect.delta, effect.note)
      return isNew ? record(`识得 · ${effect.name}`) : null
    }
    case 'knowledge': {
      const outcome = character.learn(
        effect.id,
        effect.title,
        effect.summary,
        effect.category,
        world.time,
      )
      if (outcome === 'new') return record(`得知 · ${effect.title}`)
      if (outcome === 'detailed') return record(`明白了 · ${effect.title}`)
      return null
    }
    case 'item': {
      const count = effect.count ?? 1
      const unit = effect.unit ?? '件'
      const moved = character.carry(effect.id, effect.name, count, unit, effect.note)
      if (moved === 0) return null
      const amount = `${toChineseNumber(Math.abs(moved))}${unit}`
      return record(`${moved > 0 ? '得' : '失'} · ${effect.name} ${amount}`)
    }
    case 'chronicle':
      world.record(effect.text, effect.tone)
      return null
    case 'household':
      if (effect.standing !== undefined) household.shiftStanding(effect.standing)
      if (effect.debt !== undefined) household.shiftDebt(effect.debt)
      return null
    case 'family': {
      // 家人也是人。这里只是个方便写法，实际落到人口册上
      if (effect.alive === false) people.amend(effect.id, { fate: '殁' })
      if (effect.note !== undefined) people.meet(effect.id, effect.id, 0, effect.note)
      return null
    }
    case 'person': {
      // 他去了别处、换了差事、没了——都不是把他删掉，是改他的下落
      people.amend(effect.id, {
        ...(effect.place === undefined ? {} : { place: effect.place }),
        ...(effect.trade === undefined ? {} : { trade: effect.trade }),
        ...(effect.fate === undefined ? {} : { fate: effect.fate }),
        ...(effect.health === undefined ? {} : { health: effect.health }),
      })
      return null
    }
    case 'meet': {
      // 没写 calls 就是「已经认识的人」，只调好感，不改称呼
      const calls = effect.calls ?? people.known[effect.id]?.calls ?? '一个人'
      const isNew = people.meet(effect.id, calls, effect.delta ?? 0, effect.note)
      // 「知道他叫什么」是单独一件事，值得单独报一句
      const learned = effect.name ? people.learnName(effect.id) : false
      if (learned) return record(`原来他叫 · ${people.callOf(effect.id)}`, 'deep')
      return isNew ? record(`识得 · ${calls}`) : null
    }
    case 'recall': {
      // 人身上的「多年以后才明白」。值得一枚回执——
      // 玩家刚刚知道了一件早就发生过的事
      const learned = people.recall(effect.id, effect.chapter)
      if (!learned) return null
      const chapter = people.personOf(effect.id)?.history.find((c) => c.id === effect.chapter)
      return chapter ? record(`原来 · ${chapter.what}`, 'deep') : null
    }
    case 'roll': {
      // 世界自己掷的骰子。玩家看不到这一行，也永远不会知道另一种可能是什么
      const outcome = pickWeighted(effect.among, (entry) => entry.weight)
      if (outcome) world.setFlag(effect.key, outcome.value)
      return null
    }
    case 'reveal': {
      // 全作最迟到的一种反馈，值得一枚朱砂回执：
      // 你揣了它很多年，今天才知道它是什么
      const renamed = character.reveal(effect.item, effect.name, effect.note)
      return renamed ? record(`原来是 · ${effect.name}`, 'cinnabar') : null
    }
    default: {
      // 新增 Effect 类型却忘了在此处理时，此行会编译报错
      const unreachable: never = effect
      console.error('未知的效果类型', unreachable)
      return null
    }
  }
}

/**
 * 状态变化的唯一写入口。
 *
 * 剧本只声明「发生了什么」，落到哪个 store、怎么钳制范围，全部在这里决定。
 * 组件不得直接改状态——否则剧本行为将散落各处，无从追溯。
 *
 * @returns 该写进正文的回执。玩家做了一件事，界面必须给出可见的结果。
 */
export function applyEffects(effects?: readonly Effect[]): NarrativeBlock[] {
  if (!effects || effects.length === 0) return []

  const world = useWorldStore()
  const character = useCharacterStore()
  const household = useHouseholdStore()
  const people = usePeopleStore()

  const receipts: NarrativeBlock[] = []
  for (const effect of effects) {
    // 先换占位符再结算：写进 store 的就该是玩家会读到的那句话，
    // 而不是一个等着被谁替换的模板
    const receipt = applyOne(localize(effect), world, character, household, people)
    if (Array.isArray(receipt)) receipts.push(...receipt)
    else if (receipt) receipts.push(receipt)
  }
  return receipts
}
