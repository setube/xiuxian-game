import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { createId } from '@/engine/id'
import type { DayEntry, GameTime } from '@/types/game'

/**
 * 日录。
 *
 * 这是「我活过什么」的那一层，跟编年（什么真正成为了人生）
 * 和知识（我以为那是什么）分开存，互不代替。
 *
 * ## 为什么单独一个 store
 *
 * 编年只收真正改变了人生的节点——它必须稀。一个人一生里
 * 值得进编年的事不超过几十件，而他活过的日子有几万天。
 * 两样东西混在一起，要么编年被日常淹掉，要么日常根本留不下来。
 *
 * ## 三百年的人生怎么办
 *
 * 眼下每天全文保留。这在凡人这一段（十六年，几十条）完全够用，
 * 但一个活三百年的人会攒下十万条——**这是一个已知边界，不是没想到**。
 *
 * `DayEntry` 的形状是照着日后能折叠设计的：折的时候把一段时间里的
 * 若干条压成一条摘要，`tags` 取并集，`hindsight` 照旧追加。
 * 这一轮先把「旧日子能被重新点亮」这个闭环验通，压缩留到后面。
 */
export const useDiaryStore = defineStore(
  'diary',
  () => {
    /** 一天一条，按时序排。**原文永远不改** */
    const days = ref<DayEntry[]>([])

    /**
     * 今天还没过完的那几句。
     *
     * 一天分三段，每段各写一句，到夜里才合成一条日录——
     * 否则一天会在日录里裂成三天。
     */
    const pending = ref<{ lines: string[]; tags: string[] }>({ lines: [], tags: [] })

    const dayCount = computed(() => days.value.length)

    /** 这一段发生的事，先攒着 */
    function jot(lines: readonly string[], tags: readonly string[] = []): void {
      pending.value = {
        lines: [...pending.value.lines, ...lines],
        tags: [...new Set([...pending.value.tags, ...tags])],
      }
    }

    /**
     * 一天过完了，落成一条。
     *
     * @returns 落下的那一条，什么也没攒着就返回 undefined
     */
    function closeDay(at: GameTime): DayEntry | undefined {
      if (pending.value.lines.length === 0) return undefined
      const entry: DayEntry = {
        id: createId('day'),
        at: { ...at },
        lines: pending.value.lines,
        tags: pending.value.tags,
      }
      days.value = [...days.value, entry]
      pending.value = { lines: [], tags: [] }
      return entry
    }

    /**
     * 多年以后想明白了一件事。
     *
     * **只追加，不改原文。** 当年写的那句话是他当年真实的样子，
     * 后来的明白不该把它抹掉——被抹掉的话，
     * 「原来那天……」这句就失去了参照物。
     */
    function realize(dayId: string, at: GameTime, text: string): boolean {
      const target = days.value.find((day) => day.id === dayId)
      if (!target) return false
      // 同一天不重复追同一句
      if (target.hindsight?.some((note) => note.text === text)) return false
      days.value = days.value.map((day) =>
        day.id === dayId
          ? { ...day, hindsight: [...(day.hindsight ?? []), { at: { ...at }, text }] }
          : day,
      )
      return true
    }

    /** 带某个标记的日子，按时序 */
    function taggedWith(tag: string): DayEntry[] {
      return days.value.filter((day) => day.tags.includes(tag))
    }

    function reset(): void {
      days.value = []
      pending.value = { lines: [], tags: [] }
    }

    return { days, pending, dayCount, jot, closeDay, realize, taggedWith, reset }
  },
  { persist: { key: 'xiuxian:diary', pick: ['days', 'pending'] } },
)
