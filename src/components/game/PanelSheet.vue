<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

/**
 * 面板外壳。
 *
 * 覆在「当前经历」之上，不覆盖状态栏与面板栏——
 * 玩家翻看自己的东西时，仍然看得见此刻身在何处，也随手能切到别格。
 * 纸色不透明：这是另一叠纸，不是浮在正文上的一层玻璃。
 */
defineProps<{ title: string }>()

const emit = defineEmits<{ close: [] }>()

const root = ref<HTMLElement | null>(null)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  // 焦点落到面板上，键盘与读屏用户才不会还留在正文里
  await nextTick()
  root.value?.focus()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <section ref="root" class="sheet" tabindex="-1" :aria-label="title">
    <header class="ink-rule-b head">
      <h2 class="ink-label">{{ title }}</h2>
      <button type="button" class="dismiss" @click="emit('close')">【收起】</button>
    </header>

    <div class="body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.sheet {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--color-paper);
}

.sheet:focus {
  outline: none;
}

.head {
  display: flex;
  flex: none;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 1.25rem;
}

@media (width >= 640px) {
  .head {
    padding-inline: 1.75rem;
  }
}

.head h2 {
  margin: 0;
  font-weight: normal;
}

.dismiss {
  border: 0;
  background: none;
  color: var(--color-ink-faint);
  font-family: inherit;
  font-size: var(--text-note);
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: color 0.25s ease;
}

.dismiss:hover {
  color: var(--color-cinnabar);
}

.dismiss:focus-visible {
  outline: 1px solid var(--color-ink-faint);
  outline-offset: 2px;
}

.body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1rem 1.25rem 1.5rem;
}

@media (width >= 640px) {
  .body {
    padding-inline: 1.75rem;
  }
}
</style>
