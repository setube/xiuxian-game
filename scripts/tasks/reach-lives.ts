/**
 * 「他够得着哪些事」那一支的单世模拟，从 `scripts/reach.ts` 原样搬出来。
 *
 * 走法一步没动——同一套年表、同样两百回合上限、同样一路随机落笔，
 * 采样点也照旧在 `choose` **之前**（要问的是「此刻摆在他面前的选项」；
 * 挪到 choose 之后就成了「下一节的选项配上一节的身份」，那是另一回事）。
 *
 * ## 判据没有跟着搬过来，这是有意的
 *
 * 这里只把事实取回去：**哪一回合他在高墙里、那一刻面前摆着哪些选项**。
 * 「哪些字算够不着的事」（`offendersIn`）留在 `reach.ts`——那是这支门禁
 * 要说的话，而且它第三条判据要拿手写的坏数据去喂那个函数。
 * 判据搬进 worker，那一条自检就够不着它了。
 *
 * `WALLED` 经 `payload` 递进来，理由跟 `origins-lives.ts` 的 `OWN_EVENT` 一样：
 * 它是纯数据，结构化克隆搬得动，而它在主脚本里还有别的读者。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useNarrativeStore } from '../../src/stores/narrative'

/** 一个「此刻在高墙里」的回合：他过的哪种日子、面前摆着什么、这是哪一卷 */
export interface WalledTurn {
  living: string
  labels: string[]
  scene: string
}

export interface ReachShard {
  /** 采到多少个高墙里的回合。判据靠它说明自己有没有真的量到东西 */
  walledTurns: number
  seen: WalledTurn[]
}

export function runShard(runs: number, walled: readonly string[]): ReachShard {
  const shard: ReachShard = { walledTurns: 0, seen: [] }

  for (let i = 0; i < runs; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const character = useCharacterStore()
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })

    story.begin()
    let turns = 0

    while (!narrative.ended && turns < 200) {
      const open = narrative.options.filter((one) => !one.locked)
      if (open.length === 0) break

      /*
       * 采样点在 `choose` 之前：要问的是「**此刻**摆在他面前的选项」。
       * 放到 choose 之后就成了「下一节的选项配上一节的身份」，那是另一回事。
       */
      const living = character.living.id
      if (walled.includes(living)) {
        shard.walledTurns += 1
        shard.seen.push({
          living,
          labels: open.map((one) => one.choice.label),
          scene: narrative.sceneId ?? '?',
        })
      }

      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }
  }

  return shard
}
