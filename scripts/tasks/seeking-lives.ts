/**
 * 「可观测路径」那一节的单世模拟，从 `scripts/seeking.ts` 第七节原样搬出来。
 *
 * 搬出来只为一件事：**让它能在 worker 线程里跑**。
 * 走法一步没动——同一套年表、同样两百回合上限、同样在 `locate` 上挂钩子。
 * 唯一的改动是原先直接往外层那几个计数器上 `+= 1`，
 * 现在攒在自己这一片里返回，由主线程加总。
 *
 * ## 为什么钩在 `locate` 上而不是采样 `narrative.sceneId`
 *
 * 这一条是原文里就写着的，搬过来别丢：`enterNode` 会一口气自动接好几节，
 * 中间那些在下一次落笔之前就被覆盖了。`locate` 是每进一个节点都会被调到的
 * 那一个，所以钩子挂在这里。
 */
import { createPinia, setActivePinia } from 'pinia'

import { leadsHeard } from '../../src/engine/seeking'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useNarrativeStore } from '../../src/stores/narrative'
import { useWorldStore } from '../../src/stores/world'

/** 漏斗那六格。名字跟正文里印出来的一字不差，主线程直接拿去打印 */
export interface Funnel {
  心里生出想弄明白: number
  听说过世上有修士: number
  两样都占上: number
  抽中了问人那一卷: number
  真问着了东西: number
  两条对上了: number
}

export interface SeekingShard {
  /** 这一片实际跑了多少世。比例的分母要用总数，不能拿这个数去除 */
  lives: number
  funnel: Funnel
  enteredCrossed: number
  enteredDoor: number
  /** 在几岁对上的。`Map` 能结构化克隆，可以直接过 postMessage */
  ages: Map<number, number>
}

function emptyFunnel(): Funnel {
  return {
    心里生出想弄明白: 0,
    听说过世上有修士: 0,
    两样都占上: 0,
    抽中了问人那一卷: 0,
    真问着了东西: 0,
    两条对上了: 0,
  }
}

/** 把两片小计加到一起。加法可结合，所以摊成几片都不影响总数 */
export function mergeShards(shards: readonly SeekingShard[]): SeekingShard {
  const total: SeekingShard = {
    lives: 0,
    funnel: emptyFunnel(),
    enteredCrossed: 0,
    enteredDoor: 0,
    ages: new Map<number, number>(),
  }
  for (const shard of shards) {
    total.lives += shard.lives
    total.enteredCrossed += shard.enteredCrossed
    total.enteredDoor += shard.enteredDoor
    for (const key of Object.keys(total.funnel) as (keyof Funnel)[]) {
      total.funnel[key] += shard.funnel[key]
    }
    for (const [age, n] of shard.ages) {
      total.ages.set(age, (total.ages.get(age) ?? 0) + n)
    }
  }
  return total
}

export function runShard(runs: number): SeekingShard {
  const shard: SeekingShard = {
    lives: runs,
    funnel: emptyFunnel(),
    enteredCrossed: 0,
    enteredDoor: 0,
    ages: new Map<number, number>(),
  }

  for (let i = 0; i < runs; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const world = useWorldStore()
    const character = useCharacterStore()

    let asked = 0
    let crossedAt = -1
    let hitCrossed = 0
    let hitDoor = 0

    const locate = narrative.locate
    narrative.locate = (sceneId: string, nodeId: string): void => {
      if (sceneId === 'seek:asking' && nodeId === 'open') asked += 1
      if (sceneId === 'seek:crossed' && nodeId === 'open') hitCrossed += 1
      if (sceneId === 'seek:door' && nodeId === 'open') hitDoor += 1
      locate(sceneId, nodeId)
      // 落笔之后再看：那一句 ask-around 的效果就是在这一步生效的
      if (crossedAt < 0 && world.hasFlag('leads-crossed')) crossedAt = character.age
    }

    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()

    let turns = 0
    while (!narrative.ended && turns < 200) {
      const open = narrative.options.filter((option) => !option.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }

    shard.enteredCrossed += hitCrossed
    shard.enteredDoor += hitDoor
    const knows = character.knowledge.some((one) => one.id === 'cultivators-exist')
    const wants = world.hasFlag('leaning:know')
    if (wants) shard.funnel.心里生出想弄明白 += 1
    if (knows) shard.funnel.听说过世上有修士 += 1
    if (knows && wants) shard.funnel.两样都占上 += 1
    if (asked > 0) shard.funnel.抽中了问人那一卷 += 1
    if (leadsHeard().length > 0) shard.funnel.真问着了东西 += 1
    if (world.hasFlag('leads-crossed')) {
      shard.funnel.两条对上了 += 1
      shard.ages.set(crossedAt, (shard.ages.get(crossedAt) ?? 0) + 1)
    }
  }

  return shard
}
