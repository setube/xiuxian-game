import { cultivatorById, type Cultivator } from '@/content/cultivators'
import { observerById } from '@/content/observers'
import {
  GRASPS,
  HOLDS,
  riteById,
  type Attained,
  type Gate,
  type Grasp,
  type Hold,
  type Reached,
  type Rite,
} from '@/content/rites'
import { useCharacterStore } from '@/stores/character'
import { useDiaryStore } from '@/stores/diary'
import { useHouseholdStore } from '@/stores/household'
import { toAbsoluteDays, useWorldStore } from '@/stores/world'
import { FOOTINGS, type AttributeKey, type Footing, type NarrativeBlock } from '@/types/game'

import { observe } from './observe'

/**
 * 他愿不愿意教你，以及教完之后你身上到底有没有那样东西。
 *
 * ## 这一层跟 meeting.ts 分开，是因为它们回答的不是同一个问题
 *
 * `meeting.ts` 算的是 `regard`——**他量到了什么**。
 * 这一层算的是 `footing`——**他决定拿你怎么办**。
 *
 * 中间隔着三样东西，缺一样这一章就塌回「资质决定一切」：
 *
 *     他量到了什么　　可能看错，而且他不知道自己看错了
 *     他在意什么　　　药庐那位一辈子不量资质，他量的是肯不肯守着
 *     他自己的处境　　`stance.ceiling` 是硬顶，看得再上眼也过不去
 *
 * 于是四种人生同时成立，而**玩家分不出自己是哪一种**——
 * 他看见的只有「那个人没有再理他」或者「那个人让他明日再来」。
 *
 * ## 一次只挪一格
 *
 * 不理会 → 搭话 → 使唤 → 带一段 → 教一点。
 * 哪怕第一眼就量到极高的分，头一回也只能挪到「搭话」。
 * 所以「第一次不教、第二次教一点、第三次才正经收下」是免费的，
 * 不需要任何额外的剧本分支：同一个人见三回，自然就是三格。
 *
 * 这一层**不牵师徒那条边**。走到「教一点」他仍旧不是你师父，
 * 界面上也不会跳出【师父：某某】。师承是关系一点一点长出来的。
 *
 * ## 学不学得会，跟他肯不肯教没有关系
 *
 * 他肯教是一件事，你学不学得会是另一件——而后一件在 `rites.ts` 那两条轴上，
 * **那两条轴量的东西跟他挑人用的那把尺子毫不相干**。
 * 于是「他收了你，教了你，你就是不成」变成一种平常的人生，
 * 而不是一个需要特意去写的失败分支。
 *
 * ## 而且教得认真反而可能害了你
 *
 * 这一版新长出来的那一件事，全在 `goesAstray()` 一个函数里：
 * 他的教法（`Cultivator.way`）跟这样东西要的教法（`Rite.asks`）对不上的时候，
 * 他念的那几句会给你一个**笃定而错误的方向感**。你很认真地照着使劲，
 * 使的是错地方。一个从没人教、自己瞎坐的人反倒不会走岔。
 *
 * 这不是「他教得不好」。他教得很好，他只是不知道这样东西教不了。
 * 他这辈子也不会知道——他只会觉得是自己讲得不够细。
 */

/** 每比门槛多这么多分，往上够一格 */
const A_STEP = 8

/**
 * 一样东西最多能靠反复练补多少回。
 *
 * 没有这个封顶的话，`helps` 大于零的关口迟早人人都过得去——
 * 那样「悟性」这一关就只是慢一点，不是过不去。
 * 有了它，**「背得极熟却始终没想通」才成为一种真的结局。**
 */
const MOST_TRIES = 6

/** 他这一回把你掂量成什么样 */
export interface Weighing {
  who: string
  /** 他这一回量到的数 */
  regard: number
  /** 他这一回**肯**到哪一格。可能远高于实际挪到的那一格 */
  willing: Footing
  /** 挪之前站在哪一格 */
  from: Footing
  /** 挪之后站在哪一格 */
  to: Footing
  /** 这一回到顶了没有。到顶的原因是他的 ceiling，不是你不够好 */
  capped: boolean
  blocks: NarrativeBlock[]
}

/** 他教了那一点东西 */
export interface Teaching {
  who: string
  rite: string
  blocks: NarrativeBlock[]
}

/**
 * 你自己练了一回。
 *
 * 两条轴各有各的一对字段，**这两对之间没有换算关系**：
 * `from → to` 是脑子里那条，`was → now` 是身上那条。
 * 一个人完全可能 `to` 已经到「明白」而 `now` 还在「照着做」，
 * 也完全可能 `now` 早就「摸着了」而 `to` 还卡在「记住」。
 */
export interface Practice {
  rite: string
  /** 脑子里：练之前到哪一层 */
  from: Grasp
  /** 脑子里：练之后到哪一层 */
  to: Grasp
  /** 身上：练之前到哪一步 */
  was: Hold
  /** 身上：练之后到哪一步 */
  now: Attained
  /** 身上这一回挪窝了没有。**挪到「走岔了」也算挪** */
  moved: boolean
  /** 这一回试的是脑子里哪一关。已经到顶就是 null */
  tried: Reached | null
  /** 脑子里那一关过了没有 */
  passed: boolean
  /** 一共练了几回 */
  tries: number
  blocks: NarrativeBlock[]
}

// ============================================================
// 他愿不愿意
// ============================================================

/** 他此刻拿你当什么。没有记录就是「不理会」——他压根没把你放心上 */
export function footingWith(cultivatorId: string): Footing {
  const raw = useWorldStore().getFlag(footingKey(cultivatorId))
  const found = FOOTINGS.find((one) => one === raw)
  return found ?? '不理会'
}

/**
 * 他又掂量了你一回。
 *
 * ## 每一回都重新量，量出来的数每回不一样
 *
 * 这不是随机数噪音，是这一层想说的话：**他今天看你和昨天看你不是一回事。**
 * `observe()` 里的抖动跟着判断力走，越是外行看得越飘——
 * 一个准头只有五十几的人，同一个孩子看三回可以得出三个不同的印象。
 *
 * 量完**不写 claim**。他心里嘀咕一句不等于他说出了口，
 * 而 `aspects.claims` 记的是说出口的话。
 *
 * ## 只往上挪，不往下掉
 *
 * 他已经带你走过一段了，不会因为今天量得低就当没见过你。
 * 往下掉那一头由剧本显式写——**那是玩家做了什么，不是他今天心情不好**。
 */
export function weighUp(cultivatorId: string): Weighing | null {
  const cultivator = cultivatorById(cultivatorId)
  if (!cultivator) {
    console.error(`剧本让人去攀一个不存在的修士：${cultivatorId}`)
    return null
  }

  const regard = regardOf(cultivator)
  const reach = reachOf(regard, cultivator)
  const from = footingWith(cultivatorId)
  const at = FOOTINGS.indexOf(from)
  // 一次最多一格。够不着就原地站着
  const to = FOOTINGS[Math.max(at, Math.min(reach, at + 1))] ?? from

  const world = useWorldStore()
  if (to !== from) world.setFlag(footingKey(cultivatorId), to)

  const blocks: NarrativeBlock[] =
    to === from ? [] : (cultivator.steps[to] ?? []).map((text) => ({ kind: 'narration', text }))

  if (blocks.length > 0) {
    useDiaryStore().jot(
      blocks.map((block) => ('text' in block ? block.text : '')).filter((text) => text.length > 0),
      ['门口', cultivator.place],
    )
  }

  return {
    who: cultivator.id,
    regard,
    willing: FOOTINGS[reach] ?? '不理会',
    from,
    to,
    capped: reach >= FOOTINGS.indexOf(cultivator.stance.ceiling),
    blocks,
  }
}

/**
 * 他这一回量到的那个数。
 *
 * 跟 `meeting.ts` 里那一行是同一个算法，故意不抽出去共用：
 * 那一处量完要说出口（落 claim），这一处量完只搁在他自己心里。
 * **合成一个函数的话，「他心里怎么想」和「他说了什么」就又粘回一起了**，
 * 而这一整套东西的头一条规矩就是这两样必须分开。
 */
function regardOf(cultivator: Cultivator): number {
  const observer = observerById(cultivator.observer)
  if (!observer) {
    console.error(`这个修士手里那把尺子不存在：${cultivator.observer}`)
    return 0
  }
  const remarks = observe(observer)
  if (remarks.length === 0) return 0
  return remarks.reduce((sum, one) => sum + one.held, 0) / remarks.length
}

/**
 * 他肯到哪一格。
 *
 * 两道闸各管各的：
 *
 *     opensAt　　量不到这个数，他连话都不搭。**这一道是你的事**
 *     ceiling　　量到天上去也就到这儿。**这一道是他的事，跟你无关**
 *
 * 第三种人生全靠第二道闸落地：观里那位看得清清楚楚，
 * 也照样只到「带一段」为止。而玩家永远听不到那个理由。
 */
function reachOf(regard: number, cultivator: Cultivator): number {
  if (regard < cultivator.opensAt) return 0
  const earned = 1 + Math.floor((regard - cultivator.opensAt) / A_STEP)
  const ceiling = FOOTINGS.indexOf(cultivator.stance.ceiling)
  return Math.min(earned, ceiling, FOOTINGS.length - 1)
}

function footingKey(cultivatorId: string): string {
  return `footing:${cultivatorId}`
}

// ============================================================
// 他教的那一点东西
// ============================================================

/**
 * 他真的念了那几句。
 *
 * ## 落进认知层的是那段话本身，不是「学会了」
 *
 * `summary` 存的是他念的原话，`interpretation` 是 `未理解`——
 * **他听见了，他不懂。** 这一格写 `未理解` 是有意的：
 * 一个人可以清清楚楚地记得一句话，同时完全不知道那句话在说什么。
 *
 * `contact` 给 `亲历`：这不是听人转述的，是有人当面对他说的。
 * 这一档只能往上，此后再有人提起，也退不回「听说」。
 *
 * ## 这一刻还要记下两样别的
 *
 * **是谁教的**——因为往后每一回打坐都要拿他的教法去对，
 * 而「同一句话从不同的人嘴里说出来不是一回事」正是这一章的论点。
 * 这跟 `family.born` 那条规矩是同一个道理：能影响后事的东西，
 * 必须真的记在世界里，不能事到临头再猜一个。
 *
 * **哪一天教的**——`Rite.settles` 数的是日子，不是回数。
 * 不在这儿记下起点，后面就只能拿练了几回去凑，
 * 那样「一个月练二十回」和「两年练二十回」就又变成一回事了。
 */
export function teach(cultivatorId: string, riteId: string): Teaching | null {
  const cultivator = cultivatorById(cultivatorId)
  const rite = riteById(riteId)
  if (!cultivator || !rite) {
    console.error(`教的这一样对不上：${cultivatorId} / ${riteId}`)
    return null
  }
  if (footingWith(cultivatorId) !== '教一点') return null

  const world = useWorldStore()
  const character = useCharacterStore()

  const blocks: NarrativeBlock[] = [
    ...(cultivator.steps['教一点'] ?? []).map((text): NarrativeBlock => ({
      kind: 'narration',
      text,
    })),
    ...rite.words.map((text): NarrativeBlock => ({ kind: 'dialogue', text })),
  ]

  character.learn({
    id: `rite:${rite.id}`,
    title: cultivator.calls + '教的那几句',
    summary: rite.words.join(''),
    category: '修行',
    at: world.time,
    contact: '亲历',
    // 听见了，不懂。这两件事同时成立
    interpretation: '未理解',
  })
  world.setFlag(graspKey(rite.id), '听过')
  world.setFlag(taughtByKey(rite.id), cultivator.id)
  world.setFlag(sinceKey(rite.id), toAbsoluteDays(world.time))

  useDiaryStore().jot(
    blocks.map((block) => ('text' in block ? block.text : '')).filter((text) => text.length > 0),
    ['门口', cultivator.place],
  )

  return { who: cultivator.id, rite: rite.id, blocks }
}

/** 这一样是谁教的。没有人教过就是 null——那种情况下没人给过他方向 */
export function taughtBy(riteId: string): Cultivator | null {
  const raw = useWorldStore().getFlag(taughtByKey(riteId))
  return typeof raw === 'string' ? (cultivatorById(raw) ?? null) : null
}

// ============================================================
// 你自己回去试
// ============================================================

/** 他脑子里到哪一层。没有记录就是他还没听过 */
export function graspOf(riteId: string): Grasp | null {
  const raw = useWorldStore().getFlag(graspKey(riteId))
  return GRASPS.find((one) => one === raw) ?? null
}

/** 他身上到哪一步。没有记录就是还没上过手 */
export function holdOf(riteId: string): Hold {
  const raw = useWorldStore().getFlag(holdKey(riteId))
  return HOLDS.find((one) => one === raw) ?? '没上手'
}

/**
 * 你回去照着做了一回。
 *
 * ## 一回打坐，两条轴各走各的
 *
 * 先算脑子里那一条，再算身上那一条——顺序有讲究：**这一回想明白了的人，
 * 这一回就已经不在岔上了。** 于是「他终于把那句话想通了」和
 * 「他这一夜坐下来感觉不一样了」落在同一段正文里，
 * 而正文一个字也没说他从前走错了。
 *
 * ## 从岔上出来那一天，看见的是他第一天看见的那句话
 *
 * 因为 `照着做.passed` 和 `走岔了.passed` 逐字相同。这不是省事——
 * 他确实是**从头开始**，而且他不知道自己是在从头开始。
 *
 * ## 中间那些关的成败，正文里看不出来
 *
 * 「明白」这一关 `passed` 和 `failed` 写的是同一段话；
 * 「照着做」和「走岔了」两格从头到尾写的是同一段话。那不是没写完，
 * 是这一层的全部意思：**「我觉得我走对了」和「我真的走对了」，
 * 人自己分不出来。** 于是一个卡住的人会一直练下去，一直练不出来，
 * 而他找不到任何理由怀疑自己。
 */
export function practise(riteId: string): Practice | null {
  const rite = riteById(riteId)
  if (!rite) {
    console.error(`练的这一样不存在：${riteId}`)
    return null
  }
  const from = graspOf(riteId)
  if (!from) return null

  const world = useWorldStore()
  const tries = triesOf(riteId) + 1
  world.setFlag(triesKey(riteId), tries)

  const was = holdOf(riteId)

  // 脑子里那一条
  const tried = nextGrasp(from)
  const passed = tried !== null && clears(gateFor(rite, tried), graspTries(was, tried, tries))
  const to = passed && tried ? tried : from
  if (passed) {
    world.setFlag(graspKey(riteId), to)
    if (to === '明白') settle(rite)
  }

  // 身上那一条。用 to 不用 from——这一回想通的，这一回就算数
  const now = stepOn(rite, was, to, tries)
  const moved = now !== was
  if (moved) world.setFlag(holdKey(riteId), now)

  const hold = rite.holds[now]
  const sight = tried === null ? null : rite.sights[tried]
  const blocks = [
    ...say(moved ? hold.passed : hold.failed),
    ...(sight === null ? [] : say(passed ? sight.passed : sight.failed)),
  ]
  useDiaryStore().jot(
    blocks.map((block) => ('text' in block ? block.text : '')).filter((text) => text.length > 0),
    ['独处'],
  )

  return { rite: riteId, from, to, was, now, moved, tried, passed, tries, blocks }
}

/** 练了几回。有些关靠得住它，有些关跟它一点关系也没有 */
export function triesOf(riteId: string): number {
  const raw = useWorldStore().getFlag(triesKey(riteId))
  return typeof raw === 'number' ? raw : 0
}

/**
 * 他想通了，于是那条见闻上的「未理解」该改了。
 *
 * `teach()` 落下去的时候写的是 `未理解`——他听见了，他不懂。
 * 这一刻他懂了，那一格就得跟着动：**状态里记着「明白」而认知层
 * 还写着「未理解」，跟「正文说教过你、状态里却什么也没留下」
 * 是同一种病的两个方向。**
 *
 * 改成 `确信` 不是「他答对了」的奖赏——那一根轴量的是他自己有多笃定，
 * 跟他身上有没有那个东西毫不相干。而这一格恰好把走岔的人钉住了：
 * 他一辈子过不了「明白」这一关，于是那条见闻上永远写着「未理解」。
 * **认知层老老实实记着他没懂，而他自己完全不知道。**
 */
function settle(rite: Rite): void {
  const character = useCharacterStore()
  const learnt = character.knowledge.find((one) => one.id === `rite:${rite.id}`)
  if (!learnt) return
  character.learn({
    id: learnt.id,
    title: learnt.title,
    category: learnt.category,
    at: useWorldStore().time,
    interpretation: '确信',
  })
}

/**
 * 身上那一条走一步。
 *
 * **显式一条一条列着，不拿 `HOLDS` 的下标比大小**——那条轴中间是个分叉，
 * 顺序在那儿根本不成立。「走岔了」不比「照着做」高一级也不比它低一级，
 * 它是另一条路。
 *
 *     没上手 ─┬→ 照着做 ─→ 摸着了 ─→ 拿得住
 *             └→ 走岔了 ─┘（只有想明白了才回得来，回到「照着做」重走）
 *
 * 「照着做」这一格不再问会不会走岔，因为**走对了的人不会忽然走岔**：
 * `goesAstray` 那三个条件里，`handsKnow` 和教法是定死的，
 * 而 `grasp` 只涨不跌——一旦为假，就永远为假。
 */
function stepOn(rite: Rite, from: Hold, grasp: Grasp, tries: number): Attained {
  switch (from) {
    case '没上手':
      return goesAstray(rite, grasp) ? '走岔了' : '照着做'
    case '走岔了':
      // 唯一的出路。而走出来不等于走到了——他回到起点，重走一遍
      return goesAstray(rite, grasp) ? '走岔了' : '照着做'
    case '照着做':
      return clears(rite.finding, tries) ? '摸着了' : '照着做'
    case '摸着了':
      return clears(rite.steadying, tries) && daysSince(rite.id) >= rite.settles
        ? '拿得住'
        : '摸着了'
    case '拿得住':
      return '拿得住'
  }
}

/**
 * 这一回他会不会往错地方使劲。
 *
 * 三条，任意一条成立就不会走岔：
 *
 *     没有人教过他　　　他知道自己什么都不知道，所以他不会笃定
 *     教法对得上　　　　他给的方向就是那个方向
 *     他手上自己知道　　见 `handsKnow`
 *
 * 三条都不成立的时候，那几句话就成了一张画错的地图。
 * **而画地图的人是真心的，拿地图的人也是真心的。**
 */
function goesAstray(rite: Rite, grasp: Grasp): boolean {
  // 想明白了就不会再往错地方使劲。这是这条岔路唯一的出口
  if (grasp === '明白') return false
  const teacher = taughtBy(rite.id)
  if (!teacher) return false
  if (teacher.way === rite.asks) return false
  return !handsKnow()
}

/**
 * 你手上有没有那一份不靠话的经验。
 *
 * 有些人打小就知道有一类东西是说不出来的：认草的人闻一下就知道是哪一味，
 * 说不清凭什么；下套的人看一眼草压得对不对，也说不清凭什么。
 * **这样的人听见一句说不通的话，不会硬往话上凑**——他知道话到不了那儿。
 *
 * 于是这一格成了教法对不上时唯一的补救，而它跟悟性没有关系：
 * 一个悟性平平的药铺孩子有它，一个悟性极好的官宦孩子没有。
 *
 * ## 这里有一处没答的缺口，写在这儿免得将来当成已经想过了
 *
 * 一个聋子听不见那五句，一个瞎子看不见他的动作——这两样在 `body.ts` 的
 * `Constitution` 里是有的，可它们此刻**一点也不参与这一层**。
 * 把它们塞进这个函数是讨巧：那等于绕过「他听不见那句话」这个更要紧的问题，
 * 反倒去领一份好处。这一条留着不做，见 `scripts/mastery.ts` 结尾。
 */
function handsKnow(): boolean {
  const trade = useHouseholdStore().trade
  if (trade === '药铺' || trade === '猎户') return true
  return useCharacterStore().knows('herb-lore')
}

/**
 * 「明白」这一关，这一回该按练了几回算。
 *
 * **两条轴在这一处交叉一次，全书只此一处。** 走岔了的人天天在做一件错事，
 * 那件错事天天给他一个「我这不是做得挺对的吗」的回音——
 * 于是他在错路上练一百回，对于「想明白那五句」这件事，等于一回也没练。
 *
 * 只有「明白」这一关受影响。背五句照样背得下来，
 * **背诵跟你坐得对不对没有关系**，所以「记住」那一关一切照旧。
 */
function graspTries(hold: Hold, tried: Reached, tries: number): number {
  if (hold === '走岔了' && tried === '明白') return 0
  return tries
}

/** 从这一格往上够的那一格。已经到顶就是 null */
function nextGrasp(from: Grasp): Reached | null {
  if (from === '听过') return '记住'
  if (from === '记住') return '明白'
  return null
}

function gateFor(rite: Rite, grasp: Reached): Gate {
  return grasp === '记住' ? rite.remembering : rite.grasping
}

/** 学到这一样那天到今天，过了多少日子 */
function daysSince(riteId: string): number {
  const world = useWorldStore()
  const raw = world.getFlag(sinceKey(riteId))
  if (typeof raw !== 'number') return 0
  return toAbsoluteDays(world.time) - raw
}

/**
 * 过不过得去。
 *
 * ```
 * 到手的分 = 那几样属性按权重合起来 + helps × 练过的回数（封顶 MOST_TRIES）
 * ```
 *
 * `helps` 写 0 的那一关，**第二项恒等于零**——练多少回都一样。
 * `finding` 和 `steadying` 两关都是这么写的，而这一行是整章的落点：
 * 有些事努力管用，有些事努力不管用，而**当事人分不出自己碰上的是哪一种**。
 */
function clears(gate: Gate, tries: number): boolean {
  const character = useCharacterStore()
  const attributes = character.attributes
  let sum = 0
  let weight = 0
  for (const [key, share] of Object.entries(gate.by) as [AttributeKey, number][]) {
    sum += attributes[key] * share
    weight += share
  }
  const born = weight === 0 ? 0 : sum / weight
  return born + gate.helps * Math.min(tries, MOST_TRIES) >= gate.needs
}

function say(lines: readonly string[]): NarrativeBlock[] {
  return lines.map((text) => ({ kind: 'narration', text }))
}

function graspKey(riteId: string): string {
  return `rite:${riteId}`
}

function holdKey(riteId: string): string {
  return `rite:${riteId}:hold`
}

function triesKey(riteId: string): string {
  return `rite:${riteId}:tries`
}

function taughtByKey(riteId: string): string {
  return `rite:${riteId}:by`
}

function sinceKey(riteId: string): string {
  return `rite:${riteId}:since`
}
