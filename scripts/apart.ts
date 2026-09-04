/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一个人离开原来的生活以后，原来的人际关系怎么办。
 *
 * 跑法：`npx vite-node scripts/apart.ts`
 *
 * ## 这一道守的是一条界线
 *
 * 两件事必须分开，混在一起就会写出两种都很难看的实现：
 *
 *     关系是否存在　　　　　　　　← `people.relations` 上那条边
 *     关系是否还在日常生活范围内　← `engine/nearby.ts`
 *
 * 混掉的第一种：人搬走了就把边删掉。于是「离开家以后还是这个人的儿子」
 * 不成立——他成了一个没有过去的人。
 * 混掉的第二种：边还在就当他天天在场。于是削爵迁出京城之后，
 * 留在宫里那位仍然出现在「今天找谁说话」的名单上。
 *
 * 正确的形状只有一个，而且它一格新状态也不需要：
 *
 *     世界里的人一直存在　+　玩家当前生活地点改变　→　能遇见的人改变
 *
 * 所以这一道逐字照着这一轮的验收问五件事：
 *
 *     ① 原来的父亲关系没有被删除
 *     ② 原来的关系历史没有被改写
 *     ③ 生活变化后，父亲不会继续以「天天能见到」的方式出现
 *     ④ 新生活环境可以接触到新的人
 *     ⑤ 新接触产生的是新关系边，而不是覆盖旧关系
 *
 * ## ③ 的挑战对象不能是父亲
 *
 * 这是这支脚本最要紧的一处设计，写下来免得日后有人「顺手改回去」：
 *
 * `royal:fall#edict` 那一节里父亲是 `{ alive: false }`——**他死了**。
 * 死人当然不会天天出现，于是拿父亲去量第三条，判据会被死亡免费喂绿，
 * 而「搬家改变了接触范围」这件事一次也没有被验到。
 * 一条永远为真的判据看着最像在工作。
 *
 * 所以第三条真正问的是**留在宫里、活着、没跟着搬的那个手足**：
 * 他还活着（`alive` 前后都真），那条边也还在（第一条守着），
 * 变的只有一件事——他不在你天天照面的地方了。
 * 旁边站着两个对照：跟着搬来的母亲仍然在身边，
 * 削藩那条举家迁走的全家都还在身边。**搬家不是把所有人都推开。**
 *
 * ## 判据取实跑，不取静态比对
 *
 * 底下四条人生走的效果全是从库里原样读出来的（`resolve` 照
 * `scripts/living.ts` 的老规矩，只写门牌号不抄效果）。于是
 * `takes: ['mother']` 那一行被删掉、或者被改成 `'举家'`，
 * 这里会当场红，而不是让判据照着自己抄的那一份继续绿。
 *
 * 第六节是这支脚本的另一半：四种坏实现摆出来喂给同一把尺子，
 * 全被拒绝了，前五节的绿才作数。末尾报覆盖率——
 * 全库几处在搬家、几处在领新人进门，这一支走到了几处，
 * 又有几处明写着移交给了别的门禁（见 `HANDED_OVER`）。
 */
import { readFileSync } from 'node:fs'

import { createPinia, setActivePinia } from 'pinia'

import { BEATS, DOINGS } from '../src/content/days'
import { lifeScenes } from '../src/content/life'
import { livingOfKeeper } from '../src/content/living'
import { ORIGINS } from '../src/content/origins'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { fillString } from '../src/engine/interpolate'
import { isNearby } from '../src/engine/nearby'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Bond, Effect, Relation, Trade } from '../src/types/game'
import { effectsOf } from './refs'

/** 风调雨顺。这一道不查年景，把它按住免得饥荒插进来搅局 */
const CALM = { rain: 55, harvest: 58, grain: 112, order: 66, plague: 0 }

/** 削爵那一年他十五岁 */
const AGE_AT_START = 15

/** 手足那几层关系。③ 的挑战对象从这里面挑 */
const SIBLING_BONDS = ['兄', '姐', '弟', '妹'] as const satisfies readonly Bond[]

/** 「找{elder}说话」那个去处。它是 `near` 在内容层的第一个真实使用者 */
const ELDER_DOING = DOINGS.find((doing) => doing.id === 'elder')

// ============================================================
// 走一条人生
// ============================================================

/** 库里的一处效果。**不写效果本身，只写它在库里的门牌号** */
interface Step {
  scene: string
  node: string
  /** 不填就是这一节的 `onEnter`；填了就是这一节某个选择的 `effects` */
  choice?: string
}

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
  return { where: `${step.scene}#${step.node}:${step.choice}`, effects: choice.effects ?? [] }
}

interface Path {
  id: string
  label: string
  trade: Trade
  steps: readonly Step[]
}

/**
 * 四条人生。
 *
 * 第一条是主角：只有母妃跟着走，别人留在原地——**这是唯一能量出
 * 「接触范围变了」的那一条**。
 *
 * 后三条都是对照，各守一个反面：
 *
 * - **举家迁走**：搬家不等于所有人都被推开。
 * - **搬了家却没出门**：换了地方过日子**不会自动**给你派一个新人。
 *   这一条守的是那句「`living = market` → 自动生成掌柜」——
 *   它跟主角走的是同一节旨意、同样搬了家、同样换了日子，
 *   分别只在他把门关上了。于是「新人来自新地方」和
 *   「新人来自换了日子」这两种实现在这里分得开。
 * - **墙没塌**：不搬家的人，身边那几个一个也不该少。
 */
const PATHS: readonly Path[] = [
  {
    id: 'edict',
    label: '削爵迁出京城：只有母妃跟着走',
    trade: '皇室',
    steps: [
      { scene: 'royal:fall', node: 'edict' },
      { scene: 'royal:fall', node: 'edict', choice: 'street' },
      { scene: 'royal:fall', node: 'outside' },
    ],
  },
  {
    id: 'demote',
    label: '对照 · 削藩：全家一起迁出王府',
    trade: '王府',
    steps: [{ scene: 'royal:demote', node: 'open' }],
  },
  {
    id: 'shut',
    label: '对照 · 同样搬了家，可他把门关上了',
    trade: '皇室',
    steps: [
      { scene: 'royal:fall', node: 'edict' },
      { scene: 'royal:fall', node: 'edict', choice: 'inside' },
    ],
  },
  {
    id: 'stay',
    label: '对照 · 墙没塌：一直住在宫里',
    trade: '皇室',
    steps: [],
  },
]

/** 一个人在某一刻的样子 */
interface Folk {
  place: string
  alive: boolean
  nearby: boolean
  calls: string | null
}

/** 某一刻整个世界跟这一道有关的一切 */
interface Snap {
  where: string
  home: string
  year: number
  people: Record<string, Folk>
  relations: readonly Relation[]
  /**
   * 拿条件层去问的那几句话。
   *
   * **这是「引擎真的读了 `near`」的落点**：判据不看 `isNearby` 的返回值，
   * 看剧本写 `{ bond: { near: true } }` 时 `meetsAll` 答的是什么。
   * 中间那一层要是把 `near` 静默忽略了，这里会露出来。
   */
  asks: Record<string, boolean>
  /** `{elder}` 这个记号此刻落在谁身上 */
  elder: string
}

interface Walked {
  id: string
  label: string
  before: Snap
  after: Snap
  where: readonly string[]
  /** 这一世挑中的那层手足关系。③ 靠它，没有就没得量 */
  siblingBond: Bond | null
  /** 那几个留在原地的手足是谁 */
  siblings: readonly string[]
  /** 探针：把一个跟着搬来的活人改成殁，`isNearby` 还认不认他在身边 */
  deadStillNearby: boolean | null
}

/** 这一世还活着的手足，按 `SIBLING_BONDS` 的次序挑第一层有人的 */
function pickSiblingBond(): Bond | null {
  const people = usePeopleStore()
  for (const bond of SIBLING_BONDS) {
    if (people.kinOf(bond).some((id) => people.isAlive(id))) return bond
  }
  return null
}

function snap(where: string, siblingBond: Bond | null): Snap {
  const people = usePeopleStore()
  const household = useHouseholdStore()
  const world = useWorldStore()

  const folks: Record<string, Folk> = {}
  for (const id of Object.keys(people.roster)) {
    const person = people.personOf(id)
    if (!person) continue
    folks[id] = {
      place: person.place,
      alive: person.fate === '在',
      nearby: isNearby(id),
      calls: people.known[id]?.calls ?? null,
    }
  }

  const asks: Record<string, boolean> = {}
  if (siblingBond !== null) {
    asks['有这层手足'] = meetsAll([{ bond: { kind: siblingBond } }])
    asks['手足里还有活人'] = meetsAll([{ bond: { kind: siblingBond, alive: true } }])
    asks['手足里有人在身边'] = meetsAll([{ bond: { kind: siblingBond, near: true } }])
  }
  asks['找人说话这个去处开着'] = ELDER_DOING !== undefined && meetsAll(ELDER_DOING.requires)

  return {
    where,
    home: household.home,
    year: world.time.year,
    people: folks,
    relations: people.relations.map((one) => ({ ...one })),
    asks,
    elder: fillString('{elder}'),
  }
}

/**
 * 掷到一个能量出东西的起点为止。
 *
 * 三个条件缺一不可，而且缺哪一个都会让某一条判据变成永远为真：
 *
 * - **没被人捡去养**：收养那一级会盖掉家里的营生，起点就不确定了
 *   （同 `scripts/living.ts`，那一级归 `upbringing.ts` 管）。
 * - **人口册上有生父**：第一条要看的就是他那条边，人不在册无从谈起。
 * - **有一个活着的手足**：第三条真正的挑战对象。没有他，
 *   第三条会被父亲的死免费喂绿。
 */
function born(trade: Trade): boolean {
  for (let tries = 0; tries < 20000; tries += 1) {
    setActivePinia(createPinia())
    const household = useHouseholdStore()
    household.trade = trade
    /**
     * 出身不止是一个 trade：**皇室的家在皇城，不在州府底下那个村子里。**
     * 只改 trade 会造出一个「住在杏花坞的皇子」——那种状态系统自己
     * 掷不出来，拿它当起点，量到的就不是真实会发生的事。
     *
     * `province` / `prefecture` 保持默认掷出来的那一对：对皇室来说
     * 那是他日后被贬去的府，出生时他自己也还不知道有这么个地方。
     * 这几格必须赶在 `usePeopleStore()` 之前设好——家里人是那一刻
     * 才记进册子的，落的地点就是那一刻的家。
     */
    const origin = ORIGINS.find((one) => one.trade === trade)
    if (origin) {
      household.locale = origin.locales[0] ?? household.locale
      household.capital = origin.capital ?? null
    }
    const world = useWorldStore()
    useCharacterStore()
    const people = usePeopleStore()
    world.bornYear = world.time.year - AGE_AT_START
    world.regions = { [household.prefecture]: { state: { ...CALM }, last: {} } }

    const adopted = people.guardians
      .filter((id) => people.isAlive(id))
      .some((id) => livingOfKeeper(people.personOf(id)?.trade ?? '') !== undefined)
    if (adopted) continue
    if (people.kinOf('生父').length === 0) continue
    if (!people.isAlive('mother')) continue
    if (pickSiblingBond() === null) continue
    return true
  }
  return false
}

function walk(path: Path): Walked | string {
  if (!born(path.trade)) return '掷了两万回也没掷出一个能量东西的起点，判据本身失效了'
  const people = usePeopleStore()

  const siblingBond = pickSiblingBond()
  const siblings = siblingBond === null ? [] : people.kinOf(siblingBond).filter(people.isAlive)
  const before = snap('出生之后，什么也还没发生', siblingBond)

  const where: string[] = []
  for (const step of path.steps) {
    const site = resolve(step)
    if (typeof site === 'string') return site
    applyEffects(site.effects)
    where.push(site.where)
  }
  const after = snap(where[where.length - 1] ?? '一步也没走', siblingBond)

  /**
   * 探针：一个此刻确实在身边的活人，把他改成殁，还算不算在身边。
   *
   * 这一格是给尺子自检用的。**「在身边」问的是能不能见着**，
   * 人不在了就见不着了——`isNearby` 少查一句 `fate`，
   * 别的判据一条也不会红（搬家那一支靠的是门牌号对不上），
   * 只有这根探针会。快照已经取完，这里改坏 store 无所谓，这一世跑完就丢。
   */
  let deadStillNearby: boolean | null = null
  const livingNearby = Object.keys(after.people).find(
    (id) => after.people[id]?.alive === true && after.people[id]?.nearby === true,
  )
  if (livingNearby !== undefined) {
    people.amend(livingNearby, { fate: '殁' })
    deadStillNearby = isNearby(livingNearby)
  }

  return {
    id: path.id,
    label: path.label,
    before,
    after,
    where,
    siblingBond,
    siblings,
    deadStillNearby,
  }
}

const walked = new Map<string, Walked>()
const broken: string[] = []
for (const path of PATHS) {
  const one = walk(path)
  if (typeof one === 'string') broken.push(`${path.label}：${one}`)
  else walked.set(path.id, one)
}

function of(id: string): Walked | undefined {
  return walked.get(id)
}

/** 一条边的身份证。id 之外的每一格都算进来，改了哪一格都认得出 */
function fingerprint(one: Relation): string {
  return `${one.from} →${one.bond}→ ${one.to} 自${one.since}年 至${one.until ?? '今'}`
}

function relationById(snapshot: Snap, id: string): Relation | undefined {
  return snapshot.relations.find((one) => one.id === id)
}

// ============================================================
// 一、原来的父亲关系没有被删除
// ============================================================

/**
 * 父亲那条边，搬完家还在不在。
 *
 * 削爵那一节里父亲**死了**（`{ alive: false }`），而这恰恰是这一条
 * 最强的形式：人都不在了，「他是你父亲」这件事仍然不许从图上消失。
 * 关系是发生过的事实，不是一份在世人员名单。
 *
 * 顺带把出生时牵下的每一条边都数一遍——只盯父亲的话，
 * 「搬家时把没跟来的人的边一起断掉」这种实现只会漏掉父亲那一条。
 */
function fatherRemains(): string[] {
  const wrong: string[] = [...broken]

  for (const one of walked.values()) {
    const fathers = one.before.relations.filter((edge) => edge.bond === '生父')
    if (fathers.length === 0) {
      wrong.push(`【${one.label}】出生时就没有生父那条边，第一条无从量起`)
      continue
    }
    for (const edge of fathers) {
      const now = relationById(one.after, edge.id)
      if (!now) {
        wrong.push(`【${one.label}】父亲那条边被删掉了：${fingerprint(edge)}`)
        continue
      }
      if (now.until !== null) {
        wrong.push(
          `【${one.label}】父亲那条边被封了口（至 ${now.until} 年）——` +
            '人不在了或者搬走了，都不该让「他是你父亲」这件事到此为止',
        )
      }
      const alive = one.after.people[edge.to]?.alive === true
      console.log(`  【${one.label}】${fingerprint(now)}　（他${alive ? '还活着' : '已经不在了'}）`)
    }

    const lost = one.before.relations.filter(
      (edge) => relationById(one.after, edge.id) === undefined,
    )
    for (const edge of lost) {
      wrong.push(`【${one.label}】出生时牵下的一条边不见了：${fingerprint(edge)}`)
    }
  }
  return wrong
}

// ============================================================
// 二、原来的关系历史没有被改写
// ============================================================

/**
 * 旧边一格也不许被动过。
 *
 * 「没被删除」和「没被改写」是两件事：把 `since` 挪一年、
 * 把 `bond` 从「生父」改成「亲戚」，边还在，可他的来历变了。
 * 所以这里逐格比对指纹，不只数条数。
 */
function historyIntact(): string[] {
  const wrong: string[] = []

  for (const one of walked.values()) {
    let touched = 0
    for (const edge of one.before.relations) {
      const now = relationById(one.after, edge.id)
      if (!now) continue // 第一条已经报过了，这里不重复计
      if (fingerprint(now) !== fingerprint(edge)) {
        wrong.push(`【${one.label}】一条旧边被改写了：${fingerprint(edge)} → ${fingerprint(now)}`)
        touched += 1
      }
    }
    if (touched === 0) {
      console.log(`  【${one.label}】出生时那 ${one.before.relations.length} 条边，一格没动`)
    }
  }
  return wrong
}

// ============================================================
// 三、生活变化后，不会继续以「天天能见到」的方式出现
// ============================================================

/**
 * 同一个人，还活着，边也还在，只是不在你身边了。
 *
 * 这一条的挑战对象是**留在宫里那个活着的手足**，不是父亲——
 * 理由写在文件头上：父亲死了，拿他来量，判据会被死亡免费喂绿。
 *
 * 三句话必须同时成立，少一句这条判据就分辨不出东西：
 *
 *     搬家前　手足在身边　真
 *     搬家后　手足在身边　假　　← 变的只有这一句
 *     搬家前后　手足里有活人　都真
 *
 * 而且问的是**条件层**（`meetsAll`），不是 `isNearby` 本身：
 * 中间那一层把 `near` 静默忽略掉的话，第二句会跟第一句一样是真。
 *
 * 两个对照守住反面：跟着搬来的母妃仍然在身边，
 * 举家迁走的那一条全家都还在身边。**搬家不是把所有人都推开。**
 */
function noLongerDaily(): string[] {
  const wrong: string[] = []
  const edict = of('edict')
  const demote = of('demote')
  const stay = of('stay')

  if (edict) {
    if (edict.siblingBond === null || edict.siblings.length === 0) {
      wrong.push('这一世没有活着的手足，第三条只剩下一个死人可量——那量不出东西')
    } else {
      const bond = edict.siblingBond
      if (edict.before.asks['手足里有人在身边'] !== true) {
        wrong.push(`搬家之前${bond}就已经不在身边了，这一条没有起点`)
      }
      if (edict.after.asks['手足里有人在身边'] !== false) {
        wrong.push(
          `迁出京城之后，条件层仍然答「${bond}还在身边」——` +
            '要么人被一起搬走了，要么 `near` 被静默忽略了',
        )
      }
      if (
        edict.before.asks['手足里还有活人'] !== true ||
        edict.after.asks['手足里还有活人'] !== true
      ) {
        wrong.push(`${bond}那一层前后有人死了，这一条会被死亡喂绿，量不出「接触范围变了」`)
      }
      if (edict.after.asks['有这层手足'] !== true) {
        wrong.push(`迁出京城之后连「有没有${bond}」都答不了——那条边被动过了`)
      }
      for (const id of edict.siblings) {
        const person = edict.after.people[id]
        if (!person) {
          wrong.push(`留在宫里的${bond}（${id}）从人口册上消失了`)
          continue
        }
        if (!person.alive) {
          wrong.push(`留在宫里的${bond}（${id}）死了——这一条要的是活人`)
        }
        if (person.nearby) {
          wrong.push(`留在宫里的${bond}（${id}）跟着搬到了新家，那不是「留在宫里」`)
        }
        console.log(
          `  留在宫里的${bond} · ${person.calls ?? id}：还活着 ${person.alive ? '是' : '否'}，` +
            `在身边 ${person.nearby ? '是' : '否'}（他在 ${person.place}，你在 ${edict.after.home}）`,
        )
      }
      // 对照：跟着搬的那个人仍然在身边
      const mother = edict.after.people['mother']
      if (!mother) {
        wrong.push('母妃从人口册上消失了，第三条的对照没了')
      } else if (!mother.nearby) {
        wrong.push(
          `旨意里写着母妃跟你一起迁出，可她没在新家（她在 ${mother.place}，你在 ${edict.after.home}）——` +
            '那就成了「搬家把所有人都推开」，这一条量的不再是接触范围',
        )
      } else {
        console.log(`  跟着走的母妃 · ${mother.calls ?? 'mother'}：仍然在身边（${mother.place}）`)
      }
    }
  }

  if (demote) {
    const strayed = Object.entries(demote.after.people).filter(
      ([id, folk]) => folk.alive && !folk.nearby && demote.before.people[id]?.nearby === true,
    )
    for (const [id, folk] of strayed) {
      wrong.push(
        `举家迁出王府，${folk.calls ?? id}却被落下了（他在 ${folk.place}，家在 ${demote.after.home}）——` +
          '`takes: 举家` 没有把家里人都带上',
      )
    }
    if (strayed.length === 0) {
      console.log(`  【${demote.label}】家里人一个没落下，搬完仍旧天天照面`)
    }
  }

  if (stay) {
    const lost = Object.entries(stay.after.people).filter(
      ([id, folk]) => stay.before.people[id]?.nearby === true && !folk.nearby,
    )
    for (const [id, folk] of lost) {
      wrong.push(`【${stay.label}】什么也没发生，${folk.calls ?? id}却不在身边了`)
    }
    if (lost.length === 0) {
      console.log(`  【${stay.label}】身边那几个一个没少`)
    }
  }

  return wrong
}

// ============================================================
// 四、新生活环境可以接触到新的人
// ============================================================

/**
 * 走到街上，遇见了一个原来那个世界里没有的人。
 *
 * 判据的两头都要：他此刻在册且在身边，**而且他出生那时候不在册**。
 * 少了后半句，「新的人」这件事随便指一个爹娘就能过。
 */
function newFaces(): string[] {
  const wrong: string[] = []
  const edict = of('edict')

  if (edict) {
    const fresh = Object.keys(edict.after.people).filter(
      (id) => edict.before.people[id] === undefined,
    )
    if (fresh.length === 0) {
      wrong.push('迁出京城、开门走到街上，一个新的人也没遇见——换了地方过日子这件事没有落点')
    }
    for (const id of fresh) {
      const folk = edict.after.people[id]!
      if (!folk.nearby) {
        wrong.push(
          `新遇见的 ${folk.calls ?? id} 不在你的生活范围里（他在 ${folk.place}，你在 ${edict.after.home}）——` +
            '那他不算「新生活里接触到的人」',
        )
      }
      console.log(
        `  新遇见 · ${folk.calls ?? id}：在 ${folk.place}，在身边 ${folk.nearby ? '是' : '否'}`,
      )
    }
  }

  /**
   * 两个对照，守的不是同一件事：
   *
   * - **把门关上的那个**：他搬了家，日子也换了（`fallen`），
   *   只是没走到街上。要是新人是「换了地方就自动派一个」来的，
   *   他这里也会多出一个卖炊饼的——那正是这一轮要挡住的那种实现。
   *   所以先确认他**确实搬了家**，这个对照才构成挑战。
   * - **墙没塌的那个**：他哪儿也没去。新面孔来自新地方，不来自时间。
   */
  for (const one of [of('shut'), of('stay')]) {
    if (!one) continue
    const fresh = Object.keys(one.after.people).filter((id) => one.before.people[id] === undefined)
    for (const id of fresh) {
      wrong.push(
        `【${one.label}】没有走出去见人，却凭空多出一个 ${one.after.people[id]?.calls ?? id}——` +
          '新的人该由「你走到了那儿」带来，不是由「你换了一种日子」带来',
      )
    }
    if (fresh.length === 0) console.log(`  【${one.label}】没有新的人`)
  }

  const shut = of('shut')
  if (shut && shut.after.home === shut.before.home) {
    wrong.push(
      `【${shut.label}】他压根没搬家（一直在 ${shut.after.home}），` +
        '这个对照证明不了「搬家不会自动派新人」',
    )
  }

  return wrong
}

// ============================================================
// 五、新接触产生的是新关系边，而不是覆盖旧关系
// ============================================================

/**
 * 添，不是换。
 *
 * 三件事一起看：新的人身上确实牵了一条边；旧的边一条不少；
 * 边的总数正好是「旧的 + 新的」。
 * 第三件是必须的——只查前两件的话，「一边添一边把某条旧边改成指向新人」
 * 这种实现能同时骗过它们。
 */
function addedNotReplaced(): string[] {
  const wrong: string[] = []
  const edict = of('edict')
  if (!edict) return wrong

  const fresh = Object.keys(edict.after.people).filter(
    (id) => edict.before.people[id] === undefined,
  )
  const added = edict.after.relations.filter(
    (edge) => relationById(edict.before, edge.id) === undefined,
  )

  for (const id of fresh) {
    const mine = added.filter((edge) => edge.to === id && edge.from === 'me')
    if (mine.length === 0) {
      wrong.push(
        `新遇见的 ${edict.after.people[id]?.calls ?? id} 在人际面板上有名字，关系图上却没有边——` +
          '认得一个人和跟他有一层关系是两回事，但内容明写了 `bond` 就该有边',
      )
      continue
    }
    for (const edge of mine) console.log(`  新添的边 · ${fingerprint(edge)}`)
  }

  const kept = edict.before.relations.filter(
    (edge) => relationById(edict.after, edge.id) !== undefined,
  )
  if (kept.length !== edict.before.relations.length) {
    wrong.push(
      `出生时有 ${edict.before.relations.length} 条边，走完这一程只剩 ${kept.length} 条——` +
        '新关系是拿旧关系换来的',
    )
  }
  if (edict.after.relations.length !== edict.before.relations.length + added.length) {
    wrong.push(
      `边的总数对不上：旧 ${edict.before.relations.length} + 新 ${added.length} ` +
        `≠ 现在的 ${edict.after.relations.length}`,
    )
  } else {
    console.log(
      `  关系图：旧 ${edict.before.relations.length} 条一条没动，新添 ${added.length} 条，` +
        `现在 ${edict.after.relations.length} 条`,
    )
  }

  return wrong
}

// ============================================================
// 六、尺子自检
// ============================================================

/**
 * 全库一共几处在搬家、几处在领新人进门。
 *
 * 口径跟 `scripts/living.ts` 那一支一样：场景库的每一节
 * （`onEnter` 和每个选择都算），外加一天里的落点，
 * 再加登记表那一份兜底。**分母漏一处，覆盖率就是虚高的。**
 */
function movingSites(): Map<string, string[]> {
  const found = new Map<string, string[]>()
  const note = (where: string, effects: readonly Effect[]) => {
    const what: string[] = []
    for (const one of effects) {
      if (one.type === 'home') {
        const takes =
          one.takes === undefined
            ? '没人跟着'
            : one.takes === '举家'
              ? '举家'
              : one.takes.join('、')
        what.push(`搬家（${takes}）`)
      }
      if (one.type === 'meet' && one.who !== undefined) what.push(`领新人进门（${one.id}）`)
    }
    if (what.length > 0) found.set(where, what)
  }
  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      note(`${sceneId}#${nodeId}`, node.onEnter ?? [])
      for (const choice of node.choices ?? []) {
        note(`${sceneId}#${nodeId}:${choice.id}`, choice.effects ?? [])
      }
      note(`${sceneId}#${nodeId} · 登记表`, effectsOf(node))
    }
  }
  for (const beat of BEATS) note(`一天 · ${beat.doing}:w${beat.weight}`, beat.effects ?? [])
  return found
}

/**
 * 这几处不在这一支里走，另有专支守着。
 *
 * **移交不是豁免。** 在一张覆盖率表上，「没人量过」和「另有人量过」
 * 长得一模一样，而它们完全是两回事——所以要么写在这里，
 * 要么就在这一支里再走一遍。写在心里的那种不算。
 *
 * `reunion` 那一章问的是**分开之后关系会不会自己烂掉**，
 * 这一支根本不问那件事；那一支把那一章每一处 `home` 都走了一遍，
 * 而且量得比这里细（好感动没动、称呼改没改、那条边牵了多少年）。
 * 同一处路让两支各走一遍是浪费，可这笔账得记在明处。
 *
 * 这张表有牙，`handoverHolds` 核两件事：门牌号在库里真的还在
 * （卷改了名、节点删了，当场红），接手那一支的源码里真的提到这一卷
 * （它哪天不走了，这里也红）。它不会腐烂成一袋死字符串。
 */
const HANDED_OVER: Readonly<Record<string, string>> = {
  'reunion:apprentice#open:go': 'kept.ts',
  'reunion:homecoming#open': 'kept.ts',
  'reunion:homecoming#open:back-to-town': 'kept.ts',
  'reunion:emptied#open': 'kept.ts',
  'reunion:emptied#open:back-to-town': 'kept.ts',
}

function handoverHolds(sites: Map<string, string[]>): string[] {
  const wrong: string[] = []
  for (const [where, who] of Object.entries(HANDED_OVER)) {
    if (!sites.has(where)) {
      wrong.push(`移交表上写着 ${where}，库里却找不到了——卷改了名，还是那个节点删了？`)
      continue
    }
    let source = ''
    try {
      source = readFileSync(new URL(who, import.meta.url), 'utf8')
    } catch {
      wrong.push(`${where} 移交给了 scripts/${who}，可那支脚本不在了——这一处现在没人量`)
      continue
    }
    const scene = where.split('#')[0] ?? ''
    if (!source.includes(scene)) {
      wrong.push(`scripts/${who} 里一个字也没提 ${scene}——移交表说它在守，它没有`)
    }
  }
  return wrong
}

function ruler(): string[] {
  const wrong: string[] = []
  const edict = of('edict')

  // —— 坏实现一：搬家把留下的人也一并挪走 ——
  if (edict && edict.siblings.length > 0) {
    const dragged: Record<string, Folk> = {}
    for (const [id, folk] of Object.entries(edict.after.people)) {
      dragged[id] = { ...folk, place: edict.after.home, nearby: folk.alive }
    }
    const caught = edict.siblings.filter((id) => dragged[id]?.nearby === true)
    if (caught.length > 0) {
      console.log('  ✓ 「搬家把所有人都带走」会被第三条当场认出来：留在宫里的人成了在身边')
    } else {
      wrong.push('把留下的人也挪到新家，第三条居然分辨不出来——那一条量的不是接触范围')
    }
  }

  // —— 坏实现二：不跟着搬的人就把边断掉 ——
  if (edict) {
    const severed: Snap = {
      ...edict.after,
      relations: edict.after.relations.map((edge) =>
        edict.after.people[edge.to]?.nearby === false ? { ...edge, until: edict.after.year } : edge,
      ),
    }
    const stillOpen = severed.relations.filter(
      (edge) => edge.bond === '生父' && edge.until === null,
    )
    if (stillOpen.length === 0) {
      console.log('  ✓ 「人走了就断边」会被第一条当场认出来：父亲那条边被封了口')
    } else {
      wrong.push('把不在身边的人的边全部封口，父亲那条却还开着——第一条的构造反例没构造成')
    }
  }

  // —— 坏实现三：`isNearby` 忘了查死活 ——
  for (const one of walked.values()) {
    if (one.deadStillNearby === null) {
      wrong.push(`【${one.label}】走完全程身边一个活人也没有，「死了还算在身边」这条没法验`)
      continue
    }
    if (one.deadStillNearby) {
      wrong.push(
        `【${one.label}】人死了，isNearby 仍旧说他在身边——` +
          '「在身边」问的是能不能见着，见不着的人不算',
      )
    }
  }
  if (walked.size > 0 && [...walked.values()].every((one) => one.deadStillNearby === false)) {
    console.log(`  ✓ 死了的人不算在身边：${walked.size} 条人生上各验了一次`)
  }

  // —— 坏实现四：新人是拿旧人换来的 ——
  if (edict) {
    const fresh = Object.keys(edict.after.people).filter(
      (id) => edict.before.people[id] === undefined,
    )
    const replaced: Snap = {
      ...edict.after,
      relations: edict.after.relations.filter(
        (edge) => fresh.includes(edge.to) || edge.bond === '生母',
      ),
    }
    const kept = edict.before.relations.filter((edge) =>
      replaced.relations.some((one) => one.id === edge.id),
    )
    if (kept.length < edict.before.relations.length) {
      console.log('  ✓ 「新关系换掉旧关系」会被第五条当场认出来：旧边少了')
    } else {
      wrong.push('把旧边砍掉大半，第五条居然认了——那一条量不出「添还是换」')
    }
  }

  // —— 内容层那个去处真的跟着变了吗 ——
  if (edict) {
    const before = edict.before.asks['找人说话这个去处开着']
    const after = edict.after.asks['找人说话这个去处开着']
    console.log(
      `  「找{elder}说话」：迁出前 ${before ? '开' : '关'}（${edict.before.elder}）　` +
        `迁出后 ${after ? '开' : '关'}（${edict.after.elder}）`,
    )
  }

  // —— 覆盖率 ——
  const sites = movingSites()
  const walkedSites = new Set<string>()
  for (const one of walked.values()) for (const where of one.where) walkedSites.add(where)
  const counted = [...sites.keys()].filter((where) => !where.endsWith(' · 登记表'))
  const handed = counted.filter((where) => HANDED_OVER[where] !== undefined)
  const missed = counted.filter(
    (where) => !walkedSites.has(where) && HANDED_OVER[where] === undefined,
  )
  console.log(
    `  覆盖率：全库 ${counted.length} 处在搬家或领新人进门，` +
      `这一支走到 ${counted.length - missed.length - handed.length} 处，` +
      `另有 ${handed.length} 处移交给别的门禁`,
  )
  for (const where of counted) {
    const to = HANDED_OVER[where]
    const mark = walkedSites.has(where) ? '走过' : to !== undefined ? `移交 ${to}` : '没走'
    console.log(`    ${mark} · ${where}　${sites.get(where)?.join('，')}`)
  }
  for (const where of missed) {
    wrong.push(`${where} 会改变谁在你身边，可这一支一次也没走到那儿——那条路没人量过`)
  }
  wrong.push(...handoverHolds(sites))

  return wrong
}

// ============================================================

const gates: readonly { name: string; run: () => string[] }[] = [
  { name: '一、原来的父亲关系没有被删除', run: fatherRemains },
  { name: '二、原来的关系历史没有被改写', run: historyIntact },
  { name: '三、生活变化后，不再天天能见到', run: noLongerDaily },
  { name: '四、新生活环境可以接触到新的人', run: newFaces },
  { name: '五、新接触产生的是新关系边', run: addedNotReplaced },
  { name: '六、尺子自检', run: ruler },
]

let bad = 0
for (const gate of gates) {
  console.log(`${gate.name}`)
  const found = gate.run()
  for (const one of found) console.log(`  ✗ ${one}`)
  if (found.length === 0) console.log('  ✓ 没有发现问题')
  bad += found.length
  console.log('')
}

if (bad > 0) {
  console.log(`共 ${bad} 处。`)
  process.exitCode = 1
} else {
  console.log('六道全过。人离开了原来的生活，还是原来那些人的儿子、兄弟——只是不再天天见着。')
}
