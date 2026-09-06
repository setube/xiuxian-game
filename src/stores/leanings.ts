import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useWorldStore } from './world'
import { flagKey } from '@/engine/facts'

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
 * ## 门槛是一把尺子，可它量的东西不在一个量级上
 *
 * 两道门槛都是照着真实分布定的。头一回量的时候最重的那个念头
 * 中位 14、九十分位 17，于是定了 15 和 18。后来加了愿望分岔和「找」那几卷，
 * 同一批念头被更多的事推着走，15 就放过了 57% 的人——
 * 「绝大多数人一辈子说不出口」这句话悄悄不成立了。
 *
 * 按新分布重定成 18 和 21 的时候，才露出底下那个真问题：
 * **七个念头压根不在一个量级上。** 那一次逐个量下来，
 * 「不想再被人按住」一辈子最高只长到七分，「想让家里松快些」最高十二——
 * 无论门槛定在 15 还是 18，这两条线**从写下来那天起就说不出口**。
 * 原因不在门槛，在火种：「想过安稳」有三条日常挂在最常见的标记上，
 * 而「想让家里松快些」唯一那条挂在「粥稀了」，那个标记只在百分之一的人生里出现过。
 *
 * 所以门槛改动之后要做的不只是重量分布，还要**逐个念头看它够不够得着这道线**。
 * 一条谁也够不着的线，跟没写这条内容是一回事。
 *
 * 眼下：反复及以上约四成，说得出口约一成半，七个念头全都够得着。
 */
const STIRRING_AT = 18

/** 到这里他才把它说出来。压得高，是因为大多数人一辈子说不出来 */
const NAMED_AT = 21

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

    /**
     * 他**最想的时候**到过哪一档。
     *
     * 跟 `stageOf` 分开，是因为「他现在还想不想」和「他这辈子想过没有」
     * 是两个问题。一个想走了三年、最后被家里绊住的人，此刻在【埋着】，
     * 可他确确实实动过那个念头——用当下的分量去筛，会把这种人整个漏掉。
     */
    function peakStageOf(id: string): LeaningStage {
      const peak = leanings.value[id]?.peak ?? 0
      if (peak >= NAMED_AT) return '明白'
      return peak >= STIRRING_AT ? '反复' : '埋着'
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
      /**
       * 到了「反复」这一档，置一个旗标。
       *
       * **这不是给世界用的，是给他自己的行动用的。**
       * 「镇上招短工」那种世界发生的事，条件里一个念头也不许有；
       * 而「他逢人就绕着弯问」是他自己做的事——那当然要看他心里想什么。
       *
       * 判据是一句话：**这一卷写的是世界发生了什么，还是他做了什么？**
       */
      useWorldStore().setFlag(flagKey('leaning', id), next.weight >= STIRRING_AT)
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
      peakStageOf,
      atLeast,
      stir,
      weightOf,
      peakOf,
      reset,
    }
  },
  { persist: { key: 'xiuxian:leanings', pick: ['leanings'] } },
)
