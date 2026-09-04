import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import type { Condition, RegionKey } from '@/types/game'

import { stageOf } from './stages'

type WorldStore = ReturnType<typeof useWorldStore>
type CharacterStore = ReturnType<typeof useCharacterStore>
type HouseholdStore = ReturnType<typeof useHouseholdStore>

interface Ctx {
  world: WorldStore
  character: CharacterStore
  household: HouseholdStore
}

/**
 * 一格条件怎么验。拿到的值保证不是 undefined——空着的格子由 `matches` 跳过。
 */
type Check<K extends keyof Condition> = (value: NonNullable<Condition[K]>, ctx: Ctx) => boolean

/** 闭区间，两端都可以不写 */
function within(value: number, range: { atLeast?: number; atMost?: number }): boolean {
  if (range.atLeast !== undefined && value < range.atLeast) return false
  if (range.atMost !== undefined && value > range.atMost) return false
  return true
}

/**
 * 十三格条件各自怎么验。
 *
 * ## 为什么是一张表，而不是一串 if
 *
 * 从前这里是一段一格独立的 `if (condition.xxx)`，读起来没问题，
 * **坏在加下一格的那一天**：`Condition` 多一格 `living?`，
 * 这里不写对应的那一段，TypeScript 一个字也不会说——
 * 而且失败的方式是最坏的那一种：没有任何 `if` 拦它，
 * **那一格条件被静默当成「通过」**。剧本写「这一段只有农家过得到」，
 * 引擎读成「谁都过得到」，玩家走进一段他不该走进的人生——
 * 而这一次那段人生是皇子在檐下看父亲修锄头。
 *
 * `Effect` 不会这样，它是可辨识联合，`switch` 尾巴上一句
 * `const unreachable: never = effect` 就能逼着人把新变体处理掉
 * （见 `effects.ts` 结尾）。`Condition` 是一袋可选字段，没有那个把手，
 * `assertNever` 在它身上使不上劲。
 *
 * 所以换一把锁：**登记表 + `satisfies`**，跟 `scripts/refs.ts` 同一个手法。
 * 少登记一格，`vue-tsc --build` 当场红。
 */
const CHECKS = {
  flag: (flag, { world }) =>
    // 未指定 equals 时，只要求旗标为「真」
    flag.equals === undefined ? world.hasFlag(flag.key) : world.getFlag(flag.key) === flag.equals,

  attribute: (attribute, { character }) => character.attributes[attribute.key] >= attribute.atLeast,

  knowledge: (id, { character }) => character.knows(id),

  item: (id, { character }) => character.has(id),

  age: (age, { character }) => within(character.age, age),

  standing: (standing, { household }) => within(household.standing, standing),

  family: (family, { household }) => household.isAlive(family.id) === family.alive,

  bond: (bond) => {
    // 这一格才需要人物库，用到时再取——别的条件不必为它初始化一个 store
    const people = usePeopleStore()
    const ids = people.kinOf(bond.kind)
    if (ids.length === 0) return false
    if (bond.alive === undefined) return true
    return ids.some((id) => people.isAlive(id)) === bond.alive
  },

  region: (region, { world }) => {
    const state = world.regionState()
    return Object.entries(region).every(
      ([key, range]) => !range || within(state[key as RegionKey], range),
    )
  },

  trade: (trade, { household }) => household.trade === trade,

  /**
   * 你过的是什么日子。
   *
   * 读的是 `character.living`，那个 computed 已经把三级链解析完了——
   * 先问你自己现在过什么日子，没有就问把你养大的人，再没有才落回
   * 这个家的营生。**引擎不认识内容**，这里只比一个 id 和一个有没有，
   * `content/living.ts` 一个字也不 import。
   * engine → content 是反向依赖，那道门不能开。
   *
   * 从前读的是 `household.living`，那时候这一格问的是「**这家**过什么日子」。
   * 差别在削爵那一卷上现了形：父皇大行、封号除了、迁出京城、
   * 住进城南小院、揭不开锅，而条件上他仍然过着宫里的日子，
   * 于是「帮家里干活」那个去处（`{ living: { hasChore: true } }`）
   * 对他一直是关着的——不是因为那家没有活，是因为引擎还以为他在宫里。
   */
  living: (living, { character }) => {
    const current = character.living
    if (living.is !== undefined && current.id !== living.is) return false
    if (living.hasChore !== undefined && (current.chore !== null) !== living.hasChore) return false
    return true
  },

  gender: (gender, { household }) => household.gender === gender,

  stage: (stage, { character }) => stageOf(character.age) === stage,
} satisfies { [K in keyof Condition]-?: Check<K> }

function matches(condition: Condition, ctx: Ctx): boolean {
  for (const key of Object.keys(CHECKS) as (keyof Condition)[]) {
    const value = condition[key]
    if (value === undefined) continue
    /**
     * `CHECKS[key]` 和 `condition[key]` 的对应关系由上面那句 `satisfies` 钉死了，
     * 可遍历的时候 TS 关联不上这两个 `key`——它只知道各自是十二种之一，
     * 不知道是「同一种」。这里收口成一次 cast，全文件仅此一处。
     */
    const check = CHECKS[key] as (value: unknown, ctx: Ctx) => boolean
    if (!check(value, ctx)) return false
  }
  return true
}

/** 全部满足才算通过；无条件即通过。 */
export function meetsAll(conditions?: readonly Condition[]): boolean {
  if (!conditions || conditions.length === 0) return true

  const ctx: Ctx = {
    world: useWorldStore(),
    character: useCharacterStore(),
    household: useHouseholdStore(),
  }
  return conditions.every((condition) => matches(condition, ctx))
}
