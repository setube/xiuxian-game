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
 */
const STAGES: readonly { until: number; stage: LifeStage }[] = [
  { until: 6, stage: '幼年' },
  { until: 12, stage: '启蒙' },
  { until: 16, stage: '少年' },
]

export function stageOf(age: number): LifeStage {
  for (const entry of STAGES) {
    if (age <= entry.until) return entry.stage
  }
  return '成年'
}
