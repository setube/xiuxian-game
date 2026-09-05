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
          <p class="title">
            {{ entry.title }}
            <!-- 认知的两根轴，都是给玩家看的状态。
                 「听说」和「亲历」是两回事，「猜想」和「确信」也是两回事，
                 而**它们是分开的**——亲眼见过却完全不明白那是什么，
                 是一个人第一次撞见修士时最真实的样子。
                 至于这一条是不是错的，玩家永远看不到：他若知道自己错了，那就不叫错了 -->
            <span class="grasp">{{ entry.contact }} · {{ entry.interpretation }}</span>
          </p>
          <p class="ink-branch">
            <span v-if="entry.summary">{{ entry.summary }}</span>
            <span v-else class="blank">尚未知晓。</span>
          </p>

          <!-- 有人给过另一种说法，而他还没能采信。
               两个版本并排放着，不是新的把旧的换掉——那才是被人说动之后的真实样子 -->
          <p v-if="entry.rival" class="ink-branch rival">另有一说：{{ entry.rival }}</p>

          <!-- 他是怎么一步步想到今天这个说法的。
               只在有过转折时才展开：一条从头到尾没变过的认知，没什么可看的 -->
          <details v-if="entry.history.length > 1" class="past">
            <summary class="ink-stamp">你原先是怎么想的</summary>
            <ol class="moments">
              <li v-for="(moment, index) in entry.history" :key="index">
                <span class="ink-stamp when">{{ describeStamp(moment.at) }}</span>
                <span class="how">{{ moment.how }}</span>
                <span class="said">{{ moment.summary ?? '只记住了个名字。' }}</span>
              </li>
            </ol>
          </details>

          <p class="ink-stamp when">{{ describeStamp(entry.learnedAt) }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
/* 认识的深浅。比标题轻一档：它是注解，不是名字 */
.grasp {
  margin-left: 0.6em;
  color: var(--color-ink-faint);
  font-size: var(--text-micro);
  letter-spacing: 0.14em;
}

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

/* 另一种说法。比正文淡一档：它还没被他采信，只是并排放着 */
.rival {
  color: var(--color-ink-faint);
  font-family: var(--font-kai);
}

/* 认知历史。默认收着——摊开来会把「他现在怎么想」压下去 */
.past {
  margin: 0.3rem 0 0;
  padding-left: 1.4em;
}

.past > summary {
  cursor: pointer;
  list-style: none;
}

.past > summary::before {
  content: '▸ ';
}

.past[open] > summary::before {
  content: '▾ ';
}

.moments {
  margin: 0.3rem 0 0;
  padding-left: 0;
  list-style: none;
}

.moments > li {
  display: flex;
  align-items: baseline;
  line-height: 1.7;
}

/* 间距走相邻兄弟的 margin，不用 gap——弹性盒的 gap 要 Chrome 84，
   而这个项目的下限是 51。这一行没有换行，所以两者完全等价 */
.moments > li > * + * {
  margin-left: 0.5em;
}

.moments > li + li {
  margin-top: 0.2rem;
}

/* 这一步是怎么来的：初识 / 加深 / 动摇 / 有了别的说法 / 弄明白了 */
.how {
  flex: none;
  color: var(--color-cinnabar);
  font-size: var(--text-micro);
  letter-spacing: 0.1em;
}

.said {
  color: var(--color-ink-faint);
  font-family: var(--font-kai);
}

.when {
  margin: 0.1rem 0 0;
  padding-left: 1.4em;
}

.moments .when {
  flex: none;
  margin: 0;
  padding: 0;
}
</style>
