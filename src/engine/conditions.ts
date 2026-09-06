import { getActivePinia } from 'pinia'

import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import type { Condition, RegionKey } from '@/types/game'

import { stageOf } from './stages'
import { isNearby } from './nearby'

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

  attribute: (attribute, { character }) => within(character.attributes[attribute.key], attribute),

  knowledge: (id, { character }) => character.knows(id),

  item: (id, { character }) => character.has(id),

  age: (age, { character }) => within(character.age, age),

  standing: (standing, { household }) => within(household.standing, standing),

  family: (family, { household }) => {
    const people = usePeopleStore()
    if (family.alive !== undefined && household.isAlive(family.id) !== family.alive) return false
    if (family.age !== undefined && !within(people.ageOf(family.id), family.age)) return false
    if (family.livelihood !== undefined) {
      // 问的是他自己的营生；没有自己的就是他那一户的，死了的问不出来
      const own = people.livelihoodOf(family.id)
      if (own === undefined || !family.livelihood.includes(own)) return false
    }
    return true
  },

  /**
   * 有没有这层关系，那个人还在不在，还在不在你身边，这条边牵了多久。
   *
   * `alive` 与 `near` 都写成 `some(...) === 值` 而不是 `some(... === 值)`——
   * 前者说的是「这层关系里**有没有**一个满足的人」，`false` 就是
   * 「一个也没有」。`wishes.ts` 那句心愿靠的正是这个语义：
   * 他要的是「爹娘都不在了」，不是「死了一个」。
   *
   * `years` 是第四问，问的是**时间**而不是状态：这层关系里有没有一条边
   * 已经牵够了那么多年。它读 `Relation.since`，跟好感度没有关系——
   * 一个认了你十六年的人不会因为三年没见就只认识你三年。
   *
   * ## 一条边也没有的时候，`some` 就该是 `false`，而不是整条判据不成立
   *
   * 这里从前头一行写的是 `if (ids.length === 0) return false`——
   * 意思是「先得有这条边，再问活死远近」。听着讲得通，实际上它在
   * **空集合这一处推翻了 `some` 的语义**：一个人没有配偶，
   * 「有活着的配偶」是 false，那么「没有活着的配偶」就该是 true，
   * 可那一行让它也是 false。于是
   * `{ kind: '配偶', alive: false }` 表达的不是「没成过家」，
   * 而是「成过家，人没了」——**它是「鳏寡」，不是「未婚」。**
   *
   * 这不是一处推演出来的隐患，是量出来的：`routine.ts` 里
   * 「说一门亲事」用的正是这一句，于是它对每一个没成过家的人都不成立，
   * **全库没有一个人娶得成、嫁得出**。跟着塌掉的是生养（要在世的配偶）、
   * 是三十岁那卷的教子女、是落幕那一节「跟你过了大半辈子的人」——
   * 一句短路，四处内容没人读得到，一个错也不报。
   *
   * 现在没有那一行了：什么都不问就是问「有没有这层关系」，
   * 问了就照 `some` 的语义答，空集合也照答。空集合上
   * `some` 恒为 `false`，于是 `alive: true` 照旧不过、
   * `alive: false` 过——**这才是 `some` 本来的意思。**
   */
  bond: (bond) => {
    // 这一格才需要人物库，用到时再取——别的条件不必为它初始化一个 store
    const people = usePeopleStore()
    const ids = people.kinOf(bond.kind)
    // 三问一个也没问，那问的就是第一问：有没有这层关系
    if (bond.alive === undefined && bond.near === undefined && bond.years === undefined) {
      return ids.length > 0
    }
    if (bond.alive !== undefined && ids.some((id) => people.isAlive(id)) !== bond.alive) {
      return false
    }
    if (bond.near !== undefined && ids.some((id) => isNearby(id)) !== bond.near) return false
    const years = bond.years
    if (years !== undefined && !ids.some((id) => people.boundFor(id, bond.kind) >= years.atLeast)) {
      return false
    }
    return true
  },

  region: (region, { world }) => {
    const state = world.regionState()
    return Object.entries(region).every(
      ([key, range]) => !range || within(state[key as RegionKey], range),
    )
  },

  /**
   * 出身那四格，外加主键。
   *
   * 五个各查各的，**不是一个字段的五种写法**——挑哪一格问，
   * 就是在声明这一卷凭什么发生。上一版只有一个 `trade`，
   * 于是「凡是做买卖的人家」得写成三行各指一次，
   * 而「是不是贵人」得写成两行，漏一行没有任何机器会提醒。
   *
   * 四格里只有 `origin` 是掷定不动的；另外三格都会随人生变，
   * 所以这里一律读 store 的**当前值**，不回头查那张出身表。
   */
  origin: (origin, { household }) => household.origin === origin,
  census: (census, { household }) => household.census === census,
  livelihood: (livelihood, { household }) => household.livelihood === livelihood,
  business: (business, { household }) => household.business === business,
  station: (station, { household }) => household.station === station,

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
    // 「这几种日子里的人看得见」——`who` 那一串是 AND，一种一条写不出「或者」。
    // 而「谁看得见村口」天然是一组日子，不是一种
    if (living.in !== undefined && !living.in.includes(current.id)) return false
    // 「除了这几种日子，谁都行」。常态是「能」，所以拿它写例外，
    // 而不是拿 `in` 列一张「谁能」的白名单——白名单每加一种日子都要回来改，
    // 漏改的那一种会安安静静地被挡在外头
    if (living.notIn !== undefined && living.notIn.includes(current.id)) return false
    if (living.hasChore !== undefined && (current.chore !== null) !== living.hasChore) return false
    return true
  },

  gender: (gender, { household }) => household.gender === gender,

  /**
   * 住在什么样的地方、归在哪一级聚落。
   *
   * 「谁看得见村口」从前拿 `living` 猜——一个住在府城的木匠也被算成村里人。
   * 生活方式不是空间位置：这一格读 `world.residence` 那一处是宅还是宫，
   * 和它归的是村、镇、城还是京师。
   */
  house: (house) => {
    const people = usePeopleStore()
    const home = people.houses[house.id ?? 'home']
    if (!home) return false
    if (house.livelihood !== undefined && home.livelihood !== house.livelihood) return false
    if (house.head === 'me' && home.head !== 'me') return false
    if (house.head === 'other' && home.head === 'me') return false
    if (house.head !== undefined && house.head !== 'me' && house.head !== 'other') {
      if (!people.kinOf(house.head).includes(home.head)) return false
    }
    if (house.with !== undefined) {
      const inHouse = people
        .kinOf(house.with)
        .some((id) => home.members.includes(id) && people.isAlive(id))
      if (!inHouse) return false
    }
    // 分过家没有：老屋（`old-home`）在不在。你分出去那一刻它才立起来
    if (house.divided !== undefined && (people.houses['old-home'] !== undefined) !== house.divided) {
      return false
    }
    return true
  },

  temper: (temper) => {
    const person = usePeopleStore().personOf(temper.id)
    return person !== undefined && temper.in.includes(person.temper)
  },

  tie: (tie) => {
    const terms = usePeopleStore().termsBetween(tie.from, tie.to)
    return terms !== undefined && tie.terms.includes(terms)
  },

  owed: (owed) =>
    usePeopleStore().ious.some(
      (one) =>
        (owed.debtor === undefined || one.debtor === owed.debtor) &&
        (owed.creditor === undefined || one.creditor === owed.creditor) &&
        (one.settled !== null) === owed.settled,
    ),

  dwelling: (dwelling, { world }) => {
    if (dwelling.kind !== undefined && !dwelling.kind.includes(world.residenceKind())) return false
    if (dwelling.settlement !== undefined) {
      const here = world.settlementKind()
      if (here === null || !dwelling.settlement.includes(here)) return false
    }
    return true
  },

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

/**
 * 三个仓库按「这一世」记住。
 *
 * ## 为什么值得记
 *
 * `meetsAll` 是全作被调得最凶的函数之一：每进一节要过一遍它的每个选项、
 * 每条 `seen`、每条 `branches`，年表抽事件还要拿每件事的 `requires` 再过一遍。
 * 一世下来是几万次，而**每一次都在重新解析同样的三个仓库**。
 *
 * CPU 采样把这件事量出来了：`pinia.useStore` 一个人占整个运行时的 36.6%，
 * 其中 25 个百分点是从这一行进去的——比这套模拟里任何一段游戏逻辑都多。
 * 它本身不是什么重活，只是次数太多。
 *
 * ## 为什么按 pinia 实例记是安全的
 *
 * 三件事凑齐才成立，缺一不可：
 *
 *   1. 同一个 pinia 上，`useStore()` 每次返回的是**同一个仓库实例**——
 *      这是 Pinia 自己的保证，仓库就存在 `pinia._s` 那张表里。
 *   2. 仓库实例握着的是响应式引用，读它的字段永远读到当下的值。
 *      **记住的是「上哪儿读」，不是「读到了什么」**，所以状态怎么变都不影响。
 *   3. 换一世就是 `setActivePinia(createPinia())`，一个新对象，
 *      身份比不上，缓存当场作废。走查一世一个 pinia，靠的正是这一条。
 *
 * 弃卷重来走的是 `resetAll()`，它只清状态、不换仓库实例，所以缓存照旧成立。
 *
 * 底下 `bond` 那一格仍旧现取现用 `usePeopleStore()`：那是有意的
 * （只有问到关系的条件才需要人物库），而且采样里它只占 0.8%，不值当为它开一格。
 */
let ctxPinia: unknown = null
let ctxCache: Ctx | null = null

/** 全部满足才算通过；无条件即通过。 */
export function meetsAll(conditions?: readonly Condition[]): boolean {
  if (!conditions || conditions.length === 0) return true

  const pinia = getActivePinia()
  if (ctxCache === null || ctxPinia !== pinia) {
    ctxPinia = pinia
    ctxCache = {
      world: useWorldStore(),
      character: useCharacterStore(),
      household: useHouseholdStore(),
    }
  }
  return conditions.every((condition) => matches(condition, ctxCache as Ctx))
}
