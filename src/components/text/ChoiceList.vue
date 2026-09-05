<script setup lang="ts">
import InkDivider from '@/components/common/InkDivider.vue'
import type { Choice, ChoiceOption } from '@/types/game'

/**
 * 行动区。
 *
 * 这是整个界面里唯一「玩家能操作」的地方，所以它必须有明确的边界与反馈：
 * 可点的有压痕与朱砂提手，够不到的写明缘由并留在原处，
 * 键盘可达、焦点可见。它不是一串文字链接。
 */
defineProps<{ options: readonly ChoiceOption[] }>()

const emit = defineEmits<{ choose: [choice: Choice] }>()

function pick(option: ChoiceOption): void {
  if (option.locked) return
  emit('choose', option.choice)
}
</script>

<template>
  <section class="pb-2" aria-labelledby="choice-heading">
    <InkDivider variant="line" />

    <p id="choice-heading" class="ink-note mb-1 tracking-[0.22em]">你可以：</p>

    <ul class="flex flex-col">
      <li v-for="option in options" :key="option.choice.id">
        <button
          type="button"
          class="choice"
          :class="{
            critical: option.choice.critical && !option.locked,
            locked: option.locked,
          }"
          :aria-disabled="option.locked"
          @click="pick(option)"
        >
          <span class="mark" aria-hidden="true">{{ option.locked ? '·' : '○' }}</span>
          <span class="label">{{ option.choice.label }}</span>
          <!-- 时间是这局游戏里真正稀缺的东西，代价必须写在落笔之前 -->
          <span v-if="option.cost" class="cost">耗 {{ option.cost }}</span>
          <span v-if="option.locked" class="tail">〔{{ option.choice.lockedHint }}〕</span>
          <span v-else-if="option.choice.hint" class="tail">{{ option.choice.hint }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.choice {
  display: flex;
  align-items: baseline;
  width: 100%;
  padding: 0.45rem 0.6rem;
  /* 左侧提手：平时透明，可点时由朱砂顶出来。这是「可操作」的视觉承诺 */
  border: 0;
  border-left: 2px solid transparent;
  background: none;
  color: var(--color-ink);
  font-family: inherit;
  font-size: var(--text-body);
  line-height: 1.7;
  letter-spacing: 0.06em;
  text-align: start;
  cursor: pointer;
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease,
    color 0.25s ease;
}

/* 间距走相邻兄弟的 margin，不用 gap——弹性盒的 gap 要 Chrome 84，
   而这个项目的下限是 51。这一行没有换行，所以两者完全等价 */
.choice > * + * {
  margin-left: 0.55em;
}

.choice .mark {
  flex: none;
  width: 1em;
  color: var(--color-ink-faint);
  text-align: center;
}

.choice .label {
  flex: 1 1 auto;
}

.choice .tail {
  flex: none;
  color: var(--color-ink-faint);
  font-size: var(--text-micro);
  letter-spacing: 0.04em;
}

/* 时间代价单独一格：比说明文字重，因为它是要付的账，不是提示 */
.choice .cost {
  flex: none;
  padding: 0 0.35em;
  border: 1px solid var(--color-ink-ghost);
  border-radius: 1px;
  color: var(--color-ink-faint);
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.choice:hover .cost,
.choice:focus-visible .cost {
  border-color: var(--color-cinnabar);
  color: var(--color-cinnabar);
}

.choice:hover,
.choice:focus-visible {
  border-left-color: var(--color-cinnabar);
  /* 压痕：纸被按下去的一小块，不是色块 */
  background-color: rgb(35 32 28 / 5%);
  color: var(--color-ink-deep);
}

.choice:hover .mark,
.choice:focus-visible .mark {
  color: var(--color-cinnabar);
}

.choice:focus-visible {
  outline: 1px solid var(--color-ink-faint);
  outline-offset: -1px;
}

.choice:active {
  background-color: rgb(35 32 28 / 9%);
}

/* 朱砂：危险、异常，或再无回头路 */
.choice.critical,
.choice.critical .mark {
  color: var(--color-cinnabar);
}

.choice.critical:hover,
.choice.critical:focus-visible {
  color: var(--color-cinnabar-soft);
}

/* 够不到的路：留在原处，写明缘由。不靠颜色单独表意 */
.choice.locked,
.choice.locked .mark {
  color: var(--color-ink-faint);
  cursor: not-allowed;
}

.choice.locked:hover,
.choice.locked:focus-visible {
  border-left-color: var(--color-ink-ghost);
  background-color: transparent;
  color: var(--color-ink-faint);
}

.choice.locked:hover .mark,
.choice.locked:focus-visible .mark {
  color: var(--color-ink-faint);
}
</style>
