import { cultivatorById, type Cultivator } from '@/content/cultivators'
import { observerById } from '@/content/observers'
import { GRASPS, riteById, type Gate, type Grasp, type Rite } from '@/content/rites'
import { useCharacterStore } from '@/stores/character'
import { useDiaryStore } from '@/stores/diary'
import { useWorldStore } from '@/stores/world'
import { FOOTINGS, type AttributeKey, type Footing, type NarrativeBlock } from '@/types/game'

import { observe } from './observe'

/**
 * 他愿不愿意教你。
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
 * ## 学不学得会，跟这一层没有关系
 *
 * 他肯教是一件事，你学不学得会是另一件。后一件在 `rites.ts` 那四道关口上，
 * 而那四道关口量的东西**跟他挑人用的那把尺子毫不相干**。
 * 于是「他收了你，教了你，你就是转不动」变成一种平常的人生，
 * 而不是一个需要特意去写的失败分支。
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

/** 你自己练了一回 */
export interface Practice {
  rite: string
  /** 练之前到哪一层 */
  from: Grasp
  /** 练之后到哪一层 */
  to: Grasp
  /** 这一回试的是哪一关 */
  tried: Grasp | null
  /** 过了没有 */
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

  useDiaryStore().jot(
    blocks.map((block) => ('text' in block ? block.text : '')).filter((text) => text.length > 0),
    ['门口', cultivator.place],
  )

  return { who: cultivator.id, rite: rite.id, blocks }
}

// ============================================================
// 你自己回去试
// ============================================================

/** 他此刻到哪一层。没有记录就是他还没听过 */
export function graspOf(riteId: string): Grasp | null {
  const raw = useWorldStore().getFlag(graspKey(riteId))
  return GRASPS.find((one) => one === raw) ?? null
}

/**
 * 你回去照着做了一回。
 *
 * ## 一次最多过一关，过不去就原地站着
 *
 * 最常见的结果是什么也没发生。而「什么也没发生」在四层里长得几乎一样——
 * 背不全的人和背得滚瓜烂熟却一丝气感也没有的人，
 * 看到的都是同一件事：天亮了，该下地了。
 *
 * ## 中间那一关的成败，正文里看不出来
 *
 * `明白` 这一关 `passed` 和 `failed` 写的是同一段话。那不是没写完，
 * 是这一层的全部意思：**「我觉得我懂了」和「我真的懂了」，人自己分不出来。**
 * 于是一个卡在这里的人会一直往下练，一直练不出来，
 * 而他找不到任何理由怀疑自己其实没懂。
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

  const next = GRASPS[GRASPS.indexOf(from) + 1] ?? null
  if (!next) {
    // 已经到顶了。往后再练也只是练，没有新的关口
    return {
      rite: riteId,
      from,
      to: from,
      tried: null,
      passed: false,
      tries,
      blocks: say(rite.sights['转得动'].passed),
    }
  }

  const passed = clears(gateFor(rite, next), tries)
  const to = passed ? next : from
  if (passed) world.setFlag(graspKey(riteId), to)

  const sight = rite.sights[next]
  const blocks = say(passed ? sight.passed : sight.failed)
  useDiaryStore().jot(
    blocks.map((block) => ('text' in block ? block.text : '')).filter((text) => text.length > 0),
    ['独处'],
  )

  return { rite: riteId, from, to, tried: next, passed, tries, blocks }
}

/** 练了几回。前两关靠得住它，第三关跟它一点关系也没有 */
export function triesOf(riteId: string): number {
  const raw = useWorldStore().getFlag(triesKey(riteId))
  return typeof raw === 'number' ? raw : 0
}

function gateFor(rite: Rite, grasp: Grasp): Gate {
  if (grasp === '记住') return rite.remembering
  if (grasp === '明白') return rite.grasping
  return rite.turning
}

/**
 * 过不过得去。
 *
 * ```
 * 到手的分 = 那几样属性按权重合起来 + helps × 练过的回数（封顶 MOST_TRIES）
 * ```
 *
 * `helps` 写 0 的那一关，**第二项恒等于零**——练多少回都一样。
 * 转得动那一关就是这么写的，而这一行是整章的落点：
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

function triesKey(riteId: string): string {
  return `rite:${riteId}:tries`
}
