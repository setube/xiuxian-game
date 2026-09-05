<script setup lang="ts">
import { computed } from 'vue'

import type { InkTone } from '@/types/game'

import { toneClass } from './tone'

/** 事件默认用浓墨：它说的是「发生了什么」，不是「你看见什么」 */
const { tone = 'deep' } = defineProps<{
  text: string
  tone?: InkTone
}>()

const inkClass = computed(() => toneClass(tone))
</script>

<template>
  <p class="event ink-emerge" :class="inkClass">{{ text }}</p>
</template>

<style scoped>
/* 左侧一道短墨竖：把这一句从叙述里挑出来，不必靠居中和大段留白 */
.event {
  margin-top: 1em;
  margin-bottom: 1em;
  padding-left: 0.75em;
  border-left: 2px solid var(--color-ink-ghost);
  line-height: 1.8;
  letter-spacing: 0.04em;
}
</style>
