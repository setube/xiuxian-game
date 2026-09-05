/**
 * 「他最后知道自己什么」那一支的单世模拟，从 `scripts/portrait.ts` 原样搬出来。
 *
 * 搬出来只为一件事：**让它能在 worker 线程里跑**。
 * 走法一步没动——同一套年表、同样两百回合上限、同样一路随机落笔。
 *
 * ## 返回的不是那个 store，是它的一份快照
 *
 * 原先 `live()` 直接把 `useCharacterStore()` 整个还回去，脚本再从上面读
 * `aspects` 和 `attributes`。跨线程不能这么办：**store 是个 Pinia 代理，
 * 结构化克隆搬不过去**，Bun 会当场抛 `DataCloneError`。
 *
 * 浅拷一层也不够。`AspectClaim` 里还有一格 `at: GameTime`，
 * `{ ...claim }` 拷完之后那一格仍是个响应式代理——**错法是一句
 * 语焉不详的「The object can not be cloned」，它不告诉你是哪一格**。
 * 这里正是先那么写，然后被它咬了一口。
 *
 * 所以走一趟 JSON。它跟形状无关：`GameTime` 将来多一格，这里不用跟着改，
 * 而逐格手抄的版本会**悄悄把新那一格丢掉**。唯一的代价是值为 `undefined`
 * 的可选格会消失——这里只有 `claim.doubt` 一处，而读它的地方写的是
 * `if (claim.doubt)`，「没有这一格」和「这一格是 undefined」在那句话里
 * 本来就是一回事。
 *
 * 判据和报表一格没动，全留在 `portrait.ts` 那边。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useNarrativeStore } from '../../src/stores/narrative'

type CharacterStore = ReturnType<typeof useCharacterStore>

/** 一个人这辈子被说过的话，加上他真实的那几个数 */
export interface Portrait {
  attributes: CharacterStore['attributes']
  aspects: CharacterStore['aspects']
}

function live(): Portrait {
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
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }

  return JSON.parse(
    JSON.stringify({ attributes: character.attributes, aspects: character.aspects }),
  ) as Portrait
}

/** 这一片的那几世。合并就是把各片接起来——顺序不影响任何一格判据 */
export function runShard(runs: number): Portrait[] {
  const lives: Portrait[] = []
  for (let i = 0; i < runs; i += 1) lives.push(live())
  return lives
}
