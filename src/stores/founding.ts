import type { Store } from 'pinia'

import { useCharacterStore } from './character'
import { useDiaryStore } from './diary'
import { useHouseholdStore } from './household'
import { useLeaningStore } from './leanings'
import { useNarrativeStore } from './narrative'
import { usePeopleStore } from './people'
import { useUiStore } from './ui'
import { useWorldStore } from './world'

/**
 * 立基次第：八个 store 谁先谁后。
 *
 * ## 为什么这是一张表，而不是几行调用
 *
 * 一个人出生的次序是定的——**先有你生在哪家，才有你在哪儿，
 * 才有你周围那些人，最后才有你自己。** `character.ts` 里那句
 * 「先有父母，才有你」说的是人物，这一层说的是同一件事。
 *
 * 而「开始一世」有两个入口：第一次建（`defineStore` 的 setup 跑一遍）
 * 和重掷（`restart()`）。两个入口要读的是**同一个次序**，
 * 从前却各写了一遍——setup 里靠顶层调用的先后，`restart()` 里靠手写四行。
 *
 * **抄第二遍的时候漏了两行。** `diary` 和 `leanings` 的 `reset()`
 * 写好了却没人调，于是重开一世，日录里还是上一世的日子，
 * 念头里还是上一世的倾向。两者都 `persist`，刷新页面也还在。
 * 不报错、不断线——玩家开了新的一世，翻开日录读到的是上一个人的一生。
 *
 * 所以次序收拢成这一张表，两个入口都从它推导。加一个 store 就得在这儿
 * 写一行，`satisfies` 兜住；漏写 `reset()` 也编译不过。
 */
export type StoreName =
  'household' | 'world' | 'people' | 'character' | 'diary' | 'leanings' | 'narrative' | 'ui'

/**
 * 建它的时候，还得先建谁。
 *
 * 写的是**初始化期读值**，不是运行期谁调谁——函数体里调别的 store 不算依赖，
 * 那时候大家都建好了，怎么调都行。这两者在代码上没有语法区别，
 * 写出来都是 `useHouseholdStore()`，所以只能靠这张表说清楚。
 *
 * 判据由 `scripts/founding.ts` 守着：单独建一个，看 pinia 里连带建起了谁。
 */
export const FOUNDING = {
  /** 根。家先于一切——出身、府、家境，是这一世最先定下来的东西 */
  household: [],
  /** 你在哪儿，取决于你生在哪家 */
  world: ['household'],
  /** 人活在时间里：记谁什么时候来的、什么时候走的，都要问世界几时了 */
  people: ['world'],
  /** 你是最后成型的那个。名字要问家里，年龄要问世界，父母要落进人口册 */
  character: ['household', 'world', 'people'],

  /** 底下四个不参与立基。它们对别人的引用全在函数体里，建的时候谁也不用等 */
  diary: [],
  leanings: [],
  narrative: [],
  ui: [],
} satisfies Record<StoreName, readonly StoreName[]>

/** 重开一世要归零的东西。setup store 不自带 `$reset`，八个各自定义了一个 */
type Resettable = Store & { reset: () => void }

/**
 * 名字 → 取那个 store。
 *
 * `satisfies` 在这里管两件事：**八个名字一个不少**，
 * 以及**每个都真有 `reset()`**。新加一个 store 忘了写 `reset`，
 * `vue-tsc --build --force` 当场红——而不是等某个玩家重开一世时才发现它没清。
 */
export const STORES = {
  household: useHouseholdStore,
  world: useWorldStore,
  people: usePeopleStore,
  character: useCharacterStore,
  diary: useDiaryStore,
  leanings: useLeaningStore,
  narrative: useNarrativeStore,
  ui: useUiStore,
} satisfies Record<StoreName, () => Resettable>

/**
 * 按立基次第排好的八个名字。依赖排在自己前头。
 *
 * 表里没有环——`scripts/founding.ts` 会拿实际建起来的闭包跟表对账，
 * 表要是写出了环，闭包就会比实际大，那一行当场红。
 */
export function foundingOrder(): StoreName[] {
  const order: StoreName[] = []
  const done = new Set<StoreName>()

  const visit = (name: StoreName): void => {
    if (done.has(name)) return
    done.add(name)
    for (const first of FOUNDING[name]) visit(first)
    order.push(name)
  }

  for (const name of Object.keys(FOUNDING) as StoreName[]) visit(name)
  return order
}

/**
 * 重开一世：八个 store 按立基次第归零。
 *
 * 次序在这里是真的要紧，不是整齐好看——`world.reset()` 会读 `household.home`，
 * `character.reset()` 会读 `household.trade`。家世没先重掷，
 * 新的一世就会长在上一世的家里。
 */
export function resetAll(): void {
  for (const name of foundingOrder()) STORES[name]().reset()
}
