<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'

import { useCharacterStore } from '@/stores/character'
import { useDiaryStore } from '@/stores/diary'
import { usePeopleStore } from '@/stores/people'
import { useUiStore } from '@/stores/ui'
import { useWorldStore } from '@/stores/world'
import type { PanelKey } from '@/types/game'

import { PANELS } from './panels'

/**
 * 面板栏：第二层（角色状态）与第三层（世界认知）的入口。
 *
 * 六格常驻底部。哪一格多出了新东西，就点一颗朱砂小点——
 * 这是本作为数不多的非文字反馈，玩家不必自己去六个面板里翻找变化。
 */
const ui = useUiStore()
const character = useCharacterStore()
const people = usePeopleStore()
const diary = useDiaryStore()
const world = useWorldStore()

const { activePanel, seen } = storeToRefs(ui)

/** 每格「此刻有多少条」。与 seen 相比即得未读 */
const counts = computed<Record<PanelKey, number>>(() => ({
  character: character.claimCount,
  inventory: character.inventory.length,
  knowledge: character.knowledge.length,
  relations: people.acquaintedCount,
  diary: diary.dayCount,
  chronicle: world.chronicle.length,
  world: world.visited.length,
}))

function isFresh(key: PanelKey): boolean {
  return counts.value[key] > seen.value[key]
}

// 开着的那一格随时对账：翻开即已读，翻开期间新增的也算读过。
// 取「哪一格 + 多少条」的组合而非裸条数——人际 1 条、编年 1 条时，
// 只看条数则切格前后都是 1，watch 整个静默，后翻开的那格永远标不掉「有新」
watch(
  () => {
    const key = activePanel.value
    return key === null ? null : ([key, counts.value[key]] as [PanelKey, number])
  },
  (current) => {
    if (current) ui.markSeen(current[0], current[1])
  },
  { immediate: true },
)
</script>

<template>
  <nav class="ink-rule-t dock" aria-label="面板">
    <button
      v-for="panel in PANELS"
      :key="panel.key"
      type="button"
      class="tab"
      :class="{ active: activePanel === panel.key }"
      :aria-pressed="activePanel === panel.key"
      :aria-label="isFresh(panel.key) ? `${panel.label}（有新）` : panel.label"
      @click="ui.toggle(panel.key)"
    >
      <span class="dot" :class="{ shown: isFresh(panel.key) }" aria-hidden="true"></span>
      {{ panel.label }}
    </button>
  </nav>
</template>

<style scoped>
.dock {
  display: flex;
  flex: none;
  background-color: var(--color-paper-aged);
}

.tab {
  position: relative;
  flex: 1 1 0;
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
  border: 0;
  /* 栏与栏之间落一道细线，六格才是六格，不是一排文字 */
  border-left: 1px solid var(--color-rule);
  background: none;
  color: var(--color-ink-faint);
  font-family: inherit;
  font-size: var(--text-note);
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  cursor: pointer;
  transition:
    color 0.25s ease,
    background-color 0.25s ease;
}

.tab:first-child {
  border-left: 0;
}

.tab:hover {
  color: var(--color-ink-deep);
  background-color: rgb(35 32 28 / 5%);
}

.tab:focus-visible {
  outline: 1px solid var(--color-ink-faint);
  outline-offset: -3px;
}

/* 正开着的那一格：朱砂字，顶上压一条朱砂线 */
.tab.active {
  color: var(--color-cinnabar);
  background-color: rgb(157 47 38 / 7%);
}

.tab.active::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--color-cinnabar);
}

/* 未读：一点朱砂。数量无意义，「有新东西」才是玩家要知道的 */
.dot {
  position: absolute;
  top: 0.4rem;
  right: 0.5rem;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--color-cinnabar);
  opacity: 0;
  transition: opacity 0.45s ease;
}

.dot.shown {
  opacity: 1;
}
</style>
