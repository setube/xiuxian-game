<script setup lang="ts">
import { computed } from 'vue'

import type { InkTone } from '@/types/game'

import { toneClass } from './tone'

const { tone = 'normal', speaker = '' } = defineProps<{
  text: string
  /** 上下文已经点明是谁在说时，就该留白，不必署名 */
  speaker?: string
  tone?: InkTone
}>()

const inkClass = computed(() => toneClass(tone))
</script>

<template>
  <p class="dialogue ink-emerge" :class="inkClass">
    <span v-if="speaker" class="speaker">{{ speaker }}</span>
    <span>「{{ text }}」</span>
  </p>
</template>

<style scoped>
/*
 * 与叙述同一条左边线，只靠楷体和引号区分人声。
 * 缩进会把一屏可读的内容推出去，纯文字游戏付不起这个代价。
 */
.dialogue {
  margin-top: 0.72em;
  font-family: var(--font-kai);
  line-height: 1.8;
  letter-spacing: 0.02em;
}

.speaker {
  margin-right: 0.5em;
  color: var(--color-ink-faint);
  font-family: var(--font-serif);
  font-size: var(--text-note);
}
</style>
