/**
 * 「这次说的话他早就知道了」那一支的单世模拟。
 *
 * ## 观测的是引擎自己的判断，不是我们另算一遍
 *
 * `character.learn()` 返回 `'new' | 'detailed' | 'known'`，第三个的意思是
 * **这次接触一格也没改变**（`character.ts:583` 的 `changed` 为假）。
 * 这一支把 `learn` 截住，记下每条知识被触及几次、其中几次是白说的。
 *
 * 截而不改：原函数照常执行，返回值原样传回去，世界照原样跑。
 * 这一点要紧——`effects.ts` 那头要靠返回值决定落不落回执，
 * 篡改它会让被观测的世界跟真实的不是同一个。
 *
 * ## 判据没有跟着搬过来
 *
 * 这里只把事实取回去：`id → [触及次数, 白说次数]`。
 * 「多脏算脏」（`tooRepetitive`）留在 `repetition.ts`——它有两条自检要喂它数据，
 * 一条喂真数据里最脏那条的改装版，一条喂手写的坏数据。判据进了 worker，
 * 那两条自检就够不着它。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useNarrativeStore } from '../../src/stores/narrative'

export interface RepetitionShard {
  /**
   * 知识 id → 被触及几次。
   *
   * ## 为什么是两个 `Map` 而不是一个装 `[触及, 白说]`
   *
   * `sumTallies` 合并 `Map` 时做的是 `merged.get(at) ?? 0) + n`——**加法**。
   * 值要是数组，两片相加会变成 `"1,2" + "3,4"` 这样的字符串拼接，
   * 而且**没有任何东西会喊**：合并照样返回一个 `Map`，判据照样跑，
   * 数字变成字符串之后比较运算多半还给得出结果，只是全错。
   *
   * 这正是 `parallel.ts` 注释里警告的那一种错法：总数悄悄坏掉，判据照样是绿的。
   * 拆成两个 `Map` 就落在它认得的形状里，两边各自按键相加。
   */
  touched: Map<string, number>
  /** 知识 id → 其中几次是白说的（`learn` 返回 `'known'`） */
  repeated: Map<string, number>
}

export function runShard(runs: number): RepetitionShard {
  const touched = new Map<string, number>()
  const repeated = new Map<string, number>()

  for (let i = 0; i < runs; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const character = useCharacterStore()

    const original = character.learn.bind(character)
    character.learn = (input) => {
      const outcome = original(input)
      touched.set(input.id, (touched.get(input.id) ?? 0) + 1)
      if (outcome === 'known') repeated.set(input.id, (repeated.get(input.id) ?? 0) + 1)
      return outcome
    }

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
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }
  }

  return { touched, repeated }
}
