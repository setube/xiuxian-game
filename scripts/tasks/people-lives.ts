/**
 * 「人」那一支的单世模拟，从 `scripts/people.ts` 原样搬出来。
 *
 * 走法一步没动——同一套年表、同样两百回合上限、同样一路随机落笔。
 *
 * ## 这里导出两样东西，各有各的去处
 *
 * `live()` 给主线程用。那一支第一节要**随手挑一世，把爹娘整个印出来**，
 * 印的时候要调 `people.personOf(id)`、`people.ageOf(id)` 这些方法——
 * 方法跨不了线程，所以那一节照旧在主线程里跑，就跑一世，不值当摊开。
 * 放在这里是为了让两边共用同一份走法：**抄成两份，哪天改了一处，
 * 第一节印出来的人和统计出来的数就悄悄不是同一种人生了。**
 *
 * `runShard()` 给 worker 用。它返回的是**每一世的几件事实**，
 * 不是算好的比例——判据、`continue` 的位置、以及那些解释为什么
 * 这么判的注释，全留在 `people.ts` 那边。这里只管把事实取出来。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'
import { useWorldStore } from '../../src/stores/world'

export function live() {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const character = useCharacterStore()
  const people = usePeopleStore()
  const household = useHouseholdStore()
  const world = useWorldStore()
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
  return { character, people, household, world }
}

/**
 * 一世跑完，关于父亲的那几件事实。
 *
 * 一律是原始事实，不是结论：报「他这辈子记了几件事」而不是
 * 「他有没有过去」。**判据那一句留在脚本里**，这样阈值改了、
 * 判法改了，改的是那一处，不用回头动 worker。
 */
export interface Observed {
  /** `father-fate` 那个旗标。没离过家就是 null */
  exit: string | null
  /** 册子上还取得到这个人吗 */
  hasFather: boolean
  /** 取得到的话，他有没有一个地方。「杳」也该有 */
  fatherHasPlace: boolean
  /** 玩家的姓跟父亲的姓对得上 */
  surnameMatches: boolean
  /** 父亲这辈子记了几件事 */
  historyLength: number
  /** 其中有没有玩家已经知道的 */
  knownAny: boolean
  /** 玩家知不知道「爹见过修士」这一件 */
  knownMetAdept: boolean
  /** 一生走完那一刻，父亲的下落 */
  fate: string | null
  /** 父亲比玩家大多少岁 */
  parentAge: number | null
}

export function runShard(runs: number): Observed[] {
  const seen: Observed[] = []

  for (let i = 0; i < runs; i += 1) {
    const { character, people, world } = live()
    const father = people.personOf('father')
    const exit = world.getFlag('father-fate')

    seen.push({
      exit: exit === undefined ? null : String(exit),
      hasFather: Boolean(father),
      fatherHasPlace: Boolean(father?.place),
      surnameMatches: Boolean(father) && character.name.slice(0, 1) === father!.surname,
      historyLength: father?.history.length ?? 0,
      knownAny: father?.history.some((c) => c.known) ?? false,
      knownMetAdept: father?.history.some((c) => c.id === 'met-adept' && c.known) ?? false,
      fate: father?.fate ?? null,
      parentAge: father ? world.bornYear - father.bornYear : null,
    })
  }

  return seen
}
