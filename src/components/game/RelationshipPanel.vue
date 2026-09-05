<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { usePeopleStore } from '@/stores/people'
import type { Bond } from '@/types/game'

/**
 * 人际：你认得的人。
 *
 * 这里没有好感度数字，也没有进度条。亲疏是内部刻度，只喂给引擎判定——
 * 一个人不会知道「先生对我好感 62」，他只知道「先生教了我九年书」。
 * 玩家看到的就是这句话。
 *
 * 数据只有一个来源：人口册。从前 character.relationships 与 people
 * 两套并存，同一个人有两处身份来源，迟早对不上——
 * **玩家自己也只是 people 图里的一个节点。**
 */
const people = usePeopleStore()
const { known } = storeToRefs(people)

interface Entry {
  id: string
  /** 玩家此刻怎么称呼他。不知道名字就是「渡口的青衫人」这种 */
  calls: string
  /** 他是你的什么人。没有血缘师承的就空着 */
  bonds: Bond[]
  /** 一句话的近况 */
  note: string
}

/** 「爹」这种称呼本身已经说明了关系，就不必再标一遍 */
const IMPLIED: readonly Bond[] = ['生父', '生母']

const entries = computed<Entry[]>(() =>
  Object.keys(known.value).map((id) => ({
    id,
    calls: people.callOf(id),
    bonds: people.bondsWith(id).filter((bond) => !IMPLIED.includes(bond)),
    note: noteFor(id),
  })),
)

/**
 * 他现在怎么样了。
 *
 * 先说下落——人不在了、没消息了，这比什么都要紧；
 * 再说玩家自己记下的印象；最后才是他在做什么。
 */
function noteFor(id: string): string {
  const person = people.personOf(id)
  if (!person) return ''
  if (person.fate === '殁') return '不在了。'
  if (person.fate === '杳') return '再没有消息。'
  const remembered = known.value[id]?.note
  if (remembered) return remembered
  return `${people.ageOf(id)}岁。${person.doing}`
}
</script>

<template>
  <div>
    <p v-if="entries.length === 0" class="ink-note">你还没有真正认识什么人。</p>

    <ul v-else class="people">
      <li v-for="entry in entries" :key="entry.id">
        <p class="name">
          {{ entry.calls }}
          <!-- 抚养、师承这类关系要标出来：谁把你养大的，是这个人身上最重的一条 -->
          <span v-if="entry.bonds.length > 0" class="bond">{{ entry.bonds.join(' · ') }}</span>
        </p>
        <p class="ink-branch">
          <span>{{ entry.note }}</span>
        </p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.people {
  margin: 0;
  padding: 0;
  list-style: none;
}

.people > li + li {
  margin-top: 0.9rem;
}

.name {
  margin: 0;
  color: var(--color-ink-deep);
}

/* 关系比称呼轻一档：它是注解，不是名字 */
.bond {
  margin-inline-start: 0.6em;
  color: var(--color-ink-faint);
  font-size: var(--text-note);
  letter-spacing: 0.1em;
}
</style>
