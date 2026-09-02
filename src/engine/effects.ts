import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import { observerById } from '@/content/observers'
import type { Effect, InkTone, NarrativeBlock } from '@/types/game'

import { toChineseNumber } from './describe'
import {
  appraise,
  bookBelieves,
  bookCalls,
  askPedlar,
  hardened,
  nameIt,
  recordBook,
  rollBookTruth,
  type BookReading,
  type BookTruth,
} from './book'
import { fillString } from './interpolate'
import { ask } from './inquire'
import {
  glance,
  recordEncounter,
  resolve,
  rollTruth,
  truthToReading,
  type Reading,
  type WoundedTruth,
} from './wounded'
import { observe } from './observe'
import { noticeSigns, signBlocks } from './perceive'
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
      /**
       * 旧写法，等同于 meet。
       *
       * 从前 character.relationships 与 people 两套并存，
       * 同一个人有两处身份来源，迟早对不上。现在统一收进人口册——
       * **玩家只是 people 图里的一个节点**，别人也是。
       *
       * 这个分支留着只为让老剧本继续跑；新剧本一律写 meet。
       */
      const isNew = people.meet(effect.id, effect.name, effect.delta, effect.note)
      return isNew ? record(`识得 · ${people.callOf(effect.id)}`) : null
    }
    case 'knowledge': {
      const outcome = character.learn(
        effect.id,
        effect.title,
        effect.summary,
        effect.category,
        world.time,
        effect.grasp,
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
    case 'ask': {
      /**
       * 问出来的东西只进认知层。
       *
       * 它不改世界，也不改真实属性——它只改变玩家脑子里那份世界模型，
       * 而那份模型可能是错的。这跟观察系统的铁律是同一条。
       */
      const reply = ask(effect.who, effect.about)
      if (reply.learned) {
        character.learn(
          reply.learned.id,
          reply.learned.title,
          reply.learned.summary,
          reply.learned.category,
          world.time,
          reply.grasp,
          reply.mistaken,
        )
      }
      return reply.blocks
    }
    case 'glance': {
      /**
       * 他看了片刻，心里有了个判断。
       *
       * 判断写进旗标，**真相也写进旗标，两个分开存**——
       * 世界记着他是修士，玩家记着那是个醉汉。
       * 多年以后才可能有一次「原来那天遇见的是修士」；
       * 而如果他一辈子没走过去，这一句就永远不会出现。
       */
      const truth = rollTruth()
      const seen = glance(truth)
      recordEncounter(seen, truth)
      return [
        { kind: 'narration', text: '你看了片刻。' },
        { kind: 'narration', text: seen.says, tone: 'deep' },
      ]
    }
    case 'encounter': {
      // 世界回应这个动作。玩家看到的只有最后发生了什么
      const truth = (world.getFlag('wounded-man') as WoundedTruth) ?? '猎户'
      const reading = (world.getFlag('wounded-reading') as Reading) ?? '伤者'
      const outcome = resolve(truth, effect.approach, reading)
      world.setFlag('wounded-outcome', outcome.id)
      // 他从这一趟里带走的东西。渡口那一场认的就是它，落了这行整条线就断了
      if (outcome.grants) {
        character.carry(outcome.grants.id, outcome.grants.name, 1, '册', outcome.grants.note)
      }
      if (outcome.marks) world.setFlag(outcome.marks, true)
      // 弄明白那人是谁了，认知才升档；没弄明白的，他记住的仍是自己那个判断
      character.learn(
        'the-man-on-the-road',
        '山道上那个人',
        outcome.summary,
        '人物',
        world.time,
        outcome.learnedTruth ? '亲历' : '猜想',
        outcome.learnedTruth ? null : reading === truthToReading(truth) ? undefined : '事实',
      )
      return outcome.blocks
    }
    case 'appraise': {
      /**
       * 他翻了两页，认定这册书是什么。
       *
       * 跟 `glance` 一样真相与认知分开存，但这里多写一样东西：
       * **他的判断当场就进了知识面板**，用他自己的说法写着。
       * 那句话可能是错的，而他要带着它走很多年。
       */
      const truth = rollBookTruth()
      const seen = appraise(truth)
      recordBook(seen, truth)
      character.learn(
        'the-pedlar-book',
        '庙前买的那册书',
        seen.believes,
        '器物',
        world.time,
        '猜想',
        seen.mistaken ? '事实' : undefined,
      )
      return [
        { kind: 'narration', text: '你抽出来翻了两页。' },
        { kind: 'narration', text: seen.says, tone: 'deep' },
      ]
    }
    case 'book': {
      const truth = (world.getFlag('pedlar-book') as BookTruth) ?? '废纸'
      const reading = (world.getFlag('pedlar-book-reading') as BookReading) ?? '废纸'
      // 判断在 appraise 那一步就定了。这里查表取回，绝不能重掷
      const calls = bookCalls(reading)
      const believes = bookBelieves(reading)

      if (effect.act === '走') {
        // 他没在意。这册书从此与他无关，而他记下的仍是自己那个判断
        return [{ kind: 'narration', text: '你把它放回那叠旧纸里，走了。' }]
      }

      if (effect.act === '翻') {
        return [
          { kind: 'narration', text: '纸很脆，一翻就往下掉渣。' },
          { kind: 'narration', text: '你翻到最后一页，把它放回原处。' },
          { kind: 'narration', text: '几天后再去庙前，货郎已经不在了。', tone: 'faint' },
        ]
      }

      if (effect.act === '问') {
        const reply = askPedlar(truth, reading)
        if (reply.learned) {
          character.learn(
            reply.learned.id,
            reply.learned.title,
            reply.learned.summary,
            reply.learned.category,
            world.time,
            '听说',
          )
        }
        // 问完之后他更确信自己原来那个判断了——而对错一个字没变
        if (reply.hardens) {
          character.learn(
            'the-pedlar-book',
            '庙前买的那册书',
            hardened(believes),
            '器物',
            world.time,
            '确信',
          )
        }
        return reply.blocks
      }

      if (effect.act === '守') {
        /**
         * 揣着这些年。
         *
         * **这一步不修正认知，只固化认知。** 他每隔一阵拿出来翻一次，
         * 一次也没看懂，于是最初那个判断一年比一年结实——
         * 从「像是」变成「就是」。
         *
         * 引擎在这里只升 `grasp`，`mistaken` 一个字不碰：
         * 他更确信了，但他没有更接近真相。这两件事是正交的。
         */
        character.learn(
          'the-pedlar-book',
          '庙前买的那册书',
          hardened(believes),
          '器物',
          world.time,
          '确信',
        )
        return [
          { kind: 'narration', text: '你把它收进箱子，压在旧衣裳底下。' },
          { kind: 'narration', text: '此后每隔一阵会拿出来翻一次。' },
          { kind: 'narration', text: '翻了很多次，还是那样。', tone: 'faint' },
        ]
      }

      // 买下来。行囊里那件东西用的是他自己的叫法，不是它真正的名字
      character.carry('pedlar-book', calls, 1, '册', believes)
      world.setFlag('has-pedlar-book', true)
      return [
        { kind: 'narration', text: '货郎收钱的时候看了你一眼，没说什么。' },
        { kind: 'narration', text: '你把书揣进怀里，回家的路上又翻了一遍。' },
      ]
    }
    case 'book-named': {
      /**
       * 多年以后，有人说出它真正的名字。
       *
       * 这一步同时做两件事：给行囊里那件东西改名（旧名字留在 `formerName` 里不删），
       * 以及**明确纠正**那条错了很多年的认知——传 `null` 而不是不传，
       * 因为「他弄明白了」必须是一次显式的表态，不能从档位上升反推出来。
       */
      const truth = (world.getFlag('pedlar-book') as BookTruth) ?? '废纸'
      const naming = nameIt(truth)
      character.reveal('pedlar-book', naming.name, naming.note)
      character.learn(
        'the-pedlar-book',
        '庙前买的那册书',
        naming.summary,
        '器物',
        world.time,
        '确信',
        null,
      )
      world.record(naming.chronicle)
      return [
        { kind: 'narration', text: '他的目光在你怀里停了一下。' },
        { kind: 'dialogue', text: '拿出来。' },
        { kind: 'narration', text: '你把那册书拿了出来。这些年你翻过很多次。' },
        { kind: 'event', text: naming.said, tone: 'deep' },
        { kind: 'narration', text: '船过去了。' },
        { kind: 'divider', variant: 'ink' },
        { kind: 'narration', text: '你在渡口站了很久，手里捏着那册书。' },
        { kind: 'narration', text: naming.aftermath, tone: 'deep' },
      ]
    }
    case 'signs': {
      // 世界的样子落进正文。这是玩家建立自己那份世界模型的唯一材料
      return signBlocks(noticeSigns(effect.limit))
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
