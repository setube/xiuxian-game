<script setup lang="ts">
defineProps<{
  title: string
  /** 缺省时由 story.ts 在入卷那一刻拓上时序 */
  subtitle?: string
}>()
</script>

<template>
  <header class="ink-emerge heading">
    <h2 class="ink-title">{{ title }}</h2>
    <p v-if="subtitle" class="ink-note mt-0.5">{{ subtitle }}</p>
  </header>
</template>

<style scoped>
/* 章节起首。留白足以分段即可，不必空出半屏 */
.heading {
  margin-block: 0.6rem 1rem;
  text-align: center;
}
</style>
