import type { LifeEvent, LifeStage, SceneLibrary } from '@/types/game'

import { CHAPTERS } from './chapters'
import { ENDING_SCENE } from './ending'

/**
 * 一个人的一生。
 *
 * 出生 → 幼年 → 启蒙 → 少年 → 成年 → 壮年 → 老年 → 死。
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
 * ## 十六岁不再是终点
 *
 * 上一版走到十六岁那年的渡口就结束了：把攒下的东西拿到明白人面前
 * 过一眼，然后卷终。那个结构在替玩家回答一个他没问过的问题——
 * **「你这一生能不能在十六岁以前接触到修仙？」**——
 * 而只要那是唯一的出口，前面十六年的家庭、谋生、教育、疾病、灾荒、
 * 人际、迁徙就全是它的前置步骤。
 *
 * 现在十六岁是人生阶段的转折点，不是检测的截止线：从这一年起，
 * 决定怎么活的人从别人变成他自己。渡口那一卷照演，演完接着往下活。
 * 人生唯一的终点是天年到了（`engine/lifespan.ts`），
 * 而修行是**唯一能改变那个数字**的东西——这也是修仙在这一册里
 * 真正稀有的地方，不是因为它是主线，是因为它极难碰上又极难走通。
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
  成年: 'routine:adult',
  壮年: 'routine:prime',
  老年: 'routine:old',
}

/**
 * 落幕。
 *
 * 上一版这里是 `'riverman'`——渡口那一卷，十六岁那年演完，人生就结束了。
 * 那一行是全作最要紧的一条规则藏身的地方：**没在十六岁以前碰上修仙，
 * 这一局就到此为止。**它把出生环境、生计、疾病、灾荒、人际、迁徙
 * 全变成了一道入门检测的前置步骤。
 *
 * 现在它指着死亡那一卷，而走到那一卷只有一条路：天年到了
 * （`engine/lifespan.ts`）。渡口那一卷今天照演，演完接着往下活——
 * 遇见修士是这一生里的一件大事，不是这一生的终点。
 */
export const lifeFinale = ENDING_SCENE
