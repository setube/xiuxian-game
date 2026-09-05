/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一个人现在过什么日子，是会变的；而他从前过过的日子，一段也不许丢。
 *
 * 跑法：`bun scripts/living.ts`
 *
 * ## 这一道守的是什么
 *
 * `character.livings` 落地之前，「你过什么日子」这个问题的答案
 * 出生那天就定死了：家里是农户就一辈子是农户的日子。
 * 那对绝大多数人生是对的——**但削爵那一卷正好是那个例外**。
 * 皇子在宫里长到十五岁，一道旨意下来迁出京城，此后他过的日子
 * 跟宫里没有一点关系了，可宫里那些人过的日子一点没变。
 *
 * 所以这一道问四件事，逐字照着这一轮的验收写：
 *
 *     ① 当前生活能发生变化
 *     ② 变化后旧生活仍可回溯
 *     ③ 正文能根据当前生活出现不同内容
 *     ④ identity 与 living 可以同时存在而不互相覆盖
 *
 * ## 判据取实跑，不取静态比对
 *
 * 底下五条人生走的效果**全是从库里原样读出来的**——
 * `royal:fall#edict` 的 `onEnter`、`edict` 那两个选择的 `effects`、
 * `royal:demote` 那两节的 `onEnter`，一个字也没有在这支脚本里重写。
 * 于是「那一行 `{ type: 'living', living: 'market' }` 被删掉了」
 * 这件事在这里会当场红，而不是让判据照着自己抄的那份继续绿。
 *
 * 反过来，指着的那一处要是被改名或删了，`resolve` 会报
 * 「库里没有这一处」——**门禁指着空气，比门禁不存在更糟。**
 *
 * ## 第五节是这支脚本的另一半
 *
 * 前四节全绿说明「机制在」，说明不了「判据能分辨」。所以第五节把
 * 四种坏实现摆出来喂给同一把尺子：日子只是家里那格的别名、
 * `liveAs` 直接覆盖不留历史、旧那段忘了封口、条件仍旧读 household。
 * **四种坏实现必须全被拒绝**，有一种混过去，前四节的绿就不作数。
 *
 * 末尾还报一次覆盖率：全库一共几处效果在换日子，这一支走到了几处。
 * 走不到的那一处会红——以后谁在别的卷里写下第四处，
 * 这道门禁会开口要求把那条路也走一遍。
 */
import { createPinia, setActivePinia } from 'pinia'

import { BEATS, DOINGS } from '../src/content/days'
import { lifeScenes } from '../src/content/life'
import { SPARKS } from '../src/content/leanings'
import { livingById } from '../src/content/living'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { fillString } from '../src/engine/interpolate'
import { useCharacterStore, type LivingSpan } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Effect, OriginId } from '../src/types/game'
import { beOf } from './origin'
import { effectsOf } from './refs'

/** 风调雨顺。这一道不查年景，把它按住免得饥荒插进来搅局 */
const CALM = { rain: 55, harvest: 58, grain: 112, order: 66, plague: 0 }

/** 削爵那一年他十五岁。年份本身要紧——每一段日子的 `since` 都得对得上 */
const AGE_AT_START = 15

// ============================================================
// 走一条人生
// ============================================================

/**
 * 库里的一处效果。**不写效果本身，只写它在库里的门牌号。**
 *
 * 抄一份效果数组进来，这支脚本就变成了内容的第二个真相，
 * 而两个真相迟早会对不上——那正是 `refs.ts` 头上那段话说的事。
 */
interface Step {
  scene: string
  node: string
  /** 不填就是这一节的 `onEnter`；填了就是这一节某个选择的 `effects` */
  choice?: string
}

/** 门牌号读出来的东西：一个位置名，加上那一处原样的效果 */
interface Site {
  where: string
  effects: readonly Effect[]
}

function resolve(step: Step): Site | string {
  const scene = lifeScenes[step.scene]
  if (!scene) return `库里没有这一卷：${step.scene}`
  const node = scene.nodes[step.node]
  if (!node) return `${step.scene} 里没有这一节：${step.node}`
  if (step.choice === undefined) {
    return { where: `${step.scene}#${step.node}`, effects: node.onEnter ?? [] }
  }
  const choice = (node.choices ?? []).find((one) => one.id === step.choice)
  if (!choice) return `${step.scene}#${step.node} 上没有这个选择：${step.choice}`
  return {
    where: `${step.scene}#${step.node}:${step.choice}`,
    effects: choice.effects ?? [],
  }
}

/** 一条人生。`steps` 是他依次走过的那几处，空数组就是「什么也没发生」 */
interface Path {
  id: string
  label: string
  /**
   * 从哪一行掷出来的。
   *
   * 钉的是**出身主键**，不是那五格里的某一格：削爵和削藩这两条人生
   * 五格一字不差（宗室 · 食禄 · 无产 · 宗室），只有主键分得开，
   * 而它们恰恰是这一支拿来做交叉的那一对。
   */
  origin: OriginId
  steps: readonly Step[]
}

/**
 * 五条人生。
 *
 * 前四条各自是一种走法，第五条是对照组——**农户的孩子一辈子没换过日子**，
 * 而他的 `livings` 得一直空着。少了这一条，「日子会变」这件事就没有底：
 * 一个凡是活着就会变的东西，跟一个不会变的东西，一样没有分辨力。
 */
const PATHS: readonly Path[] = [
  {
    id: 'palace',
    label: '墙没塌的那个：皇子一直在宫里',
    origin: 'court',
    steps: [],
  },
  {
    id: 'fall-street',
    label: '削爵迁出，开门出去走到街上',
    origin: 'court',
    steps: [
      { scene: 'royal:fall', node: 'edict' },
      { scene: 'royal:fall', node: 'edict', choice: 'street' },
    ],
  },
  {
    id: 'fall-inside',
    label: '削爵迁出，把门关上',
    origin: 'court',
    steps: [
      { scene: 'royal:fall', node: 'edict' },
      { scene: 'royal:fall', node: 'edict', choice: 'inside' },
    ],
  },
  {
    /**
     * 削藩这一卷分了三节，而换日子的是第二节。
     *
     * 走两步不是为了好看：宣旨那一节人还跪在王府里，日子一格没动，
     * 搬过去才是「屋子还在，营生没有」那种日子的开始。
     * **只走 `open` 的话，这条人生停在换日子之前**——底下那条
     * 「削爵和削藩过的是同一种日子」会以为日子跟着身份走了。
     *
     * 这两行是手写的，会跟着内容改。兜底的是末尾那条覆盖率：
     * 全库有几处效果在换日子，这一支走到几处。上一回正是它先开的口。
     */
    id: 'demote',
    label: '削藩：王府的孩子成了寓公之子',
    origin: 'manor',
    steps: [
      { scene: 'royal:demote', node: 'open' },
      { scene: 'royal:demote', node: 'home' },
    ],
  },
  {
    /**
     * 自己走出去挣饭吃。
     *
     * 这一条跟上面那三条不是同一种事：削爵、削藩都是**家道变了，
     * 日子跟着变**——人是被动掉进另一种日子里的，而且掉的时候
     * 全家一起掉。这一条是他自己走出去的：家还是那个家，
     * 家里的营生一格没动，只是他从此不靠它吃饭了。
     *
     * 所以这一条同时也在验第五节那句「日子不是家里那格的别名」：
     * 他过 `market`，`householdLivingId` 仍旧解析成 `farm`。
     * 上面那几条验不到这一层——它们搬家的时候把全家都搬走了。
     *
     * 「走了三年之后那些人还算不算你的人」是隔壁 `kept.ts` 的事，
     * 这里只问一件：**日子换没换。**
     */
    id: 'shopwork',
    label: '农户的孩子自己去镇上做工',
    origin: 'farm',
    steps: [{ scene: 'reunion:apprentice', node: 'open', choice: 'go' }],
  },
  {
    id: 'farm',
    label: '对照：农户的孩子，一辈子没换过日子',
    origin: 'farm',
    steps: [],
  },
]

/**
 * 走完一条人生之后，他身上跟这一道有关的一切。
 *
 * 存的是快照不是 store：五条人生各自跑在自己的 pinia 里，
 * 跑完就没了，判据只能对着快照问。
 */
interface Walked {
  id: string
  label: string
  /** 他现在过的日子。三级链解析完的那一格 */
  livingId: string
  /** 他现在的身份。跟上一格是两个维度，这一道后半段查的就是这个 */
  identity: string
  /** 他自己过过的每一段，按先后 */
  livings: readonly LivingSpan[]
  /** 家里的营生解析出来的那格日子。**给尺子自检当反例用** */
  householdLivingId: string
  /** 「帮家里干活」这个去处对他开不开 */
  works: boolean
  /** `{chore}` 这个记号落到他身上是什么 */
  chore: string
  /** 那一句收工的心念，读出来是什么样 */
  spark: string
  /** 他依次走过的那几处，连同各自跨过的年份 */
  steps: readonly StepRun[]
}

/** 走过的一处。年份是给 `LivingSpan.since` 当尺子的 */
interface StepRun {
  where: string
  /** 走这一步之前是哪一年 */
  from: number
  /** 走完这一步是哪一年 */
  to: number
  /** 这一处效果里点名的日子，按出现次序。**从库里读出来的，不是抄的** */
  livings: readonly string[]
}

/** 「帮家里干活」那个去处。找不到就没法量第三条了 */
const WORK = DOINGS.find((doing) => doing.id === 'work')

/** 那句用 `{putsAway}` 问这家人怎么收工的心念 */
const ANOTHER_DAY = SPARKS.find((spark) => spark.id === 'another-day-done')

function textOf(text: string | readonly string[]): string {
  return typeof text === 'string' ? text : text.join('')
}

/**
 * 掷到一个没被人捡去养的孩子为止，然后把世界摆到削爵那一年。
 *
 * ## 为什么要把收养掷掉
 *
 * 出生那一掷里，任何出身的孩子都可能被讨饭的、寺里的老僧、
 * 逃难路上的人捡去养大——**那一级会盖掉家里的营生**。
 * 头一版没掷，于是「农户的孩子」这条对照有时候解析成 temple，
 * 门禁随机变红：**一条随机的对照量不出任何东西。**
 *
 * 掷掉它不是回避。收养那一级是解析链的第二级，
 * `scripts/upbringing.ts` 第一道盯的就是它；这一支问的是最顶上那一级，
 * 起点得是确定的，否则五条人生每跑一次的出发点都不一样。
 *
 * @returns 掷成了没有。掷不成说明这一掷本身出了问题，判据失效
 */
function born(id: OriginId): boolean {
  for (let tries = 0; tries < 6000; tries += 1) {
    setActivePinia(createPinia())
    beOf(id)
    const household = useHouseholdStore()
    const world = useWorldStore()
    useCharacterStore()
    const people = usePeopleStore()
    world.bornYear = world.time.year - AGE_AT_START
    world.regions = { [household.prefecture]: { state: { ...CALM }, last: {} } }

    const adopted = people.guardians
      .filter((one) => people.isAlive(one))
      .some((one) => people.personOf(one)?.living !== undefined)
    if (!adopted) return true
  }
  return false
}

function walk(path: Path): Walked | string {
  if (!born(path.origin)) return '掷了六千回也没掷出一个没被人捡去养的孩子，判据本身失效了'
  const household = useHouseholdStore()
  const world = useWorldStore()
  const character = useCharacterStore()

  const steps: StepRun[] = []
  for (const step of path.steps) {
    const site = resolve(step)
    if (typeof site === 'string') return site
    const from = world.time.year
    applyEffects(site.effects)
    steps.push({
      where: site.where,
      from,
      to: world.time.year,
      livings: site.effects.filter((one) => one.type === 'living').map((one) => one.living),
    })
  }

  return {
    id: path.id,
    label: path.label,
    livingId: character.living.id,
    identity: character.identity,
    livings: character.livings.map((span) => ({ ...span })),
    householdLivingId: household.living.id,
    works: WORK !== undefined && meetsAll(WORK.requires),
    chore: fillString('{chore}'),
    spark: ANOTHER_DAY ? fillString(textOf(ANOTHER_DAY.text)) : '（库里没有那一句心念）',
    steps,
  }
}

const walked = new Map<string, Walked>()
const broken: string[] = []
for (const path of PATHS) {
  const one = walk(path)
  if (typeof one === 'string') broken.push(`${path.label}：${one}`)
  else walked.set(path.id, one)
}

/** 取一条走完的人生。取不到说明上面已经记过一笔，这里不重复报 */
function of(id: string): Walked | undefined {
  return walked.get(id)
}

// ============================================================
// 历史那一段是不是站得住
// ============================================================

/**
 * 一串日子读不读得通。
 *
 * 只问形状：至多一段开着口、封口不早于开头、前一段封在哪年后一段就从哪年起。
 * **空的也算读得通**——一个人绝大多数时候压根没换过日子，
 * 那时这个列表本来就该是空的。
 */
function historyHolds(spans: readonly LivingSpan[]): string[] {
  const wrong: string[] = []
  if (spans.length === 0) return wrong

  const open = spans.filter((span) => span.until === null)
  if (open.length !== 1) {
    wrong.push(`同时有 ${open.length} 段日子还在过——当前的日子只能有一段`)
  }
  if (spans[spans.length - 1]?.until !== null) {
    wrong.push('最后一段已经封口了，那他现在过的是哪一段')
  }
  for (const [index, span] of spans.entries()) {
    if (livingById(span.id) === undefined) {
      wrong.push(`第 ${index + 1} 段是一种不存在的日子：${span.id}`)
    }
    if (span.until !== null && span.until < span.since) {
      wrong.push(`第 ${index + 1} 段 ${span.id} 的收尾早于开头：${span.since} → ${span.until}`)
    }
    const next = spans[index + 1]
    if (next && span.until !== next.since) {
      wrong.push(
        `第 ${index + 1} 段 ${span.id} 封在 ${span.until}，` +
          `下一段 ${next.id} 却从 ${next.since} 起——中间那一截他过的是什么日子`,
      )
    }
  }
  return wrong
}

/**
 * 他走过的每一处换日子的效果，在履历里都该留下一段，次序一致。
 *
 * ## 为什么形状对了还不够
 *
 * 头一版这一节只问 `historyHolds`，于是尺子自检当场把它戳穿了：
 * 把履历砍成只剩最后一段（那正是「直接覆盖不留历史」的样子），
 * 判据居然认了——因为**一段开着口的履历本身完全合法**，
 * 「把门关上」那条人生的履历就长这样。
 *
 * 形状分不出「换过一次」和「换过两次但丢了一次」。分得出的只有一件事：
 * **拿他实际走过的那几处效果去对。** 那个期望不是写在这儿的常量，
 * 是从他踩过的门牌号上读出来的——所以内容里那一行
 * `{ type: 'living', living: 'market' }` 被删掉时，
 * 期望和实际会一起变成空，而第一节那句「日子该变成 market」当场红。
 *
 * 连着两处点同一种日子只算一段，因为 `liveAs` 就是这么定的：
 * 同一种日子接着过不记第二笔，否则会切出一段零长的日子。
 */
function ledgerMatches(spans: readonly LivingSpan[], walkedThrough: readonly string[]): string[] {
  const wrong = [...historyHolds(spans)]
  const expected: string[] = []
  for (const id of walkedThrough) {
    if (expected[expected.length - 1] !== id) expected.push(id)
  }
  const actual = spans.map((span) => span.id)
  if (actual.join(' → ') !== expected.join(' → ')) {
    wrong.push(
      `一路走过的换日子的效果依次是〔${expected.join(' → ') || '一处也没有'}〕，` +
        `履历里记着的却是〔${actual.join(' → ') || '一段也没有'}〕`,
    )
  }
  return wrong
}

/** 这条人生一路点过的日子，按次序 */
function walkedThrough(one: Walked): string[] {
  return one.steps.flatMap((step) => [...step.livings])
}

// ============================================================
// 一、当前生活能发生变化
// ============================================================

function canChange(): string[] {
  const wrong: string[] = [...broken]
  const palace = of('palace')
  const street = of('fall-street')
  const inside = of('fall-inside')
  const demote = of('demote')
  const farm = of('farm')

  if (palace && palace.livingId !== 'palace') {
    wrong.push(`皇子什么也没发生，日子却成了 ${palace.livingId}`)
  }
  if (palace && palace.livings.length !== 0) {
    wrong.push('皇子什么也没发生，`livings` 里却长出了东西——那一级本该空着')
  }
  if (street && street.livingId !== 'market') {
    wrong.push(`开门出去的那个该过 market 的日子，实际是 ${street.livingId}`)
  }
  if (inside && inside.livingId !== 'fallen') {
    wrong.push(`把门关上的那个该过 fallen 的日子，实际是 ${inside.livingId}`)
  }
  if (demote && demote.livingId !== 'fallen') {
    wrong.push(`寓公之子该过 fallen 的日子，实际是 ${demote.livingId}`)
  }
  if (palace && street && palace.livingId === street.livingId) {
    // 这一条才是这一节真正问的：同一个出身，走过那一卷之后不再是同一种日子
    wrong.push('削爵走了一遍，日子跟没走的那个一模一样——它根本没变')
  }
  if (street && inside && street.livingId === inside.livingId) {
    wrong.push('开门出去和把门关上过的是同一种日子——那道分岔在日子上没有落点')
  }

  // 对照：没人给日子的时候，它不会自己变
  if (farm && farm.livingId !== 'farm') {
    wrong.push(`农户的孩子什么也没发生，日子却成了 ${farm.livingId}`)
  }
  if (farm && farm.livings.length !== 0) {
    wrong.push('农户的孩子一辈子没换过日子，`livings` 里却有东西')
  }

  for (const one of walked.values()) {
    console.log(`  【${one.label}】${one.livingId}　${livingById(one.livingId)?.summary ?? ''}`)
  }
  return wrong
}

// ============================================================
// 二、变化后旧生活仍可回溯
// ============================================================

function historyKeeps(): string[] {
  const wrong: string[] = []

  /**
   * 五条人生**每一条**都拿同一把尺子量，不是只量走过那两卷的。
   *
   * 皇子和农户那两条一处效果也没走过，期望和实际就都该是空的——
   * 而「空对空」正是这把尺子不会永远红的那一半证据。
   */
  for (const one of walked.values()) {
    for (const bad of ledgerMatches(one.livings, walkedThrough(one))) {
      wrong.push(`${one.label}：${bad}`)
    }
  }

  const street = of('fall-street')
  if (street) {
    // 换到第二种日子之后，第一种还在，而且封上了口。
    // 只在真有两段时问——只剩一段那件事已经由上面那把尺子说过了
    const first = street.livings[0]
    if (street.livings.length >= 2 && first?.until === null) {
      wrong.push('迁出京城那一段还开着口——他同时在过两种日子')
    }
    /**
     * 每一段的开头得落在他走那一步时世界跨过的那段年份里。
     *
     * 这一条防的是「`since` 随手取了个别的年份」：出生那年、
     * 或者干脆是 0。取错了功能上一点看不出来——
     * 列表照样有两段、照样封了口——**只有对着世界的年份才量得出来。**
     *
     * 量的是区间不是某一年：那一处效果里换日子跟推时间挨着，
     * 谁在前谁在后是内容的事，不该让这道门禁替它定死。
     */
    if (street.livings.length === street.steps.length) {
      for (const [index, span] of street.livings.entries()) {
        const step = street.steps[index]
        if (!step) continue
        if (span.since < step.from || span.since > step.to) {
          wrong.push(
            `${span.id} 该记在第 ${step.from}–${step.to} 年之间（${step.where} 跨过的那一段），` +
              `实际记的是第 ${span.since} 年`,
          )
        }
      }
    }
  }

  /**
   * 宫里那十五年**不在这个列表里**，而这是对的。
   *
   * 列表只记「我自己」这一级；在他有自己的活法之前，
   * 那个问题由链下面两级现答。抄一份 palace 进来就是造第二个真相。
   * 「他十五岁之前过的是宫里的日子」这件事由第一节量着——
   * 那一条人生里 `livings` 空着，而 `living.id` 是 palace。
   */
  if (street?.livings.some((span) => span.id === 'palace')) {
    wrong.push('`livings` 里出现了 palace——那一级是链自己答的，不该抄进来')
  }

  for (const one of walked.values()) {
    const spans = one.livings
      .map((span) => `${span.id}〔${span.since} → ${span.until ?? '至今'}〕`)
      .join('　')
    console.log(`  【${one.label}】${spans || '（一段也没有，那个问题由链下面两级现答）'}`)
  }
  return wrong
}

// ============================================================
// 三、正文能根据当前生活出现不同内容
// ============================================================

function textDiffers(): string[] {
  const wrong: string[] = []
  if (!WORK) return ['库里没有「帮家里干活」那个去处，这一节量不了']
  if (!ANOTHER_DAY) return ['库里没有 another-day-done 那句心念，这一节量不了']

  const palace = of('palace')
  const street = of('fall-street')
  const inside = of('fall-inside')
  const farm = of('farm')

  if (palace?.works) wrong.push('宫里那个也能「帮家里干活」——那个去处本该对他关着')
  if (street && !street.works) {
    wrong.push('开门出去的那个走不了「帮家里干活」——他手上明明有了活')
  }
  if (inside?.works) {
    wrong.push('把门关上的那个也能「帮家里干活」——他的日子并没有变')
  }
  if (street && inside && street.works === inside.works) {
    // 这一条是整节的分量所在：同一个人，同一个去处，分岔之后一开一关
    wrong.push('同一道分岔的两支，那个去处开关一样——正文没有因为日子不同而不同')
  }
  if (street && inside && street.chore === inside.chore) {
    wrong.push(`两支读出来的 {chore} 一样，都是「${street.chore}」`)
  }
  if (street && street.chore !== '一只箍松了的水桶') {
    wrong.push(`开门出去的那个 {chore} 该是那只水桶，实际读成「${street.chore}」`)
  }
  if (palace && palace.chore !== '手里的东西') {
    // 宫里没有这样一件活，落到兜底那句才是对的
    wrong.push(`宫里那个 {chore} 该落到兜底那句，实际读成「${palace.chore}」`)
  }

  // 对照：农户一直开着，而那不是任何一处 living 效果打开的
  if (farm && !farm.works) wrong.push('农户的孩子走不了「帮家里干活」')
  if (farm && street && farm.chore === street.chore) {
    wrong.push('农户和迁出京城的那个手上是同一件活')
  }

  for (const one of walked.values()) {
    console.log(`  【${one.label}】`)
    console.log(`      帮家里干活　${one.works ? '开着' : '关着'}　{chore} → ${one.chore}`)
    console.log(`      ${one.spark}`)
  }
  return wrong
}

// ============================================================
// 四、identity 与 living 可以同时存在而不互相覆盖
// ============================================================

/**
 * 两个维度各自说话，谁也不吞掉谁。
 *
 * 判据不是「两个字段都不为空」——那种东西写死两个常量也能过。
 * 真正说明它们是两个维度的是这一对交叉：
 *
 *     同一个身份，两种日子　庶人 → market / 庶人 → fallen
 *     同一种日子，两个身份　庶人 → fallen / 寓公之子 → fallen
 *
 * 只要有一边塌了——比如换日子的时候顺手把身份也改了，
 * 或者身份一改日子就跟着走——这两行里必有一行红。
 */
function twoAxes(): string[] {
  const wrong: string[] = []
  const street = of('fall-street')
  const inside = of('fall-inside')
  const demote = of('demote')

  if (street && street.identity !== '庶人') {
    wrong.push(`开门出去的那个该是庶人，实际是 ${street.identity}`)
  }
  if (inside && inside.identity !== '庶人') {
    wrong.push(`把门关上的那个该是庶人，实际是 ${inside.identity}`)
  }
  if (demote && demote.identity !== '寓公之子') {
    wrong.push(`削藩那个该是寓公之子，实际是 ${demote.identity}`)
  }

  if (street && inside) {
    if (street.identity !== inside.identity) {
      wrong.push(
        `同一道分岔的两支身份不一样了：${street.identity} / ${inside.identity}——` +
          '换日子把身份也带着改了',
      )
    }
    if (street.livingId === inside.livingId) {
      wrong.push('同一个身份底下只有一种日子——身份把日子吞掉了')
    }
  }

  if (inside && demote) {
    if (inside.livingId !== demote.livingId) {
      wrong.push(
        `削爵和削藩过的该是同一种日子，实际是 ${inside.livingId} / ${demote.livingId}——` +
          '日子跟着身份走了',
      )
    }
    if (inside.identity === demote.identity) {
      wrong.push('削爵和削藩的身份一样了——日子把身份吞掉了')
    }
  }

  /**
   * 还有第三个维度：**他过的日子，跟家里那格的营生。**
   *
   * 第五节那条尺子自检也在验这件事，可它拿的是削爵那一支——那一支家里
   * 解析成 `palace`，是因为那个效果只改了他自己那一格，`household` 没动。
   * 那**证得出两格分得开，证不出家里那格是对的**：削爵之后一家人搬出京城，
   * 家里还过着宫里的日子，这话本身就站不住。
   *
   * 他自己走出去做工的那一支能证到那一层，因为它有对照组：
   * 没走出去的那个农户孩子过 `farm`，走出去的这个家里也仍是 `farm`——
   * **两下一对，家里那格是真的一格没动，不是残留，也不是巧合。**
   */
  const shop = of('shopwork')
  const stayed = of('farm')
  if (shop) {
    if (shop.livingId === shop.householdLivingId) {
      wrong.push(
        `他去镇上做工，家里那格跟着变成了 ${shop.householdLivingId}——` +
          '出去做工没让家里改行，这两格该分得开',
      )
    }
    if (stayed && shop.householdLivingId !== stayed.livingId) {
      wrong.push(
        `没走出去的那个过 ${stayed.livingId}，走出去那个家里却解析成 ` +
          `${shop.householdLivingId}——同样一户农家，家里的营生不该因为孩子出门就变了`,
      )
    }
  }

  for (const one of walked.values()) {
    console.log(
      `  【${one.label}】身份 ${one.identity}　日子 ${one.livingId}　家里 ${one.householdLivingId}`,
    )
  }
  return wrong
}

// ============================================================
// 五、尺子自检
// ============================================================

/**
 * 全库一共有几处效果在换日子。
 *
 * 口径跟 `verify.ts` 第四道扫产出时一样：场景库的每一节（`refs.ts`
 * 那张登记表把 `onEnter` 和每个选择都算进来了），外加一天里的落点。
 * **分母漏一处，覆盖率就是虚高的。**
 */
function livingSites(): Map<string, string[]> {
  const found = new Map<string, string[]>()
  const note = (where: string, effects: readonly Effect[]) => {
    const ids = effects.filter((one) => one.type === 'living').map((one) => one.living)
    if (ids.length > 0) found.set(where, ids)
  }
  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      note(`${sceneId}#${nodeId}`, node.onEnter ?? [])
      for (const choice of node.choices ?? []) {
        note(`${sceneId}#${nodeId}:${choice.id}`, choice.effects ?? [])
      }
      // 登记表那一份是兜底：将来 `SceneNode` 多一格能带效果，
      // 上面两行看不见它，这一行看得见
      note(`${sceneId}#${nodeId} · 登记表`, effectsOf(node))
    }
  }
  for (const beat of BEATS) note(`一天 · ${beat.doing}:w${beat.weight}`, beat.effects ?? [])
  return found
}

function ruler(): string[] {
  const wrong: string[] = []
  const street = of('fall-street')

  // —— 坏实现一：日子只是家里那格的别名 ——
  if (street) {
    if (street.householdLivingId !== 'palace') {
      wrong.push(
        `迁出京城之后家里的营生解析成了 ${street.householdLivingId}——` +
          '那就说不清他的日子是自己变的还是跟着家里变的',
      )
    }
    if (street.householdLivingId === street.livingId) {
      wrong.push('他的日子跟家里那格一模一样，`character.living` 只是个别名')
    }
    console.log(
      `  ✓ 日子不是别名：他过 ${street.livingId}，家里的营生仍解析成 ${street.householdLivingId}`,
    )
  }

  // —— 坏实现二：直接覆盖，不留历史 ——
  if (street) {
    const overwritten = street.livings.slice(-1)
    const caught = ledgerMatches(overwritten, walkedThrough(street))
    if (caught.length > 0) {
      console.log(`  ✓ 覆盖式的历史被判据拒绝：${caught[0]}`)
    } else {
      wrong.push('把历史砍成只剩当前那一段，判据居然认了——第二条验收量不出东西')
    }
  }

  // —— 坏实现三：旧那段忘了封口 ——
  if (street && street.livings.length >= 2) {
    const unsealed = street.livings.map((span) => ({ ...span, until: null }))
    const caught = historyHolds(unsealed)
    if (caught.length > 0) {
      console.log(`  ✓ 忘了封口被判据拒绝：${caught[0]}`)
    } else {
      wrong.push('两段日子同时开着口，判据居然认了')
    }
  }

  // —— 坏实现四：条件仍旧读 household ——
  if (street) {
    const mine = livingById(street.livingId)
    const theirs = livingById(street.householdLivingId)
    const asMine = mine?.chore !== null
    const asTheirs = theirs?.chore !== null
    if (asMine === asTheirs) {
      wrong.push(
        '拿他自己的日子和家里的营生去问「手上有没有活」，答案一样——' +
          '这一世分辨不出条件读的是哪一格，第三条验收失效',
      )
    } else {
      console.log('  ✓ 条件读的是他自己那格：问他有活，问家里没活')
    }
  }

  // —— 覆盖率 ——
  const sites = livingSites()
  const walkedSites = new Set<string>()
  for (const one of walked.values()) for (const step of one.steps) walkedSites.add(step.where)
  const missed: string[] = []
  for (const where of sites.keys()) {
    // 登记表那一份是同一处效果的另一个名字，不单独算一处
    if (where.endsWith(' · 登记表')) continue
    if (!walkedSites.has(where)) missed.push(where)
  }
  const counted = [...sites.keys()].filter((where) => !where.endsWith(' · 登记表'))
  console.log(
    `  覆盖率：全库 ${counted.length} 处效果在换日子，这一支走到 ${counted.length - missed.length} 处`,
  )
  for (const where of missed) {
    wrong.push(`${where} 在换日子，可这一支一次也没走到那儿——那条路没人量过`)
  }

  return wrong
}

// ============================================================

const gates: readonly { name: string; run: () => string[] }[] = [
  { name: '一、当前生活能发生变化', run: canChange },
  { name: '二、变化后旧生活仍可回溯', run: historyKeeps },
  { name: '三、正文能根据当前生活出现不同内容', run: textDiffers },
  { name: '四、身份与日子是两个维度', run: twoAxes },
  { name: '五、尺子自检', run: ruler },
]

let bad = 0
for (const gate of gates) {
  console.log(`${gate.name}`)
  const wrong = gate.run()
  for (const one of wrong) console.log(`  ✗ ${one}`)
  if (wrong.length === 0) console.log('  ✓ 没有发现问题')
  bad += wrong.length
  console.log('')
}

if (bad > 0) {
  console.log(`共 ${bad} 处。`)
  process.exitCode = 1
} else {
  console.log('五道全过。一个人现在过什么日子会变，而他过过的日子一段也没丢。')
}
