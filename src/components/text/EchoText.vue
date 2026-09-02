<script setup lang="ts">
/**
 * 回响：玩家刚做过的选择，以淡墨留在正文里。
 * 有了它，卷轴才是一段连贯的经历，而不是一串问答记录。
 */
defineProps<{ text: string }>()
</script>

<template>
  <p class="echo ink-emerge">
    <span class="mark" aria-hidden="true">▸</span>
    <span>{{ text }}</span>
  </p>
</template>

<style scoped>
.echo {
  display: flex;
  gap: 0.5em;
  margin-block: 0.9em;
  color: var(--color-ink-faint);
  font-size: var(--text-note);
  letter-spacing: 0.04em;
  line-height: 1.7;
}

/* 一个朝下游走的箭头：这一行是「你做了什么」，不是「发生了什么」 */
.mark {
  flex: none;
  color: var(--color-cinnabar-soft);
}
</style>
