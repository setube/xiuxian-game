import type { LifeEvent, LifeStage, SceneLibrary } from '@/types/game'

import { CHAPTERS } from './chapters'

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
 *
 * ## 这里已经不再是一张手写的清单
 *
 * 库和年表都从 `chapters.ts` 摊平出来。从前这两处是各写各的两串 spread，
 * 顺序还不一样，新写一章要记得在两个地方各加一行——**漏一处的那半章
 * 会安静地躺在库里，永远没有入口**。现在漏不了：章只声明一次。
 */
export const lifeScenes: SceneLibrary = Object.fromEntries(
  CHAPTERS.flatMap((chapter) => Object.entries(chapter.scenes)),
)

export const lifeEvents: readonly LifeEvent[] = CHAPTERS.flatMap((chapter) => chapter.events)

/** 无事可叙时回到的日子。每个阶段各有一卷，且每个选项都必须花掉时间 */
export const lifeRoutine: Record<LifeStage, string> = {
  幼年: 'routine:child',
  启蒙: 'routine:youth',
  少年: 'routine:teen',
  // 走不到：渡口那一卷从十六岁起就一直在年表候选池里，池子不空，
  // 就轮不到日常，而「成年」要十七岁才开始。凑法是四个数字合出来的，
  // 全写在 routine.ts 那一卷上头，`verify.ts` 第六道盯着它们
  成年: 'routine:adult',
}

/** 走到这一卷，凡人这一段就结束了 */
export const lifeFinale = 'riverman'
