import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { useNarrativeStore } from '@/stores/narrative'
import { useUiStore } from '@/stores/ui'
import { useWorldStore } from '@/stores/world'
import type {
  Choice,
  ChoiceOption,
  LifeEvent,
  LifeStage,
  NarrativeBlock,
  Scene,
  SceneLibrary,
  SceneNode,
} from '@/types/game'

import { markFired, pickEvent } from './chronology'
import { meetsAll } from './conditions'
import { describeSpan, describeTime } from './describe'
import { applyEffects } from './effects'
import { fill, fillString } from './interpolate'
import { stageOf } from './stages'

/** 剧本若把 next 写成环，在此截断而不是让页面卡死 */
const MAX_AUTO_CHAIN = 32

/**
 * 一次落笔最多连演几卷。防的是「事件 → 事件 → 事件」把玩家晾在一边。
 *
 * 导出是给门禁用的：`verify.ts` 第六道要拿它跟「连着不给玩家落笔的卷有几件」
 * 对一下——那是「成年之后的日子还走不到」所依赖的前提之一。
 * 抄一个 4 过去也能跑，但抄的值会跟这里各走各的，那正是门禁最怕的事。
 */
export const MAX_EVENT_CHAIN = 4

/**
 * 一生的编排。
 *
 * events 是可能发生的事，routine 是没有事发生时的日子——
 * 后者才是这个游戏的底色：大部分年头什么也没发生，你只是在过日子。
 */
export interface LifePlan {
  events: readonly LifeEvent[]
  /** 每个阶段的日常场景。无事可叙时回到这里 */
  routine: Record<LifeStage, string>
  /** 走到此处，凡人这一段就结束了 */
  finale: string
}

export interface Story {
  /** 从头开卷 */
  begin: () => void
  /** 从存档接着读；无存档则开卷 */
  resume: () => void
  /** 弃卷重来：家世、世界、角色与界面一并重置 */
  restart: () => void
  /** 玩家落笔 */
  choose: (choice: Choice) => void
}

interface Address {
  sceneId: string
  nodeId: string
}

/**
 * 这条路要花掉多少时间。
 *
 * 累加而非取首个：一条选项可能既走三日路又病半月。
 */
function costOf(choice: Choice): string | null {
  let years = 0
  let months = 0
  let days = 0
  for (const effect of choice.effects ?? []) {
    if (effect.type !== 'time') continue
    years += effect.years ?? 0
    months += effect.months ?? 0
    days += effect.days ?? 0
  }
  return describeSpan({ years, months, days })
}

/**
 * 把不满足条件的选项翻译成界面能用的形态。
 *
 * 写了 lockedHint 的，以「够不到」的样子留在选项列表里——
 * 玩家应当知道此处有一条路，只是自己还走不了；
 * 没写的直接隐去，免得剧透。
 *
 * 选项上的字也要过占位符：它和正文一样是给玩家读的，
 * 漏了就会在按钮上印出 `{home}`。
 */
function toOptions(choices: readonly Choice[]): ChoiceOption[] {
  const options: ChoiceOption[] = []
  for (const choice of choices) {
    const shown: Choice = {
      ...choice,
      label: fillString(choice.label),
      ...(choice.hint ? { hint: fillString(choice.hint) } : {}),
      ...(choice.lockedHint ? { lockedHint: fillString(choice.lockedHint) } : {}),
    }
    if (meetsAll(choice.requires)) {
      options.push({ choice: shown, locked: false, cost: costOf(choice) })
    } else if (choice.lockedHint) {
      options.push({ choice: shown, locked: true, cost: null })
    }
  }
  return options
}

/**
 * 驱动这条循环：
 *   叙事 → 选择 → 行动 → 结果 → 状态变化 → 新叙事
 *
 * 一卷演完不是终局，是回到年表：这些年你长了几岁，
 * 家里出了什么事，于是下一件事找上门来。人生就是这么接起来的。
 *
 * 卷轴只向下延伸，不做页面切换：玩家的选择以「回响」留下，
 * 结算出的变化以「回执」落在正文里，界面因此始终有明确的因果。
 */
export function useStory(library: SceneLibrary, plan: LifePlan): Story {
  const narrative = useNarrativeStore()

  function sceneOf(id: string): Scene | undefined {
    return library[id]
  }

  /**
   * 解析跳转目标。
   *
   * `节点id` 先在本卷里找，找不到才当作另一卷的名字——
   * 顺序反过来的话，一个跟场景重名的节点会把玩家送去别的地方。
   */
  function resolve(target: string, fromSceneId: string): Address | null {
    const hash = target.indexOf('#')
    if (hash >= 0) {
      const sceneId = target.slice(0, hash)
      const nodeId = target.slice(hash + 1)
      const scene = sceneOf(sceneId)
      if (!scene) return null
      return { sceneId, nodeId: nodeId || scene.entry }
    }

    if (sceneOf(fromSceneId)?.nodes[target]) return { sceneId: fromSceneId, nodeId: target }

    const scene = sceneOf(target)
    return scene ? { sceneId: target, nodeId: scene.entry } : null
  }

  /**
   * 落纸之前的两道加工：换掉占位符，给未写时序的标题拓上「此刻」。
   * 时序必须在入卷时定格——卷轴往下翻十年，上面那行也该还是当年的日子。
   */
  function inscribe(blocks: readonly NarrativeBlock[]): NarrativeBlock[] {
    const world = useWorldStore()
    return fill(blocks).map((block) =>
      block.kind === 'heading' && !block.subtitle
        ? { ...block, subtitle: describeTime(world.time) }
        : block,
    )
  }

  /**
   * 这个人在这一节里多看见的那几句。
   *
   * 全部满足的都要出，不是取第一个——**一个人站在江边想起的事，
   * 本来就可能不止一件**。家里死过人、又一辈子没出过村的孩子，
   * 两句都该有。这跟 `branches` 恰好相反，那里是分流，取一条就走。
   *
   * 一律落 `deep`：这是他自己多想到的一层，不是别人多告诉他的。
   */
  function seenOf(node: SceneNode): NarrativeBlock[] {
    if (!node.seen) return []
    return node.seen
      .filter((one) => meetsAll(one.requires))
      .map((one) => ({ kind: 'narration', text: one.text, tone: 'deep' }))
  }

  /**
   * 一卷演完，回到年表。
   *
   * 先问「此刻有什么事该发生」，没有就过日子。日子本身要花掉时间，
   * 于是下一次再问的时候，你已经不是同一个年纪了。
   */
  function toNextChapter(depth: number): void {
    // 收尾那一卷演完就是卷终，不再往下接
    if (narrative.sceneId === plan.finale) {
      narrative.finish()
      return
    }

    if (depth >= MAX_EVENT_CHAIN) {
      // 连着演了几卷，该把笔交回玩家手里了
      enterRoutine()
      return
    }

    const event = pickEvent(plan.events)
    if (event) {
      markFired(event)
      const address = resolve(event.scene, '')
      if (!address) {
        console.error(`年表指向了不存在的一卷：${event.scene}`)
        enterRoutine()
        return
      }
      enterNode(address, depth + 1)
      return
    }

    enterRoutine()
  }

  function enterRoutine(): void {
    const character = useCharacterStore()
    const stage = stageOf(character.age)
    const address = resolve(plan.routine[stage], '')
    if (!address) {
      console.error(`缺少「${stage}」的日常：${plan.routine[stage]}`)
      narrative.finish()
      return
    }
    // 日常自身不再往下追事件，否则玩家一次落笔要读完好几年
    enterNode(address, MAX_EVENT_CHAIN)
  }

  function enterNode(start: Address, depth = 0): void {
    let current: Address | null = start

    for (let step = 0; step < MAX_AUTO_CHAIN; step += 1) {
      if (!current) break

      const node: SceneNode | undefined = sceneOf(current.sceneId)?.nodes[current.nodeId]
      if (!node) {
        console.error(`剧本节点缺失：${current.sceneId}/${current.nodeId}`)
        narrative.finish()
        return
      }

      // 顺序要紧：先结算状态，正文里才能引用变化后的世界；回执随后落在正文末尾
      const receipts = applyEffects(node.onEnter)
      narrative.append([...inscribe([...node.blocks, ...seenOf(node)]), ...receipts])
      narrative.locate(current.sceneId, node.id)

      const options = toOptions(node.choices ?? [])
      if (options.some((option) => !option.locked)) {
        narrative.setOptions(options)
        return
      }

      // 无可选项则自然续接下一节，让长段落有呼吸而不必打断玩家。
      // branches 先于 next：同一个动作，结局取决于玩家还不知道的事
      const target = node.branches?.find((branch) => meetsAll(branch.requires))?.next ?? node.next
      if (!target) {
        toNextChapter(depth)
        return
      }
      current = resolve(target, current.sceneId)
    }

    console.error(`剧本自动续接超过 ${MAX_AUTO_CHAIN} 节，疑似成环：${start.sceneId}`)
    narrative.finish()
  }

  function begin(): void {
    narrative.reset()
    toNextChapter(0)
  }

  function resume(): void {
    if (!narrative.hasStarted) {
      begin()
      return
    }
    if (narrative.ended || narrative.isAwaitingChoice) return

    // 卷轴有正文却无待选项：存档不完整，就地把选项重建出来，不重复追加正文
    const scene = narrative.sceneId ? sceneOf(narrative.sceneId) : undefined
    const node = scene && narrative.nodeId ? scene.nodes[narrative.nodeId] : undefined
    if (!node) {
      toNextChapter(MAX_EVENT_CHAIN)
      return
    }

    const options = toOptions(node.choices ?? [])
    if (options.some((option) => !option.locked)) narrative.setOptions(options)
    else toNextChapter(MAX_EVENT_CHAIN)
  }

  function restart(): void {
    // 家世要第一个重掷：姓名、身子骨、出生地都从它派生
    useHouseholdStore().reset()
    useWorldStore().reset()
    useCharacterStore().reset()
    useUiStore().reset()
    begin()
  }

  function choose(choice: Choice): void {
    narrative.clearOptions()
    // 选择本身留在正文里，卷轴才连贯。
    // 回响要跟正文走同一道加工——否则选项上写着占位符，落纸时就露馅了
    const receipts = applyEffects(choice.effects)
    narrative.append([...fill([{ kind: 'echo', text: choice.echo ?? choice.label }]), ...receipts])

    if (choice.next === null) {
      toNextChapter(0)
      return
    }

    const address = resolve(choice.next, narrative.sceneId ?? '')
    if (!address) {
      console.error(`选项指向了不存在的去处：${choice.next}`)
      toNextChapter(0)
      return
    }
    enterNode(address)
  }

  return { begin, resume, restart, choose }
}
