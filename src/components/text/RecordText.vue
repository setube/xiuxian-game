<script setup lang="ts">
import { computed } from 'vue'

import type { InkTone } from '@/types/game'

import { toneClass } from './tone'

/**
 * 回执：引擎结算出的状态变化。
 *
 * 玩家做了一件事，界面必须给出可见的结果——这是游戏反馈，不是文学。
 * 只报「得到了什么」（见闻、人、物、境界）；
 * 时与地常驻状态栏，属性是隐藏刻度，都不在此露面。
 */
const { tone = 'faint' } = defineProps<{
  text: string
  tone?: InkTone
}>()

const inkClass = computed(() => toneClass(tone))
</script>

<template>
  <p class="record ink-emerge" :class="inkClass">〔{{ text }}〕</p>
</template>

<style scoped>
.record {
  margin-top: 0.55em;
  margin-bottom: 0.55em;
  font-size: var(--text-note);
  letter-spacing: 0.1em;
  line-height: 1.6;
}
</style>
