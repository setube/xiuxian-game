<script setup lang="ts">
import InkDivider from '@/components/common/InkDivider.vue'
import Seal from '@/components/common/Seal.vue'
import type { StreamItem } from '@/types/game'

import Dialogue from './Dialogue.vue'
import EchoText from './EchoText.vue'
import EventText from './EventText.vue'
import NarrativeText from './NarrativeText.vue'
import RecordText from './RecordText.vue'
import SceneHeading from './SceneHeading.vue'

/**
 * 当前经历。把叙事块分发给对应的排版组件——
 * 这里是唯一知道「哪种块用哪个组件」的地方。
 */
defineProps<{ items: readonly StreamItem[] }>()
</script>

<template>
  <div>
    <template v-for="item in items" :key="item.id">
      <NarrativeText
        v-if="item.block.kind === 'narration'"
        :text="item.block.text"
        :tone="item.block.tone"
        :indent="item.block.indent"
      />
      <Dialogue
        v-else-if="item.block.kind === 'dialogue'"
        :text="item.block.text"
        :speaker="item.block.speaker"
        :tone="item.block.tone"
      />
      <EventText
        v-else-if="item.block.kind === 'event'"
        :text="item.block.text"
        :tone="item.block.tone"
      />
      <RecordText
        v-else-if="item.block.kind === 'record'"
        :text="item.block.text"
        :tone="item.block.tone"
      />
      <SceneHeading
        v-else-if="item.block.kind === 'heading'"
        :title="item.block.title"
        :subtitle="item.block.subtitle"
      />
      <Seal v-else-if="item.block.kind === 'seal'" :text="item.block.text" />
      <EchoText v-else-if="item.block.kind === 'echo'" :text="item.block.text" />
      <InkDivider
        v-else-if="item.block.kind === 'divider'"
        :variant="item.block.variant ?? 'line'"
      />
    </template>
  </div>
</template>
