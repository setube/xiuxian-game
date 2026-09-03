import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { useWorldStore } from '@/stores/world'
import type { NarrativeBlock } from '@/types/game'

import { pickWeighted } from './random'

/**
 * 那一天，他把注意力放在了哪儿。
 *
 * ## 这一支是来替掉一行阈值的
 *
 * 从前山道那一卷只有一句判定：
 *
 *     insight ≥ 34 || body ≥ 52　→　看见了
 *
 * 读起来像「机会摆在面前，看不看得见是另一回事」，实际量出来
 * **三百世里三百个人都看见了**。因为十一种出身里只有农户两项都够不着，
 * 而童年那些事——下地、跟车、认药——到十岁之前就把属性推过线了。
 * 「注意到机会」这一关，被童年系统提前替他解决了。
 *
 * ## 可修法不是把线抬高
 *
 * 抬高阈值只会换来另一句话：**聪明孩子看见，笨孩子看不见**。
 * 那是能力检测，不是人生。真正要问的是：
 *
 *     当时的他，有没有把注意力放在那里。
 *
 * 这两件事不一样。一个心思很细的孩子，在挨过一顿骂、
 * 满脑子想着家里那个还没退烧的人的下午，一样什么也看不见；
 * 而一个笨手笨脚的猎户家孩子，在他走了十几年的那条山路上，
 * 眼角一扫就知道草丛被压过。
 *
 * 所以这里的分数由三样东西合起来定：
 *
 *     心思细不细　+　那天他心里装着什么　+　路上是什么天
 *
 * `insight` 只占其中一份，而且**不设阈值**——它挪的是概率，
 * 不是开关。剩下两份来自他这一生真发生过的事：家里有人病着、
 * 欠着账、走了大半日、上回也走过这么一段、心里正想弄明白些什么。
 * 每一条都指名道姓说得出为什么，没有一条是「运气不好」。
 *
 * ## 落到正文里的那一句
 *
 * 最压着他的那件事会印进正文，**三条路上都印**。所以哪怕他这一天
 * 什么也没看见，他读到的也不是一片空白，而是「你心里想着家里那个人」——
 * 他知道自己那天心不在焉，只是永远不会知道自己错过了什么。
 */

/** 那天路上的天。剧本掷，正文读得到，这里也拿来算分 */
export type RoadWeather = '晴' | '阴' | '起风' | '下雨'

/** 天落进正文的那一句。晴天不出声——没人会特意提「今天天不错」 */
const WEATHER_LINES: Record<RoadWeather, string | null> = {
  晴: null,
  阴: '天阴着，山里比外头暗得早。',
  起风: '风一阵一阵地过，草叶翻得人眼花。',
  下雨: '雨不大，可下了一路，路面滑得很。',
}

/**
 * 注意力落到了哪一档。
 *
 * 三档在人生意义上是三件完全不同的事：
 *
 *     missed    　没有注意到。正文里根本不会提有人躺着
 *     glimpsed  　看见了，但没放在心上。他记得草丛里好像有点什么
 *     caught    　看进去了。接下来才轮到「他把那人看成什么」
 */
export type Attending = 'caught' | 'glimpsed' | 'missed'

/**
 * 一件占着他心思的事，或一样让他多留意一眼的东西。
 *
 * `says` 为 null 的那几条是**他自己说不出来的**：常年在山里走的人
 * 不会想「我对草木比较敏感」，他只是看见了。写进正文会变成能力播报。
 */
interface Draw {
  id: string
  /** 正文里读到的那一句。null = 它影响他，但不出声 */
  says: string | null
  delta: number
  holds: () => boolean
}

const DRAWS: readonly Draw[] = [
  {
    id: '走了大半日',
    says: '腿有点发沉。你想着到了村里先讨口水喝。',
    delta: -6,
    holds: () => true,
  },
  {
    id: '身子已经乏透了',
    says: '你太累了，眼睛只盯着脚下那几步路。',
    delta: -7,
    holds: () => useCharacterStore().attributes.body < 40,
  },
  {
    id: '家里那个人还病着',
    says: '你心里想着家里那个人。这一路都没想别的。',
    delta: -11,
    holds: () => useWorldStore().hasFlag('illness-lingers'),
  },
  {
    id: '欠着的那笔账',
    says: '你心里盘算着那笔欠账，算了一路也没算出个头。',
    delta: -6,
    holds: () => useHouseholdStore().debt > 0,
  },
  {
    // 天不是他的心事，是场上人人都看得见的事——所以它先印，心事跟在后面
    id: '路上天不好',
    says: null,
    delta: -8,
    holds: () => {
      const weather = useWorldStore().getFlag('road-weather')
      return weather === '下雨' || weather === '起风'
    },
  },
  {
    id: '常年在山里走',
    says: null,
    delta: 10,
    holds: () => useHouseholdStore().trade === '猎户',
  },
  {
    id: '认得草木',
    says: null,
    delta: 5,
    holds: () => {
      const trade = useHouseholdStore().trade
      return trade === '药铺' || trade === '农户'
    },
  },
  {
    // 「最近经历过类似的事」。同一个人可以走两回山道，第二回他知道该往哪儿看
    id: '上回也是这么一段路',
    says: '走到这一段，你想起上回那一趟。',
    delta: 8,
    holds: () => useWorldStore().getFlag('wounded-outcome') !== undefined,
  },
  {
    // 念头反过来影响行动：正想弄明白些什么的人，本来就比别人多看两眼
    id: '正想弄明白些什么',
    says: null,
    delta: 6,
    holds: () => useWorldStore().hasFlag('leaning:know'),
  },
]

/** 一个什么也不占、心思不细不钝的人的底分 */
const BASE = 30

/** 心思细不细，从这条线上下算。它挪概率，不当开关 */
const INSIGHT_PIVOT = 40

export interface Attention {
  level: Attending
  /** 那天最压着他的那件事。正文里会提一句，没有就是 null */
  weighing: string | null
  /** 各项加减。玩家看不到，走查看得到 */
  ledger: readonly { id: string; delta: number }[]
  score: number
}

/**
 * 掷一次「那天他有没有把注意力放在那里」。
 *
 * 三档的权重都随分数连续地挪，两头各留一个下限——
 * **再心细的人也有走神的那一天，再走神的人也有一眼看见的那一天。**
 * 留这个下限是有意的：一个能被属性彻底锁死的判定，
 * 跑一万世也只会印出同一句话。
 *
 * ## 这三个常数是量出来的，不是拍的
 *
 * 头一版取 `score - 8` / `8` / `34 - score`，四百世真人生跑出
 * 27.5 / 25.3 / 47.2。三档都有人走到，看着挺好——
 * 可它是**一道乘法里的一环**：山道往下还有停不停、扶不扶、
 * 掷到的是不是修士、渡口上认不认得出来。那一版把「这辈子拿到过那册书」
 * 从三百世 25 个压到 9 个，「多年以后有人点破」从 8 个压到 **2 个**。
 *
 * 两个人一格的门禁下一批就可能是零，而红的原因不是内容坏了，是抽样。
 * **一支会随机红灯的门禁比没有门禁更糟。** 所以截距各挪两分，
 * 收到 18 / 24 / 58 上下：没看见的那一档照样有人落，
 * 而下游那条线还剩得下一个能读的数。
 */
export function attend(): Attention {
  const character = useCharacterStore()
  const held = DRAWS.filter((draw) => draw.holds())
  const ledger = held.map((draw) => ({ id: draw.id, delta: draw.delta }))

  const score =
    BASE +
    (character.attributes.insight - INSIGHT_PIVOT) * 0.5 +
    ledger.reduce((sum, item) => sum + item.delta, 0)

  const odds = [
    { level: 'caught' as const, weight: Math.max(3, score - 6) },
    { level: 'glimpsed' as const, weight: 8 },
    { level: 'missed' as const, weight: Math.max(2, 32 - score) },
  ]
  const level = pickWeighted(odds, (item) => item.weight)?.level ?? 'glimpsed'

  // 心里同时装着好几件事，可正文只提最压着他的那一件
  const heaviest = held.filter((draw) => draw.says !== null).sort((a, b) => a.delta - b.delta)[0]

  return { level, weighing: heaviest?.says ?? null, ledger, score }
}

/** 那一句心事，落进正文。天在前——那是人人都看得见的；心事在后，那是他一个人的 */
export function attendBlocks(attention: Attention): NarrativeBlock[] {
  const blocks: NarrativeBlock[] = []
  const weather = useWorldStore().getFlag('road-weather')
  const sky = typeof weather === 'string' ? WEATHER_LINES[weather as RoadWeather] : null
  if (sky) blocks.push({ kind: 'narration', text: sky })
  if (attention.weighing) {
    blocks.push({ kind: 'narration', text: attention.weighing, tone: 'faint' })
  }
  return blocks
}
