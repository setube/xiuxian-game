import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { PanelKey } from '@/types/game'

const EMPTY_SEEN: Record<PanelKey, number> = {
  character: 0,
  inventory: 0,
  knowledge: 0,
  relations: 0,
  chronicle: 0,
  world: 0,
}

/**
 * 界面状态：此刻开着哪个面板，以及每个面板上次看时有多少条。
 *
 * 后者是这款游戏为数不多的「非文字反馈」：某个面板多出了新东西，
 * 底栏对应的标签会点一颗朱砂小点。玩家不必自己去六个面板里翻找变化。
 * 开着的面板不持久化——重新进来该看到的是正在经历的事，不是上次翻开的账。
 */
export const useUiStore = defineStore(
  'ui',
  () => {
    const activePanel = ref<PanelKey | null>(null)
    const seen = ref<Record<PanelKey, number>>({ ...EMPTY_SEEN })

    function toggle(key: PanelKey): void {
      activePanel.value = activePanel.value === key ? null : key
    }

    function close(): void {
      activePanel.value = null
    }

    function markSeen(key: PanelKey, count: number): void {
      if (seen.value[key] === count) return
      seen.value = { ...seen.value, [key]: count }
    }

    function reset(): void {
      activePanel.value = null
      seen.value = { ...EMPTY_SEEN }
    }

    return { activePanel, seen, toggle, close, markSeen, reset }
  },
  { persist: { key: 'xiuxian:ui', pick: ['seen'] } },
)
