import { BEATS, DOINGS } from '@/content/days'
import { useCharacterStore } from '@/stores/character'
import { usePeopleStore } from '@/stores/people'
import type { Bond, Condition, Effect, RegionKey } from '@/types/game'

import { withAlong } from './along'
import { meetsAll } from './conditions'
import { isNearby } from './nearby'
import { pickWeighted } from './random'

/**
 * 一天。
 *
 * 到这一步为止，玩家所有的行为都是**被事件叫出来的**：年表挑中一卷，
 * 他在里面做选择。这一册反过来——**没有人叫他，他自己决定今天干什么。**
 *
 * ## 大多数行动没有机缘
 *
 * 这一册最要紧的一条规矩，是它绝大部分内容都**什么也不发生**。
 *
 * 每一次行动都给知识、给属性、给新人物、给奖励，那是操作游戏，
 * 不是人生。真实的一天最常见的结果就是「没什么特别的」——
 * 而正因为如此，那些真的改变了什么的日子才显得要紧。
 *
 * 所以结果分五档，越往下越少：
 *
 *     无事　什么也没发生。**但不等于没有内容**
 *     处境　家里紧了一点、手上多了个泡、跟谁近了一点
 *     见闻　问出了什么、看见了什么、认识了谁
 *     转折　这一天真的改了后面的路
 *     大事　撞上了一件事，这一天整个被它占了
 *
 * ## 「无事」不是空白
 *
 * 一句「你干了一上午活」是填充物。而这一册里的无事必须做到三件事：
 *
 * 1. **具体**：不是「干活」，是「割了半晌草，手上磨了个泡」。
 * 2. **带着世界**：旱年的地和丰年的地不是同一块地。
 *    玩家读的每一句无事，同时也是在读这一年的光景。
 * 3. **偶尔留个钩子**：「你回来时看见{elder}在门口跟人说话，
 *    你一走近他们就不说了。」——机制上什么也没变，
 *    可玩家知道有事在发生，只是这一天他没碰上。
 *
 * 第三条是「过日子」和「空转」的分界线。
 */

/** 一天分三段。够玩家安排，又不至于把一天切成流水账 */
export type Slot = '上午' | '下午' | '傍晚'

export const SLOTS: readonly Slot[] = ['上午', '下午', '傍晚']

/** 这一段发生的事有多大 */
export type Tier =
  /** 什么也没发生。绝大多数日子都在这一档 */
  | '无事'
  /** 轻微改变处境：家里紧了一点、身上累了一点、跟谁近了一点 */
  | '处境'
  /** 问出了什么、看见了什么、认识了谁 */
  | '见闻'
  /** 这一天真的改了后面的路 */
  | '转折'
  /** 撞上了一件事。这一天整个被它占了 */
  | '大事'

/**
 * 今天是跟谁去的。
 *
 * ## 23.md 那句话
 *
 * > 一个人出门只是最简单的情况。现实中更常见的是：和家人一起、
 * > 跟同村孩子一起、被长辈带着、跟商队同行……
 * > **而且同行者不是「陪同 NPC 标签」，他应该真的参与这次行动。**
 *
 * 所以这一格不是给去处挂一个装饰。它是**一个能被 `Condition` 问到的事实**，
 * 于是同一个去处的 `BEATS` 自己就分得开：一个人上山和跟着哥上山，
 * 抽到的不该是同一组事。`spend()` 那一行 `meetsAll(beat.requires)`
 * 早就在那儿了，不必改一个字。
 *
 * ## 为什么是「哪一类人」，不是「哪一个人」
 *
 * 因为**内容要问的是前者**：「你哥拉住了你」和「东头那孩子拉住了你」
 * 在一句正文里是同一件事的两种说法，而「有人拉住了你」跟
 * 「没有人拉得住你」才是两件事。
 *
 * 具体是谁由落笔那一刻现算（`{call:}` 那一层），跟称谓同一条路子——
 * **这一格记的是「有没有伴、什么样的伴」，不是伴的名单。**
 *
 * ## 六种，照实测的分布挑的
 *
 * 十岁那年身边有谁（400 世实测）：
 *
 *     有大人在身边        95%
 *     有兄弟姐妹          79%
 *     有邻家的孩子        87%
 *     ★ 同龄的一个也没有   6%
 *
 * 最后那 6% 是这一格存在的理由之一：**「一个人去」不是默认值，
 * 是一种处境**——多数孩子有伴，而少数没有，那少数该读到不一样的日子。
 */
export type Along =
  /** 一个人。多数时候的默认，可对那 6% 来说它是唯一的选项 */
  | '独自'
  /** 兄弟姐妹。同辈，年纪相近，会一起闯祸也会一起挨骂 */
  | '手足'
  /** 爹娘或者养大你的人。他带着你，你跟着他——**这一类里做主的不是你** */
  | '长辈'
  /** 同村同巷的孩子。他们不属于你家，散了就各自回家 */
  | '同伴'
  /** 商队、脚夫、同路的行人。**萍水相逢，走完这一段就散** */
  | '同路'

/** 一个去处 */
export interface Doing {
  id: string
  /** 选项上写的那一句 */
  label: string
  /** 哪几段可以做。去镇上要走半天，傍晚就来不及了 */
  slots: readonly Slot[]
  /** 还要满足什么才去得成 */
  requires?: Condition[]
  /** 选完之后正文里的回响 */
  echo: string
  /**
   * 这个去处**可能**是跟谁一起的，按先后排。
   *
   * 不写就是这一趟只能一个人（`独自`）——「待在家里」「帮家里干活」
   * 那几条本来就不是「出门」，硬给它们配伴是给一个不存在的问题造答案。
   *
   * 写了也不保证有伴：**列进来只是说「这一类人如果在身边，
   * 就可能一起去」**，真有没有由 `alongNow()` 现算。
   * 排在前面的先算——「跟哥去镇上」比「跟邻家孩子去镇上」更贴身。
   */
  along?: readonly Along[]
}

/**
 * 一段的落点。
 *
 * 同一个去处在不同的年景、不同的时段、不同的处境下，
 * 抽到的是完全不同的一组——**「去地里」在旱年和丰年不是一件事。**
 */
export interface Beat {
  /** 属于哪个去处 */
  doing: string
  tier: Tier
  weight: number
  /** 只在这几段发生 */
  slots?: readonly Slot[]
  /** 这个府得是什么光景 */
  when?: Partial<Record<RegionKey, { atLeast?: number; atMost?: number }>>
  requires?: Condition[]
  /** 正文。写成数组就是连着几句 */
  text: string | readonly string[]
  effects?: readonly Effect[]
  /**
   * 这一天沾着什么。
   *
   * **日后的新知识靠它把这一天找回来**——没有标记的一天，
   * 再要紧也没人想得起它。写的时候要问一句：
   * 这一天里有什么，是多年以后可能被重新理解的？
   */
  tags?: readonly string[]
  /**
   * 撞上了一件事，这一天交给它。
   *
   * 只有 `tier: '大事'` 才写。**去哪儿决定你可能撞上什么**——
   * 山那边才有山道上那个人，镇上才有货郎摊上那册书。
   */
  omen?: 'wounded' | 'book' | 'merchant'
}

/**
 * 此刻这一段能去哪儿。
 *
 * 去处不是一张固定的菜单：没上私塾的人没有「去私塾」，
 * 没人管的孩子没有「找{elder}说话」，傍晚也来不及往镇上跑。
 * **可做什么，本身就是处境的一部分。**
 */
export function doingsAt(slot: Slot): Doing[] {
  return DOINGS.filter((doing) => doing.slots.includes(slot) && meetsAll(doing.requires))
}

/**
 * 这一段实际发生了什么。
 *
 * 权重表里「无事」压过其余所有档加起来——**这不是配平，是立场**。
 * 一生中绝大多数日子本来就什么也没发生。
 *
 * ## 去处的条件在这里要再验一遍
 *
 * `doingId` 是从 `day-{slot}` 那个旗标里读出来的，而旗标记的是
 * **玩家当时的打算**——`doingsAt` 在他落笔那一刻验过一次条件，
 * 此后就没人再管了。
 *
 * 于是先生殁了之后，「去私塾」这个去处在菜单上确实关掉了，
 * 可旗标还写着 `school`，`spend` 照样抽出「先生今天讲的是旧课」。
 * 一个死了的人接着讲了好几年课，而**菜单上一个字也看不出异样**。
 *
 * 所以这里再验一次。验不过就当他什么也没做——那正是真相：
 * 他打算去私塾，可私塾没有了。
 */
export function spend(slot: Slot, doingId: string): Beat | undefined {
  const doing = doingById(doingId)
  if (doing && !meetsAll(doing.requires)) return undefined

  /*
   * 今天跟谁去，在挑之前算好、挑完收回。
   *
   * **算在这儿而不是算在每一条 `requires` 里**，是因为它对这一次抽取
   * 是个常量：同一趟出门，不会问第一条 beat 的时候是跟哥去的，
   * 问第二条的时候变成一个人。
   *
   * `withAlong` 用 `finally` 还原——`meetsAll` 里任何一格抛了异常，
   * 这一格也得收回去，否则下一次抽取会读到上一次残留的同伴。
   */
  return withAlong(alongNow(doing), () => {
    const pool = BEATS.filter(
      (beat) =>
        beat.doing === doingId &&
        (beat.slots === undefined || beat.slots.includes(slot)) &&
        meetsAll(beat.requires) &&
        meetsAll(beat.when ? [{ region: beat.when }] : undefined),
    )
    return pickWeighted(pool, (beat) => beat.weight)
  })
}

/** 把一段的正文摊成几句 */
export function beatLines(beat: Beat): readonly string[] {
  return typeof beat.text === 'string' ? [beat.text] : beat.text
}

/** 按 id 取一个去处 */
export function doingById(id: string): Doing | undefined {
  return DOINGS.find((doing) => doing.id === id)
}

/**
 * 今天这一趟，实际上是跟谁去的。
 *
 * ## 不存字段，每次现算
 *
 * 跟称谓那一层同一条纪律（`people.callOf` 的注释）：**存一个「今天的同伴」
 * 就得记着什么时候清掉它**，而漏清一次，一个死了三年的人还在陪你上山。
 *
 * 现算读的全是已有的事实：这个去处允许哪几类伴（`Doing.along`）、
 * 那一类人此刻在不在身边（`isNearby`）。**一格新数据也没加。**
 *
 * ## 「在身边」不是「活着」
 *
 * 用 `isNearby` 不用 `isAlive`——哥在镇上做木匠的那些年，他活着、
 * 那条边也在，可他不会陪你上山。这一条 `days.ts` 里那个「找{elder}说话」
 * 早就踩明白了：只问死活的话，玩家点的是一个人，说上话的是另一个人。
 *
 * ## 按 `Doing.along` 的次序取第一个，不掷
 *
 * 有哥就是跟哥去，没有哥才轮到邻家的孩子——**这不是随机，是亲疏**。
 * 掷一个反而假：一个孩子要出门，身边有哥的时候多半就是跟哥去的。
 *
 * 而「今天恰好谁都不在」由 `isNearby` 自己答，不必再掷一次。
 */
export function alongNow(doing: Doing | undefined): Along {
  if (doing?.along === undefined) return '独自'
  const people = usePeopleStore()
  const near = (bonds: readonly Bond[]) =>
    bonds.some((bond) => people.kinOf(bond).some((id) => isNearby(id)))

  for (const kind of doing.along) {
    if (kind === '手足' && near(['兄', '姐', '弟', '妹'])) return '手足'
    if (kind === '长辈' && near(['生父', '生母', '抚养'])) return '长辈'
    /*
     * 同伴：同村同巷的孩子。**他们不在关系图上**——邻居是 `meet` 立的，
     * 跟玩家没有任何一条边（`content/birth.ts`）。所以这一支问的是人口册：
     * 那几户里有没有年纪相仿、此刻在身边的孩子。
     *
     * 年纪相仿这一条是必需的：邻家那位五十岁的当家不会陪一个孩子上山。
     */
    if (kind === '同伴' && playmateNear()) return '同伴'
    // 同路的人不在册上——萍水相逢，那是内容自己造的人，这一层答不了
    if (kind === '同路') continue
  }
  return '独自'
}

/** 此刻身边有没有年纪相仿的邻家孩子。差六岁以内算得上一起玩 */
function playmateNear(): boolean {
  const people = usePeopleStore()
  const mine = useCharacterStore().age
  return Object.values(people.roster).some((person) => {
    if (person.id === 'me' || !isNearby(person.id)) return false
    const age = people.ageOf(person.id)
    return Math.abs(age - mine) <= 6 && age <= 20
  })
}
