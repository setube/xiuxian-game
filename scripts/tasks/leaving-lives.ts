/**
 * 「走与不走」那一支的单世模拟，从 `scripts/leaving.ts` 原样搬出来。
 *
 * 搬出来只为一件事：**让它能在 worker 线程里跑**。
 * 走法一步没动——同样五百回合上限，同样由 `pick` 替玩家落笔
 * （那一段模拟的是人不是骰子，是这一支能测出念头价值的前提）。
 * 改的只是驱动：原先在脚本里一世一世 push 进数组，
 * 现在每片跑自己那几世，返回自己那一段，由主线程接起来。
 *
 * 判据和报表一格没动，全留在 `leaving.ts` 那边。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { DAMPERS } from '../../src/content/leanings'
import { useStory } from '../../src/engine/story'
import { useLeaningStore } from '../../src/stores/leanings'
import { useNarrativeStore } from '../../src/stores/narrative'
import { useWorldStore } from '../../src/stores/world'

export interface Lived {
  everWanted: boolean
  wantsNow: boolean
  letGo: boolean
  acted: boolean
  went: boolean
  cameBack: boolean
  settled: boolean
  /** 「想离开」被反向火种压过 */
  cooled: boolean
  /** 这一世里，哪些念头被灭火压过 */
  damped: string[]
}

/** 往前一步的那些选项。它们对所有人都开着，区别只在他会不会去点 */
const FORWARD = new Set(['ask', 'work', 'go'])
const BACK = new Set(['pass', 'stay'])

/**
 * 替玩家落笔。
 *
 * **这一段模拟的是人，不是引擎。** 走查若一律随机，就等于假设玩家
 * 是一枚骰子——而这套设计的机制恰恰是「念头改变他注意到什么，
 * 注意到什么改变他会点哪一条」。不把这一层模拟进来，
 * 念头的价值根本测不出来。
 *
 * 所以：心里存着「想离开」的人，读到「货栈的活是跟着车队走的」，
 * 六成半会去点那一条；心里什么也没存的人读到的只是「管饭」，
 * 一成半才会去点。**选项一个没多，多的只是他点它的机会。**
 */
function pick<T extends { choice: { id: string } }>(options: readonly T[], wants: boolean): T {
  const forward = options.filter((option) => FORWARD.has(option.choice.id))
  const back = options.filter((option) => BACK.has(option.choice.id))
  if (forward.length > 0 && back.length > 0) {
    const pool = Math.random() < (wants ? 0.65 : 0.15) ? forward : back
    return pool[Math.floor(Math.random() * pool.length)]!
  }
  return options[Math.floor(Math.random() * options.length)]!
}

/**
 * 一段话是不是「这个念头被压下去了」。
 *
 * **光比对文字会读反方向。** 反向火种把念头压下去的时候，
 * 往往顺带顶上来另一个（`instead`），而引擎给这两笔用的是
 * **同一个 moment 对象**——于是被顶上来的那个念头，
 * 它的 moments 里也留着同一段文字。
 *
 * 只按 `d.text === m.text` 筛，走查就会报「『你想把日子过安稳』
 * 被压过 80.9%」——可 `DAMPERS` 里压根没有一条压 settle 的。
 * 那个数字是把「因为它被顶上来」整个读成了「它被压下去」。
 *
 * 所以要连 `leaning` 一起对：**压的是谁，得由火种自己说了算。**
 */
function wasDamped(id: string, moments: readonly { text: string }[]): boolean {
  return moments.some((m) => DAMPERS.some((d) => d.leaning === id && d.text === m.text))
}

function liveALife(): Lived {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  const leaning = useLeaningStore()
  story.begin()
  let turns = 0
  while (!narrative.ended && turns < 500) {
    const open = narrative.options.filter((option) => !option.locked)
    if (open.length === 0) break
    story.choose(pick(open, leaning.stageOf('leave') !== '埋着').choice)
    turns += 1
  }
  const world = useWorldStore()
  const leave = leaning.leanings['leave']
  return {
    // 看有没有过这个念头，不看它此刻还剩多少——
    // 被压回零的人恰恰是 D 那一种，用当下的分量筛会把他们整个漏掉。
    // 真长起来过才算：他最想的时候到过「反复」那一档。
    // 只被点过一次火、从没成气候的不算动过念头。
    //
    // **门槛由仓库自己说了算。** 这里原先写的是 `peakOf('leave') >= 15`，
    // 把 STIRRING_AT 的值抄了一份——门槛一改，这一行就跟 `wantsNow`
    // 对不上：峰值 16 的人算「动过念头」，却永远进不了任何一格。
    everWanted: leaning.peakStageOf('leave') !== '埋着',
    wantsNow: leaning.stageOf('leave') !== '埋着',
    letGo: leave?.namedAt != null && leaning.stageOf('leave') === '埋着',
    acted: world.hasFlag('toward-leaving'),
    went: world.hasFlag('went-with-caravan'),
    cameBack: world.hasFlag('came-back'),
    settled: leaning.stageOf('settle') !== '埋着',
    cooled: wasDamped('leave', leave?.moments ?? []),
    damped: leaning.growing
      .filter((item) => wasDamped(item.id, item.moments))
      .map((item) => item.id),
  }
}

/** 这一片的那几世。合并就是把各片接起来——顺序不影响任何一格判据 */
export function runShard(runs: number): Lived[] {
  const lives: Lived[] = []
  for (let i = 0; i < runs; i += 1) lives.push(liveALife())
  return lives
}
