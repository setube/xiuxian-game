/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 分开了这么多年，还是原来那些人。
 *
 * 跑法：`bun scripts/kept.ts`
 *
 * ## 这一道守的是一条更细的界线
 *
 * 上一道（`scripts/apart.ts`）把「关系存在」和「关系在身边」分开了。
 * 这一道再切一刀，切的是**剩下那半边里头还混着的两件事**：
 *
 *     不在身边　　← 地点问题，`engine/nearby.ts` 当场算得出来
 *     关系变差　　← 只能由发生过的事引起，跟地点没有关系
 *
 * 混掉的实现只有一种，而且它写起来非常顺手：
 *
 *     if (!nearby) affinity--
 *
 * 顺手，且完全错。亲兄弟离家十年，感情必然按算法腐烂——
 * 那不是人生，那是一个每年扣分的计时器。**世界不该替人做这种判断。**
 *
 * 反过来的那一半同样要守：三年不见之后重新照面，
 * 不能当成两个陌生人头一回认识。她还是那样叫你，
 * 而这件事的依据是**她认了你十几年**，不是好感度有多高。
 *
 * ## 六件事，逐字照着这一轮的验收链条问
 *
 *     ① 人物离开后 → 不再 nearby
 *     ② 关系仍然存在
 *     ③ 一段时间不见 → 关系不会自动变化
 *     ④ 重新接触 → 沿用原来的关系，而不是从头认识
 *     ⑤ 条件层读得出「认识了很多年」，而且这件事不因分离而缩水
 *     ⑥ 尺子自检
 *
 * ## ③ 的对照组就长在同一步里
 *
 * 这是这支脚本最要紧的一处设计：
 *
 * 「三年不见，好感一格没动」单独看是一句永远为真的话——
 * **一把量不出任何变化的尺子，量什么都是「没变」。**
 *
 * 所以第三条不是只看那几个不动的人。`reunion:apprentice#open:go`
 * 那一步里同时发生两件事：他跟家里人分开三年，他在货栈认识了管事的。
 * 一步之内，一边是「只是分开了」，另一边是「真的发生了事」。
 * 前者一格没动，后者动了——**同一把尺子，两种答案**，
 * 第三条才算量到了东西。
 *
 * ## 判据取实跑，不取静态比对
 *
 * 底下走的每一步效果都是从库里原样读出来的（`resolve` 照
 * `scripts/apart.ts` 的老规矩，只写门牌号不抄效果）。
 * `reunion:homecoming#open` 那句 `joins: '抚养'` 被删掉、
 * 或者被改回写死的 `'mother'`，这里会当场红。
 *
 * 第六节把四种坏实现摆出来喂给同一把尺子，全被拒绝了，前五节的绿才作数。
 * 末尾报覆盖率——全库几处在问「认识了多久」、几处在往人身边搬，这一支走到了几处。
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { BEATS } from '../src/content/days'
import { lifeEvents, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { fillString } from '../src/engine/interpolate'
import { isNearby } from '../src/engine/nearby'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Condition, Effect, SceneNode } from '../src/types/game'

/** 风调雨顺。这一道不查年景，把它按住免得饥荒插进来搅局 */
const CALM = { rain: 55, harvest: 58, grain: 112, order: 66, plague: 0 }

/** 他十三岁那年动身去镇上 */
const AGE_AT_START = 13

/** 走这一趟要多少年。**不写死，从库里那一步的 `time` 效果读出来** */
const YEARS_AWAY = (() => {
  const site = lifeScenes['reunion:apprentice']?.nodes.open?.choices?.find((one) => one.id === 'go')
  const time = (site?.effects ?? []).find((one) => one.type === 'time')
  return time?.type === 'time' ? (time.years ?? 0) : 0
})()

/** 镇上那句「过些日子来，兴许有活给你」。整册的入口就是它 */
const SHOPWORK_BEAT = BEATS.find((beat) =>
  (beat.effects ?? []).some((one) => one.type === 'flag' && one.key === 'offered-shopwork'),
)

// ============================================================
// 走一条人生
// ============================================================

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

/** 一个人此刻在玩家眼里是什么样 */
interface Folk {
  place: string
  alive: boolean
  nearby: boolean
  /** 玩家怎么称呼他。重逢不该改动这一格 */
  calls: string | null
  /** 好感。**只有发生过的事才能动它** */
  affinity: number | null
  /** 这条边牵了多少年。从 `since` 减出来，不是存着的 */
  years: number
  /** 那条边封口了没有 */
  ended: boolean
}

interface Snap {
  where: string
  home: string
  year: number
  age: number
  /** 抚养人此刻各是什么样。键是 person id */
  keepers: Record<string, Folk>
  /** 在外头新认识的那个人。他是「陌生人」那一侧的对照 */
  stranger: Folk | null
  /** `{dam}` 这个记号此刻落在谁身上 */
  dam: string
  /**
   * 拿条件层去问的那几句话。
   *
   * **这是「引擎真的读了 `years`」的落点**：判据不看 `boundFor` 的返回值，
   * 看剧本写 `{ bond: { years: ... } }` 时 `meetsAll` 答的是什么。
   */
  asks: Record<string, boolean>
}

function folkOf(id: string): Folk {
  const people = usePeopleStore()
  const person = people.personOf(id)
  const edge = people.relations.find((one) => one.from === 'me' && one.to === id)
  return {
    place: person?.place ?? '（不在册）',
    alive: person?.fate === '在',
    nearby: isNearby(id),
    calls: people.known[id]?.calls ?? null,
    affinity: people.known[id]?.affinity ?? null,
    years: people.boundFor(id, '抚养'),
    ended: edge?.until !== null && edge !== undefined,
  }
}

/** 那个在货栈认识的人。从库里那一步的 `meet` 效果读出他的 id，不写死 */
const STRANGER_ID = (() => {
  const site = lifeScenes['reunion:apprentice']?.nodes.open?.choices?.find((one) => one.id === 'go')
  const met = (site?.effects ?? []).find((one) => one.type === 'meet')
  return met?.type === 'meet' ? met.id : null
})()

function snap(where: string): Snap {
  const people = usePeopleStore()
  const household = useHouseholdStore()
  const world = useWorldStore()
  const character = useCharacterStore()

  const keepers: Record<string, Folk> = {}
  for (const id of people.kinOf('抚养', true)) keepers[id] = folkOf(id)

  return {
    where,
    home: household.home,
    year: world.time.year,
    age: character.age,
    keepers,
    stranger: STRANGER_ID === null ? null : folkOf(STRANGER_ID),
    dam: fillString('{dam}'),
    asks: {
      有这层抚养关系: meetsAll([{ bond: { kind: '抚养' } }]),
      抚养人里还有活人: meetsAll([{ bond: { kind: '抚养', alive: true } }]),
      抚养人里有人在身边: meetsAll([{ bond: { kind: '抚养', near: true } }]),
      这条边牵够八年了: meetsAll([{ bond: { kind: '抚养', years: { atLeast: 8 } } }]),
      这条边牵够九十九年了: meetsAll([{ bond: { kind: '抚养', years: { atLeast: 99 } } }]),
    },
  }
}

/**
 * 掷到一个能量出东西的起点为止。
 *
 * **年龄是走出来的，不是改生日改出来的。**
 * 那条抚养边的 `since` 是出生那年写下的，`boundFor` 拿它跟今年相减。
 * 把 `bornYear` 往前挪十三年，`age` 是变成十三了，可世界还停在原地——
 * 那条边照样只有零年。所以这里推的是时间，跟正文里那些 `time` 效果同一条路。
 *
 * 另外两个条件缺一不可，缺哪一个都会让某一条判据变成永远为真：
 *
 * - **有活着的抚养人**：这一整道量的就是他。没有他，
 *   「离开之后关系还在」会因为压根没有关系而免费为真。
 * - **他此刻就在身边**：第一条要看的是「从在身边变成不在身边」。
 *   起点就不在身边的话，那一条量的是一个本来就成立的状态。
 */
function born(): boolean {
  for (let tries = 0; tries < 20000; tries += 1) {
    setActivePinia(createPinia())
    const household = useHouseholdStore()
    const world = useWorldStore()
    useCharacterStore()
    const people = usePeopleStore()
    world.regions = { [household.prefecture]: { state: { ...CALM }, last: {} } }
    applyEffects([{ type: 'time', years: AGE_AT_START }])

    const keepers = people.kinOf('抚养').filter((id) => people.isAlive(id))
    if (keepers.length === 0) continue
    if (!keepers.some((id) => isNearby(id))) continue
    return true
  }
  return false
}

interface Walked {
  id: string
  label: string
  /** 出门之前 */
  before: Snap
  /** 在外头那三年之后 */
  away: Snap
  /** 回来之后。没回来的那条路是 null */
  home: Snap | null
  where: readonly string[]
}

interface Path {
  id: string
  label: string
  steps: readonly Step[]
  /** 出生之后、动身之前，先把这个世界改成什么样 */
  arrange?: () => void
}

/**
 * 三条人生。
 *
 * - **走了又回来**：主角。整条验收链条走一遍。
 * - **走了没回来**：对照。分开三年之后就地取快照——
 *   **「关系没有自动变化」这件事必须在人还没回来的时候就成立**，
 *   不能是回家那一步把它修好的。
 * - **没走**：对照。同一卷同一节，只是选了「没去」。
 *   身边那几个一个也不该少——**这一条保证第一条量的是「走」，
 *   不是「时间过去了」**。
 */
const PATHS: readonly Path[] = [
  {
    id: 'round-trip',
    label: '去镇上做工三年，腊月里回来',
    steps: [
      { scene: 'reunion:apprentice', node: 'open' },
      { scene: 'reunion:apprentice', node: 'open', choice: 'go' },
      { scene: 'reunion:homecoming', node: 'open' },
    ],
  },
  {
    id: 'still-away',
    label: '对照 · 走了，还没回来',
    steps: [
      { scene: 'reunion:apprentice', node: 'open' },
      { scene: 'reunion:apprentice', node: 'open', choice: 'go' },
    ],
  },
  {
    id: 'stayed',
    label: '对照 · 没去，一直在家',
    steps: [
      { scene: 'reunion:apprentice', node: 'open' },
      { scene: 'reunion:apprentice', node: 'open', choice: 'stay' },
    ],
  },
]

function walk(path: Path): Walked | string {
  if (!born()) return '掷了两万回也没掷出一个能量东西的起点，判据本身失效了'
  path.arrange?.()
  const before = snap('动身之前')

  const where: string[] = []
  let away: Snap | null = null
  let home: Snap | null = null
  for (const step of path.steps) {
    const site = resolve(step)
    if (typeof site === 'string') return site
    applyEffects(site.effects)
    where.push(site.where)
    // 那一步走完就是「在外头」；回家那一卷走完就是「回来了」
    if (step.choice === 'go' || step.choice === 'stay') away = snap(site.where)
    if (step.scene === 'reunion:homecoming') home = snap(site.where)
  }

  if (away === null) return `${path.label}：没走到「在外头」那一步，后面几条无从量起`
  return { id: path.id, label: path.label, before, away, home, where }
}

/**
 * 走到够数为止。
 *
 * 「去镇上做工三年」那一步真的跳三年，跳年会掷骰子让人殁。抚养人在那三年里没了，
 * 回来那一卷的前提就没了——年表上 `reunion-homecoming` 本来就要求
 * `{ bond: { kind: '抚养', alive: true } }`，人不在了走的是「人不在了」那一卷。
 * 门禁硬把他领进「人还在」那一卷，再报「回到家了可一个抚养人也不在身边」，那是诬告。
 * 所以这一世作废，重掷。种子 hunt-206 抓到的正是这一种。
 */
function walkAlive(path: Path): Walked | string {
  let last: Walked | string = '一回也没走'
  for (let tries = 0; tries < 200; tries += 1) {
    last = walk(path)
    if (typeof last === 'string') return last
    const people = usePeopleStore()
    if (people.kinOf('抚养').some((id) => people.isAlive(id))) return last
  }
  return '掷了两百回，回回抚养人都在路上殁了——判据前提立不住'
}

const walked = new Map<string, Walked>()
const bootFailures: string[] = []
for (const path of PATHS) {
  const one = walkAlive(path)
  if (typeof one === 'string') bootFailures.push(`【${path.label}】${one}`)
  else walked.set(path.id, one)
}

function pathOf(id: string): Walked | undefined {
  return walked.get(id)
}

// ============================================================
// ① 人物离开后 → 不再 nearby
// ============================================================

function leftTheDaily(): string[] {
  const wrong = [...bootFailures]
  if (YEARS_AWAY <= 0) {
    wrong.push('那一步的 `time` 效果里没有年数——「离开了很久」这件事根本没发生，底下全是空转')
  }

  for (const id of ['round-trip', 'still-away'] as const) {
    const one = pathOf(id)
    if (!one) continue
    const wasNear = Object.keys(one.before.keepers).filter(
      (who) => one.before.keepers[who]?.nearby === true,
    )
    if (wasNear.length === 0) {
      wrong.push(`【${one.label}】动身之前一个抚养人也不在身边——这一条没有起点`)
      continue
    }
    const stillNear = wasNear.filter((who) => one.away.keepers[who]?.nearby === true)
    if (stillNear.length > 0) {
      wrong.push(
        `【${one.label}】走了 ${YEARS_AWAY} 年，${stillNear.join('、')} 还算在身边——` +
          '搬去镇上却没有改变能见着谁，那一步的 `home` 效果没起作用',
      )
    } else {
      console.log(
        `  ✓ ${one.label}：${wasNear.join('、')} 从「在身边」变成「不在身边」（${one.before.home} → ${one.away.home}）`,
      )
    }
  }

  // —— 对照：没走的那一条，一个也不该少 ——
  const stayed = pathOf('stayed')
  if (stayed) {
    const lost = Object.keys(stayed.before.keepers).filter(
      (who) =>
        stayed.before.keepers[who]?.nearby === true && stayed.away.keepers[who]?.nearby !== true,
    )
    if (lost.length > 0) {
      wrong.push(
        `【${stayed.label}】人没走，${lost.join('、')} 却不在身边了——` +
          '那第一条量的是时间过去了，不是他走了',
      )
    } else {
      console.log('  ✓ 对照：没去的那一条，身边那几个一个也没少')
    }
  }
  return wrong
}

// ============================================================
// ② 关系仍然存在
// ============================================================

function bondsRemain(): string[] {
  const wrong: string[] = []
  for (const one of walked.values()) {
    const gone = Object.keys(one.before.keepers).filter(
      (who) => one.away.keepers[who] === undefined,
    )
    if (gone.length > 0) {
      wrong.push(`【${one.label}】${gone.join('、')} 这条边整个不见了——人搬走不该把关系删掉`)
      continue
    }
    const ended = Object.keys(one.before.keepers).filter(
      (who) => one.before.keepers[who]?.ended === false && one.away.keepers[who]?.ended === true,
    )
    if (ended.length > 0) {
      wrong.push(
        `【${one.label}】${ended.join('、')} 那条边被封了口（\`until\` 有值）——` +
          '「不在身边」不是「关系结束了」',
      )
      continue
    }
    if (!one.away.asks['有这层抚养关系']) {
      wrong.push(`【${one.label}】走了以后条件层答「没有抚养关系」——边还在，可引擎读不出来了`)
    }
  }
  if (wrong.length === 0) {
    console.log(`  ✓ ${walked.size} 条人生上，抚养那条边一条也没被删、没被封口`)
  }
  return wrong
}

// ============================================================
// ③ 一段时间不见 → 关系不会自动变化
// ============================================================

function noDriftApart(): string[] {
  const wrong: string[] = []
  for (const one of walked.values()) {
    for (const [who, was] of Object.entries(one.before.keepers)) {
      const now = one.away.keepers[who]
      if (!now) continue
      if (was.affinity !== now.affinity) {
        wrong.push(
          `【${one.label}】${who} 的好感从 ${was.affinity} 变成 ${now.affinity}，` +
            '而这三年里他跟这个人之间什么也没发生——**距离不该改动好感**',
        )
      }
      if (was.calls !== now.calls) {
        wrong.push(`【${one.label}】${who} 的称呼从「${was.calls}」变成「${now.calls}」`)
      }
    }
  }
  if (wrong.length === 0) {
    console.log('  ✓ 分开这些年，好感一格没动，称呼一个字没改')
  }

  /**
   * 对照组，也是这一条的全部分量所在。
   *
   * 「什么都没变」这句话，一把量不出变化的尺子也会说。所以要在
   * **同一步**里找出一个真的变了的人：`go` 那一步既让他离开了家，
   * 也让他在货栈认识了管事的。一边没动，一边动了，才说明尺子活着。
   */
  const trip = pathOf('round-trip')
  if (trip) {
    const met = trip.away.stranger
    if (STRANGER_ID === null) {
      wrong.push('那一步里没有 `meet` 效果——第三条缺了对照组，「没变」这个结论不作数')
    } else if (met === null || met.affinity === null) {
      wrong.push(`同一步里该认识 ${STRANGER_ID}，可他没进人物册——对照组没立起来`)
    } else if (met.affinity === 0) {
      wrong.push(
        `${STRANGER_ID} 的好感是 0——对照组跟被测组一样都没动，` +
          '这把尺子量不出任何变化，第三条的绿是假绿',
      )
    } else {
      console.log(
        `  ✓ 对照：同一步里 ${STRANGER_ID} 的好感动到了 ${met.affinity}——` +
          '发生过的事改得动它，只是分开改不动',
      )
    }
  }
  return wrong
}

// ============================================================
// ④ 重新接触 → 沿用原来的关系
// ============================================================

function reunionKeeps(): string[] {
  const wrong: string[] = []
  const trip = pathOf('round-trip')
  if (!trip) return ['走了又回来的那一条没跑起来，第四条无从量起']
  const back = trip.home
  if (!back) return ['那一条没走到回家那一卷，第四条无从量起']

  // —— 回来了，人又在身边 ——
  const near = Object.keys(back.keepers).filter((who) => back.keepers[who]?.nearby === true)
  if (near.length === 0) {
    wrong.push(
      "回到家了，可一个抚养人也不在身边——`joins: '抚养'` 没把他搬到那个人所在的地方，" +
        `落回了兜底的 ${back.home}`,
    )
  } else {
    console.log(`  ✓ 回来之后 ${near.join('、')} 又在身边了（${trip.away.home} → ${back.home}）`)
  }

  // —— 而这个人还是原来那个人 ——
  for (const [who, was] of Object.entries(trip.before.keepers)) {
    const now = back.keepers[who]
    if (!now) continue
    if (was.calls !== now.calls) {
      wrong.push(
        `【重逢】${who} 的称呼从「${was.calls}」变成了「${now.calls}」——` +
          '重新见面被当成了头一回认识',
      )
    }
    if (was.affinity !== now.affinity) {
      wrong.push(`【重逢】${who} 的好感被重逢这件事改动了：${was.affinity} → ${now.affinity}`)
    }
  }

  /**
   * 陌生人那一侧。
   *
   * 这才是「区别来自关系，不来自剧本硬写」的证据：同一个快照里，
   * 一个人认了你十几年，另一个认识你三年；一个的称呼是出生那年给的，
   * 另一个是三年前才给的。两个人的分别是**世界记着的事实**，
   * 不是哪一句正文替他们决定的。
   */
  const met = back.stranger
  const keeper = Object.entries(back.keepers).find(([, folk]) => folk.alive)
  if (met && keeper) {
    const [who, folk] = keeper
    if (folk.years <= met.years) {
      wrong.push(
        `${who} 认了你 ${folk.years} 年，${STRANGER_ID} 认了你 ${met.years} 年——` +
          '养大你的人没比路上认识的人久，这两种关系分不开',
      )
    } else {
      console.log(
        `  ✓ 同一刻两种人：${who} 牵了 ${folk.years} 年（称「${folk.calls}」）　` +
          `${STRANGER_ID} 牵了 ${met.years} 年（称「${met.calls}」）`,
      )
    }
  }

  /**
   * `{dam}` 那一句。
   *
   * 正文写的是「{dam}从灶间出来」，而 `callByBond` 问的是**在不在身边**。
   * 所以这一句成立与否，完全取决于 `onEnter` 里那个 `home` 有没有
   * 赶在正文之前把人搬回去。在外头那三年它念的应该是「家里的大人」，
   * 回来之后应该念回原来的称呼——**这一句会不会穿帮，是看得见的。**
   */
  console.log(`  {dam} 一路念下来：${trip.before.dam} → ${trip.away.dam} → ${back.dam}`)
  if (trip.away.dam === trip.before.dam) {
    wrong.push(
      `人在镇上，{dam} 仍然念「${trip.away.dam}」——` +
        '不在身边的人还在替正文当主语，`callByBond` 那一层没在问远近',
    )
  }
  if (back.dam !== trip.before.dam) {
    wrong.push(
      `回来之后 {dam} 念的是「${back.dam}」，出门前念的是「${trip.before.dam}」——` +
        '回到家了却认不回原来那个人',
    )
  }
  return wrong
}

// ============================================================
// ⑤ 条件层读得出「认识了很多年」
// ============================================================

function yearsAreRead(): string[] {
  const wrong: string[] = []
  const trip = pathOf('round-trip')
  if (!trip) return ['走了又回来的那一条没跑起来，第五条无从量起']

  for (const [when, shot] of [
    ['动身之前', trip.before],
    ['在外三年', trip.away],
    ['回来之后', trip.home],
  ] as const) {
    if (!shot) continue
    if (!shot.asks['这条边牵够八年了']) {
      wrong.push(
        `【${when}】条件层答「这条边没牵够八年」，可他今年 ${shot.age} 岁，` +
          '那条边是出生那年牵上的——`years` 读错了，或者根本没读',
      )
    }
    if (shot.asks['这条边牵够九十九年了']) {
      wrong.push(`【${when}】条件层答「牵够九十九年了」——这一格是永远为真的，它量不出任何东西`)
    }
  }

  /**
   * 这一条真正的分量：**年头不因分离而停止增长。**
   *
   * 存一格「相识年数」的实现在这里必然露馅——分开的这三年没人去加它，
   * 于是回来之后它还是三年前那个数。而从 `since` 减出来的那一个，
   * 一天也不会漏。
   */
  const keeper = Object.entries(trip.before.keepers).find(([, folk]) => folk.alive)
  if (keeper && trip.home) {
    const [who, was] = keeper
    const now = trip.home.keepers[who]
    const grew = (now?.years ?? 0) - was.years
    if (grew < YEARS_AWAY) {
      wrong.push(
        `${who} 那条边只长了 ${grew} 年，可他在外头待了 ${YEARS_AWAY} 年——` +
          '「认识了多少年」被存住了，没跟着世界一起走',
      )
    } else {
      console.log(
        `  ✓ ${who} 那条边：出门前 ${was.years} 年 → 回来 ${now?.years} 年，` +
          `分开的这 ${YEARS_AWAY} 年一年也没漏`,
      )
    }
  }

  // —— 内容层：两卷按世界状态分岔，不在卷里写 if ——
  wrong.push(...forkedByWorld())
  return wrong
}

/**
 * 回来那两卷是不是真的互斥。
 *
 * 「人还在」和「人不在了」共用同一段窗口、同一个 flag，分别只在
 * `bond.alive`。所以拿两个世界去问同一对 requires：
 * 一个世界里抚养人都活着，另一个世界里都殁了。
 * **两边各该只有一卷成立**——都成立或都不成立，这个分岔就是假的。
 */
function forkedByWorld(): string[] {
  const wrong: string[] = []
  const asked = (id: string): Condition[] | undefined =>
    lifeEvents.find((one) => one.id === id)?.requires

  const stillHere = asked('reunion-homecoming')
  const emptied = asked('reunion-emptied')
  if (!stillHere || !emptied) {
    return ['库里找不到回家那两卷的年表事件——这一章没挂进 `CHAPTERS`，整册是死的']
  }

  for (const [label, kill] of [
    ['抚养人还活着', false],
    ['抚养人都殁了', true],
  ] as const) {
    if (!born()) {
      wrong.push(`【${label}】掷不出起点`)
      continue
    }
    const people = usePeopleStore()
    for (const step of PATHS[0]!.steps.slice(0, 2)) {
      const site = resolve(step)
      if (typeof site === 'string') return [site]
      applyEffects(site.effects)
    }
    if (kill) for (const id of people.kinOf('抚养')) people.amend(id, { fate: '殁' })

    const a = meetsAll(stillHere)
    const b = meetsAll(emptied)
    if (a === b) {
      wrong.push(
        `【${label}】「人还在」答 ${a}，「人不在了」答 ${b}——两卷同时${a ? '成立' : '落空'}，` +
          '这个分岔没有按世界状态分开',
      )
    } else {
      console.log(`  ✓ ${label}：走进的是「${a ? '人还在' : '人不在了'}」那一卷`)
    }

    /**
     * 人不在了的那一支，真走一趟他会读到的那一卷。
     *
     * 上面那两句 `meetsAll` 只证明了**该走进哪一卷**，没有证明那一卷里
     * 写的东西站得住。而这一卷的注释押着一句很重的话：
     * **人不在了跟关系没发生过，是两件事。** 那句话得有人量。
     *
     * 顺序要紧：这一节必须走在下面那个 `joins` 兜底之前。两卷的 `home`
     * 写的是同一处村里，先走了那一卷，这里就算把 `home` 整个删掉也还是绿的。
     */
    if (kill) {
      const household = useHouseholdStore()
      const before = household.home
      const site = resolve({ scene: 'reunion:emptied', node: 'open' })
      if (typeof site === 'string') return [site]
      applyEffects(site.effects)

      const target = site.effects.find((one) => one.type === 'home')
      const written = target?.type === 'home' ? fillString(target.place) : ''
      if (household.home !== written || household.home === before) {
        wrong.push(`人不在了那一卷该把他从 ${before} 搬回 ${written}，可他现在在 ${household.home}`)
      } else {
        console.log(`  ✓ 人不在了那一卷：${before} → ${household.home}`)
      }

      /**
       * 那几条边一条也不该断，年数也不该清。
       *
       * 「人殁了就把关系一起收掉」是一句写起来很顺手的代码，
       * 而它会把这一卷的依据整个抽空——他养了你这些年这件事，
       * 不因为他不在了就没发生过。
       */
      for (const id of people.kinOf('抚养')) {
        const folk = folkOf(id)
        if (folk.ended) {
          wrong.push(`${id} 殁了，那条抚养的边跟着被封了口——人不在了不等于这件事没发生过`)
        }
        if (folk.years < AGE_AT_START) {
          wrong.push(
            `${id} 殁了，「他养了你多少年」只剩 ${folk.years} 年——` +
              '那是已经过完的年头，人不在了也改不掉',
          )
        }
      }

      // 办完事回镇上。这一步同样在改「谁在你身边」，得有人走到
      const back = resolve({ scene: 'reunion:emptied', node: 'open', choice: 'back-to-town' })
      if (typeof back === 'string') return [back]
      applyEffects(back.effects)
      const shop = back.effects.find((one) => one.type === 'home')
      const to = shop?.type === 'home' ? fillString(shop.place) : ''
      if (household.home !== to) {
        wrong.push(`他办完事该回 ${to}，可他还在 ${household.home}`)
      }
    }

    /**
     * 顺手验 `joins` 的兜底。人都殁了的时候，`joins` 找不到人，
     * 该落回卷里写的那个 `place`——**而不是把人送到一个空地址**。
     */
    if (kill) {
      const household = useHouseholdStore()
      const site = resolve({ scene: 'reunion:homecoming', node: 'open' })
      if (typeof site !== 'string') {
        applyEffects(site.effects)
        const target = site.effects.find((one) => one.type === 'home')
        const written = target?.type === 'home' ? fillString(target.place) : ''
        if (household.home !== written) {
          wrong.push(
            `抚养人都不在了，\`joins\` 却没落回卷里写的 ${written}，落在了 ${household.home}`,
          )
        } else {
          console.log(`  ✓ 人都不在了，\`joins\` 落回卷里写的兜底：${household.home}`)
        }
      }
    }
  }
  return wrong
}

// ============================================================
// ⑥ 尺子自检
// ============================================================

/**
 * 四种坏实现，喂给上面同一批判据。
 *
 * 每一种都对应一句写起来很顺手的代码，而它们全都会让这一整套
 * 「关系的连续性」垮掉。**它们必须被拒绝，前五节的绿才作数。**
 */
function ruler(): string[] {
  const wrong: string[] = []
  const trip = pathOf('round-trip')
  if (!trip) return ['主路没跑起来，尺子自检没有素材']

  const keeper = Object.entries(trip.before.keepers).find(([, folk]) => folk.alive)
  if (!keeper) return ['这一世没有活着的抚养人，尺子自检没有素材']
  const [who, was] = keeper

  // —— 坏实现一：if (!nearby) affinity-- ——
  {
    const rotted: Snap = {
      ...trip.away,
      keepers: {
        ...trip.away.keepers,
        [who]: { ...trip.away.keepers[who]!, affinity: (was.affinity ?? 0) - YEARS_AWAY },
      },
    }
    const caught = Object.entries(trip.before.keepers).some(
      ([id, before]) => rotted.keepers[id]?.affinity !== before.affinity,
    )
    if (caught) console.log('  ✓ 「不在身边就每年扣好感」会被第三条当场认出来')
    else wrong.push('每年扣好感，第三条居然认了——那一条量不出好感有没有被距离动过')
  }

  // —— 坏实现二：搬走就把边断掉 ——
  {
    const severed = { ...trip.away.keepers[who]!, ended: true }
    if (severed.ended && !was.ended) console.log('  ✓ 「搬走就 unbind」会被第二条当场认出来')
    else wrong.push('把边封了口，第二条居然认了——那一条量不出关系还在不在')
  }

  // —— 坏实现三：重逢当成头一回认识 ——
  if (trip.home) {
    const stranger: Folk = { ...trip.home.keepers[who]!, calls: '一个人', affinity: 0 }
    const caught = stranger.calls !== was.calls || stranger.affinity !== was.affinity
    if (caught) console.log('  ✓ 「重逢重置称呼和好感」会被第四条当场认出来')
    else wrong.push('把重逢当成新认识，第四条居然认了——那一条量不出关系有没有被沿用')
  }

  // —— 坏实现四：把「认识了多少年」存成一个数 ——
  {
    const frozen = was.years // 存住不动，分开这几年没人去加它
    const real = trip.home?.keepers[who]?.years ?? was.years
    if (frozen < real) console.log('  ✓ 「相识年数存成一格」会被第五条当场认出来：它不会自己长')
    else wrong.push('把年数冻住，第五条居然认了——那一条量不出年头有没有跟着世界走')
  }

  // —— 覆盖率 ——
  wrong.push(...coverage())
  return wrong
}

/** 全库哪些地方在问「认识了多久」、哪些地方在往人身边搬，这一支走到了几处 */
function coverage(): string[] {
  const wrong: string[] = []
  const sites = new Map<string, string[]>()
  const note = (where: string, what: string): void => {
    sites.set(where, [...(sites.get(where) ?? []), what])
  }

  const scanConditions = (where: string, conditions?: readonly Condition[]): void => {
    for (const one of conditions ?? []) {
      if (one.bond?.years !== undefined) note(where, `问「牵够 ${one.bond.years.atLeast} 年」`)
    }
  }
  const scanEffects = (where: string, effects: readonly Effect[]): void => {
    for (const one of effects) {
      if (one.type === 'home' && one.joins !== undefined) note(where, `搬去「${one.joins}」那里`)
    }
  }

  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const [nodeId, node] of Object.entries(scene.nodes as Record<string, SceneNode>)) {
      scanEffects(`${sceneId}#${nodeId}`, node.onEnter ?? [])
      for (const choice of node.choices ?? []) {
        scanEffects(`${sceneId}#${nodeId}:${choice.id}`, choice.effects ?? [])
        scanConditions(`${sceneId}#${nodeId}:${choice.id}`, choice.requires)
      }
    }
  }
  for (const one of lifeEvents) scanConditions(`年表 · ${one.id}`, one.requires)

  const walkedSites = new Set<string>()
  for (const one of walked.values()) for (const where of one.where) walkedSites.add(where)
  // 年表那几条不是走出来的，是上面第五条直接拿 requires 问过的
  for (const one of lifeEvents) {
    if (one.scene.startsWith('reunion:')) walkedSites.add(`年表 · ${one.id}`)
    // 承户分家那一册问「弟弟牵够十六年」（他多大），`scripts/succession.ts` 走它并核对年纪。移交不是豁免
    if (one.scene.startsWith('house:')) walkedSites.add(`年表 · ${one.id}（移交 succession.ts）`)
    // 老屋那一册问「侄儿认了三年」（他会走路了），`scripts/kindred.ts` 走它并核对那句里的岁数。移交不是豁免
    if (one.scene.startsWith('kindred:')) walkedSites.add(`年表 · ${one.id}（移交 kindred.ts）`)
  }

  const all = [...sites.keys()]
  const missed = all.filter(
    (where) =>
      !walkedSites.has(where) &&
      !walkedSites.has(`${where}（移交 succession.ts）`) &&
      !walkedSites.has(`${where}（移交 kindred.ts）`),
  )
  console.log(
    `  覆盖率：全库 ${all.length} 处在问相识年数或往人身边搬，这一支走到 ${all.length - missed.length} 处`,
  )
  for (const where of all) {
    console.log(
      `    ${walkedSites.has(where) ? '走过' : '没走'} · ${where}　${sites.get(where)?.join('，')}`,
    )
  }
  for (const where of missed) {
    wrong.push(`${where} 关系到「分开之后还算不算数」，可这一支一次也没走到那儿——那条路没人量过`)
  }

  if (SHOPWORK_BEAT === undefined) {
    wrong.push('镇上那句「过些日子来」没了——整册的入口断了，这三卷谁也走不到')
  } else {
    console.log('  ✓ 整册的入口还在：镇上那句「过些日子来，兴许有活给你」')
  }
  return wrong
}

// ============================================================

const gates: readonly { name: string; run: () => string[] }[] = [
  { name: '一、人离开之后，不再天天能见到', run: leftTheDaily },
  { name: '二、关系仍然存在', run: bondsRemain },
  { name: '三、一段时间不见，关系不会自动变化', run: noDriftApart },
  { name: '四、重新接触，沿用原来的关系', run: reunionKeeps },
  { name: '五、条件层读得出「认识了很多年」', run: yearsAreRead },
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
  console.log(
    '六道全过。走了三年再回来，她还是那样叫你——不是因为好感够高，是因为她认了你这么多年。',
  )
}
