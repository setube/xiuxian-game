<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { describeGone, whatStopped } from '@/engine/diary'
import { describeStamp } from '@/engine/describe'
import { useDiaryStore } from '@/stores/diary'
import type { DayEntry } from '@/types/game'

/**
 * 日录：我活过什么。
 *
 * 跟旁边两格分工不许混——**编年**收的是真正改变了人生的节点，
 * **知识**收的是他此刻怎么理解这个世界，而这一格收的是
 * 那些什么也没改变、可他确实过过的日子。
 *
 * ## 为什么原文旁边要挂一行朱砂小字
 *
 * 光把每天的话存起来只是日志。「今天帮家里收了一下午麦子」
 * 存三百条也还是三百句废话。
 *
 * 而当他多年以后翻回来，看见那一天底下多了一句
 * 「六年后你才知道，那条道上走过的人里有些不是寻常人」——
 * **那一天忽然就不一样了，尽管那天的原文一个字也没改。**
 *
 * 所以这一格的规矩是：原文一律墨色，后来才明白的一律朱砂，
 * 而且永远挂在原文底下，不许替换它。
 */
const diary = useDiaryStore()
const { days } = storeToRefs(diary)

/** 按年归拢。翻日录的人是按「哪一年」找的，不是按第几条 */
interface YearGroup {
  year: number
  entries: DayEntry[]
}

const byYear = computed<YearGroup[]>(() => {
  const groups = new Map<number, DayEntry[]>()
  for (const day of days.value) {
    const list = groups.get(day.at.year) ?? []
    list.push(day)
    groups.set(day.at.year, list)
  }
  // 新的在上面：他多半是来找最近那几天的
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, entries]) => ({ year, entries }))
})

/**
 * 有什么是再也没有发生过的。
 *
 * 这一段是算出来的，不存——「再也没有」这句话的真假
 * 取决于翻开这一页的那一刻。
 */
const stopped = computed(() => whatStopped().map(describeGone))
</script>

<template>
  <div>
    <p v-if="days.length === 0" class="ink-note">还没有什么日子值得记下来。</p>

    <template v-else>
      <!-- 再也没有发生过的事。放在最前面：它是回看这一格唯一的理由 -->
      <section v-if="stopped.length > 0" class="gone">
        <h3 class="ink-label">后来</h3>
        <p v-for="line in stopped" :key="line" class="gone-line">{{ line }}</p>
      </section>

      <section v-for="group in byYear" :key="group.year" class="year">
        <h3 class="ink-label">第 {{ group.year }} 年</h3>

        <ul class="entries">
          <li v-for="entry in group.entries" :key="entry.id">
            <p class="ink-stamp when">{{ describeStamp(entry.at) }}</p>

            <!-- 当年的原话。永远不改 -->
            <p v-for="(line, index) in entry.lines" :key="index" class="said">{{ line }}</p>

            <!-- 后来才明白的。只追加，挂在原文底下 -->
            <p v-for="(note, index) in entry.hindsight ?? []" :key="`h${index}`" class="later">
              {{ note.text }}
            </p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* 「再也没有」那一段。朱砂框线，因为它是这一格真正的分量所在 */
.gone {
  margin-bottom: 1.4rem;
  padding-left: 0.9em;
  border-left: 1px solid var(--color-cinnabar);
}

.gone-line {
  margin: 0 0 0.3rem;
  color: var(--color-ink-deep);
  font-family: var(--font-kai);
  line-height: 1.8;
}

.year + .year {
  margin-top: 1.3rem;
}

.year h3 {
  margin: 0 0 0.4rem;
  font-weight: normal;
}

.entries {
  margin: 0;
  padding: 0;
  list-style: none;
}

.entries > li + li {
  margin-top: 0.9rem;
}

.when {
  margin: 0 0 0.15rem;
}

/* 当年的原话 */
.said {
  margin: 0;
  padding-left: 1.4em;
  color: var(--color-ink);
  line-height: 1.8;
}

/* 后来才明白的。朱砂，而且缩进比原文更深一档——它是注脚，不是正文 */
.later {
  margin: 0.25rem 0 0;
  padding-left: 2.4em;
  color: var(--color-cinnabar);
  font-family: var(--font-kai);
  line-height: 1.8;
}

.later::before {
  content: '└ ';
  color: var(--color-ink-pale);
}
</style>
