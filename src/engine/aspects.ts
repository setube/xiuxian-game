import type { AspectKey } from '@/types/game'

/**
 * 认知层的定义。
 *
 * 每一面都有三种状态，玩家看到哪一种，取决于角色此刻知道多少：
 *
 *   一、不知道这回事      → unknown：「你不知道那是什么。」
 *   二、有自己的感觉      → Aspect.self：「你觉得自己的身体还算健康。」
 *   三、听过别人的评说    → Aspect.claims：「一名炼气修士说：你的灵气感知不错。」
 *
 * 第三种只增不改。日后宗门若说「这种资质也只能算中下」，两句话会一并留着，
 * 玩家自己去发现当初那个「不错」根本不是自己理解的意思。
 *
 * ## 「学识」与「修行」为什么必须分成两栏
 *
 * 先生夸的「聪明」落在学识下，修士说的「悟性」落在修行下。
 * 它们量的其实是不同的东西，但玩家不知道——
 * 他会先在一栏里攒下十几年的「记性极好」「读书不慢」，
 * 然后在另一栏里读到「悟性一般」。
 *
 * 两句话如果挤在同一栏里，看上去就只是「有人夸有人贬」；
 * 分成两栏，玩家才会问出那个真正的问题：
 * **先生说的聪明，和修士说的悟性，是同一样东西吗？**
 */
export interface AspectMeta {
  key: AspectKey
  label: string
  /** self 为 null 时顶上来的那句话。它本身就是一条信息：你连这回事都不知道 */
  unknown: string
}

export const ASPECTS: readonly AspectMeta[] = [
  { key: 'body', label: '身体', unknown: '你没有留意过自己的身体。' },
  { key: 'learning', label: '学识', unknown: '你不曾读过书。' },
  { key: 'cultivation', label: '修行', unknown: '你没想过人还能修行。' },
  { key: 'root', label: '资质', unknown: '你不知道那是什么。' },
]
