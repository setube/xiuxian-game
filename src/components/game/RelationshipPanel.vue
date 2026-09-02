<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useCharacterStore } from '@/stores/character'

/**
 * 人际：你认得的人。
 *
 * 这里没有好感度数字，也没有进度条。亲疏是内部刻度，只喂给引擎判定——
 * 一个人不会知道「先生对我好感 62」，他只知道「先生教了我九年书」。
 * 玩家看到的就是这句话。
 */
const character = useCharacterStore()
const { relationships } = storeToRefs(character)
</script>

<template>
  <div>
    <p v-if="relationships.length === 0" class="ink-note">你还没有真正认识什么人。</p>

    <ul v-else class="people">
      <li v-for="person in relationships" :key="person.id">
        <p class="name">{{ person.name }}</p>
        <p class="ink-branch">
          <span v-if="person.note">{{ person.note }}</span>
          <span v-else class="blank">见过，说不上熟识。</span>
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
  margin-top: 0.8rem;
}

.name {
  margin: 0;
  color: var(--color-ink-deep);
  line-height: 1.6;
}

.blank {
  font-family: var(--font-kai);
}
</style>
