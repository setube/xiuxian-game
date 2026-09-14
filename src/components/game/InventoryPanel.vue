<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { toChineseNumber } from '@/engine/describe'
import { useCharacterStore } from '@/stores/character'
import { usePeopleStore } from '@/stores/people'
import type { InventoryItem } from '@/types/game'

/**
 * 行囊：身上带着的东西。
 *
 * 没有图标、没有格子、没有品阶颜色——一个人记得自己带了什么，
 * 记的是「三枚铜钱，攒了两年」，不是一个装备槽。
 */
const character = useCharacterStore()
const people = usePeopleStore()
const { inventory } = storeToRefs(character)

/**
 * 「谁留下的」那一行。
 *
 * ⚠️ **称呼在这儿现算，不存**。`keepsake` 只记那个人的 id，
 * 面板每次问一遍 `callOf`——这个库那条「写死的字段活得比事实久」
 * 管的正是这种地方：先生在世时叫「先生」，多年以后玩家自己也当了先生，
 * 那个称呼会变，而**东西是谁留下的这件事不会变**。
 *
 * 年份印的是**留下的那一年**，不是拿到手的那一年（`keepsake.at` 的语义）。
 */
const leftBy = (one: InventoryItem): string | null => {
  if (one.keepsake === undefined) return null
  return `${people.callOf(one.keepsake.from)}留下的 · ${one.keepsake.at} 年`
}
</script>

<template>
  <div>
    <p v-if="inventory.length === 0" class="ink-note">你身上什么也没有。</p>

    <ul v-else class="items">
      <li v-for="item in inventory" :key="item.id">
        <p class="line">
          <span class="name">{{ item.name }}</span>
          <span class="count">{{ toChineseNumber(item.count) }}{{ item.unit }}</span>
        </p>
        <p v-if="leftBy(item)" class="ink-branch">
          <span>{{ leftBy(item) }}</span>
        </p>
        <p v-if="item.note" class="ink-branch">
          <span>{{ item.note }}</span>
        </p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.items {
  margin: 0;
  padding: 0;
  list-style: none;
}

.items > li + li {
  margin-top: 0.8rem;
}

.line {
  display: flex;
  align-items: baseline;
  margin: 0;
  line-height: 1.6;
}

/* 间距走相邻兄弟的 margin，不用 gap——弹性盒的 gap 要 Chrome 84，
   而这个项目的下限是 51。这一行没有换行，所以两者完全等价 */
.line > * + * {
  margin-left: 0.7em;
}

.name {
  color: var(--color-ink-deep);
}

.count {
  color: var(--color-ink-faint);
  font-size: var(--text-note);
}
</style>
