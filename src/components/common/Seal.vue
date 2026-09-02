<script setup lang="ts">
/**
 * 朱文方印。
 *
 * 一卷的收束，全局罕用。它是标点，不是插图——
 * 尺寸压到一行字的高度，不许它把一屏的信息量挤掉。
 */
defineProps<{ text: string }>()
</script>

<template>
  <div class="flex justify-center py-3">
    <span class="seal" :aria-label="`印：${text}`">{{ text }}</span>
  </div>
</template>

<style scoped>
/* 略偏一点，像是手按上去的，不是排版排上去的 */
.seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.9rem;
  min-height: 1.9rem;
  border: 2px solid var(--color-cinnabar);
  border-radius: 2px;
  color: var(--color-cinnabar);
  font-size: var(--text-note);
  line-height: 1;
  transform: rotate(-2.5deg);
  /* 印泥不匀：内侧压出一圈极淡的深色 */
  box-shadow: inset 0 0 5px rgb(157 47 38 / 18%);
  opacity: 0.9;
}
</style>
