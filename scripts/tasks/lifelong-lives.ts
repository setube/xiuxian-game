/**
 * 一生门禁的单世模拟，从 `scripts/lifelong.ts` 原样搬出来。
 *
 * 搬出来只为一件事：**让它能在 worker 线程里跑**。
 * 走法一步没动——同一套年表、同样的回合上限、同样把钩子挂在 `locate` 上。
 * 改的只是记账的落点：原先 `live()` 一个人跑满 `RUNS` 世往一份 `Tally` 上累加，
 * 现在每片跑自己那几世、各攒一份 `Tally`，由主线程用 `sumTallies` 加起来。
 *
 * 这一支原先是四十支里最长的一支——六千世，一世按到六百下。
 * 那个乘积没有哪一处写坏了可以修，能拆的地方只有一个：
 * 世与世之间没有任何一条边，每一世自己 `createPinia()`，本来就可以同时跑。
 *
 * 判据、阈值、报表一格没动，全留在 `lifelong.ts` 那边。
 * 这里只负责把世跑出来。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { CHAPTERS } from '../../src/content/life/chapters'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useNarrativeStore } from '../../src/stores/narrative'
import { exitsOf } from '../refs'

/**
 * 一世最多按多少下。
 *
 * 这不是判据的一部分，是防死循环的保险丝：真撞上它就说明这一世走不完，
 * 而「走不完」正是第一道要抓的东西。给得宽一点，好让红灯的原因
 * 是「真的停不下来」，而不是「保险丝定得太紧」。
 */
export const TURN_CEILING = 600

/**
 * 修行这条路今天只有一卷：渡口。
 *
 * 卷名从目录里取，不写死在这儿——将来这一章多写两卷，这一道自动跟着数。
 * 章名找不到就是一处红：那说明修行这条路被改名或者拆掉了，
 * 而这一道正是靠它才知道「有没有人走上过那条路」。
 *
 * 世界里当然不止这一条超凡的路（武道、医术、方技……都还没写）。
 * 这里只认渡口，不是因为它特殊，是因为**眼下只有它有内容**——
 * 等第二条路写出来，这份名单跟着加一行，判据一个字不用改。
 */
export const CULTIVATION_CHAPTER = 'riverman'

export interface Tally {
  runs: number
  /** 撞上回合上限的世数。一世都不该有 */
  stalled: number
  /** 走到落幕那一卷的世数 */
  reachedFinale: number
  /** 每一档日常各停了多少回（跨所有世累计） */
  stops: Map<string, number>
  /** 每一档日常各有多少世停过（一世里停十回也只算一世） */
  lives: Map<string, number>
  /** 落幕那一卷的分流各收了多少世 */
  partings: Map<string, number>
  /** 走进过修行那一卷的世数 */
  metCultivation: number
  /** 出生那一刻掷定的天年 */
  rolled: number[]
  /** 咽气那一年的岁数 */
  died: number[]
  /** 总共按了多少下 */
  turns: number
}

/** 卷名 → 它是哪一档的日常。跑的时候靠它认出「这一节是日常」 */
const lifeRoutineByScene: Record<string, string> = Object.fromEntries(
  Object.entries(lifeRoutine).map(([stage, sceneId]) => [sceneId, stage]),
)

/**
 * 落幕那一卷从开场分流到哪几节——**从数据里读，不手写名单**。
 *
 * 手写一份 `['kin', 'spouse', 'alone']` 的话，哪天落幕多分一节出来，
 * 这一道会安安静静地绿着：新那一节没人走到，它也不知道自己该管。
 */
export const partings: readonly string[] = (() => {
  const finale = lifeScenes[lifeFinale]
  const open = finale?.nodes[finale.entry]
  if (!open) return []
  return [...new Set(exitsOf(open).map((exit) => exit.to.split('#').pop() ?? ''))].filter(Boolean)
})()

export function runShard(runs: number): Tally {
  const cultivationScenes = new Set(
    Object.keys(CHAPTERS.find((chapter) => chapter.id === CULTIVATION_CHAPTER)?.scenes ?? {}),
  )

  const tally: Tally = {
    // 写这一片实际跑的世数，不是全量的 RUNS——加起来才是总世数。
    // 抄成 RUNS 的话每片各报一次全量，分母会翻十一倍
    runs,
    stalled: 0,
    reachedFinale: 0,
    stops: new Map(),
    lives: new Map(),
    partings: new Map(),
    metCultivation: 0,
    rolled: [],
    died: [],
    turns: 0,
  }

  for (let index = 0; index < runs; index += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const character = useCharacterStore()

    /** 这一世进过哪些卷。按世去重，好分开「停了多少回」和「多少人停过」 */
    const seenScenes = new Set<string>()

    /**
     * 顺着玩家真正走过的路记一笔。
     *
     * 不能从 `narrative.sceneId` 采样：`enterNode` 会一口气自动接好几节，
     * 中间那些节点在等到下一次落笔之前就被覆盖了。包在 `locate` 上，
     * 它是每进一个节点都会被调到的那个。
     */
    const locate = narrative.locate
    narrative.locate = (sceneId: string, nodeId: string): void => {
      seenScenes.add(sceneId)
      if (sceneId in lifeRoutineByScene) {
        tally.stops.set(sceneId, (tally.stops.get(sceneId) ?? 0) + 1)
      }
      if (sceneId === lifeFinale && partings.includes(nodeId)) {
        tally.partings.set(nodeId, (tally.partings.get(nodeId) ?? 0) + 1)
      }
      locate(sceneId, nodeId)
    }

    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()
    tally.rolled.push(character.span)

    let turns = 0
    while (!narrative.ended && turns < TURN_CEILING) {
      const open = narrative.options.filter((option) => !option.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }
    tally.turns += turns
    if (turns >= TURN_CEILING) tally.stalled += 1

    if (seenScenes.has(lifeFinale)) tally.reachedFinale += 1
    if ([...cultivationScenes].some((sceneId) => seenScenes.has(sceneId))) {
      tally.metCultivation += 1
    }
    for (const sceneId of seenScenes) {
      if (sceneId in lifeRoutineByScene) {
        tally.lives.set(sceneId, (tally.lives.get(sceneId) ?? 0) + 1)
      }
    }
    tally.died.push(character.age)
  }

  return tally
}
