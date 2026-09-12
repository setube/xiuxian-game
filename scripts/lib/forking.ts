/**
 * 分流验证：**不同的人去了不同的地方吗**。
 *
 * ## 为什么要有这个文件
 *
 * 2026-09-12 补条件层判据时，同一段代码写到第四遍——
 * `childhood` 十二条按出身分流、`house` 三张按营生分流、
 * `illness` 三档按病况分流、`riverman` 两张按身份和物件分流。
 * 每一遍都在做同样三件事，而**每一遍都有可能漏掉其中一件**：
 *
 *     一、逐档摆局，断言各自去了对的那一节
 *     二、兜底那一条（`node.next`，没有 `requires`）单独验
 *     三、顺序：更具体的那一条排在前面，对调了要抓得住
 *
 * 抽出来不是为了少打字，是为了**让漏掉变得困难**：
 * 第二、三件最容易忘，而忘了的那一支会安静地绿着。
 *
 * ## 为什么判据表要从内容现取
 *
 * 抄一份在门禁里，内容加一档而门禁忘了加，**那一档永远没人验**，
 * 报表照样全绿（`ruler-standard-must-come-from-system` 那条）。
 * 所以这里只收 `sceneId` 和节点名，表自己去内容里读。
 *
 * ## ⚠️ 它验不了的那一种
 *
 * 分流条件由**这一节自己掷出来**的时候（`onEnter` 里有 `roll`），
 * 摆局喂进去的值会被当场覆盖——`illness` 的 `illness-outcome` 正是这样，
 * 头一版判据报「设了 died 却走到 lingering」，整体错位一档，看着像内容坏了。
 * 那一种要改问「掷出什么就去了那一节吗」，不在这个函数的射程里。
 */
import { lifeScenes } from '../../src/content/life'
import { meetsAll } from '../../src/engine/conditions'
import { applyEffects } from '../../src/engine/effects'
import type { Choice, Condition, SceneNode } from '../../src/types/game'

/** 一档分流：满足这条条件的人，该去那一节 */
export interface Branchpoint {
  requires: readonly Condition[]
  to: string
}

export interface Forking {
  /** 分流在哪一节 */
  node: string
  /** 各档 */
  branches: readonly Branchpoint[]
  /** 一档都不成立时去哪儿（`node.next`）。没有就是 undefined */
  fallback?: string
}

/**
 * 从内容里读出一个节点的分流表。
 *
 * 找的是**第一个有两条以上 `branches` 的节点**——一节里只有一条分支的
 * 多半是「有这面旗就多演一段」，不是在分流。
 */
export function forkingOf(sceneId: string, nodeId?: string): Forking | null {
  const scene = lifeScenes[sceneId]
  if (!scene) return null
  const entries: Array<[string, SceneNode]> =
    nodeId !== undefined
      ? scene.nodes[nodeId] !== undefined
        ? [[nodeId, scene.nodes[nodeId]!]]
        : []
      : Object.entries(scene.nodes)
  for (const [id, node] of entries) {
    const branches = (node.branches ?? [])
      .filter((one) => one.next !== undefined && (one.requires?.length ?? 0) > 0)
      .map((one) => ({ requires: one.requires!, to: one.next! }))
    if (branches.length >= 2 || (nodeId !== undefined && branches.length >= 1)) {
      return { node: id, branches, fallback: node.next }
    }
  }
  return null
}

/** 从某一节演下去，回报走过的节点 id */
export function walkFrom(sceneId: string, from: string, stopAfter = 20): string[] {
  const scene = lifeScenes[sceneId]
  if (!scene) return []
  const walked: string[] = []
  let at: string | undefined = from
  for (let guard = 0; at !== undefined && guard < stopAfter; guard += 1) {
    const node: SceneNode | undefined = scene.nodes[at]
    if (!node) break
    walked.push(at)
    if (node.onEnter) applyEffects(node.onEnter)
    const open: Choice[] = (node.choices ?? []).filter((one) => meetsAll(one.requires))
    if (open.length > 0) {
      const chosen = open[0]!
      if (chosen.effects) applyEffects(chosen.effects)
      at = chosen.next ?? undefined
      continue
    }
    at = node.branches?.find((one) => meetsAll(one.requires))?.next ?? node.next ?? undefined
  }
  return walked
}

export interface ForkReport {
  /** 不成立的项，每项一句话。空数组就是全过 */
  faults: string[]
  /** 验了几档（含兜底） */
  checked: number
}

/**
 * 验一张分流表。
 *
 * @param sceneId  哪一卷
 * @param put      摆一个满足指定条件的局。摆不出来回 `false`——
 *                 **那不是失败，是这一档我摆不了**，会记成一句话但不算错
 * @param nodeId   分流在哪一节；不传就找第一个有两条以上分支的节点
 */
export function checkForking(
  sceneId: string,
  put: (requires: readonly Condition[]) => boolean,
  nodeId?: string,
): ForkReport {
  const fork = forkingOf(sceneId, nodeId)
  if (fork === null) {
    return { faults: [`${sceneId} 里找不到分流那一节——场景 id 打错或结构变了`], checked: 0 }
  }

  const faults: string[] = []
  let checked = 0

  for (const branch of fork.branches) {
    if (!put(branch.requires)) {
      faults.push(`·  该去 ${branch.to} 的那一档摆不出局，这一档没验`)
      continue
    }
    checked += 1
    const walked = walkFrom(sceneId, fork.node)
    if (!walked.includes(branch.to)) {
      faults.push(`该去 ${branch.to} 的那一档，实际走过 ${walked.join('→')}`)
    }
  }

  /*
   * 兜底那一条：没有 `requires`，上面那一圈碰不到它。
   * 而它恰恰最容易死——分流表里再加一档，它就永远轮不到了。
   *
   * 摆一个「一档都不满足」的局：传空条件，由调用方摆它的默认局。
   */
  if (fork.fallback !== undefined && put([])) {
    const bare = walkFrom(sceneId, fork.node)
    const anyBranchHolds = fork.branches.some((one) => meetsAll(one.requires))
    if (!anyBranchHolds) {
      checked += 1
      if (!bare.includes(fork.fallback)) {
        faults.push(`一档都不成立时该落到兜底 ${fork.fallback}，实际走过 ${bare.join('→')}`)
      }
    }
  }

  return { faults, checked }
}
