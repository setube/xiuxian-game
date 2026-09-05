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
  margin-top: 0.9em;
  margin-bottom: 0.9em;
  color: var(--color-ink-faint);
  font-size: var(--text-note);
  letter-spacing: 0.04em;
  line-height: 1.7;
}

/* 间距走相邻兄弟的 margin，不用 gap——弹性盒的 gap 要 Chrome 84，
   而这个项目的下限是 51。这一行没有换行，所以两者完全等价 */
.echo > * + * {
  margin-left: 0.5em;
}

/* 一个朝下游走的箭头：这一行是「你做了什么」，不是「发生了什么」 */
.mark {
  flex: none;
  color: var(--color-cinnabar-soft);
}
</style>
