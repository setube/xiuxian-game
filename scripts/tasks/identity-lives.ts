/**
 * 「身份有没有下家」那一支第三问的单世模拟，从 `scripts/identity.ts` 原样搬出来。
 *
 * 走法一步没动。采样点也照旧：**每落一次笔就记一次 `character.identity`**
 * （不是每卷记一次）——一个身份可能在一卷之内换掉，按卷采会漏。
 * 一世走完再记他咽气时挂的那一个。
 *
 * ## 判据没有跟着搬过来
 *
 * 这里只把两张计数取回去。「多少算挂到死」（`TOLERANCE`）、「多少世才够判」
 * （`MIN_SAMPLES`）、哪些身份算「正在做的事」（从 `CHAPTERS` 的
 * `identityKind` 读）都留在 `identity.ts`——那是这一支要说的话。
 *
 * ## 两张表的值都是数字，这不是巧合
 *
 * `sumTallies` 合并 `Map` 时做的是 `(merged.get(k) ?? 0) + n`——**无条件加法**。
 * 值放对象会拼成 `"[object Object]"`，放数组会被 `0 + [...]` 强转成字符串，
 * 换成普通对象则**只取头一片、根本不合并键**（片二片三独有的 key 整个消失）。
 * 三种坏法都不报错。所以分片返回的东西只用「`Map` 值是数字」这一种形状。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useNarrativeStore } from '../../src/stores/narrative'

export interface IdentityShard {
  /** 身份 → 有多少世曾经挂过它（一世之内出现多次只算一次） */
  everWorn: Map<string, number>
  /** 身份 → 有多少世是挂着它咽气的 */
  woreToDeath: Map<string, number>
  /** 这一片跑了多少世。判据用它当分母——写 `runs` 不写 `RUNS`，见 lib/parallel 的注释 */
  runs: number
}

export function runShard(runs: number): IdentityShard {
  const shard: IdentityShard = { everWorn: new Map(), woreToDeath: new Map(), runs }

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

    const seen = new Set<string>()
    let turns = 0
    while (!narrative.ended && turns < 200) {
      const open = narrative.options.filter((one) => !one.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
      seen.add(character.identity)
    }
    for (const id of seen) shard.everWorn.set(id, (shard.everWorn.get(id) ?? 0) + 1)
    shard.woreToDeath.set(character.identity, (shard.woreToDeath.get(character.identity) ?? 0) + 1)
  }

  return shard
}
