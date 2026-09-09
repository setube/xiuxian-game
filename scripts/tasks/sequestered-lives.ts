/**
 * 「高墙里头的人，选项该跟外头不一样」那一支的单世模拟，
 * 从 `scripts/sequestered.ts` 原样搬出来。
 *
 * 走法一步没动，**采样点也照旧在每一步现读**（不是世初读一次）——
 * 一个王府世子在削爵那一年之前之后是两种人：`living` 从 `manor` 变成
 * `fallen`，而「出去做工」那扇门正是那一刻才该开的。按出身采样分不出
 * 这两段人生，会把「设计如此」报成「漏了」。
 *
 * ## 判据没有跟着搬过来
 *
 * 这里只把事实取回去：**高墙里那些步上，玩家面前摆着哪些选项**。
 * 「哪些字算不该开的」（`MENIAL` 那张表）留在 `sequestered.ts`——
 * 那是这支门禁要说的话，而且它是照库里真写的 `label` 抄的，
 * 判据搬进 worker 之后，改那张表的人就看不见它跟内容的关系了。
 *
 * ## 两张表，值都是数字
 *
 * `sumTallies` 合并 `Map` 做的是 `(get(k) ?? 0) + n`——**无条件加法**。
 * 原来那张 `Map<key, label>` 值是字符串，两片相加会拼成
 * `"帮家里干活出去做工"`，**而且不报错**。
 *
 * 所以 label 编进 key（`场景#选项id␟那句话`），值只放次数，主脚本切回来。
 * 分隔符用 `␟`（U+241F）不用 NUL：真 NUL 会让 `grep` 把整个源文件当二进制，
 * 一行匹配都不打印（`src/engine/kinTree.ts` 正踩着这个坑）。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useNarrativeStore } from '../../src/stores/narrative'

/** key 里那个分隔符。选项 id 和正文里都不会有它 */
export const SEP = '␟'

export interface SequesteredShard {
  /** `${场景}#${选项id}${SEP}${那句话}` → 撞见几次。值只能是数字，见文件头 */
  seen: Map<string, number>
  /** 采到多少步是在高墙里头过的。判据靠它说明自己量到了东西 */
  steps: number
}

export function runShard(runs: number, walled: readonly string[]): SequesteredShard {
  const shard: SequesteredShard = { seen: new Map(), steps: 0 }

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

      // 每一步现读一次，理由见文件头
      const living = String(
        (character as unknown as { living?: { id?: string } }).living?.id ?? '?',
      )
      if (walled.includes(living)) {
        shard.steps += 1
        for (const one of open) {
          const choice = (one as unknown as { choice?: { id?: string; label?: string } }).choice
          if (choice?.id) {
            const key = `${narrative.sceneId}#${choice.id}${SEP}${choice.label ?? ''}`
            shard.seen.set(key, (shard.seen.get(key) ?? 0) + 1)
          }
        }
      }

      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }
  }

  return shard
}
