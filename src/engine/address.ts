import { registerFor, titleFor, type Register } from '@/content/address'
import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import type { Bond } from '@/types/game'

/**
 * 他学的是哪一套话。
 *
 * ## 读的是户籍，不是他现在过的日子
 *
 * 这一行是整层里最要紧的一个选择，因为「话改不掉」这条性质
 * 全押在它上面。三个候选，两个是错的：
 *
 * - `character.living` 是他**此刻**过的日子。削爵之后它变成 `market`，
 *   于是他一搬进城南那个小院，开口就从「娘娘」变回「娘」——
 *   **一个人的口音不会在搬家当天改掉。** 四十天的路上没有人重新教他说话。
 * - `character.livings[0]` 更不行。`liveAs` 只在**换**日子那一刻记一笔，
 *   出生那一段根本不在数组里；于是第一条恰恰是他**离开**那地方之后的
 *   那一段。拿它当「他在哪长大」，答案永远是「他后来搬去的地方」。
 * - `household.trade` 是户籍。削爵之后它一格没动（见 `content/living.ts`：
 *   「家里的户籍还是皇室，抚养他的人也还是母妃，可他过的已经不是宫里的日子」）。
 *   **那正是他长大的那个家。**
 *
 * `scripts/address.ts` 第五节把第一个候选当坏实现喂给同一把尺子：
 * 接上去削爵那一条就会落回寻常人家那套话，判据必须当场红。
 *
 * ## 「逐渐学会」那一层现在不做
 *
 * 一个从民间进王府的人，知道自己是世子，不代表他已经掌握了那套话；
 * 反过来，宫里长大的孩子被贬为庶人，那套话也不会跟着爵位一起除掉。
 * 完整的样子是：**身份事实 → 别人怎么称呼他 → 他自己当下的习惯 →
 * 经过教养 → 逐渐学会。** 中间那两步之间应该有一段时间差。
 *
 * 这一版没做那段时间差，因为**没有内容逼它**：这个世界的出身是
 * 出生那一刻掷定的，没有一条人生会中途换语言环境。硬做出来，
 * 就是一个谁也没走进去过的状态机。
 *
 * 什么时候该做：写出第一卷「他被抱进另一种人家」的内容时。
 * 到那时这个函数要改成读一段带年份的教养史，而不是读一格户籍——
 * 而它今天读的这一格，正是那段教养史退化到只有一段时的样子。
 */
export function registerNow(): Register | undefined {
  return registerFor(useHouseholdStore().trade)
}

/**
 * 家里这一种关系，他学着管人家叫什么。
 *
 * 返回 `undefined` 表示他学的那套话在这一格上跟寻常人家没有分别——
 * 调用方回落到 `Acquaintance.calls`，也就是境况表里那个字。
 * **不在这儿兜底**：兜底放在这里，「他没学过特别的叫法」
 * 和「他学的正好也是这个字」就分不开了。
 */
export function kinCall(bond: Bond): string | undefined {
  return registerNow()?.kin[bond]
}

/**
 * 别人当面怎么称呼他。跟着身份走，一道旨意就能改。
 *
 * 跟上面那个函数朝相反的方向：那个读户籍（改不掉），
 * 这个读 `identity`（说变就变）。削爵那一天两者同时被检验。
 */
export function titleNow(): string {
  return titleFor(useCharacterStore().identity, useHouseholdStore().gender)
}
