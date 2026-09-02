<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { describeStamp } from '@/engine/describe'
import { useCharacterStore } from '@/stores/character'
import type { KnowledgeCategory, KnowledgeEntry } from '@/types/game'

/**
 * 知识：第三层信息，也是本作的核心机制之一。
 *
 * 玩家知道什么 ≠ 世界真实存在什么。
 * 「炼气」条目开局就在，内容却是空的——你听过这两个字，仅此而已。
 * 日后有人讲明白了，这一条才会补上内容。因此「尚未知晓」不是缺省占位，
 * 它本身就是一条要给玩家看的状态。
 */
const ORDER: readonly KnowledgeCategory[] = ['世事', '修行', '地理', '人物', '器物']

interface KnowledgeGroup {
  category: KnowledgeCategory
  entries: KnowledgeEntry[]
}

const character = useCharacterStore()
const { knowledge } = storeToRefs(character)

const groups = computed<KnowledgeGroup[]>(() =>
  ORDER.map((category) => ({
    category,
    entries: knowledge.value.filter((entry) => entry.category === category),
  })).filter((group) => group.entries.length > 0),
)
</script>

<template>
  <div>
    <p v-if="groups.length === 0" class="ink-note">你还什么都不知道。</p>

    <section v-for="group in groups" :key="group.category" class="group">
      <h3 class="ink-label">{{ group.category }}</h3>

      <ul class="entries">
        <li v-for="entry in group.entries" :key="entry.id">
          <p class="title">{{ entry.title }}</p>
          <p class="ink-branch">
            <span v-if="entry.summary">{{ entry.summary }}</span>
            <span v-else class="blank">尚未知晓。</span>
          </p>
          <p class="ink-stamp when">{{ describeStamp(entry.learnedAt) }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.group + .group {
  margin-top: 1.3rem;
}

.group h3 {
  margin: 0 0 0.4rem;
  font-weight: normal;
}

.entries {
  margin: 0;
  padding: 0;
  list-style: none;
}

.entries > li + li {
  margin-top: 0.7rem;
}

.title {
  margin: 0;
  color: var(--color-ink-deep);
  line-height: 1.6;
}

/* 只听过名字，还不知道是什么。楷体让这一句读起来像一句自语 */
.blank {
  font-family: var(--font-kai);
}

.when {
  margin: 0.1rem 0 0;
  padding-inline-start: 1.4em;
}
</style>
