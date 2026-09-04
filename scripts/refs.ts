/**
 * 一个节点身上，所有能引用到世界状态的地方。
 *
 * ## 这份东西是被一个 bug 逼出来的
 *
 * 加 `seen` 那一格的时候，我在渡口那节写了个不存在的旗标。
 * 第四道门禁（前置条件）一声没吭——**它没扫 `seen`**。
 * 补上之后立刻红了，看着像修好了。
 *
 * 可真正的毛病不在那一行：verify 里有**六处**各自手写了一遍
 * 「一个节点有哪些格子」——断头路一处、孤儿一处、前置条件一处、
 * 可观测一处、收尾一处、拓扑一处。加 `seen` 时我只补了其中一处。
 * 别处没补而没出事，是因为 `seen` 恰好不带去向、不带效果——
 * **那是运气，不是设计**。
 *
 * 于是规律就清楚了：**每加一种内容表达能力，就多一个隐藏引用。**
 * 而漏掉的那一处永远不会喊，因为内容跑得好好的，
 * 只是门禁不知道它存在。
 *
 * ## 所以这里放的是声明，不是门禁
 *
 * 底下那张表是「一个节点的每一格各自引用了什么」的唯一真相源。
 * 三个提取器全从它算出来，六处遍历全改成调提取器。
 * **不让系统里出现两个都认为自己是真相的位置。**
 *
 * ## 加一格而不登记，编译就过不去
 *
 * `satisfies Record<keyof SceneNode, FieldRefs>` 那一行是这份文件的全部分量。
 * `SceneNode` 多一个字段，这张表就少一个键，tsc 当场红：
 *
 *     类型"{ id: ...; blocks: ...; }"中缺少属性"newField"
 *
 * 登记成 `{}`（什么也不引用）当然也能过——`id` 和 `blocks` 就是这样。
 * 这道关卡不替人做判断，它只保证**没有人能在不做判断的情况下加一格**。
 *
 * 这跟 `seen` 自己那一格是同一个手法：**能用类型守住的就别拿门禁去守。**
 * 门禁会漏、会忘、会在别人改动时静静地不再覆盖新代码；
 * 编译错误不会。
 */
import type { Condition, Effect, SceneNode } from '../src/types/game'

/**
 * 一条出边。`via` 是断头路报告里那句「从哪儿出去的」。
 *
 * `requires` 是后来补的：**一条边不光有去处，还有谁走得到。**
 * `child:memory` 那一卷底下十个分流节点，各自锁着一种出身，
 * 而「谁读得到 farm 那一节」这个问题，只有顺着边上的条件才答得出来。
 * 出身门禁（`upbringing.ts`）问的就是它。
 */
export interface Exit {
  to: string
  via: string
  requires?: readonly Condition[]
}

/** 一处条件。`tag` 缀在出错位置后面，好让人知道是节点的哪一格 */
export interface ConditionRef {
  requires: readonly Condition[]
  tag?: string
}

/** 一格能引用什么。三样都不引用就写 `{}` */
interface FieldRefs {
  exits?: (node: SceneNode) => Exit[]
  conditions?: (node: SceneNode) => ConditionRef[]
  effects?: (node: SceneNode) => readonly Effect[]
}

/**
 * 登记表。**加一格就得在这儿写一行，不写编译不过。**
 *
 * 顺序照着 `SceneNode` 里的顺序排，好对着读。
 */
const NODE_REFS = {
  id: {},
  // 正文只是话。它不引用世界，世界也不因为它改变
  blocks: {},
  onEnter: { effects: (node) => node.onEnter ?? [] },
  /**
   * 所见只有条件，没有去向也没有效果——**类型上就写不出来**。
   * 所以这一格在断头路和孤儿那两道门禁里永远是空的，
   * 而那两道现在也照样会问它一声。
   */
  seen: {
    conditions: (node) => (node.seen ?? []).map((one) => ({ requires: one.requires, tag: '所见' })),
  },
  choices: {
    // next 为 null 是「本卷终了」，不是断头路
    exits: (node) =>
      (node.choices ?? []).flatMap((choice) =>
        choice.next === null
          ? []
          : [{ to: choice.next, via: `choice:${choice.id}`, requires: choice.requires }],
      ),
    conditions: (node) =>
      (node.choices ?? []).map((choice) => ({ requires: choice.requires ?? [] })),
    effects: (node) => (node.choices ?? []).flatMap((choice) => choice.effects ?? []),
  },
  branches: {
    exits: (node) =>
      (node.branches ?? []).map((branch) => ({
        to: branch.next,
        via: 'branches',
        requires: branch.requires,
      })),
    conditions: (node) => (node.branches ?? []).map((branch) => ({ requires: branch.requires })),
  },
  next: { exits: (node) => (node.next ? [{ to: node.next, via: 'next' }] : []) },
} satisfies Record<keyof SceneNode, FieldRefs>

const FIELDS: readonly FieldRefs[] = Object.values(NODE_REFS)

/** 这个节点所有的出边。断头路、孤儿、可观测、拓扑四道门禁都问它 */
export function exitsOf(node: SceneNode): Exit[] {
  return FIELDS.flatMap((field) => field.exits?.(node) ?? [])
}

/** 这个节点所有的条件。前置条件那一道问它 */
export function conditionsOf(node: SceneNode): ConditionRef[] {
  return FIELDS.flatMap((field) => field.conditions?.(node) ?? [])
}

/** 这个节点所有的效果。前置条件和拓扑那两道问它 */
export function effectsOf(node: SceneNode): readonly Effect[] {
  return FIELDS.flatMap((field) => field.effects?.(node) ?? [])
}
