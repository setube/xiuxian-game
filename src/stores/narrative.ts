import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { createId } from '@/engine/id'
import type { ChoiceOption, NarrativeBlock, StreamItem } from '@/types/game'

/**
 * 卷轴保留的最大条目数。
 *
 * 正文是「一直往下写」的，长期游玩会无限增长，而 localStorage 只有数 MB。
 * 超出部分丢弃即可——长期记忆由编年（chronicle）承担。
 *
 * **这是界面的流，不是历史。** 能封顶的只有它：编年、日录、人口册上的往事、关系边、债，
 * 一条也不因为界面只想显示几百块就丢掉（用户 2026-09-06；`scripts/verify.ts` 守着
 * stores 里「留最后 N 个」的写法只在这一处）。门禁走查也不能拿 `stream.slice(seen)` 当
 * 全部正文——四百块之后它返回的永远是空，得按块 id 收。
 */
const MAX_STREAM_LENGTH = 400

/**
 * 当前经历：一条不断向下书写的卷轴，加上此刻摆在玩家面前的选项。
 * 这是三层信息结构里的第一层，也是玩家绝大多数时间看着的东西。
 */
export const useNarrativeStore = defineStore(
  'narrative',
  () => {
    const stream = ref<StreamItem[]>([])
    const sceneId = ref<string | null>(null)
    const nodeId = ref<string | null>(null)
    const options = ref<ChoiceOption[]>([])
    const ended = ref(false)

    const hasStarted = computed(() => stream.value.length > 0)
    /** 至少有一条能点的，才算在等玩家落笔 */
    const isAwaitingChoice = computed(() => options.value.some((option) => !option.locked))

    function append(blocks: readonly NarrativeBlock[]): void {
      if (blocks.length === 0) return

      const incoming: StreamItem[] = blocks.map((block) => ({ id: createId('blk'), block }))
      const merged = [...stream.value, ...incoming]
      stream.value =
        merged.length > MAX_STREAM_LENGTH ? merged.slice(merged.length - MAX_STREAM_LENGTH) : merged
    }

    function setOptions(next: readonly ChoiceOption[]): void {
      options.value = [...next]
    }

    function clearOptions(): void {
      options.value = []
    }

    function locate(scene: string, node: string): void {
      sceneId.value = scene
      nodeId.value = node
    }

    function finish(): void {
      options.value = []
      ended.value = true
    }

    function reset(): void {
      stream.value = []
      sceneId.value = null
      nodeId.value = null
      options.value = []
      ended.value = false
    }

    return {
      stream,
      sceneId,
      nodeId,
      options,
      ended,
      hasStarted,
      isAwaitingChoice,
      append,
      setOptions,
      clearOptions,
      locate,
      finish,
      reset,
    }
  },
  { persist: { key: 'xiuxian:narrative' } },
)
