<script setup lang="ts">
import type { DividerVariant } from '@/types/game'

const { variant = 'line' } = defineProps<{ variant?: DividerVariant }>()
</script>

<template>
  <div class="divider" :class="variant" role="separator" aria-orientation="horizontal">
    <span v-if="variant === 'dots'" class="dots">· · ·</span>
    <span v-else-if="variant === 'ink'" class="blot"></span>
    <span v-else class="rule"></span>
  </div>
</template>

<style scoped>
.divider {
  display: flex;
  justify-content: center;
  user-select: none;
}

/* 线用于分栏（正文与行动区之间），墨迹用于换场，因此后者留白更多 */
.divider.line {
  padding-block: 0.9rem;
}

.divider.dots {
  padding-block: 0.7rem;
}

.divider.ink {
  padding-block: 1.2rem;
}

/* 细线：两端渐隐，像一笔提按分明的横画，而不是 HTML 的 hr */
.rule {
  width: 6rem;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-ink-ghost) 18%,
    var(--color-ink-faint) 50%,
    var(--color-ink-ghost) 82%,
    transparent
  );
}

/* 三点：一次停顿，不是一次断章 */
.dots {
  color: var(--color-ink-ghost);
  letter-spacing: 0.45em;
  text-indent: 0.45em;
  font-size: var(--text-note);
}

/* 墨迹：场景转换。中间浓、两端散，像一笔湿墨扫过 */
.blot {
  width: 9rem;
  height: 4px;
  background: radial-gradient(ellipse 46% 100% at 50% 50%, var(--color-ink-faint), transparent 72%);
  filter: blur(0.6px);
  opacity: 0.72;
}
</style>
