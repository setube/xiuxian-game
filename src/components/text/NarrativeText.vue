<script setup lang="ts">
import { computed } from 'vue'

import type { InkTone } from '@/types/game'

import { toneClass } from './tone'

const { tone = 'normal', indent = false } = defineProps<{
  text: string
  tone?: InkTone
  /** 默认不缩进：段落一律左齐，一屏能读进更多，也更像界面而非书页 */
  indent?: boolean
}>()

const inkClass = computed(() => toneClass(tone))
</script>

<template>
  <p class="ink-prose ink-emerge" :class="[inkClass, { 'ink-indent': indent }]">{{ text }}</p>
</template>
