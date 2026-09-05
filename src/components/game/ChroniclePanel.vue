<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { toneClass } from '@/components/text/tone'
import { describeStamp } from '@/engine/describe'
import { useWorldStore } from '@/stores/world'

/**
 * 编年：这一生的大事记。
 *
 * 正文卷轴会被截断（长期游玩下 localStorage 存不住），
 * 长期记忆由这里承担：只记「值得日后回想的那几件」。
 */
const world = useWorldStore()
const { chronicle } = storeToRefs(world)
</script>

<template>
  <div>
    <p v-if="chronicle.length === 0" class="ink-note">还没有什么值得记下的事。</p>

    <ol v-else class="entries">
      <li v-for="entry in chronicle" :key="entry.id">
        <p class="ink-stamp">{{ describeStamp(entry.time) }}</p>
        <p class="text" :class="toneClass(entry.tone)">{{ entry.text }}</p>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.entries {
  margin: 0;
  padding: 0;
  list-style: none;
}

.entries > li {
  /* 左侧一道淡墨竖线把年月串起来，像一卷编年的骑缝 */
  border-left: 1px solid var(--color-rule);
  padding-left: 0.85rem;
  padding-top: 0.15rem;
  padding-bottom: 0.15rem;
}

.entries > li + li {
  margin-top: 0.7rem;
}

.text {
  margin: 0.1rem 0 0;
  font-size: var(--text-note);
  line-height: 1.75;
}
</style>
