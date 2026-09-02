<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { toChineseNumber } from '@/engine/describe'
import { useCharacterStore } from '@/stores/character'

/**
 * 行囊：身上带着的东西。
 *
 * 没有图标、没有格子、没有品阶颜色——一个人记得自己带了什么，
 * 记的是「三枚铜钱，攒了两年」，不是一个装备槽。
 */
const character = useCharacterStore()
const { inventory } = storeToRefs(character)
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
  gap: 0.7em;
  margin: 0;
  line-height: 1.6;
}

.name {
  color: var(--color-ink-deep);
}

.count {
  color: var(--color-ink-faint);
  font-size: var(--text-note);
}
</style>
