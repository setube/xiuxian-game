<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { usePeopleStore } from '@/stores/people'
import { useHouseholdStore } from '@/stores/household'
import { HOUSEHOLD_BONDS, noteOf } from '@/engine/note'
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
const household = useHouseholdStore()
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
 * 拼那一句话的活儿在 `engine/note.ts`——它从前写在这儿，
 * 于是「面板上最终那一行字」是全套走查唯一够不着的东西，
 * 「爹 43岁。undefined」就是从这个缝里漏出去的。
 */
function noteFor(id: string): string {
  const bonds = people.bondsWith(id)
  return noteOf({
    person: people.personOf(id),
    remembered: known.value[id]?.note,
    age: people.ageOf(id),
    vanished: '再没有消息。',
    // 只有同一个家里过活的人才落回家业。先生、商旅、掌柜不做你家的营生
    fallback: bonds.some((bond) => HOUSEHOLD_BONDS.includes(bond))
      ? household.livelihood
      : undefined,
  })
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
  margin-left: 0.6em;
  color: var(--color-ink-faint);
  font-size: var(--text-note);
  letter-spacing: 0.1em;
}
</style>
