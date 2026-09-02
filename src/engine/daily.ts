import { BEATS, DOINGS } from '@/content/days'
import type { Condition, Effect, RegionKey } from '@/types/game'

import { meetsAll } from './conditions'
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
 */
export function spend(slot: Slot, doingId: string): Beat | undefined {
  const pool = BEATS.filter(
    (beat) =>
      beat.doing === doingId &&
      (beat.slots === undefined || beat.slots.includes(slot)) &&
      meetsAll(beat.requires) &&
      meetsAll(beat.when ? [{ region: beat.when }] : undefined),
  )
  return pickWeighted(pool, (beat) => beat.weight)
}

/** 把一段的正文摊成几句 */
export function beatLines(beat: Beat): readonly string[] {
  return typeof beat.text === 'string' ? [beat.text] : beat.text
}

/** 按 id 取一个去处 */
export function doingById(id: string): Doing | undefined {
  return DOINGS.find((doing) => doing.id === id)
}
