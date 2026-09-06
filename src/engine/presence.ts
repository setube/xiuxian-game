import { usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'

/**
 * 一个人此刻算不算「在」。
 *
 * ## 四层，不能合并（用户 2026-09-07 定）
 *
 *     存在于历史   exists(id)      世界立过这个人。死了、走了、离了户都还存在——他在人口册、关系图、编年、记忆里
 *     当前活着     isAlive(id)     此刻还没到他殁的那一天
 *     当前在场     isPresent(id)   此刻跟你在同一个地方（`Person.place` == `world.place`）
 *     当前可接触   ——             此刻你有没有现实可能跟他发生交互：人、地方、场景、双方身份、关系、事件状态一起定
 *
 * 前三层这儿各给一个函数。第四层**没有函数**：它不是人身上的一格，是场景的事——长史在府里
 * 不等于你此刻见得着他（他在前部、你在内院、你的身份进不去）；门房就在门口，你看得见他，
 * 他未必放你进去。第一片只钉一条硬规矩：**已死、或此刻明显不在场的人，不能再当现实对话对象。**
 * 「在场但不可见」「在门外」「要许可」等真实内容逼出来了再往下分。
 *
 * ## 跟 `isNearby` 的分别
 *
 * `engine/nearby.ts` 问的是「他在不在你天天照面的地方」——比的是**你的家**在哪（`household.home`）。
 * 这儿比的是**你此刻**在哪（`world.place`）：你去了县学，爹还在家，他在你日常生活范围内（nearby），
 * 却不在你眼前（不 present）；哥在镇上做木匠，正月里回来了，那几天他在老屋（present），
 * 平常不在；你恰好也到了镇上，他又在场了。两个问题都要，各答各的。
 *
 * ## 这里刻意不存新状态
 *
 * 跟 `isNearby` 一样：存一格 `present: boolean` 会立刻产生第三份真相。「在场」是两件已经存在的事实
 * 算出来的，改了任何一边它自动跟着变。
 */
export function exists(id: string): boolean {
  return usePeopleStore().personOf(id) !== undefined
}

export function isAlive(id: string): boolean {
  return usePeopleStore().isAlive(id)
}

export function isPresent(id: string): boolean {
  const person = usePeopleStore().personOf(id)
  if (person === undefined || person.fate !== '在') return false
  return person.place === useWorldStore().place
}
