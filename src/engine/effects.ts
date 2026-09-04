import { useCharacterStore } from '@/stores/character'
import { useDiaryStore } from '@/stores/diary'
import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import { observerById } from '@/content/observers'
import { bearKin } from '@/content/birth'
import type { Effect, InkTone, NarrativeBlock } from '@/types/game'

import { beatLines, spend } from './daily'
import { attend, attendBlocks } from './attention'
import { reconsider } from './diary'
import { goOn } from './errand'
import { branch, dampen, echoesOn, kindle, readingOf } from './leanings'
import { askAround, crossed, follow, knock } from './seeking'
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
import { currentView, merchantLore, talk, viewWords, willingToday } from './hearsay'
import { fillString } from './interpolate'
import { ask } from './inquire'
import { encounterCultivator } from './meeting'
import { practise, teach, weighUp } from './tutelage'
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
 * 同样不含 `living`：它虽然是个字符串，却是 `content/living.ts` 里那一格的 id，
 * 跟 `identity` 只差一个字段名，**分界线在于这个字给谁看**——
 * 「庶人」是念给玩家听的，`fallen` 是拿去查表的。
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
    /**
     * 换了一种日子过。**不出回执**，跟隔壁的 `identity` 不一样。
     *
     * 身份是一个称谓——别人从今天起改口叫你庶人，那是一条明确的信息，
     * 值得报一行。日子不是称谓，它得靠正文自己读出来：
     * 「怎么问价，怎么挑水，怎么在下雨天走泥路不摔跤」。
     * 在那底下再补一行「日子 · 自己过日子」，是把已经写好的东西
     * 又用机器话说了一遍。
     */
    case 'living':
      character.liveAs(effect.living)
      return null
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
      const outcome = character.learn({
        id: effect.id,
        title: effect.title,
        summary: effect.summary,
        category: effect.category,
        at: world.time,
        contact: effect.contact,
        interpretation: effect.interpretation,
      })
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
      /**
       * 家人也是人——这句话从前只是个说法，人口册上其实没有他。
       *
       * 那一行写的是 `people.meet(effect.id, effect.id, 0, effect.note)`：
       * **把内部 id 当成了玩家嘴里的称呼**。爹娘没露馅，是因为出生那一刻
       * 就已经 `meet` 过，而 `meet()` 对已认识的人不改称呼；
       * 头一次出现的人就露了——人际面板上明晃晃写着 `sibling`。
       *
       * 现在分两条路：`born` 的先生出一个真人来，其余的照旧只是改动静。
       */
      if (effect.born === true && people.personOf(effect.id) === undefined) {
        const kin = bearKin(effect.id, household.trade, household.home)
        people.meet(effect.id, effect.calls ?? kin.calls, 0, effect.note)
      } else if (effect.note !== undefined || effect.calls !== undefined) {
        people.meet(
          effect.id,
          effect.calls ?? people.known[effect.id]?.calls ?? '家里人',
          0,
          effect.note,
        )
      }
      if (effect.alive === false) people.amend(effect.id, { fate: '殁' })
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
        character.learn({
          id: reply.learned.id,
          title: reply.learned.title,
          summary: reply.learned.summary,
          category: reply.learned.category,
          at: world.time,
          contact: reply.contact,
          interpretation: reply.interpretation,
          mistaken: reply.mistaken,
        })
      }
      return reply.blocks
    }
    case 'attend': {
      /**
       * 那天他把注意力放在了哪儿。
       *
       * 落一个旗标就够了，剧本按它分三条路走。**心事那一句三条路上都印**——
       * 这是这一层跟一行属性阈值最要紧的差别：没看见的人读到的不是空白，
       * 是「你心里想着家里那个人」。他知道自己那天心不在焉，
       * 只是永远不会知道自己错过了什么。
       */
      const attention = attend()
      world.setFlag('attention', attention.level)
      return attendBlocks(attention)
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
      // 他从这一趟里学到的东西。同上——渡口那一场也认它
      if (outcome.teaches) {
        character.learn({
          ...outcome.teaches,
          at: world.time,
          // 有人手把手教了两遍，这是亲历，不是听说
          contact: '亲历',
          interpretation: '确信',
        })
      }
      if (outcome.marks) world.setFlag(outcome.marks, true)
      // 弄明白那人是谁了，认知才升档；没弄明白的，他记住的仍是自己那个判断
      character.learn({
        id: 'the-man-on-the-road',
        title: '山道上那个人',
        summary: outcome.summary,
        category: '人物',
        at: world.time,
        // 他伸手做了事，接触就是「亲历」——哪怕他到最后也没弄明白那人是谁
        contact: '亲历',
        interpretation: outcome.learnedTruth ? '确信' : '猜想',
        mistaken: outcome.learnedTruth
          ? null
          : reading === truthToReading(truth)
            ? undefined
            : '事实',
      })
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
      character.learn({
        id: 'the-pedlar-book',
        title: '庙前买的那册书',
        summary: seen.believes,
        category: '器物',
        at: world.time,
        contact: '见过',
        interpretation: '猜想',
        mistaken: seen.mistaken ? '事实' : undefined,
      })
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
          character.learn({
            id: reply.learned.id,
            title: reply.learned.title,
            summary: reply.learned.summary,
            category: reply.learned.category,
            at: world.time,
            contact: '听说',
            interpretation: '猜想',
          })
        }
        // 问完之后他更确信自己原来那个判断了——而对错一个字没变
        if (reply.hardens) {
          character.learn({
            id: 'the-pedlar-book',
            title: '庙前买的那册书',
            summary: hardened(believes),
            category: '器物',
            at: world.time,
            interpretation: '确信',
          })
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
        character.learn({
          id: 'the-pedlar-book',
          title: '庙前买的那册书',
          summary: hardened(believes),
          category: '器物',
          at: world.time,
          // 拿在手里翻了很多年，接触是「亲历」——可他一个字也没看懂
          contact: '亲历',
          interpretation: '确信',
        })
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
      character.learn({
        id: 'the-pedlar-book',
        title: '庙前买的那册书',
        summary: naming.summary,
        category: '器物',
        at: world.time,
        interpretation: '确信',
        // 明确纠正。这一步才抹掉错误标记——不能从档位上升反推出来
        mistaken: null,
      })
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
    case 'hearsay': {
      /**
       * 跟商旅谈一次。
       *
       * 这里最要紧的一行是**没有的那一行**：没有任何地方拿商旅的答案
       * 去覆盖玩家原来那句话。得到的是一次扰动——
       * 动摇、多一个并排的说法、明确纠正，或者把真话收编进旧框。
       *
       * 一旦写成「NPC 说什么，知识条目就变成什么」，
       * 这套东西立刻退回百科系统：问得越多越对，最后必然全知。
       */
      const lore = merchantLore()
      const before = currentView()
      const exchange = talk(lore, before, willingToday())

      if (exchange.turn !== '没问出什么') {
        world.setFlag('adept-view', exchange.view)
        character.learn({
          id: 'cultivators-exist',
          title: '修士',
          summary: viewWords(exchange.view),
          category: '修行',
          at: world.time,
          contact: '听说',
          interpretation: exchange.interpretation,
          mistaken: exchange.mistaken,
          ...(exchange.rival ? { rival: exchange.rival } : {}),
          // 「动摇」是一次纯粹的退档：他没弄明白什么，只是不再笃定
          ...(exchange.turn === '动摇' ? { shaken: true } : {}),
        })
      }

      // 他是个持续存在的人，不是一次性的剧情触发器。这一夜之后关系更近一层
      people.meet('merchant', '走北路的商旅', exchange.turn === '没问出什么' ? 2 : 8)
      world.setFlag('merchant-talks', ((world.getFlag('merchant-talks') as number) ?? 0) + 1)
      return exchange.blocks
    }
    case 'daily': {
      /**
       * 这一段他去做了那件事。
       *
       * 去处是玩家在上一节自己挑的，存在旗标里。这里只做两件事：
       * 掷出一段落点，把它的正文和后果落下去。
       *
       * `day-omen` 那一行是唯一的例外——**撞上一件事的时候，
       * 这一天就交给它了**。而去哪儿决定了可能撞上什么：
       * 山那边才有山道上那个人，镇上才有货郎摊上那册书。
       */
      const doingId = (world.getFlag(`day-${effect.slot}`) as string | undefined) ?? 'idle'
      /**
       * 先把上一段的记号擦掉。
       *
       * `day-omen` 是给这一段用的一次性记号，场景靠它决定要不要
       * 把这一天交出去。不擦的话它会一直留在旗标里，
       * **此后每一段都会重新跳进同一卷机缘**——玩家的人生
       * 会卡在同一个货郎摊前，一年一年地重来。
       */
      world.setFlag('day-omen', '')
      const beat = spend(effect.slot, doingId)
      if (!beat) return null

      world.setFlag('day-tier', beat.tier)
      if (beat.omen) world.setFlag('day-omen', beat.omen)

      const blocks: NarrativeBlock[] = beatLines(beat).map((text) => ({
        kind: 'narration',
        text: fillString(text),
      }))

      /**
       * 念头在这里反复出现。
       *
       * **不加选项，不加任务，只在他本来就会做的事情上多一句话。**
       * 玩家会先觉得这句话眼熟，很久以后才反应过来自己一直在这么干。
       */
      const echoes = echoesOn(beat.tags ?? []).map((text): NarrativeBlock => ({
        kind: 'narration',
        text,
        tone: 'faint',
      }))

      const lines = [...blocks, ...echoes]
      // 这一段发生的事先攒着，到夜里才合成一条日录——否则一天会裂成三天
      useDiaryStore().jot(
        lines.map((block) => ('text' in block ? block.text : '')),
        beat.tags,
      )
      return [...lines, ...applyEffects(beat.effects)]
    }
    case 'diary': {
      /**
       * 一天过完了，落成一条。
       *
       * 顺手做两件事，都不弹给玩家看：回头看有没有哪一天忽然想明白了，
       * 以及今天这一天有没有把某个念头往前推了一点。
       *
       * **想起一件旧事本来就是安静的**；而念头更是——
       * 它一冒出来就跳个框，那就成了任务系统。
       */
      const diary = useDiaryStore()
      const today = diary.closeDay(world.time)
      reconsider()

      const tags = today?.tags ?? []
      /**
       * 压下去的那些，跟点起来的一样要报。
       *
       * 念头只会越来越强的话，人物就成了一条经验条。
       * 而真实的样子是：他没有改主意，他只是走不开——
       * 年复一年地走不开，跟改了主意其实差不多。
       */
      const cooled = dampen(tags).map((text): NarrativeBlock => ({
        kind: 'narration',
        text,
        tone: 'faint',
      }))
      const awakened = kindle(tags)
      // 攒够了的愿望在这里分岔。往哪儿走，取决于他手边有什么
      const found = branch()
      if (found) cooled.push({ kind: 'narration', text: found.text, tone: 'deep' })
      if (!awakened) return cooled.length > 0 ? cooled : null

      /**
       * 除非他恰好在今天把它说出了口。
       *
       * 这是这套东西唯一一次主动开口——而它等了很多年，
       * 也不是每个人都等得到。
       */
      return [
        ...cooled,
        { kind: 'divider', variant: 'dots' },
        { kind: 'event', text: awakened.says, tone: 'deep' },
      ]
    }
    case 'reflect': {
      /**
       * 停下来重新掂量一回。
       *
       * 跟日结时那一遍走的是同一套闸门，区别只在时机：
       * 有些事不必等到某个寻常日子才让人想明白。
       */
      const cooled = dampen([]).map((text): NarrativeBlock => ({
        kind: 'narration',
        text,
        tone: 'faint',
      }))
      const awakened = kindle([])
      const found = branch()
      if (found) cooled.push({ kind: 'narration', text: found.text, tone: 'deep' })
      if (!awakened) return cooled.length > 0 ? cooled : null
      return [
        ...cooled,
        { kind: 'divider', variant: 'dots' },
        { kind: 'event', text: awakened.says, tone: 'deep' },
      ]
    }
    case 'ask-around': {
      const lead = askAround()
      if (!lead) {
        return [
          { kind: 'narration', text: '你问了几个人。' },
          {
            kind: 'narration',
            text: '有的没听懂，有的笑了笑。这一回什么也没问着。',
            tone: 'faint',
          },
        ]
      }
      // 线索只进认知层。它不改世界，也不保证是真的
      character.learn({
        id: `lead:${lead.id}`,
        title: '听来的一件事',
        summary: lead.believes,
        category: '修行',
        at: world.time,
        contact: '听说',
        interpretation: '猜想',
        mistaken: lead.truth === '假' ? '事实' : undefined,
      })
      // 有两条不相干的消息指到了同一处。这是他唯一能用的工具
      const where = crossed()
      if (where) {
        world.setFlag('leads-crossed', true)
        world.setFlag('following', where)
      }
      return [
        { kind: 'narration', text: `你问到了${lead.from}。` },
        { kind: 'dialogue', text: lead.says },
        { kind: 'narration', text: '你记住了。', tone: 'faint' },
      ]
    }
    case 'errand': {
      /**
       * 他跑了一趟。
       *
       * 时间不在这里推——同一批里那个 `time` 已经推过了，
       * 两处都从 `Errand.days` 取。所以这里的 `world.time`
       * 已经是**这一趟走完那一刻**，落进认知和日录的时间戳是对的。
       *
       * 家里的话也在这儿说：跑得远的那两趟要减家境。
       * 这不是罚，是一个十几岁的人跑三天真正付的代价——
       * **他不在家的那三天，活是别人干的。**
       */
      const visit = goOn(effect.id)
      if (!visit) return []
      if (visit.errand.standing) household.shiftStanding(visit.errand.standing)
      return visit.blocks
    }
    case 'follow': {
      const where = (world.getFlag('following') as string | undefined) ?? ''
      return follow(where).blocks
    }
    case 'knock': {
      return knock(effect.enter).blocks
    }
    case 'meeting': {
      /**
       * 他跟一个修士照了个面。
       *
       * 两头都在那一支里落笔：他说的话进 `aspects.claims`，
       * 玩家读出来的意思进 `knowledge`。这里只把正文接出来。
       *
       * **不改境界，不发东西，不动一格属性**——这一条在门禁里守着。
       */
      return encounterCultivator(effect.who)?.blocks ?? []
    }
    case 'tutelage': {
      /**
       * 他又把你掂量了一回，决定肯跟你到哪一步。
       *
       * **不出回执。** 这一层最要紧的一句话是玩家不知道自己现在站在哪一格——
       * 弹一枚〔与药庐那位：使唤〕出来，师承就又变回了一根进度条，
       * 而这一整章要说的正是它不是一根进度条。
       *
       * 挪不动的时候连正文都没有：那一天他去了，那个人没理他，
       * 他回来了。**这也是一种结果**，而且是最常见的那种。
       */
      return weighUp(effect.who)?.blocks ?? []
    }
    case 'teaching': {
      /**
       * 他念了那几句。
       *
       * 落进认知层的是**那段话本身**，`interpretation` 写死 `未理解`——
       * 他听见了，他不懂。走到这一步他没有「获得功法」，
       * 他只是听了五句话，而其中有一句他这辈子也没想明白。
       */
      return teach(effect.who, effect.rite)?.blocks ?? []
    }
    case 'practice': {
      /**
       * 他自己坐了一回。
       *
       * 一回打坐同时走两条轴，各最多挪一步。最常见的结果是什么也没发生，
       * 而那不是缺内容。
       *
       * **不出回执，跟 `tutelage` 同一个道理**：弹一枚〔守一：走岔了〕出来，
       * 这一整章就白写了——它要说的正是这个人分不出自己走的是哪条路。
       */
      return practise(effect.rite)?.blocks ?? []
    }
    case 'reading': {
      /**
       * 他读到一个机会。
       *
       * 头一句谁都读得到——那是这件事本来的样子。心里存着念头的人
       * 会多读出一句，而那一句**不添信息，只添注意力**。
       *
       * **选项一个没多，世界一寸没变。** 商队本来就要走，
       * 短工本来就在招——变的只是他注意到了什么。
       */
      return readingOf(effect.opening).map((text, index): NarrativeBlock => ({
        kind: 'narration',
        text,
        ...(index > 0 ? { tone: 'deep' as const } : {}),
      }))
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
 * 每一种效果属于哪个结算相。
 *
 * ## 时间不是一个普通效果
 *
 * 三十七种效果里，三十六种在**陈述一件事发生了**：他学会了什么、
 * 家里少了什么、谁死了。只有 `time` 不是——它不陈述事实，
 * **它改变其余所有事实的解释上下文**。
 *
 * 差别在这里显出来：认知落下来的时候要记 `at: world.time`，
 * 而 `world.time` 正是 `time` 效果刚改过的东西。于是同一批效果，
 * 时间写在前写在后，那条认知的时间戳差着一截：
 *
 *     [{ time: 3年 }, { knowledge }]   →  记在第三年末
 *     [{ knowledge }, { time: 3年 }]   →  记在第一天
 *
 * 全库五十七处这样的同批，一致率 100%——`time` 全写在第一位。
 * **可这个 100% 没有出处**：没有一行代码、一句注释要求过它。
 * 下一个人写在末尾，时间戳就退回去几天，不会有任何东西吭声。
 *
 * ## 修法不是立一条「`time` 必须写在第一位」的规矩
 *
 * 那条规矩会禁掉本来合法的写法——`[{ 受伤 }, { time: 养了半个月 }]`
 * 读起来就该是这个次序，而作者不该为了引擎的实现细节把它倒过来写。
 *
 * 所以把时间提到**结算的前一相**：这一批里所有 `time` 先走完，
 * 其余三十六种再按原序落下。剧本爱怎么排怎么排，
 * **顺序不再影响结果**——不是被门禁查出来的，是压根不存在了。
 * 跟 `learn()` 里「接触只能往上」是同一个手法：
 * 能让错误不存在，就别去检查它存不存在。
 *
 * 于是「一批效果是一个时刻」成了结构事实：
 * 批内所有时间戳相同，都是这段经历结束时的那一刻。
 * 真要表达「先发生 A，三年后发生 B」，那本来就是两个节点，
 * 不是一批效果——跟 `seen` 那格记的是同一条界线：换节点才是换事件。
 *
 * ## 为什么是一张三十七行的表，而不是 `type === 'time'`
 *
 * 因为这一相还会长。世界年龄、天气、灵气浓度、因果链——
 * 凡是「不陈述事实、只改变其余事实如何被解释」的东西，都属于这里。
 * 写成 `if (effect.type === 'time')`，加第二个的那天不会有人想起这件事，
 * 而漏掉的后果跟今天一模一样：后面的效果读到的是改之前的世界。
 *
 * 表钉在这儿，加第三十八种效果就得表态它是哪一相，不表态编译不过。
 * `assertNever` 守的是「新变体有没有被处理」，这张表守的是
 * 「新变体属于哪一相」——两件事，两把锁。
 */
const PHASE = {
  /** 唯一的上下文相。它一动，底下三十六种记下的时刻全跟着变 */
  time: '上下文',

  attribute: '事实',
  flag: '事实',
  roll: '事实',
  item: '事实',
  knowledge: '事实',
  place: '事实',
  home: '事实',
  realm: '事实',
  identity: '事实',
  living: '事实',
  aspect: '事实',
  claim: '事实',
  reveal: '事实',
  reflect: '事实',
  observe: '事实',
  relation: '事实',
  chronicle: '事实',
  household: '事实',
  family: '事实',
  person: '事实',
  meet: '事实',
  recall: '事实',
  signs: '事实',
  ask: '事实',
  'ask-around': '事实',
  /**
   * 跑一趟是「事实」相。
   *
   * 那一趟花掉的日子由同一批里的 `time` 推——上下文相先跑，
   * 所以这一格落地时，`world.time` 已经是他回到家的那一刻。
   * **一批效果是一个时刻**，而这一趟记在结束那一刻，不是动身那一刻。
   */
  errand: '事实',
  attend: '事实',
  knock: '事实',
  follow: '事实',
  meeting: '事实',
  tutelage: '事实',
  teaching: '事实',
  practice: '事实',
  glance: '事实',
  encounter: '事实',
  appraise: '事实',
  book: '事实',
  'book-named': '事实',
  hearsay: '事实',
  daily: '事实',
  diary: '事实',
  reading: '事实',
} satisfies { [K in Effect['type']]: '上下文' | '事实' }

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
  /**
   * 两相结算。上下文先走完，事实再按原序落下。
   *
   * `time` 不产生回执（`case 'time'` 返回 null），所以提前它不动正文的次序；
   * 多条 `time` 同批也无所谓先后——推进的是天数，加法不挑顺序。
   */
  const settle = (effect: Effect): void => {
    // 先换占位符再结算：写进 store 的就该是玩家会读到的那句话，
    // 而不是一个等着被谁替换的模板
    const receipt = applyOne(localize(effect), world, character, household, people)
    if (Array.isArray(receipt)) receipts.push(...receipt)
    else if (receipt) receipts.push(receipt)
  }

  for (const effect of effects) {
    if (PHASE[effect.type] === '上下文') settle(effect)
  }
  for (const effect of effects) {
    if (PHASE[effect.type] !== '上下文') settle(effect)
  }
  return receipts
}
