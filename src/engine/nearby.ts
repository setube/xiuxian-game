import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'

/**
 * 他还在你天天照面的地方吗。
 *
 * ## 这里刻意不存新状态
 *
 * 「在不在身边」不是人身上的一格，它是两件已经存在的事实算出来的：
 *
 *     他此刻在哪（`Person.place`）  ==  你此刻的家在哪（`household.home`）
 *
 * 存一格 `nearby: boolean` 会立刻产生第三份真相——搬家改一处、
 * 他离乡改一处、他回来又改一处，三处里漏一处就永远对不上。
 * 算出来的那一份不会漏：**改了地点，接触范围自动跟着变。**
 *
 * ## 它回答的不是「这个人还在不在」
 *
 * 这两件事必须分开：
 *
 * - **关系是否存在**——`people.relations` 上那条边，`until` 是空的就还在。
 *   人离乡、人搬走、人死了，那条边一律不删。
 * - **关系是否还在日常生活范围内**——就是这个函数。
 *
 * 十七岁离家去镇上做伙计，姐姐仍然是姐姐、先生仍然存在，
 * 只是你不再每天见他们。前一件事问 `bond`，后一件事问这里。
 *
 * 死了的一律算不在身边——「在身边」问的是能不能见着，
 * 而人不在了就见不着了。反过来不成立：活着的人多半也不在你身边。
 */
export function isNearby(id: string): boolean {
  const person = usePeopleStore().personOf(id)
  if (person === undefined || person.fate !== '在') return false
  return person.place === useHouseholdStore().home
}
