import type { Livelihood } from '@/types/game'

/**
 * 遗物：一个人没了之后，留下的那几样他用过的东西。
 *
 * ## 这一环从一条用户点过的链来
 *
 * **死亡 → 死讯 → 丧葬 → 遗物 → 家庭变化 → 财产／继承**
 *
 * 一手核过六环，**只有遗物那一环是空的**（`遗物`／`遗下`／`遗留`
 * 全库零处），而正文里在说这件事：
 *
 * ```
 * house.ts 丧事办完那一节：
 *   「爹留下的东西不多。他用过的那几样，你一样也没舍得扔。」
 * ```
 *
 * 那是一条 `seen`，**落不下任何效果**（`seen` 只有 `requires` 和 `text`
 * 两格，见 `types/game.ts` 那一段）。于是这句话说完，世界里什么也没留下。
 *
 * ## ⚠️ 这张表为什么在内容层，不在引擎里
 *
 * 引擎那一头只理解**抽象事实**：谁没了、传给了谁、是殁是交
 * （`keepHeads` 返回的正是 `{ from, to, how: '殁' | '交' }`）。
 *
 * **「务农的人留下一把旧镰刀」是内容知识，不是引擎知识。**
 * 写进引擎，引擎就得知道这个世界有哪些营生、每种营生使什么家什
 * ——那是这张表的事，而它随内容长。
 *
 * ## 三条写它的规矩
 *
 * **一、不凭空造一件「掉落物」。** 每一样都得是那个人**生前真的会用**的家什。
 * 判别式很简单：这东西他用过吗？用不过的就不该在这儿。
 *
 * **二、不值钱。** 遗物跟「财产／继承」是两条链——继承走的是家业
 * （田、铺子、债），那是**户**的层面；遗物是**人**的层面，
 * 它不产生收益，也不该产生。一做成「获得遗产 +N 两银子」，
 * 这一环的意思就全没了。
 *
 * **三、名字是「他会怎么称呼它」。** 「爹的那把镰刀」，不是「铁制镰刀（旧）」。
 * 这条跟 `finding.ts` 守的是同一件事。
 *
 * ## 眼下每种只有一两样，那是有意的
 *
 * 一种营生列五六样，就会变成「这次掷到哪一件」的抽奖。
 * 而这一环要的是**「他用过的那几样」**——数目少、说得出来、认得出是谁的。
 * 哪天真有人去数它、当它、传给孩子，再往里加。
 */
export interface Relic {
  /** 行囊里那件东西的 id */
  id: string
  /** 玩家会怎么称呼它 */
  name: string
  unit: string
}

/**
 * 按营生分的遗物候选。
 *
 * ⚠️ **十种营生一种不落**——`Record<Livelihood, …>` 钉着它：
 * 类型层加一种营生而这儿没跟上，`vue-tsc` 当场红。
 * 这正是这个库那条「手写名单会漏」的机器兜底：**名单是手写的没关系，
 * 有人逼着你写全就行**。
 */
export const RELICS: Record<Livelihood, Relic> = {
  务农: { id: 'relic-sickle', name: '他那把镰刀', unit: '把' },
  打猎: { id: 'relic-snare', name: '他做的那副套子', unit: '副' },
  木工: { id: 'relic-plane', name: '他那把刨子', unit: '把' },
  经商: { id: 'relic-abacus', name: '他那把算盘', unit: '把' },
  行医: { id: 'relic-mortar', name: '他那只药臼', unit: '只' },
  护送: { id: 'relic-gourd', name: '他挂在腰上那个葫芦', unit: '个' },
  当差: { id: 'relic-belt', name: '他那条旧腰带', unit: '条' },
  做官: { id: 'relic-inkstone', name: '他用了半辈子那方砚', unit: '方' },
  佣工: { id: 'relic-bowl', name: '他吃饭那只碗', unit: '只' },
  食禄: { id: 'relic-seal', name: '他那枚小印', unit: '枚' },
}

/**
 * 那个人留下什么。
 *
 * ⚠️ **营生问不出来就返回 `undefined`，不给一件兜底的东西。**
 *
 * 「不知道他靠什么过活」和「他留下了一件普通的东西」是两回事——
 * 给个兜底会把前者变成后者，而报表上看不出任何异常。
 * 这一族的教训在这个库里反复出现：**宁可什么也不落，
 * 不要落一件说不出来历的东西。**
 */
export function relicOf(livelihood: Livelihood | undefined): Relic | undefined {
  if (livelihood === undefined) return undefined
  return RELICS[livelihood]
}

/**
 * `doing` 那一格能不能当营生用。
 *
 * ⚠️ **`doing` 是自由字符串**：血亲长辈那一支填的是这家人的业（「务农」），
 * 而收养人那一支写的是「讨饭的」「寺中的老僧」——**后者不在 `Livelihood` 里**。
 *
 * 所以不能直接当键去查表。对不上就返回 `undefined`，
 * 那个人就不留下东西——**宁可什么也不落，不要落一件说不出来历的**。
 */
export function doingAsLivelihood(doing: string | undefined): Livelihood | undefined {
  if (doing === undefined) return undefined
  return doing in RELICS ? (doing as Livelihood) : undefined
}
