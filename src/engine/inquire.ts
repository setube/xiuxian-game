import {
  DEFLECTIONS,
  IGNORANCE,
  INFORMANTS,
  informantById,
  type Answer,
  type Informant,
} from '@/content/informants'
import { usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import type { NarrativeBlock, RegionKey, Topic } from '@/types/game'

import { meetsAll } from './conditions'
import { fillString } from './interpolate'
import { pick } from './random'

/**
 * 去问一个人。
 *
 * 这一支是「玩家主动认识世界」的落点，跟 `perceive.ts` 的分别是：
 * 那边是世界给他看的，这边是他自己去要的。
 *
 * 但要来的**不是正确答案，是那个人的局部世界**。
 *
 * ## 两道闸，各管各的
 *
 * - **知不知道**（`knows`）：粮商对年景是 88，对修士是 6。
 * - **肯不肯说**（`tells`）：粮商对年景知道得一清二楚，但 tells 只有 22——
 *   那是他的生意，他不会跟一个孩子交底。
 *
 * 两道闸拆开，才能表达「他知道，但他不告诉你」这件事——
 * 而那恰恰是玩家最常撞上的情况。
 *
 * ## 玩家不是全知调查员
 *
 * 他能问出什么，还受年纪、关系、见识影响：
 * 十岁的孩子问衙门口的差役，跟十六岁的伙计去问，得到的不是一回事。
 */

/** 问一次的结果 */
export interface Reply {
  /** 对方说了什么。没问出来也有一句，那句本身也是信息 */
  blocks: NarrativeBlock[]
  /** 真问出东西了吗 */
  got: boolean
  /** 问出来的那条见闻 */
  learned?: Answer['learns']
  /** 认识到哪一档 */
  grasp?: Answer['grasp']
}

function meetsRegion(answer: Answer, state: Record<RegionKey, number>): boolean {
  if (!answer.when) return true
  for (const [key, range] of Object.entries(answer.when)) {
    const value = state[key as RegionKey]
    if (range.atLeast !== undefined && value < range.atLeast) return false
    if (range.atMost !== undefined && value > range.atMost) return false
  }
  return true
}

/** 此刻能去问的人 */
export function availableInformants(): Informant[] {
  const people = usePeopleStore()
  return INFORMANTS.filter((informant) => {
    if (informant.bond) {
      const ids = people.kinOf(informant.bond)
      if (!ids.some((id) => people.isAlive(id))) return false
    }
    return meetsAll(informant.requires)
  })
}

/** 他能答哪几件事。答不上来的不列出来——玩家不该看见「他有个答案但拿不到」 */
export function topicsFor(informant: Informant): Topic[] {
  const world = useWorldStore()
  const state = world.regionState() as unknown as Record<RegionKey, number>
  const seen = new Set<Topic>()
  for (const answer of informant.answers) {
    if (meetsRegion(answer, state)) seen.add(answer.topic)
  }
  return [...seen]
}

/**
 * 问他一件事。
 *
 * 先看他知不知道，再看他肯不肯说。两道闸都过了才有实话。
 *
 * **同一个人同一个问题，答案未必一样**——这一掷代表他今天的心情、
 * 你在他眼里够不够格问这个。所以玩家可以再问一次，
 * 但那要另花时间，而时间是这局游戏里最稀缺的东西。
 */
export function ask(informantId: string, topic: Topic): Reply {
  const informant = informantById(informantId)
  if (!informant) {
    console.error(`剧本让人去问一个不存在的人：${informantId}`)
    return { blocks: [], got: false }
  }

  const world = useWorldStore()
  const state = world.regionState() as unknown as Record<RegionKey, number>
  const who = fillString(informant.name)

  const candidates = informant.answers.filter(
    (answer) => answer.topic === topic && meetsRegion(answer, state),
  )
  const answer = pick(candidates)

  // 这件事他压根没有说法
  if (!answer) {
    return {
      blocks: [{ kind: 'narration', text: `${who}${pick(IGNORANCE) ?? IGNORANCE[0]!}` }],
      got: false,
    }
  }

  // 第一道闸：他知不知道
  if (Math.random() * 100 > answer.knows) {
    return {
      blocks: [{ kind: 'narration', text: `${who}${pick(IGNORANCE) ?? IGNORANCE[0]!}` }],
      got: false,
    }
  }

  // 第二道闸：他肯不肯说。知道而不肯说，这一句本身也是信息
  if (Math.random() * 100 > answer.tells) {
    return {
      blocks: [{ kind: 'narration', text: `${who}${pick(DEFLECTIONS) ?? DEFLECTIONS[0]!}` }],
      got: false,
    }
  }

  const blocks: NarrativeBlock[] = [
    { kind: 'dialogue', speaker: who, text: fillString(answer.says) },
  ]
  // 玩家心里的那句。跟观察系统的 doubt 一样：是他的理解，不是事实
  if (answer.reading)
    blocks.push({ kind: 'narration', text: fillString(answer.reading), tone: 'faint' })

  return {
    blocks,
    got: true,
    ...(answer.learns ? { learned: answer.learns } : {}),
    ...(answer.grasp ? { grasp: answer.grasp } : {}),
  }
}
