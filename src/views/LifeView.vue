<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import GameFrame from '@/components/common/GameFrame.vue'
import InkDivider from '@/components/common/InkDivider.vue'
import PanelDock from '@/components/game/PanelDock.vue'
import PanelStage from '@/components/game/PanelStage.vue'
import StatusBar from '@/components/game/StatusBar.vue'
import ChoiceList from '@/components/text/ChoiceList.vue'
import NarrativeStream from '@/components/text/NarrativeStream.vue'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '@/content/life'
import { useStory } from '@/engine/story'
import { useNarrativeStore } from '@/stores/narrative'
import { useUiStore } from '@/stores/ui'
import type { Choice } from '@/types/game'

/** 离底不足这个距离就当作「已经看到最新一段」 */
const BOTTOM_SLACK = 32

const narrative = useNarrativeStore()
const ui = useUiStore()
const story = useStory(lifeScenes, {
  events: lifeEvents,
  routine: lifeRoutine,
  finale: lifeFinale,
})

const { stream, options, ended, isAwaitingChoice } = storeToRefs(narrative)
const { activePanel } = storeToRefs(ui)

/** 面板摊开时，底下的正文只是背景，不该再接收键盘与鼠标 */
const isPanelOpen = computed(() => activePanel.value !== null)

const stage = ref<HTMLElement | null>(null)
const atBottom = ref(true)
let isInitialFill = true

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollToBottom(smooth: boolean): void {
  const el = stage.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

function onScroll(): void {
  const el = stage.value
  if (!el) return
  atBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SLACK
}

function onChoose(choice: Choice): void {
  // 面板开着时落笔，先收起，好让玩家看见自己这一步的结果
  ui.close()
  story.choose(choice)
}

function onRestart(): void {
  ui.close()
  story.restart()
  isInitialFill = true
  void nextTick(() => scrollToBottom(false))
}

// 新正文落纸后送到眼前；首次进入不动，让人从卷首读起
watch(
  () => stream.value.length,
  async () => {
    if (isInitialFill) {
      isInitialFill = false
      return
    }
    await nextTick()
    scrollToBottom(!prefersReducedMotion())
  },
)

onMounted(() => {
  story.resume()
})
</script>

<template>
  <GameFrame>
    <StatusBar />

    <!-- 当前经历：整个界面唯一会滚动的区域 -->
    <div class="middle">
      <main ref="stage" class="stage" :inert="isPanelOpen" @scroll.passive="onScroll">
        <div class="page">
          <NarrativeStream :items="stream" />

          <ChoiceList v-if="options.length > 0" :options="options" @choose="onChoose" />

          <section v-else-if="ended" class="closing">
            <InkDivider variant="line" />
            <p class="ink-note text-center">卷终</p>
            <div class="mt-3 text-center">
              <button type="button" class="again" @click="onRestart()">【再活一次】</button>
            </div>
          </section>
        </div>
      </main>

      <!-- 选项被滚出视野时的路标。等玩家落笔的界面，不该让人找不到落笔处 -->
      <button
        v-if="isAwaitingChoice && !atBottom && !isPanelOpen"
        type="button"
        class="jump"
        @click="scrollToBottom(!prefersReducedMotion())"
      >
        待抉择 ↓
      </button>

      <PanelStage @restart="onRestart()" />
    </div>

    <PanelDock />
  </GameFrame>
</template>

<style scoped>
.middle {
  position: relative;
  flex: 1 1 auto;
  /* flex 子项默认 min-height:auto，不置零则内部滚不起来 */
  min-height: 0;
}

.stage {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.page {
  padding: 1rem 1.25rem 1.75rem;
}

@media (width >= 640px) {
  .page {
    padding-inline: 1.75rem;
  }
}

.closing {
  padding-top: 0.5rem;
}

.again {
  border: 0;
  background: none;
  color: var(--color-ink-faint);
  font-family: inherit;
  font-size: var(--text-note);
  letter-spacing: 0.12em;
  text-indent: 0.12em;
  cursor: pointer;
  transition: color 0.25s ease;
}

.again:hover {
  color: var(--color-cinnabar);
}

.again:focus-visible {
  outline: 1px solid var(--color-ink-faint);
  outline-offset: 3px;
}

.jump {
  position: absolute;
  inset-block-end: 0.75rem;
  inset-inline: 0;
  width: fit-content;
  margin-inline: auto;
  padding: 0.3rem 0.9rem;
  border: 1px solid var(--color-cinnabar);
  border-radius: 2px;
  background-color: var(--color-paper);
  color: var(--color-cinnabar);
  font-family: inherit;
  font-size: var(--text-micro);
  letter-spacing: 0.14em;
  text-indent: 0.14em;
  cursor: pointer;
  box-shadow: 0 1px 6px rgb(35 32 28 / 12%);
}

.jump:hover {
  background-color: var(--color-cinnabar);
  color: var(--color-paper);
}

.jump:focus-visible {
  outline: 1px solid var(--color-cinnabar);
  outline-offset: 2px;
}
</style>
