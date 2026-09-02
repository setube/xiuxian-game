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

    /** 他此刻说得出口的那些。多数人一个也没有 */
    const named = computed(() => growing.value.filter((item) => item.weight >= NAMED_AT))

    /**
     * 他曾经说出过口，如今放下了的那些。
     *
     * 这一档单独留着，是因为它跟「从来没想过」完全是两回事——
     * 一个想走了三年最后留下来的人，跟一个从没动过这个念头的人，
     * 不是同一个人。
     */
    const letGo = computed(() =>
      growing.value.filter((item) => item.peak >= STIRRING_AT && item.weight < STIRRING_AT),
    )

    /**
     * 这个念头此刻长到哪一步了。
     *
     * **只看当下的分量，不看他从前说过什么。** 一个说过「我想离开」
     * 的人，家里出了事、爹娘老了，几年下来这个念头会退回去——
     * 那不是数据错了，那正是人。
     *
     * 而 `namedAt` 留着不动：他确实曾经把这句话说出过口，
     * 这件事不因为他后来改了主意就没发生过。
     */
    function stageOf(id: string): LeaningStage {
      const state = leanings.value[id]
      if (!state) return '埋着'
      if (state.weight >= NAMED_AT) return '明白'
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
            // 压到零就打住。念头可以消退，但不该变成「反着想」
            weight: Math.max(0, existing.weight + weight),
            peak: Math.max(existing.peak, existing.weight + weight),
            moments: [...existing.moments, moment],
          }
        : {
            id,
            weight: Math.max(0, weight),
            peak: Math.max(0, weight),
            moments: [moment],
            namedAt: null,
          }

      // 刚好越过那道线：他这一刻才把它说出来
      const justNamed = next.namedAt === null && next.weight >= NAMED_AT
      if (justNamed) next.namedAt = { ...at }

      leanings.value = { ...leanings.value, [id]: next }
      return justNamed
    }

    function weightOf(id: string): number {
      return leanings.value[id]?.weight ?? 0
    }

    /** 他最想的时候有多想。用来分辨「放下了」和「从来没有过」 */
    function peakOf(id: string): number {
      return leanings.value[id]?.peak ?? 0
    }

    function reset(): void {
      leanings.value = {}
    }

    return {
      leanings,
      growing,
      named,
      letGo,
      stageOf,
      atLeast,
      stir,
      weightOf,
      peakOf,
      reset,
    }
  },
  { persist: { key: 'xiuxian:leanings', pick: ['leanings'] } },
)
