import type { LifeEvent, LifeStage, SceneLibrary } from '@/types/game'

import { birthEvents, birthScenes } from './birth'
import { childhoodEvents, childhoodScenes } from './childhood'
import { dearthEvents, dearthScenes } from './dearth'
import { encounterEvents, encounterScenes } from './encounters'
import { hardshipEvents, hardshipScenes } from './hardship'
import { inquiryEvents, inquiryScenes } from './inquiry'
import { kinEvents, kinScenes } from './kin'
import { rivermanEvents, rivermanScenes } from './riverman'
import { routineScenes } from './routine'
import { royalEvents, royalScenes } from './royal'
import { schoolingEvents, schoolingScenes } from './schooling'
import { tradeEvents, tradeScenes } from './trades'
import { youthEvents, youthScenes } from './youth'

/**
 * 凡人。
 *
 * 出生 → 幼年 → 启蒙 → 少年 → 第一次见到修士。
 *
 * 这一册里没有一个「开局词条」。玩家不选出身，也不抽背景事件——
 * 他睁开眼时家里就在做那件事了，此后每一年都从上一年长出来：
 *
 *     连年雨水不足 → 父亲欠债 → 父亲出门做工 → 死在外地
 *     → 家里少个劳力 → 你不能再读书 → 你识字一般，但比同龄人壮实
 *
 * 中间任何一环没凑上，这条链就断在那里。而一个人的一生里，
 * 它本来就常常不会走完——这正是要的效果。
 *
 * 十六岁那年在渡口收尾。收尾不发奖品，只把你这十六年攒下的东西
 * 第一次拿到明白人面前过一眼：怀里那册看不懂的书，腕上那圈疤，
 * 或者什么也没有。
 */
export const lifeScenes: SceneLibrary = {
  ...birthScenes,
  ...childhoodScenes,
  ...schoolingScenes,
  ...hardshipScenes,
  ...dearthScenes,
  ...inquiryScenes,
  ...kinScenes,
  ...tradeScenes,
  ...royalScenes,
  ...encounterScenes,
  ...youthScenes,
  ...routineScenes,
  ...rivermanScenes,
}

export const lifeEvents: readonly LifeEvent[] = [
  ...birthEvents,
  ...childhoodEvents,
  ...schoolingEvents,
  ...hardshipEvents,
  ...dearthEvents,
  ...inquiryEvents,
  ...kinEvents,
  ...tradeEvents,
  ...royalEvents,
  ...encounterEvents,
  ...youthEvents,
  ...rivermanEvents,
]

/** 无事可叙时回到的日子。每个阶段各有一卷，且每个选项都必须花掉时间 */
export const lifeRoutine: Record<LifeStage, string> = {
  幼年: 'routine:child',
  启蒙: 'routine:youth',
  少年: 'routine:teen',
  成年: 'routine:adult',
}

/** 走到这一卷，凡人这一段就结束了 */
export const lifeFinale = 'riverman'
