import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { GameTime } from '@/types/game'
import type { LeaningMoment, LeaningStage, LeaningState } from '@/types/leaning'

/**
 * 念头。
 *
 * ## 玩家永远看不到 weight
 *
 * 这一条是整套东西的立场。别人怎么看你不给数字，世界什么光景不给数字，
 * 那么**你自己是什么人更不该给数字**——一旦人物面板上出现
 * 「离乡 63 / 求医 12」，这个游戏就变成了另一个游戏。
 *
 * 玩家看得见的只有两样：
 *
 * - `moments`　他做过的那一串事
 * - `says`　　 他自己终于说出来的那句话（到了「明白」这一档才有）
 *
 * 「我好像总是这样做」这句话必须由玩家自己从那一串里读出来。
 */

/**
 * 从这里开始，他自己才隐约觉出点什么。
 *
 * 两道门槛都是照着真实分布定的，不是拍脑袋：跑四百世量下来，
 * 一个人最重的那个念头中位在 14，九十分位在 17，最高 22。
 * 于是 15 让大约三成的人「觉出点什么」，18 让大约一成的人说得出口。
 */
const STIRRING_AT = 15

/** 到这里他才把它说出来。压得高，是因为大多数人一辈子说不出来 */
const NAMED_AT = 18

export const useLeaningStore = defineStore(
  'leanings',
  () => {
    const leanings = ref<Record<string, LeaningState>>({})

    /** 他心里正在长的那些念头，重的在前 */
    const growing = computed(() =>
      Object.values(leanings.value).sort((a, b) => b.weight - a.weight),
    )

    /** 他终于说出来的那些。多数人一个也没有 */
    const named = computed(() => growing.value.filter((item) => item.namedAt !== null))

    /** 这个念头长到哪一步了 */
    function stageOf(id: string): LeaningStage {
      const state = leanings.value[id]
      if (!state) return '埋着'
      if (state.namedAt !== null) return '明白'
      return state.weight >= STIRRING_AT ? '反复' : '埋着'
    }

    /** 有没有哪个念头到了这一档 */
    function atLeast(stage: LeaningStage): LeaningState[] {
      const order: LeaningStage[] = ['埋着', '反复', '明白']
      const want = order.indexOf(stage)
      return growing.value.filter((item) => order.indexOf(stageOf(item.id)) >= want)
    }

    /**
     * 一件事把这个念头往前推了一点。
     *
     * @returns 他是不是**恰好在这一刻**把它说出来了
     */
    function stir(id: string, weight: number, moment: LeaningMoment, at: GameTime): boolean {
      const existing = leanings.value[id]
      const next: LeaningState = existing
        ? {
            ...existing,
            weight: existing.weight + weight,
            moments: [...existing.moments, moment],
          }
        : { id, weight, moments: [moment], namedAt: null }

      // 刚好越过那道线：他这一刻才把它说出来
      const justNamed = next.namedAt === null && next.weight >= NAMED_AT
      if (justNamed) next.namedAt = { ...at }

      leanings.value = { ...leanings.value, [id]: next }
      return justNamed
    }

    function weightOf(id: string): number {
      return leanings.value[id]?.weight ?? 0
    }

    function reset(): void {
      leanings.value = {}
    }

    return { leanings, growing, named, stageOf, atLeast, stir, weightOf, reset }
  },
  { persist: { key: 'xiuxian:leanings', pick: ['leanings'] } },
)
