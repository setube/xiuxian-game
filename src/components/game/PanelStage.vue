<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useUiStore } from '@/stores/ui'

import CharacterPanel from './CharacterPanel.vue'
import ChroniclePanel from './ChroniclePanel.vue'
import InventoryPanel from './InventoryPanel.vue'
import KnowledgePanel from './KnowledgePanel.vue'
import PanelSheet from './PanelSheet.vue'
import RelationshipPanel from './RelationshipPanel.vue'
import WorldPanel from './WorldPanel.vue'
import { panelLabel } from './panels'

/**
 * 面板台：底栏点开哪一格，这里就摊开哪一叠纸。
 *
 * 只覆盖「当前经历」那一段，状态栏与底栏仍然露在外面。
 */
const emit = defineEmits<{ restart: [] }>()

const ui = useUiStore()
const { activePanel } = storeToRefs(ui)
</script>

<template>
  <PanelSheet v-if="activePanel" :title="panelLabel(activePanel)" @close="ui.close()">
    <CharacterPanel v-if="activePanel === 'character'" />
    <InventoryPanel v-else-if="activePanel === 'inventory'" />
    <KnowledgePanel v-else-if="activePanel === 'knowledge'" />
    <RelationshipPanel v-else-if="activePanel === 'relations'" />
    <ChroniclePanel v-else-if="activePanel === 'chronicle'" />
    <WorldPanel v-else-if="activePanel === 'world'" @restart="emit('restart')" />
  </PanelSheet>
</template>
