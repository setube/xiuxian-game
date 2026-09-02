<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onUnmounted, ref, watch } from 'vue'

import { describeStamp } from '@/engine/describe'
import { useWorldStore } from '@/stores/world'

/**
 * 状态栏：此刻身在何处，此刻是何年月。
 *
 * 常驻不滚动。这两条是玩家最频繁需要的信息，藏进面板就等于没有。
 * 也因为它们一直在，时与地的变化不再往正文里写回执——
 * 改由这里闪一下朱砂：状态变了，界面要有反馈。
 */
const FLASH_MS = 1100

const world = useWorldStore()
const { place, time } = storeToRefs(world)

const stamp = computed(() => describeStamp(time.value))

const placeShifted = ref(false)
const timeShifted = ref(false)
let placeTimer: ReturnType<typeof setTimeout> | undefined
let timeTimer: ReturnType<typeof setTimeout> | undefined

watch(place, () => {
  placeShifted.value = true
  clearTimeout(placeTimer)
  placeTimer = setTimeout(() => {
    placeShifted.value = false
  }, FLASH_MS)
})

watch(stamp, () => {
  timeShifted.value = true
  clearTimeout(timeTimer)
  timeTimer = setTimeout(() => {
    timeShifted.value = false
  }, FLASH_MS)
})

onUnmounted(() => {
  clearTimeout(placeTimer)
  clearTimeout(timeTimer)
})
</script>

<template>
  <header class="ink-rule-b bar">
    <!-- 所在即页首。它是玩家此刻真正身处的地方，没有理由藏成不可见的标题 -->
    <h1 class="field" :class="{ shifted: placeShifted }">{{ place }}</h1>
    <p class="field" :class="{ shifted: timeShifted }" aria-label="时序">{{ stamp }}</p>
  </header>
</template>

<style scoped>
.bar {
  display: flex;
  flex: none;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 1.25rem;
  background-color: var(--color-paper-aged);
}

@media (width >= 640px) {
  .bar {
    padding-inline: 1.75rem;
  }
}

.field {
  margin: 0;
  color: var(--color-ink-deep);
  font-size: var(--text-note);
  font-weight: normal;
  letter-spacing: 0.12em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.6s ease;
}

/* 刚刚变过：朱砂停留一瞬再褪回墨色，让「走了一段路」「过了几天」看得见 */
.field.shifted {
  color: var(--color-cinnabar);
  transition: none;
}
</style>
