import type { LifeStage } from '@/types/game'

/**
 * 年龄 → 人生阶段。
 *
 * 单独成文件是为了断开一处环：conditions 要按阶段判定，
 * chronology 要按阶段筛事件又要回头调用 conditions——
 * 推导规则放在两者下游，谁都能引，谁都不必引对方。
 *
 * 「私塾」不在其中。不是所有人都读得起书，那是启蒙这几年里的一条岔路，
 * 不是人人必经的一站——把它列成阶段，等于假定每个孩子都进过学堂。
 *
 * ## 十六岁那一档往后的三个数，各自对着一件事
 *
 * 上一版这张表只有三行，第四档「成年」是兜底返回的，而且**没有人走得到**：
 * 渡口那一卷从十六岁起就一直霸着年表候选池，人生在那儿就停了。
 * 那不是分档的问题，是整个结构在把人生当成修仙的入门筛选。
 * 现在往后排，每一档都得有内容真的停在那儿（`scripts/lifelong.ts` 数着）。
 *
 *     16 岁　少年 → 成年　　不是「没修上仙就结束」，是**开始自己决定怎么活**
 *     29 岁　成年 → 壮年　　成家、立业、远行这些事该有结果了
 *     49 岁　壮年 → 老年　　该交出去的东西开始往下一辈手里走
 *
 * 两个新数字不是凑的：29 那一刀切在「还在往外闯」和「守着已经有的」之间，
 * 49 那一刀切在「自己还做得动」和「靠别人做」之间。它们**不是寿数**——
 * 一个人几岁死由 `engine/lifespan.ts` 掷定，跟这张表没有关系。
 * 混起来的话，「老年」会变成「快死了」，而那正是要避开的东西：
 * 六十岁的人不是在等死，他在过六十岁的日子。
 */
const STAGES: readonly { until: number; stage: LifeStage }[] = [
  { until: 6, stage: '幼年' },
  { until: 12, stage: '启蒙' },
  { until: 16, stage: '少年' },
  { until: 29, stage: '成年' },
  { until: 49, stage: '壮年' },
]

export function stageOf(age: number): LifeStage {
  for (const entry of STAGES) {
    if (age <= entry.until) return entry.stage
  }
  return '老年'
}
